import { SUPABASE_URL, supabaseHeaders } from './supabase-config.js';

const sessionKey = 'acctng1_session';

export function getSession() {
  try { return JSON.parse(sessionStorage.getItem(sessionKey) || 'null'); } catch { return null; }
}

export function saveSession(session) {
  sessionStorage.setItem(sessionKey, JSON.stringify(session));
}

export function clearSession() {
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