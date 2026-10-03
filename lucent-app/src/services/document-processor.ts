// src/services/document-processor.ts
// Complete Phase 2 Smart Upload Pipeline: Validate -> Store -> Extract -> Classify -> AI Structure -> Persist -> Feedback

import fs from 'fs';
import path from 'path';
import { Document, DocumentType } from '../lib/models/types';
import { documentRepo } from '../lib/db/repositories';
import { textExtractor, TextExtractor } from './text-extractor';
import { documentClassifier } from './classifier';
import { syllabusExtractor } from './syllabus-extractor';
import { pyqExtractor } from './pyq-extractor';
import { noticeExtractor } from './notice-extractor';
import { notesExtractor } from './notes-extractor';

export interface ProcessedDocumentResult {
  document: Document;
  detectedType: DocumentType;
  feedback: string[];
  summary: string;
  topicsFound: string[];
  deadlinesFound: string[];
}

export class DocumentProcessor {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), '.lucent', 'uploads');
  }

  private ensureUploadsDir() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Main entrypoint for processing an uploaded document through the complete pipeline.
   */
  public async processUpload(
    filename: string,
    fileBuffer: Buffer,
    declaredMime?: string,
    overrideType?: DocumentType
  ): Promise<ProcessedDocumentResult> {
    // -----------------------------------------------------------------
    // 1. Validate & Store raw file
    // -----------------------------------------------------------------
    this.ensureUploadsDir();

    // Check empty document immediately
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error(`The uploaded file "${filename}" is empty. Please check the file and try again.`);
    }

    if (fileBuffer.length > TextExtractor.MAX_FILE_SIZE) {
      throw new Error(`File "${filename}" exceeds the maximum upload limit of 25MB.`);
    }

    // Initial placeholder doc in database with 'Uploading'/'Processing'
    const doc = await documentRepo.create({
      userId: 'user_1',
      courseId: 'c_ds',
      name: filename,
      type: overrideType && overrideType !== 'Other' ? overrideType : 'Other',
      fileSize: fileBuffer.length,
      mimeType: declaredMime || 'application/octet-stream',
      status: 'Processing',
    });

    try {
      // Persist raw binary to disk
      const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const diskPath = path.join(this.uploadsDir, `${doc.id}_${sanitizedName}`);
      await fs.promises.writeFile(diskPath, fileBuffer);

      // -----------------------------------------------------------------
      // 2. Extract Text
      // -----------------------------------------------------------------
      const extracted = await textExtractor.extractText(filename, fileBuffer, declaredMime);
      const rawText = extracted.text;

      // -----------------------------------------------------------------
      // 3. Classify Document (Content is primary signal)
      // -----------------------------------------------------------------
      let docType: DocumentType;
      if (overrideType && overrideType !== 'Other') {
        docType = overrideType;
      } else {
        const classification = await documentClassifier.classify(rawText, filename);
        docType = classification.type;
      }

      // Update document with detected type
      await documentRepo.updateStatus(doc.id, 'Processing', {
        pageCount: extracted.pageCount,
      });

      // -----------------------------------------------------------------
      // 4. AI Structure Extraction & 5. Save Structured Data
      // -----------------------------------------------------------------
      let feedback: string[] = [];
      let summary = '';
      let topicsFound: string[] = [];
      let deadlinesFound: string[] = [];
      let finalCourseId = doc.courseId;

      switch (docType) {
        case 'Syllabus': {
          const res = await syllabusExtractor.extractAndStore(rawText, filename, doc.id);
          finalCourseId = res.course.id;
          feedback = res.feedback;
          summary = `Curriculum extracted for ${res.course.name}: ${res.topicCount} topics across ${res.unitsCount} units.`;
          topicsFound = res.learningObjectives.concat(res.importantTerminology);
          break;
        }

        case 'PYQs': {
          const res = await pyqExtractor.extractAndStore(rawText, filename, doc.id);
          finalCourseId = res.course.id;
          feedback = res.feedback;
          summary = `PYQ exam paper indexed for ${res.course.name}: ${res.questionsCount} questions processed.`;
          topicsFound = res.questions.map((q) => q.topicName || q.questionText.slice(0, 30)).filter(Boolean);
          break;
        }

        case 'Notice': {
          const res = await noticeExtractor.extractAndStore(rawText, filename, doc.id);
          feedback = res.feedback;
          summary = `Academic notice parsed: ${res.deadlinesCount} upcoming deadlines scheduled.`;
          deadlinesFound = res.deadlines.map((d) => `${d.title} (${d.date || d.dueDate.slice(0, 10)})`);
          break;
        }

        case 'Notes': {
          const res = await notesExtractor.extractAndStore(rawText, filename, doc.id);
          finalCourseId = res.course.id;
          feedback = res.feedback;
          summary = res.summary || `Lecture notes indexed for ${res.course.name}.`;
          break;
        }

        default: {
          // Other academic material
          feedback = ['Document processed and indexed.'];
          summary = `Analyzed ${filename} for academic reference.`;
          break;
        }
      }

      // -----------------------------------------------------------------
      // 6. Complete Document record with 'Processed'
      // -----------------------------------------------------------------
      const updatedDoc = await documentRepo.updateStatus(doc.id, 'Processed', {
        topicsFound,
        deadlinesFound,
        feedbackMessages: feedback,
        pageCount: extracted.pageCount,
        year: new Date().getFullYear(),
      });

      if (updatedDoc) {
        updatedDoc.type = docType;
        updatedDoc.courseId = finalCourseId;
        updatedDoc.rawText = rawText.slice(0, 6000);
        updatedDoc.extractedSummary = summary;
      }

      return {
        document: updatedDoc || doc,
        detectedType: docType,
        feedback,
        summary,
        topicsFound,
        deadlinesFound,
      };
    } catch (err: any) {
      // Mark document as Error in DB
      await documentRepo.updateStatus(doc.id, 'Error');
      console.error(`Document pipeline error for "${filename}":`, err);
      throw err;
    }
  }

  /**
   * Backward-compatibility helper for legacy method signature.
   */
  public async processDocument(
    docId: string,
    fileBuffer: Buffer | string,
    filename: string,
    explicitType?: DocumentType
  ): Promise<ProcessedDocumentResult> {
    const buf = typeof fileBuffer === 'string' ? Buffer.from(fileBuffer) : fileBuffer;
    return this.processUpload(filename, buf, undefined, explicitType);
  }
}

export const documentProcessor = new DocumentProcessor();
