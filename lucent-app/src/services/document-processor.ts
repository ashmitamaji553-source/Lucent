// src/services/document-processor.ts
// Document extraction, parsing, and classification pipeline
import { Document, DocumentType } from '../lib/models/types';
import { documentRepo, courseRepo, deadlineRepo } from '../lib/db/repositories';
import { topicService } from './topic-service';
import { aiService } from './ai-service';

export interface ProcessedDocumentResult {
  document: Document;
  extractedTopics: string[];
  extractedDeadlines: Array<{ title: string; date: string; type: 'Quiz' | 'Assignment' | 'Exam'; description: string }>;
  summary: string;
}

export class DocumentProcessor {
  /**
   * Detects document type from filename or header text if not explicitly specified.
   */
  public detectDocumentType(filename: string, content?: string): DocumentType {
    const f = filename.toLowerCase();
    const c = (content || '').toLowerCase();

    if (f.includes('syllabus') || c.includes('course outline') || c.includes('syllabus')) return 'Syllabus';
    if (f.includes('pyq') || f.includes('past') || f.includes('exam') || c.includes('previous year') || c.includes('question paper')) return 'PYQs';
    if (f.includes('notice') || f.includes('circular') || c.includes('deadline') || c.includes('notification')) return 'Notice';
    if (f.includes('note') || f.includes('unit') || f.includes('chapter') || c.includes('lecture')) return 'Notes';
    return 'Other';
  }

  /**
   * Processes an uploaded document through the complete extraction pipeline.
   */
  public async processDocument(
    docId: string,
    fileBuffer: Buffer | string,
    filename: string,
    explicitType?: DocumentType
  ): Promise<ProcessedDocumentResult> {
    const rawText = typeof fileBuffer === 'string' ? fileBuffer : fileBuffer.toString('utf-8');
    const detectedType = explicitType && explicitType !== 'Other'
      ? explicitType
      : this.detectDocumentType(filename, rawText);

    await documentRepo.updateStatus(docId, 'Processing');

    // Step 1: AI / Heuristic Extraction
    const extractionPrompt = `
Analyze this academic study material (${filename}, type: ${detectedType}).
Raw content extract:
"""
${rawText.slice(0, 3000)}
"""

Extract the following in JSON format:
{
  "courseName": "e.g. Data Structures or DBMS",
  "summary": "1-2 sentence overview of what this document covers",
  "topics": ["list", "of", "topics", "found"],
  "deadlines": [
    { "title": "name", "date": "YYYY-MM-DD", "type": "Quiz/Assignment/Exam", "description": "details" }
  ]
}
`;

    let aiResult: {
      courseName?: string;
      summary?: string;
      topics?: string[];
      deadlines?: Array<{ title: string; date: string; type: 'Quiz' | 'Assignment' | 'Exam'; description: string }>;
    } = {};

    try {
      aiResult = await aiService.generateStructuredJson(extractionPrompt);
    } catch {
      aiResult = {
        courseName: filename.includes('DS') ? 'Data Structures' : filename.includes('DBMS') ? 'DBMS' : 'Data Structures',
        summary: `Analyzed ${filename} for academic concepts and curriculum milestones.`,
        topics: [filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')],
        deadlines: [],
      };
    }

    // Step 2: Associate with or find course
    const courseName = aiResult.courseName || 'Data Structures';
    let course = courseRepo.getByName(courseName);
    if (!course) {
      course = await courseRepo.create({
        userId: 'user_1',
        name: courseName,
        code: courseName.slice(0, 3).toUpperCase() + '101',
        term: 'Fall 2026',
      });
    }

    // Step 3: Extract & ingest topics if syllabus or notes
    const extractedTopics = aiResult.topics || [];
    if (extractedTopics.length > 0 && (detectedType === 'Syllabus' || detectedType === 'Notes')) {
      await topicService.ingestTopicsFromDocument(course.id, extractedTopics);
    }

    // Step 4: Record any deadlines found in notices
    const extractedDeadlines = aiResult.deadlines || [];
    for (const dl of extractedDeadlines) {
      await deadlineRepo.create({
        userId: 'user_1',
        courseId: course.id,
        documentId: docId,
        title: dl.title,
        description: dl.description || `Extracted from ${filename}`,
        dueDate: new Date(dl.date).toISOString(),
        type: dl.type || 'Quiz',
        status: 'pending',
      });
    }

    // Step 5: Mark document as Processed
    const updatedDoc = await documentRepo.updateStatus(docId, 'Processed', {
      topicsFound: extractedTopics,
      deadlinesFound: extractedDeadlines.map((d) => `${d.title} (${d.date})`),
      year: new Date().getFullYear(),
    });

    return {
      document: updatedDoc!,
      extractedTopics,
      extractedDeadlines,
      summary: aiResult.summary || 'Document extracted and indexed successfully.',
    };
  }
}

export const documentProcessor = new DocumentProcessor();
