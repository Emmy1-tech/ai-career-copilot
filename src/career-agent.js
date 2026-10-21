const categories = new Set(['resume', 'job-search', 'interview', 'portfolio', 'general']);

const playbooks = {
  resume: [
    'Choose the target role and collect its requirements.',
    'Compare the resume with the role requirements using only evidence that is actually present.',
    'Rewrite the most relevant bullets to show action, tools, and truthful outcomes.',
    'Check spelling, consistency, and keyword coverage without inventing experience.'
  ],
  'job-search': [
    'Define target titles, locations, work authorization constraints, and preferred work mode.',
    'Find current openings from verifiable sources and record each source and date checked.',
    'Compare requirements with documented skills and projects.',
    'Prioritize suitable roles and track each application status.'
  ],
  interview: [
    'Identify the role and likely technical and behavioral topics.',
    'Prepare concise STAR examples based on real experience.',
    'Practice one technical question and explain the reasoning aloud.',
    'Review gaps and repeat the weakest answer.'
  ],
  portfolio: [
    'Choose one project that demonstrates the target role’s core skills.',
    'Write down the user problem, architecture, and key trade-offs.',
    'Run the project checks and record only verified results.',
    'Improve the README with setup steps, screenshots, tests, and known limitations.'
  ],
  general: [
    'Define the intended outcome and deadline.',
    'List the information and evidence needed to make progress.',
    'Break the goal into small, verifiable actions.',
    'Review the result and update the next steps.'
  ]
};

export function planCareerTask({ goal, category = 'general' } = {}) {
  if (typeof goal !== 'string' || !goal.trim()) {
    const error = new Error('Enter a goal for the career agent.');
    error.status = 400;
    throw error;
  }
  if (goal.trim().length > 1000) {
    const error = new Error('Keep the goal under 1,000 characters.');
    error.status = 400;
    throw error;
  }
  if (typeof category !== 'string' || !categories.has(category)) {
    const error = new Error('Choose a supported category: resume, job-search, interview, portfolio, or general.');
    error.status = 400;
    throw error;
  }

  return {
    agent: 'career-planner-v1',
    goal: goal.trim(),
    category,
    mode: 'plan-only',
    steps: playbooks[category].map((title, index) => ({
      id: index + 1,
      title,
      status: 'pending'
    })),
    safetyNote: 'This is a suggested plan only. No applications, messages, or external actions have been performed.'
  };
}
