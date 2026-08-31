# COIComply Prelaunch Security Test Plan

Every test must pass in preview or staging before its corresponding public security statement is published.

## Authentication

- Unauthenticated users are redirected from account, upload, confirmation, and document routes.
- Expired and malformed tokens are rejected.
- Password-reset and sign-up endpoints are rate limited.
- Administrative accounts require MFA.
- Account deletion revokes active sessions.

## Supabase authorization

Create Customer A and Customer B test accounts.

- Anonymous role cannot access `document_uploads`.
- Customer A can insert metadata only with Customer A's user ID.
- Customer A cannot select Customer B's rows.
- Customer A cannot reassign ownership.
- Customer A cannot delete Customer B's rows.
- Staff privileges use trusted app metadata, not user-editable metadata.
- All exposed tables have RLS.
- Views use `security_invoker` or are inaccessible to public roles.
- Security Advisor has no unresolved critical findings.

## Upload security

- Signature endpoint rejects missing and invalid Supabase tokens.
- Upload signatures expire within the documented window.
- Uploadcare rejects unsigned uploads after secure uploads are enabled.
- Disallowed extensions, MIME types, and oversized files are rejected.
- Filenames are safely escaped in HTML and email.
- A failed metadata insert does not leave an unmanaged file.
- Malware-positive or suspicious files remain quarantined.

## Delivery security

- Unsigned CDN access returns 403.
- Signed links expire within five minutes.
- Customer A cannot obtain Customer B's link.
- Deleted files cannot be delivered.
- Delivery responses use private/no-store caching.
- Stable storage URLs are absent from local storage, email, HTML, and customer-readable metadata.

## Cloudflare and browser security

- Preview and production secrets are separate.
- No secret appears in JavaScript or Git history.
- HTTPS redirects are enforced.
- HSTS, nosniff, referrer, permissions, and frame protections are verified.
- CSP is tested in report-only mode before enforcement.
- CORS allows only approved origins.
- Errors do not expose secrets or unnecessary provider details.

## Retention and deletion

- A deletion request disables delivery promptly.
- Source deletion is confirmed through Uploadcare.
- Metadata is removed or de-identified on schedule.
- A non-content audit event records completion.
- Legal holds affect only their documented scope and period.

## Resilience

- Upload fails safely when Supabase is unavailable.
- Upload fails safely when Uploadcare is unavailable.
- Email failure does not repeat or undo an upload.
- Customer status does not claim receipt or security before required steps succeed.
- Backup and restore assumptions are documented and tested where supported.
