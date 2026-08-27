# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Ave Guzman ACCTNG 1 Learning Hub — a static learning site for Fundamentals of Accountancy, Business, and Management 1 (modules, activities, challenges), backed by Supabase for auth and scoring records. Deployed as plain files on GitHub Pages (`https://aveguz.github.io/aveguzacctng1/`).

## Commands

There is no build system, package manager, linter, or test suite. Each page is a self-contained HTML file with inline CSS/JS, so editing a file and reloading the browser is the whole dev loop.

```bash
python3 -m http.server 8000   # then open http://localhost:8000/index.html
```

Serve over HTTP, not `file://` — every page uses native ES modules (`<script type="module">`), which are blocked on the `file:` protocol.

Database changes go in `supabase/migrations/` as timestamped SQL (`YYYYMMDD_description.sql`) and are applied against the hosted project; there is no local Supabase stack in the repo.

## Architecture

### Supabase without a client library

There is no `supabase-js`. `supabase-config.js` holds the project URL and publishable key, and `auth.js` wraps `fetch` against the Supabase REST/Auth endpoints directly. All data access goes through `request(path, options, accessToken)` from [auth.js](auth.js) — paths are raw PostgREST/GoTrue URLs (`/rest/v1/activity_attempts?...`, `/auth/v1/token?grant_type=password`).

Sessions are stored under the `acctng1_session` localStorage key. Server tables in use: `profiles`, `activity_attempts`, `challenge_attempts`, `module_progress`. Registration posts to the `register-student` Edge Function (`/functions/v1/register-student`), whose source is **not** in this repo.

### Page protection is a side effect of importing auth.js

Importing `./auth.js` anywhere on a page arms the auth gate: on import it hides `<body>` via an `html.auth-pending` style, then `protectPage()` validates the session and either reveals the body or redirects to `login.html?redirect=<current url>`. `login.html` and `register.html` are the only public pages (`publicPages` in [auth.js](auth.js)).

This is why some pages contain a bare `import './auth.js';` with no other statements — that import *is* the protection. Any new content page must import `auth.js` (directly or via `nav-sync.js` / `module-progress.js`, which both import it).

### Navigation

[nav-sync.js](nav-sync.js) rewrites the contents of `.navlinks` / `.main-nav` from a single `links` array and appends a LOG IN / LOG OUT link based on session state. `auth.js` auto-imports it for `dashboard.html` and `profile.html`; other pages import it explicitly. Add new top-level pages to the `links` array there, not to each page's markup.

### Module progress tracking

Module pages attach `<script type="module" src="module-progress.js" data-module-id="NN">`. The `data-module-id` attribute is decorative — [module-progress.js](module-progress.js) derives the module id from the `moduleNN.html` filename.

Each module page is a single document of `.screen` sections with a local `showScreen(id)` that toggles `.active`. The contract with `module-progress.js` is event-based:

- `showScreen()` dispatches `module-progress-screen` with `{ detail: { screen: id } }`
- the final screen also dispatches `module-progress-complete`
- `showScreen` must be exposed on `window` so progress can restore the last screen on reload

Progress is written to `acctng1_module_progress_<id>` in localStorage first, then upserted into `module_progress` (SELECT, then PATCH or POST — `first_opened_at` and `completed_at` are never overwritten once set). Sync failures only `console.warn`; local progress still stands.

### Activity and challenge attempts: two scripts per page

Activity/challenge pages carry two script blocks that talk through `window`:

1. a classic `<script>` with all the exercise logic (grading, rendering, timers), which calls `window.recordActivityAttempt(payload)` on completion
2. a `<script type="module">` that imports `auth.js` and does the Supabase sync

The sync is write-behind and idempotent-on-retry: `recordActivityAttempt` stores the payload under a `*_pending_*_attempt` localStorage key, then attempts the POST and removes the key on success. The module block also calls the sync function on load, so an attempt completed while signed out or offline is flushed on the next visit. Tracking status is surfaced through a `#trackingStatus` element, never thrown.

Each activity page is a set of sibling `<section>` screens under `<main>` — `#startScreen`, `#activityScreen`, and the summary/review screens — toggled by adding/removing `hidden` (`display:none!important`). **The summary screen must stay a sibling of `#activityScreen`, never a descendant**: `showSummary()` hides `#activityScreen` and unhides the summary in the same breath, so nesting the two makes the summary silently unrenderable while every field still populates and the function still returns `true`. A dropped `</section>` caused exactly that in `activity07-2.html`. When editing these screens, re-check tag balance — the pages are single-line HTML where a missing close tag is invisible in review.

Attempt rows carry denormalized student names (`getStudentNames()` reads `profiles` and maps `middle_initial` → `middle_name`), plus a free-form `details` JSON column.

### Attempt codes chain the accounting records flow

Each completed activity mints a random human-readable code — `GJ-` (06.1 General Journal), `GL-` (07.1 T-format ledger), `RGL-` (07.2 running-balance ledger) — stored as `details.attempt_code`. Downstream activities record `details.source_journal_attempt_code` pointing back at the journal they posted from.

The dashboard's "Accounting Records Flow" table is built entirely from that link: it groups 06.1 attempts, then finds the latest 07.1 / 07.2 attempt whose `source_journal_attempt_code` matches, and builds deep links like `activity07-2.html?journal=GJ-XXXXXX&ledger=RGL-XXXXXX&view=ledger`. Activity pages read those query params (`journal`, `ledger`, `view=ledger`) to reopen a completed record in review mode.

Full work snapshots are persisted in `details` (`general_journal_snapshot`, `running_ledger_snapshot`) so review works on any device; localStorage caches (`power_laundry_*`) are only a fast path, and the dashboard rehydrates some of them when it renders. When adding a step to the flow, keep both: write the snapshot into `details`, and make the review path fall back to the server when the local cache is missing.

### Styling

Most content pages inline their entire stylesheet in a `<style>` block and share no CSS. Only `login.html`, `register.html`, `profile.html`, and `dashboard.html` link [auth.css](auth.css) (the `--ink` / `--accent` teal token set). `styles.css` is a leftover blue-themed sheet that no page references.

## Conventions

- The site was built with GitHub Copilot, which is why inline JS formatting varies widely by file — some blocks are compacted to near-minified single lines, others are fully formatted. Match the surrounding block rather than reformatting it; reformatting produces unreadable diffs on these large single-file pages.
- User-supplied and database values are interpolated into `innerHTML` through a local `escapeHtml` helper that each page redefines. Keep using it for any new interpolation.
- Errors from `request()` surface as messages in a `.notice` / `.feedback` element (`notice.className = 'notice show error'`); pages do not throw to the console for user-facing failures.
- Commit messages are short imperative summaries ("Track running ledger completions", "Fix accounting records flow rendering").
