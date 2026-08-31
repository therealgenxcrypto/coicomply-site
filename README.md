# COIComply Site

Static marketing site with Supabase-authenticated account access and Cloudflare Pages Functions for secure document controls.

## Deployment model

- GitHub `main` is the production source branch.
- Non-production branches create Cloudflare Pages preview deployments.
- The custom domain is attached only to production.
- Legal and security work is staged on `security-legal-architecture-v2` until reviewed, tested, and approved.
- GitHub Pages should be disabled after the Cloudflare production cutover is verified.

## Services

- Cloudflare Pages hosts the site and same-origin security functions.
- Supabase handles authentication, customer-account status, and document metadata.
- Uploadcare handles signed document upload and private signed delivery.
- Resend handles transactional confirmations without document attachments or links.
- GitHub stores source code only, never production secrets or customer documents.

## Security design

See:

- `docs/SECURITY_ARCHITECTURE.md`
- `docs/SECURITY_TEST_PLAN.md`
- `docs/DATA_RETENTION_AND_DELETION.md`
- `docs/INCIDENT_RESPONSE.md`
- `docs/CLOUDFLARE_CONFIGURATION.md`
- `docs/LEGAL_RELEASE_CHECKLIST.md`

## Cloudflare configuration

Required non-secret variables and encrypted secrets are listed in `docs/CLOUDFLARE_CONFIGURATION.md`. Never place Uploadcare secret keys, delivery signing secrets, Supabase service-role keys, or Resend keys in browser JavaScript or this repository.

## Supabase

`supabase/security-hardening-v2.sql` is a design script for development review. Do not apply it directly to production. Validate it in a Supabase development branch or test project, run the Security Advisor, and complete the two-customer RLS tests before production.

## Confirmation email

The Edge Function in `supabase/functions/send-upload-confirmation`:

- verifies the authenticated user;
- restricts browser origins;
- validates the document count;
- sends no filenames, attachments, or document links.

Configure `RESEND_API_KEY`, `CONFIRMATION_FROM_EMAIL`, and `CONFIRMATION_ALLOWED_ORIGINS` before deployment.
