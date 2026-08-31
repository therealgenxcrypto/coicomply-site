# COIComply Security Architecture

Status: implementation design for review

Branch: `security-legal-architecture-v2`
Production impact: none until merged and deployed

## Security objective

Customers must be authenticated before uploading or retrieving documents. The browser may receive short-lived authorizations, but it must never receive an Uploadcare secret, Supabase service-role key, or permanent delivery credential.

COIs, endorsements, vendor lists, and requirements are confidential business records. Document content and stable storage locations must not be exposed through publicly usable URLs.

## Target data flow

1. Customer signs in with Supabase Auth.
2. Browser sends the Supabase access token to a same-origin Cloudflare Pages Function.
3. Function validates the token against Supabase Auth.
4. Function returns an Uploadcare signed-upload authorization valid for no more than ten minutes.
5. Browser uploads directly to Uploadcare.
6. Browser records only the Uploadcare UUID and non-content metadata in Supabase. It does not persist a public CDN URL.
7. Supabase RLS restricts each customer to rows owned by that user.
8. Retrieval goes through a Cloudflare Function. It validates identity, checks ownership or an approved staff role, and returns a signed delivery URL valid for no more than five minutes.
9. Uploadcare unsigned public delivery is disabled after the signed path is verified.
10. Deletion removes the Uploadcare file and active Supabase reference. Retention events are auditable.

## Trust boundaries

| Component | Permitted responsibilities | Secrets permitted |
|---|---|---|
| Browser | Sign in, select files, display status | Supabase user session only |
| Cloudflare Pages | Static site and same-origin API boundary | Uploadcare signing secrets and server configuration |
| Supabase Auth | Identity and session management | Managed by Supabase |
| Supabase Postgres | Ownership metadata, lifecycle status, audit events | No third-party secret keys |
| Uploadcare | Signed ingestion, private storage/delivery, malware analysis | Uploadcare-managed project data |
| Resend | Transactional notices without attachments | Resend API key server-side only |

## Required Cloudflare Functions

### POST /api/upload/signature

- Require a Supabase bearer token and validate it server-side.
- Reject unapproved origins.
- Return an Uploadcare signature valid for no more than ten minutes.
- Use `Cache-Control: no-store`.
- Apply per-user and per-IP rate limits.
- Never log tokens, signatures, filenames, or document content.

### GET /api/documents/:id

- Require authentication.
- Load metadata through Supabase.
- Authorize only the record owner or an approved staff role stored in trusted app metadata.
- Sign only the requested Uploadcare UUID/path.
- Use a delivery token valid for no more than five minutes.
- Use `Cache-Control: no-store, private`.
- Record a non-content access event.

### POST /api/uploadcare/webhook

- Verify the Uploadcare webhook signature.
- Accept only recognized event types.
- Update upload, scan, storage, quarantine, and deletion states.
- Be idempotent and reject unverified requests.

## Database model

`document_uploads` should contain:

- `id`, `user_id`, and `uploadcare_uuid`
- `filename`, `mime_type`, `size_bytes`, and `sha256` when available
- lifecycle `status`
- `retention_delete_after`
- `created_at`, `updated_at`, and `deleted_at`

Do not store a publicly usable CDN URL.

The exposed `public` schema uses explicit grants and RLS. Customer policies include an ownership predicate. Administrative functions belong in a non-exposed schema and must not be executable by `PUBLIC`.

## Document controls

- Allow PDF, DOCX, XLSX, CSV, PNG, and JPEG only.
- Reject executables, scripts, archives, macro-enabled Office files, and password-protected files.
- Enforce a documented file-size limit.
- Quarantine files until automated or manual safety checks complete.
- Do not email attachments.
- Do not put filenames, policy numbers, vendor names, or URLs in logs.
- Do not use customer documents to train general-purpose models.
- Use only United States-based personnel and contractors for human document review.
- Use document content only for the contracted service, support, security, and legal obligations.

## Account controls

- Require verified email.
- Protect sign-up and reset with rate limits and CAPTCHA.
- Use short access-token lifetimes appropriate for a document service.
- Revoke sessions before deleting or disabling an account.
- Require MFA for COIComply administrative accounts.
- Keep administrative access separate from customer accounts.

## Deployment controls

- GitHub `main` is the production source branch.
- Pull requests create Cloudflare preview deployments.
- Production deployment occurs only after approval and merge.
- Production secrets live in Cloudflare encrypted secrets, never GitHub or browser JavaScript.
- Preview and production use separate secrets and preferably separate Uploadcare projects.
- CSP starts in report-only mode before enforcement.
- GitHub Pages is removed as production host after Cloudflare verification.

## Minimum launch gates

- Supabase is active and will not pause for inactivity.
- Security Advisor has no unresolved critical findings.
- Anonymous metadata access is denied.
- Customer A cannot read Customer B's metadata or document.
- Unsigned Uploadcare delivery returns 403.
- Expired signed links return 403.
- Secrets are absent from browser bundles and Git history.
- Deletion removes both the file and active metadata reference.
- Incident ownership and notification processes are documented.
- Privacy, Terms, and Document Handling pages match the implemented system.
