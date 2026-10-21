# AI Career Copilot Wiki

**Live application:** https://ai-career-copilot-emmy.onrender.com

Official GitHub Wiki: https://github.com/Emmy1-tech/ai-career-copilot/wiki. This folder is the version-controlled documentation mirror in the code repository.

Welcome to the project wiki. This folder keeps the technical documentation versioned alongside the code, so changes to behavior and documentation can be reviewed together.

## Wiki pages

- [Architecture and project map](architecture.md) — components, data flow, API boundaries, and current limitations.
- [Security and quality](security-quality.md) — current safeguards, risks, release gates, and the hardening plan.
- [Career agent](career-agent.md) — agent purpose, plan-only behavior, request contract, and safe extension path.
- [CI workflow](../CI.md) — what GitHub Actions checks and what a green build does not prove.
- [Deployment](../../DEPLOYMENT.md) — hosted URL, local setup, hosting, environment variables, and limitations.

## Quick start

For the hosted demo, open **https://ai-career-copilot-emmy.onrender.com**.

For development, install Node.js 20 or newer, run `npm install`, copy `.env.example` to `.env`, then run `npm run dev`. Open the local address printed by the server. Keep API keys server-side.

Run `npm run check` and `npm test` before proposing a change.

## Documentation rule

Update the relevant wiki page when an API, environment variable, security control, data store, agent capability, or deployment step changes. Clearly label sample job listings and demo-only behavior; never document a planned capability as already live.
