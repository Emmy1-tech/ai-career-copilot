# Deployment checklist

## Current deployment decision

This repository serves its frontend and Express API from one Node.js process. It also writes application records to a local JSON file at `data/applications.json`. That makes it easy to run locally, but it means:

- A static-only host cannot run the existing backend.
- An ephemeral/serverless host can lose JSON-file data when instances restart or scale.
- The current app has no sign-in or per-user authorization, so it is not ready for public users to store real application records.

**Recommended order:** test local-network access using [PHONE-TEST.md](PHONE-TEST.md), then choose a public host based on the current backend and persistence requirements. Do not switch production DNS or buy a domain as part of the local test.

## Test on a phone first

Follow [PHONE-TEST.md](PHONE-TEST.md) to access the running development server from a phone on the same trusted Wi-Fi network. This is local-network access only; it does not publish the app to the internet. Never port-forward port 1295 or expose the development server publicly.

## Hosting options

### Option A: Existing Node.js host

If your Hostinger plan supports Node.js 20+, a long-running Node process, environment variables, and persistent storage, it may run the existing app with fewer code changes.

1. Connect the repository `Emmy1-tech/ai-career-copilot` in the host dashboard.
2. Install/build command: `npm install`.
3. Start command: `npm start`.
4. Use the host-provided port if the platform sets `PORT`.
5. Add secrets in the host environment settings; do not upload `.env`.
6. Confirm persistent storage is supported and configured before relying on application records.
7. Test `/api/health`, create/update/delete an application, and try resume analysis.

The exact Hostinger plan and features must be checked in its dashboard; do not assume every plan includes Node.js hosting or a persistent filesystem.

### Option B: Cloudflare

The current Express server and local JSON store cannot simply be uploaded to Cloudflare Pages as a static site. To use a Cloudflare Workers free subdomain, the application needs a Workers-compatible backend and persistent storage such as D1, plus migration and tests for the existing API behavior. Do this as a separate implementation and verify all existing features before routing public traffic to it.

Cloudflare documentation:
- [Workers](https://developers.cloudflare.com/workers/)
- [D1](https://developers.cloudflare.com/d1/)
- [Workers Builds / Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/)

A Cloudflare account alone does not mean the app is deployed. The public URL only exists after a successful deployment.

## Free hosted URL

A provider may offer a free subdomain, but quotas, sleep behavior, storage durability, and supported runtimes vary. Verify the current plan terms before choosing it. A free static-site host alone cannot run `server.js` or persist the app's data.

## Custom domain: careercopilotai.io

The desired domain is `careercopilotai.io`. A custom `.io` domain is normally a paid registration; you can use a free provider subdomain while testing. To connect the custom domain later, you must first register/control it, add it in the chosen host dashboard, and apply the exact DNS records supplied by that host or registrar. Never guess DNS records.

## Environment variables

See `.env.example`. Set secrets in the hosting provider's environment panel. Never commit a real `GEMINI_API_KEY` or `.env` file.

## Continuous integration

GitHub Actions runs on pushes to `main` and pull requests targeting `main`. The workflow in `.github/workflows/ci.yml` tests Node.js 20 and 22, installs dependencies, checks JavaScript syntax, and runs the API test suite. CI passing does not prove that a live deployment, Gemini key, custom domain, or browser session has been verified.

## Production hardening required before a public multi-user launch

- Authentication and per-user authorization.
- Managed database with backups and migrations, or another explicitly durable persistence service.
- Edge-level/distributed rate limiting and abuse controls (the current in-memory limit is per process only).
- Monitoring, structured logs, request timeouts, and usage limits.
- Privacy policy and terms appropriate to the data collected.
- Security review and integration tests against the deployed host.

This is currently an internship portfolio demo, not a production multi-user service.
