# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2026-05-08

### Added

- Editorial Vermilion · Editorial homepage redesign: top bar, hero, console anchor, selected work, about, footer.
- Bilingual handling: Chinese tagline, name, and emphasis swap to Noto Serif SC weight 300 in vermilion (no italic). CJK fonts lazy-loaded only on first Chinese activation. Language preference persisted in `localStorage`.
- Hero entry stagger (name -> tagline -> meta), selected reveal-on-scroll, console live-pulse animation. All respect `prefers-reduced-motion`.
- Console: Escape key clears the current input line; focus-within and focus-visible vermilion outlines.
- Playwright smoke test suite with 29 tests covering structure, commands, language toggle, motion, bilingual, and mobile.
- New optional i18n fields: `homepage.tagline`, `homepage.meta`, `homepage.selected`, `homepage.colophon`, `profile.summary_emphasis`.
- `package.json` with `dev`, `test`, `test:install`, `test:headed` scripts.
- Mobile breakpoint at 640px tightening hero scale, console padding, and topbar wrap.

### Changed

- `home.js` split into ES modules under `home/` (`config.js`, `console.js`, `i18n.js`, `render-topbar.js`, `render-hero.js`, `render-selected.js`, `render-about.js`, `render-footer.js`).
- `style.css` reorganized into explicit CSS `@layer`s (tokens, base, landing, console, print, utilities).
- Console chrome replaced macOS traffic-light dots with a single mono identification strip and a vermilion live pulse.
- `index.html` switched to `<script type="module">` and restructured into the editorial shell.

### Removed

- Dead terminal-shell CSS rules (`.terminal-window`, `.terminal-shell`, `.terminal-home`, `.terminal-dots`, `.terminal-chrome`) that are no longer referenced by the homepage markup.
- Any unused legacy CV/page CSS rules whose classes have no callers in HTML, JS, or print CSS (audit performed in Task 15).
