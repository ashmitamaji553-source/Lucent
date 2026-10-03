// src/app/api/plan/route.ts
// POST /api/plan — AI study plan generation endpoint returning structured JSON

import { NextRequest, NextResponse } from 'next/server';
import { aiPlannerService } from '@/services/ai-planner';
import { userRepo, studyPlanRepo } from '@/lib/db/repositories';
import { StudyPlanItem } from '@/lib/models/types';
import { planStore } from '@/services/plan-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = userRepo.getPrimaryUser();
    const storedItems = studyPlanRepo.getAll();
    const activePlan = planStore.getActivePlan();

    if (!activePlan) {
      return NextResponse.json({
        success: true,
        summary: null,
        days: [],
        adaptation: null,
        completedSessions: {},
        feedbackHistory: [],
        todayTasks: [],
        upcomingTasks: [],
        focusAreas: [],
        studyTip: null,
      });
    }

    const lastAdaptation = planStore.getLastAdaptation();
    const completedSessions = planStore.getCompletedSessionsMap();
    const feedbackHistory = planStore.getFeedbackLog();
    const todayTasks = storedItems.filter((t) => !t.dueDate);
    const upcomingTasks = storedItems.filter((t) => Boolean(t.dueDate));

    return NextResponse.json({
      success: true,
      summary: activePlan.summary,
      days: activePlan.days,
      adaptation: lastAdaptation,
      completedSessions,
      feedbackHistory,
      todayTasks,
      upcomingTasks,
      focusAreas: activePlan.days.flatMap((d) => d.sessions.map((s) => s.topic)),
      studyTip: activePlan.summary,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve study plan' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const user = userRepo.getPrimaryUser();
    const examDate = body.examDate || user?.examDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const hoursPerDay = Number(body.hoursPerDay) || (user?.dailyStudyGoalMinutes ? Math.round(user.dailyStudyGoalMinutes / 60) : 3);
    const subjects = Array.isArray(body.subjects) && body.subjects.length > 0
      ? body.subjects
      : typeof body.subjects === 'string' && body.subjects.trim()
      ? [body.subjects.trim()]
      : ['General Studies'];
    
    const topics = Array.isArray(body.topics) && body.topics.length > 0
      ? body.topics
      : [];

    if (topics.length === 0) {
      return NextResponse.json(
        {
          success: false,
          summary: "Please provide at least one topic to generate your plan.",
          days: [],
          error: "At least one topic is required",
        },
        { status: 400 }
      );
    }

    const confidence = body.confidence;

    // Call the server-side AI study planner
    const plan = await aiPlannerService.generatePlan({
      examDate,
      hoursPerDay,
      subjects,
      topics,
      confidence,
    });

    planStore.setActivePlan(plan);

    // Update user preferences in DB
    await userRepo.updateUser({
      examDate,
      dailyStudyGoalMinutes: Math.round(Number(hoursPerDay) * 60),
    });

    // Map the plan sessions into StudyPlanItems for dashboard synchronization
    const newItems: StudyPlanItem[] = [];
    let orderIndex = 1;

    for (let dayIdx = 0; dayIdx < plan.days.length; dayIdx++) {
      const day = plan.days[dayIdx];
      const isToday = dayIdx === 0;

      for (const session of day.sessions) {
        newItems.push({
          id: `sp_${Date.now()}_${orderIndex}`,
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

    return NextResponse.json({
      success: true,
      summary: plan.summary,
      days: plan.days,
    });
  } catch (error: any) {
    console.error('Plan generation endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        summary: "Lucent couldn't build your plan right now. Try again.",
        days: [],
        error: error.message || 'Plan generation failed',
      },
      { status: 500 }
    );
  }
}
