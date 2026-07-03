import { NextResponse } from 'next/server';
import { store } from '@/lib/botStateStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const activeCount = store.getActiveCount();
    const totalCount = store.getTotalCount();

    return NextResponse.json({ activeCount, totalCount });
  } catch (error) {
    console.error("Stats API Error:", error);
    return NextResponse.json({ activeCount: 0, totalCount: 0 });
  }
}
