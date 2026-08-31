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
  return response.json();
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

  const user = await authenticatedUser(request, env);
  if (!user?.id) {
    return json({ error: 'Authentication required.' }, 401);
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

export function onRequest() {
  return json({ error: 'Method not allowed.' }, 405);
}
