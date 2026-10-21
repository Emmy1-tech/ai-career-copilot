# AI Career Copilot — Local Reliability and Safe Free-Hosting Design

Date: 2026-10-20
Status: Draft for user review
Repository: https://github.com/Emmy1-tech/ai-career-copilot

## 1. Goal

Continue the existing AI Career Copilot repository into a reliable project that can be developed locally at http://127.0.0.1:1295 and then deployed as a publicly reachable app on a free or free-tier host, without rebuilding the product or falsely presenting demo data and fallback analysis as live AI or live vacancies.

The app must remain a career-support tool. Any agent behavior is bounded and plan-oriented; it must not submit applications, message employers, or perform other consequential external actions without explicit user approval.

## 2. Current-state baseline

The current project is a Node.js 20+ ES-module application with Express, static assets under public/, JSON-file persistence in src/store.js, a Gemini integration in server.js, a plan-only career agent in src/career-agent.js, Node's built-in test runner, and GitHub Actions CI.

Existing capabilities include dashboard and application tracking, resume text analysis (Gemini when configured and a clearly labelled rules-based fallback otherwise), assistant chat when Gemini is configured, sample job recommendations, and a plan-only career agent. Sample job listings are explicitly not verified live vacancies.

The project already defaults to port 1295, has start/dev/test/check scripts, a Windows start-local.bat helper, and a CI workflow at .github/workflows/ci.yml. These should be improved only where evidence shows a need; do not replace working structures gratuitously.

## 3. User constraints and success criteria

- Keep working in Emmy1-tech/ai-career-copilot; do not create a replacement project.
- Preserve the existing UI and features unless a targeted change is needed for safety or correctness.
- Keep local development on port 1295 by default and document the actual start commands.
- Keep GEMINI_API_KEY server-side and never commit secrets.
- Prefer a Cloudflare free-tier deployment if the current architecture can be adapted safely and the account supports it; otherwise explain the smallest viable alternative. Hostinger remains an option only after the actual plan/runtime capabilities are confirmed.
- Use GitHub as the source of truth and keep changes reviewable. Do not claim tests passed, a server started, or a deployment succeeded without direct evidence.
- Do not expose private career records publicly. Because the current JSON store has no authentication or per-user authorization, the present app must be treated as a single-user local demo until a safe multi-user identity/data model is implemented.
- Do not promise that Gemini usage is free indefinitely; document provider quota, account and billing constraints as external dependencies.

Success means a clean local setup is documented, automated checks provide trustworthy results, known security limits are explicit and addressed in the right phase, the public deployment is not connected to unprotected private records, and the user can distinguish tested features from planned work.

## 4. Proposed approaches

### Recommended: staged hardening, then host adaptation

First make the existing Node/Express project reproducible and improve tests and safety. Next decide the deployment architecture based on the actual hosting constraints. Cloudflare Workers with D1 is a candidate, not an assumption: the Express application and filesystem JSON store cannot be presumed to run unchanged on Workers. Preserve a local Node adapter for 127.0.0.1:1295 and use an explicit cloud adapter/schema only if a compatibility review supports it.

Advantages: lowest disruption, clear testable increments, no accidental public exposure of personal data. Trade-off: cloud deployment may require a deliberate adapter or a different host rather than a one-click upload.

### Alternative: deploy the current Express app to a confirmed Node host

Keep the server and JSON store initially, using Hostinger only if the user's plan is confirmed to support the required Node process, environment secrets, persistent storage, and deployment workflow. This is a simpler compatibility path but JSON-file storage is not appropriate for concurrent multi-user production use and host plan support is not yet verified.

### Alternative: move immediately to a Cloudflare-native implementation

Rework routes and persistence around Workers and D1 before local hardening. This aligns with a free-tier serverless deployment but creates more simultaneous change and migration risk, so it is not recommended as the first step.

## 5. Architecture and staged scope

### Stage A — Local reproducibility and quality

- Preserve Node.js 20+ and default port 1295.
- Inspect existing scripts, start-local.bat, test coverage and CI before changing them.
- Run the current checks where an execution environment is available; otherwise distinguish static repository review from runtime verification.
- Add regression tests before changing behavior.
- Harden request parsing and error behavior, input validation, provider timeouts/error handling, rate limiting where compatible with the local demo, and safe logging.
- Ensure API and UI labels accurately disclose rule-based fallback and sample job data.
- Document setup, environment variables, API routes, persistence behavior, tests, troubleshooting and security limitations.
- Add or update SECURITY.md with responsible disclosure guidance and avoid promising production security before it exists.

### Stage B — Safe public deployment architecture

- Do not deploy the current unauthenticated application-tracking API with private user records to a public endpoint.
- Choose a persistence model fit for the selected host. For Cloudflare, evaluate D1 and Workers compatibility; keep local JSON storage only for local/demo mode if appropriate.
- Add identity and per-user authorization before private records are stored or served in a public multi-user deployment.
- Define retention and user deletion behavior for resumes and career records.
- Keep secrets in host environment/secret configuration; never in frontend code or repository files.
- Add origin/CORS policy, abuse controls, and request-size/time limits appropriate to the chosen deployment.
- Create deployment configuration and instructions only after the selected architecture is confirmed against current platform capabilities.

### Stage C — AI, agent behavior and release readiness

- Test actual Gemini requests only when a valid secret is configured; do not expose or request the key in chat.
- Validate AI outputs and handle provider errors, timeouts and empty responses predictably.
- Keep the agent bounded to planning and advice unless a future action workflow includes explicit per-action approval and auditable outcomes.
- Clearly label sample jobs and do not present them as real or verified listings.
- Verify GitHub Actions checks and the deployed health endpoint before calling the app launch-ready.
- Record remaining limits, rollback steps and deployment status.

## 6. Security and privacy requirements

- No API keys or credentials in browser JavaScript, committed files, logs, screenshots, or public docs.
- No public access to private application records without authentication and per-user authorization.
- Validate body types, lengths, URLs and enums at server boundaries; use safe error messages and avoid leaking provider responses or secrets.
- Apply request-size limits and provider timeouts; add a modest configurable rate limit to expensive AI routes where it does not break tests or local use.
- Validate malformed JSON and oversized-body behavior with tests.
- Escape user-controlled text at the UI rendering boundary and review any use of HTML injection.
- Keep sample listings marked as samples; do not imply live data or verified match scores without evidence.
- Document that resume text is sensitive personal data and explain where it is stored and how to remove it before enabling public multi-user use.

## 7. Verification strategy

- Run existing tests first when a Node execution environment is available.
- Use test-first changes: add a focused failing regression test, verify it fails, implement the smallest fix, then run targeted and full checks.
- Keep npm run check and npm test as the baseline CI commands; retain the current Node 20/22 matrix unless a demonstrated compatibility issue requires a change.
- Inspect actual GitHub Actions results after commits where available.
- Do not claim local runtime or deployed behavior was verified based solely on source inspection.
- Test health status, application validation, safe URL handling, malformed/oversized JSON, missing/failed Gemini configuration, agent plan limits, and public/private data boundaries.

## 8. Out of scope for the first pass

- Rebuilding the UI or replacing the repository.
- Unrestricted autonomous browsing, job applications, employer messaging, or computer control.
- Claiming live job search without a real verified job-data source.
- Adding paid services without user consent.
- Exposing the current unauthenticated JSON-backed app as a public multi-user service.
- Claiming production readiness before authentication, persistence, privacy, abuse controls and deployment verification are complete.

## 9. Open implementation decisions

These decisions are intentionally deferred until the spec is approved and a step-by-step plan is reviewed:
- Whether the free public deployment should use Cloudflare Workers + D1 or a confirmed Node-compatible host.
- Whether authentication is implemented with a host-supported identity service or a minimal secure session-based approach.
- Which features remain available in public demo mode before authentication and database migration are complete.
- Exact rate-limit thresholds and retention policy, to be documented and tested rather than guessed.
