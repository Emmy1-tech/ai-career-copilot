# AI Career Copilot — Secure Cloudflare Deployment Design

Date: 2026-10-21
Status: Draft for review
Repository: https://github.com/Emmy1-tech/ai-career-copilot

## 1. Goal

Make the existing AI Career Copilot available online on a free-tier Cloudflare URL while preserving local development at http://localhost:1295. The public deployment must support real job-application workflows without exposing one user's resume, application tracker, or chat history to another user.

This is a continuation of the existing repository, not a rebuild. The current Express application and browser UI remain the product baseline.

## 2. Current state and evidence

- The repository is public and contains the Node.js/Express app, browser UI, Gemini integration, resume review, job-description matching, evidence-grounded resume/cover-letter drafting, application tracker, interview practice, assistant, and plan-only career planner.
- GitHub Actions currently runs `npm run check` and `npm test` on Node.js 20 and 22. The latest verified code run passed 21 tests with zero failures.
- The default local port is 1295. The local JSON store is serialized within one Node.js process but has no cross-process locking.
- The app has no login or per-user authorization. The application tracker is shared by every caller who can reach the API; do not expose the current JSON-backed app publicly for private records.
- The project has no tracked `package-lock.json`; installs are not yet lockfile-reproducible.
- The connected Cloudflare account currently has no Workers scripts, Pages projects, or D1 databases.
- Hostinger's exact Node.js plan/runtime and persistent-storage capability have not been verified.
- No live deployment, local server, custom domain, or Gemini production secret has been verified.

## 3. Recommended architecture

Use **Cloudflare Workers + D1 + Workers Static Assets**, with the existing Express app adapted for the Workers runtime.

Cloudflare's current documentation has an official Express-on-Workers tutorial using `nodejs_compat` and `cloudflare:node`'s `httpServerHandler`. The current Node.js filesystem implementation in Workers is virtual and ephemeral per request; it must not be used for application persistence. Use D1 for durable, tenant-scoped data and Workers Static Assets for `public/`.

Official references:
- Express on Workers: https://developers.cloudflare.com/workers/tutorials/deploy-an-express-app/
- Node.js compatibility: https://developers.cloudflare.com/workers/runtime-apis/nodejs/
- Workers static assets: https://developers.cloudflare.com/workers/static-assets/binding/
- D1 migrations: https://developers.cloudflare.com/d1/reference/migrations/
- Workers pricing and current free limits: https://developers.cloudflare.com/workers/platform/pricing/
- Workers filesystem behavior: https://developers.cloudflare.com/changelog/post/2025-08-15-nodejs-fs/

### Local mode

- Keep the current Express server and JSON store for local, single-user development.
- Preserve `npm run dev` and the default port 1295.
- Local mode must not require Cloudflare credentials or a D1 database.
- Keep local secrets in an ignored `.env`; never commit them.

### Cloud mode

- Add a Worker entry point that uses the official Express Worker handler and serves `public/` through the Assets binding.
- Inject configuration from Worker bindings. Do not rely on `dotenv/config` or mutable process-global environment variables for production secrets.
- Use a D1-backed data adapter instead of `src/store.js`.
- Apply a D1 schema migration through Wrangler and track migrations in the repository.
- Keep public health and sample-job responses free of private data; require a valid user session for private application, assistant-history, and account APIs.

## 4. Identity and data ownership

Use a maintained authentication library that is compatible with Cloudflare Workers and D1 (evaluate Better Auth with its Cloudflare/D1 integration first; verify the actual installed versions and API before implementing). Do not hand-roll password hashing or session cryptography unless the library path is shown incompatible and a separate security review approves an alternative.

Required behavior:
- Sign-up, sign-in, sign-out, and session validation.
- Secure, HttpOnly, SameSite cookies with production Secure settings.
- Session expiry and revocation on sign-out.
- Server-side identity lookup on every private API request.
- Every application and chat-history query must be scoped to the authenticated user ID. Client-supplied user IDs must never select another user's records.
- Origin/CSRF protection for state-changing requests, same-origin API calls, and bounded auth/AI request limits.
- Account deletion removes the user's applications and saved chat history; users can also clear chat history.
- Do not store pasted resume text or job descriptions by default. They are sent to the configured AI provider only when the user explicitly invokes an AI feature. Persist chat history only after the user is informed and provide a delete control.
- Show a concise privacy notice explaining that prompts/resume text sent to Gemini are processed by Google's service and that provider quotas/terms apply.

If Better Auth + D1 cannot be used reliably with the existing Express Worker adapter, stop and report the blocker rather than silently substituting a custom authentication implementation.

## 5. Data model

Use D1 migrations for:
- Authentication tables required by the selected maintained auth library.
- `applications`: application ID, owner user ID, company, role, status, location, job URL, notes, created/updated timestamps.
- `chat_messages`: message ID, owner user ID, role, content, created timestamp; user-scoped reads/deletes.
- Any minimal metadata required for account/data deletion.

Use prepared statements with bound values. Add foreign keys and indexes for owner-scoped queries. Do not persist resumes, cover letters, or job descriptions unless a future explicit save feature and privacy behavior are designed.

## 6. Gemini and AI safety

- Keep `GEMINI_API_KEY` as a Cloudflare Worker secret and keep it server-side in local mode as well.
- Pass secrets through explicit app configuration, not mutable global `process.env`.
- Preserve provider timeout/error mapping and avoid logging prompt, resume, provider response body, or secret content.
- Apply request limits to assistant, resume analysis, match, and tailoring routes.
- Keep sample job listings labelled as samples; external job-board links are search links, not data verified by this app.
- Keep the career agent plan-only. Do not submit applications or contact employers automatically.
- The resume-to-job alignment estimate is not an ATS score or a hiring prediction; all tailored content must be reviewed for truth before submission.

## 7. Free-tier and billing guardrails

Cloudflare's current documentation states that Workers Free includes a limited daily request allowance and D1 has daily row-read/write limits. D1 requests fail when the free-tier daily limits are exceeded until the quota resets. The Workers Paid plan has a minimum monthly charge. Therefore:
- Target free-tier use and do not enable a paid plan automatically.
- Do not promise unlimited free usage.
- Do not create paid resources or incur paid usage without explicit user approval.
- Gemini's own free-tier quota/billing is separate from Cloudflare and must be checked in Google's account settings.
- Monitor the Cloudflare dashboard after launch and keep usage alerts/limits in the deployment guide.

## 8. Deployment and release gates

- Deployment target: Cloudflare Workers default `workers.dev` URL first. Do not configure `careercopilotai.io` until domain ownership and DNS access are confirmed.
- Use GitHub Actions for repeatable deployment only after the Worker and D1 configuration pass tests.
- A `CLOUDFLARE_API_TOKEN` with only required Worker/D1 deployment permissions must be configured as a GitHub repository secret by the user if automated deploys need it. Never request the token or Gemini key in chat.
- `BETTER_AUTH_SECRET` and `GEMINI_API_KEY` must be configured as Worker secrets.
- Deploy only after auth, per-user data scoping, D1 migrations, security tests, and privacy notice are present.
- Verify the actual deployed health endpoint and authenticated/unauthenticated behavior before declaring launch ready.
- A passing CI run alone is not proof that the deployed app is live or that Gemini is configured.

## 9. Out of scope

- Replacing the product UI or creating a separate new project.
- Exposing the existing unauthenticated JSON-backed app to the public.
- Unrestricted autonomous applications, employer messaging, or browser/computer actions.
- Pretending sample listings are live vacancies.
- Automatically enabling a paid Cloudflare plan or paid AI service.
- Setting up a custom domain without confirming control of the domain.

## 10. Open verification gates

1. Confirm the chosen auth library version and its compatibility with the current Cloudflare Workers/Express/D1 runtime.
2. Confirm the Express adapter can route API traffic while Workers Static Assets serves frontend files.
3. Add a tracked package lockfile so the Worker/auth toolchain can be reproduced.
4. Build and test the D1 adapter and user-scoped API contract locally before creating production resources.
