# Local Piston Setup (Studyweb)

## Why this is needed
The old public Piston endpoint is now whitelist-only (policy change on 2026-02-15), so this project runs best with a local Piston instance.

## Prerequisites
- Docker Desktop (or Docker Engine + Compose)
- Node.js (already used by this project)

## 1) Start local Piston
From `server/`:

```powershell
npm run piston:setup
```

This command will:
- Start `studyweb-piston` from [`docker-compose.piston.yml`](../docker-compose.piston.yml)
- Install runtime packages for: JavaScript, TypeScript, Python, Java, GCC (for C/C++)
- Print detected runtimes

If you only want to boot container without runtime install:

```powershell
npm run piston:setup:skip-runtimes
```

## 2) Verify health
From `server/`:

```powershell
npm run piston:health
```

You can also check backend-integrated health:

```http
GET /api/code-snippets/runner-health
```

## 3) Runner URL config
Local dev defaults to:

```env
CODE_RUNNER_API_URL=http://127.0.0.1:2000/api/v2/execute
```

For production/public domain (Render, `*.onrender.com`, `*.io.vn`), you must set a public runner URL:

```env
CODE_RUNNER_API_URL=https://your-piston-service.example.com/api/v2/execute
```

Optional fallback list:

```env
CODE_RUNNER_API_URLS=http://127.0.0.1:2000/api/v2/execute,https://your-other-runner/api/v2/execute
CODE_RUNNER_TIMEOUT_MS=15000
```

## 4) Stop runner
From project root:

```powershell
docker compose -f docker-compose.piston.yml down
```

## Notes
- `SQL` in this app is executed via Python + SQLite in-memory runner script.
- For `C++`, install package `gcc` in Piston.
- If app is public, `127.0.0.1` only points to your app container itself, not your local PC.
