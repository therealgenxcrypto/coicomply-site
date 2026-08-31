import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const allowedOrigins = new Set(
  (Deno.env.get('CONFIRMATION_ALLOWED_ORIGINS') || 'https://coicomply.com')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);

const corsHeadersFor = (req: Request) => {
  const origin = req.headers.get('Origin');
  return {
    'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin) ? origin : 'https://coicomply.com',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  };
};

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  const origin = req.headers.get('Origin');

  if (origin && !allowedOrigins.has(origin)) {
    return Response.json({ error: 'Origin not allowed.' }, { status: 403, headers: corsHeaders });
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: corsHeaders });
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('CONFIRMATION_FROM_EMAIL') || 'COIComply <hello@coicomply.com>';
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabasePublishableKey = Deno.env.get('SUPABASE_ANON_KEY');
  const authorization = req.headers.get('Authorization');

  if (!resendApiKey || !supabaseUrl || !supabasePublishableKey || !authorization) {
    return Response.json({ error: 'Email confirmation service is not fully configured.' }, { status: 503, headers: corsHeaders });
  }

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabasePublishableKey,
      Authorization: authorization,
    },
  });

  if (!userResponse.ok) {
    return Response.json({ error: 'Could not confirm authenticated user.' }, { status: 401, headers: corsHeaders });
  }

  const user = await userResponse.json();
  const email = user.email;
  const body = await req.json().catch(() => ({}));
  const count = Number(body.count);

  if (!email || !Number.isInteger(count) || count < 1 || count > 50) {
    return Response.json({ error: 'A valid document count is required.' }, { status: 400, headers: corsHeaders });
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: email,
      subject: 'COIComply received your documents',
      html: `
        <p>We received ${count} document${count === 1 ? '' : 's'} for your COIComply account.</p>
        <p>Your files are being processed through the COIComply review workflow. We will contact you if anything else is needed.</p>
        <p>For security, this email does not contain document names, attachments, or download links.</p>
        <p>COIComply</p>
      `,
    }),
  });

  if (!response.ok) {
    return Response.json({ error: 'Email provider rejected the request.' }, { status: 502, headers: corsHeaders });
  }

  return Response.json({ ok: true }, { headers: corsHeaders });
});
