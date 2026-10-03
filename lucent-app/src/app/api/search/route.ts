// src/app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { topicRepo, documentRepo, deadlineRepo } from '@/lib/db/repositories';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get('q') || '').toLowerCase().trim();
    if (!q) {
      return NextResponse.json({ success: true, results: [] });
    }

    const topics = topicRepo.getAll().filter((t) => t.name.toLowerCase().includes(q));
    const documents = documentRepo.getAll().filter((d) => d.name.toLowerCase().includes(q));
    const deadlines = deadlineRepo.getAll().filter((d) => d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q));

    const results = [
      ...topics.map((t) => ({ type: 'topic', title: t.name, subtitle: `Topic · ${t.difficulty}`, url: '/topics' })),
      ...documents.map((d) => ({ type: 'document', title: d.name, subtitle: `${d.type} · Document`, url: '/materials' })),
      ...deadlines.map((dl) => ({ type: 'deadline', title: dl.title, subtitle: `${dl.type} · Due ${dl.dueDate.split('T')[0]}`, url: '/plan' })),
    ];

    return NextResponse.json({ success: true, results: results.slice(0, 8) });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
