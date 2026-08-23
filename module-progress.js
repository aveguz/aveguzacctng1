import { getSession, requireUser, request } from './auth.js';

const moduleId = location.pathname.match(/module(\d+)\.html$/i)?.[1];
const localKey = moduleId ? `acctng1_module_progress_${moduleId}` : null;

function loadLocalProgress() {
  try {
    return JSON.parse(localStorage.getItem(localKey) || '{}');
  } catch {
    return {};
  }
}

function saveLocalProgress(progress) {
  localStorage.setItem(localKey, JSON.stringify(progress));
}

async function syncProgress(progress) {
  const user = await requireUser();
  const session = getSession();
  if (!user || !session?.access_token) return;

  const filter = `user_id=eq.${encodeURIComponent(user.id)}&module_id=eq.${encodeURIComponent(moduleId)}`;
  const records = await request(
    `/rest/v1/module_progress?select=first_opened_at,completed_at&${filter}`,
    { method: 'GET' },
    session.access_token,
  );
  const record = records[0];
  const values = {
    first_opened_at: record?.first_opened_at || progress.openedAt,
    last_opened_at: progress.lastOpenedAt,
    completed_at: record?.completed_at || progress.completedAt || null,
  };

  if (record) {
    await request(
      `/rest/v1/module_progress?${filter}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(values),
      },
      session.access_token,
    );
  } else {
    await request(
      '/rest/v1/module_progress',
      {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ user_id: user.id, module_id: moduleId, ...values }),
      },
      session.access_token,
    );
  }
}

async function track(completed = false) {
  if (!moduleId || !localKey) return;
  const now = new Date().toISOString();
  const progress = loadLocalProgress();
  progress.openedAt ||= now;
  progress.lastOpenedAt = now;
  if (completed) progress.completedAt ||= now;
  saveLocalProgress(progress);

  try {
    await syncProgress(progress);
  } catch (error) {
    console.warn('Module progress could not be synced.', error);
  }
}

window.addEventListener('module-progress-complete', () => track(true));
track();
