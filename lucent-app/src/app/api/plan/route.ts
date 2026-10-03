// src/app/api/plan/route.ts
// POST /api/plan — AI study plan generation endpoint returning structured JSON

import { NextRequest, NextResponse } from 'next/server';
import { aiPlannerService, AiPlanResponse } from '@/services/ai-planner';
import { userRepo, studyPlanRepo } from '@/lib/db/repositories';
import { StudyPlanItem } from '@/lib/models/types';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

import { planStore } from '@/services/plan-store';

export async function GET() {
  try {
    const user = userRepo.getPrimaryUser();
    const storedItems = studyPlanRepo.getAll();

    let activePlan = planStore.getActivePlan();

    if (!activePlan) {
      // Generate default verified plan using user preferences
      activePlan = await aiPlannerService.generatePlan({
        examDate: user.examDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        hoursPerDay: Math.round((user.dailyStudyGoalMinutes || 180) / 60),
        subjects: ['Mathematics'],
        topics: [
          { name: 'Probability', confidence: 'Low' },
          { name: 'Calculus', confidence: 'Medium' },
          { name: 'Algebra', confidence: 'High' },
        ],
      });
      planStore.setActivePlan(activePlan);
    }

    const lastAdaptation = planStore.getLastAdaptation();
    const todayTasks = storedItems.filter((t) => !t.dueDate);
    const upcomingTasks = storedItems.filter((t) => Boolean(t.dueDate));

    return NextResponse.json({
      success: true,
      summary: activePlan.summary,
      days: activePlan.days,
      adaptation: lastAdaptation,
      todayTasks,
      upcomingTasks,
      focusAreas: ['Probability', 'Calculus', 'Algebra'],
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
      // Empty body or regeneration request
      body = {};
    }

    const user = userRepo.getPrimaryUser();
    const examDate = body.examDate || user.examDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const hoursPerDay = body.hoursPerDay || Math.round((user.dailyStudyGoalMinutes || 180) / 60) || 3;
    const subjects = body.subjects || ['Mathematics'];
    const topics = body.topics || [
      { name: 'Probability', confidence: 'Low' },
      { name: 'Calculus', confidence: 'Medium' },
      { name: 'Algebra', confidence: 'High' },
    ];
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

    // Return the exact required structured JSON response
    return NextResponse.json({
      summary: plan.summary,
      days: plan.days,
    });
  } catch (error: any) {
    console.error('Plan generation endpoint error:', error);
    return NextResponse.json(
      {
        summary: "Lucent couldn't build your plan right now. Try again.",
        days: [],
        error: error.message || 'Plan generation failed',
      },
      { status: 500 }
    );
  }
}
