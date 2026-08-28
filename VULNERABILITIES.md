This repository intentionally includes insecure code patterns for security auditing and training.

Included vulnerable patterns:

- SQL Injection: `backend/server.js` builds SQL queries via string concatenation.
- Command Injection: `/exec` endpoint executes unsanitized `cmd` query parameter.
- Insecure File Upload / Path Traversal: `/upload` writes files using user-supplied filenames.
- Cross-Site Scripting (XSS): `frontend/app.js` injects server values via `innerHTML`.
- Open Redirect: `/redirect` redirects to user-provided `next` parameter without validation.
- SSRF: `/ssrf` fetches arbitrary URLs.
- Broken Authentication / Weak Secret: JWT uses a hardcoded weak secret.
- Insecure CORS: wildcard origin with credentials enabled.
- Broken Access Control: profile endpoint lacks authorization checks.

Usage:
- Use in an isolated test environment only. Do not expose to public networks.
