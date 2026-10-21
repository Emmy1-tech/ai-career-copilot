import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server.js';
import { createStore } from '../src/store.js';

async function withServer(run) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'career-copilot-'));
  const server = createServer(createApp({ store: createStore({ filePath: path.join(directory, 'applications.json') }) }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  try { await run(url); }
  finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
}

test('health endpoint responds and reports AI configuration state', async () => {
  await withServer(async (url) => {
    const response = await fetch(`${url}/api/health`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.status, 'ok');
    assert.equal(typeof body.aiConfigured, 'boolean');
  });
});

test('application can be created, listed, updated, and deleted', async () => {
  await withServer(async (url) => {
    const create = await fetch(`${url}/api/applications`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ company: 'Acme', role: 'Software Intern', status: 'Applied' })
    });
    assert.equal(create.status, 201);
    const { application } = await create.json();
    assert.ok(application.id);
    const list = await (await fetch(`${url}/api/applications`)).json();
    assert.equal(list.applications.length, 1);
    const update = await fetch(`${url}/api/applications/${application.id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'Interview' })
    });
    assert.equal(update.status, 200);
    assert.equal((await update.json()).application.status, 'Interview');
    const remove = await fetch(`${url}/api/applications/${application.id}`, { method: 'DELETE' });
    assert.equal(remove.status, 204);
    assert.equal((await (await fetch(`${url}/api/applications`)).json()).applications.length, 0);
  });
});

test('application validation rejects missing company and unsafe job URLs', async () => {
  await withServer(async (url) => {
    const missing = await fetch(`${url}/api/applications`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role: 'Intern' })
    });
    assert.equal(missing.status, 400);
    const unsafe = await fetch(`${url}/api/applications`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ company: 'Acme', role: 'Intern', jobUrl: 'javascript:alert(1)' })
    });
    assert.equal(unsafe.status, 400);
  });
});

test('resume analyzer validates input and returns clearly labelled fallback feedback', async () => {
  await withServer(async (url) => {
    const short = await fetch(`${url}/api/resume/analyze`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ resumeText: 'too short' })
    });
    assert.equal(short.status, 400);
    const valid = await fetch(`${url}/api/resume/analyze`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ resumeText: 'Developed a React and Node.js project using SQL. Built automated tests and improved response time by 20%.' })
    });
    assert.equal(valid.status, 200);
    const body = await valid.json();
    assert.equal(body.source, 'rules-based-demo');
    assert.ok(body.analysis.score >= 0 && body.analysis.score <= 100);
  });
});

test('unknown routes return JSON 404 errors', async () => {
  await withServer(async (url) => {
    const response = await fetch(`${url}/api/not-real`);
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error, 'Route not found.');
  });
});
