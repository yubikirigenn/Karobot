// ==========================================
// API: 稼働Bot数取得（Topページ用）
// GET /api/stats
// ==========================================
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { KarotterClient } from '@/lib/karotter/client';
import { decrypt } from '@/lib/encryption';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const bot = await prisma.bot.findFirst();
    if (!bot) return NextResponse.json({ error: 'No bot' });
    const password = decrypt(bot.karotterPasswordEnc);
    const client = new KarotterClient({ username: bot.karotterUsername, password });
    await client.login();
    const res = await client.request('GET', '/dm/groups');
    let groups = [];
    if (res.ok && res.data) {
      groups = Array.isArray(res.data) ? res.data : ((res.data as any).groups || []);
      if (groups.length > 0) {
        const msgs = await client.request('GET', `/dm/groups/${groups[0].id}/messages?limit=1`);
        return NextResponse.json({ group: groups[0], messages: msgs.data });
      }
    }
    return NextResponse.json({ groups });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) });
  }
}
