# Cloudflare Preview and Production Configuration

Do not place real values in this file, GitHub, browser JavaScript, or build logs.

## Branch behavior

- Production branch: `main`
- Preview branches: every non-production branch, including `security-legal-architecture-v2`
- Public custom domain: remains attached only to the production deployment
- Review legal and security changes through the generated Cloudflare preview URL

## Pages Function variables

Non-secret variables:

- `APP_ORIGIN`: `https://coicomply.com` in production; preview origin in preview
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `UPLOADCARE_PUBLIC_KEY`
- `UPLOADCARE_SECURE_CDN_HOST`

Encrypted secrets:

- `SUPABASE_SERVICE_ROLE_KEY`
- `UPLOADCARE_SECRET_KEY`
- `UPLOADCARE_DELIVERY_SECRET`

Use separate Uploadcare secrets/projects for preview and production when practical.

## Uploadcare settings

1. Enable secure signed uploads.
2. Configure a secure delivery subdomain.
3. Generate and store the delivery signing secret in Cloudflare.
4. Verify the authenticated upload and delivery paths in preview.
5. Verify expired and unsigned requests return 403.
6. Disable the public/legacy delivery subdomain only after preview tests pass.
7. Configure signed webhooks and malware analysis if included in the service.
8. Confirm auto-store and deletion behavior match the retention policy.

## Supabase settings

1. Restore the COIComply project and choose a plan that will not pause in production.
2. Require email confirmation.
3. Configure custom SMTP and disable email-link tracking.
4. Apply the security design in a development branch or test project first.
5. Run Security Advisor and Performance Advisor.
6. Verify RLS with two separate customer accounts.
7. Keep `service_role` out of browser code.
8. Enable MFA for organization administrators.
9. Review SSL enforcement, network restrictions, backups, and recovery objectives.

## Cloudflare security controls

- HTTPS-only and HSTS after certificate and subdomain review.
- Same-origin Functions for upload authorization and delivery.
- Rate limiting on authentication-adjacent and upload-signature routes.
- WAF rules appropriate for a low-volume business service.
- Bot protection or Turnstile on public account creation and password recovery.
- Security headers, with CSP introduced in report-only mode before enforcement.
- Log minimization and redaction for authorization headers, filenames, document identifiers, and query strings.

## Production cutover

Before attaching the live domain:

- Confirm Cloudflare serves the exact `main` commit approved for release.
- Confirm no GitHub Pages response remains on the custom domain.
- Remove or disable GitHub Pages custom-domain hosting.
- Update Privacy and Subprocessor pages to reflect the actual host.
- Run the full security test plan.
- Remove all “draft” and “not yet effective” labels only after controls are verified.
- Record the effective date and approved legal entity.
