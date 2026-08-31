const encoder = new TextEncoder();

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  },
});

const toHex = (buffer) => [...new Uint8Array(buffer)]
  .map((byte) => byte.toString(16).padStart(2, '0'))
  .join('');

const fromHex = (value) => {
  if (!/^[a-f0-9]+$/i.test(value) || value.length % 2 !== 0) {
    throw new Error('Invalid delivery signing secret.');
  }
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }
  return bytes;
};

async function hmacHex(secretHex, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    fromHex(secretHex),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

async function authenticatedUser(request, env) {
  const authorization = request.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) return null;

  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      Authorization: authorization,
    },
  });
  if (!response.ok) return null;

  return {
    authorization,
    user: await response.json(),
  };
}

async function findDocument(id, identity, env) {
  const isAdmin = identity.user?.app_metadata?.coicomply_role === 'admin';
  const apiKey = isAdmin && env.SUPABASE_SERVICE_ROLE_KEY
    ? env.SUPABASE_SERVICE_ROLE_KEY
    : env.SUPABASE_PUBLISHABLE_KEY;
  const authorization = isAdmin && env.SUPABASE_SERVICE_ROLE_KEY
    ? `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
    : identity.authorization;

  const query = new URL(`${env.SUPABASE_URL}/rest/v1/document_uploads`);
  query.searchParams.set('id', `eq.${id}`);
  query.searchParams.set('select', 'id,uploadcare_uuid,filename,mime_type,status,deleted_at');
  query.searchParams.set('limit', '1');

  const response = await fetch(query, {
    headers: {
      apikey: apiKey,
      Authorization: authorization,
      Accept: 'application/json',
    },
  });
  if (!response.ok) return null;

  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] || null : null;
}

function safeFilename(value) {
  const normalized = String(value || 'COI-document')
    .replace(/[\r\n"]/g, '')
    .trim()
    .slice(0, 180);
  return normalized || 'COI-document';
}

export async function onRequestGet({ request, env, params }) {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_PUBLISHABLE_KEY',
    'UPLOADCARE_SECURE_CDN_HOST',
    'UPLOADCARE_DELIVERY_SECRET',
  ];
  if (required.some((name) => !env[name])) {
    return json({ error: 'Private document delivery is not configured.' }, 503);
  }

  const id = String(params.id || '');
  if (!/^\d+$/.test(id)) {
    return json({ error: 'Document not found.' }, 404);
  }

  const identity = await authenticatedUser(request, env);
  if (!identity?.user?.id) {
    return json({ error: 'Authentication required.' }, 401);
  }

  const document = await findDocument(id, identity, env);
  const allowedStatuses = new Set(['available', 'received']);
  if (
    !document
    || document.deleted_at
    || !allowedStatuses.has(document.status)
    || !/^[a-f0-9-]{36}$/i.test(document.uploadcare_uuid || '')
  ) {
    return json({ error: 'Document not found.' }, 404);
  }

  const host = String(env.UPLOADCARE_SECURE_CDN_HOST).trim();
  if (!/^[a-z0-9.-]+$/i.test(host)) {
    return json({ error: 'Private document delivery is not configured.' }, 503);
  }

  const expire = Math.floor(Date.now() / 1000) + 5 * 60;
  const path = `/${document.uploadcare_uuid}/`;
  const acl = `${path}*`;
  const tokenBody = `exp=${expire}~acl=${acl}`;
  const digest = await hmacHex(env.UPLOADCARE_DELIVERY_SECRET, tokenBody);
  const deliveryUrl = new URL(`https://${host}${path}`);
  deliveryUrl.searchParams.set('token', `${tokenBody}~hmac=${digest}`);

  const upstream = await fetch(deliveryUrl, {
    headers: { 'User-Agent': 'COIComply-Private-Delivery/1.0' },
  });
  if (!upstream.ok || !upstream.body) {
    return json({ error: 'Document is temporarily unavailable.' }, 502);
  }

  const headers = new Headers();
  headers.set('Content-Type', upstream.headers.get('Content-Type') || document.mime_type || 'application/octet-stream');
  headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(safeFilename(document.filename))}`);
  headers.set('Cache-Control', 'no-store, private');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Content-Security-Policy', "default-src 'none'; sandbox");

  return new Response(upstream.body, { status: 200, headers });
}
