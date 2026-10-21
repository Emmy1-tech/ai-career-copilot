# Security policy

## Scope

This repository is a portfolio/demo application. Baseline request validation and HTTP security headers are present, but authentication, per-user authorization, rate limiting, and production database controls are not complete. Do not use a public deployment to store real sensitive personal data until these gaps are addressed.

## Supported version

Security fixes target the latest code on the default branch.

## Reporting a vulnerability

Please do not publish API keys, resume text, personal data, or exploit details in a public issue. If GitHub private vulnerability reporting is enabled for this repository, use it. Otherwise contact the repository owner privately through a trusted channel and include:

- affected commit or route;
- impact and likely attack conditions;
- minimal safe reproduction steps;
- any suggested mitigation.

Do not access, modify, or retain other users' data while investigating a vulnerability.

## Secret handling

- Keep `GEMINI_API_KEY` in the hosting provider's secret/environment settings.
- Never commit `.env`, credentials, session tokens, or real resume/application records.
- If a secret is exposed, revoke/rotate it immediately and remove it from active configuration; deleting the visible line alone may not remove it from Git history.
