# AI Career Copilot Local Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing AI Career Copilot easier to start and safer and more trustworthy to test locally, without breaking its existing career-support workflows or exposing private data publicly.

**Architecture:** Keep the existing Node.js 20+ ES-module Express app, browser UI, JSON store adapter, and built-in Node test runner. Make targeted changes with tests first; keep public hosting and multi-user identity as a separate next milestone because the current unauthenticated JSON-backed store is not safe for public personal records.

**Tech Stack:** Node.js 20+, Express 4, built-in `node:test`, browser-native JavaScript, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-20-ai-career-copilot-hardening-design.md`

## Global Constraints

- Preserve the existing repository and user-facing UI unless a tested fix requires a targeted change.
- Default local port remains 1295.
- Do not put `GEMINI_API_KEY` or other secrets in browser code, repository files, test output, or logs.
- Keep sample jobs labelled as samples and rules-based resume feedback labelled as a demo fallback.
- Do not claim a test, local server, or deployment was verified unless it was actually run and observed.
- Do not deploy unauthenticated private application records as a public multi-user service.
- Keep the agent plan-only; do not submit applications or contact employers.
- Do not add a paid service or incur paid usage without explicit user approval.

## Review Focus

- Malformed JSON and oversized request bodies must produce predictable client errors rather than an unhandled server failure.
- Missing or failing Gemini configuration must not be presented as a successful live AI response.
- Concurrent JSON-store writes may race; keep the local/demo scope explicit and test any store behavior changed.
- User-controlled content must remain escaped when rendered in the browser.
- Public deployment must remain blocked for private user records until authentication and per-user authorization exist.

---

### Task 1: Establish and record a reproducible baseline

**Files:**
- Inspect: `package.json`
- Inspect: `.env.example`
- Inspect: `start-local.bat`
- Inspect: `.github/workflows/ci.yml`
- Inspect: `tests/server.test.js`
- Inspect: `README.md`, `DEPLOYMENT.md`, `docs/SECURITY-QUALITY.md`

**Interfaces:**
- Consumes: existing `npm test`, `npm run check`, `npm start`, and `npm run dev` scripts.
- Produces: a documented baseline distinguishing checks actually run from source-only review.

- [ ] Step 1: Run `npm test` in a Node.js 20+ environment and record the exit status and test count.
- [ ] Step 2: Run `npm run check` and record the exit status.
- [ ] Step 3: Review the CI workflow for Node version coverage and the same test/check commands; record any mismatch.
- [ ] Step 4: If execution tools are unavailable, do not invent output; state which commands the user or CI must run.

Expected verification: tests and syntax checks are reported separately, with no unsupported claims about localhost.

### Task 2: Pin malformed and oversized request behavior with tests

**Files:**
- Modify: `tests/server.test.js`
- Modify if required: `server.js`

**Interfaces:**
- Consumes: `createApp({ store })` and the existing Express JSON parser with its 1 MB limit.
- Produces: stable JSON error responses for invalid JSON and payloads exceeding the configured limit.

- [ ] Step 1: Add a test that posts malformed JSON to an API endpoint and asserts a 400 response with a JSON error body.
- [ ] Step 2: Run the targeted test and confirm it fails or exposes the current response behavior.
- [ ] Step 3: Add the smallest Express error-handler change needed to normalize JSON parse errors and body-too-large errors without leaking stack traces.
- [ ] Step 4: Add a test for a body larger than 1 MB and assert a 413 response with a JSON error body.
- [ ] Step 5: Run both targeted tests, then run `npm test` and `npm run check`.

Expected verification: malformed JSON returns 400; oversized JSON returns 413; existing tests remain green.

### Task 3: Improve AI provider failure handling and truthful UI feedback

**Files:**
- Inspect and modify if needed: `server.js`
- Inspect and modify if needed: `public/app.js`
- Modify: `tests/server.test.js`

**Interfaces:**
- Consumes: existing Gemini server-side integration and the current missing-key behavior.
- Produces: clear, bounded error responses when provider configuration, response content, or provider requests fail.

- [ ] Step 1: Inspect the current Gemini request implementation, response parsing, and error paths before changing code.
- [ ] Step 2: Add tests for missing key, provider failure, and invalid/empty provider response using an injectable or stubbed request boundary where feasible; tests must not require a real key or network access.
- [ ] Step 3: Implement a bounded provider timeout and safe error mapping if not already present; never return secrets, raw headers, or full provider internals.
- [ ] Step 4: Ensure the UI distinguishes live Gemini results from rules-based fallback and configuration/provider errors.
- [ ] Step 5: Run targeted tests, full tests, and syntax checks.

Expected verification: tests work without a Gemini key; live AI is only claimed when a successful provider response actually occurred.

### Task 4: Add modest API abuse controls without breaking local use

**Files:**
- Modify: `server.js`
- Modify: `tests/server.test.js`
- Modify if necessary: `package.json` and lockfile

**Interfaces:**
- Consumes: current Express route structure and JSON API.
- Produces: configurable protection for expensive AI endpoints and clear 429 behavior.

- [ ] Step 1: Check whether a lockfile exists and whether a rate-limit dependency is already present before adding anything.
- [ ] Step 2: Define a conservative configurable limit for AI endpoints, with a test-friendly override or disabled setting for deterministic tests.
- [ ] Step 3: Add tests for allowed requests and rate-limit rejection; avoid a test that depends on real time or an external service.
- [ ] Step 4: Implement the minimum suitable limiter and return a JSON 429 response without logging resume contents or prompts.
- [ ] Step 5: Run targeted tests, full tests, and syntax checks.

Expected verification: excessive repeated AI requests are limited; normal local workflows and existing tests continue to work. This control is not a substitute for production identity or a full abuse-control strategy.

### Task 5: Tighten local setup and security documentation

**Files:**
- Modify if needed: `README.md`
- Modify if needed: `DEPLOYMENT.md`
- Modify if needed: `docs/SECURITY-QUALITY.md`
- Modify if needed: `docs/wiki/README.md`
- Create or update: `SECURITY.md`

**Interfaces:**
- Consumes: actual scripts, environment variables, endpoints, and verified test behavior.
- Produces: consistent beginner-friendly setup and accurate launch-readiness warnings.

- [ ] Step 1: Compare the documented scripts, port, environment variables, and endpoints against the current code.
- [ ] Step 2: Fix only inaccurate or missing instructions, including Windows startup and manual npm commands.
- [ ] Step 3: Clearly state that no login exists, local JSON storage is single-user/demo-oriented, and public deployment must not hold private career records until identity and per-user authorization are implemented.
- [ ] Step 4: Document sample jobs, the no-key resume fallback, and the requirement to keep Gemini credentials server-side.
- [ ] Step 5: Add a concise security reporting policy to `SECURITY.md`, without publishing private contact details or claiming a formal security program that does not exist.
- [ ] Step 6: Run `npm test` and `npm run check`; check all documentation links that can be verified from the repository.

Expected verification: setup instructions match the repository and security claims do not exceed implemented protections.

### Task 6: Review CI and complete the first milestone

**Files:**
- Inspect and modify if required: `.github/workflows/ci.yml`
- Inspect: `package.json`, changed tests and docs.

**Interfaces:**
- Consumes: baseline `npm test` and `npm run check` commands.
- Produces: CI that runs the same baseline checks on supported Node versions and a concise milestone report.

- [ ] Step 1: Confirm the existing workflow triggers on the intended branch and pull requests.
- [ ] Step 2: Ensure CI installs dependencies reproducibly when a lockfile exists and runs `npm run check` plus `npm test`.
- [ ] Step 3: Make no unnecessary workflow rename; the existing lowercase `.github/workflows/ci.yml` is already conventional.
- [ ] Step 4: Run all checks available in the current environment.
- [ ] Step 5: Inspect the latest GitHub Actions run if connector access permits and report its actual state.
- [ ] Step 6: Summarize changed files, verified tests, unresolved risks, and the next milestone: identity/per-user data ownership plus Cloudflare Workers/D1 compatibility and deployment.

Expected verification: local checks and remote CI status are reported independently; no claim that the public deployment is ready while authentication and per-user data ownership are missing.

## Next milestone (not included in this plan)

A separate reviewed plan will cover the public deployment architecture: choose Cloudflare Workers + D1 or a verified Node-compatible host; implement identity and per-user authorization; migrate persistence; add schema migrations and data deletion/retention behavior; configure secrets and origin protections; deploy only after security tests; verify the live health endpoint. The existing app has no user authentication and the Cloudflare account inspection previously showed no deployed Worker, Pages project, or D1 database, so deployment must not be implied by this local-hardening milestone.
