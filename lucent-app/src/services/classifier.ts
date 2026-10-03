// src/services/classifier.ts
// Content-first document classification engine: SYLLABUS, NOTES, PYQ, NOTICE, OTHER

import { DocumentType } from '../lib/models/types';
import { aiService } from './ai-service';

export interface ClassificationResult {
  type: DocumentType;
  confidence: number;
  reasoning: string;
}

export class DocumentClassifier {
  /**
   * Classifies a document using its extracted content as the primary signal.
   */
  public async classify(content: string, filename: string): Promise<ClassificationResult> {
    const text = content.toLowerCase();
    const fname = filename.toLowerCase();

    // If AI service is available, we can query it or use content heuristics
    if (aiService.isConfigured()) {
      try {
        const aiPrompt = `
Analyze the following academic document extract and classify it into EXACTLY ONE of these categories:
- SYLLABUS (course outlines, units, topics, learning objectives, textbooks)
- NOTES (lecture notes, chapter explanations, concepts, theorems, examples)
- PYQ (past exam question papers, questions with marks, sections, exam instructions)
- NOTICE (official announcements, upcoming deadlines, exam dates, submission reminders)
- OTHER (unrelated or unclassifiable)

Document Name: "${filename}"
Document Content Extract:
"""
${content.slice(0, 2500)}
"""

Respond in JSON format:
{
  "type": "Syllabus" | "Notes" | "PYQs" | "Notice" | "Other",
  "confidence": 0.0 to 1.0,
  "reasoning": "brief 1-sentence reason based on content"
}
`;
        const aiResult = await aiService.generateStructuredJson<{
          type: string;
          confidence: number;
          reasoning: string;
        }>(aiPrompt);

        const mappedType = this.normalizeType(aiResult.type);
        if (mappedType) {
          return {
            type: mappedType,
            confidence: aiResult.confidence || 0.9,
            reasoning: aiResult.reasoning || `Classified as ${mappedType} by content analysis.`,
          };
        }
      } catch (err) {
        console.warn('AI classification failed, using heuristic content classifier:', err);
      }
    }

    // Heuristic content-first classification
    return this.heuristicClassify(text, fname);
  }

  /**
   * Evaluates content structural patterns and keyword frequencies.
   */
  public heuristicClassify(text: string, filename: string): ClassificationResult {
    let syllabusScore = 0;
    let notesScore = 0;
    let pyqScore = 0;
    let noticeScore = 0;

    // --- 1. NOTICE Signals ---
    const noticeKeywords = [
      'notice',
      'circular',
      'announcement',
      'attention students',
      'office of the',
      'department of',
      'hereby informed',
      'deadline',
      'due date',
      'submission date',
      'last date',
      'venue:',
      'rescheduled',
      'registration closes',
      'all students must',
      'mandatory attendance',
      'admit card',
      'hall ticket',
    ];
    for (const kw of noticeKeywords) {
      if (text.includes(kw)) noticeScore += 12;
    }
    // Date/time patterns in notices (e.g. 5:00 PM, 10:00 AM, 2026-10-...)
    if (/\b\d{1,2}:\d{2}\s*(am|pm)\b/i.test(text)) noticeScore += 15;
    if (/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(text) && noticeScore > 0) noticeScore += 8;
    if (/\b(october|november|december|january|february|march|april|may|june|july|august|september)\s+\d{1,2}/i.test(text)) noticeScore += 12;

    // --- 2. PYQ Signals ---
    const pyqKeywords = [
      'question paper',
      'previous year',
      'past year',
      'end semester',
      'mid semester',
      'semester examination',
      'annual examination',
      'maximum marks',
      'max marks',
      'total marks',
      'time: 3 hours',
      'time : 3 hrs',
      'time: 2 hours',
      'section a',
      'section b',
      'section c',
      'part a',
      'part b',
      'answer any',
      'attempt all questions',
      'answer all',
    ];
    for (const kw of pyqKeywords) {
      if (text.includes(kw)) pyqScore += 14;
    }
    // Question number patterns (Q.1, Q1, Q 2, Question 1)
    const qMatches = text.match(/\b(q\s*\.?\s*\d+|question\s+\d+)\b/gi);
    if (qMatches) pyqScore += Math.min(30, qMatches.length * 6);
    // Marks notation: [5 marks], (10 marks), [10m], [5m]
    const marksMatches = text.match(/\[?\s*\d+\s*(marks|mark|m)\s*\]?/gi);
    if (marksMatches) pyqScore += Math.min(25, marksMatches.length * 5);

    // --- 3. SYLLABUS Signals ---
    const syllabusKeywords = [
      'syllabus',
      'course outline',
      'course curriculum',
      'course objectives',
      'learning objectives',
      'course outcomes',
      'prerequisites',
      'credit hours',
      'credits:',
      'course code',
      'evaluation scheme',
      'grading scheme',
      'reference books',
      'text books',
      'textbooks',
      'recommended reading',
      'course contents',
      'unit i',
      'unit ii',
      'unit iii',
      'unit iv',
      'unit v',
      'module 1',
      'module 2',
      'module 3',
    ];
    for (const kw of syllabusKeywords) {
      if (text.includes(kw)) syllabusScore += 12;
    }
    // Unit/Module breakdown patterns
    const unitMatches = text.match(/\b(unit\s+[0-9ivx]+|module\s+[0-9ivx]+)\b/gi);
    if (unitMatches) syllabusScore += Math.min(30, unitMatches.length * 6);

    // --- 4. NOTES Signals ---
    const notesKeywords = [
      'lecture notes',
      'lecture',
      'chapter',
      'definition:',
      'theorem',
      'lemma',
      'algorithm:',
      'pseudocode',
      'properties of',
      'characteristics of',
      'key concepts',
      'summary of',
      'advantages and disadvantages',
      'explanation:',
      'step 1:',
      'step 2:',
      'implementation details',
    ];
    for (const kw of notesKeywords) {
      if (text.includes(kw)) notesScore += 10;
    }

    // Minor filename weighting (max +8 points to break close ties)
    if (filename.includes('syllabus')) syllabusScore += 8;
    if (filename.includes('pyq') || filename.includes('exam_paper') || filename.includes('question_paper')) pyqScore += 8;
    if (filename.includes('notice') || filename.includes('circular') || filename.includes('deadline')) noticeScore += 8;
    if (filename.includes('note') || filename.includes('lecture') || filename.includes('unit')) notesScore += 6;

    const scores = [
      { type: 'PYQs' as DocumentType, score: pyqScore },
      { type: 'Notice' as DocumentType, score: noticeScore },
      { type: 'Syllabus' as DocumentType, score: syllabusScore },
      { type: 'Notes' as DocumentType, score: notesScore },
    ];

    scores.sort((a, b) => b.score - a.score);
    const top = scores[0];

    // If top score is negligible
    if (top.score < 12) {
      return {
        type: 'Other',
        confidence: 0.4,
        reasoning: 'Content does not strongly match academic syllabus, past questions, notices, or lecture notes.',
      };
    }

    const confidence = Math.min(0.98, Math.max(0.65, top.score / 60));
    return {
      type: top.type,
      confidence,
      reasoning: `Classified as ${top.type} based on primary document content patterns (score: ${top.score}).`,
    };
  }

  private normalizeType(raw: string): DocumentType | null {
    const r = (raw || '').toLowerCase().trim();
    if (r === 'syllabus') return 'Syllabus';
    if (r === 'pyq' || r === 'pyqs') return 'PYQs';
    if (r === 'notice') return 'Notice';
    if (r === 'notes' || r === 'note') return 'Notes';
    if (r === 'other') return 'Other';
    return null;
  }
}

export const documentClassifier = new DocumentClassifier();
