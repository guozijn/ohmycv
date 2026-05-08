# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Hero entry stagger (name -> tagline -> meta) with 80/160ms offsets, 600ms `--ease-out`. Disabled under `prefers-reduced-motion`.
- Global `:focus-visible` outline in vermilion across the page; explicit version on the console input.
- Bilingual handling (`home/i18n.js`):
  - Persisted language preference in `localStorage` (`ohmycv:lang`).
  - CJK serif font (Noto Serif SC) lazy-loaded only on first Chinese activation.
  - `:lang(zh)` overrides on `.hero-tagline`, `.hero-name`, and `.about-emphasis` swap from Fraunces italic to Noto Serif SC weight 300 in vermilion (no italic — Chinese typography has no italic equivalent).
- About paragraph (`home/render-about.js`) drawn from `profile.summary`. If `profile.summary_emphasis` is a substring of the summary, the renderer wraps it in an italic Fraunces vermilion `<em class="about-emphasis">`.
- Footer (`home/render-footer.js`) with contact list (mono, dot-separated), dual-language CV download links (rendered when `__cv_pdf_hrefs.en` / `.zh` are populated), and a colophon line.
- Selected work section (`home/render-selected.js`): editorial cards rendered from `homepage.selected`, separated by 1px dashed top rules. IntersectionObserver-driven fade+rise reveal on scroll; reduced-motion shows cards immediately. Title hover transitions to vermilion; verb-link hover grows an underline.
- Console live-pulse breathing animation (2.4s, vermilion). Disabled under `prefers-reduced-motion`.
- Escape key clears the current console input line.
- Console focus-within state: vermilion inner ring + deeper shadow when the input is focused.
- Hero block (`home/render-hero.js`) with name (Geist 700 display), italic Fraunces tagline in vermilion, and a mono meta line. Sourced from `profile.name`, `homepage.tagline`, `homepage.meta`.
- Top bar (`home/render-topbar.js`) with wordmark `~/zijian`, EN/ZH language toggle buttons, and a "&#x2193; CV" download link. Language buttons trigger a full re-render via the bootstrap.
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
