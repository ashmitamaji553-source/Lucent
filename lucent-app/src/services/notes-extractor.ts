// src/services/notes-extractor.ts
// Extracts concepts, definitions, and chapter topics from lecture notes

import { Course } from '../lib/models/types';
import { courseRepo, topicRepo, coverageRepo } from '../lib/db/repositories';
import { aiService } from './ai-service';

export interface NotesExtractionData {
  courseName: string;
  chapterOrUnit?: string;
  topics: Array<{
    name: string;
    subtopics?: string[];
    difficulty?: 'Easy' | 'Medium' | 'Hard';
  }>;
  keyTerminology: string[];
  summary: string;
}

export class NotesExtractor {
  /**
   * Extracts academic concepts from lecture notes and enhances the course topic map.
   */
  public async extractAndStore(
    rawText: string,
    filename: string,
    docId: string
  ): Promise<{
    course: Course;
    topicsCount: number;
    feedback: string[];
    summary: string;
  }> {
    let data: NotesExtractionData | null = null;

    if (aiService.isConfigured()) {
      try {
        const prompt = `
Analyze these lecture notes and extract the core concepts and topics in JSON format.
Content extract:
"""
${rawText.slice(0, 4500)}
"""

Extract:
1. courseName: Subject (e.g., "Data Structures", "Operating Systems", "DBMS")
2. chapterOrUnit: Chapter or unit name (e.g., "Unit 3: Hierarchical Structures")
3. topics: Array of topics covered in the notes with optional subtopics
4. keyTerminology: Array of key definitions or terms
5. summary: 1-2 sentence concise overview

Output strictly in JSON schema:
{
  "courseName": "string",
  "chapterOrUnit": "string",
  "topics": [{ "name": "string", "subtopics": ["string"] }],
  "keyTerminology": ["string"],
  "summary": "string"
}
`;
        data = await aiService.generateStructuredJson<NotesExtractionData>(prompt);
      } catch (err) {
        console.warn('AI notes extraction failed, using heuristic engine:', err);
      }
    }

    if (!data || !data.topics || data.topics.length === 0) {
      data = this.heuristicExtract(rawText, filename);
    }

    // 1. Get or create Course
    const courseName = data.courseName || this.inferCourseName(filename, rawText);
    let course = courseRepo.getByName(courseName);
    if (!course) {
      course = await courseRepo.create({
        userId: 'user_1',
        name: courseName,
        code: courseName.slice(0, 3).toUpperCase() + '201',
        term: 'Fall 2026',
      });
    }

    // 2. Ingest or update topics in Topic Tree
    const existing = topicRepo.getByCourse(course.id);
    const existingNames = new Set(existing.map((t) => t.name.toLowerCase()));
    let updatedCount = 0;

    for (const top of data.topics) {
      const topName = top.name.trim();
      if (!topName) continue;

      let parent = existing.find((t) => t.name.toLowerCase() === topName.toLowerCase());
      if (!parent) {
        parent = await topicRepo.create({
          courseId: course.id,
          parentTopicId: null,
          name: topName,
          description: data.chapterOrUnit ? `${data.chapterOrUnit}: ${topName}` : topName,
          orderIndex: existing.length + updatedCount + 1,
          depth: 1,
          pyqFrequency: 'Medium',
          difficulty: top.difficulty || 'Medium',
        });
        await coverageRepo.upsert(parent.id, 55);
        existingNames.add(topName.toLowerCase());
        updatedCount++;
      } else {
        // Boost coverage slightly when lecture notes exist
        const cov = coverageRepo.getByTopic(parent.id);
        const currentScore = cov ? cov.score : 50;
        await coverageRepo.upsert(parent.id, Math.min(100, currentScore + 10));
        updatedCount++;
      }

      // Handle subtopics
      if (top.subtopics && top.subtopics.length > 0) {
        for (let i = 0; i < top.subtopics.length; i++) {
          const subName = top.subtopics[i].trim();
          if (!subName || existingNames.has(subName.toLowerCase())) continue;

          await topicRepo.create({
            courseId: course.id,
            parentTopicId: parent.id,
            name: subName,
            description: `Concept from ${topName}`,
            orderIndex: i + 1,
            depth: 2,
            pyqFrequency: 'Medium',
            difficulty: 'Medium',
          });
          await coverageRepo.upsert(parent.id, 50);
          existingNames.add(subName.toLowerCase());
          updatedCount++;
        }
      }
    }

    const feedback = [
      'Lecture notes processed.',
      `${updatedCount} topic concept${updatedCount === 1 ? '' : 's'} updated.`,
    ];

    return {
      course,
      topicsCount: updatedCount,
      feedback,
      summary: data.summary,
    };
  }

  /**
   * Deterministic extraction from lecture notes.
   */
  public heuristicExtract(text: string, filename: string): NotesExtractionData {
    const courseName = this.inferCourseName(filename, text);
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    let chapterOrUnit = 'Lecture Notes';
    const topics: Array<{ name: string; subtopics?: string[] }> = [];
    const keyTerminology: string[] = [];

    for (const line of lines) {
      if (/^(?:unit|chapter|lecture)\s+\d+/i.test(line) && chapterOrUnit === 'Lecture Notes') {
        chapterOrUnit = line;
      }

      // Key concepts headers
      if (line.includes(':') && line.length < 80 && !line.includes('http')) {
        const [concept, details] = line.split(':');
        const cClean = concept.replace(/^[-*•\d.)\s]+/, '').trim();
        if (cClean.length > 3 && cClean.length < 40) {
          keyTerminology.push(cClean);
          const subItems = details ? details.split(/[,;]/).map((s) => s.trim()).filter((s) => s.length > 2) : [];
          topics.push({
            name: cClean,
            subtopics: subItems.slice(0, 4),
          });
        }
      } else if (/^[-*•]\s+([A-Za-z0-9\s&/-]{4,45})$/.test(line)) {
        const item = line.replace(/^[-*•]\s+/, '').trim();
        topics.push({ name: item });
      }
    }

    if (topics.length === 0) {
      topics.push({
        name: filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
        subtopics: ['Core Definitions', 'Examples and Practice'],
      });
    }

    return {
      courseName,
      chapterOrUnit,
      topics: topics.slice(0, 10),
      keyTerminology: keyTerminology.slice(0, 12),
      summary: `Lecture notes covering ${topics.map((t) => t.name).slice(0, 3).join(', ')}.`,
    };
  }

  private inferCourseName(filename: string, content: string): string {
    const f = filename.toLowerCase();
    const c = content.toLowerCase();

    if (f.includes('os') || f.includes('operating') || c.includes('operating systems')) return 'Operating Systems';
    if (f.includes('dbms') || f.includes('database') || c.includes('database management')) return 'DBMS';
    if (f.includes('network') || f.includes('cn') || c.includes('computer networks')) return 'Computer Networks';
    if (f.includes('discrete') || c.includes('discrete mathematics')) return 'Discrete Mathematics';
    return 'Data Structures';
  }
}

export const notesExtractor = new NotesExtractor();
