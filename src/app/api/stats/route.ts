import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const activeCount = await prisma.bot.count({ where: { status: 'ACTIVE' } });
    const totalCount = await prisma.bot.count();

    return NextResponse.json({ activeCount, totalCount });
  } catch {
    return NextResponse.json({ activeCount: 0, totalCount: 0 });
  }
}
