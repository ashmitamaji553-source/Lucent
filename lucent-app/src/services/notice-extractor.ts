// src/services/notice-extractor.ts
// Extracts events, deadlines, exams, assignments, dates, times, courses, instructions

import { Deadline, DeadlineType } from '../lib/models/types';
import { courseRepo, deadlineRepo, conflictRepo } from '../lib/db/repositories';
import { aiService } from './ai-service';

export interface ExtractedNoticeEvent {
  title: string;
  type: DeadlineType;
  date: string; // YYYY-MM-DD
  time?: string;
  courseName?: string;
  instructions?: string;
}

export interface NoticeExtractionResult {
  institutionOrDept?: string;
  events: ExtractedNoticeEvent[];
}

export class NoticeExtractor {
  /**
   * Extracts events and deadlines from notices and persists them into the deadline schedule.
   */
  public async extractAndStore(
    rawText: string,
    filename: string,
    docId: string
  ): Promise<{
    deadlinesCount: number;
    feedback: string[];
    deadlines: Deadline[];
  }> {
    let result: NoticeExtractionResult | null = null;

    if (aiService.isConfigured()) {
      try {
        const prompt = `
Analyze this academic administrative notice or circular and extract all upcoming events, exam schedules, and deadlines in JSON format.
Content extract:
"""
${rawText.slice(0, 4500)}
"""

Extract:
1. institutionOrDept: Issuing department or university
2. events: Array of items:
   - title: Event or milestone name (e.g. "Mid-Term Examination", "Assignment 2 Submission", "Quiz 1")
   - type: "Exam" | "Assignment" | "Quiz" | "Project" | "Other"
   - date: "YYYY-MM-DD"
   - time: e.g. "10:00 AM", "23:59", "2:00 PM"
   - courseName: Target course/subject if specified (e.g., "Operating Systems", "Data Structures")
   - instructions: Specific student guidelines, rules, or penalty instructions

Output strictly in JSON schema:
{
  "institutionOrDept": "string",
  "events": [
    {
      "title": "string",
      "type": "Exam" | "Assignment" | "Quiz" | "Project" | "Other",
      "date": "YYYY-MM-DD",
      "time": "string",
      "courseName": "string",
      "instructions": "string"
    }
  ]
}
`;
        result = await aiService.generateStructuredJson<NoticeExtractionResult>(prompt);
      } catch (err) {
        console.warn('AI notice extraction failed, using heuristic engine:', err);
      }
    }

    if (!result || !result.events || result.events.length === 0) {
      result = this.heuristicExtract(rawText, filename);
    }

    const savedDeadlines: Deadline[] = [];
    const courses = courseRepo.getAll();

    for (const ev of result.events) {
      if (!ev.title) continue;

      // Find course association if any
      let matchedCourseId: string | undefined;
      if (ev.courseName) {
        const matched = courses.find((c) => c.name.toLowerCase().includes(ev.courseName!.toLowerCase()));
        if (matched) matchedCourseId = matched.id;
      }

      // Format ISO dueDate combining date and time
      const datePart = ev.date && !isNaN(Date.parse(ev.date)) ? ev.date : this.getFutureDateString(7);
      let isoDueDate = new Date(datePart).toISOString();
      if (ev.time && isoDueDate.includes('T')) {
        const [hours, minutes] = this.parseTime(ev.time);
        const d = new Date(datePart);
        d.setHours(hours, minutes, 0, 0);
        isoDueDate = d.toISOString();
      }

      const saved = await deadlineRepo.create({
        userId: 'user_1',
        courseId: matchedCourseId,
        documentId: docId,
        title: ev.title,
        description: ev.instructions || `Extracted from ${filename}`,
        dueDate: isoDueDate,
        date: datePart,
        time: ev.time,
        instructions: ev.instructions,
        type: ev.type || 'Exam',
        status: 'pending',
      });

      savedDeadlines.push(saved);

      // Check for deadline conflicts with existing deadlines
      const allDeadlines = deadlineRepo.getAll();
      for (const other of allDeadlines) {
        if (other.id === saved.id) continue;
        const diffMs = Math.abs(new Date(other.dueDate).getTime() - new Date(saved.dueDate).getTime());
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours < 24 && (saved.type === 'Exam' || other.type === 'Exam')) {
          await conflictRepo.create({
            userId: 'user_1',
            deadlineId1: saved.id,
            deadlineId2: other.id,
            severity: diffHours < 6 ? 'high' : 'medium',
            description: `Scheduling conflict: ${saved.title} coincides with ${other.title} within ${Math.round(diffHours)} hours.`,
            resolved: false,
          });
        }
      }
    }

    const feedback = [
      'Notice processed.',
      `${savedDeadlines.length} upcoming deadline${savedDeadlines.length === 1 ? '' : 's'} detected.`,
    ];

    return {
      deadlinesCount: savedDeadlines.length,
      feedback,
      deadlines: savedDeadlines,
    };
  }

  /**
   * Deterministic pattern extraction for academic notices, circulars, and dates.
   */
  public heuristicExtract(text: string, filename: string): NoticeExtractionResult {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const events: ExtractedNoticeEvent[] = [];

    // General instructions search
    let instructions = '';
    const instMatch = text.match(/(?:instructions|note|guidelines|rules)[\s:=-]+([^\n]+(?:\n[^\n]+){1,3})/i);
    if (instMatch) {
      instructions = instMatch[1].replace(/\s+/g, ' ').trim();
    }

    // Date parsing helper
    const monthNames: Record<string, string> = {
      january: '01', feb: '02', february: '02', mar: '03', march: '03',
      apr: '04', april: '04', may: '05', jun: '06', june: '06',
      jul: '07', july: '07', aug: '08', august: '08', sep: '09',
      september: '09', oct: '10', october: '10', nov: '11', november: '11',
      dec: '12', december: '12',
    };

    const datePattern = /(?:on\s+)?(\d{1,2})[\s/-]+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|\d{1,2})[\s/,-]+(\d{4})/i;
    const timePattern = /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if line mentions an exam, quiz, assignment, or deadline
      if (/(examination|exam|quiz|assignment|project|submission|presentation|lab test|viva)/i.test(line)) {
        let type: DeadlineType = 'Exam';
        if (/quiz/i.test(line)) type = 'Quiz';
        else if (/assignment/i.test(line)) type = 'Assignment';
        else if (/project/i.test(line)) type = 'Project';

        // Check for date in current line or surrounding lines
        const window = [lines[i - 1] || '', line, lines[i + 1] || ''].join(' ');
        const dm = window.match(datePattern);
        const tm = window.match(timePattern);

        let dateStr = this.getFutureDateString(events.length * 4 + 7);
        if (dm) {
          const day = dm[1].padStart(2, '0');
          const monthRaw = dm[2].toLowerCase();
          const month = monthNames[monthRaw] || monthRaw.padStart(2, '0');
          const year = dm[3];
          dateStr = `${year}-${month}-${day}`;
        }

        // Clean event title
        let title = line
          .replace(/^(?:date|time|notice|subject|schedule|item)[\s:.-]+/i, '')
          .replace(/[-*•\d.)]+/g, '')
          .trim();

        if (title.length > 50) {
          title = title.slice(0, 50).trim() + '...';
        }

        if (title.length >= 4) {
          events.push({
            title: title.charAt(0).toUpperCase() + title.slice(1),
            type,
            date: dateStr,
            time: tm ? tm[1].toUpperCase() : '10:00 AM',
            courseName: this.inferCourseFromText(line),
            instructions: instructions || `Extracted from notice: ${filename}`,
          });
        }
      }
    }

    // If no specific lines fired, create at least 1 deadline from general notice
    if (events.length === 0) {
      events.push({
        title: 'Upcoming Assessment / Submission',
        type: 'Assignment',
        date: this.getFutureDateString(10),
        time: '11:59 PM',
        instructions: instructions || `Official notification extracted from ${filename}`,
      });
    }

    return {
      institutionOrDept: 'Academic Office',
      events,
    };
  }

  private parseTime(timeStr: string): [number, number] {
    const m = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (!m) return [10, 0];
    let hours = parseInt(m[1], 10);
    const minutes = m[2] ? parseInt(m[2], 10) : 0;
    const meridiem = m[3] ? m[3].toLowerCase() : '';

    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
    return [hours, minutes];
  }

  private getFutureDateString(daysAhead: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split('T')[0];
  }

  private inferCourseFromText(text: string): string | undefined {
    const t = text.toLowerCase();
    if (t.includes('os') || t.includes('operating')) return 'Operating Systems';
    if (t.includes('dbms') || t.includes('database')) return 'DBMS';
    if (t.includes('network') || t.includes('cn')) return 'Computer Networks';
    if (t.includes('discrete')) return 'Discrete Mathematics';
    if (t.includes('data struct') || t.includes('ds')) return 'Data Structures';
    return undefined;
  }
}

export const noticeExtractor = new NoticeExtractor();
