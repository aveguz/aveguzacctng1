import { SUPABASE_URL, supabaseHeaders } from './supabase-config.js';

const sessionKey = 'acctng1_session';

export function getSession() {
  try {
    const stored = localStorage.getItem(sessionKey) || sessionStorage.getItem(sessionKey);
    if (stored && !localStorage.getItem(sessionKey)) localStorage.setItem(sessionKey, stored);
    return JSON.parse(stored || 'null');
  } catch { return null; }
}

export function saveSession(session) {
  localStorage.setItem(sessionKey, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(sessionKey);
  sessionStorage.removeItem(sessionKey);
}

export async function request(path, options = {}, accessToken) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: { ...supabaseHeaders(accessToken), ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error_description || body.error || 'Request could not be completed.');
  return body;
}

export async function requireUser() {
  const session = getSession();
  if (!session?.access_token) return null;
  try {
    return await request('/auth/v1/user', { method: 'GET' }, session.access_token);
  } catch {
    clearSession();
    return null;
  }
}

const currentPage = location.pathname.split('/').pop();
if (currentPage === 'dashboard.html' || currentPage === 'profile.html') {
  import('./nav-sync.js').then(({ syncNavigation }) => syncNavigation());
}