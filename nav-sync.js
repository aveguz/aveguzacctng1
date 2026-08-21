import { clearSession, getSession, requireUser, request } from './auth.js';

const links = [
  ['HOME', 'index.html'],
  ['MODULES', 'modules.html'],
  ['ACTIVITIES', 'activities.html'],
  ['CHALLENGES', 'challenges.html'],
  ['DASHBOARD', 'dashboard.html'],
  ['PROFILE', 'profile.html']
];

function currentPage() {
  return location.pathname.split('/').pop() || 'index.html';
}

function render(host, signedIn) {
  const active = currentPage();
  host.replaceChildren();

  links.forEach(([label, href]) => {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = label;
    if (href === active) link.classList.add('active');
    host.append(link);
  });

  const accountLink = document.createElement('a');
  accountLink.href = signedIn ? '#' : 'login.html';
  accountLink.textContent = signedIn ? 'LOG OUT' : 'LOG IN';
  accountLink.addEventListener('click', async event => {
    if (!signedIn) return;
    event.preventDefault();
    try {
      await request('/auth/v1/logout', { method: 'POST' }, getSession()?.access_token);
    } finally {
      clearSession();
      location.href = 'index.html';
    }
  });
  host.append(accountLink);
}

export async function syncNavigation() {
  const host = document.querySelector('.navlinks, .main-nav');
  if (!host) return;
  render(host, Boolean(await requireUser()));
}