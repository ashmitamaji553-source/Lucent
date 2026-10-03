// src/app/api/adapt/route.ts
// POST /api/adapt — Generates an updated study plan based on student feedback and adaptation rules

import { NextRequest, NextResponse } from 'next/server';
import { adaptationService, FeedbackStatus } from '@/services/adaptation-service';
import { planStore } from '@/services/plan-store';
import { userRepo, studyPlanRepo } from '@/lib/db/repositories';
import { StudyPlanItem } from '@/lib/models/types';

export const dynamic = 'force-dynamic';

const ALLOWED_STATUSES: FeedbackStatus[] = ['understood', 'needs_practice', 'struggled'];

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON request body' },
        { status: 400 }
      );
    }

    const user = userRepo.getPrimaryUser();

    // Feedback status (can be passed as `feedback` or `status`)
    const feedback: FeedbackStatus = body.feedback || body.status;
    if (!feedback || !ALLOWED_STATUSES.includes(feedback)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid feedback status. Must be one of: ${ALLOWED_STATUSES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Completed session information
    const completedSession = body.completedSession || {
      sessionId: body.sessionId,
      subject: body.subject || 'Mathematics',
      topic: body.topic || 'Probability',
      duration: body.duration || 45,
      type: body.type || 'Learn',
    };

    if (!completedSession.topic) {
      return NextResponse.json(
        { success: false, error: 'completedSession.topic is required' },
        { status: 400 }
      );
    }

    // Current plan: use provided plan or fallback to persisted active plan
    let currentPlan = body.currentPlan || planStore.getActivePlan();

    // Available daily hours: support hoursPerDay, availableHours, or user preferences
    const hoursPerDay = Number(
      body.hoursPerDay ||
      body.availableHours ||
      (user?.dailyStudyGoalMinutes ? Math.round(user.dailyStudyGoalMinutes / 60) : 3)
    );

    // Days remaining calculation
    let daysRemaining = Number(body.daysRemaining);
    if (!daysRemaining || isNaN(daysRemaining)) {
      if (user?.examDate) {
        const diffMs = new Date(user.examDate).getTime() - Date.now();
        daysRemaining = Math.max(1, Math.ceil(diffMs / 86400000));
      } else {
        daysRemaining = 7;
      }
    }

    // Run AI or verified deterministic adaptation engine
    const adaptedResult = await adaptationService.adaptPlan({
      currentPlan,
      completedSession,
      feedback,
      daysRemaining,
      hoursPerDay,
    });

    // Save adapted plan in plan store
    planStore.setActivePlan(adaptedResult, adaptedResult.adaptation);

    // Synchronize studyPlanRepo for dashboard tasks
    const newItems: StudyPlanItem[] = [];
    let orderIndex = 1;

    for (let dayIdx = 0; dayIdx < adaptedResult.days.length; dayIdx++) {
      const day = adaptedResult.days[dayIdx];
      const isToday = dayIdx === 0;

      for (const session of day.sessions) {
        newItems.push({
          id: `sp_adapt_${Date.now()}_${orderIndex}`,
          userId: user.id,
          title: `${session.type}: ${session.topic} (${session.subject})`,
          duration: `${session.duration} min`,
          durationMinutes: session.duration,
          scheduledDate: day.date,
          dueDate: isToday ? undefined : day.date,
          priority: session.type === 'Learn' ? 'High' : session.type === 'Practice' ? 'Medium' : 'Low',
          type: session.type === 'Revision' ? 'Review' : session.type === 'Practice' ? 'Practice' : 'Read',
          completed: false,
          orderIndex: orderIndex++,
          createdAt: new Date().toISOString(),
        });
      }
    }

    await studyPlanRepo.replaceAll(newItems);

    // Return the required structured response matching /api/plan schema + adaptation details
    return NextResponse.json({
      summary: adaptedResult.summary,
      days: adaptedResult.days,
      adaptation: adaptedResult.adaptation,
    });
  } catch (error: any) {
    console.error('Adaptation error:', error);
    return NextResponse.json(
      {
        summary: "Lucent couldn't adapt your plan right now. Try again.",
        days: [],
        error: error.message || 'Plan adaptation failed',
      },
      { status: 500 }
    );
  }
}
