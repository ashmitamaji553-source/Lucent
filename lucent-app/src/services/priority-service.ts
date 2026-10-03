// src/services/priority-service.ts
// Priority engine calculating urgency, topic signals, and student readiness
import { topicRepo, coverageRepo, deadlineRepo, compositeRepo } from '../lib/db/repositories';
import { SignalSummary, Topic } from '../lib/models/types';

export interface PrioritizedTopic {
  topic: Topic;
  coverage: number;
  priorityScore: number;
  reason: string;
}

export class PriorityService {
  /**
   * Calculates overall learning signals for the dashboard cards.
   */
  public getSignals(): SignalSummary {
    return compositeRepo.getSignals();
  }

  /**
   * Computes mathematical priority ranking for all curriculum topics.
   * Priority is driven by:
   * 1. Coverage gap (100 - coverage): The lower the coverage, the higher the need.
   * 2. PYQ Frequency: High (x1.5), Medium (x1.2), Low (x1.0).
   * 3. Upcoming deadline proximity for the parent course.
   * 4. Difficulty level: Hard (x1.4), Medium (x1.2), Easy (x1.0).
   */
  public getPrioritizedTopics(): PrioritizedTopic[] {
    const topics = topicRepo.getAll();
    const coverages = coverageRepo.getAll();
    const covMap = new Map(coverages.map((c) => [c.topicId, c.score]));
    const deadlines = deadlineRepo.getAll();
    const now = Date.now();

    // Map course to earliest upcoming deadline in days
    const courseDeadlineDays = new Map<string, number>();
    for (const dl of deadlines) {
      if (!dl.courseId) continue;
      const days = Math.max(1, Math.ceil((new Date(dl.dueDate).getTime() - now) / 86400000));
      const curr = courseDeadlineDays.get(dl.courseId) ?? Infinity;
      if (days < curr) courseDeadlineDays.set(dl.courseId, days);
    }

    const scored: PrioritizedTopic[] = topics.map((t) => {
      const coverage = covMap.get(t.id) ?? 50;
      const coverageGap = Math.max(0, 100 - coverage);

      const pyqMult = t.pyqFrequency === 'High' ? 1.6 : t.pyqFrequency === 'Medium' ? 1.2 : 1.0;
      const diffMult = t.difficulty === 'Hard' ? 1.4 : t.difficulty === 'Medium' ? 1.2 : 1.0;

      const daysToExam = courseDeadlineDays.get(t.courseId) ?? 14;
      const proximityMult = daysToExam <= 3 ? 1.8 : daysToExam <= 7 ? 1.4 : 1.0;

      const priorityScore = Math.round(coverageGap * pyqMult * diffMult * proximityMult);

      let reason = 'General curriculum review';
      if (coverage < 50 && t.pyqFrequency === 'High') {
        reason = 'High exam weight and low current coverage';
      } else if (daysToExam <= 3) {
        reason = `Upcoming assessment in ${daysToExam} days`;
      } else if (t.difficulty === 'Hard') {
        reason = 'Conceptually challenging topic';
      }

      return {
        topic: t,
        coverage,
        priorityScore,
        reason,
      };
    });

    return scored.sort((a, b) => b.priorityScore - a.priorityScore);
  }

  /**
   * Returns top N high-priority focus areas for study planning.
   */
  public getTopFocusAreas(limit: number = 4): string[] {
    const scored = this.getPrioritizedTopics();
    return scored.slice(0, limit).map((s) => s.topic.name);
  }
}

export const priorityService = new PriorityService();
