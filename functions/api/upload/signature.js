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

async function hmacHex(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

async function authenticatedIdentity(request, env) {
  const authorization = request.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) return null;

  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      Authorization: authorization,
    },
  });

  if (!response.ok) return null;
  return { authorization, user: await response.json() };
}

async function hasActiveUploadAccount(identity, env) {
  const query = new URL(`${env.SUPABASE_URL}/rest/v1/customer_accounts`);
  query.searchParams.set('user_id', `eq.${identity.user.id}`);
  query.searchParams.set('membership_status', 'eq.active');
  query.searchParams.set('upload_enabled', 'eq.true');
  query.searchParams.set('select', 'user_id');
  query.searchParams.set('limit', '1');

  const response = await fetch(query, {
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      Authorization: identity.authorization,
      Accept: 'application/json',
    },
  });
  if (!response.ok) return false;

  const rows = await response.json();
  return Array.isArray(rows) && rows.length === 1;
}

function hasApprovedOrigin(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;

  const requestOrigin = new URL(request.url).origin;
  const approved = new Set([requestOrigin, env.APP_ORIGIN].filter(Boolean));
  return approved.has(origin);
}

export async function onRequestPost({ request, env }) {
  if (!hasApprovedOrigin(request, env)) {
    return json({ error: 'Origin not allowed.' }, 403);
  }

  const required = [
    'SUPABASE_URL',
    'SUPABASE_PUBLISHABLE_KEY',
    'UPLOADCARE_PUBLIC_KEY',
    'UPLOADCARE_SECRET_KEY',
  ];
  if (required.some((name) => !env[name])) {
    return json({ error: 'Secure upload is not configured.' }, 503);
  }

  const identity = await authenticatedIdentity(request, env);
  if (!identity?.user?.id) {
    return json({ error: 'Authentication required.' }, 401);
  }

  if (!(await hasActiveUploadAccount(identity, env))) {
    return json({ error: 'Document upload is not enabled for this account.' }, 403);
  }

  // Uploadcare signed-upload signatures are HMAC-SHA256(secret, expire).
  // Keep this short-lived and add Cloudflare rate limiting before production.
  const expire = Math.floor(Date.now() / 1000) + 10 * 60;
  const signature = await hmacHex(env.UPLOADCARE_SECRET_KEY, String(expire));

  return json({
    publicKey: env.UPLOADCARE_PUBLIC_KEY,
    secureSignature: signature,
    secureExpire: expire,
  });
}
