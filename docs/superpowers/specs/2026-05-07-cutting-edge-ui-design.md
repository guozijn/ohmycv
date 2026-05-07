# OhMyCV — Cutting-edge UI/UX redesign

**Status:** approved (design)
**Date:** 2026-05-07
**Owner:** guozijn

## Goal

Elevate the OhMyCV homepage to a cutting-edge, distinctive, editorially-designed landing page while preserving the terminal as a featured interactive component and keeping the LaTeX-generated PDF CVs unchanged. The redesign affects only the screen-facing landing experience (`index.html`, `home.js`, `style.css`); it does not touch the PDF build pipeline.

## Non-goals

- Re-introducing an HTML CV view to replace the PDFs.
- Adding a build tool (bundler, framework, transpiler).
- Adding runtime dependencies.
- Changing the existing JSON i18n + override-merge architecture.
- Changing the terminal's command vocabulary or behavior contract.

## Design decisions (locked)

| Decision | Choice |
|---|---|
| Direction | Hybrid — designed editorial shell with the terminal as a featured set-piece. |
| Content scope | Curated narrative — hero, console anchor, selected (3 cards), about, footer. |
| Aesthetic | Editorial Mono. |
| Type system | `Geist` 700 (display), `Fraunces` 144 italic 300 (italic accent), `Geist Mono` (UI / mono). |
| Palette | Vermilion `#ff4d2e`, espresso `#1a0f08`, cream `#f1ece4`, ink-soft = espresso @ 0.65, rule = espresso @ 0.18. |
| Layout | Console Anchor — single editorial column, terminal as visual centerpiece directly under the hero. |
| Bilingual | English uses Fraunces italic; Chinese swaps to a Source Han Serif / Noto Serif SC weight-contrast pairing in vermilion. |
| Build chain | Stay no-build. ES modules. Webfonts via Google Fonts CDN with preconnect + `display=swap`. |
| Accessibility target | WCAG 2.1 AA. |

## Information architecture

The page is a single editorial column at `min(720px, 100% - 48px)`, in this top-to-bottom order:

1. **Top bar** — wordmark `~/zijian` (mono), language toggle `EN · ZH`, "↓ CV" link.
2. **Hero** — name (Geist 700, very large) + italic tagline (Fraunces 144). Meta line below in mono: `melbourne · software engineer · en / zh`.
3. **Console anchor** — the existing terminal, restyled to belong inside the editorial layout. Always interactive on first paint. Min height `clamp(280px, 38vh, 420px)`.
4. **Selected** — 3 vertical editorial cards, separated by 1px dashed top rules. Each: kind tag + meta (mono), title (Geist 700 24px), one-sentence body (15px), vermilion verb-link (mono).
5. **About** — single tight paragraph drawn from `profile.summary`, max measure ~58ch, with at most one Fraunces-italic emphasized clause.
6. **Footer** — contact links (mono, dot-separated), CV download row (`↓ cv · en` / `↓ cv · zh`), and a one-line colophon.

Section breaks are 1px dashed `--rule` hairlines preceded by mono labels (e.g. `// selected`, `// about`, `// elsewhere`). Section gaps use `clamp(48px, 7vh, 96px)`.

## Visual tokens

```css
:root {
  /* Color */
  --paper: #f1ece4;
  --ink: #1a0f08;
  --accent: #ff4d2e;
  --ink-soft: color-mix(in srgb, var(--ink) 65%, transparent);
  --rule: color-mix(in srgb, var(--ink) 18%, transparent);

  /* Type */
  --font-display: 'Geist', system-ui, -apple-system, sans-serif;
  --font-italic: 'Fraunces', 'Source Han Serif SC', 'Noto Serif SC', serif;
  --font-mono: 'Geist Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace;

  /* Layout */
  --col: min(720px, 100% - 48px);
  --gap-section: clamp(48px, 7vh, 96px);

  /* Motion */
  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
}
```

## Hero + console anchor

### Hero

- Name: `clamp(56px, 9vw, 120px)`, `Geist 700`, `letter-spacing: -0.035em`, `line-height: 0.92`.
- Tagline: `Fraunces` italic, `font-variation-settings: 'opsz' 144`, weight 300, `clamp(28px, 4.5vw, 56px)`, color `--accent`. Source: new i18n field `homepage.tagline`.
- Meta line: mono, 13px, `--ink-soft`. Source: new i18n field `homepage.meta` (array of strings joined with mono dots).
- Entry motion: name and tagline fade-in + 8px rise, staggered 80ms, 600ms total, `--ease-out`. Disabled under `prefers-reduced-motion`.
- A 1px dashed rule sits between the meta line and the console anchor.

### Console anchor

The existing terminal stays fully functional; styling is replaced to fit the editorial shell.

- Container: background `--ink`, 8px corner radius, 1px inner highlight, drop shadow `0 18px 40px rgba(26,15,8,0.18)`.
- Chrome strip: a single mono line `~/zijian — bash` on the left, a small vermilion live-pulse `●` on the right. Replaces the macOS traffic-light dots.
- Body: `Geist Mono` 14/22, text `#ffd9c8`, prompts and key tokens in `--accent`.
- Caret: vermilion, 1.6× height block, blinking on focus only at 1.05s cadence.
- First-paint greeting: types in the existing `homepage.greeting` text at ~25 chars/sec, then yields to the interactive prompt. Replays only on first load per session.
- Behavior preserved (already in `home.js`): every existing command (`cv`, `whoami`, `help`, language switch, contact links) keeps working unchanged; click-anywhere-on-console focuses the input; Up/Down traverse command history; Tab completes commands.
- Behavior added: Escape clears the current line.
- Live pulse: 2.4s opacity breathing animation, vermilion. Disabled under `prefers-reduced-motion`. `aria-hidden="true"`.

## Selected, about, footer

### Selected

- Section label `// selected`, mono 11px letter-spaced 0.14em, `--ink-soft`.
- 3 vertical cards in the column with 24px gap, separated by 1px dashed top rules, no card backgrounds.
- Card structure:
  - Top row: kind tag (mono 12px, e.g. `role`, `project`, `now`) on the left; date or status on the right (mono 12px, `--ink-soft`).
  - Title: `Geist 700` 24px.
  - Body: `Geist 400` 15px line-height 1.55, `--ink-soft`. One sentence, 18–30 words.
  - Verb link: mono 13px, `--accent`, no underline; underline grows on hover over 160ms; external link gets a small icon.
- Hover: title shifts to `--accent` over 200ms.
- Source: new i18n field `homepage.selected` — array of objects `{ kind, meta, title, body, link: { label, href } }`. If fewer than 3 entries are configured, render whatever exists. May be overridden per job in `config/cv-jobs/<job>.json` under `homepage.selected`.

### About

- Section label `// about`.
- Single paragraph, `Geist 400` 17px line-height 1.55, `--ink-soft`, max measure ~58ch.
- Source: existing `profile.summary`. Optional new field `profile.summary_emphasis` highlights a single clause as a Fraunces-italic `<em>` for editorial rhythm; when absent, the paragraph renders plain.

### Footer

- Section label `// elsewhere`.
- Row 1 — contact: inline mono links from `profile.contact_info`, separated by mono dots. Vermilion on hover. Respects `profile.cv_hidden_contact_fields`.
- Row 2 — CV: `↓ cv · en` and `↓ cv · zh`, vermilion. `href`s come from the existing `manifest.json` lookup already implemented in `home.js`.
- Colophon: single mono line, 11px, `--ink-soft`. Source: new optional i18n field `homepage.colophon`.
- 96px breathing room above and below the footer.

### Mobile (≤ 640px)

- Column padding tightens to 20px.
- Hero name scales down via the `clamp()` already in the spec.
- Console anchor min-height drops to `clamp(220px, 50vh, 320px)`.
- Selected card titles shrink to 20px; cards stay vertical.
- Top bar collapses: wordmark + language toggle stay; "↓ CV" appears as a third pill.

## Motion

Restrained editorial — calm with deliberate moments of life.

| Surface | Behavior |
|---|---|
| Hero name + tagline | Fade + 8px rise, stagger 80ms, 600ms, `--ease-out`. Once per page load. |
| Meta line | Fade, +160ms delay. |
| Console anchor | Soft scale (0.98 → 1) + fade, 500ms. Greeting begins typing once chrome is fully in. |
| Live pulse | 2.4s opacity breath in vermilion. |
| Console caret | 1.05s blink, only when input is focused. |
| Selected cards | Reveal-on-scroll: fade + 6px rise on enter, IntersectionObserver threshold 0.2. |
| Card hover | Title color ink → vermilion, 200ms. |
| Verb link hover | Underline grows in 160ms. |
| Link hover | 120ms underline; no transform. |

`prefers-reduced-motion: reduce` disables all entry animations, scroll reveals, the live pulse, and the caret blink. Hover color transitions remain (color is not motion).

There is no parallax, no scroll-jacking, no mouse-tracking ambient lighting.

## Bilingual handling

The Fraunces italic accent is an English-only mechanism. Chinese typography has no native italic equivalent.

- `<html lang>` switches via the existing language toggle and persists in localStorage (existing behavior).
- `lang="en"`: italic accents render in `Fraunces` 144 italic, vermilion.
- `lang="zh"`:
  - Tagline and `<em>` swap to `Source Han Serif SC` / `Noto Serif SC`, weight 300, color vermilion. `font-style: italic` is removed via a `:lang(zh)` override on `.tagline` and `.about-emphasis`. Same size and rhythm as the English version.
  - Mono labels (`// selected`, `// about`, `// elsewhere`) stay Latin in both languages — they are code-style markers, not translated copy.
  - Numbers, dates, and locations stay in `Geist Mono` in both languages.
- CJK webfont weights are loaded only when `lang="zh"` becomes active. Mechanism: the language toggle injects a Google Fonts `<link>` for the CJK family on first switch to zh, then never again. English-only visitors never download CJK weights.
- All webfonts use `font-display: swap`. Hero uses metric-overrides where available to minimize CLS during the swap.
- Fallback: if `Fraunces` fails to load within 1.5s (measured via `document.fonts.ready` race), the tagline renders in `Geist` 400 italic in vermilion as a graceful degradation.

## Accessibility (WCAG 2.1 AA)

- **Contrast.** Espresso on cream is ~14:1 (safe). Vermilion on cream is ~3.4:1 — passes for large text and graphical UI components but **not** for body. Constraint: vermilion is used only for headings, links, accents, and the italic tagline; never for body paragraphs. Ink-soft on cream is ~6:1 (safe for body).
- **Focus.** Visible 2px vermilion outline with 2px offset on every focusable element. Console input has an additional inner glow when focused.
- **Keyboard.** Tab order follows DOM order: top bar → console input → selected card links → contact links → CV links. The console input does not trap focus; Shift+Tab and Escape exit cleanly.
- **Screen readers.** `aria-live="polite"` on terminal output (preserved from current). `aria-label`s on language toggle, top-bar CV link, and footer CV links. Decorative live-pulse marked `aria-hidden="true"`.
- **Type sizing.** All text uses `clamp()`; no fixed pixel-only sizes below 13px. Text-zoom up to 200% reflows without horizontal scroll.
- **Motion.** `prefers-reduced-motion` respected globally as listed.
- **Color independence.** Vermilion is never the only signal. Links underline on hover; focus state is visible regardless of color.

## Tech approach

### Build chain

Stay no-build. The site loads JSON via `fetch` and renders with vanilla JS today; the redesign keeps that posture.

- ES modules via `<script type="module" src="./home.js">`.
- Webfonts loaded via Google Fonts CDN `<link>` with `<link rel="preconnect">` and `display=swap`.
- No new runtime dependencies. No `package.json` changes for runtime code (Playwright is the only addition, and only for tests).

### File layout (target)

```
index.html
style.css                  # single file organized as CSS @layers (tokens, base, landing, console, print, utilities)
home.js                    # entry; orchestrates loading and rendering; ≤ ~150 lines
home/                      # new — split modules
  config.js                # config / i18n / PDF-manifest loaders (extracted from current home.js)
  render-hero.js           # hero block and meta line
  render-selected.js       # selected cards
  render-about.js          # about paragraph
  render-footer.js         # contact + CV links + colophon
  render-topbar.js         # top bar with language toggle and CV link
  console.js               # the terminal — current command system, restyled, kept feature-complete
  i18n.js                  # language toggle, CJK font lazy-load, lang attribute swap
i18n/en.json               # extended: homepage.tagline, homepage.meta, homepage.selected, homepage.colophon
i18n/zh.json               # extended with the same fields
config/cv.json             # unchanged
config/cv-jobs/main.json   # may add per-job homepage.selected overrides
docs/superpowers/specs/    # this design doc
tests/landing.spec.js      # new — Playwright smoke tests
```

The current `home.js` (~760 lines) is split because growing it further is the wrong direction. Each new module aims to stay under ~200 lines and do one thing.

### CSS architecture

```css
@layer tokens, base, landing, console, print, utilities;

@layer tokens   { /* :root custom properties */ }
@layer base     { /* element resets, body, lang rules */ }
@layer landing  { /* top bar, hero, selected, about, footer */ }
@layer console  { /* the terminal anchor — replaces today's .terminal-* */ }
@layer print    { /* unchanged from today's @media print */ }
@layer utilities{ /* .visually-hidden, :lang() helpers */ }
```

Cascade is explicit and predictable; print rules cannot be accidentally overridden by landing rules; tokens flow through every layer.

### Performance budget

| Metric | Budget |
|---|---|
| LCP (4G, Moto G4 simulation) | ≤ 1.8s |
| CLS | ≤ 0.05 |
| Initial transferred bytes (en) | ≤ 200 KB (HTML + CSS + JS + Latin webfonts) |
| Initial transferred bytes (zh) | ≤ 400 KB (Latin loads first; CJK lazy-loaded after toggle) |
| Main-thread JS execution (first load) | ≤ 100 ms |

## Testing approach

The repository does not currently have a test suite. The redesign adds a small targeted set rather than a heavy framework.

1. **Playwright smoke tests** — new `tests/landing.spec.js`:
   - Page loads at `/` and renders hero name, tagline, console, ≥1 selected card, footer.
   - Language toggle swaps `<html lang>` and updates the tagline mechanism (italic Fraunces in en, serif weight contrast in zh).
   - Console accepts `cv` and triggers a click on the en PDF link.
   - Console accepts `whoami` and renders a non-empty response.
   - "↓ CV" link in the top bar resolves to a 200 PDF response.
   - `prefers-reduced-motion: reduce` disables entry animations (verified via the absence of the `data-motion="entered"` attribute on hero after first paint).
2. **Manual visual checklist** — `docs/superpowers/specs/2026-05-07-checklist.md` (created during implementation):
   - Hero rhythm at 1280×800, 768×1024, 375×667.
   - Bilingual hero balance (en italic vs zh serif weight contrast).
   - Console focus state, caret blink, live pulse breathing.
   - Selected card hover and reveal-on-scroll.
3. **Lighthouse CI run** — manual, documented in README. Verifies the performance budget at release time.
4. **No unit tests** for render modules — they are presentation-layer functions reading JSON. Playwright covers behavior end-to-end, which is what actually breaks.

The existing PDF build pipeline (`scripts/build-cv-pdf.mjs`, `cv/generated/manifest.json`) is unchanged.

## Open follow-ups (out of scope for this design)

- Per-job `homepage.selected` curation conventions (which roles or projects to surface for which job target).
- Optional dark mode — not required for the redesign; tokens are written so a dark theme can be added later by overriding `--paper` and `--ink`.
- Optional OG / Twitter card image generation reflecting the new identity.

## i18n field additions (summary)

The redesign requires the following new i18n fields. All are optional and degrade gracefully when absent.

| Field | Type | Used by |
|---|---|---|
| `homepage.tagline` | string | Hero |
| `homepage.meta` | string[] | Hero meta line |
| `homepage.selected` | object[] (`{ kind, meta, title, body, link: { label, href } }`) | Selected section |
| `homepage.colophon` | string | Footer |
| `profile.summary_emphasis` | string (substring of `profile.summary`) | About emphasis |

Existing fields used unchanged: `profile.name`, `profile.summary`, `profile.contact_info`, `profile.cv_hidden_contact_fields`, `homepage.greeting`, `homepage.prompt`, `site.title`, `site.download_label`.
