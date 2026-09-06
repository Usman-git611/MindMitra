import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';

export const dynamic = 'force-dynamic';
const MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

async function ensureFilesTable() {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS uploaded_files (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    object_key TEXT NOT NULL UNIQUE,
    content_type TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON uploaded_files(user_id)').run();
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Sign in is required.' }, { status: 401 });
  const form = await request.formData();
  const file = form.get('photo');
  if (!(file instanceof File) || !file.size || !IMAGE_TYPES[file.type]) return Response.json({ error: 'Choose a JPEG, PNG, or WebP image.' }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: 'Image must be smaller than 5 MB.' }, { status: 413 });
  const id = crypto.randomUUID();
  const safeType = IMAGE_TYPES[file.type];
  const key = `private/${user.userId}/${id}.${safeType}`;
  await ensureFilesTable();
  await env.FILES.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  try {
    await env.DB.prepare('INSERT INTO uploaded_files (id, user_id, object_key, content_type, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(id, user.userId, key, file.type, new Date().toISOString()).run();
  } catch (error) {
    await env.FILES.delete(key);
    throw error;
  }
  return Response.json({ id, url: `/api/family-photo?id=${encodeURIComponent(id)}` });
}

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return new Response('Sign in is required.', { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return new Response('Missing image id.', { status: 400 });
  await ensureFilesTable();
  const row = await env.DB.prepare('SELECT object_key, content_type FROM uploaded_files WHERE id = ? AND user_id = ?')
    .bind(id, user.userId).first<{ object_key: string; content_type: string }>();
  if (!row) return new Response('Image not found.', { status: 404 });
  const object = await env.FILES.get(row.object_key);
  if (!object) return new Response('Image not found.', { status: 404 });
  return new Response(object.body, { headers: { 'content-type': row.content_type, 'cache-control': 'private, max-age=3600' } });
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Sign in is required.' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  await ensureFilesTable();
  const rows = id
    ? await env.DB.prepare('SELECT object_key FROM uploaded_files WHERE id = ? AND user_id = ?').bind(id, user.userId).all<{ object_key: string }>()
    : await env.DB.prepare('SELECT object_key FROM uploaded_files WHERE user_id = ?').bind(user.userId).all<{ object_key: string }>();
  await Promise.all(rows.results.map((row) => env.FILES.delete(row.object_key)));
  if (id) await env.DB.prepare('DELETE FROM uploaded_files WHERE id = ? AND user_id = ?').bind(id, user.userId).run();
  else await env.DB.prepare('DELETE FROM uploaded_files WHERE user_id = ?').bind(user.userId).run();
  return Response.json({ ok: true, deleted: rows.results.length });
}
