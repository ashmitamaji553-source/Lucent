// src/app/api/plan/route.ts
import { NextResponse } from 'next/server';
import { scheduleService } from '@/services/schedule-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const planView = await scheduleService.getPlanView();
    return NextResponse.json({ success: true, ...planView });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST() {
  try {
    const updatedItems = await scheduleService.regeneratePlan();
    const planView = await scheduleService.getPlanView();
    return NextResponse.json({ success: true, updatedItems, ...planView });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
