// src/app/api/feedback/route.ts
// POST /api/feedback — Collects student feedback after a study session

import { NextRequest, NextResponse } from 'next/server';
import { userRepo, studyPlanRepo, topicRepo, coverageRepo } from '@/lib/db/repositories';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ALLOWED_STATUSES = ['understood', 'needs_practice', 'struggled'] as const;
type FeedbackStatus = (typeof ALLOWED_STATUSES)[number];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, subject, topic, status } = body;

    // Validate required fields
    if (!status || !ALLOWED_STATUSES.includes(status as FeedbackStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Allowed statuses are: ${ALLOWED_STATUSES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Topic is required',
        },
        { status: 400 }
      );
    }

    const cleanSubject = subject ? String(subject).trim() : 'Core';
    const cleanTopic = String(topic).trim();

    // 1. Mark corresponding study plan item as completed if it exists
    if (sessionId) {
      await db.update((data) => {
        const item = data.studyPlanItems.find((s) => s.id === sessionId);
        if (item) {
          item.completed = true;
        }
      });
    }

    // 2. Update or create coverage record for this topic
    const user = userRepo.getPrimaryUser();
    const allTopics = topicRepo.getAll();
    const matchingTopic = allTopics.find(
      (t) => t.name.toLowerCase() === cleanTopic.toLowerCase()
    );

    let score = 70;
    if (status === 'understood') score = 90;
    else if (status === 'needs_practice') score = 60;
    else if (status === 'struggled') score = 35;

    if (matchingTopic) {
      await coverageRepo.upsert(matchingTopic.id, score, user.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback recorded successfully',
      feedback: {
        sessionId: sessionId || `sess_${Date.now()}`,
        subject: cleanSubject,
        topic: cleanTopic,
        status,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Feedback recording error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record feedback' },
      { status: 500 }
    );
  }
}
