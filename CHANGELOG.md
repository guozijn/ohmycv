# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- New optional i18n fields for the editorial homepage: `homepage.tagline`, `homepage.meta`, `homepage.selected`, `homepage.colophon`, `profile.summary_emphasis`. Added with sample content in both `en.json` and `zh.json`.
- Playwright smoke tests (`tests/landing.spec.js`) covering terminal render, greeting, command handling (`whoami`, `cv`), and locale-driven `html lang` attribute.
- Vermilion · Editorial visual token set (`--paper`, `--ink`, `--accent`, `--ink-soft`, `--rule`, type stack, motion easing).
- Geist, Geist Mono, and Fraunces webfonts loaded from Google Fonts at startup. CJK fonts deferred until Chinese is activated (Task 13).
- Editorial shell scaffold: `index.html` restructured into `topbar`, `hero`, `console`, `selected`, `about`, `elsewhere` sections inside `<main class="landing">`. Sections are placeholders for Tasks 8-12.
- New console anchor styling: dark espresso panel, mono `~/zijian — bash` chrome strip with a vermilion live pulse (replaces the macOS traffic-light dots).

### Changed

- Extracted config and i18n loaders from `home.js` into `home/config.js`. Behavior unchanged.
- Extracted terminal command system from `home.js` into `home/console.js` behind a single `initConsole({ data })` entry. `home.js` is now an entry orchestrator at 54 lines.
- Reorganized `style.css` into explicit CSS `@layer`s (tokens, base, landing, console, print, utilities). No visual change.
- Restyled the existing terminal output/input/prompt to use the editorial monospace stack and vermilion accents on the cream-on-ink color system.
