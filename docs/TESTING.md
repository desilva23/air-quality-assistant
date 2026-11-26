# Testing

## Running

```bash
npm run check        # format, lint, Knip, typecheck, unit and integration tests with coverage
npm run test:e2e     # builds, then Playwright in Chromium with axe (run `npx playwright install chromium` once)
```

CI (`.github/workflows/ci.yml`) runs both on every push to `main`. Tests never call a real model or data source: upstream services are stubbed at `fetch`.

## Results

Last local run: 26 November 2026.

| Suite | Folder | Tests | Result |
| --- | --- | --- | --- |
| Domain rules | `tests/domain` | 71 | Passed |
| Air data clients and report | `tests/air` | 26 | Passed |
| AI contracts, prompts, client and fallbacks | `tests/ai` | 38 | Passed |
| Route factories, guards, stores, CSP | `tests/server` | 31 | Passed |
| API routes and app shell | `tests/app` | 8 | Passed |
| Browser client, saved settings, location | `tests/client` | 15 | Passed |
| UI flows with axe | `tests/ui` | 41 | Passed |
| English and Tamil wording | `tests/i18n` | 5 | Passed |
| Project hygiene | `tests/quality` | 8 | Passed |
| **Unit and integration total** | | **243** | **All passed** |
| End to end in real Chromium | `e2e/` | 14 | All passed |

| Coverage (`src/`) | Result | Enforced in CI |
| --- | --- | --- |
| Statements | 100% | 100% |
| Branches | 100% | 100% |
| Functions | 100% | 100% |
| Lines | 100% | 100% |

## What each area proves

| Area | What is checked |
| --- | --- |
| AQI | Every CPCB band edge for PM2.5 and PM10, the open-ended Severe band, PM10 setting the index, PM2.5 alone |
| Timing | The cleanest hour and window, earliest on ties, night hours ignored, only the next 24 hours, empty forecasts |
| Impacts | Each of the eight facts with exact wording and numbers in English and Tamil, and every case where one doesn't apply |
| What-if and commute | The day's dose for each mask, purifier and time outdoors; CO₂, petrol cost and time for every way to commute |
| Languages | Every English message has its Tamil twin, list phrasing in both languages, the built-in plan and answer in Tamil |
| Air data | Station choice by distance and freshness, implausible values such as -999 dropped, model fallback with the reason, both sources down |
| AI | Strict schema with hints, one retry for malformed replies and none for provider errors, citing only computed facts, prompt snapshot, fencing of user text |
| API routes | 403 cross-site, 415, 413 declared and streamed, 400, 429 with `Retry-After`, 503 on data failure, cache hits, fallbacks, no user text in logs |
| UI | Sample household to plan to answer, search, retry, stale-plan notice, form edits, copy message, language switch, stations map and table, what-if slider, commute table, axe on every panel |
| End to end | The journeys on the production build, the map and simulators, the whole journey in Tamil with axe, two households getting different plans, persistence across reload, a fresh nonce on every script, injected markup blocked, security headers, axe in light and dark, no sideways scroll at 320 px, skip link |
| Hygiene | Required docs exist, files stay small, no `any`, no HTML injection, no browser logging, no secrets, keys stay on the server |
