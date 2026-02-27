# Public Piston Deployment (for whaliostudy.io.vn / onrender.com)

## Goal
Run code execution from your public app by using a separate public Piston service.

## Option A: Deploy Piston as its own Render service
1. Create a new **Web Service** on Render from Docker image:
   - `ghcr.io/engineer-man/piston`
2. Expose port `2000`.
3. After service is live, note URL, for example:
   - `https://piston-whalio.onrender.com`
4. In your main app service env vars, set:

```env
CODE_RUNNER_API_URL=https://piston-whalio.onrender.com/api/v2/execute
CODE_RUNNER_TIMEOUT_MS=15000
```

5. Redeploy app service.

## Option B: Keep local runner for local dev only
- Local: use `http://127.0.0.1:2000/api/v2/execute`
- Public: always set `CODE_RUNNER_API_URL` to a public runner URL

## Verify
Check health endpoint in your app:

```http
GET /api/code-snippets/runner-health
```

Expected:
- `online: true`
- at least one `checks[*].ok = true`
