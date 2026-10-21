# Security and Quality Review

This is a portfolio/demo application. The checks below distinguish protections already visible in the code from production work still required.

## Current safeguards

- Express disables the `X-Powered-By` header.
- JSON request bodies are limited to 1 MB; malformed JSON receives a stable 400 response and oversized bodies receive a stable 413 response.
- Application creation validates required fields, status values, optional text fields, and HTTP(S) job URLs.
- Resume and assistant inputs have length/type checks.
- Gemini calls are server-side; the API key is read from environment variables.
- User-facing API errors avoid returning raw internal error details for generic server failures.
- Resume analysis and assistant routes have a configurable in-memory per-process request limit; Gemini failures return generic errors and provider response bodies are not logged.
- Automated API tests and JavaScript syntax checks run in GitHub Actions.

## Risks and recommended work

### High priority before public multi-user launch

1. **Authentication and authorization:** there are no user accounts. Anyone who can reach the API may access or modify application records. Do not store real private job-search data on an unauthenticated public deployment.
2. **Persistent database:** replace the JSON file store with a managed database and migrations. JSON file writes can lose updates under concurrent requests and may disappear on hosts with ephemeral filesystems.
3. **Distributed abuse controls:** the current in-memory AI endpoint limiter is per process, resets on restart, and is not a substitute for edge-level or distributed limits on a public deployment.
4. **Privacy:** define retention, deletion, consent, and a privacy notice before accepting personal resumes from public users.
5. **Secret management:** configure API keys in the hosting provider's secret/environment settings. Never commit `.env` or put keys in frontend code.

### Additional hardening

- Add security headers, including an explicit Content Security Policy compatible with the UI.
- Add edge-level/distributed rate limits and verify provider timeouts against the chosen host.
- Validate model output before rendering or persisting it; escape untrusted content in the browser.
- Avoid logging resumes, prompts, API keys, or other sensitive user content.
- Add dependency vulnerability checks and keep dependencies updated.
- Expand tests for provider timeouts/empty responses, corrupted persistence files, and concurrent writes.
- Use a managed database with backups and restore tests.
- Add structured logs, uptime monitoring, and deployment smoke tests.
- Verify accessibility, keyboard navigation, responsive layouts, and error states in a real browser.

## Quality gate

Before each release:

- [ ] GitHub Actions passes on all configured Node versions.
- [ ] API tests cover success, invalid input, missing records, and provider-not-configured behavior.
- [ ] No secrets are committed.
- [ ] Sample job listings are labelled as sample data.
- [ ] Browser smoke test covers navigation, resume form, application CRUD, and error states.
- [ ] Deployment health endpoint returns `200`.
- [ ] Persistence survives a restart on the chosen host.
- [ ] Privacy/security limitations are documented.

## Risk status

**Current status: portfolio/demo, not production-ready for multiple users.** CI success demonstrates only the automated checks that currently exist; it is not a penetration test or proof of deployment reliability.
