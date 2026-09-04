import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';

export const dynamic = 'force-dynamic';

async function ensureTables() {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS app_states (
    user_id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Sign in is required.' }, { status: 401 });
  await ensureTables();
  const row = await env.DB.prepare('SELECT payload, updated_at FROM app_states WHERE user_id = ?')
    .bind(user.userId).first<{ payload: string; updated_at: string }>();
  if (!row) return Response.json({ data: null });
  try {
    return Response.json({ data: JSON.parse(row.payload), updatedAt: row.updated_at });
  } catch {
    return Response.json({ data: null });
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Sign in is required.' }, { status: 401 });
  const body = await request.json<{ data?: unknown; updatedAt?: string }>();
  if (!body.data || typeof body.data !== 'object') return Response.json({ error: 'Invalid data.' }, { status: 400 });
  const updatedAt = body.updatedAt || new Date().toISOString();
  await ensureTables();
  await env.DB.prepare(`INSERT INTO app_states (user_id, payload, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
    WHERE excluded.updated_at >= app_states.updated_at`)
    .bind(user.userId, JSON.stringify(body.data), updatedAt).run();
  return Response.json({ ok: true, updatedAt });
}

export async function DELETE() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Sign in is required.' }, { status: 401 });
  await ensureTables();
  await env.DB.prepare('DELETE FROM app_states WHERE user_id = ?').bind(user.userId).run();
  return Response.json({ ok: true });
}
