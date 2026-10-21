# AI Career Copilot — Cloudflare Workers + D1 Implementation Plan

> **For agentic workers:** Follow the reviewed design in `docs/superpowers/specs/2026-10-21-cloudflare-deployment-design.md`. Implement in small steps and verify each step before continuing.

**Goal:** Deploy the existing career app online on Cloudflare's free tier without exposing private user records, while keeping local development on port 1295.

**Architecture:** Keep the local Express/JSON mode. Add a Cloudflare Worker adapter using the official Express Worker handler, Workers Static Assets, D1 persistence, and a maintained D1-compatible authentication library. Do not use the ephemeral Worker filesystem for persistent data.

**Design:** `docs/superpowers/specs/2026-10-21-cloudflare-deployment-design.md`

## Global rules

- Do not deploy private application records before authentication and per-user authorization work.
- Do not create paid resources or upgrade the Cloudflare account automatically.
- Never ask the user to paste API tokens or Gemini keys into chat.
- Do not claim a local server or deployed URL is live without a real request proving it.
- Keep local port 1295 and local JSON mode working.
- Keep sample listings clearly marked as samples and the career agent plan-only.
- Stop if the selected authentication library cannot be safely adapted; do not replace it with custom password/session crypto without review.

### Task 1 — Verify the Cloudflare runtime/auth approach before coding

**Files:** inspect `package.json`, `server.js`, `src/store.js`, `public/`, and the official Cloudflare Express/D1 docs.

- [ ] Confirm the official Express Worker handler and Static Assets routing approach using a minimal compatibility spike.
- [ ] Verify a maintained authentication library's current D1/Workers adapter and pin the versions to use.
- [ ] Confirm local mode still runs without Worker bindings or auth secrets.
- [ ] Document any incompatibility and stop before implementing a risky workaround.

**Verification:** minimal Worker handler can answer a health request; no public private-data routes exist yet.

### Task 2 — Refactor configuration and storage boundaries

**Files:** modify `server.js`; add focused config/adapter modules; retain `src/store.js`.

- [ ] Pass Gemini API key/model through explicit app configuration rather than reading mutable global process environment inside route handlers.
- [ ] Add an injectable store resolver so local requests keep the JSON store and cloud requests use a user-scoped D1 adapter.
- [ ] Add a static-asset injection/disable option so Express does not try to serve Worker files from ephemeral `node:fs`.
- [ ] Preserve local startup, routes, and existing tests.
- [ ] Add tests for local defaults and cloud configuration injection.

**Verification:** all existing local tests pass; no secrets are copied into global state.

### Task 3 — Add D1 schema and user-scoped persistence

**Files:** create `migrations/0001_initial.sql`, add a D1 store adapter and tests.

- [ ] Add authentication tables required by the selected maintained library.
- [ ] Add applications and chat_messages tables with owner user IDs, foreign keys, timestamps, and appropriate indexes.
- [ ] Use prepared statements and bound parameters for every dynamic value.
- [ ] Implement list/create/update/delete with owner scoping enforced in SQL.
- [ ] Add tests proving user A cannot read, update, or delete user B's application or chat history.
- [ ] Add chat history read/save/clear behavior and account data deletion, without persisting pasted resumes/job descriptions by default.

**Verification:** cross-user isolation tests pass; migrations apply to local D1.

### Task 4 — Implement and connect authentication

**Files:** auth configuration, Express/Worker route integration, login UI, `public/app.js`, tests.

- [ ] Add sign-up, sign-in, sign-out, and current-session routes through the selected auth library.
- [ ] Enforce session validation before every private API route.
- [ ] Configure secure cookies, session expiry/revocation, same-origin/CSRF protections, and auth rate limits.
- [ ] Add login/sign-up UI states without rebuilding the rest of the dashboard.
- [ ] Keep public health and clearly labelled sample-job endpoints separate from private APIs.
- [ ] Add a privacy notice and a clear way to delete chat history/account data.
- [ ] Test unauthenticated access rejection and authenticated per-user data isolation.

**Verification:** private API routes return 401 without a valid session; users cannot access another user's data.

### Task 5 — Add Worker config, secrets, and deployment automation

**Files:** create `worker.js` (or the compatible official entry point), `wrangler.jsonc`, D1 migration config, and a deployment workflow.

- [ ] Configure Worker runtime compatibility and static assets using current official docs.
- [ ] Add the D1 binding and a tracked migration directory; do not store data in Worker filesystem.
- [ ] Add `npm run dev:worker` and a documented local Worker test path while preserving `npm run dev` on port 1295.
- [ ] Add GitHub Actions deployment only after tests pass; make it conditional on a configured `CLOUDFLARE_API_TOKEN` secret.
- [ ] Keep `GEMINI_API_KEY` and `BETTER_AUTH_SECRET` as Worker secrets, never plain-text committed variables.
- [ ] Create Cloudflare resources only after the Worker, auth, and D1 code is tested and the user has approved resource creation.

**Verification:** Worker tests pass locally/CI; no secrets appear in GitHub.

### Task 6 — Verify and launch safely

**Files:** tests, README, `DEPLOYMENT.md`, `SECURITY.md`, `docs/SECURITY-QUALITY.md`.

- [ ] Run full Node.js tests and syntax checks on Node 20 and 22.
- [ ] Run D1 migration tests and Worker smoke tests.
- [ ] Verify unauthenticated/private route behavior, user isolation, account deletion, chat deletion, CSP, and AI provider error handling.
- [ ] Confirm Cloudflare free-tier resource and quota status; do not upgrade to paid.
- [ ] Deploy to a `workers.dev` URL and verify `/api/health`, sign-up/sign-in, AI endpoints, and application CRUD with a test account.
- [ ] Update setup/deployment docs and record the actual live URL and CI run. If any gate fails, report it and do not call the deployment complete.

## Known blockers and user actions

- The connected Cloudflare account currently has no Worker, Pages project, or D1 database.
- A Cloudflare API token may be required for automated GitHub deployments; the user should add it as a GitHub repository secret, not share it in chat.
- `GEMINI_API_KEY` and `BETTER_AUTH_SECRET` must be configured as Worker secrets.
- No package-lock.json is tracked yet; dependency reproducibility is an outstanding task.
- The custom domain is not assumed to be owned or ready. Use `workers.dev` first.
- Hostinger's exact plan capability is not verified; Cloudflare remains the preferred candidate.
