// src/app/api/signals/route.ts
import { NextResponse } from 'next/server';
import { priorityService } from '@/services/priority-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const signals = priorityService.getSignals();
    return NextResponse.json({ success: true, signals });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
