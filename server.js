import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from './src/store.js';
import { planCareerTask } from './src/career-agent.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp({ store = createStore(), geminiFetch = fetch, aiRateLimit = { windowMs: 60_000, max: 20 } } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'");
    next();
  });
  const limitAiRequests = createRateLimiter(aiRateLimit);
  app.use('/api/resume', limitAiRequests);
  app.use('/api/assistant', limitAiRequests);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'ai-career-copilot-api', aiConfigured: Boolean(process.env.GEMINI_API_KEY) });
  });

  app.get('/api/dashboard', async (_req, res, next) => {
    try {
      const applications = await store.listApplications();
      res.json({
        stats: {
          applications: applications.length,
          interviews: applications.filter((item) => item.status === 'Interview').length,
          offers: applications.filter((item) => item.status === 'Offer').length,
          responseRate: applications.length ? Math.round((applications.filter((item) => ['Interview', 'Offer', 'Rejected'].includes(item.status)).length / applications.length) * 100) : 0
        },
        recentApplications: applications.slice(0, 5),
        aiConfigured: Boolean(process.env.GEMINI_API_KEY)
      });
    } catch (error) { next(error); }
  });

  app.get('/api/applications', async (_req, res, next) => {
    try { res.json({ applications: await store.listApplications() }); }
    catch (error) { next(error); }
  });

  app.post('/api/applications', async (req, res, next) => {
    try {
      const { company, role, status = 'Applied', location = '', jobUrl = '', notes = '' } = req.body ?? {};
      if (typeof company !== 'string' || !company.trim() || typeof role !== 'string' || !role.trim()) {
        return res.status(400).json({ error: 'Company and role are required.' });
      }
      const allowedStatuses = ['Saved', 'Applied', 'Interview', 'Offer', 'Rejected'];
      if (!allowedStatuses.includes(status)) return res.status(400).json({ error: 'Choose a valid application status.' });
      if ([location, jobUrl, notes].some((value) => typeof value !== 'string')) return res.status(400).json({ error: 'Optional fields must be text.' });
      if (jobUrl && !isSafeHttpUrl(jobUrl)) return res.status(400).json({ error: 'Job URL must start with http:// or https://.' });
      const application = await store.createApplication({
        company: company.trim().slice(0, 120),
        role: role.trim().slice(0, 160),
        status,
        location: location.trim().slice(0, 120),
        jobUrl: jobUrl.trim().slice(0, 1000),
        notes: notes.trim().slice(0, 2000)
      });
      res.status(201).json({ application });
    } catch (error) { next(error); }
  });

  app.patch('/api/applications/:id', async (req, res, next) => {
    try {
      const allowedStatuses = ['Saved', 'Applied', 'Interview', 'Offer', 'Rejected'];
      const { status } = req.body ?? {};
      if (!allowedStatuses.includes(status)) return res.status(400).json({ error: 'Choose a valid application status.' });
      const application = await store.updateApplication(req.params.id, { status });
      if (!application) return res.status(404).json({ error: 'Application not found.' });
      res.json({ application });
    } catch (error) { next(error); }
  });

  app.delete('/api/applications/:id', async (req, res, next) => {
    try {
      const deleted = await store.deleteApplication(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Application not found.' });
      res.status(204).end();
    } catch (error) { next(error); }
  });

  app.post('/api/resume/analyze', async (req, res, next) => {
    try {
      const { resumeText, targetRole = 'Software Engineering Intern' } = req.body ?? {};
      if (typeof resumeText !== 'string' || resumeText.trim().length < 80) {
        return res.status(400).json({ error: 'Paste at least 80 characters of resume text to get useful feedback.' });
      }
      if (typeof targetRole !== 'string' || !targetRole.trim()) return res.status(400).json({ error: 'Target role is required.' });
      const text = resumeText.trim().slice(0, 12000);
      if (process.env.GEMINI_API_KEY) {
        const result = await askGemini(
          'You are a practical career coach. Review the resume text for the target role. Return concise JSON with keys: score (integer 0-100), summary (string), strengths (array of strings), improvements (array of strings), keywords (array of strings), nextSteps (array of strings). Be honest, do not invent credentials, and do not claim certainty about ATS systems.',
          `Target role: ${targetRole.trim().slice(0, 160)}\nResume text:\n${text}`,
          geminiFetch
        );
        return res.json({ source: 'gemini', analysis: parseJsonResult(result) });
      }
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      const hasProjects = /project|built|developed|implemented/i.test(text);
      const hasMetrics = /\d+\s*(%|users|requests|hours|ms|seconds|\$)/i.test(text);
      const hasSkills = /skills|javascript|python|sql|react|node|java|typescript/i.test(text);
      const analysis = {
        score: Math.min(88, 48 + (hasProjects ? 12 : 0) + (hasMetrics ? 12 : 0) + (hasSkills ? 8 : 0) + (wordCount > 180 ? 8 : 0)),
        summary: 'This is a rule-based first-pass review. Add a Gemini API key to enable deeper AI feedback.',
        strengths: [hasProjects ? 'Project or implementation language is present.' : 'Use this space to highlight projects and what you built.', hasSkills ? 'Technical skills or relevant keywords were detected.' : 'Add a focused skills section for the target role.'],
        improvements: [hasMetrics ? 'Keep the measurable outcomes easy to find.' : 'Add measurable outcomes where truthful (users, time saved, test coverage, or performance).', wordCount < 180 ? 'Consider adding more evidence of impact, projects, and relevant experience.' : 'Tailor the first third of the resume to the target role.'],
        keywords: [...new Set((text.match(/\b(JavaScript|TypeScript|Python|SQL|React|Node\.js|Java|REST API|Git|testing|AWS|Docker)\b/gi) || []).map((word) => word.toLowerCase()))].slice(0, 10),
        nextSteps: ['Match two project bullets to requirements in the job description.', 'Start bullets with an action verb and explain the result.', 'Keep every claim accurate and ready to discuss in an interview.']
      };
      res.json({ source: 'rules-based-demo', analysis });
    } catch (error) { next(error); }
  });

  app.post('/api/resume/match', async (req, res, next) => {
    try {
      const { resumeText, jobDescription, targetRole = 'Software Engineering Intern' } = req.body ?? {};
      if (typeof resumeText !== 'string' || resumeText.trim().length < 80) {
        return res.status(400).json({ error: 'Paste at least 80 characters of resume text.' });
      }
      if (typeof jobDescription !== 'string' || jobDescription.trim().length < 80) {
        return res.status(400).json({ error: 'Paste at least 80 characters from the job description.' });
      }
      if (typeof targetRole !== 'string' || !targetRole.trim() || targetRole.trim().length > 160) {
        return res.status(400).json({ error: 'Target role must be between 1 and 160 characters.' });
      }

      const resume = resumeText.trim().slice(0, 12000);
      const description = jobDescription.trim().slice(0, 12000);
      const role = targetRole.trim();
      if (process.env.GEMINI_API_KEY) {
        const result = await askGemini(
          'You are a rigorous career coach. Compare the supplied resume with the supplied job description for the target role. Return only valid JSON with keys: alignmentScore (integer 0-100), summary (string), matchedRequirements (array of strings), missingRequirements (array of strings), evidenceGaps (array of strings), tailoringSuggestions (array of strings), nextSteps (array of strings). Score only the evidence visible in the resume against the stated requirements; this is a rough guidance estimate, not an ATS score or hiring prediction. Do not assume a missing skill means the person lacks it. Never invent qualifications, projects, employers, metrics, or experience. Suggest adding a keyword only if the candidate can honestly support it. Keep each array to at most 8 concise items.',
          `Target role: ${role}\nResume text:\n${resume}\n\nJob description:\n${description}`,
          geminiFetch
        );
        return res.json({ source: 'gemini', analysis: parseJobMatchResult(result) });
      }
      return res.json({ source: 'rules-based-demo', analysis: buildRuleBasedMatch(resume, description) });
    } catch (error) { next(error); }
  });

  app.post('/api/resume/tailor', async (req, res, next) => {
    try {
      const { resumeText, jobDescription, targetRole = 'Software Engineering Intern', company = 'Hiring Team' } = req.body ?? {};
      if (typeof resumeText !== 'string' || resumeText.trim().length < 80) {
        return res.status(400).json({ error: 'Paste at least 80 characters of resume text.' });
      }
      if (typeof jobDescription !== 'string' || jobDescription.trim().length < 80) {
        return res.status(400).json({ error: 'Paste at least 80 characters from the job description.' });
      }
      if (typeof targetRole !== 'string' || !targetRole.trim() || targetRole.trim().length > 160) {
        return res.status(400).json({ error: 'Target role must be between 1 and 160 characters.' });
      }
      if (typeof company !== 'string' || company.trim().length > 120) {
        return res.status(400).json({ error: 'Company name must be text with at most 120 characters.' });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: 'AI drafting is not configured. Add GEMINI_API_KEY to the server environment to generate tailored bullets and a cover letter.' });
      }

      const result = await askGemini(
        'You are a careful job-application writing coach. Return only valid JSON with keys: professionalSummary (string), rewrittenBullets (array of strings), coverLetter (string), truthCheck (array of strings), followUpQuestions (array of strings). Use only facts and experience explicitly present in the resume. Never invent employers, degrees, skills, project details, metrics, dates, certifications, or achievements. If the resume lacks evidence for a requirement, do not claim it; suggest an honest way to address the gap. Do not imply the candidate has already done work not shown in the resume. Use concise professional language, adapt wording to the job description, and use placeholders such as [Hiring Manager] only when details are missing. Keep the summary under 100 words, bullets to at most 6, truthCheck to at most 6, followUpQuestions to at most 4, and the cover letter under 350 words.',
        `Target role: ${targetRole.trim()}\nCompany: ${company.trim() || 'Hiring Team'}\nResume text:\n${resumeText.trim().slice(0, 12000)}\n\nJob description:\n${jobDescription.trim().slice(0, 12000)}`,
        geminiFetch
      );
      res.json({ source: 'gemini', draft: parseTailorResult(result) });
    } catch (error) { next(error); }
  });

  app.post('/api/agent/plan', (req, res, next) => {
    try {
      const plan = planCareerTask(req.body ?? {});
      res.json(plan);
    } catch (error) { next(error); }
  });

  app.post('/api/assistant', async (req, res, next) => {
    try {
      const { message } = req.body ?? {};
      if (typeof message !== 'string' || !message.trim()) return res.status(400).json({ error: 'Enter a message first.' });
      if (message.length > 4000) return res.status(400).json({ error: 'Keep messages under 4,000 characters.' });
      if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'The AI assistant is not configured yet. Add GEMINI_API_KEY to your environment and restart the server. Resume review has a clearly labelled rules-based fallback.' });
      const answer = await askGemini(
        'You are AI Career Copilot, a supportive, candid career coach for job seekers and software engineering internship applicants. Give specific, actionable advice. Do not invent job listings, qualifications, or outcomes. If information is missing, ask a concise follow-up.',
        message.trim(),
        geminiFetch
      );
      res.json({ answer, source: 'gemini' });
    } catch (error) { next(error); }
  });

  app.get('/api/jobs', (_req, res) => {
    res.json({
      source: 'sample-data',
      notice: 'These are sample listings for demonstrating matching. They are not verified live vacancies.',
      jobs: [
        { id: 'sample-1', company: 'Northstar Labs', role: 'Software Engineering Intern', location: 'Remote · Canada', type: 'Internship', tags: ['JavaScript', 'React', 'APIs'], match: 92, reason: 'Good fit for a portfolio with full-stack features and tests.' },
        { id: 'sample-2', company: 'Maple Systems', role: 'Junior Full-Stack Developer', location: 'Saskatoon, SK · Hybrid', type: 'Full-time', tags: ['Node.js', 'SQL', 'REST'], match: 84, reason: 'Relevant backend and database practice; review the experience requirements.' },
        { id: 'sample-3', company: 'Orbit Analytics', role: 'Developer Tools Intern', location: 'Remote · Canada', type: 'Internship', tags: ['Python', 'Git', 'Testing'], match: 79, reason: 'A strong option if you highlight automated tests and developer tooling.' }
      ]
    });
  });

  app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));
  app.use((error, _req, res, _next) => {
    if (error?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Request body contains invalid JSON.' });
    }
    if (error?.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Request body is too large.' });
    }

    const status = Number.isInteger(error?.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
    if (status >= 500) {
      console.error('Unhandled application error:', error?.name || 'Error');
      return res.status(status).json({ error: 'Something went wrong. Please try again.' });
    }
    return res.status(status).json({ error: error.message || 'Request could not be processed.' });
  });
  return app;
}

function isSafeHttpUrl(value) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol); }
  catch { return false; }
}

async function askGemini(systemInstruction, prompt, fetchImpl = fetch) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1200 }
      }),
      signal: AbortSignal.timeout(30000)
    });
  } catch (cause) {
    const timedOut = cause?.name === 'TimeoutError' || cause?.name === 'AbortError';
    const error = new Error(timedOut ? 'AI provider timed out.' : 'AI provider is unavailable.');
    error.status = timedOut ? 504 : 502;
    throw error;
  }
  if (!response.ok) {
    // Provider response bodies can contain sensitive request/account details; never log them.
    console.warn('Gemini request failed with HTTP status:', response.status);
    const error = new Error('AI provider request failed.');
    error.status = 502;
    throw error;
  }
  let data;
  try {
    data = await response.json();
  } catch {
    const error = new Error('AI provider returned an invalid response.');
    error.status = 502;
    throw error;
  }
  const answer = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
  if (!answer) {
    const error = new Error('AI provider returned an empty response.');
    error.status = 502;
    throw error;
  }
  return answer;
}

function createRateLimiter({ windowMs = 60_000, max = 20 } = {}) {
  const buckets = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    let bucket = buckets.get(key);
    if (!bucket || now - bucket.startedAt >= windowMs) {
      if (buckets.size >= 1000 && !buckets.has(key)) {
        for (const [candidate, value] of buckets) {
          if (now - value.startedAt >= windowMs) buckets.delete(candidate);
        }
        if (buckets.size >= 1000) {
          return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
        }
      }
      bucket = { startedAt: now, count: 0 };
      buckets.set(key, bucket);
    }
    if (bucket.count >= max) {
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }
    bucket.count += 1;
    return next();
  };
}

const jobKeywordCatalog = [
  'JavaScript', 'TypeScript', 'Python', 'SQL', 'React', 'Node.js', 'Express',
  'REST API', 'Git', 'GitHub', 'automated testing', 'CI/CD', 'Docker', 'AWS',
  'Azure', 'PostgreSQL', 'MongoDB', 'communication', 'collaboration', 'Agile',
  'problem solving', 'data analysis', 'Excel', 'Java', 'Linux', 'API',
  'debugging', 'HTML', 'CSS', 'machine learning', 'project management'
];

function normalizeKeyword(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function buildRuleBasedMatch(resume, description) {
  const normalizedResume = ` ${normalizeKeyword(resume)} `;
  const normalizedDescription = ` ${normalizeKeyword(description)} `;
  const mentioned = jobKeywordCatalog.filter((term) => normalizedDescription.includes(` ${normalizeKeyword(term)} `));
  const matchedRequirements = mentioned.filter((term) => normalizedResume.includes(` ${normalizeKeyword(term)} `));
  const missingRequirements = mentioned.filter((term) => !normalizedResume.includes(` ${normalizeKeyword(term)} `));
  const alignmentScore = mentioned.length ? Math.round((matchedRequirements.length / mentioned.length) * 100) : 0;
  return {
    alignmentScore,
    summary: mentioned.length
      ? `The resume text includes ${matchedRequirements.length} of ${mentioned.length} tracked keywords found in this job description.`
      : 'The job description did not contain terms from the built-in keyword list, so this first pass cannot estimate keyword coverage.',
    matchedRequirements,
    missingRequirements,
    evidenceGaps: missingRequirements.slice(0, 8).map((term) => `The pasted resume does not clearly mention ${term}; include it only if you have truthful, relevant evidence.`),
    tailoringSuggestions: [
      'Prioritize the projects and experience most relevant to the responsibilities in this description.',
      'Use the employer’s wording only where it accurately describes your skills and experience.',
      'For each important requirement, show evidence: what you built, the tools you used, and the result.'
    ],
    nextSteps: [
      'Review every missing keyword and decide whether you have real experience that supports it.',
      'Rewrite one or two relevant project bullets using accurate actions and outcomes.',
      'Prepare an interview example for each skill you choose to highlight.'
    ],
    note: 'This keyword coverage estimate is not an ATS score or a hiring prediction. Missing terms were not detected in the pasted resume; they do not prove you lack those skills.'
  };
}

function parseTailorResult(text) {
  const cleaned = text.replace(/^\`\`\`(?:json)?\s*/i, '').replace(/\s*\`\`\`$/, '');
  let result;
  try {
    result = JSON.parse(cleaned);
  } catch {
    const error = new Error('AI provider returned an invalid drafting response.');
    error.status = 502;
    throw error;
  }
  if (!result || typeof result !== 'object' || Array.isArray(result) || typeof result.coverLetter !== 'string' || !result.coverLetter.trim()) {
    const error = new Error('AI provider returned an incomplete drafting response.');
    error.status = 502;
    throw error;
  }
  const list = (value, max, length = 500) => Array.isArray(value) ? value.filter((item) => typeof item === 'string').map((item) => item.slice(0, length)).slice(0, max) : [];
  return {
    professionalSummary: typeof result.professionalSummary === 'string' ? result.professionalSummary.slice(0, 2000) : '',
    rewrittenBullets: list(result.rewrittenBullets, 6),
    coverLetter: result.coverLetter.slice(0, 6000),
    truthCheck: list(result.truthCheck, 6),
    followUpQuestions: list(result.followUpQuestions, 4)
  };
}

function parseJobMatchResult(text) {
  const cleaned = text.replace(/^\`\`\`(?:json)?\s*/i, '').replace(/\s*\`\`\`$/, '');
  let result;
  try {
    result = JSON.parse(cleaned);
  } catch {
    const error = new Error('AI provider returned an invalid job-match response.');
    error.status = 502;
    throw error;
  }
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    const error = new Error('AI provider returned an invalid job-match response.');
    error.status = 502;
    throw error;
  }
  const list = (value, max = 8) => Array.isArray(value) ? value.filter((item) => typeof item === 'string').map((item) => item.slice(0, 500)).slice(0, max) : [];
  return {
    alignmentScore: Math.max(0, Math.min(100, Number(result.alignmentScore) || 0)),
    summary: typeof result.summary === 'string' ? result.summary.slice(0, 2000) : '',
    matchedRequirements: list(result.matchedRequirements),
    missingRequirements: list(result.missingRequirements),
    evidenceGaps: list(result.evidenceGaps),
    tailoringSuggestions: list(result.tailoringSuggestions),
    nextSteps: list(result.nextSteps),
    note: 'This is an AI-generated evidence-alignment estimate, not an ATS score or a hiring prediction. Verify every suggestion before using it.'
  };
}

function parseJsonResult(text) {
  const cleaned = text.replace(/^\`\`\`(?:json)?\s*/i, '').replace(/\s*\`\`\`$/, '');
  try {
    const result = JSON.parse(cleaned);
    return {
      score: Math.max(0, Math.min(100, Number(result.score) || 0)),
      summary: String(result.summary || ''),
      strengths: Array.isArray(result.strengths) ? result.strengths.map(String).slice(0, 8) : [],
      improvements: Array.isArray(result.improvements) ? result.improvements.map(String).slice(0, 8) : [],
      keywords: Array.isArray(result.keywords) ? result.keywords.map(String).slice(0, 12) : [],
      nextSteps: Array.isArray(result.nextSteps) ? result.nextSteps.map(String).slice(0, 8) : []
    };
  } catch {
    return { score: 0, summary: text.slice(0, 2000), strengths: [], improvements: [], keywords: [], nextSteps: [] };
  }
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  const port = Number(process.env.PORT || 1295);
  const app = createApp();
  app.listen(port, () => console.log(`AI Career Copilot server started on port ${port}`));
}
