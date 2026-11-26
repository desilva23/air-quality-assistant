# Security policy

## Reporting a vulnerability

Please report security problems privately rather than in a public issue: use **Report a vulnerability** on this repository's **Security** tab. Include what you found, how to reproduce it, and what an attacker could do with it.

## Supported versions

Fixes go to `main`, which is what the live app (https://air-quality-assistant-three.vercel.app) runs. Older commits aren't patched.

## How the app is protected

- API keys (Groq, OpenAQ, Upstash) are read only on the server, in modules marked `server-only`. The browser talks only to this app (`connect-src 'self'`).
- Every API request is checked for origin, rate-limited per client (shared through Upstash Redis in production), size-capped while it is read, and validated against a Zod schema. Errors leave the server as codes, never as free text.
- Pages run under a Content-Security-Policy with a fresh nonce per request, so injected scripts don't run. Other headers: HSTS, `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy, and a Permissions-Policy that allows only this site's own location request.
- Text people type is fenced as data in prompts, and model replies are schema-checked before use. The model can cite only impact facts the server computed.
- User content is never logged. The household profile stays in the browser's localStorage and is sent only with a plan or question request.
- CodeQL scans every push, Dependabot alerts flag vulnerable dependencies, and CI fails on any high-severity `npm audit` finding.
