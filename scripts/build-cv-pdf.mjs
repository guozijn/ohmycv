import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'cv/generated');
const buildDir = resolve(root, '.cv-build');
const langs = ['en', 'zh'];
const mainJobName = 'main';
const buildDate = process.env.CV_BUILD_DATE || formatDate(new Date());

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
mkdirSync(buildDir, { recursive: true });

const sharedConfig = readJson(resolve(root, 'config/cv.json')) || {};
const localConfig = readJson(resolve(root, 'config/local.json')) || {};
const mainJobConfig = readJobConfig(mainJobName);
const jobNames = collectJobNames();

const targets = jobNames.length
  ? jobNames.map(jobName => ({ slug: jobName, jobName }))
  : [{ slug: mainJobName, jobName: mainJobName }];
const manifest = {
  generated_at: new Date().toISOString(),
  build_date: buildDate,
  jobs: {}
};

for (const target of targets) {
  manifest.jobs[target.slug] = {};
  for (const lang of langs) {
    const data = loadCvData(lang, target.jobName);
    const tex = renderLatex(data, lang);
    const filenameBase = safeFilename(data.site?.print_filename || data.profile?.name || target.slug);
    const outputBase = `${filenameBase}-${lang}-${buildDate}`;
    const texName = `${outputBase}.tex`;
    const pdfName = `${outputBase}.pdf`;
    const texPath = resolve(buildDir, texName);

    writeFileSync(texPath, tex);
    execFileSync('xelatex', [
      '-interaction=nonstopmode',
      '-halt-on-error',
      '-output-directory',
      buildDir,
      texPath
    ], { cwd: root, stdio: 'inherit' });

    const pdfPath = resolve(buildDir, pdfName);
    const outPdfPath = resolve(outDir, pdfName);
    const outTexPath = resolve(outDir, texName);
    rmSync(outPdfPath, { force: true });
    rmSync(outTexPath, { force: true });
    writeFileSync(outTexPath, readFileSync(texPath));
    writeFileSync(outPdfPath, readFileSync(pdfPath));
    manifest.jobs[target.slug][lang] = {
      pdf: `cv/generated/${pdfName}`,
      tex: `cv/generated/${texName}`,
      filename: pdfName,
      print_filename: data.site?.print_filename || ''
    };
    console.log(`Built ${relativeFromRoot(outPdfPath)}`);
  }
}

writeFileSync(resolve(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

function collectJobNames() {
  const names = new Set();
  const activeJob = getConfiguredJobName({ shared: sharedConfig, local: localConfig });
  names.add(mainJobName);
  if (activeJob) names.add(activeJob);

  const jobDir = resolve(root, 'config/cv-jobs');
  if (existsSync(jobDir)) {
    for (const entry of readdirSync(jobDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        names.add(basename(entry.name, '.json'));
      }
    }
  }

  return [...names].filter(name => /^[a-z0-9_-]+$/i.test(name)).sort();
}

function loadCvData(lang, jobName) {
  const base = readJson(resolve(root, `i18n/${lang}.json`)) || {};
  const shared = applyConfigOverrides(base, sharedConfig, lang);
  const main = applyJobOverride(shared, mainJobConfig, lang);
  const job = jobName && jobName !== mainJobName ? readJobConfig(jobName) : null;
  const withJob = applyJobOverride(main, job, lang);
  return applyConfigOverrides(withJob, localConfig, lang);
}

function readJobConfig(jobName) {
  return (
    readJson(resolve(root, `config/cv-jobs/${jobName}.json`)) ||
    readJson(resolve(root, `i18n/jobs/${jobName}.json`))
  );
}

function applyJobOverride(dict, override, lang) {
  if (!override) return dict;
  const { languages, ...globalOverrides } = override;
  const langOverrides = languages?.[lang] || override[lang] || {};
  return mergeCvData(mergeCvData(dict, globalOverrides), langOverrides);
}

function applyConfigOverrides(dict, config, lang) {
  if (!config) return dict;
  const { languages, active_job, cv_job, job, ...globalOverrides } = config;
  const langOverrides = languages?.[lang] || {};
  return mergeCvData(mergeCvData(dict, globalOverrides), langOverrides);
}

function mergeCvData(base, overrides) {
  if (!isPlainObject(overrides)) return base;
  const merged = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (isPlainObject(value) && isPlainObject(merged[key])) {
      merged[key] = mergeCvData(merged[key], value);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

function getConfiguredJobName(config) {
  return (
    config.local?.active_job ||
    config.local?.cv_job ||
    config.local?.job ||
    config.shared?.active_job ||
    config.shared?.cv_job ||
    config.shared?.job ||
    ''
  ).trim();
}

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function relativeFromRoot(path) {
  return path.replace(`${root}/`, '');
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function safeFilename(value) {
  return String(value || 'CV')
    .trim()
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'CV';
}

function renderLatex(data, lang) {
  const isZH = lang === 'zh';
  const colon = isZH ? '：' : ':';
  const contact = renderContact(data.profile, isZH);
  const summary = text(data.profile?.summary);

  return String.raw`\documentclass[10pt,a4paper]{article}
\usepackage[a4paper,margin=10mm]{geometry}
\usepackage{fontspec}
\usepackage{xeCJK}
\usepackage{enumitem}
\usepackage{titlesec}
\usepackage{xcolor}
\usepackage[hidelinks]{hyperref}
\usepackage{tabularx}
\usepackage{array}
\usepackage{needspace}
\usepackage{ifthen}
\IfFontExistsTF{TeX Gyre Termes}{\setmainfont{TeX Gyre Termes}}{
  \IfFontExistsTF{Liberation Serif}{\setmainfont{Liberation Serif}}{}
}
\IfFontExistsTF{Noto Serif CJK SC}{\setCJKmainfont{Noto Serif CJK SC}}{
  \IfFontExistsTF{Songti SC}{\setCJKmainfont{Songti SC}}{
    \IfFontExistsTF{SimSun}{\setCJKmainfont{SimSun}}{\setCJKmainfont{AR PL UMing CN}}
  }
}
\definecolor{accent}{HTML}{0070C9}
\definecolor{textgray}{HTML}{333333}
\pagestyle{empty}
\setlength{\parindent}{0pt}
\setlength{\parskip}{2pt}
\setlist[itemize]{leftmargin=*,topsep=1pt,itemsep=1pt,parsep=0pt,partopsep=0pt}
\titleformat{\section}{\large\bfseries\color{textgray}}{}{0pt}{}[\titlerule]
\titlespacing*{\section}{0pt}{6pt}{3pt}
\newcommand{\cvdates}[1]{\hfill{\footnotesize #1}}
\newcommand{\entryhead}[3]{\Needspace{3\baselineskip}\textbf{#1}\ifthenelse{\equal{#2}{}}{}{ -- #2}\cvdates{#3}\\}
\begin{document}
{\centering
  {\LARGE\bfseries ${text(data.profile?.name || data.site?.title || 'CV')}}\\[3pt]
  {\footnotesize ${contact}}\\[-1pt]
  \rule{\textwidth}{0.8pt}
\par}

${summary ? `${summary}\n` : ''}

${renderEducation(data.education)}
${renderSkills(data.skills, colon)}
${renderExperience(data.experience)}
${renderProjects(data.open_source)}
${renderTypedSection(data.patents)}
${renderCommunity(data.open_source)}
${renderTypedSection(data.awards)}
${renderTypedSection(data.certifications)}
${renderReferees(data.referees, isZH)}
\end{document}
`;
}

function renderContact(profile = {}, isZH) {
  const hidden = profile.cv_hidden_contact_fields || [];
  const order = isZH
    ? ['地址', '电话', '邮箱', '博客', 'Github', 'LinkedIn']
    : ['Address', 'Phone', 'Email', 'Blog', 'Github', 'LinkedIn'];
  const entries = Object.entries(profile.contact_info || {})
    .filter(([key]) => !hidden.includes(key))
    .sort(([a], [b]) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

  return entries.map(([key, value]) => {
    const href = contactHref(key, value);
    const label = text(key);
    const val = href ? String.raw`\href{${latexUrl(href)}}{${text(value)}}` : text(value);
    return String.raw`\textbf{${label}:} ${val}`;
  }).join(' \\textbar{} ');
}

function contactHref(key, value) {
  if (!value) return '';
  if (['Email', '邮箱'].includes(key)) return `mailto:${value}`;
  if (['Phone', '电话'].includes(key)) return `tel:${String(value).replace(/\s+/g, '')}`;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) return value;
  if (['Blog', '博客', 'Github', 'GitHub', 'LinkedIn'].includes(key)) return `https://${value}`;
  return '';
}

function renderEducation(section = {}) {
  const rows = (section.entries || []).map(entry => {
    const desc = list(entry.description || []);
    return String.raw`\textbf{${text(entry.name)}}${entry.dates ? String.raw`\cvdates{${text(entry.dates)}}` : ''}\\
${entry.degree ? String.raw`\textit{${text(entry.degree)}}\\` : ''}
${entry.note ? `${text(entry.note)}\\\\` : ''}
${desc}`;
  }).join('\n');
  return section.title ? String.raw`\section*{${text(section.title)}}` + '\n' + rows : '';
}

function renderSkills(section = {}, colon) {
  const items = (section.items || []).map(item => String.raw`\item \textbf{${text(item.label)}${text(colon)}} ${text(item.value)}`).join('\n');
  if (!section.title || !items) return '';
  return String.raw`\section*{${text(section.title)}}
\begin{itemize}
${items}
\end{itemize}`;
}

function renderExperience(section = {}) {
  const jobs = (section.jobs || []).map(job => {
    const items = list(job.responsibilities || []);
    const location = job.location ? text(job.location) : '';
    return String.raw`\entryhead{${text(job.company)}}{${location}}{${text(htmlToPlain(job.dates || ''))}}
\textit{${text(job.title || '')}}\\[-2pt]
${items}`;
  }).join('\n');
  return section.title && jobs ? String.raw`\section*{${text(section.title)}}` + '\n' + jobs : '';
}

function renderProjects(section = {}) {
  const custom = section.custom ? `${text(section.custom)}\n` : '';
  const projects = (section.custom_projects || []).map(project =>
    String.raw`\item \textbf{${text(project.title)}:} ${text(project.desc || '')}`
  ).join('\n');
  if (!section.title || (!custom && !projects)) return '';
  return String.raw`\section*{${text(section.title)}}
${custom}${projects ? String.raw`\begin{itemize}
${projects}
\end{itemize}` : ''}`;
}

function renderCommunity(section = {}) {
  const community = section.community || {};
  const projects = (section.projects || []).map(project =>
    String.raw`\item \textbf{${text(project.title)}:} ${text(project.desc || '')}`
  ).join('\n');
  if (!section.community_title || (!community.name && !projects)) return '';
  return String.raw`\section*{${text(section.community_title)}}
${community.name ? String.raw`\textbf{${text(community.name)}}${community.dates ? String.raw`\cvdates{${text(community.dates)}}` : ''}\\` : ''}
${projects ? String.raw`\begin{itemize}
${projects}
\end{itemize}` : ''}`;
}

function renderTypedSection(section = {}) {
  const items = (section.items || []).map(item => {
    if (item.type === 'label_text') return String.raw`\item \textbf{${text(item.label)}:} ${text(item.text || '')}`;
    if (item.type === 'text') return String.raw`\item ${text(item.text || '')}`;
    const desc = item.desc ? ` ${text(item.desc)}` : '';
    return String.raw`\item ${text(item.name || '')}${desc}`;
  }).join('\n');
  if (!section.title || !items) return '';
  return String.raw`\section*{${text(section.title)}}
\begin{itemize}
${items}
\end{itemize}`;
}

function renderReferees(section = {}, isZH) {
  const referees = section.items || [];
  if (!referees.length) return '';
  const title = section.title || (isZH ? '推荐人' : 'Referees');
  const items = referees.map(ref => {
    const meta = [ref.title, ref.organization].filter(Boolean).join(', ');
    const rel = ref.relationship ? (meta ? ` - ${ref.relationship}` : ref.relationship) : '';
    return String.raw`\textbf{${text(ref.name || '')}}\\
${text(meta + rel)}\\
${text(ref.contact || '')}`;
  }).join('\n\n');
  return String.raw`\section*{${text(title)}}
${items}
${section.note ? `\n\\footnotesize{${text(section.note)}}` : ''}`;
}

function list(items) {
  if (!items.length) return '';
  return String.raw`\begin{itemize}
${items.map(item => String.raw`\item ${text(item)}`).join('\n')}
\end{itemize}`;
}

function htmlToPlain(value) {
  return String(value).replace(/<br\s*\/?>/gi, '; ').replace(/<[^>]+>/g, '');
}

function text(value) {
  return htmlToPlain(value ?? '')
    .replace(/\\/g, String.raw`\textbackslash{}`)
    .replace(/&/g, String.raw`\&`)
    .replace(/%/g, String.raw`\%`)
    .replace(/\$/g, String.raw`\$`)
    .replace(/#/g, String.raw`\#`)
    .replace(/_/g, String.raw`\_`)
    .replace(/{/g, String.raw`\{`)
    .replace(/}/g, String.raw`\}`)
    .replace(/~/g, String.raw`\textasciitilde{}`)
    .replace(/\^/g, String.raw`\textasciicircum{}`);
}

function latexUrl(value) {
  return String(value).replace(/\\/g, '/').replace(/[{}]/g, '');
}
