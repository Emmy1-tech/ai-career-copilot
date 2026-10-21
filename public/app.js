const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = { applications: [], jobs: [], questionIndex: 0, answers: {} };
const questions = [
  { title: "Tell me about a project you're proud of.", tip: "Explain the problem, what you personally built, the decisions you made, and the result." },
  { title: "How do you approach a bug you can't immediately reproduce?", tip: "Talk through how you gather evidence, isolate variables, form hypotheses, and verify the fix with tests." },
  { title: "Tell me about a time you had to collaborate to solve a problem.", tip: "Show how you communicated, handled different perspectives, and helped the team reach a result." },
  { title: "Why are you interested in this role and team?", tip: "Connect the team's work to your interests and support your answer with specific evidence from your projects or learning." }
];
let toastTimer;
function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 2800);
}
async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) } });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed. Please try again.');
  return data;
}
function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function dateLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Recently' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function setPage(name) {
  const valid = ['overview', 'resume', 'jobs', 'applications', 'interview', 'assistant'];
  const page = valid.includes(name) ? name : 'overview';
  $$('.page').forEach((node) => node.classList.toggle('active', node.id === `page-${page}`));
  $$('.nav-link').forEach((node) => node.classList.toggle('active', node.dataset.page === page));
  $('#crumb').textContent = ({ overview: 'Overview', resume: 'Resume studio', jobs: 'Job matches', applications: 'Applications', interview: 'Interview prep', assistant: 'AI career coach' })[page];
  $('#sidebar').classList.remove('open');
  history.replaceState(null, '', `#${page}`);
  if (page === 'jobs') loadJobs();
  if (page === 'applications') loadApplications();
  if (page === 'overview') loadDashboard();
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}
function bindNavigation() {
  $$('[data-page]').forEach((node) => node.addEventListener('click', (event) => {
    event.preventDefault();
    setPage(node.dataset.page);
  }));
  $$('.nav-link').forEach((node) => node.addEventListener('click', (event) => {
    event.preventDefault();
    setPage(node.dataset.page);
  }));
  $('#menuToggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  $$('[data-toast]').forEach((node) => node.addEventListener('click', () => toast(node.dataset.toast)));
  window.addEventListener('hashchange', () => setPage(location.hash.slice(1)));
}
async function loadDashboard() {
  try {
    const data = await api('/api/dashboard');
    $('#statApplications').textContent = data.stats.applications;
    $('#statInterviews').textContent = data.stats.interviews;
    $('#statOffers').textContent = data.stats.offers;
    renderRecent(data.recentApplications);
  } catch {
    renderRecent([]);
    toast('Could not load dashboard. Check that the server is running.');
  }
}
function renderRecent(items) {
  const host = $('#recentApplications');
  if (!items.length) {
    host.innerHTML = '<div class="empty-state"><span>▣</span><strong>Your story starts with a first step.</strong><p>Add an application to keep your search organized.</p><button class="button button-outline" data-page="applications">Add an application</button></div>';
    const button = $('[data-page="applications"]', host);
    if (button) button.addEventListener('click', (event) => { event.preventDefault(); setPage('applications'); $('#applicationFormWrap').hidden = false; });
    return;
  }
  host.innerHTML = items.map((item) => `<div class="focus-item"><span class="focus-number">↗</span><div><strong>${escapeHtml(item.company)}</strong><p>${escapeHtml(item.role)} · ${escapeHtml(item.status)}</p><a href="#applications" data-open-apps>View pipeline →</a></div></div>`).join('');
  $$('[data-open-apps]', host).forEach((node) => node.addEventListener('click', (event) => { event.preventDefault(); setPage('applications'); }));
}
async function loadApplications() {
  const rows = $('#applicationRows');
  rows.innerHTML = '<tr><td colspan="4" class="table-empty">Loading your applications…</td></tr>';
  try {
    const data = await api('/api/applications');
    state.applications = data.applications;
    renderApplications();
  } catch (error) {
    rows.innerHTML = `<tr><td colspan="4" class="table-empty error-message">${escapeHtml(error.message)}</td></tr>`;
  }
}
function renderApplications() {
  const filter = $('#applicationFilter').value;
  const items = state.applications.filter((item) => filter === 'all' || item.status === filter);
  $('#applicationCount').textContent = state.applications.length;
  $('#applicationProgress').textContent = state.applications.filter((item) => ['Applied', 'Interview'].includes(item.status)).length;
  $('#applicationInterviews').textContent = state.applications.filter((item) => item.status === 'Interview').length;
  const rows = $('#applicationRows');
  if (!items.length) {
    rows.innerHTML = '<tr><td colspan="4" class="table-empty">No applications here yet. Add one to start tracking your progress.</td></tr>';
    return;
  }
  rows.innerHTML = items.map((item) => `<tr><td><strong>${escapeHtml(item.company)}</strong><small>${escapeHtml(item.role)}${item.location ? ' · ' + escapeHtml(item.location) : ''}</small></td><td><select class="status-select" data-status="${escapeHtml(item.status)}" data-update-id="${escapeHtml(item.id)}" aria-label="Change status for ${escapeHtml(item.company)}">${['Saved', 'Applied', 'Interview', 'Offer', 'Rejected'].map((status) => `<option ${status === item.status ? 'selected' : ''}>${status}</option>`).join('')}</select></td><td>${dateLabel(item.createdAt)}</td><td><button class="delete-btn" data-delete-id="${escapeHtml(item.id)}" aria-label="Delete application for ${escapeHtml(item.company)}">×</button></td></tr>`).join('');
  $$('[data-update-id]', rows).forEach((select) => select.addEventListener('change', async () => {
    try {
      await api(`/api/applications/${encodeURIComponent(select.dataset.updateId)}`, { method: 'PATCH', body: JSON.stringify({ status: select.value }) });
      toast('Application status updated.');
      await loadApplications();
      await loadDashboard();
    } catch (error) { toast(error.message); }
  }));
  $$('[data-delete-id]', rows).forEach((button) => button.addEventListener('click', async () => {
    if (!confirm('Delete this application from your tracker?')) return;
    try {
      await api(`/api/applications/${encodeURIComponent(button.dataset.deleteId)}`, { method: 'DELETE' });
      toast('Application deleted.');
      await loadApplications();
      await loadDashboard();
    } catch (error) { toast(error.message); }
  }));
}
function initApplications() {
  $('#showApplicationForm').addEventListener('click', () => { $('#applicationFormWrap').hidden = false; $('#company').focus(); });
  $('#closeApplicationForm').addEventListener('click', () => { $('#applicationFormWrap').hidden = true; });
  $('#applicationFilter').addEventListener('change', renderApplications);
  $('#applicationForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      await api('/api/applications', { method: 'POST', body: JSON.stringify(payload) });
      event.currentTarget.reset();
      $('#applicationFormWrap').hidden = true;
      toast('Application saved to your tracker.');
      await loadApplications();
      await loadDashboard();
    } catch (error) { toast(error.message); }
  });
}
async function initResume() {
  $('#resumeForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = $('button[type="submit"]', event.currentTarget);
    const original = button.innerHTML;
    button.disabled = true; button.textContent = 'Reviewing…';
    $('#resumeResults').innerHTML = '<div class="results-placeholder"><div class="placeholder-icon">✧</div><h3>Looking for useful signals…</h3><p>Checking the content you shared.</p></div>';
    try {
      const data = await api('/api/resume/analyze', { method: 'POST', body: JSON.stringify({ resumeText: $('#resumeText').value, targetRole: $('#targetRole').value }) });
      const a = data.analysis;
      $('#resumeResults').innerHTML = `<div><span class="result-label">${data.source === 'gemini' ? 'AI-POWERED REVIEW' : 'RULES-BASED FIRST PASS'}</span><div class="analysis-score"><div class="score-circle">${Number(a.score) || 0}</div><div><h3>Resume snapshot</h3><p>${escapeHtml(a.summary)}</p></div></div><div class="analysis-section"><h4>What's working</h4><ul>${(a.strengths || []).map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div><div class="analysis-section"><h4>Opportunities to improve</h4><ul>${(a.improvements || []).map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div><div class="analysis-section"><h4>Detected keywords</h4><div class="keyword-list">${(a.keywords || []).length ? a.keywords.map((x) => `<span class="keyword">${escapeHtml(x)}</span>`).join('') : '<span class="muted">No specific keywords detected yet.</span>'}</div></div><div class="analysis-section"><h4>Next steps</h4><ul>${(a.nextSteps || []).map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div></div>`;
      if (data.source !== 'gemini') toast('Showing clearly labelled rules-based feedback. Configure Gemini for AI review.');
    } catch (error) {
      $('#resumeResults').innerHTML = `<div class="results-placeholder"><div class="placeholder-icon">!</div><h3>Review couldn't finish</h3><p>${escapeHtml(error.message)}</p></div>`;
    } finally { button.disabled = false; button.innerHTML = original; }
  });

  $('#jobMatchForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const resumeText = $('#resumeText').value.trim();
    if (resumeText.length < 80) {
      $('#jobMatchResults').innerHTML = '<div class="results-placeholder"><h3>Add your resume first</h3><p>Paste at least 80 characters into the Resume text field above, then compare it with the job description.</p></div>';
      toast('Add your resume text before matching a job.');
      return;
    }
    const button = $('button[type="submit"]', event.currentTarget);
    const original = button.innerHTML;
    button.disabled = true; button.textContent = 'Comparing…';
    $('#jobMatchResults').innerHTML = '<div class="results-placeholder"><div class="placeholder-icon">↔</div><h3>Comparing the requirements…</h3><p>Looking for evidence in your resume and relevant terms in the job posting.</p></div>';
    try {
      const data = await api('/api/resume/match', { method: 'POST', body: JSON.stringify({ resumeText, targetRole: $('#targetRole').value, jobDescription: $('#jobDescription').value }) });
      const a = data.analysis;
      const renderList = (items) => items?.length ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join('') : '<li>No items detected in this first pass.</li>';
      $('#jobMatchResults').innerHTML = `<div><span class="result-label">${data.source === 'gemini' ? 'AI-POWERED COMPARISON' : 'RULES-BASED KEYWORD CHECK'}</span><div class="analysis-score"><div class="score-circle">${Number(a.alignmentScore) || 0}%</div><div><h3>Evidence alignment</h3><p>${escapeHtml(a.summary)}</p></div></div><p class="form-hint">${escapeHtml(a.note)}</p><div class="analysis-section"><h4>Requirements mentioned in your resume</h4><ul>${renderList(a.matchedRequirements)}</ul></div><div class="analysis-section"><h4>Requirements not detected</h4><ul>${renderList(a.missingRequirements)}</ul></div><div class="analysis-section"><h4>Evidence gaps to review</h4><ul>${renderList(a.evidenceGaps)}</ul></div><div class="analysis-section"><h4>Honest tailoring suggestions</h4><ul>${renderList(a.tailoringSuggestions)}</ul></div><div class="analysis-section"><h4>Next steps</h4><ul>${renderList(a.nextSteps)}</ul></div></div>`;
      if (data.source !== 'gemini') toast('This is a keyword-based first pass, not an ATS score or hiring prediction.');
    } catch (error) {
      $('#jobMatchResults').innerHTML = `<div class="results-placeholder"><div class="placeholder-icon">!</div><h3>Comparison couldn't finish</h3><p>${escapeHtml(error.message)}</p></div>`;
    } finally { button.disabled = false; button.innerHTML = original; }
  });

  $('#tailorButton').addEventListener('click', async () => {
    const resumeText = $('#resumeText').value.trim();
    const jobDescription = $('#jobDescription').value.trim();
    if (resumeText.length < 80 || jobDescription.length < 80) {
      $('#tailorResults').hidden = false;
      $('#tailorResults').innerHTML = '<div class="results-placeholder"><h3>Resume and job description needed</h3><p>Add at least 80 characters in both fields before drafting.</p></div>';
      toast('Add your resume and job description first.');
      return;
    }
    const button = $('#tailorButton');
    const original = button.innerHTML;
    button.disabled = true; button.textContent = 'Drafting…';
    $('#tailorResults').hidden = false;
    $('#tailorResults').innerHTML = '<div class="results-placeholder"><div class="placeholder-icon">✧</div><h3>Preparing your draft…</h3><p>Using only the evidence in your resume and the requirements you supplied.</p></div>';
    try {
      const data = await api('/api/resume/tailor', {
        method: 'POST',
        body: JSON.stringify({
          resumeText,
          jobDescription,
          targetRole: $('#targetRole').value,
          company: $('#targetCompany').value
        })
      });
      const draft = data.draft;
      const renderList = (items) => items?.length ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join('') : '<li>No items returned.</li>';
      $('#tailorResults').innerHTML = `<div><span class="result-label">AI-GENERATED DRAFT · REVIEW BEFORE USING</span><div class="analysis-section"><h4>Professional summary draft</h4><p style="white-space:pre-wrap">${escapeHtml(draft.professionalSummary)}</p></div><div class="analysis-section"><h4>Tailored resume bullets</h4><ul>${renderList(draft.rewrittenBullets)}</ul></div><div class="analysis-section"><h4>Cover letter draft</h4><p style="white-space:pre-wrap">${escapeHtml(draft.coverLetter)}</p></div><div class="analysis-section"><h4>Truth check before submitting</h4><ul>${renderList(draft.truthCheck)}</ul></div><div class="analysis-section"><h4>Questions to strengthen the application</h4><ul>${renderList(draft.followUpQuestions)}</ul></div></div>`;
    } catch (error) {
      $('#tailorResults').innerHTML = `<div class="results-placeholder"><div class="placeholder-icon">!</div><h3>Draft couldn't finish</h3><p>${escapeHtml(error.message)}</p></div>`;
    } finally { button.disabled = false; button.innerHTML = original; }
  });
}
async function loadJobs() {
  if (state.jobs.length) return renderJobs();
  try {
    const data = await api('/api/jobs');
    state.jobs = data.jobs;
    renderJobs();
  } catch (error) { $('#jobsList').innerHTML = `<div class="panel error-message">${escapeHtml(error.message)}</div>`; }
}
function renderJobs() {
  const query = $('#jobSearch').value.trim().toLowerCase();
  const type = $('#jobType').value;
  const items = state.jobs.filter((job) => (type === 'all' || job.type === type) && [job.role, job.company, job.location, ...(job.tags || [])].join(' ').toLowerCase().includes(query));
  $('#jobsList').innerHTML = items.length ? items.map((job) => `<article class="job-card"><div class="company-mark">${escapeHtml(job.company.slice(0, 1))}</div><div class="job-main"><h3>${escapeHtml(job.role)}</h3><div class="job-meta">${escapeHtml(job.company)} · ${escapeHtml(job.location)} · ${escapeHtml(job.type)}</div><div class="job-tags">${job.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div><div class="job-meta" style="margin-top:8px">${escapeHtml(job.reason)}</div></div><div class="match-score"><strong>${job.match}%</strong><small>demo fit</small></div><div class="job-actions"><button class="button button-primary" data-save-job="${escapeHtml(job.id)}">Track role</button></div></article>`).join('') : '<div class="panel empty-list">No sample roles match that search. Try another keyword.</div>';
  $$('[data-save-job]').forEach((button) => button.addEventListener('click', async () => {
    const job = state.jobs.find((item) => item.id === button.dataset.saveJob);
    if (!job) return;
    try {
      await api('/api/applications', { method: 'POST', body: JSON.stringify({ company: job.company, role: job.role, status: 'Saved', location: job.location }) });
      toast('Role added to your application tracker.');
      await loadDashboard();
      button.textContent = 'Added ✓'; button.disabled = true;
    } catch (error) { toast(error.message); }
  }));
}
function initJobs() {
  $('#jobSearch').addEventListener('input', renderJobs);
  $('#jobType').addEventListener('change', renderJobs);
}
function initInterview() {
  const setQuestion = (index) => {
    state.questionIndex = index;
    $('#interviewQuestion').textContent = questions[index].title;
    $('#interviewTip').textContent = questions[index].tip;
    $('#interviewAnswer').value = state.answers[index] || '';
    $$('.question-choice').forEach((node) => node.classList.toggle('selected', Number(node.dataset.question) === index));
    $('#interviewFeedback').textContent = 'Take a moment to structure your answer before you speak.';
  };
  $$('.question-choice').forEach((node) => node.addEventListener('click', () => setQuestion(Number(node.dataset.question))));
  $('#nextQuestion').addEventListener('click', () => { state.answers[state.questionIndex] = $('#interviewAnswer').value; setQuestion((state.questionIndex + 1) % questions.length); });
  $('#saveAnswer').addEventListener('click', () => {
    state.answers[state.questionIndex] = $('#interviewAnswer').value;
    $('#interviewFeedback').textContent = state.answers[state.questionIndex].trim() ? 'Notes saved in this page session. Copy them somewhere permanent if you need them later.' : 'Add a few notes first, then save them.';
    toast('Practice notes saved for this session.');
  });
}
function appendMessage(role, message, meta = '') {
  const host = $('#chatMessages');
  const node = document.createElement('div');
  node.className = `chat-message ${role === 'user' ? 'user-message' : 'assistant-message'}`;
  const avatar = document.createElement('div');
  avatar.className = 'chat-avatar';
  avatar.textContent = role === 'user' ? 'Y' : '✧';
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  const p = document.createElement('p'); p.textContent = message;
  const small = document.createElement('small'); small.textContent = meta || (role === 'user' ? 'You' : 'Career Copilot');
  bubble.append(p, small); node.append(avatar, bubble); host.append(node); host.scrollTop = host.scrollHeight;
}
function initAssistant() {
  $$('.suggestion-chip').forEach((button) => button.addEventListener('click', () => { $('#assistantInput').value = button.dataset.prompt; $('#assistantInput').focus(); }));
  $('#assistantForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = $('#assistantInput');
    const message = input.value.trim();
    if (!message) return;
    input.value = '';
    $$('.suggestion-row').forEach((node) => node.remove());
    appendMessage('user', message);
    const host = $('#chatMessages');
    const typing = document.createElement('div'); typing.className = 'typing'; typing.textContent = 'Career Copilot is thinking…'; typing.id = 'typing'; host.append(typing); host.scrollTop = host.scrollHeight;
    const button = $('button[type="submit"]', event.currentTarget); button.disabled = true;
    try {
      const data = await api('/api/assistant', { method: 'POST', body: JSON.stringify({ message }) });
      appendMessage('assistant', data.answer, data.source === 'gemini' ? 'Career Copilot · Gemini' : 'Career Copilot');
    } catch (error) {
      appendMessage('assistant', error.message + (error.message.includes('not configured') ? ' For now, use the suggested prompts to frame your question, or configure the Gemini key on the backend.' : ''), 'Configuration / request notice');
    } finally { $('#typing')?.remove(); button.disabled = false; }
  });
}
function init() {
  $('#year').textContent = new Date().getFullYear();
  $('#todayDate').textContent = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  bindNavigation(); initApplications(); initResume(); initJobs(); initInterview(); initAssistant();
  loadDashboard();
  const initial = location.hash.slice(1);
  if (initial) setPage(initial);
}
document.addEventListener('DOMContentLoaded', init);