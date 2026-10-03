// src/app/api/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { userRepo } from '@/lib/db/repositories';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = userRepo.getPrimaryUser();
    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const updates = await req.json();
    const updated = await userRepo.updateUser(updates);
    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
