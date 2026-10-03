// src/app/api/resources/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { resourceService } from '@/services/resource-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const groups = resourceService.getRecommendedResources();
    return NextResponse.json({ success: true, subjects: groups });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, type, subject, url, relevance, topicId, courseId } = body;

    if (!title || !url || !subject) {
      return NextResponse.json({ success: false, error: 'Title, url, and subject are required' }, { status: 400 });
    }

    const created = await resourceService.addResource({
      title,
      type: type || 'Article',
      subject,
      url,
      relevance: relevance || 'Medium',
      topicId,
      courseId,
    });

    return NextResponse.json({ success: true, resource: created });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
