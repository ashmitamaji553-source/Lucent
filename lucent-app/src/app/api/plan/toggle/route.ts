// src/app/api/plan/toggle/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { studyPlanRepo } from '@/lib/db/repositories';
import { planStore } from '@/services/plan-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, error: 'Task ID is required' }, { status: 400 });
    }

    const updated = await studyPlanRepo.toggleComplete(id);
    if (!updated) {
      // Also mark in planStore even if custom session id
      planStore.markSession(id, true);
      return NextResponse.json({ success: true, item: { id, completed: true } });
    }

    planStore.markSession(id, updated.completed);
    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
