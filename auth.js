import { SUPABASE_URL, supabaseHeaders } from './supabase-config.js';

const sessionKey = 'acctng1_session';
const publicPages = new Set(['login.html', 'register.html']);
const currentPage = location.pathname.split('/').pop() || 'index.html';

if (!publicPages.has(currentPage)) {
  document.documentElement.classList.add('auth-pending');
  const authStyle = document.createElement('style');
  authStyle.textContent = 'html.auth-pending body{visibility:hidden}';
  document.head.append(authStyle);
}

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

export async function protectPage() {
  if (publicPages.has(currentPage)) return null;

  const user = await requireUser();
  if (!user) {
    location.replace(`login.html?redirect=${encodeURIComponent(location.href)}`);
    return null;
  }

  document.documentElement.classList.remove('auth-pending');
  return user;
}

if (!publicPages.has(currentPage)) {
  protectPage();
}

if (currentPage === 'dashboard.html' || currentPage === 'profile.html') {
  import('./nav-sync.js').then(({ syncNavigation }) => syncNavigation());
}