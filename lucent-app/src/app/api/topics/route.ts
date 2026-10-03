// src/app/api/topics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { topicService } from '@/services/topic-service';
import { topicRepo, coverageRepo } from '@/lib/db/repositories';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const subjects = topicService.getAllSubjects();
    const relationships = topicRepo.getRelationships();
    return NextResponse.json({ success: true, subjects, relationships });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, topicId, score, pointsGained } = body;

    if (action === 'study' && topicId) {
      const newScore = await topicService.recordTopicStudy(topicId, pointsGained || 5);
      return NextResponse.json({ success: true, topicId, newScore });
    }

    if (action === 'setScore' && topicId && typeof score === 'number') {
      await coverageRepo.upsert(topicId, score);
      return NextResponse.json({ success: true, topicId, score });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
