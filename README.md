# COIComply Site

Static HTML marketing and account-access site for COIComply.

## Hosting

This site is prepared for GitHub Pages with:

- `index.html` at the repository root
- `CNAME` set to `coicomply.com`
- `.nojekyll` to serve static files directly
- `robots.txt`, `sitemap.xml`, and `llms.txt` for crawler guidance

## Indexing

The public homepage is crawlable. Authentication, account, upload, and preview pages are marked `noindex` and excluded in `robots.txt`.

## Services

- Supabase handles authentication and upload/account tracking.
- Uploadcare handles document file uploads.

## Confirmation Email

The upload confirmation page is live. Email delivery is scaffolded through `supabase/functions/send-upload-confirmation`.

To enable confirmation emails:

- Add `RESEND_API_KEY` as a Supabase Edge Function secret.
- Optionally add `CONFIRMATION_FROM_EMAIL`.
- Deploy the `send-upload-confirmation` function.
- Set `window.COI_CONFIRMATION_EMAIL_ENABLED = true` in `supabase-config.js`.
