# Deployment

The live app is at https://air-quality-assistant-three.vercel.app. Every push to `main` deploys to production through Vercel's GitHub integration.

## Environment variables

| Variable | Needed? | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | For AI features | Read only on the server. Without it, plans and answers come from the built-in templates. |
| `OPENAQ_API_KEY` | For station readings | Read only on the server. Without it, current readings come from the CAMS model. |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Recommended | Set by Vercel's **Upstash for Redis** integration. These share the rate limit and the caches across instances. |
| `GROQ_MODEL`, `GROQ_LITE_MODEL` | Leave unset | Override the default models (`openai/gpt-oss-120b` and `openai/gpt-oss-20b`). A placeholder value here makes every AI call fail over to the built-in guidance. |
| `TRUSTED_PROXY_HOPS` | Leave unset | Defaults to 1, which is correct on Vercel. A larger value lets a client choose its own rate-limit key. |

Set them in Vercel → Project → Settings → Environment Variables. Don't import `.env.example` wholesale: its optional lines are commented out because blank or placeholder values break the model choice and Redis. Never commit real values.

## Region and runtime

- **Region:** `bom1` (Mumbai) in `vercel.json`, closest to users in India.
- **Node:** 22.x, from `engines` in `package.json`, the same as CI.

## Checking a deployment

```bash
curl -sI https://air-quality-assistant-three.vercel.app/ | grep -iE 'content-security-policy|strict-transport|x-content-type|referrer-policy|permissions-policy'
curl -s https://air-quality-assistant-three.vercel.app/api/health          # {"ok":true,"ai":"groq","stations":true}
curl -s "https://air-quality-assistant-three.vercel.app/api/air?lat=28.61&lon=77.21" | head -c 300
```

Then run Lighthouse on mobile and desktop, and the "Try it in two minutes" steps from the README by hand.

## Without Redis

The rate limit and caches fall back to each instance's memory. If Redis is unreachable, requests are still served rather than refused, and the failure is logged without user content.
