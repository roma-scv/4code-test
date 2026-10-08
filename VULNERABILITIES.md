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

Known-CVE vulnerable dependencies and endpoints:

- Insecure Deserialization — `node-serialize` 0.0.4, `/deserialize` endpoint. CVE-2017-5941 (CWE-502, CVSS 9.8): `unserialize()` on untrusted input yields RCE via an IIFE payload.
- Server-Side Template Injection — `ejs` 3.1.6, `/render` endpoint. CVE-2022-29078 (CWE-94, CVSS 9.8): user-controlled render options (`outputFunctionName`) achieve OS command execution.
- Prototype Pollution / Command Injection — `lodash` 4.17.19, `/merge` endpoint. CVE-2020-8203 (CWE-1321, CVSS 7.4) and CVE-2021-23337 (CWE-94, CVSS 7.2): `_.merge` of attacker JSON pollutes `__proto__`; `_.template` enables injection.
- XML Prototype Pollution — `xml2js` 0.4.23, `/parse-xml` endpoint. CVE-2023-0842 (CWE-1321, CVSS 5.3): `__proto__` keys in parsed XML edit the object prototype.
- Sensitive Token Exposure via axios — `axios` 1.5.1, `/fetch` endpoint. CVE-2023-45857 (CWE-352, CVSS 6.5): the XSRF-TOKEN cookie is leaked in `X-XSRF-TOKEN` to any host (also an SSRF sink).
- JWT Signature Bypass — `jsonwebtoken` 8.5.1, `/verify-token` endpoint. CVE-2022-23540 (CWE-287/CWE-347, CVSS 6.4): `verify()` without an explicit `algorithms` list defaults to accepting `alg: none` unsigned tokens.
- Open Redirect / Unsafe Redirect — `express` 4.17.1. CVE-2024-29041 (CWE-601, CVSS 6.1) and CVE-2024-43796 (CWE-79, CVSS 5.0): malformed URLs in `res.redirect()` on Express < 4.19 / < 4.20.
- Request Body DoS — `body-parser` 1.20.2. CVE-2024-45590 (CWE-405, CVSS 7.5): urlencoded parsing before 1.20.3 can be flooded into denial of service.
- qs Prototype Pollution — bundled with `express` 4.17.1. CVE-2022-24999 (CWE-1321, CVSS 7.5): a `__proto__` key can hang the Node process in many Express apps before 4.17.3.

Usage:
- Use in an isolated test environment only. Do not expose to public networks.
