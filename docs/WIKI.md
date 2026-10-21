# AI Career Copilot Wiki

**Live app:** https://ai-career-copilot-emmy.onrender.com

## Purpose

AI Career Copilot is a portfolio project for helping job seekers organize career preparation in one responsive workspace. It demonstrates a full-stack JavaScript application with an Express API, browser-native UI, local persistence, optional Gemini integration, and automated tests.

## Product areas

- **Dashboard:** summarizes saved applications and recent activity.
- **Resume review:** provides a clearly labelled rules-based first pass without an API key, or requests structured feedback from Gemini when configured.
- **Job matches:** currently returns sample listings. These are demonstration data, not live vacancies.
- **Application tracker:** create, list, update status, and delete application records.
- **Interview practice:** provides practice questions and prompts; it is not a live interview evaluation service.
- **Career assistant:** calls Gemini only when a server-side `GEMINI_API_KEY` is configured.
- **Career Agent preview:** converts a user goal into a bounded checklist. It does not apply to jobs, send messages, or change external accounts.

## Architecture

```text
Browser (public/)
  | fetch JSON
  v
Express API (server.js)
  |-- Request validation and JSON errors
  |-- Resume analysis
  |-- Optional Gemini calls
  |-- Career Agent planner (src/career-agent.js)
  |-- Application store interface (src/store.js)
  v
Local JSON file (data/applications.json by default)
```

## Local development

Requirements: Node.js 20 or newer.

```bash
npm install
cp .env.example .env
npm run dev
```

Open the local address printed by the server. On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

Quality checks:

```bash
npm run check
npm test
```

## API reference

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | API health and AI configuration flag |
| GET | `/api/dashboard` | Summary metrics and recent applications |
| GET | `/api/applications` | List application records |
| POST | `/api/applications` | Validate and create a record |
| PATCH | `/api/applications/:id` | Update a record's status |
| DELETE | `/api/applications/:id` | Delete a record |
| POST | `/api/resume/analyze` | Analyze supplied resume text |
| GET | `/api/jobs` | Return sample job cards |
| POST | `/api/assistant` | Optional Gemini career chat |
| POST | `/api/agent/plan` | Create a bounded career task checklist |

## Data and environment

See `.env.example`. `DATA_DIR` determines where the JSON store writes its data. The default is `./data`. `GEMINI_API_KEY` must remain on the server and must never be placed in browser JavaScript or committed to Git.

The JSON store is a learning-friendly adapter, not a concurrent multi-user database. Use a managed database with per-user access controls before public multi-user use.

## Quality and security

See [Security and Quality](SECURITY-QUALITY.md), [Agent design](AGENT.md), and [Deployment](../DEPLOYMENT.md). CI runs syntax checks and Node's built-in test runner on supported Node versions. Passing CI does not replace browser testing or a production security review.

## Known limitations

- Job cards are sample data and must not be presented as verified vacancies.
- The resume fallback is heuristic, not an ATS score or a hiring prediction.
- The agent creates plans only; it does not autonomously apply, send messages, or operate external websites.
- There is no authentication or per-user data isolation yet.
- Local JSON storage requires persistent storage and is not appropriate for serverless ephemeral filesystems.
