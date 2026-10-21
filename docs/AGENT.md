# Career Copilot Agent (v1)

## Goal

Provide a small, inspectable agent capability inside AI Career Copilot: translate a career goal into a short actionable checklist and a suggested completion order.

## Current behavior

The v1 agent is a **planning agent**, not an autonomous browser or job-application agent. It accepts a goal and optional task category, then returns suggested steps, completion state, and a reminder to verify claims. It does not submit applications, send email, change accounts, or claim that work has been completed.

Endpoint: `POST /api/agent/plan`

Example request:

```json
{
  "goal": "Prepare my portfolio for a software engineering internship",
  "category": "portfolio"
}
```

Categories currently supported: `resume`, `job-search`, `interview`, `portfolio`, and `general`.

## Safety boundaries

- The plan is advisory; steps begin as incomplete.
- The agent must not invent credentials, job openings, or completed work.
- External actions require a separate implementation, explicit user authorization, and a clear confirmation step.
- Do not send resumes or other personal data to an external AI provider without informing the user.
- Keep API keys on the server.

## Next milestones

1. Add user-controlled task history with authentication and per-user ownership.
2. Add explicit approval before any external side effect.
3. Introduce a job source with freshness checks before claiming roles are open.
4. Add tool execution only for narrow, auditable actions with input validation.
5. Add tests for malformed goals, unsupported categories, and failure handling.
6. Consider model-assisted plan refinement after a secure Gemini integration and response schema validation are in place.
