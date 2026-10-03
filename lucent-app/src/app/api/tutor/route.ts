// src/app/api/tutor/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { tutorService } from '@/services/tutor-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const conversationId = searchParams.get('conversationId') || undefined;

    const history = tutorService.getConversationHistory(conversationId);
    return NextResponse.json({ success: true, ...history });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, conversationId } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ success: false, error: 'Question is required' }, { status: 400 });
    }

    const response = await tutorService.askTutor(question.trim(), conversationId);
    return NextResponse.json({ success: true, ...response });
  } catch (error) {
    console.error('Tutor API error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
