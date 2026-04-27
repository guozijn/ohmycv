# OhMyCV

OhMyCV is a static multilingual CV renderer. It keeps content in JSON, supports language switching, job-specific overrides, local private overrides, a terminal-style homepage, and print-friendly PDF output.

The repository ships with a fake bilingual CV for `Alex Chen`; replace it with your own data before publishing a personal site.

## Run locally

Because the app loads JSON with `fetch`, serve the folder over HTTP:

```bash
python3 -m http.server 4173
```

Open:

```text
http://localhost:4173/
http://localhost:4173/cv/
```

## Content files

- `i18n/en.json`: English CV and homepage content.
- `i18n/zh.json`: Chinese CV and homepage content.
- `config/cv.json`: commit-safe shared settings, including the default `active_job`.
- `config/cv-jobs/<job-name>.json`: optional job-specific overrides.
- `config/local.json`: private local overrides, ignored by git.
- `config/local.example.json`: example private override file.

The language JSON files are the main schema. You can customize names, contact fields, homepage title and prompt, section titles, education, skills, jobs, projects, certifications, publications, awards, referees, download button text, and print filename.

## Override order

Configuration is merged in this order:

```text
i18n/<lang>.json
> selected job override
> global fields from config/local.json
> config/local.json languages.<lang>
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

For a one-off preview:

```text
http://localhost:4173/cv/?job=software-engineer
```

## Deploy

Deploy the directory as a static site. No build step is required.
