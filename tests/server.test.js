import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server.js';
import { createStore } from '../src/store.js';

async function withServer(run, appOptions = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'career-copilot-'));
  const server = createServer(createApp({ store: createStore({ filePath: path.join(directory, 'applications.json') }), ...appOptions }));
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


test('invalid application status and missing record return useful client errors', async () => {
  await withServer(async (url) => {
    const invalid = await fetch(`${url}/api/applications`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ company: 'Acme', role: 'Intern', status: 'Maybe' })
    });
    assert.equal(invalid.status, 400);
    const missing = await fetch(`${url}/api/applications/not-a-real-id`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'Interview' })
    });
    assert.equal(missing.status, 404);
  });
});

test('assistant endpoint explains missing AI configuration without pretending to answer', async () => {
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    await withServer(async (url) => {
      const response = await fetch(`${url}/api/assistant`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'Help me prepare for a software engineering interview.' })
      });
      assert.equal(response.status, 503);
      assert.match((await response.json()).error, /not configured/i);
    });
  } finally {
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});

test('career agent creates a safe plan without claiming to execute actions', async () => {
  await withServer(async (url) => {
    const response = await fetch(`${url}/api/agent/plan`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ goal: 'Prepare my portfolio for an internship', category: 'portfolio' })
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.agent, 'career-planner-v1');
    assert.equal(body.mode, 'plan-only');
    assert.ok(body.steps.length >= 3);
    assert.ok(body.steps.every((step) => step.status === 'pending'));
    assert.match(body.safetyNote, /no applications.*performed/i);
  });
});

test('career agent rejects empty goals and unsupported categories', async () => {
  await withServer(async (url) => {
    const empty = await fetch(`${url}/api/agent/plan`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ goal: '  ' })
    });
    assert.equal(empty.status, 400);
    const invalid = await fetch(`${url}/api/agent/plan`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ goal: 'Find a role', category: 'hack-the-world' })
    });
    assert.equal(invalid.status, 400);
  });
});

test('security headers are present on API responses', async () => {
  await withServer(async (url) => {
    const response = await fetch(`${url}/api/health`);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.match(response.headers.get('permissions-policy') || '', /camera=\(\)/);
    assert.equal(response.headers.get('x-powered-by'), null);
  });
});


test('malformed JSON returns a stable JSON client error', async () => {
  await withServer(async (url) => {
    const response = await fetch(`${url}/api/applications`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"company":'
    });
    assert.equal(response.status, 400);
    assert.match(response.headers.get('content-type') || '', /application\/json/i);
    assert.equal((await response.json()).error, 'Request body contains invalid JSON.');
  });
});

test('oversized JSON returns a stable 413 response', async () => {
  await withServer(async (url) => {
    const response = await fetch(`${url}/api/applications`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ company: 'Acme', role: 'Intern', notes: 'x'.repeat(1_100_000) })
    });
    assert.equal(response.status, 413);
    assert.match(response.headers.get('content-type') || '', /application\/json/i);
    assert.equal((await response.json()).error, 'Request body is too large.');
  });
});


test('Gemini provider failures return a safe 502 without provider response details', async () => {
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-key-not-a-real-secret';
  try {
    await withServer(async (url) => {
      const response = await fetch(`${url}/api/assistant`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'Help me prepare for a software engineering interview.' })
      });
      assert.equal(response.status, 502);
      const body = await response.json();
      assert.equal(body.error, 'Something went wrong. Please try again.');
      assert.doesNotMatch(JSON.stringify(body), /private provider details|test-key-not-a-real-secret/i);
    }, { geminiFetch: async () => new Response('private provider details', { status: 429 }) });
  } finally {
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});

test('AI endpoints apply a configurable request limit', async () => {
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    await withServer(async (url) => {
      const request = () => fetch(`${url}/api/assistant`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'Help me prepare for an interview.' })
      });
      const first = await request();
      assert.equal(first.status, 503);
      const second = await request();
      assert.equal(second.status, 429);
      assert.equal((await second.json()).error, 'Too many requests. Please try again shortly.');
    }, { aiRateLimit: { windowMs: 60_000, max: 1 } });
  } finally {
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});


test('job description match validates inputs and returns honest rule-based evidence when AI is not configured', async () => {
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    await withServer(async (url) => {
      const invalid = await fetch(`${url}/api/resume/match`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ resumeText: 'too short', jobDescription: 'We need a software engineer with Python and SQL skills.' })
      });
      assert.equal(invalid.status, 400);

      const response = await fetch(`${url}/api/resume/match`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          targetRole: 'Software Engineering Intern',
          resumeText: 'Built a JavaScript and React project, wrote tests, used Git and Node.js to create a REST API.',
          jobDescription: 'We seek a software engineering intern with Python, SQL, JavaScript, React, Git, and automated testing experience. Candidates should explain their project decisions clearly.'
        })
      });
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.source, 'rules-based-demo');
      assert.ok(body.analysis.alignmentScore >= 0 && body.analysis.alignmentScore <= 100);
      assert.ok(body.analysis.matchedRequirements.some((item) => /javascript/i.test(item)));
      assert.ok(body.analysis.missingRequirements.some((item) => /python/i.test(item)));
      assert.match(body.analysis.note, /not an ATS score/i);
    });
  } finally {
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});


test('job description match parses a structured Gemini response when configured', async () => {
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-key-not-a-real-secret';
  try {
    const aiResult = {
      alignmentScore: 84,
      summary: 'The resume shows relevant project evidence.',
      matchedRequirements: ['JavaScript', 'React project'],
      missingRequirements: ['Python'],
      evidenceGaps: ['Add a truthful Python example if you have one.'],
      tailoringSuggestions: ['Move the relevant project higher.'],
      nextSteps: ['Prepare to explain the project decisions.']
    };
    await withServer(async (url) => {
      const response = await fetch(`${url}/api/resume/match`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          targetRole: 'Software Engineering Intern',
          resumeText: 'Built a React and JavaScript project with automated tests and a Node.js API. Used Git to track changes.',
          jobDescription: 'We seek an intern with JavaScript, React, Python, teamwork, and testing skills. You will build features and work with the engineering team.'
        })
      });
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.source, 'gemini');
      assert.equal(body.analysis.alignmentScore, 84);
      assert.deepEqual(body.analysis.missingRequirements, ['Python']);
      assert.match(body.analysis.note, /not an ATS score/i);
    }, {
      geminiFetch: async () => new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: ' ```json\n' + JSON.stringify(aiResult) + '\n``` ' }] } }]
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    });
  } finally {
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});
