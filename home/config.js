function getBasePath() {
  const basePath = document.body?.dataset?.basePath || '.';
  return basePath.replace(/\/$/, '');
}

function withBasePath(path) {
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

export function getHandle(data) {
  const prompt = typeof data?.homepage?.prompt === 'string' ? data.homepage.prompt : '';
  const match = prompt.match(/^([A-Za-z][A-Za-z0-9_-]*)@/);
  return match ? match[1] : 'home';
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
  const merged = applyConfigOverrides(mergeCvData(mainOverrides, jobOverrides), config.local, lang);
  merged.__lang = lang;
  merged.__cv_pdf_href = getCvPdfHref(config, manifest, lang);
  merged.__cv_pdf_hrefs = {
    en: getCvPdfHref(config, manifest, 'en'),
    zh: getCvPdfHref(config, manifest, 'zh')
  };
  return merged;
}

let _cvConfigPromise = null;
let _pdfManifestPromise = null;

export async function loadCvConfig() {
  if (!_cvConfigPromise) {
    _cvConfigPromise = Promise.all([
      fetchJson('config/cv.json'),
      fetchJson('config/local.json'),
      fetchJson('config/cv-jobs/main.json')
    ]).then(([shared, local, main]) => ({ shared: shared || {}, local, main }));
  }
  return _cvConfigPromise;
}

async function loadPdfManifest() {
  if (!_pdfManifestPromise) {
    _pdfManifestPromise = fetchJson('cv/generated/manifest.json').then(manifest => manifest || {});
  }
  return _pdfManifestPromise;
}

function applyConfigOverrides(dict, config, lang) {
  if (!config) return dict;
  const { languages, active_job, cv_job, job, ...globalOverrides } = config;
  const langOverrides = languages?.[lang] || {};
  return mergeCvData(mergeCvData(dict, globalOverrides), langOverrides);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeCvData(base, overrides) {
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

function applyJobOverrides(dict, overrides, lang) {
  if (!overrides) return dict;
  const { languages, ...globalOverrides } = overrides;
  const langOverrides = languages?.[lang] || overrides[lang] || {};
  return mergeCvData(mergeCvData(dict, globalOverrides), langOverrides);
}

function getSelectedJobName(config) {
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

function getCvPdfHref(config, manifest, lang) {
  const jobName = getSelectedJobName(config) || 'main';
  const safeJobName = /^[a-z0-9_-]+$/i.test(jobName) ? jobName : 'main';
  const pdfPath = manifest?.jobs?.[safeJobName]?.[lang]?.pdf;
  return pdfPath ? withBasePath(pdfPath) : '';
}

async function loadJobOverrides(config, lang) {
  const jobName = getSelectedJobName(config);
  if (!jobName) return null;
  if (!/^[a-z0-9_-]+$/i.test(jobName)) {
    console.warn(`Ignoring invalid CV job name: ${jobName}`);
    return null;
  }

  const overrides = await fetchFirstJson([
    `config/cv-jobs/${jobName}.json`,
    `i18n/jobs/${jobName}.json`
  ]);
  if (!overrides) {
    console.warn(`CV job override not found: ${jobName}`);
    return null;
  }
  return overrides.languages?.[lang] || overrides[lang] || overrides;
}

async function fetchFirstJson(paths) {
  for (const path of paths) {
    const data = await fetchJson(path);
    if (data) return data;
  }
  return null;
}

async function fetchJson(path) {
  try {
    const res = await fetch(withBasePath(path), { cache: 'no-store' });
    if (res.ok) return await res.json();
  } catch {
    return null;
  }
  return null;
}
