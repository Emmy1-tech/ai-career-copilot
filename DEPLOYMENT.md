# Deployment guide

## Live application

**Hosted URL:** https://ai-career-copilot-emmy.onrender.com

The Render web service is connected to `Emmy1-tech/ai-career-copilot`, deploys from the `main` branch, and uses:

- Runtime: Node.js
- Build command: `npm install`
- Start command: `npm start`
- Region: Ohio
- Plan: Render free tier
- Service dashboard: https://dashboard.render.com/web/srv-dbc5gkl9fdbs73bumh70

The initial deployment build succeeded and the Node server started. Confirm the live health endpoint at [https://ai-career-copilot-emmy.onrender.com/api/health](https://ai-career-copilot-emmy.onrender.com/api/health) and manually test core browser features before treating the app as fully verified. A live service status alone does not prove that every feature or AI integration is working.

## Important limitations before public use

The app currently has no authentication or per-user authorization. Application records are served from one shared JSON store, and the configured temporary storage path is not durable. Do not enter real resumes, private job-search notes, or personal application records. The service is currently suitable as a portfolio demo only.

Before using real data or inviting other users:

- Add authentication and per-user data ownership.
- Migrate the JSON store to a managed database with backups and migrations.
- Add distributed rate limiting and abuse controls.
- Add monitoring, privacy documentation, and a security review.
- Configure `GEMINI_API_KEY` in Render's environment settings if Gemini-powered features should be enabled. Never commit the key or place it in browser code.

## Automatic deployment

Render is configured to deploy updates from `main`. After a change is merged into `main`, inspect the Render dashboard and confirm the deployment completes. Then test the live app and health endpoint.

## Environment variables

The repository includes `.env.example` for local development. Set production secrets in Render's environment settings, not in GitHub. Relevant variables include:

- `GEMINI_API_KEY`: optional server-side Gemini API key.
- `GEMINI_MODEL`: optional model name; defaults to `gemini-2.5-flash`.
- `DATA_DIR`: data directory. The current hosted configuration uses temporary storage; do not treat it as durable.

Render supplies the `PORT` environment variable automatically.

## Local development and phone testing

Local development instructions are in [`LOCAL-SETUP.md`](LOCAL-SETUP.md). [`PHONE-TEST.md`](PHONE-TEST.md) explains how to test a local development server on the same trusted Wi-Fi network. These are development-only workflows; the public app URL above is the address to share.

## GitHub Pages note

The existing application includes an Express backend, so publishing only the repository as a static GitHub Pages site would not run its API. The Render URL above hosts both the browser UI and Express backend. A separate GitHub Pages frontend would require frontend API configuration and cross-origin security settings.

## Continuous integration

GitHub Actions runs on pushes to `main` and pull requests targeting `main`. The workflow in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) checks Node.js 20 and 22, syntax-checks JavaScript, and runs the API test suite. Passing CI does not prove that the live deployment, Gemini key, or all browser flows are verified.
