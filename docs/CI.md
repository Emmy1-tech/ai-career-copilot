# Continuous integration

## Workflow

Workflow file: `.github/workflows/ci.yml`  
Workflow name: **Node.js checks**

It runs on pushes to `main` and pull requests targeting `main`. A matrix executes the checks on Node.js 20 and 22.

Each job:
1. Checks out the repository.
2. Sets up the matrix Node.js version.
3. Installs dependencies with `npm install`.
4. Runs `npm run check` to syntax-check the server, store, career agent, browser JavaScript, and test file.
5. Runs `npm test` with Node's built-in test runner.

## Run the same checks locally

The default local server port is 1295, but the checks do not require the app to be deployed.

```bash
npm install
npm run check
npm test
```

For local development, run `npm run dev` and open `http://localhost:1295`.

## Reading results

A green GitHub Actions run means the configured syntax checks and automated API tests passed on the listed Node versions. It does **not** prove that:
- a production host is deployed or available;
- a real Gemini key works or AI quota is available;
- the custom domain or HTTPS is configured;
- the UI has been manually checked in a real browser;
- data survives restarts on the chosen host;
- the app is safe for multiple users.

## Troubleshooting

- **Syntax check fails:** inspect the named file and run `npm run check` locally.
- **API test fails:** open the failing test output; preserve a regression test for the bug.
- **Only one Node version fails:** verify supported Node APIs and dependency compatibility.
- **Gemini tests need a secret:** unit/API tests should not require a real key; mock provider behavior for future live-provider tests.
- **Dependency reproducibility:** before using `npm ci`, add and commit `package-lock.json` generated with a supported Node/npm version.
