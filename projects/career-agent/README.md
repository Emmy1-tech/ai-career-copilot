# Career Agent subproject

This subproject is the planning layer inside AI Career Copilot. Its implementation currently lives at `../../src/career-agent.js` and is exposed through `POST /api/agent/plan`.

## Current scope

- Turns a user goal into a deterministic checklist.
- Supports resume, job-search, interview, portfolio, and general categories.
- Validates the goal and category.
- Returns a plan-only response; it does not execute actions or contact external services.

## Local development

From the repository root:

```bash
npm install
npm run dev
```

The app runs at `http://localhost:1295` by default.

## Example

```bash
curl -X POST http://localhost:1295/api/agent/plan \
  -H "Content-Type: application/json" \
  -d '{"goal":"Prepare my portfolio for an internship","category":"portfolio"}'
```

## Definition of done for agent changes

- Add or update tests in `tests/server.test.js`.
- Validate inputs on the server.
- Keep plan generation separate from action execution.
- Never represent pending steps as completed.
- Require explicit user approval and a least-privilege permission design before adding integrations that perform external actions.
- Update `docs/wiki/career-agent.md` whenever its contract or behavior changes.
