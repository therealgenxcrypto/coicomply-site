import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('CONFIRMATION_FROM_EMAIL') || 'COIComply <hello@coicomply.com>';

  if (!resendApiKey) {
    return Response.json({ error: 'RESEND_API_KEY is not configured.' }, { status: 500, headers: corsHeaders });
  }

  const { email, count, files } = await req.json();
  if (!email || !count) {
    return Response.json({ error: 'email and count are required.' }, { status: 400, headers: corsHeaders });
  }

  const fileList = Array.isArray(files) && files.length
    ? files.map((file) => `<li>${file.filename || 'Uploaded document'}</li>`).join('')
    : '<li>Documents uploaded to your account</li>';

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
        <p>We received ${count} file${count === 1 ? '' : 's'} for your COIComply sample audit.</p>
        <ul>${fileList}</ul>
        <p>Your documents are linked to your COIComply account. Most sample audits are returned within 48 hours after all required documents are received.</p>
        <p>COIComply</p>
      `,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    return Response.json({ error: 'Email provider rejected the request.', details }, { status: 502, headers: corsHeaders });
  }

  return Response.json({ ok: true }, { headers: corsHeaders });
});
