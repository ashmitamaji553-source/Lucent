// src/app/api/deadlines/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { deadlineRepo, conflictRepo } from '@/lib/db/repositories';
import { scheduleService } from '@/services/schedule-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await scheduleService.detectAndRecordConflicts();
    const deadlines = deadlineRepo.getAll();
    const conflicts = conflictRepo.getAll();

    return NextResponse.json({
      success: true,
      deadlines,
      conflicts,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, dueDate, type, courseId } = body;

    if (!title || !dueDate) {
      return NextResponse.json({ success: false, error: 'Title and dueDate are required' }, { status: 400 });
    }

    const created = await deadlineRepo.create({
      userId: 'user_1',
      courseId,
      title,
      description: description || '',
      dueDate: new Date(dueDate).toISOString(),
      type: type || 'Quiz',
      status: 'pending',
    });

    await scheduleService.detectAndRecordConflicts();

    return NextResponse.json({ success: true, deadline: created });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
