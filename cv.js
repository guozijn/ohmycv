function getBasePath() {
  const basePath = document.body?.dataset?.basePath || '.';
  return basePath.replace(/\/$/, '');
}

function withBasePath(path) {
  const base = getBasePath();
  const normalized = path.replace(/^\.\//, '');
  return `${base}/${normalized}`.replace(/\/{2,}/g, '/');
}

let _cvConfigPromise = null;
let _pdfManifestPromise = null;

async function loadCvConfig() {
  if (!_cvConfigPromise) {
    _cvConfigPromise = Promise.all([
      fetchJson('config/cv.json'),
      fetchJson('config/local.json'),
      fetchJson('config/cv-jobs/main.json')
    ]).then(([shared, local, main]) => ({ shared: shared || {}, local: local || {}, main: main || {} }));
  }
  return _cvConfigPromise;
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

async function loadPdfManifest() {
  if (!_pdfManifestPromise) {
    _pdfManifestPromise = fetchJson('cv/generated/manifest.json').then(manifest => manifest || {});
  }
  return _pdfManifestPromise;
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

function pdfSlug(config) {
  const jobName = getSelectedJobName(config);
  if (jobName && /^[a-z0-9_-]+$/i.test(jobName)) return jobName;
  return 'main';
}

function setLoading(isLoading) {
  const loader = document.getElementById('loader');
  if (!loader) return;
  loader.classList.toggle('hidden', !isLoading);
  loader.setAttribute('aria-hidden', String(!isLoading));
}

function updateLangUI(lang) {
  const label = document.getElementById('lang-label');
  if (label) label.textContent = lang === 'zh' ? 'ZH' : 'EN';
  document.querySelectorAll('#lang-menu li').forEach(li => {
    li.setAttribute('aria-selected', li.dataset.lang === lang ? 'true' : 'false');
  });
}

async function languageData(config, lang) {
  const selectedJob = pdfSlug(config);
  const activeJob = selectedJob === 'main'
    ? {}
    : (await fetchJson(`config/cv-jobs/${selectedJob}.json`)) || {};
  const merged = [
    config.shared,
    config.main,
    activeJob,
    config.local
  ].reduce((acc, item) => mergeCvData(acc, languageSlice(item, lang)), {});
  return {
    site: merged.site || {},
    profile: merged.profile || {}
  };
}

function languageSlice(config, lang) {
  if (!config) return {};
  const { languages, active_job, cv_job, job, ...globalOverrides } = config;
  return mergeCvData(globalOverrides, languages?.[lang] || {});
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

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeFilename(value) {
  return String(value || 'CV')
    .trim()
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'CV';
}

function basename(path) {
  return String(path || '').split('/').pop() || '';
}

async function switchLang(lang) {
  document.body.setAttribute('lang', lang);
  document.documentElement.lang = lang === 'zh' ? 'zh' : 'en';
  localStorage.setItem('cv_lang', lang);
  updateLangUI(lang);
  setLoading(true);

  try {
    const config = await loadCvConfig();
    const slug = pdfSlug(config);
    const manifest = await loadPdfManifest();
    const data = await languageData(config, lang);
    const title = data.site?.title || data.profile?.name || 'CV';
    const downloadLabel = data.site?.download_label || (lang === 'zh' ? '下载 PDF' : 'Download PDF');
    const pdfInfo = manifest.jobs?.[slug]?.[lang] || {};
    const pdfPath = pdfInfo.pdf || `cv/generated/${slug}-${lang}.pdf`;
    const pdfUrl = withBasePath(pdfPath);

    document.title = title;
    const titleEl = document.getElementById('title');
    if (titleEl) titleEl.textContent = title;

    const frame = document.getElementById('cv-pdf');
    if (frame) {
      frame.src = `${pdfUrl}#view=FitH`;
      frame.title = title;
    }

    const fallbackLink = document.getElementById('cv-pdf-fallback-link');
    if (fallbackLink) {
      fallbackLink.href = pdfUrl;
      fallbackLink.textContent = downloadLabel;
    }

    const download = document.getElementById('download-pdf');
    if (download) {
      download.href = pdfUrl;
      download.download = pdfInfo.filename || basename(pdfPath) || `${safeFilename(data.site?.print_filename || title)}-${lang}.pdf`;
      download.setAttribute('aria-label', downloadLabel);
      download.setAttribute('title', downloadLabel);
    }
  } catch (err) {
    console.error(err);
    alert('Failed to load CV PDF. Please refresh the page and try again.');
  } finally {
    setLoading(false);
  }
}

function injectGoogleAnalytics(id) {
  if (!id || !/^G-[A-Z0-9]+$/i.test(id)) return;
  const s1 = document.createElement('script');
  s1.async = true;
  s1.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s1);
  const s2 = document.createElement('script');
  s2.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`;
  document.head.appendChild(s2);
}

(function init() {
  loadCvConfig().then(config => {
    injectGoogleAnalytics(
      config.local?.google_analytics_id ||
      config.main?.google_analytics_id ||
      config.shared?.google_analytics_id
    );
  });

  let lang = localStorage.getItem('cv_lang');
  if (!lang) lang = (navigator.language || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  switchLang(lang === 'zh' ? 'zh' : 'en');

  const langToggleBtn = document.getElementById('lang-toggle');
  const langMenu = document.getElementById('lang-menu');

  if (langToggleBtn && langMenu) {
    langToggleBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      const open = langMenu.classList.toggle('open');
      langToggleBtn.setAttribute('aria-expanded', String(open));
    });

    langMenu.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', () => {
        switchLang(li.dataset.lang);
        langMenu.classList.remove('open');
        langToggleBtn.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('click', () => {
      langMenu.classList.remove('open');
      langToggleBtn.setAttribute('aria-expanded', 'false');
    });
  }
})();
