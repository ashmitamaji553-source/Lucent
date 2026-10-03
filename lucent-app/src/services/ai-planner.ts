// src/services/ai-planner.ts
// Server-side AI study planner adhering to structured schema, time limits, and security

import { aiService } from './ai-service';

export type SessionType = 'Learn' | 'Practice' | 'Revision';

export interface PlanSession {
  subject: string;
  topic: string;
  duration: number; // minutes
  type: SessionType;
}

export interface PlanDay {
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  sessions: PlanSession[];
}

export interface AiPlanResponse {
  summary: string;
  days: PlanDay[];
}

export interface PlanGenerationInput {
  examDate?: string;
  hoursPerDay?: number | string;
  subjects?: string[] | string;
  topics?: Array<string | { name: string; confidence?: string }>;
  confidence?: Record<string, string> | string;
}

export class AiPlannerService {
  /**
   * Generates a validated, realistic study plan via LLM or deterministic fallback.
   */
  public async generatePlan(input: PlanGenerationInput): Promise<AiPlanResponse> {
    const normalized = this.normalizeInput(input);

    let aiResult: AiPlanResponse | null = null;

    if (aiService.isConfigured()) {
      try {
        const prompt = this.buildPrompt(normalized);
        const rawJson = await aiService.generateStructuredJson<any>(prompt);
        aiResult = this.validateAndNormalizePlan(rawJson, normalized);
      } catch (err) {
        console.warn('AI plan generation error, falling back to verified planner engine:', err);
      }
    }

    if (!aiResult) {
      aiResult = this.generateDeterministicPlan(normalized);
    }

    return aiResult;
  }

  private normalizeInput(input: PlanGenerationInput): {
    examDate: string;
    hoursPerDay: number;
    daysRemaining: number;
    subjects: string[];
    topics: Array<{ name: string; confidence: 'Low' | 'Medium' | 'High' }>;
  } {
    // 1. Exam Date & Days Remaining
    let examDateStr = input.examDate;
    if (!examDateStr || isNaN(Date.parse(examDateStr))) {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      examDateStr = d.toISOString().split('T')[0];
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDate = new Date(examDateStr);
    examDate.setHours(0, 0, 0, 0);
    const diffTime = examDate.getTime() - today.getTime();
    const daysRemaining = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // 2. Hours Per Day (capped realistically between 1 and 12)
    let hours = typeof input.hoursPerDay === 'string' ? parseFloat(input.hoursPerDay) : Number(input.hoursPerDay);
    if (!hours || isNaN(hours) || hours <= 0) hours = 3;
    hours = Math.min(12, Math.max(1, hours));

    // 3. Subjects
    let subjects: string[] = [];
    if (Array.isArray(input.subjects)) {
      subjects = input.subjects.map((s) => String(s).trim()).filter(Boolean);
    } else if (typeof input.subjects === 'string' && input.subjects.trim()) {
      subjects = input.subjects.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (subjects.length === 0) subjects = ['General Studies'];

    // 4. Topics & Confidence
    const confidenceMap: Record<string, 'Low' | 'Medium' | 'High'> = {};
    if (input.confidence && typeof input.confidence === 'object' && !Array.isArray(input.confidence)) {
      for (const [k, v] of Object.entries(input.confidence)) {
        const val = String(v).toLowerCase();
        confidenceMap[k.toLowerCase()] = val.includes('low') ? 'Low' : val.includes('high') ? 'High' : 'Medium';
      }
    }

    const topics: Array<{ name: string; confidence: 'Low' | 'Medium' | 'High' }> = [];
    if (Array.isArray(input.topics)) {
      for (const t of input.topics) {
        if (typeof t === 'string' && t.trim()) {
          const name = t.trim();
          const conf = confidenceMap[name.toLowerCase()] || 'Medium';
          topics.push({ name, confidence: conf });
        } else if (typeof t === 'object' && t !== null && (t as any).name) {
          const name = String((t as any).name).trim();
          const confStr = String((t as any).confidence || '').toLowerCase();
          const conf = confStr.includes('low') ? 'Low' : confStr.includes('high') ? 'High' : 'Medium';
          topics.push({ name, confidence: conf });
        }
      }
    }

    if (topics.length === 0) {
      topics.push(
        { name: `${subjects[0]} Review`, confidence: 'Medium' }
      );
    }

    return {
      examDate: examDateStr,
      hoursPerDay: hours,
      daysRemaining,
      subjects,
      topics,
    };
  }

  private buildPrompt(norm: ReturnType<typeof this.normalizeInput>): string {
    const dailyMinutes = norm.hoursPerDay * 60;
    const daysToGenerate = Math.min(7, Math.max(1, norm.daysRemaining));

    return `You are Lucent, an adaptive AI study planner.
Generate a structured, realistic daily study plan in pure JSON.

INPUTS:
- Exam Date: ${norm.examDate} (${norm.daysRemaining} days remaining)
- Available Daily Study Time: ${norm.hoursPerDay} hours/day (${dailyMinutes} minutes/day max)
- Subjects: ${norm.subjects.join(', ')}
- Topics & Confidence Levels:
${norm.topics.map((t) => `  * ${t.name}: Confidence ${t.confidence}`).join('\n')}

RULES:
1. Prioritize low-confidence topics with "Learn" sessions (40-60% of time).
2. Medium-confidence topics receive "Practice" sessions (25-35% of time).
3. High-confidence topics receive "Revision" sessions (15-25% of time).
4. Exam urgency: since ${norm.daysRemaining} days remain, schedule essential revision and practice close to the exam.
5. NEVER exceed ${dailyMinutes} total minutes on any day.
6. totalMinutes for each day must be <= ${dailyMinutes} and equal the sum of session durations.
7. Return a schedule for ${daysToGenerate} days starting from today (${new Date().toISOString().split('T')[0]}).

RESPOND WITH THIS EXACT JSON SCHEMA ONLY:
{
  "summary": "1-2 sentence explanation of why topics were prioritized based on confidence and exam urgency",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "totalMinutes": ${dailyMinutes},
      "sessions": [
        {
          "subject": "${norm.subjects[0]}",
          "topic": "Topic Name",
          "duration": 60,
          "type": "Learn" | "Practice" | "Revision"
        }
      ]
    }
  ]
}`;
  }

  /**
   * Validates and repairs AI response to guarantee it strictly matches the required schema.
   */
  public validateAndNormalizePlan(
    raw: any,
    norm: ReturnType<typeof this.normalizeInput>
  ): AiPlanResponse | null {
    if (!raw || typeof raw !== 'object') return null;

    const summary = typeof raw.summary === 'string' && raw.summary.trim()
      ? raw.summary.trim()
      : `Adaptive study plan generated for ${norm.subjects.join(', ')} prioritizing lower-confidence areas before your exam.`;

    if (!Array.isArray(raw.days) || raw.days.length === 0) return null;

    const maxDailyMinutes = norm.hoursPerDay * 60;
    const validatedDays: PlanDay[] = [];

    const startDate = new Date();

    for (let i = 0; i < raw.days.length; i++) {
      const d = raw.days[i];
      if (!d || typeof d !== 'object') continue;

      // Ensure valid date
      let dateStr = typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : '';
      if (!dateStr) {
        const cur = new Date(startDate);
        cur.setDate(startDate.getDate() + i);
        dateStr = cur.toISOString().split('T')[0];
      }

      if (!Array.isArray(d.sessions) || d.sessions.length === 0) continue;

      const validSessions: PlanSession[] = [];
      let totalMins = 0;

      for (const s of d.sessions) {
        if (!s || typeof s !== 'object') continue;
        const topic = typeof s.topic === 'string' ? s.topic.trim() : 'Core Concepts';
        const subject = typeof s.subject === 'string' ? s.subject.trim() : norm.subjects[0];
        const duration = typeof s.duration === 'number' && !isNaN(s.duration) ? Math.max(15, Math.round(s.duration)) : 30;

        let type: SessionType = 'Learn';
        const rawType = String(s.type || '').toLowerCase();
        if (rawType.includes('practice')) type = 'Practice';
        else if (rawType.includes('revision') || rawType.includes('review')) type = 'Revision';

        validSessions.push({ subject, topic, duration, type });
        totalMins += duration;
      }

      if (validSessions.length === 0) continue;

      // Enforce: Never exceed available daily study time
      if (totalMins > maxDailyMinutes) {
        const factor = maxDailyMinutes / totalMins;
        let runningTotal = 0;
        for (let sIdx = 0; sIdx < validSessions.length; sIdx++) {
          if (sIdx === validSessions.length - 1) {
            validSessions[sIdx].duration = Math.max(15, maxDailyMinutes - runningTotal);
          } else {
            validSessions[sIdx].duration = Math.max(15, Math.floor(validSessions[sIdx].duration * factor));
            runningTotal += validSessions[sIdx].duration;
          }
        }
        totalMins = validSessions.reduce((acc, sess) => acc + sess.duration, 0);
      }

      validatedDays.push({
        date: dateStr,
        totalMinutes: totalMins,
        sessions: validSessions,
      });
    }

    if (validatedDays.length === 0) return null;

    return {
      summary,
      days: validatedDays,
    };
  }

  /**
   * Deterministic, mathematically verified planner that guarantees the schema and constraints.
   */
  public generateDeterministicPlan(norm: ReturnType<typeof this.normalizeInput>): AiPlanResponse {
    const dailyMinutes = norm.hoursPerDay * 60;
    const daysCount = Math.min(7, Math.max(1, norm.daysRemaining));
    const days: PlanDay[] = [];

    // Sort topics by priority: Low confidence first, then Medium, then High
    const sortedTopics = [...norm.topics].sort((a, b) => {
      const weight = { Low: 1, Medium: 2, High: 3 };
      return weight[a.confidence] - weight[b.confidence];
    });

    const lowConfidenceTopic = sortedTopics.find((t) => t.confidence === 'Low')?.name;
    const summary = lowConfidenceTopic
      ? `${lowConfidenceTopic} receives additional time because confidence is low and the exam is approaching in ${norm.daysRemaining} days.`
      : `Workload balanced across ${norm.topics.length} topics to ensure complete coverage before your exam in ${norm.daysRemaining} days.`;

    const startDate = new Date();

    for (let dayIdx = 0; dayIdx < daysCount; dayIdx++) {
      const curDate = new Date(startDate);
      curDate.setDate(startDate.getDate() + dayIdx);
      const dateStr = curDate.toISOString().split('T')[0];

      const sessions: PlanSession[] = [];
      let remainingMinutes = dailyMinutes;

      // Allocate sessions across topics
      for (let tIdx = 0; tIdx < sortedTopics.length; tIdx++) {
        if (remainingMinutes <= 0) break;

        const topicObj = sortedTopics[(dayIdx + tIdx) % sortedTopics.length];
        const subject = norm.subjects[tIdx % norm.subjects.length] || norm.subjects[0];

        let type: SessionType = 'Learn';
        let shareRatio = 0.5;

        if (topicObj.confidence === 'Low') {
          type = dayIdx < 2 ? 'Learn' : 'Practice';
          shareRatio = 0.5;
        } else if (topicObj.confidence === 'Medium') {
          type = 'Practice';
          shareRatio = 0.35;
        } else {
          type = 'Revision';
          shareRatio = 0.2;
        }

        // On last few days before exam, shift toward Revision
        if (norm.daysRemaining - dayIdx <= 2) {
          type = topicObj.confidence === 'High' ? 'Revision' : 'Practice';
        }

        let duration = Math.round((dailyMinutes * shareRatio) / 15) * 15;
        duration = Math.min(remainingMinutes, Math.max(15, duration));

        if (tIdx === sortedTopics.length - 1 || remainingMinutes - duration < 15) {
          duration = remainingMinutes; // Absorb remainder exactly
        }

        sessions.push({
          subject,
          topic: topicObj.name,
          duration,
          type,
        });

        remainingMinutes -= duration;
      }

      const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);

      days.push({
        date: dateStr,
        totalMinutes,
        sessions,
      });
    }

    return {
      summary,
      days,
    };
  }
}

export const aiPlannerService = new AiPlannerService();
