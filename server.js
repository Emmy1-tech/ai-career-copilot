import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from './src/store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp({ store = createStore() } = {}) {
  const app = express();
  app.disable('x-powered-by');
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
          `Target role: ${targetRole.trim().slice(0, 160)}\nResume text:\n${text}`
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

  app.post('/api/assistant', async (req, res, next) => {
    try {
      const { message } = req.body ?? {};
      if (typeof message !== 'string' || !message.trim()) return res.status(400).json({ error: 'Enter a message first.' });
      if (message.length > 4000) return res.status(400).json({ error: 'Keep messages under 4,000 characters.' });
      if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'The AI assistant is not configured yet. Add GEMINI_API_KEY to your environment and restart the server. Resume review has a clearly labelled rules-based fallback.' });
      const answer = await askGemini(
        'You are AI Career Copilot, a supportive, candid career coach for job seekers and software engineering internship applicants. Give specific, actionable advice. Do not invent job listings, qualifications, or outcomes. If information is missing, ask a concise follow-up.',
        message.trim()
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
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });
  return app;
}

function isSafeHttpUrl(value) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol); }
  catch { return false; }
}

async function askGemini(systemInstruction, prompt) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1200 }
    }),
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error('Gemini request failed:', response.status, detail.slice(0, 500));
    const error = new Error('AI provider request failed.');
    error.status = 502;
    throw error;
  }
  const data = await response.json();
  const answer = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
  if (!answer) throw new Error('AI provider returned an empty response.');
  return answer;
}

function parseJsonResult(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
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
  const port = Number(process.env.PORT || 3000);
  const app = createApp();
  app.listen(port, () => console.log(`AI Career Copilot running on http://localhost:${port}`));
}
