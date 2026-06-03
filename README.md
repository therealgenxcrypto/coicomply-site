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
