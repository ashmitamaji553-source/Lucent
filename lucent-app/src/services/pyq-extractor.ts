// src/services/pyq-extractor.ts
// Extracts questions, marks, year, difficulty, question type, and connects questions to topics

import { Course, DifficultyLevel, PYQQuestion } from '../lib/models/types';
import { courseRepo, topicRepo, pyqRepo } from '../lib/db/repositories';
import { aiService } from './ai-service';

export interface ExtractedQuestion {
  questionText: string;
  topicName?: string;
  marks?: number;
  year?: number;
  difficulty?: DifficultyLevel;
  questionType?: string;
}

export interface PyqExtractionResult {
  courseName: string;
  year: number;
  questions: ExtractedQuestion[];
}

export class PyqExtractor {
  /**
   * Extracts past exam questions and links them directly to topics in the topic tree.
   */
  public async extractAndStore(
    rawText: string,
    filename: string,
    docId: string
  ): Promise<{
    course: Course;
    questionsCount: number;
    connectedCount: number;
    feedback: string[];
    questions: PYQQuestion[];
  }> {
    let result: PyqExtractionResult | null = null;

    if (aiService.isConfigured()) {
      try {
        const prompt = `
Analyze this Past Year Question (PYQ) exam paper and extract all individual questions in JSON format.
Content extract:
"""
${rawText.slice(0, 4500)}
"""

Extract:
1. courseName: Subject or course (e.g., "Data Structures", "Operating Systems", "DBMS")
2. year: Exam year (e.g., 2024, 2025)
3. questions: Array of items, each with:
   - questionText: full text of question
   - topicName: specific academic topic tested (e.g., "AVL Trees", "Normalization", "Deadlocks")
   - marks: numerical marks if present (e.g. 5, 10)
   - difficulty: "Easy" | "Medium" | "Hard"
   - questionType: "Theory" | "Numerical" | "Implementation" | "Derivation" | "Short Answer"

Output strictly as JSON:
{
  "courseName": "string",
  "year": number,
  "questions": [
    {
      "questionText": "string",
      "topicName": "string",
      "marks": number,
      "difficulty": "Easy" | "Medium" | "Hard",
      "questionType": "string"
    }
  ]
}
`;
        result = await aiService.generateStructuredJson<PyqExtractionResult>(prompt);
      } catch (err) {
        console.warn('AI PYQ extraction failed, using heuristic engine:', err);
      }
    }

    if (!result || !result.questions || result.questions.length === 0) {
      result = this.heuristicExtract(rawText, filename);
    }

    // 1. Get or create Course
    const courseName = result.courseName || this.inferCourseName(filename, rawText);
    let course = courseRepo.getByName(courseName);
    if (!course) {
      course = await courseRepo.create({
        userId: 'user_1',
        name: courseName,
        code: courseName.slice(0, 3).toUpperCase() + '201',
        term: 'Fall 2026',
      });
    }

    // 2. Connect questions to existing topics
    const courseTopics = topicRepo.getByCourse(course.id);
    let connectedCount = 0;
    const savedQuestions: PYQQuestion[] = [];

    for (const q of result.questions) {
      if (!q.questionText || q.questionText.trim().length < 5) continue;

      // Find best topic match
      let matchedTopicId: string | undefined;
      const qText = q.questionText.toLowerCase();
      const declaredTopic = (q.topicName || '').toLowerCase();

      for (const topic of courseTopics) {
        const tName = topic.name.toLowerCase();
        if (
          (declaredTopic && (declaredTopic.includes(tName) || tName.includes(declaredTopic))) ||
          qText.includes(tName)
        ) {
          matchedTopicId = topic.id;
          break;
        }
      }

      if (matchedTopicId) {
        connectedCount++;
        // Boost topic's PYQ frequency weight in the database
        const topicObj = courseTopics.find((t) => t.id === matchedTopicId);
        if (topicObj && topicObj.pyqFrequency !== 'High') {
          topicObj.pyqFrequency = 'High';
        }
      }

      const saved = await pyqRepo.create({
        courseId: course.id,
        topicId: matchedTopicId,
        documentId: docId,
        year: q.year || result.year || new Date().getFullYear(),
        questionText: q.questionText.trim(),
        marks: q.marks,
        difficulty: q.difficulty || this.inferDifficulty(q.questionText, q.marks),
        questionType: q.questionType || this.inferQuestionType(q.questionText),
        topicName: q.topicName,
        frequencyWeight: matchedTopicId ? 4 : 2,
      });

      savedQuestions.push(saved);
    }

    const feedback = [
      'PYQ paper indexed.',
      `${savedQuestions.length} questions detected, ${connectedCount} connected to topic map.`,
    ];

    return {
      course,
      questionsCount: savedQuestions.length,
      connectedCount,
      feedback,
      questions: savedQuestions,
    };
  }

  /**
   * Deterministic regex and NLP heuristics for PYQ papers.
   */
  public heuristicExtract(text: string, filename: string): PyqExtractionResult {
    const courseName = this.inferCourseName(filename, text);

    // Extract year
    const yearMatch = text.match(/\b(201\d|202\d)\b/) || filename.match(/\b(201\d|202\d)\b/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

    const questions: ExtractedQuestion[] = [];
    const lines = text.split('\n');

    let currentQ: ExtractedQuestion | null = null;
    const qStartRegex = /^(?:q(?:uestion)?\.?\s*(\d+)|(\d+)\.)[\s:)]*(.*)$/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check marks in line
      const marksMatch = line.match(/\[?\s*(\d+)\s*(?:marks|mark|m)\s*\]?/i);
      const marks = marksMatch ? parseInt(marksMatch[1], 10) : undefined;

      const qMatch = line.match(qStartRegex);
      if (qMatch) {
        if (currentQ && currentQ.questionText.length > 10) {
          questions.push(currentQ);
        }

        const initialText = qMatch[3] ? qMatch[3].trim() : '';
        currentQ = {
          questionText: initialText,
          year,
          marks,
          difficulty: this.inferDifficulty(initialText, marks),
          questionType: this.inferQuestionType(initialText),
          topicName: this.extractTopicKeywords(initialText),
        };
      } else if (currentQ) {
        // Continue accumulating multiline question
        if (!/^(section|time|maximum|note|attempt|instructions)/i.test(line)) {
          currentQ.questionText += ' ' + line;
          if (marks && !currentQ.marks) currentQ.marks = marks;
        }
      }
    }

    if (currentQ && currentQ.questionText.length > 10) {
      questions.push(currentQ);
    }

    // Clean up question texts
    questions.forEach((q) => {
      q.questionText = q.questionText.replace(/\s+/g, ' ').trim();
      if (!q.topicName) q.topicName = this.extractTopicKeywords(q.questionText);
      if (!q.difficulty) q.difficulty = this.inferDifficulty(q.questionText, q.marks);
      if (!q.questionType) q.questionType = this.inferQuestionType(q.questionText);
    });

    return {
      courseName,
      year,
      questions,
    };
  }

  private inferDifficulty(text: string, marks?: number): DifficultyLevel {
    const t = text.toLowerCase();
    if (marks && marks >= 10) return 'Hard';
    if (marks && marks <= 3) return 'Easy';
    if (t.includes('derive') || t.includes('prove') || t.includes('design') || t.includes('construct') || t.includes('calculate')) {
      return 'Hard';
    }
    if (t.includes('explain') || t.includes('compare') || t.includes('differentiate') || t.includes('illustrate')) {
      return 'Medium';
    }
    return 'Easy';
  }

  private inferQuestionType(text: string): string {
    const t = text.toLowerCase();
    if (t.includes('write an algorithm') || t.includes('pseudo-code') || t.includes('code') || t.includes('program')) {
      return 'Implementation';
    }
    if (t.includes('calculate') || t.includes('compute') || t.includes('find the') || t.includes('evaluate')) {
      return 'Numerical';
    }
    if (t.includes('derive') || t.includes('prove that')) {
      return 'Derivation';
    }
    if (t.includes('define') || t.includes('what is') || t.includes('state') || t.includes('list')) {
      return 'Short Answer';
    }
    return 'Theory';
  }

  private extractTopicKeywords(text: string): string | undefined {
    const knownTopics = [
      'AVL Trees',
      'Binary Search Trees',
      'Binary Trees',
      'Trees',
      'Linked Lists',
      'Arrays',
      'Graphs',
      'Dijkstra',
      'Sorting',
      'Hashing',
      'Queues',
      'Stacks',
      'Process Management',
      'Deadlocks',
      'Virtual Memory',
      'Paging',
      'Semaphores',
      'Normalization',
      'Relational Algebra',
      'SQL',
      'Transactions',
      'Indexing',
    ];

    const t = text.toLowerCase();
    for (const kt of knownTopics) {
      if (t.includes(kt.toLowerCase())) return kt;
    }
    return undefined;
  }

  private inferCourseName(filename: string, content: string): string {
    const f = filename.toLowerCase();
    const c = content.toLowerCase();

    if (f.includes('os') || f.includes('operat') || c.includes('operating systems')) return 'Operating Systems';
    if (f.includes('dbms') || f.includes('database') || c.includes('database management')) return 'DBMS';
    if (f.includes('network') || f.includes('cn') || c.includes('computer networks')) return 'Computer Networks';
    if (f.includes('discrete') || c.includes('discrete mathematics')) return 'Discrete Mathematics';
    return 'Data Structures';
  }
}

export const pyqExtractor = new PyqExtractor();
