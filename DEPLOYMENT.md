# Deployment checklist

## Important: choose a Node.js host for the full-stack app

This repository serves the frontend and Express API from the same Node.js process. A static-only host can publish the HTML/CSS/JS, but it cannot run `server.js` or persist API data. For a public demo, choose a Node.js service with a persistent disk or first migrate the JSON store to a managed database.

## Basic deployment steps

1. Connect `Emmy1-tech/ai-career-copilot` to a Node.js hosting provider that supports Node 20+.
2. Set the build/install command to `npm install`.
3. Set the start command to `npm start`.
4. Add environment variables in the host dashboard; do not upload `.env`.
5. Configure `GEMINI_API_KEY` only if you want live Gemini-powered responses.
6. Test `/api/health`, create and update an application, and submit a resume review.
7. Confirm the host uses persistent storage before relying on application records. The current JSON adapter writes to `data/applications.json`.

## Custom domain: careercopilotai.io

You must control the domain to connect it. In the host dashboard, add `careercopilotai.io` and optionally `www.careercopilotai.io`, then apply the exact DNS records provided by the host registrar/DNS dashboard. Wait for DNS propagation and HTTPS certificate provisioning. Do not point DNS to guessed records.

## Free hosted URL

Many platforms offer a free subdomain, but terms, quotas, sleep behavior, persistent disk, and backend support vary. Confirm that the selected free tier supports a long-running Node server and persistence before using it. A free static site can host a landing page, but it cannot run this backend by itself.

## Production hardening still required

- Authentication and per-user authorization.
- Managed database with backups and migrations.
- Rate limiting and abuse controls on AI endpoints.
- Monitoring, structured logs, request timeouts, and usage limits.
- Privacy policy and terms appropriate to the data you collect.
- Security review and integration tests against the deployed host.

The current application is an internship portfolio demo, not a production multi-user service.
