# Security and software quality

## Current safeguards

- Express hides its `X-Powered-By` header.
- Responses set `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and a restrictive `Permissions-Policy`.
- JSON request bodies are limited to 1 MB.
- API routes validate required fields, status values, text lengths, and HTTP(S) job URLs.
- AI input lengths are bounded and Gemini calls have a 30-second timeout.
- Gemini secrets are read from server environment variables, not browser code.
- GitHub Actions checks syntax and runs API tests on Node.js 20 and 22.
- Tests use temporary data stores rather than the user's default application file.

These are baseline controls, not a complete security audit.

## High-priority risks before public multi-user use

1. **No authentication or authorization:** all visitors share the same application data. Do not store real personal job-search data on a public deployment until access controls are implemented.
2. **File persistence:** the JSON file store is not a multi-user database, and the host may discard local files during redeploys or restarts.
3. **AI abuse and cost:** AI routes do not yet have production-grade rate limiting, per-user quotas, or billing controls.
4. **Operational visibility:** no production monitoring, alerting, or privacy-safe audit trail is configured.
5. **Privacy and retention:** define what resume text is sent to an AI provider, how long data is retained, and how users can delete it before collecting real user information.
6. **Cross-origin and deployment policy:** keep the API same-origin where possible; configure an explicit CORS policy only if a separate frontend origin is required.
7. **Dependency supply chain:** commit a lockfile and use reproducible installs before switching CI to `npm ci`; review dependency updates and security advisories.

## Quality gates

For every change:

1. Keep validation and error messages predictable.
2. Add a regression test for changed API behavior.
3. Run `npm run check` and `npm test`.
4. Confirm GitHub Actions passes on both supported Node versions.
5. If UI code changes, manually verify navigation, form validation, loading/error states, mobile layout, and keyboard accessibility in a browser.
6. Never claim a feature is live unless the deployed application has been tested.

## Recommended hardening sequence

### Gate 1 — before sharing a public demo
- Deploy only synthetic/demo records.
- Set a strong environment-based secret and rotate it if it is exposed.
- Confirm HTTPS and hosting environment variables.
- Verify `/api/health`, create/update/delete flows, and AI behavior or clearly labelled AI-disabled behavior.
- Check logs for accidental secret or resume-text leakage.

### Gate 2 — before real users
- Add authentication and enforce per-user ownership on every record route.
- Move data to a managed database with migrations and backups.
- Add rate limits and quotas to AI routes, plus request IDs and safe structured logs.
- Add privacy notice, terms, data-retention rules, and deletion/export flows.
- Add integration tests for timeouts, malformed provider responses, and database failures.

### Gate 3 — before production claims
- Run dependency and secret scanning in CI.
- Add Content Security Policy after validating required script/style/font sources.
- Add monitoring, uptime checks, backup restoration tests, and incident response notes.
- Perform an independent security review and deployed end-to-end tests.

## Reporting a vulnerability

Please do not publish API keys, resume data, or exploit details in a public issue. Use the repository owner's private contact or GitHub's private vulnerability reporting feature if it is enabled. Include affected route/version, impact, and safe reproduction steps. Do not test against other people's data.
