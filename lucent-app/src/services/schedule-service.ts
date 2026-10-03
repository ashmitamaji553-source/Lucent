// src/services/schedule-service.ts
// Schedule generation, conflict detection, and study workload balancing
import {
  studyPlanRepo,
  deadlineRepo,
  conflictRepo,
  userRepo,
} from '../lib/db/repositories';
import { StudyPlanItem, Conflict } from '../lib/models/types';
import { priorityService } from './priority-service';

export interface StudyPlanView {
  todayTasks: StudyPlanItem[];
  upcomingTasks: StudyPlanItem[];
  focusAreas: string[];
  studyTip: string;
  conflicts: Conflict[];
}

export class ScheduleService {
  /**
   * Generates or retrieves the complete study plan view.
   */
  public async getPlanView(): Promise<StudyPlanView> {
    await this.detectAndRecordConflicts();

    const items = studyPlanRepo.getAll();
    const todayTasks = items.filter((t) => !t.dueDate);
    const upcomingTasks = items.filter((t) => Boolean(t.dueDate));

    const focusAreas = priorityService.getTopFocusAreas(4);
    const conflicts = conflictRepo.getAll();

    // Dynamically formulate contextual study tip based on earliest deadline
    const deadlines = deadlineRepo.getAll();
    const upcomingExam = deadlines.find((d) => d.status === 'pending');
    let studyTip = 'Consistency is key. Focus 20-30 minutes on your highest-priority topic today.';
    if (upcomingExam) {
      const days = Math.max(1, Math.ceil((new Date(upcomingExam.dueDate).getTime() - Date.now()) / 86400000));
      studyTip = `You have a ${upcomingExam.title} in ${days} days. ${upcomingExam.description}.`;
    }

    return {
      todayTasks,
      upcomingTasks,
      focusAreas,
      studyTip,
      conflicts,
    };
  }

  /**
   * Scans all deadlines for clustering / conflicts (e.g. multiple exams or quizzes within 48 hours).
   */
  public async detectAndRecordConflicts(): Promise<Conflict[]> {
    const deadlines = deadlineRepo.getAll().filter((d) => d.status === 'pending');
    const existingConflicts = conflictRepo.getAll();
    const resolvedIds = new Set(existingConflicts.filter((c) => c.resolved).map((c) => `${c.deadlineId1}_${c.deadlineId2}`));

    for (let i = 0; i < deadlines.length; i++) {
      for (let j = i + 1; j < deadlines.length; j++) {
        const d1 = deadlines[i];
        const d2 = deadlines[j];
        const key = `${d1.id}_${d2.id}`;
        if (resolvedIds.has(key)) continue;

        const diffHours = Math.abs(new Date(d1.dueDate).getTime() - new Date(d2.dueDate).getTime()) / 3600000;
        if (diffHours <= 48) {
          const already = existingConflicts.find(
            (c) => (c.deadlineId1 === d1.id && c.deadlineId2 === d2.id) || (c.deadlineId1 === d2.id && c.deadlineId2 === d1.id)
          );
          if (!already) {
            await conflictRepo.create({
              userId: 'user_1',
              deadlineId1: d1.id,
              deadlineId2: d2.id,
              severity: diffHours <= 24 ? 'high' : 'medium',
              description: `${d1.title} and ${d2.title} are scheduled within ${Math.round(diffHours)} hours of each other.`,
              resolved: false,
            });
          }
        }
      }
    }

    return conflictRepo.getAll();
  }

  /**
   * Regenerates today's micro-study schedule using the student's daily study goal and priority topics.
   */
  public async regeneratePlan(): Promise<StudyPlanItem[]> {
    const user = userRepo.getPrimaryUser();
    const goalMinutes = user.dailyStudyGoalMinutes || 180;
    const prioritized = priorityService.getPrioritizedTopics().slice(0, 3);
    const deadlines = deadlineRepo.getAll().filter((d) => d.status === 'pending');

    const newItems: StudyPlanItem[] = [];
    let allocatedMinutes = 0;
    let orderIndex = 1;

    // Add high priority review topics
    for (const item of prioritized) {
      if (allocatedMinutes >= goalMinutes) break;
      const duration = item.topic.difficulty === 'Hard' ? 30 : 20;
      newItems.push({
        id: `sp_${Date.now()}_${orderIndex}`,
        userId: user.id,
        topicId: item.topic.id,
        title: `Review ${item.topic.name}`,
        duration: `${duration} min`,
        durationMinutes: duration,
        priority: item.priorityScore > 100 ? 'High' : 'Medium',
        type: item.topic.difficulty === 'Hard' ? 'Practice' : 'Review',
        completed: false,
        orderIndex: orderIndex++,
        createdAt: new Date().toISOString(),
      });
      allocatedMinutes += duration;
    }

    // Add upcoming deadline tasks
    for (const dl of deadlines) {
      const days = Math.ceil((new Date(dl.dueDate).getTime() - Date.now()) / 86400000);
      newItems.push({
        id: `sp_${Date.now()}_${orderIndex}`,
        userId: user.id,
        deadlineId: dl.id,
        title: dl.title,
        duration: days <= 1 ? 'Tomorrow' : `In ${days} days`,
        durationMinutes: 60,
        dueDate: dl.dueDate,
        priority: days <= 3 ? 'High' : 'Medium',
        type: dl.type === 'Assignment' ? 'Practice' : 'Quiz',
        completed: false,
        orderIndex: orderIndex++,
        createdAt: new Date().toISOString(),
      });
    }

    return studyPlanRepo.replaceAll(newItems);
  }
}

export const scheduleService = new ScheduleService();
