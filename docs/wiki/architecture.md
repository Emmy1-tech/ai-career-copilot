# Architecture and project map

## Overview

AI Career Copilot is a single Node.js/Express application that serves a browser-based interface and a JSON API from the same process.

```text
Browser (public/)
  | fetch() over same-origin HTTP
  v
Express application (server.js)
  |-- HTTP security headers/CSP, JSON size limit, and in-memory AI route throttling
  |-- Resume review and job-description match (Gemini when configured, labelled rules-based fallback otherwise)
  |-- Evidence-grounded resume/cover-letter drafting (Gemini key required)
  |-- In-memory per-process request limiting for AI routes
  |-- Career assistant (Gemini key required)
  |-- Career agent plan endpoint (src/career-agent.js)
  |-- Application API
  v
Store adapter (src/store.js) --> DATA_DIR/applications.json
```

## Main locations

- `public/index.html`, `public/styles.css`, `public/app.js`: user interface.
- `server.js`: API routes, request validation, Gemini integration, and static hosting.
- `src/store.js`: local JSON persistence adapter.
- `src/career-agent.js`: deterministic career task planner.
- `tests/server.test.js`: API and agent contract tests.
- `.github/workflows/ci.yml`: automated Node.js checks.
- `DEPLOYMENT.md`: deployment and custom-domain notes.

## API map

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Service health and whether a Gemini key is configured |
| GET | `/api/dashboard` | Application metrics and recent records |
| GET | `/api/applications` | List records |
| POST | `/api/applications` | Create a record |
| PATCH | `/api/applications/:id` | Update a status |
| DELETE | `/api/applications/:id` | Delete a record |
| POST | `/api/resume/analyze` | Resume feedback |
| POST | `/api/resume/match` | Compare resume evidence with job requirements; not an ATS score |
| POST | `/api/resume/tailor` | Draft resume bullets and cover letter from supplied evidence (Gemini key required) |
| POST | `/api/agent/plan` | Create a plan-only career task plan |
| POST | `/api/assistant` | Gemini career assistant |
| GET | `/api/jobs` | Sample listings for the demo UI |

## Data and trust boundaries

- Browser inputs are untrusted. Validate them on the server even when HTML form validation exists.
- The Gemini key is read from the server environment; it must never be placed in browser JavaScript or committed.
- The JSON store is suitable for local development and limited single-process demos only. It is not a tenant-isolated database.
- The job endpoint explicitly identifies listings as sample data. Do not imply that they are current real vacancies.
- The agent only returns a plan. It does not run tools, submit applications, send messages, or modify external accounts.

## Known gaps

Authentication and per-user authorization are not implemented. Anyone who can reach the current API can access or change the same application list. Local JSON mutations are serialized within one Node.js process, but there is no cross-process locking. The current AI endpoint limiter is in-memory and per-process only. A managed database, identity layer, per-user access checks, edge-level/distributed rate limits, and deployed-browser tests are required before a public multi-user launch.
