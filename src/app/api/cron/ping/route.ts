// ==========================================
// API: スリープ防止 Ping
// GET /api/cron/ping
// ==========================================
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'KaroBot Manager',
    timestamp: new Date().toISOString(),
  });
}
