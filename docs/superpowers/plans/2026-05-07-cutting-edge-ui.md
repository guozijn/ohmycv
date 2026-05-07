# Cutting-edge UI/UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [`docs/superpowers/specs/2026-05-07-cutting-edge-ui-design.md`](../specs/2026-05-07-cutting-edge-ui-design.md)

**Goal:** Redesign the OhMyCV homepage as an editorial Vermilion · Editorial landing page with the existing terminal restyled as the visual centerpiece, while preserving the LaTeX PDF build pipeline unchanged.

**Architecture:** Stay no-build. Single static page (`index.html`) loads JSON via fetch and renders with vanilla JS. Split the existing 760-line `home.js` into ES modules under `home/`. Reorganize `style.css` into CSS `@layer`s (tokens, base, landing, console, print, utilities). Add a Playwright smoke-test net before any change to detect regressions.

**Tech Stack:** HTML, CSS (with `@layer` and CSS custom properties), vanilla ES modules, Google Fonts (Geist, Geist Mono, Fraunces, conditionally Source Han Serif SC), Playwright for smoke tests, Python `http.server` as the local dev server.

---

## Commit policy (READ FIRST)

This repository's `CLAUDE.md` instructs agents not to commit, push, or open PRs without explicit user instruction. **Each task ends with a "Checkpoint" step that lists the suggested commit message but does NOT run `git commit`.** Wait for the user to tell you to commit (in batches or all at once). Until then, leave changes staged or unstaged as the user prefers.

After every code change, run the test suite and ensure it passes before declaring the task complete. Update `CHANGELOG.md` and (where relevant) `README.md` as part of the same task.

All documentation and code comments must be written in English. Do not use emoji anywhere in code or docs.

---

## File structure (target)

```
index.html                       # restructured shell: topbar, hero, console, selected, about, footer
style.css                        # single file, organized as CSS @layers
home.js                          # entry orchestrator, ≤ ~150 lines after split
home/                            # new directory
  config.js                      # config + i18n + manifest loaders (extracted from home.js)
  console.js                     # terminal command system + render (extracted from home.js)
  i18n.js                        # language toggle + CJK lazy-load
  render-topbar.js               # top bar with language toggle and CV link
  render-hero.js                 # hero block (name, tagline, meta line)
  render-selected.js             # selected cards with reveal-on-scroll
  render-about.js                # about paragraph
  render-footer.js               # contact + CV links + colophon
i18n/en.json                     # extended: homepage.tagline, homepage.meta, homepage.selected, homepage.colophon, profile.summary_emphasis
i18n/zh.json                     # extended with the same fields
package.json                     # NEW — minimal, devDependency: @playwright/test
playwright.config.js             # NEW — Chromium-only, auto-spawns http.server on :4173
tests/landing.spec.js            # NEW — smoke tests
CHANGELOG.md                     # NEW
README.md                        # updated: new i18n fields, Playwright commands, Lighthouse note
```

---

## Task 1: Set up Playwright + baseline smoke test against the CURRENT site

**Goal:** Lock in a regression net BEFORE any refactor or visual change. Tests at this stage assert the existing terminal homepage renders and works.

**Files:**
- Create: `package.json`
- Create: `playwright.config.js`
- Create: `tests/landing.spec.js`
- Create: `CHANGELOG.md`
- Modify: `.gitignore` (already includes `node_modules/`; verify)

- [ ] **Step 1.1: Create `package.json`**

```json
{
  "name": "ohmycv",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "python3 -m http.server 4173",
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "test:install": "playwright install chromium"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0"
  }
}
```

- [ ] **Step 1.2: Install dependencies**

Run:
```bash
npm install
npm run test:install
```

Expected: `node_modules/` populated, Chromium browser downloaded.

- [ ] **Step 1.3: Create `playwright.config.js`**

```javascript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: {
    command: 'python3 -m http.server 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 10_000
  }
});
```

- [ ] **Step 1.4: Write the baseline smoke test (asserts CURRENT behavior)**

Create `tests/landing.spec.js`:

```javascript
import { test, expect } from '@playwright/test';

test.describe('landing — baseline (current terminal homepage)', () => {
  test('terminal renders with prompt input', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.terminal-window')).toBeVisible();
    await expect(page.locator('#terminal-input')).toBeVisible();
    await expect(page.locator('#terminal-prompt')).toBeVisible();
  });

  test('terminal greeting renders', async ({ page }) => {
    await page.goto('/');
    // Greeting is rendered into #terminal-output by home.js after fetch resolves.
    await expect(page.locator('#terminal-output')).not.toBeEmpty();
  });

  test('whoami command produces a non-empty response', async ({ page }) => {
    await page.goto('/');
    await page.locator('#terminal-output').waitFor();
    const input = page.locator('#terminal-input');
    await input.click();
    await input.fill('whoami');
    await input.press('Enter');
    // Response is appended as a new entry in the output region.
    await expect(page.locator('#terminal-output')).toContainText(/[\w]/);
  });

  test('cv command exposes a downloadable PDF link', async ({ page }) => {
    await page.goto('/');
    const input = page.locator('#terminal-input');
    await input.click();
    await input.fill('cv');
    await input.press('Enter');
    const pdfLink = page.locator('#terminal-output a[href$=".pdf"]').first();
    await expect(pdfLink).toBeVisible();
    const href = await pdfLink.getAttribute('href');
    expect(href).toMatch(/\.pdf$/);
  });

  test('language toggle switches html lang', async ({ page }) => {
    await page.goto('/');
    await page.locator('#terminal-output').waitFor();
    const input = page.locator('#terminal-input');
    await input.click();
    await input.fill('zh');
    await input.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh');
    await input.click();
    await input.fill('en');
    await input.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});
```

Note: `home.js` defines a `lang` command (verify by grepping `commandHandlers` if uncertain). If the actual command name differs, replace `zh` / `en` in the input fills with whatever `home.js` uses today. Do NOT change `home.js` to make the test pass — adjust the test to today's reality.

- [ ] **Step 1.5: Run the tests against the unchanged site to verify they pass**

Run:
```bash
npx playwright test
```

Expected: 5 passed. If any fail, adjust the test to match current behavior — these baselines must reflect today before we change anything.

- [ ] **Step 1.6: Create `CHANGELOG.md`**

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Playwright smoke test suite (`tests/landing.spec.js`) covering hero, console, language toggle, and CV download.
```

- [ ] **Step 1.7: Verify `.gitignore` excludes Playwright artifacts**

```bash
grep -E "^(node_modules|test-results|playwright-report)/?$" .gitignore
```

Expected: at minimum `node_modules/` is present. If `test-results/` or `playwright-report/` are missing, append them:

```
test-results/
playwright-report/
```

- [ ] **Step 1.8: Checkpoint**

Stage: `package.json package-lock.json playwright.config.js tests/ CHANGELOG.md .gitignore`
Suggested commit message: `chore: add Playwright smoke tests and CHANGELOG`

---

## Task 2: Extract config/i18n/manifest loaders into `home/config.js`

**Goal:** Move the loading and merging logic out of the monolithic `home.js` into a focused module. No behavior change. Smoke tests must still pass.

**Files:**
- Create: `home/config.js`
- Modify: `home.js` (remove extracted code, add import)

- [ ] **Step 2.1: Create `home/config.js` with the extracted loaders**

The functions to move are (current line numbers in `home.js`, approximate):
- `getBasePath`, `withBasePath`, `toAbsoluteUrl`
- `loadLang`, `loadCvConfig`, `loadPdfManifest`
- `applyConfigOverrides`, `isPlainObject`, `mergeCvData`, `applyJobOverrides`
- `loadJobOverrides`, `getSelectedJobName`, `getCvPdfHref`
- `fetchJson`

Create `home/config.js`:

```javascript
export function getBasePath() {
  const basePath = document.body?.dataset?.basePath || '.';
  return basePath.replace(/\/$/, '');
}

export function withBasePath(path) {
  const base = getBasePath();
  const normalized = path.replace(/^\.\//, '');
  if (/^(mailto:|tel:|https?:\/\/)/i.test(normalized)) return normalized;
  if (/^https?:\/\//i.test(base)) {
    return new URL(normalized, `${base}/`).toString();
  }
  return `${base}/${normalized}`.replace(/([^:])\/{2,}/g, '$1/');
}

export function toAbsoluteUrl(value) {
  if (!value || /^(mailto:|tel:)/i.test(value)) return value;
  try {
    return new URL(value, window.location.href).toString();
  } catch {
    return value;
  }
}

export async function fetchJson(path) {
  const url = withBasePath(path);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

let _cvConfigPromise = null;
let _pdfManifestPromise = null;

export async function loadCvConfig() {
  if (!_cvConfigPromise) {
    _cvConfigPromise = Promise.all([
      fetchJson('config/cv.json'),
      fetchJson('config/local.json'),
      fetchJson('config/cv-jobs/main.json')
    ]).then(([shared, local, main]) => ({
      shared: shared || {},
      local,
      main
    }));
  }
  return _cvConfigPromise;
}

export async function loadPdfManifest() {
  if (!_pdfManifestPromise) {
    _pdfManifestPromise = fetchJson('cv/generated/manifest.json').then(
      (manifest) => manifest || {}
    );
  }
  return _pdfManifestPromise;
}

export function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function mergeCvData(base, overrides) {
  if (!isPlainObject(overrides)) return base;
  const merged = { ...base };
  Object.entries(overrides).forEach(([key, value]) => {
    if (isPlainObject(value) && isPlainObject(merged[key])) {
      merged[key] = mergeCvData(merged[key], value);
    } else {
      merged[key] = value;
    }
  });
  return merged;
}

export function applyConfigOverrides(dict, config, lang) {
  if (!config) return dict;
  const { languages, active_job, cv_job, job, ...globalOverrides } = config;
  const langOverrides = languages?.[lang] || {};
  return mergeCvData(mergeCvData(dict, globalOverrides), langOverrides);
}

export function applyJobOverrides(dict, overrides, lang) {
  if (!overrides) return dict;
  const { languages, ...globalOverrides } = overrides;
  const langOverrides = languages?.[lang] || overrides[lang] || {};
  return mergeCvData(mergeCvData(dict, globalOverrides), langOverrides);
}

export function getSelectedJobName(config) {
  const params = new URLSearchParams(window.location.search);
  return (
    params.get('job') ||
    window.CV_JOB ||
    document.body?.dataset?.job ||
    config.local?.active_job ||
    config.local?.cv_job ||
    config.local?.job ||
    config.shared?.active_job ||
    config.shared?.cv_job ||
    config.shared?.job ||
    ''
  ).trim();
}

export async function loadJobOverrides(config, lang) {
  const jobName = getSelectedJobName(config);
  if (!jobName) return null;
  const safe = /^[a-z0-9_-]+$/i.test(jobName) ? jobName : null;
  if (!safe) return null;
  const data = await fetchJson(`config/cv-jobs/${safe}.json`);
  return data || null;
}

export function getCvPdfHref(config, manifest, lang) {
  const jobName = getSelectedJobName(config) || 'main';
  const safeJobName = /^[a-z0-9_-]+$/i.test(jobName) ? jobName : 'main';
  const pdfPath = manifest?.jobs?.[safeJobName]?.[lang]?.pdf;
  return pdfPath ? withBasePath(pdfPath) : null;
}

export async function loadLang(lang) {
  const path = withBasePath(`i18n/${lang}.json`);
  const [res, config, manifest] = await Promise.all([
    fetch(path, { cache: 'no-store' }),
    loadCvConfig(),
    loadPdfManifest()
  ]);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  const dict = await res.json();
  const jobOverrides = await loadJobOverrides(config, lang);
  const sharedOverrides = applyConfigOverrides(dict, config.shared, lang);
  const mainOverrides = applyJobOverrides(sharedOverrides, config.main, lang);
  const merged = applyConfigOverrides(
    mergeCvData(mainOverrides, jobOverrides),
    config.local,
    lang
  );
  merged.__lang = lang;
  merged.__cv_pdf_href = getCvPdfHref(config, manifest, lang);
  merged.__cv_pdf_hrefs = {
    en: getCvPdfHref(config, manifest, 'en'),
    zh: getCvPdfHref(config, manifest, 'zh')
  };
  return merged;
}
```

**Important:** Open the current `home.js` and copy the actual implementations of any function above whose body you don't recognize. If a function body in the current `home.js` differs from what I show here (e.g. `loadJobOverrides` may have additional fallbacks), keep the existing behavior — only relocate, don't modify.

- [ ] **Step 2.2: Update `home.js` to import from the new module**

At the top of `home.js`, add:

```javascript
import {
  getBasePath,
  withBasePath,
  toAbsoluteUrl,
  fetchJson,
  loadLang,
  loadCvConfig,
  loadPdfManifest,
  applyConfigOverrides,
  applyJobOverrides,
  getSelectedJobName,
  getCvPdfHref,
  loadJobOverrides,
  isPlainObject,
  mergeCvData
} from './home/config.js';
```

Delete the original implementations in `home.js`. Leave everything else (terminal logic, render functions) in place for now.

- [ ] **Step 2.3: Update `index.html` to load the script as a module**

In `index.html`, replace:
```html
<script src="./home.js"></script>
```
with:
```html
<script type="module" src="./home.js"></script>
```

- [ ] **Step 2.4: Run the smoke tests**

```bash
npx playwright test
```

Expected: all 5 baseline tests still pass. If any fail, you've changed behavior — diff `home.js` against the previous commit and find the deviation.

- [ ] **Step 2.5: Update CHANGELOG**

Append to `## [Unreleased]` → `### Changed`:

```markdown
- Extracted config and i18n loaders from `home.js` into `home/config.js`. Behavior unchanged.
```

- [ ] **Step 2.6: Checkpoint**

Suggested commit message: `refactor(home): extract config loaders into home/config.js`

---

## Task 3: Extract terminal command system into `home/console.js`

**Goal:** Move the terminal-specific code (output rendering, command handlers, keyboard handling) into a focused module. No behavior change.

**Files:**
- Create: `home/console.js`
- Modify: `home.js`

- [ ] **Step 3.1: Identify the terminal-specific code in `home.js`**

Open `home.js` and identify the following pieces (use a TODO list as you read):
- Constants: `commandHistory`, `historyIndex`, `tabCompletionState`, `terminalState` (or whatever the current names are).
- Render helpers: anything that builds DOM in `#terminal-output` (e.g. `appendCommand`, `appendResponse`, `printGreeting`, `printHelp`, ASCII-art utilities).
- Command handlers: the registry that maps `cv`, `whoami`, `help`, `lang`/language switch, contact-info commands, etc.
- Event handlers: keydown, focus, click-to-focus, tab-complete cycling.
- Bootstrap: the function that renders the initial greeting and starts the input loop.

Anything that does NOT touch `#terminal-output` or the terminal `<form>` belongs elsewhere — leave it in `home.js` for now.

- [ ] **Step 3.2: Create `home/console.js`**

Move the identified code into `home/console.js`. Wrap it in a single exported function:

```javascript
import { withBasePath, toAbsoluteUrl } from './config.js';

// ... (move the existing constants, helpers, command map, and event handlers here verbatim)

export function initConsole({ data, onLanguageChange }) {
  // data is the merged i18n object returned by loadLang().
  // onLanguageChange(nextLang) is called when the user types a language-switch command.

  const output = document.getElementById('terminal-output');
  const form = document.getElementById('terminal-form');
  const input = document.getElementById('terminal-input');
  const promptLabel = document.getElementById('terminal-prompt');

  if (!output || !form || !input) return;

  // ... existing setup logic that previously ran inline in home.js
  // ... existing form submit handler
  // ... existing keydown handler (history, tab completion)
  // ... existing click-to-focus handler

  // Render initial greeting (existing behavior)
  // ...
}
```

**Critical:** Replace any places that previously called global utilities (e.g. `withBasePath`) with the imported versions. Replace any direct mutation of a global `currentLang` with calls to the `onLanguageChange` callback for language commands; the callback owns reloading and re-rendering.

- [ ] **Step 3.3: Update `home.js` to use the new module**

`home.js` should now be small. Replace the terminal-specific code with:

```javascript
import { loadLang } from './home/config.js';
import { initConsole } from './home/console.js';

const LOADER_HIDE_DELAY_MS = 120;

async function bootstrap() {
  const initialLang = document.documentElement.lang || 'en';
  await renderForLang(initialLang);
}

async function renderForLang(lang) {
  const data = await loadLang(lang);
  document.documentElement.lang = lang;
  document.body.lang = lang;
  // hide loader
  const loader = document.getElementById('loader');
  if (loader) {
    setTimeout(() => loader.classList.add('hidden'), LOADER_HIDE_DELAY_MS);
  }
  initConsole({
    data,
    onLanguageChange: (nextLang) => renderForLang(nextLang)
  });
}

bootstrap().catch((err) => {
  console.error('OhMyCV bootstrap failed:', err);
});
```

If the existing `home.js` has additional bootstrap logic (e.g. setting `data-base-path`, reading `localStorage` for last language), preserve it inside `bootstrap()`.

- [ ] **Step 3.4: Run the smoke tests**

```bash
npx playwright test
```

Expected: all 5 tests pass. The terminal must still render the greeting, accept commands, switch languages, and link to PDFs.

- [ ] **Step 3.5: Update CHANGELOG**

Append:

```markdown
- Extracted terminal command system from `home.js` into `home/console.js`. `home.js` is now an entry orchestrator under 150 lines.
```

- [ ] **Step 3.6: Checkpoint**

Suggested commit message: `refactor(home): extract terminal into home/console.js`

---

## Task 4: Reorganize `style.css` into CSS `@layer` structure

**Goal:** Wrap existing CSS in `@layer`s so the cascade is explicit before we add new rules. Visual output unchanged.

**Files:**
- Modify: `style.css`

- [ ] **Step 4.1: Read the entire current `style.css`**

```bash
wc -l style.css
```

Expected: ~635 lines.

- [ ] **Step 4.2: Add the layer declaration at the top**

Replace the very first line of `style.css` with:

```css
@layer tokens, base, landing, console, print, utilities;
```

- [ ] **Step 4.3: Wrap existing rules into layers**

Reorganize the existing CSS into the following structure (do not delete or modify any rule yet — just sort them into the right layer):

```css
@layer tokens, base, landing, console, print, utilities;

@layer tokens {
  :root {
    /* ALL :root custom properties currently in style.css */
  }
}

@layer base {
  /* body, html, basic resets, typography defaults, and language-family rules:
     - `body { ... }`
     - `body[lang="en"]`, `body[lang="zh"]`, `body.terminal-home[lang="en"]`
     - generic `p`, `ul`, `li`, link defaults
  */
}

@layer landing {
  /* Anything related to the eventual editorial layout. For now this is empty
     EXCEPT the existing `.page`, `.header`, `.contact-info`, `.section-title`,
     `.institution`, `.dates`, `.degree`, `.profile-summary`, `.edu-note`,
     `.referee-*`, `.credential-*`, `.micro-note`, `.small-text`, `.job-*`
     rules — keep them; they are still consumed by print and we will replace
     them in a later task.
  */
}

@layer console {
  /* All `.terminal-*` rules that style the homepage terminal:
     - `.terminal-home`, `.terminal-shell`, `.terminal-window`, `.terminal-window::before`
     - `.terminal-chrome`, `.terminal-dots`, `.terminal-body`, `.terminal-output`
     - `.terminal-entry`, `.terminal-command`, `.terminal-command-prompt`
     - `.terminal-command-text`, `.terminal-response`, `.terminal-response a`
     - `.terminal-block-title`, `.terminal-command-list`, `.terminal-command-token`
     - `.terminal-list-item`, `.terminal-key`, `.terminal-sep`
     - `.terminal-status`, `.terminal-status-error`, `.terminal-input-row`
     - `.terminal-prompt`, `.terminal-input`, `.terminal-input::placeholder`
     - `.terminal-output::-webkit-scrollbar`, `.terminal-output::-webkit-scrollbar-thumb`
     - `.loader`, `.loader-terminal`, `.loader-logo`, `.loader-logo-arrow`,
       `.loader-logo-line`, `.loader-text`, `.loader.hidden`,
       `@keyframes loader-line-blink`, `@keyframes spin`
     - `.terminal-home .loader-*` (lang-specific overrides)
  */
}

@layer print {
  /* The entire @page block + the @media print block as it exists today */
}

@layer utilities {
  /* Empty for now — placeholder. We'll add `.visually-hidden` here later. */
}

/* Mobile breakpoint: keep OUTSIDE layers for now (it spans landing + console).
   We'll move it under proper layers in Task 14. */
@media (max-width: 768px) {
  /* unchanged for this task */
}
```

**Important:** Do not refactor or rename any rule in this task. Only relocate them into the correct layer.

- [ ] **Step 4.4: Run the smoke tests**

```bash
npx playwright test
```

Expected: 5 passed. Visual output is unchanged because the layer order matches the original cascade order (tokens flow first, base under, then layout/console rules, with print reachable via the print media query).

- [ ] **Step 4.5: Manually inspect the page**

Run:
```bash
npm run dev
```

Open `http://localhost:4173` and confirm the page looks identical to before. Refresh in `lang=zh` mode (use the existing language toggle command) and confirm Chinese rendering is unchanged.

- [ ] **Step 4.6: Update CHANGELOG**

Append:

```markdown
- Reorganized `style.css` into explicit CSS `@layer`s (tokens, base, landing, console, print, utilities). No visual change.
```

- [ ] **Step 4.7: Checkpoint**

Suggested commit message: `refactor(css): organize style.css into explicit @layers`

---

## Task 5: Add new visual tokens and webfont preconnects

**Goal:** Introduce the Vermilion · Editorial token system and load Latin webfonts. No layout change yet — tokens are defined but old rules still reference old colors.

**Files:**
- Modify: `index.html` (add `<link>` preconnects and Google Fonts CSS)
- Modify: `style.css` (extend `@layer tokens` with the new tokens; do NOT remove old tokens yet — they're still consumed)

- [ ] **Step 5.1: Add Google Fonts links to `index.html`**

In the `<head>` of `index.html`, after the existing `<link rel="icon">`, add:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link
  href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;700;800&family=Geist+Mono:wght@400;500&family=Fraunces:ital,opsz,wght@1,144,300..600&display=swap"
  rel="stylesheet"
>
```

CJK fonts are intentionally NOT loaded at startup — they will be lazy-loaded by `home/i18n.js` (Task 12) when the user switches to Chinese.

- [ ] **Step 5.2: Extend `@layer tokens` in `style.css`**

Inside the `:root` block, ADD (do not remove existing tokens) the new tokens:

```css
@layer tokens {
  :root {
    /* ...existing tokens stay... */

    /* Vermilion · Editorial palette */
    --paper: #f1ece4;
    --ink: #1a0f08;
    --accent: #ff4d2e;
    --ink-soft: color-mix(in srgb, var(--ink) 65%, transparent);
    --rule: color-mix(in srgb, var(--ink) 18%, transparent);

    /* Editorial type stack */
    --font-display: 'Geist', system-ui, -apple-system, sans-serif;
    --font-italic: 'Fraunces', 'Source Han Serif SC', 'Noto Serif SC', 'Songti SC', serif;
    --font-mono-editorial: 'Geist Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace;

    /* Editorial layout */
    --col: min(720px, 100% - 48px);
    --gap-section: clamp(48px, 7vh, 96px);

    /* Motion */
    --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
    --dur-fast: 160ms;
    --dur-base: 200ms;
    --dur-medium: 500ms;
    --dur-slow: 600ms;
  }
}
```

- [ ] **Step 5.3: Run the smoke tests**

```bash
npx playwright test
```

Expected: 5 passed. Visual output unchanged — the new tokens are defined but not referenced by any rule yet.

- [ ] **Step 5.4: Manually verify webfonts load**

Run `npm run dev`, open the page, open DevTools → Network → filter by "fonts.gstatic.com". Reload — three font files (Geist, Geist Mono, Fraunces) should appear with status 200. Each should be under 100 KB woff2.

- [ ] **Step 5.5: Update CHANGELOG**

```markdown
- Added Vermilion · Editorial visual token set (`--paper`, `--ink`, `--accent`, type stack, motion easing).
- Loaded Geist, Geist Mono, and Fraunces from Google Fonts at startup. CJK fonts deferred until Chinese is activated.
```

- [ ] **Step 5.6: Checkpoint**

Suggested commit message: `feat(style): add Vermilion · Editorial tokens and webfonts`

---

## Task 6: Extend i18n schemas with new content fields

**Goal:** Add `homepage.tagline`, `homepage.meta`, `homepage.selected`, `homepage.colophon`, and `profile.summary_emphasis` to both `i18n/en.json` and `i18n/zh.json`. All new fields are optional — existing config still loads.

**Files:**
- Modify: `i18n/en.json`
- Modify: `i18n/zh.json`

- [ ] **Step 6.1: Add the new fields to `i18n/en.json`**

Locate the existing `homepage` object in `i18n/en.json` and ADD (alongside `title`, `prompt`, `greeting`, `links`):

```json
{
  "tagline": "building thoughtful software",
  "meta": [
    "Melbourne, Australia",
    "Software Engineer",
    "EN / ZH"
  ],
  "selected": [
    {
      "kind": "role",
      "meta": "2024 — present",
      "title": "Northstar Labs",
      "body": "Customer-facing dashboards and platform work in React and TypeScript, with a focus on reliable release tooling and observability.",
      "link": { "label": "read more", "href": "#" }
    },
    {
      "kind": "project",
      "meta": "open source",
      "title": "OhMyCV",
      "body": "A static, multilingual CV renderer with JSON content, language switching, and LaTeX-generated PDFs.",
      "link": { "label": "github", "href": "https://github.com/example/ohmycv" }
    },
    {
      "kind": "now",
      "meta": "Q2 2026",
      "title": "AI tooling for product teams",
      "body": "Exploring practical applications of AI-assisted software development — prompt workflows, evaluation harnesses, document processing.",
      "link": { "label": "notes", "href": "#" }
    }
  ],
  "colophon": "built with terminal & care · 2026 · MIT"
}
```

Inside the `profile` object, ADD:

```json
{
  "summary_emphasis": "thoughtful UX, and practical applications of AI-assisted software development"
}
```

The `summary_emphasis` value is a substring of the existing `profile.summary`. The renderer will italicize that exact substring inside the rendered paragraph. If the substring is not found at render time, the paragraph renders plain.

- [ ] **Step 6.2: Add the equivalent fields to `i18n/zh.json`**

Inside the `homepage` object:

```json
{
  "tagline": "构建经得起推敲的软件",
  "meta": [
    "墨尔本",
    "软件工程师",
    "中 / 英"
  ],
  "selected": [
    {
      "kind": "role",
      "meta": "2024 — 至今",
      "title": "Northstar Labs",
      "body": "在 React 与 TypeScript 上构建面向客户的仪表板与平台,关注发布工具与可观测性。",
      "link": { "label": "了解更多", "href": "#" }
    },
    {
      "kind": "project",
      "meta": "开源",
      "title": "OhMyCV",
      "body": "一个静态、多语言的简历渲染器,内容存为 JSON,支持语言切换与 LaTeX 编译的 PDF。",
      "link": { "label": "GitHub", "href": "https://github.com/example/ohmycv" }
    },
    {
      "kind": "now",
      "meta": "2026 Q2",
      "title": "面向产品团队的 AI 工具",
      "body": "探索 AI 辅助软件开发的实际应用 —— 提示词工作流、评估脚本、文档处理。",
      "link": { "label": "笔记", "href": "#" }
    }
  ],
  "colophon": "终端与匠心 · 2026 · MIT"
}
```

Inside the `profile` object:

```json
{
  "summary_emphasis": "周到的用户体验"
}
```

The Chinese summary_emphasis must also be a substring of the Chinese `profile.summary` so the about renderer can locate and emphasize it. Verify after editing by checking that `profile.summary` contains the exact substring.

- [ ] **Step 6.3: Run the smoke tests**

```bash
npx playwright test
```

Expected: 5 passed. The new fields are present in JSON but unused by any renderer yet, so no behavior change.

- [ ] **Step 6.4: Update CHANGELOG**

```markdown
- Extended `i18n/en.json` and `i18n/zh.json` with `homepage.tagline`, `homepage.meta`, `homepage.selected`, `homepage.colophon`, and `profile.summary_emphasis`.
```

- [ ] **Step 6.5: Checkpoint**

Suggested commit message: `feat(i18n): extend en/zh schemas with editorial homepage fields`

---

## Task 7: Restructure `index.html` with the editorial shell

**Goal:** Replace the terminal-only `<main>` with the full editorial shell. Each new section is a placeholder `<section>` with a stable id; render modules will populate them in subsequent tasks. The existing terminal markup stays inside `<section class="console">` so `home/console.js` keeps working.

**Files:**
- Modify: `index.html`
- Modify: `style.css` (`@layer landing`: minimal layout for the new shell so the page is presentable while sections fill in)

- [ ] **Step 7.1: Replace the body content of `index.html`**

The current `<body>` contains a `<div id="loader">` and `<main class="terminal-shell">` with the terminal `<section>`. Replace with:

```html
<body data-base-path="." class="landing-body">
  <div id="loader" class="loader" role="status" aria-live="polite">
    <div class="loader-terminal" aria-hidden="true">
      <span class="loader-logo">
        <span class="loader-logo-arrow">&gt;</span>
        <span class="loader-logo-line"></span>
      </span>
      <span id="loader-text" class="loader-text">Loading</span>
    </div>
  </div>

  <main class="landing">
    <header class="topbar" id="topbar"></header>

    <section class="hero" id="hero" aria-label="Introduction"></section>

    <section class="console" id="console" aria-label="Interactive terminal">
      <div class="console-chrome">
        <span class="console-chrome-id">~/zijian — bash</span>
        <span class="console-pulse" aria-hidden="true"></span>
      </div>
      <div class="console-body">
        <div class="terminal-output" id="terminal-output" aria-live="polite"></div>
        <form class="terminal-input-row" id="terminal-form" autocomplete="off">
          <label class="terminal-prompt" for="terminal-input" id="terminal-prompt">$</label>
          <input
            id="terminal-input"
            class="terminal-input"
            name="command"
            type="text"
            spellcheck="false"
            autocapitalize="off"
            autocomplete="off"
            aria-label="Terminal command"
          />
        </form>
      </div>
    </section>

    <section class="selected" id="selected" aria-label="Selected work"></section>

    <section class="about" id="about" aria-label="About"></section>

    <footer class="elsewhere" id="elsewhere" aria-label="Contact and downloads"></footer>
  </main>

  <script type="module" src="./home.js"></script>
</body>
```

Note that the inner ids `#terminal-output`, `#terminal-form`, `#terminal-input`, `#terminal-prompt` are preserved — `home/console.js` queries them.

The old `.terminal-window` / `.terminal-chrome` / `.terminal-dots` / `.terminal-body` wrappers are replaced by `.console-chrome` / `.console-body`. The console module no longer sees the traffic-light dots.

- [ ] **Step 7.2: Add minimal landing layout in `@layer landing`**

In `style.css`, inside `@layer landing { }`, add (alongside the existing legacy print rules already in this layer):

```css
@layer landing {
  /* ... existing legacy print-related rules already in this layer ... */

  body.landing-body {
    margin: 0;
    background: var(--paper);
    color: var(--ink);
    font-family: var(--font-display);
    font-size: 16px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .landing {
    width: 100%;
    max-width: none;
    margin: 0;
    padding: 0;
    background: var(--paper);
  }

  .landing > * {
    width: var(--col);
    max-width: 100%;
    margin: 0 auto;
  }

  .landing > * + * {
    margin-top: var(--gap-section);
  }

  .topbar {
    padding-top: 28px;
  }

  .elsewhere {
    padding-bottom: 96px;
  }

  /* Section labels, used by hero/selected/about/footer renderers */
  .section-label {
    font-family: var(--font-mono-editorial);
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-soft);
    display: block;
    margin-bottom: 12px;
  }

  /* 1px dashed rule helper */
  .rule {
    border: 0;
    border-top: 1px dashed var(--rule);
    margin: 0;
  }
}
```

- [ ] **Step 7.3: Move console-anchor styles into `@layer console`**

Inside `@layer console { }`, REPLACE the existing `.terminal-window`, `.terminal-chrome`, `.terminal-dots`, `.terminal-body` rules with:

```css
@layer console {
  /* Console anchor — the editorial centerpiece */
  .console {
    background: var(--ink);
    color: #ffd9c8;
    border-radius: 8px;
    overflow: hidden;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.04),
      0 18px 40px rgba(26, 15, 8, 0.18);
    min-height: clamp(280px, 38vh, 420px);
    display: flex;
    flex-direction: column;
  }

  .console-chrome {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-bottom: 1px solid rgba(255, 217, 200, 0.08);
    font-family: var(--font-mono-editorial);
    font-size: 12px;
    color: rgba(255, 217, 200, 0.55);
  }

  .console-chrome-id {
    letter-spacing: 0.04em;
  }

  .console-pulse {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 3px rgba(255, 77, 46, 0.18);
  }

  .console-body {
    flex: 1;
    padding: 18px 22px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
  }

  /* Keep existing .terminal-output, .terminal-input, .terminal-prompt, .terminal-* rules
     that style the inner content of the console body — restyle them below. */

  .terminal-output {
    flex: 1;
    overflow: auto;
    padding-right: 4px;
    font-family: var(--font-mono-editorial);
    font-size: 14px;
    line-height: 1.6;
    color: #ffd9c8;
  }

  .terminal-output a {
    color: var(--accent);
    text-decoration: none;
  }

  .terminal-output a:hover {
    text-decoration: underline;
  }

  .terminal-input-row {
    display: flex;
    align-items: center;
    gap: 0;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
  }

  .terminal-prompt {
    font-family: var(--font-mono-editorial);
    color: var(--accent);
    font-size: 14px;
    line-height: 1.6;
  }

  .terminal-input {
    flex: 1;
    border: 0;
    outline: 0;
    background: transparent;
    color: #ffe5d6;
    font: inherit;
    font-family: var(--font-mono-editorial);
    font-size: 14px;
    line-height: 1.6;
    caret-color: var(--accent);
    margin-left: 0.5ch;
  }

  .terminal-input::placeholder {
    color: rgba(255, 217, 200, 0.32);
  }

  .terminal-output::-webkit-scrollbar {
    width: 6px;
  }
  .terminal-output::-webkit-scrollbar-thumb {
    background: rgba(255, 77, 46, 0.28);
    border-radius: 999px;
  }

  /* Existing rules that style command/response entries inside .terminal-output —
     keep them here, but update colors to fit the new palette: */
  .terminal-command { color: var(--accent); font-size: 14px; line-height: 1.6; }
  .terminal-command-prompt { color: rgba(255, 217, 200, 0.65); }
  .terminal-command-text { margin-left: 0.35ch; }
  .terminal-response { margin-top: 0.35rem; color: #ffd9c8; font-size: 14px; line-height: 1.6; }
  .terminal-block-title { margin-bottom: 0.3rem; color: #fff5ee; }
  .terminal-command-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1.1rem;
    font-size: 14px;
    line-height: 1.6;
  }
  .terminal-command-token { color: #ffd9c8; }
  .terminal-list-item {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    font-size: 14px;
    line-height: 1.6;
  }
  .terminal-key { min-width: 76px; color: var(--accent); }
  .terminal-sep { color: rgba(255, 217, 200, 0.5); }
  .terminal-status { color: rgba(255, 217, 200, 0.65); }
  .terminal-status-error { color: #ff8a6e; }

  /* Loader (stays mostly as-is, colors updated to vermilion family) */
  .loader {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(241, 236, 228, 0.92);
    transition: opacity 0.2s ease;
    z-index: 1000;
  }
  .loader.hidden { opacity: 0; visibility: hidden; pointer-events: none; }
  .loader-terminal {
    display: inline-flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0.95rem 1.15rem;
    border-radius: 8px;
    font-family: var(--font-mono-editorial);
    font-size: 14px;
    color: var(--ink);
    background: rgba(241, 236, 228, 0.94);
    border: 1px solid var(--rule);
    box-shadow: 0 12px 28px rgba(26, 15, 8, 0.08);
  }
  .loader-logo {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.1rem;
    height: 2.1rem;
    border-radius: 6px;
    background: var(--ink);
  }
  .loader-logo-arrow { color: var(--accent); font-size: 0.95rem; line-height: 1; }
  .loader-logo-line {
    width: 0.55rem;
    height: 0.12rem;
    margin-left: 0.08rem;
    background: var(--accent);
    border-radius: 999px;
    animation: loader-line-blink 1s steps(1, end) infinite;
  }
  .loader-text { font-weight: 600; }

  @keyframes loader-line-blink {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }
}
```

Delete from `@layer console` any old rules referencing `.terminal-window`, `.terminal-chrome`, `.terminal-dots`, `.terminal-body`, `.terminal-shell`, or `.terminal-home` selector chains — those wrappers no longer exist in the markup. Print rules that reference these classes (in `@layer print`) should be left alone for now; the print view targets the CV PDF flow which is unrelated.

- [ ] **Step 7.4: Run the smoke tests**

```bash
npx playwright test
```

Two of the existing tests will fail because they assert `.terminal-window` is visible. Update them:

In `tests/landing.spec.js`, replace the first test:

```javascript
test('console anchor renders with prompt input', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.console')).toBeVisible();
  await expect(page.locator('#terminal-input')).toBeVisible();
  await expect(page.locator('#terminal-prompt')).toBeVisible();
  await expect(page.locator('.console-chrome-id')).toContainText('~/zijian');
});
```

Run again:
```bash
npx playwright test
```

Expected: 5 passed.

- [ ] **Step 7.5: Manual visual check**

Run `npm run dev`. Open the page. Expectations:
- Cream background, vermilion live pulse top-right of the console.
- Console renders mid-page with rounded corners, dark espresso background, vermilion prompt.
- Top bar, hero, selected, about, footer sections are present but empty.

- [ ] **Step 7.6: Update CHANGELOG**

```markdown
- Restructured `index.html` into the editorial shell: top bar, hero, console, selected, about, footer.
- Replaced terminal-window chrome with a single mono identification strip and a vermilion live pulse.
```

- [ ] **Step 7.7: Checkpoint**

Suggested commit message: `feat(landing): restructure index.html into editorial shell`

---

## Task 8: Implement the top bar (`render-topbar.js`)

**Goal:** Render the top bar with the wordmark, language toggle, and CV link. Wire the language toggle to call back into the bootstrap.

**Files:**
- Create: `home/render-topbar.js`
- Modify: `home.js` (call render after lang load)
- Modify: `style.css` (`@layer landing`: `.topbar` rules)
- Modify: `tests/landing.spec.js` (add top-bar tests)

- [ ] **Step 8.1: Write the failing tests**

Add to `tests/landing.spec.js`:

```javascript
test.describe('top bar', () => {
  test('renders wordmark, language toggle, and CV link', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.topbar .wordmark')).toContainText('~/zijian');
    await expect(page.locator('.topbar .lang-toggle')).toBeVisible();
    await expect(page.locator('.topbar .topbar-cv')).toBeVisible();
  });

  test('CV link in top bar resolves to a PDF', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('.topbar .topbar-cv');
    const href = await link.getAttribute('href');
    expect(href).toMatch(/\.pdf$/);
  });

  test('language toggle button switches html lang', async ({ page }) => {
    await page.goto('/');
    await page.locator('.lang-toggle [data-lang="zh"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh');
    await page.locator('.lang-toggle [data-lang="en"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});
```

- [ ] **Step 8.2: Run the failing tests**

```bash
npx playwright test --grep "top bar"
```

Expected: 3 fail (selectors do not exist yet).

- [ ] **Step 8.3: Implement `home/render-topbar.js`**

```javascript
export function renderTopbar({ data, lang, onLanguageChange }) {
  const root = document.getElementById('topbar');
  if (!root) return;

  const cvHref = data.__cv_pdf_href || '#';
  const downloadLabel = data.site?.download_label || 'CV';
  const otherLang = lang === 'en' ? 'zh' : 'en';

  root.innerHTML = `
    <div class="topbar-inner">
      <a class="wordmark" href="/" aria-label="Home">~/zijian</a>
      <nav class="topbar-nav" aria-label="Site">
        <div class="lang-toggle" role="group" aria-label="Language">
          <button type="button" data-lang="en" aria-pressed="${lang === 'en'}">EN</button>
          <span class="lang-toggle-sep" aria-hidden="true">·</span>
          <button type="button" data-lang="zh" aria-pressed="${lang === 'zh'}">ZH</button>
        </div>
        <a class="topbar-cv" href="${cvHref}" download aria-label="${downloadLabel}">↓ CV</a>
      </nav>
    </div>
  `;

  root.querySelectorAll('.lang-toggle button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-lang');
      if (next && next !== lang) onLanguageChange(next);
    });
  });
}
```

- [ ] **Step 8.4: Wire it from `home.js`**

In `home.js`, inside `renderForLang(lang)`, after `loadLang` resolves and BEFORE `initConsole`:

```javascript
import { renderTopbar } from './home/render-topbar.js';
// ...

async function renderForLang(lang) {
  const data = await loadLang(lang);
  document.documentElement.lang = lang;
  document.body.lang = lang;
  renderTopbar({ data, lang, onLanguageChange: (next) => renderForLang(next) });
  // ... existing loader hide + initConsole call ...
}
```

- [ ] **Step 8.5: Add `.topbar` styles in `@layer landing`**

```css
@layer landing {
  .topbar-inner {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 24px;
  }

  .wordmark {
    font-family: var(--font-mono-editorial);
    font-size: 14px;
    color: var(--ink);
    text-decoration: none;
    letter-spacing: 0.02em;
  }

  .topbar-nav {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .lang-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono-editorial);
    font-size: 13px;
  }
  .lang-toggle button {
    background: none;
    border: 0;
    padding: 4px 6px;
    color: var(--ink-soft);
    font: inherit;
    cursor: pointer;
    border-radius: 3px;
    transition: color var(--dur-fast) var(--ease-out);
  }
  .lang-toggle button:hover { color: var(--ink); }
  .lang-toggle button[aria-pressed="true"] { color: var(--accent); }
  .lang-toggle-sep { color: var(--ink-soft); }

  .topbar-cv {
    font-family: var(--font-mono-editorial);
    font-size: 13px;
    color: var(--accent);
    text-decoration: none;
    transition: opacity var(--dur-fast) var(--ease-out);
  }
  .topbar-cv:hover { opacity: 0.78; }
}
```

- [ ] **Step 8.6: Run the tests to verify they pass**

```bash
npx playwright test
```

Expected: all tests pass (baseline + new top-bar tests).

- [ ] **Step 8.7: Update CHANGELOG**

```markdown
- Added top bar with wordmark, language toggle (EN · ZH), and CV download link.
```

- [ ] **Step 8.8: Checkpoint**

Suggested commit message: `feat(landing): implement top bar`

---

## Task 9: Implement the hero (`render-hero.js`)

**Goal:** Render the hero with name, italic vermilion tagline, and meta line. Bilingual handling defers to Task 12 — for now we apply the English mechanism even in zh; the zh swap happens later.

**Files:**
- Create: `home/render-hero.js`
- Modify: `home.js` (call after topbar)
- Modify: `style.css` (`@layer landing`: hero rules)
- Modify: `tests/landing.spec.js`

- [ ] **Step 9.1: Write the failing tests**

```javascript
test.describe('hero', () => {
  test('renders name, tagline, and meta line', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero-name')).toContainText(/[A-Za-z一-鿿]/);
    await expect(page.locator('.hero-tagline')).toBeVisible();
    await expect(page.locator('.hero-meta')).toBeVisible();
  });

  test('tagline reflects i18n homepage.tagline', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero-tagline')).toContainText('thoughtful software');
  });
});
```

- [ ] **Step 9.2: Run the failing tests**

```bash
npx playwright test --grep "hero"
```

Expected: fail (selectors do not exist).

- [ ] **Step 9.3: Implement `home/render-hero.js`**

```javascript
export function renderHero({ data }) {
  const root = document.getElementById('hero');
  if (!root) return;

  const name = data.profile?.name ?? data.site?.title ?? '';
  const tagline = data.homepage?.tagline ?? '';
  const meta = Array.isArray(data.homepage?.meta) ? data.homepage.meta : [];

  root.innerHTML = `
    <h1 class="hero-name">${escapeHtml(name)}</h1>
    ${tagline ? `<p class="hero-tagline">${escapeHtml(tagline)}</p>` : ''}
    ${meta.length
      ? `<p class="hero-meta">${meta.map(escapeHtml).join('<span class="hero-meta-sep" aria-hidden="true"> · </span>')}</p>`
      : ''}
    <hr class="rule" />
  `;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}
```

- [ ] **Step 9.4: Add hero styles in `@layer landing`**

```css
@layer landing {
  .hero {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .hero-name {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: clamp(56px, 9vw, 120px);
    line-height: 0.92;
    letter-spacing: -0.035em;
    margin: 0;
    color: var(--ink);
  }

  .hero-tagline {
    font-family: var(--font-italic);
    font-style: italic;
    font-weight: 300;
    font-variation-settings: 'opsz' 144;
    font-size: clamp(28px, 4.5vw, 56px);
    line-height: 1.05;
    color: var(--accent);
    margin: 0;
  }

  .hero-meta {
    font-family: var(--font-mono-editorial);
    font-size: 13px;
    color: var(--ink-soft);
    margin: 18px 0 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0;
  }

  .hero-meta-sep {
    margin: 0 10px;
  }

  .hero .rule {
    margin-top: 28px;
  }
}
```

- [ ] **Step 9.5: Wire from `home.js`**

```javascript
import { renderHero } from './home/render-hero.js';
// ...
async function renderForLang(lang) {
  const data = await loadLang(lang);
  document.documentElement.lang = lang;
  document.body.lang = lang;
  renderTopbar({ data, lang, onLanguageChange: (n) => renderForLang(n) });
  renderHero({ data });
  // ...
}
```

- [ ] **Step 9.6: Run the tests**

```bash
npx playwright test
```

Expected: all pass.

- [ ] **Step 9.7: Update CHANGELOG**

```markdown
- Added hero block with name, italic Fraunces tagline, and mono meta line.
```

- [ ] **Step 9.8: Checkpoint**

Suggested commit message: `feat(landing): implement hero`

---

## Task 10: Restyle the console (live pulse animation + Escape-clears-line)

**Goal:** Add the breathing live-pulse animation and the new Escape-clears-line keyboard behavior to the console. Restyling is mostly already in place from Task 7; this task adds the runtime polish.

**Files:**
- Modify: `home/console.js` (Escape handler)
- Modify: `style.css` (`@layer console`: pulse animation)
- Modify: `tests/landing.spec.js`

- [ ] **Step 10.1: Write the failing test for Escape-clears-line**

```javascript
test('Escape clears the console input line', async ({ page }) => {
  await page.goto('/');
  const input = page.locator('#terminal-input');
  await input.click();
  await input.fill('partial-command');
  await input.press('Escape');
  await expect(input).toHaveValue('');
});
```

- [ ] **Step 10.2: Run it**

```bash
npx playwright test --grep "Escape clears"
```

Expected: fail.

- [ ] **Step 10.3: Add Escape handling in `home/console.js`**

Locate the existing keydown handler that handles ArrowUp / ArrowDown / Tab. Add an Escape branch:

```javascript
input.addEventListener('keydown', (event) => {
  // ...existing ArrowUp/ArrowDown/Tab handlers stay...

  if (event.key === 'Escape') {
    event.preventDefault();
    input.value = '';
    // existing tab-completion-state reset, if applicable:
    resetTabCompletionState?.();
    return;
  }
});
```

- [ ] **Step 10.4: Add the pulse animation in `@layer console`**

```css
@layer console {
  .console-pulse {
    animation: console-pulse-breath 2.4s ease-in-out infinite;
  }

  @keyframes console-pulse-breath {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .console-pulse { animation: none; }
  }

  .terminal-input:focus {
    caret-color: var(--accent);
  }

  .console:focus-within {
    box-shadow:
      inset 0 0 0 1px rgba(255, 77, 46, 0.35),
      0 18px 40px rgba(26, 15, 8, 0.22);
  }
}
```

- [ ] **Step 10.5: Run the tests**

```bash
npx playwright test
```

Expected: all pass.

- [ ] **Step 10.6: Update CHANGELOG**

```markdown
- Added 2.4s breathing pulse to the console live indicator.
- Added Escape-clears-line keyboard behavior to the console input.
```

- [ ] **Step 10.7: Checkpoint**

Suggested commit message: `feat(console): live pulse animation and Escape clears input`

---

## Task 11: Implement selected cards (`render-selected.js`) with reveal-on-scroll

**Goal:** Render up to three editorial cards from `data.homepage.selected`, with IntersectionObserver-driven fade+rise on enter.

**Files:**
- Create: `home/render-selected.js`
- Modify: `home.js`
- Modify: `style.css` (`@layer landing`: selected rules)
- Modify: `tests/landing.spec.js`

- [ ] **Step 11.1: Write the failing tests**

```javascript
test.describe('selected', () => {
  test('renders one card per i18n entry', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('.selected .selected-card');
    await expect(cards).toHaveCount(3);
  });

  test('each card shows kind, meta, title, and verb link', async ({ page }) => {
    await page.goto('/');
    const first = page.locator('.selected .selected-card').first();
    await expect(first.locator('.selected-kind')).toBeVisible();
    await expect(first.locator('.selected-meta')).toBeVisible();
    await expect(first.locator('.selected-title')).toBeVisible();
    await expect(first.locator('.selected-link')).toBeVisible();
  });

  test('section label is shown', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.selected .section-label')).toContainText(/selected/i);
  });
});
```

- [ ] **Step 11.2: Run it**

```bash
npx playwright test --grep "selected"
```

Expected: fail.

- [ ] **Step 11.3: Implement `home/render-selected.js`**

```javascript
export function renderSelected({ data }) {
  const root = document.getElementById('selected');
  if (!root) return;

  const items = Array.isArray(data.homepage?.selected) ? data.homepage.selected : [];
  if (items.length === 0) {
    root.innerHTML = '';
    return;
  }

  root.innerHTML = `
    <span class="section-label">// selected</span>
    <ul class="selected-list" role="list">
      ${items.map(renderCard).join('')}
    </ul>
  `;

  observeReveals(root.querySelectorAll('.selected-card'));
}

function renderCard(item) {
  const link = item.link?.href
    ? `<a class="selected-link" href="${escapeAttr(item.link.href)}"${isExternal(item.link.href) ? ' rel="noreferrer noopener" target="_blank"' : ''}>→ ${escapeHtml(item.link.label || 'open')}</a>`
    : '';
  return `
    <li class="selected-card">
      <div class="selected-top">
        <span class="selected-kind">${escapeHtml(item.kind || '')}</span>
        <span class="selected-meta">${escapeHtml(item.meta || '')}</span>
      </div>
      <h2 class="selected-title">${escapeHtml(item.title || '')}</h2>
      <p class="selected-body">${escapeHtml(item.body || '')}</p>
      ${link}
    </li>
  `;
}

function observeReveals(elements) {
  if (typeof IntersectionObserver === 'undefined') {
    elements.forEach((el) => el.setAttribute('data-revealed', 'true'));
    return;
  }
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    elements.forEach((el) => el.setAttribute('data-revealed', 'true'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.setAttribute('data-revealed', 'true');
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.2 });
  elements.forEach((el) => io.observe(el));
}

function isExternal(href) {
  return /^https?:\/\//i.test(href);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}
```

- [ ] **Step 11.4: Wire from `home.js`**

```javascript
import { renderSelected } from './home/render-selected.js';
// ...
renderSelected({ data });
```

- [ ] **Step 11.5: Add styles in `@layer landing`**

```css
@layer landing {
  .selected-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .selected-card {
    padding: 24px 0;
    border-top: 1px dashed var(--rule);
    opacity: 0;
    transform: translateY(6px);
    transition:
      opacity var(--dur-slow) var(--ease-out),
      transform var(--dur-slow) var(--ease-out),
      color var(--dur-base) var(--ease-out);
  }
  .selected-card[data-revealed="true"] {
    opacity: 1;
    transform: none;
  }

  .selected-top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-family: var(--font-mono-editorial);
    font-size: 12px;
    color: var(--ink-soft);
    margin-bottom: 6px;
  }

  .selected-kind {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--accent);
  }

  .selected-title {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 24px;
    line-height: 1.2;
    margin: 0 0 8px;
    color: var(--ink);
    transition: color var(--dur-base) var(--ease-out);
  }

  .selected-card:hover .selected-title {
    color: var(--accent);
  }

  .selected-body {
    font-family: var(--font-display);
    font-size: 15px;
    line-height: 1.55;
    color: var(--ink-soft);
    margin: 0 0 10px;
  }

  .selected-link {
    font-family: var(--font-mono-editorial);
    font-size: 13px;
    color: var(--accent);
    text-decoration: none;
    position: relative;
  }
  .selected-link::after {
    content: '';
    position: absolute;
    left: 16px;
    right: 0;
    bottom: -2px;
    height: 1px;
    background: var(--accent);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform var(--dur-fast) var(--ease-out);
  }
  .selected-link:hover::after { transform: scaleX(1); }

  @media (prefers-reduced-motion: reduce) {
    .selected-card {
      opacity: 1;
      transform: none;
      transition: none;
    }
  }
}
```

- [ ] **Step 11.6: Run the tests**

```bash
npx playwright test
```

Expected: all pass.

- [ ] **Step 11.7: Update CHANGELOG**

```markdown
- Added selected work section with editorial cards and IntersectionObserver-driven reveal-on-scroll.
```

- [ ] **Step 11.8: Checkpoint**

Suggested commit message: `feat(landing): implement selected cards`

---

## Task 12: Implement about + footer (`render-about.js`, `render-footer.js`)

**Goal:** Two small components together. About emphasizes a configurable substring with an italic span; footer renders contact list, CV download row, and colophon.

**Files:**
- Create: `home/render-about.js`
- Create: `home/render-footer.js`
- Modify: `home.js`
- Modify: `style.css`
- Modify: `tests/landing.spec.js`

- [ ] **Step 12.1: Write the failing tests**

```javascript
test.describe('about', () => {
  test('renders summary paragraph', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.about p')).not.toBeEmpty();
    await expect(page.locator('.about .section-label')).toContainText(/about/i);
  });

  test('emphasized substring is wrapped in <em>', async ({ page }) => {
    await page.goto('/');
    const em = page.locator('.about p em.about-emphasis');
    await expect(em).toBeVisible();
    await expect(em).toContainText('thoughtful UX');
  });
});

test.describe('footer', () => {
  test('contact links rendered', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.elsewhere .contact-list a').first()).toBeVisible();
  });

  test('renders CV download links for both languages', async ({ page }) => {
    await page.goto('/');
    const en = page.locator('.elsewhere .cv-link[data-lang="en"]');
    const zh = page.locator('.elsewhere .cv-link[data-lang="zh"]');
    await expect(en).toBeVisible();
    await expect(zh).toBeVisible();
    expect(await en.getAttribute('href')).toMatch(/\.pdf$/);
    expect(await zh.getAttribute('href')).toMatch(/\.pdf$/);
  });

  test('colophon line rendered', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.elsewhere .colophon')).toBeVisible();
  });
});
```

- [ ] **Step 12.2: Run them**

```bash
npx playwright test --grep "about|footer"
```

Expected: fail.

- [ ] **Step 12.3: Implement `home/render-about.js`**

```javascript
export function renderAbout({ data }) {
  const root = document.getElementById('about');
  if (!root) return;

  const summary = data.profile?.summary;
  if (!summary) {
    root.innerHTML = '';
    return;
  }
  const emphasis = data.profile?.summary_emphasis;

  root.innerHTML = `
    <span class="section-label">// about</span>
    <p>${decorateEmphasis(summary, emphasis)}</p>
  `;
}

function decorateEmphasis(text, emphasis) {
  const safe = escapeHtml(text);
  if (!emphasis) return safe;
  const idx = safe.indexOf(escapeHtml(emphasis));
  if (idx === -1) return safe;
  const safeEmph = escapeHtml(emphasis);
  return (
    safe.slice(0, idx) +
    `<em class="about-emphasis">${safeEmph}</em>` +
    safe.slice(idx + safeEmph.length)
  );
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}
```

- [ ] **Step 12.4: Implement `home/render-footer.js`**

```javascript
export function renderFooter({ data }) {
  const root = document.getElementById('elsewhere');
  if (!root) return;

  const contact = data.profile?.contact_info || {};
  const colophon = data.homepage?.colophon || '';
  const cvHrefs = data.__cv_pdf_hrefs || {};

  root.innerHTML = `
    <hr class="rule" />
    <span class="section-label">// elsewhere</span>
    <ul class="contact-list" role="list">
      ${Object.entries(contact)
        .map(([label, value]) => renderContact(label, value))
        .join('<span class="contact-sep" aria-hidden="true"> · </span>')}
    </ul>
    <ul class="cv-list" role="list">
      ${cvHrefs.en ? `<li><a class="cv-link" data-lang="en" href="${escapeAttr(cvHrefs.en)}" download>↓ cv · en</a></li>` : ''}
      ${cvHrefs.zh ? `<li><a class="cv-link" data-lang="zh" href="${escapeAttr(cvHrefs.zh)}" download>↓ cv · zh</a></li>` : ''}
    </ul>
    ${colophon ? `<p class="colophon">${escapeHtml(colophon)}</p>` : ''}
  `;
}

function renderContact(label, value) {
  if (!value) return '';
  const href = toHref(label, value);
  if (!href) return `<li><span>${escapeHtml(value)}</span></li>`;
  return `<li><a href="${escapeAttr(href)}">${escapeHtml(value)}</a></li>`;
}

function toHref(label, value) {
  if (/^email$/i.test(label)) return `mailto:${value}`;
  if (/^phone|tel/i.test(label)) return `tel:${value}`;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}
```

- [ ] **Step 12.5: Wire from `home.js`**

```javascript
import { renderAbout } from './home/render-about.js';
import { renderFooter } from './home/render-footer.js';
// ...
renderAbout({ data });
renderFooter({ data });
```

- [ ] **Step 12.6: Add styles in `@layer landing`**

```css
@layer landing {
  .about p {
    font-family: var(--font-display);
    font-size: 17px;
    line-height: 1.55;
    color: var(--ink-soft);
    margin: 0;
    max-width: 58ch;
  }

  .about-emphasis {
    font-family: var(--font-italic);
    font-style: italic;
    font-weight: 400;
    color: var(--accent);
  }

  .elsewhere .rule {
    margin-bottom: 24px;
  }

  .contact-list,
  .cv-list {
    list-style: none;
    margin: 0;
    padding: 0;
    font-family: var(--font-mono-editorial);
    font-size: 13px;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0;
  }

  .contact-list { gap: 0; }
  .contact-list li { display: inline; }
  .contact-list a {
    color: var(--ink);
    text-decoration: none;
    transition: color var(--dur-fast) var(--ease-out);
  }
  .contact-list a:hover { color: var(--accent); }
  .contact-sep { color: var(--ink-soft); margin: 0 8px; }

  .cv-list {
    margin-top: 12px;
    gap: 18px;
  }
  .cv-link {
    color: var(--accent);
    text-decoration: none;
    transition: opacity var(--dur-fast) var(--ease-out);
  }
  .cv-link:hover { opacity: 0.78; }

  .colophon {
    margin: 24px 0 0;
    font-family: var(--font-mono-editorial);
    font-size: 11px;
    color: var(--ink-soft);
  }
}
```

- [ ] **Step 12.7: Run the tests**

```bash
npx playwright test
```

Expected: all pass.

- [ ] **Step 12.8: Update CHANGELOG**

```markdown
- Added about paragraph with optional italicized emphasis substring.
- Added footer with contact list, dual-language CV download links, and colophon.
```

- [ ] **Step 12.9: Checkpoint**

Suggested commit message: `feat(landing): implement about and footer`

---

## Task 13: Bilingual handling (`home/i18n.js` + CJK lazy-load + zh tagline mechanism)

**Goal:** When the user switches to Chinese, lazy-load CJK serif weights and switch the tagline + about-emphasis from Fraunces italic to a serif-weight-contrast pairing in vermilion.

**Files:**
- Create: `home/i18n.js`
- Modify: `home.js` (use the new module on language change)
- Modify: `style.css` (`:lang(zh)` overrides under `@layer landing`)
- Modify: `tests/landing.spec.js`

- [ ] **Step 13.1: Write failing tests**

```javascript
test.describe('bilingual', () => {
  test('zh tagline renders without italic', async ({ page }) => {
    await page.goto('/');
    await page.locator('.lang-toggle [data-lang="zh"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh');
    const fontStyle = await page.locator('.hero-tagline').evaluate(
      (el) => getComputedStyle(el).fontStyle
    );
    expect(fontStyle).toBe('normal');
  });

  test('zh tagline uses CJK serif family', async ({ page }) => {
    await page.goto('/');
    await page.locator('.lang-toggle [data-lang="zh"]').click();
    const family = await page.locator('.hero-tagline').evaluate(
      (el) => getComputedStyle(el).fontFamily
    );
    expect(family).toMatch(/Source Han Serif|Noto Serif SC|Songti/);
  });

  test('CJK font CSS link is injected after zh switch', async ({ page }) => {
    await page.goto('/');
    expect(await page.locator('link[data-cjk]').count()).toBe(0);
    await page.locator('.lang-toggle [data-lang="zh"]').click();
    await expect(page.locator('link[data-cjk]')).toHaveCount(1);
  });
});
```

- [ ] **Step 13.2: Run them**

```bash
npx playwright test --grep "bilingual"
```

Expected: fail.

- [ ] **Step 13.3: Implement `home/i18n.js`**

```javascript
const CJK_HREF =
  'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;700&display=swap';
const STORAGE_KEY = 'ohmycv:lang';

export function readPersistedLang(fallback = 'en') {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === 'en' || v === 'zh') return v;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function persistLang(lang) {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}

export function ensureCjkFontsLoaded() {
  if (document.querySelector('link[data-cjk]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CJK_HREF;
  link.setAttribute('data-cjk', 'true');
  document.head.appendChild(link);
}

export function applyLangAttribute(lang) {
  document.documentElement.lang = lang;
  document.body.lang = lang;
  if (lang === 'zh') ensureCjkFontsLoaded();
}
```

- [ ] **Step 13.4: Use it from `home.js`**

```javascript
import {
  readPersistedLang,
  persistLang,
  applyLangAttribute
} from './home/i18n.js';

async function bootstrap() {
  const initialLang = readPersistedLang(document.documentElement.lang || 'en');
  await renderForLang(initialLang);
}

async function renderForLang(lang) {
  const data = await loadLang(lang);
  applyLangAttribute(lang);
  persistLang(lang);
  renderTopbar({ data, lang, onLanguageChange: (n) => renderForLang(n) });
  renderHero({ data });
  renderSelected({ data });
  renderAbout({ data });
  renderFooter({ data });
  initConsole({ data, onLanguageChange: (n) => renderForLang(n) });
  // hide loader (keep existing behavior)
}
```

- [ ] **Step 13.5: Add `:lang(zh)` overrides in `@layer landing`**

```css
@layer landing {
  :lang(zh) .hero-tagline {
    font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', serif;
    font-style: normal;
    font-weight: 300;
    font-variation-settings: normal;
  }

  :lang(zh) .about-emphasis {
    font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', serif;
    font-style: normal;
    font-weight: 300;
    color: var(--accent);
  }

  :lang(zh) .hero-name {
    font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', serif;
    letter-spacing: -0.01em;
  }
}
```

- [ ] **Step 13.6: Run the tests**

```bash
npx playwright test
```

Expected: all pass. Re-run the language toggle baseline test (`language toggle switches html lang`) — it must still pass and the persisted-lang behavior must not break the baseline.

- [ ] **Step 13.7: Update CHANGELOG**

```markdown
- Added bilingual handling: Chinese tagline and emphasis swap to a Source Han Serif weight-contrast pairing in vermilion. CJK fonts lazy-loaded only on first Chinese activation.
- Persisted language preference in `localStorage`.
```

- [ ] **Step 13.8: Checkpoint**

Suggested commit message: `feat(i18n): bilingual hero with CJK serif fallback and lazy load`

---

## Task 14: Motion, focus, and reduced-motion polish

**Goal:** Hero entry stagger, focus styles across the page, global `prefers-reduced-motion` handling. Reveals on selected and console pulse already done.

**Files:**
- Modify: `style.css` (`@layer landing` + `@layer console`)
- Modify: `home/render-hero.js` (entry sequencing)
- Modify: `tests/landing.spec.js`

- [ ] **Step 14.1: Write the failing tests**

```javascript
test.describe('motion', () => {
  test('hero applies entered state on first paint', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero[data-motion="entered"]')).toBeVisible({
      timeout: 2000
    });
  });

  test('reduced-motion disables hero entry transition', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    const transition = await page.locator('.hero-name').evaluate(
      (el) => getComputedStyle(el).transitionDuration
    );
    // Reduced-motion overrides should result in 0s transitions.
    expect(transition).toMatch(/^0s/);
    await context.close();
  });

  test('focus style on console input is visible', async ({ page }) => {
    await page.goto('/');
    const input = page.locator('#terminal-input');
    await input.focus();
    const outline = await input.evaluate((el) => getComputedStyle(el).outlineColor);
    expect(outline).not.toBe('rgba(0, 0, 0, 0)');
  });
});
```

- [ ] **Step 14.2: Run them**

```bash
npx playwright test --grep "motion"
```

Expected: fail.

- [ ] **Step 14.3: Add hero entry sequencing**

In `home/render-hero.js`, after the `root.innerHTML = ...` assignment, append:

```javascript
requestAnimationFrame(() => {
  root.setAttribute('data-motion', 'entered');
});
```

- [ ] **Step 14.4: Add motion + focus styles in `@layer landing`**

```css
@layer landing {
  .hero .hero-name,
  .hero .hero-tagline,
  .hero .hero-meta {
    opacity: 0;
    transform: translateY(8px);
    transition:
      opacity var(--dur-slow) var(--ease-out),
      transform var(--dur-slow) var(--ease-out);
  }
  .hero[data-motion="entered"] .hero-name { opacity: 1; transform: none; transition-delay: 0ms; }
  .hero[data-motion="entered"] .hero-tagline { opacity: 1; transform: none; transition-delay: 80ms; }
  .hero[data-motion="entered"] .hero-meta { opacity: 1; transform: none; transition-delay: 240ms; }

  /* Global focus style */
  :focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    border-radius: 2px;
  }

  /* Reduced motion: disable all entry/scroll motion */
  @media (prefers-reduced-motion: reduce) {
    .hero .hero-name,
    .hero .hero-tagline,
    .hero .hero-meta {
      opacity: 1;
      transform: none;
      transition-duration: 0s;
    }
  }
}

@layer console {
  .terminal-input:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
}
```

- [ ] **Step 14.5: Run the tests**

```bash
npx playwright test
```

Expected: all pass.

- [ ] **Step 14.6: Update CHANGELOG**

```markdown
- Added hero entry stagger (name, tagline, meta) and global focus-visible styles. All entry motion respects `prefers-reduced-motion`.
```

- [ ] **Step 14.7: Checkpoint**

Suggested commit message: `feat(motion): hero entry stagger and global focus-visible`

---

## Task 15: Mobile breakpoint, dead-CSS cleanup, README

**Goal:** Tighten the layout for narrow viewports, remove CSS rules that are no longer referenced, document the new fields and dev workflow.

**Files:**
- Modify: `style.css`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `tests/landing.spec.js`

- [ ] **Step 15.1: Write the failing test**

```javascript
test('mobile viewport keeps console visible without horizontal scroll', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('.console')).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await context.close();
});
```

- [ ] **Step 15.2: Run it**

```bash
npx playwright test --grep "mobile viewport"
```

Expected: may pass or fail depending on current state — adjust the breakpoint rules below to make it pass cleanly.

- [ ] **Step 15.3: Replace the legacy `@media (max-width: 768px)` block**

Locate the existing `@media (max-width: 768px)` block at the bottom of `style.css` and REPLACE it with the layered, narrower-target equivalent:

```css
@layer landing {
  @media (max-width: 640px) {
    :root {
      --col: min(720px, 100% - 32px);
      --gap-section: clamp(40px, 6vh, 72px);
    }

    .topbar-inner {
      flex-wrap: wrap;
      gap: 12px;
      row-gap: 8px;
    }

    .hero-name {
      font-size: clamp(40px, 12vw, 72px);
    }

    .hero-tagline {
      font-size: clamp(22px, 7vw, 36px);
    }

    .hero-meta {
      font-size: 12px;
    }

    .selected-title {
      font-size: 20px;
    }

    .cv-list {
      gap: 12px;
    }
  }
}

@layer console {
  @media (max-width: 640px) {
    .console {
      min-height: clamp(220px, 50vh, 320px);
    }
    .console-body {
      padding: 14px 16px 16px;
    }
    .terminal-output,
    .terminal-input,
    .terminal-prompt,
    .terminal-command,
    .terminal-response {
      font-size: 15px;
    }
  }
}
```

- [ ] **Step 15.4: Remove dead CSS**

Search `style.css` for selectors that are not referenced anywhere in `index.html`, `home.js`, or `home/*.js`:

```bash
for selector in terminal-window terminal-shell terminal-home terminal-dots terminal-chrome page header name contact-divider home-link-btn; do
  echo "--- $selector ---"
  grep -rn "$selector" index.html home.js home/ 2>/dev/null
done
```

Any selector that produces NO matches in the application source can be deleted from `style.css`. Print rules under `@layer print` are exceptions: do not delete print rules even if their classes look orphaned in the homepage source — they may still be consumed by an external CV view. Confirm by inspecting `@media print` and leaving it untouched.

- [ ] **Step 15.5: Run the full suite**

```bash
npx playwright test
```

Expected: all tests pass on both default desktop viewport and the mobile viewport test.

- [ ] **Step 15.6: Update README**

In `README.md`, add a new section after the existing "Run locally" section:

```markdown
## Tests

```bash
npm install
npm run test:install   # one-time: download Chromium for Playwright
npm test               # run smoke tests
```

The Playwright config in `playwright.config.js` automatically starts `python3 -m http.server 4173`.

## Performance budget

The landing page targets:

- LCP ≤ 1.8s on simulated 4G (Moto G4) — verify periodically via Chrome DevTools Lighthouse.
- CLS ≤ 0.05.
- Initial transferred bytes ≤ 200 KB on English (Latin webfonts only) and ≤ 400 KB on Chinese (CJK weights are lazy-loaded on first language switch).

## New i18n fields

The redesigned homepage consumes these optional fields (see `i18n/en.json` and `i18n/zh.json`):

| Field | Type | Description |
|---|---|---|
| `homepage.tagline` | string | Italicized accent below the name. |
| `homepage.meta` | string[] | Mono meta line, joined with mono dots. |
| `homepage.selected` | object[] | Selected work cards: `{ kind, meta, title, body, link: { label, href } }`. |
| `homepage.colophon` | string | Single-line footer credit. |
| `profile.summary_emphasis` | string | Substring of `profile.summary` to italicize for editorial rhythm. |
```

- [ ] **Step 15.7: Update CHANGELOG**

Move the `## [Unreleased]` block to a dated release header (the user will choose the version when releasing; default to `## [0.1.0] — 2026-05-07`):

```markdown
## [0.1.0] — 2026-05-07

### Added

- Editorial Vermilion · Editorial homepage redesign: top bar, hero, console anchor, selected work, about, footer.
- Bilingual handling: Chinese tagline swaps to Source Han Serif weight contrast (no italic). CJK fonts lazy-loaded.
- Hero entry stagger; selected reveal-on-scroll; console live-pulse animation. All respect `prefers-reduced-motion`.
- Escape key clears the console input line.
- Playwright smoke test suite.
- New i18n fields: `homepage.tagline`, `homepage.meta`, `homepage.selected`, `homepage.colophon`, `profile.summary_emphasis`.
- `package.json` with `dev`, `test`, `test:install`, `test:headed` scripts.

### Changed

- `home.js` split into ES modules under `home/` (`config`, `console`, `i18n`, `render-topbar`, `render-hero`, `render-selected`, `render-about`, `render-footer`).
- `style.css` reorganized into explicit CSS `@layer`s.
- Console chrome replaced macOS traffic-light dots with a single mono identification strip and a vermilion live pulse.

### Removed

- Dead terminal-shell CSS rules (`.terminal-window`, `.terminal-shell`, `.terminal-home`, `.terminal-dots`, `.terminal-chrome`) that are no longer referenced by the homepage markup.
```

- [ ] **Step 15.8: Final test pass**

```bash
npx playwright test
```

Expected: all tests pass. If any test is flaky on first paint, increase its timeout by 1 second rather than weakening the assertion — the page should be predictable.

- [ ] **Step 15.9: Manual visual checklist**

Open the page at the following sizes and confirm rhythm:

- 1280 × 800: hero name at the upper bound of `clamp(56px, 9vw, 120px)`, console anchored cleanly, selected cards comfortably read.
- 768 × 1024: hero text scales down via clamp; topbar still single row.
- 375 × 667: topbar wraps; CV link appears below the language toggle on a new row; console fills width without overflow.
- Toggle to ZH: tagline switches to Noto Serif SC weight 300 in vermilion; about emphasis switches likewise; no italic.
- Trigger `prefers-reduced-motion: reduce` (System Preferences on macOS, or DevTools Rendering tab): hero entry is instant; selected cards visible immediately; console pulse stops breathing.

- [ ] **Step 15.10: Checkpoint**

Suggested commit message: `feat(landing): mobile breakpoints, dead-CSS cleanup, docs`

---

## Self-review against the spec

After completing all 15 tasks, run this final self-review:

1. **Spec coverage check** — open `docs/superpowers/specs/2026-05-07-cutting-edge-ui-design.md`. For each subsection (IA, hero, console, selected, about, footer, motion, bilingual, accessibility, tech approach, testing, performance, file layout), find the corresponding task. Anything uncovered? Add a follow-up task.
2. **Smoke-test all paths** — `npx playwright test` with all tests green.
3. **Performance** — open Chrome DevTools Lighthouse on `http://localhost:4173/`, run a Performance + Accessibility audit. Verify LCP ≤ 1.8s, CLS ≤ 0.05, Accessibility ≥ 95.
4. **Bilingual review** — toggle to ZH, verify the hero rhythm is intentional, contact and selected content reads cleanly, no Latin-italic on Chinese strings.
5. **Reduced motion** — `prefers-reduced-motion: reduce` engaged, verify all entry, scroll, and pulse animations are off; hover color transitions still work.
6. **Mobile** — at 375 × 667, no horizontal scroll, all sections accessible.
