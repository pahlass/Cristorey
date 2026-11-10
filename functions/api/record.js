// Récord compartido del reto de globos. Requiere un KV namespace enlazado como RECORD.
const MAX_SCORE = 200;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

async function current(env) {
  return (await env.RECORD.get('record', { type: 'json' })) || { score: 0, name: '' };
}

export async function onRequestGet({ env }) {
  if (!env.RECORD) return json({ error: 'storage not configured' }, 503);
  return json(await current(env));
}

export async function onRequestPost({ request, env }) {
  if (!env.RECORD) return json({ error: 'storage not configured' }, 503);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }
  const score = Number(body.score);
  if (!Number.isInteger(score) || score < 1 || score > MAX_SCORE) {
    return json({ error: 'invalid score' }, 400);
  }
  const name =
    String(body.name || '')
      .replace(/[\u0000-\u001f\u007f<>]/g, '')
      .trim()
      .slice(0, 20) || 'Anónimo';

  const cur = await current(env);
  if (score <= cur.score) return json(cur);
  const rec = { score, name, at: new Date().toISOString() };
  await env.RECORD.put('record', JSON.stringify(rec));
  return json(rec);
}
