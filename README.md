# AI Career Copilot

AI Career Copilot is a portfolio-quality full-stack career companion for job seekers and internship applicants. It brings resume feedback, job-match exploration, application tracking, interview practice, and a career-assistant interface into one responsive workspace.

## GitHub Wiki

The [official GitHub Wiki](https://github.com/Emmy1-tech/ai-career-copilot/wiki) is available for browsable project documentation. The version-controlled documentation mirror is in [`docs/wiki/`](docs/wiki/README.md).

## Product features

- Responsive career dashboard with summary stats and recent applications.
- Resume review and resume-to-job-description evidence matching, with clearly labelled rules-based fallbacks and optional Gemini API integration.
- Gemini-powered tailored resume bullet, professional summary, and cover-letter drafts with explicit truth-check reminders.
- Job-match discovery UI using explicitly labelled sample listings (not live job data), plus external search links for LinkedIn, Indeed Canada, and Canada Job Bank.
- Application tracker with create, list, status update, and delete flows.
- Interview question practice with STAR-style prompts and in-session notes.
- AI career assistant endpoint that uses Gemini only when a server-side API key is configured.
- Career Agent planner endpoint that returns a bounded, plan-only checklist; it does not execute external actions.
- Input validation, JSON error responses, a health endpoint, automated API tests, and GitHub Actions CI on Node.js 20 and 22.

## Stack

- Node.js 20+
- Express
- HTML, CSS, and browser-native JavaScript
- Local JSON persistence adapter for development
- Optional Google Gemini API integration

## Run locally on Windows (easiest)

1. Download this repository using **Code → Download ZIP** and extract it.
2. Open the extracted `ai-career-copilot` folder.
3. Double-click `start-local.bat`. It checks for Node.js, creates `.env` from `.env.example` if needed, installs dependencies if missing, and starts the server.
4. Open [http://localhost:1295](http://localhost:1295) in your browser. Keep the terminal window open while using the app.

For screenshots and local troubleshooting, read [LOCAL-SETUP.md](LOCAL-SETUP.md). To test the running app on your phone over the same trusted Wi-Fi, follow [PHONE-TEST.md](PHONE-TEST.md). For hosting and domain decisions, read [DEPLOYMENT.md](DEPLOYMENT.md).

## Run locally manually

1. Install Node.js 20 or newer.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and optionally add a Gemini API key.
4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:1295](http://localhost:1295).

Run the tests and syntax checks:

```bash
npm test
npm run check
```

## Environment variables

See `.env.example`.

- `PORT`: local server port (default `1295`)
- `NODE_ENV`: use `test` to prevent auto-starting the HTTP server in tests
- `DATA_DIR`: folder used for application JSON persistence
- `GEMINI_API_KEY`: optional server-side API key; never expose it in browser code
- `GEMINI_MODEL`: optional Gemini model name (default `gemini-2.5-flash`)

## API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Health and AI configuration status |
| GET | `/api/dashboard` | Dashboard metrics and recent applications |
| GET | `/api/applications` | List tracked applications |
| POST | `/api/applications` | Create an application |
| PATCH | `/api/applications/:id` | Update an application status |
| DELETE | `/api/applications/:id` | Delete an application |
| POST | `/api/resume/analyze` | Analyze resume text |
| POST | `/api/resume/match` | Compare resume evidence with a pasted job description; not an ATS or hiring prediction |
| POST | `/api/resume/tailor` | Generate evidence-grounded resume bullets and a cover-letter draft (Gemini key required) |
| GET | `/api/jobs` | Sample job listing data |
| POST | `/api/assistant` | Gemini-powered career assistant (key required) |
| POST | `/api/agent/plan` | Plan-only career task checklist |

## Architecture

```text
Browser UI (public/)
  └── JSON API calls
      └── Express server (server.js)
          ├── Validation and error handling
          ├── Gemini integration (optional, server-side key)
          └── Store adapter (src/store.js)
              └── data/applications.json
```

The persistence adapter is intentionally simple so the project is easy to understand. It is suitable for local development or a single persistent server, not ephemeral/serverless hosting or concurrent multi-user production. Replace it with a managed database before deploying a public multi-user application.

## Security and production readiness

Baseline HTTP security headers, including a Content Security Policy, are set by the Express server. This is not a substitute for a full security review, authentication, authorization, distributed rate limiting, or a managed database. The API applies a basic in-memory per-process request limit to AI endpoints. See [SECURITY.md](SECURITY.md) and the [security and quality wiki](docs/wiki/security-quality.md).


This is an internship portfolio project and is not yet a production multi-user service. Authentication/authorization, a CSRF strategy, a managed database, distributed rate limiting, monitoring, backups, and privacy/legal review are not implemented. The current app has no user accounts, so do not use it to store real sensitive job-search data on a public server. Keep secrets in the host's environment settings and never commit `.env`.

## Data honesty

The role cards are sample data for demonstrating search and matching UI; they are not verified live vacancies. Without `GEMINI_API_KEY`, resume review returns clearly labelled rules-based feedback and the assistant endpoint explains that AI is not configured. It does not pretend that a live AI model has answered.

## Deployment notes

The repository can run on a Node.js host that supports a persistent filesystem, or be adapted to a managed database and serverless platform. A free static hosting service alone cannot run this Express backend. See `DEPLOYMENT.md` for hosting and custom-domain notes, `docs/CI.md` for continuous integration, and `docs/wiki/README.md` for the project wiki. The career-planning agent is documented in `docs/wiki/career-agent.md`; its current API is plan-only.

## Project documentation

- [Project Wiki](docs/WIKI.md)
- [Security and Quality Review](docs/SECURITY-QUALITY.md)
- [Career Agent Design](docs/AGENT.md)
- [Deployment Guide](DEPLOYMENT.md)

## Roadmap

- Add real authentication and per-user data ownership.
- Replace JSON persistence with a managed relational database.
- Integrate a verified job-data source with attribution and freshness checks.
- Add rate limiting, stronger request logging, and production monitoring.
- Expand test coverage for AI-provider timeouts, persistence failures, and deployed-host smoke tests.

## License

MIT. See `LICENSE`.
