# OhMyCV

OhMyCV is a static multilingual CV renderer. It keeps content in JSON, supports language switching, job-specific overrides, local private overrides, a terminal-style homepage, and XeLaTeX-generated PDF output.

The repository ships with a fake bilingual CV for `Alex Chen`; replace it with your own data before publishing a personal site.

## Run locally

Because the app loads JSON with `fetch`, serve the folder over HTTP:

```bash
node scripts/build-cv-pdf.mjs
python3 -m http.server 4173
```

Open:

```text
http://localhost:4173/
```

## Building the CV PDF

`scripts/build-cv-pdf.mjs` shells out to `xelatex` (XeTeX engine) to compile the LaTeX sources for both languages and every job target. You need a working TeX distribution with XeTeX and CJK font support installed before the script can produce PDFs.

- **macOS:** install [MacTeX](https://www.tug.org/mactex/) (full distribution) or BasicTeX plus the additional packages `xetex`, `fontspec`, `xeCJK`, `ctex`, `titlesec`, `enumitem`, `needspace`, and `geometry`.
- **Linux (Debian/Ubuntu):** `sudo apt install texlive-xetex texlive-lang-chinese texlive-fonts-recommended texlive-latex-extra`.
- **Linux (Arch):** `sudo pacman -S texlive-xetex texlive-langchinese texlive-fontsrecommended texlive-latexextra`.
- **Windows:** install [TeX Live](https://tug.org/texlive/) or [MiKTeX](https://miktex.org/) with the same packages.

Verify the toolchain is reachable:

```bash
xelatex --version
```

If `xelatex` is not on `PATH`, the build script will fail at the first job target. The CV uses Inter for Latin text and Source Han Sans SC / 思源黑体 for Chinese where available. The Chinese CV needs CJK fonts — `xeCJK` plus a sans CJK font (Source Han Sans SC, Noto Sans CJK SC, PingFang SC, Microsoft YaHei, or system fallbacks) — otherwise the zh build produces blank glyphs.

The compiled PDFs are written to `cv/generated/` (gitignored) along with a `manifest.json` consumed by the homepage to resolve the top-bar `CV ↗` link to the right file per language.

## Tests

```bash
npm install
npm run test:install   # one-time: download Chromium for Playwright
npm test               # run smoke tests
```

The Playwright config in `playwright.config.js` automatically starts `python3 -m http.server 4173`.

## Performance budget

The landing page targets:

- LCP <= 1.8s on simulated 4G (Moto G4) — verify periodically via Chrome DevTools Lighthouse.
- CLS <= 0.05.
- Initial transferred bytes <= 200 KB on English (Latin webfonts only) and <= 400 KB on Chinese (CJK weights are lazy-loaded on first language switch).

## i18n fields

The homepage consumes these fields from the merged data:

| Field | Type | Source / use |
|---|---|---|
| `profile.name` | string | Hero name and document title. |
| `profile.contact_info` | object | Footer contact row; first non-email/phone/url value also feeds the hero meta line as a location fallback. |
| `profile.summary` | string | About paragraph. |
| `profile.summary_emphasis` | string (optional) | Substring of `profile.summary` rendered as an italicized emphasis. |
| `homepage.prompt` | string | Terminal prompt and source for the wordmark / chrome handle (`<user>@<host>:...` pattern; the part before `@` becomes `~/<handle>`). |
| `homepage.greeting` | string | Boot line printed in the terminal on first paint. |
| `homepage.print_filename` | string | Base filename for the LaTeX-compiled PDF (e.g. `Zijian-Guo-CV`). |
| `homepage.links` | object[] | Extra `{ command, url, label }` link entries surfaced as terminal commands. |
| `homepage.tagline` | string (optional) | Italicized accent below the name. |
| `homepage.meta` | string[] (optional) | Explicit mono meta line. Falls back to `experience.jobs[0].location` + `experience.jobs[0].title` when absent. |
| `homepage.selected` | object[] (optional) | Selected-work cards `{ kind, meta, title, body, link?: { label, href } }`. Falls back to one entry from `experience.jobs[0]` plus up to two from `open_source.custom_projects` when absent. |
| `experience.jobs[]` | object[] | Source for the printed CV and the derived selected `role` card. |
| `open_source.custom_projects[]` | object[] | Source for derived selected `project` cards. |

## Content files

- `i18n/en.json`: English CV and homepage content.
- `i18n/zh.json`: Chinese CV and homepage content.
- `config/cv.json`: commit-safe shared settings, including the default `active_job`.
- `config/cv-jobs/main.json`: optional primary CV content layer used before job-specific overrides.
- `config/cv-jobs/<job-name>.json`: optional job-specific overrides.
- `config/local.json`: private local overrides, ignored by git.
- `config/local.example.json`: example private override file.

The language JSON files are the main schema. You can customize names, contact fields, the terminal prompt and greeting, section titles, education, skills, jobs, projects, certifications, publications, awards, referees, and the print filename. The browser tab title is taken from `profile.name`; there is no separate site/homepage title field.

The homepage links to prebuilt PDFs from `cv/generated/`. Run
`node scripts/build-cv-pdf.mjs` after changing CV content. The script writes the
generated `.tex` sources and compiled PDFs for the base CV and every
`config/cv-jobs/*.json` target.

If you want to keep the shipped `i18n/*.json` sample CV untouched, put public shared overrides in `config/cv.json` instead. Use top-level fields for language-independent values, or `languages.<lang>` for language-specific content. Use `config/local.json` only for private machine-local data that should not be committed.

For a cleaner personal setup, keep `config/cv.json` as a selector-only file and
put the main CV content in `config/cv-jobs/main.json`. Job-specific files then
only need to contain differences from `main`.

Example `config/cv.json`:

```json
{
  "active_job": "software-engineer",
  "profile": {
    "cv_hidden_contact_fields": ["Blog", "Github", "LinkedIn"]
  },
  "languages": {
    "en": {
      "profile": {
        "name": "Your Name"
      }
    },
    "zh": {
      "profile": {
        "name": "你的名字"
      }
    }
  }
}
```

`profile.cv_hidden_contact_fields` hides contact fields only on the CV page. The homepage can still read the same `profile.contact_info` values to build terminal commands and quick links.

## Override order

Configuration is merged in this order:

```text
i18n/<lang>.json
> shared/global fields from config/cv.json
> shared language fields from config/cv.json languages.<lang>
> selected job override
> private/global fields from config/local.json
> private language fields from config/local.json languages.<lang>
```

Job selection priority:

```text
URL ?job=... > window.CV_JOB > body data-job > config/local.json > config/cv.json
```

Objects are merged recursively. Arrays are replaced as complete values.

## Private local setup

Create a private override file:

```bash
cp config/local.example.json config/local.json
```

Then edit `config/local.json` with personal contact details or machine-local settings. This file is ignored by git.

You can also set the active job override from the command line:

```bash
node scripts/set-cv-job.mjs software-engineer
CV_JOB=software-engineer node scripts/set-cv-job.mjs
```

To copy a `config/` directory from another checkout or private folder into this repository:

```bash
node scripts/copy-config.mjs ../my-private-cv
node scripts/build-cv-pdf.mjs
```

For a one-off preview:

```text
http://localhost:4173/
```

## Google Analytics

Set `google_analytics_id` to a GA4 measurement ID in `config/cv.json` or `config/local.json`:

```json
{
  "google_analytics_id": "G-XXXXXXXXXX"
}
```

The homepage will inject the gtag script automatically. If the field is absent or empty, no tracking code is added.

## Deploy

Deploy it to your cloud server through github ci, please refer to the deploy.example.yml. You can create your own repo for storing the cv config and github ci workflow, copy the deploy.example.yml to your repo's .github/workflows/.
