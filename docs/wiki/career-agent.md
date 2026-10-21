# Career agent

## Purpose

The career agent is a small, explainable planning module that turns a career goal into a structured list of suggested steps. It is intentionally plan-only at this stage.

Implementation: `src/career-agent.js`  
API route: `POST /api/agent/plan`  
Tests: agent contract tests in `tests/server.test.js`

## Request

```json
{
  "goal": "Prepare my portfolio for a software engineering internship",
  "category": "portfolio"
}
```

Supported categories: `resume`, `job-search`, `interview`, `portfolio`, `general`.

## Response contract

The response includes `agent: "career-planner-v1"`, the normalized goal, category, `mode: "plan-only"`, ordered steps with pending status, and a safety note explaining that no external actions were taken.

## Safety properties

- Goal must be a non-empty string and no longer than 1,000 characters.
- Category must match the explicit allowlist.
- The agent uses deterministic playbooks rather than executing generated code.
- It does not apply for jobs, send messages, log in to third-party sites, or claim to have completed tasks.
- Every step begins as pending; the API does not pretend steps were executed.

## Example curl

```bash
curl -X POST http://127.0.0.1:1295/api/agent/plan \
  -H "Content-Type: application/json" \
  -d '{"goal":"Prepare my portfolio for an internship","category":"portfolio"}'
```

## Next version roadmap

1. Add a structured plan preview in the UI.
2. Allow users to edit, reorder, and approve plan steps before any execution feature exists.
3. Add explicit per-action permissions and a human confirmation checkpoint before integrations can act.
4. Record an auditable action result only after a tool confirms success.
5. Add cancellation, timeouts, idempotency, and least-privilege credentials before external integrations.
6. Test prompt injection, unsafe URLs, malformed inputs, and provider failures.

Do not add auto-apply, messaging, or account-control behavior without explicit user authorization, visible action previews, and appropriate platform compliance checks.
