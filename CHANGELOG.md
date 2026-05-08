# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed

- Favicon redesigned to match the editorial palette: ink ground (`#1a0f08`), vermilion `>_` glyph (`#ff4d2e`), thicker underscore as a solid rounded rect for legibility at 16x16 tab size. Replaces the green-on-black terminal favicon from the prior design.
- `homepage.tagline` removed from `i18n/en.json` and `i18n/zh.json`. The field is still consumed by the hero renderer but is now expected to come from a config layer (`cv.json`, `cv-jobs/<job>.json`, or private `config/local.json`) rather than the i18n demo base. Hero degrades gracefully when no tagline is configured.
- Topbar wordmark and console chrome strip no longer hardcode `~/zijian`. Both derive the handle at runtime from `homepage.prompt` (extracts the part before `@` from a `<user>@<host>:...` pattern) via a new `getHandle(data)` helper exported from `home/config.js`. `index.html` now renders an empty `.console-chrome-id` placeholder filled by `initConsole`.
- Document title prioritises `profile.name` over `homepage.title` and `site.title`, and the static `<title>` in `index.html` is empty so the tab no longer flashes "OhMyCV" on load before settling on the rendered name.

- Footer contact links: address-like fields (label `Address`, `Location`, or `地址`) now link to a Google Maps search of the value (`https://www.google.com/maps/search/?api=1&query=<encoded>`). Email (`Email` / `邮箱`) and phone (`Phone` / `Tel` / `电话`) still resolve to `mailto:` and `tel:`. All `https://` links in the contact row open in a new tab (`target="_blank" rel="noopener"`); native `mailto:` / `tel:` keep no target.

### Removed

- The entire `site` config block (`title`, `print_filename`, `download_label`). Document title now comes from `profile.name` only; `print_filename` moves to `homepage.print_filename`; `download_label` is removed (the topbar uses a hardcoded `CV` label). Migrated `i18n/en.json`, `i18n/zh.json`, `config/cv-jobs/software-engineer.json`, `config/local.example.json`, and the build script.
- `homepage.title` field. It duplicated `profile.name` and is now sourced from `profile.name` exclusively for the document title.

### Docs

- README adds a `Building the CV PDF` section documenting the XeTeX prerequisite (TeX Live / MacTeX / MiKTeX with `xelatex`, `xeCJK`, and CJK fonts), per-platform install commands, and a verification step.
- README `i18n fields` table rewritten to reflect the consolidated schema (no `site` block, no `homepage.title`, derivation rules for `homepage.meta` and `homepage.selected`).
- Separator characters in the hero meta line, topbar language toggle, and footer contact list changed from middle-dot `·` to forward-slash `/`. Aligns with the URL-segment feel of the wordmark `~/zijian` and the mono-friendly editorial aesthetic.
- `home/render-selected.js` derives default cards from `experience.jobs[0]` plus the first two `open_source.custom_projects` entries when `homepage.selected` is not explicitly set. Removes the need to duplicate role/project content in the homepage block.
- `home/render-hero.js` derives the meta line from `experience.jobs[0].location` (or the first non-email/phone/url contact value) plus `experience.jobs[0].title` when `homepage.meta` is not explicitly set.
- Removed the demo `homepage.selected` and `homepage.meta` arrays from `i18n/en.json` and `i18n/zh.json`. Real content now flows from existing CV fields (which are populated by `config/local.json` for the actual user); demo i18n still drives the fake `Alex Chen` persona via the same fields.
- Top-bar `↓ CV` link is no longer rendered when no PDF resolves for the active job — previously it pointed at `#`, which made `download` save the current page as HTML.
- Top-bar CV link now opens the PDF inline in a new tab (`target="_blank" rel="noopener"`) instead of forcing a download (`download` attribute removed). Browsers render the PDF natively; users can still save from the built-in viewer toolbar. Label changed from `↓ CV` to `CV ↗` to match the open-in-new-tab convention.
- Footer section label changed from `// elsewhere` to `// get in touch`. Section id and CSS class (`#elsewhere`, `.elsewhere`) are unchanged.

### Removed

- Footer dual-language CV download list (`↓ cv · en` / `↓ cv · zh`). The top-bar CV link is the single canonical download affordance; the footer kept contact list and colophon. Dead `.cv-list` / `.cv-link` CSS removed.
- Footer colophon line (`built with terminal & care · 2026 · MIT`) and the supporting `homepage.colophon` i18n field. The footer now ends after the contact list. Removed the `.colophon` CSS rule, the colophon Playwright test, and the colophon row from the README i18n-fields table.

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
