# Contributing

## Setup

```bash
npm ci
cp .env.example .env.local   # every key is optional; tests never call a real model or data source
npm run dev
```

## Before you push

```bash
npm run check      # format, strict lint, typecheck, tests with 100% coverage
npm run test:e2e   # production build in Chromium with axe
```

## Where code goes

- **Business rules:** only in `src/lib/domain`, as pure functions. No React, no clock (pass `now` in), no network.
- **Components:** render and dispatch. If a component needs a number, add a domain function.
- **A new data source:** a client in `src/lib/air` that validates replies with Zod and throws `UpstreamError`, behind a route built with `dataRoute`.
- **A new AI feature:** a request and reply schema in `src/lib/ai/contracts.ts`, a prompt in `src/lib/ai/prompts.ts`, a fallback held to the same schema, a route built with the route factory, and one typed function in `src/lib/client/api.ts`.
- **Tests:** in `tests/<layer>/`, mirroring `src/`. Drive UI tests by role and label.
- **Docs:** update the README and the matching file in `docs/` when behaviour changes.

## Style

- TypeScript strict; typescript-eslint `strictTypeChecked` and `stylisticTypeChecked` at zero findings.
- No `any`, no casts except `as const`, no non-null assertions, no disabled lint rules.
- Files under 250 lines, functions under 80, complexity at most 10.
- Commit messages follow `type(scope): summary`, for example `feat(impacts): add carpool saving`.

## Security

Never commit keys. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).
