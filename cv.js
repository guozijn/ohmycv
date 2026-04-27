function getBasePath() {
  const basePath = document.body?.dataset?.basePath || '.';
  return basePath.replace(/\/$/, '');
}

function withBasePath(path) {
  const base = getBasePath();
  const normalized = path.replace(/^\.\//, '');
  return `${base}/${normalized}`.replace(/\/{2,}/g, '/');
}

async function loadLang(lang) {
  const path = withBasePath(`i18n/${lang}.json`);
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  const dict = await res.json();
  const config = await loadCvConfig();
  const jobOverrides = await loadJobOverrides(config, lang);
  const sharedOverrides = applyConfigOverrides(dict, config.shared, lang);
  return applyConfigOverrides(mergeCvData(sharedOverrides, jobOverrides), config.local, lang);
}

async function loadCvConfig() {
  const shared = await fetchJson('config/cv.json');
  const local = await fetchJson('config/local.json');
  return { shared: shared || {}, local };
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
    if (res.ok) return res.json();
  } catch {
    return null;
  }
  return null;
}

function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html || '';
}

function strong(label, suffix = ':') {
  return `<strong>${label}${suffix}</strong>`;
}

function contactHref(key, value) {
  if (!value) return '';
  if (['Email', '邮箱'].includes(key)) return `mailto:${value}`;
  if (['Phone', '电话'].includes(key)) return `tel:${String(value).replace(/\s+/g, '')}`;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) return value;
  if (['Blog', '博客', 'Github', 'GitHub', 'LinkedIn'].includes(key)) return `https://${value}`;
  return '';
}

function shouldShowCvContact(key, profile) {
  const hidden = profile?.cv_hidden_contact_fields || [];
  return !hidden.includes(key);
}

function renderList(id, items) {
  const el = document.getElementById(id);
  el.innerHTML = '';
  (items || []).forEach(x => {
    const li = document.createElement('li');
    li.innerHTML = x;
    el.appendChild(li);
  });
}

function renderTypedItems(id, items, colon) {
  const list = document.getElementById(id);
  if (!list) return;
  list.innerHTML = '';
  (items || []).forEach(item => {
    const li = document.createElement('li');
    if (item.type === 'certificate') {
      li.innerHTML = `
        ${item.name || ''}
        ${item.id ? `<span class="small-text credential-id">${item.id}</span>` : ''}
        ${item.desc ? `<div class="credential-desc small-text">${item.desc}</div>` : ''}
      `;
    } else if (item.type === 'label_text') {
      li.innerHTML = `${strong(item.label, colon)} ${item.text}`;
    } else if (item.type === 'text') {
      li.textContent = item.text || '';
    }
    list.appendChild(li);
  });
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

function setLoading(isLoading) {
  const loader = document.getElementById('loader');
  if (!loader) return;
  loader.classList.toggle('hidden', !isLoading);
  loader.setAttribute('aria-hidden', String(!isLoading));
}

function updateLangUI(lang) {
  const label = document.getElementById('lang-label');
  if (label) label.textContent = lang === 'zh' ? '中文' : 'EN';
  document.querySelectorAll('#lang-menu li').forEach(li => {
    li.setAttribute('aria-selected', li.dataset.lang === lang ? 'true' : 'false');
  });
}

let lastTitleBeforePrint = document.title;

function renderCv(dict) {
  window.currentCvData = dict;
  const isZH = (localStorage.getItem('cv_lang') || '').startsWith('zh');
  const colon = isZH ? '：' : ':';

  const title = dict.site?.title || dict.profile?.name || 'CV';
  setHTML('title', title);
  document.title = title;
  lastTitleBeforePrint = document.title;
  document.documentElement.lang = isZH ? 'zh' : 'en';
  setHTML('name', dict.profile?.name);
  const downloadBtn = document.querySelector('.download-btn');
  if (downloadBtn && dict.site?.download_label) {
    downloadBtn.setAttribute('aria-label', dict.site.download_label);
    downloadBtn.setAttribute('title', dict.site.download_label);
  }
  const contact = document.getElementById('contact-info');
  if (contact) {
    contact.innerHTML = '';
    const profile = dict.profile || {};
    const contactInfo = profile.contact_info || {};
    const contactOrder = isZH
      ? ['地址', '电话', '邮箱', '博客', 'Github', 'LinkedIn']
      : ['Address', 'Phone', 'Email', 'Blog', 'Github', 'LinkedIn'];
    const entries = Object.entries(contactInfo)
      .filter(([key]) => shouldShowCvContact(key, profile))
      .sort(([a], [b]) => {
      const ai = contactOrder.indexOf(a);
      const bi = contactOrder.indexOf(b);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    const parts = entries.map(([key, value]) => {
      const href = contactHref(key, value);
      if (href) {
        const newTab = /^https?:\/\//i.test(href) ? ' target="_blank" rel="noopener"' : '';
        return `<span class="contact-item"><strong>${key}: </strong><a href="${href}"${newTab}>${value}</a></span>`;
      }
      return `<span class="contact-item"><strong>${key}: </strong>${value}</span>`;
    });
    const divider = '<span class="contact-divider" aria-hidden="true">|</span>';
    contact.innerHTML = parts.join(divider);
  }


  setHTML('profile-summary', dict.profile?.summary || '');

  setHTML('education-title', dict.education?.title || 'EDUCATION');
  
  const edu = document.getElementById('education-list');
  edu.innerHTML = '';
  
  
  (dict.education?.entries || []).forEach(entry => {
    const dates = entry.dates ? `<span class="dates">${entry.dates}</span>` : '';
    const degree = entry.degree ? `<div class="degree">${entry.degree}</div>` : '';
    const note = entry.note ? `<div class="edu-note">${entry.note}</div>` : '';
    const description = (entry.description || [])
      .map(item => `<li>${item}</li>`)
      .join('');
  
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="institution">${entry.name || ''} ${dates}</div>
      ${degree}
      ${note}
      ${description ? `<ul>${description}</ul>` : ''}
    `;
    edu.appendChild(div);
  });

  setHTML('skills-title', dict.skills?.title);
  const skillList = document.getElementById('skills-list');
  skillList.innerHTML = '';
  (dict.skills?.items || []).forEach(it => {
    const li = document.createElement('li');
    li.innerHTML = `${strong(it.label, colon)} ${it.value}`;
    skillList.appendChild(li);
  });

  setHTML('experience-title', dict.experience?.title);
  const exp = document.getElementById('experience-list');
  exp.innerHTML = '';
  (dict.experience?.jobs || []).forEach(job => {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="institution job-heading">
        <div class="job-heading-main">
          <div>${job.company}${job.location ? ` – ${job.location}` : ''}</div>
          <div class="job-title">${job.title}</div>
        </div>
        ${job.dates ? `<span class="dates">${job.dates}</span>` : ''}
      </div>
    `;
    const ul = document.createElement('ul');
    (job.responsibilities || []).forEach(r => {
      const li = document.createElement('li');
      li.textContent = r;
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
    if (job.awards) {
      const p = document.createElement('p');
      p.innerHTML = `${strong(job.awards.label, colon)} ${job.awards.text}`;
      wrap.appendChild(p);
    }
    exp.appendChild(wrap);
  });

  setHTML('open-source-title', dict.open_source?.title);

  setHTML('open-source-custom', dict.open_source?.custom || '');
  renderList('open-source-custom-projects', (dict.open_source?.custom_projects || []).map(p => `${strong(p.title)} ${p.desc || ''}`));
  setHTML('open-source-community-title', dict.open_source?.community_title || '');
  const comm = document.getElementById('open-source-community-wrap');
  const cd = dict.open_source?.community?.dates ? `<span class="dates">${dict.open_source.community.dates}</span>` : '';
  comm.innerHTML = `<span>${dict.open_source?.community?.name || ''}</span>${cd}`;
  renderList('open-source-projects', (dict.open_source?.projects || []).map(p => `${strong(p.title)} ${p.desc || ''}`));

  setHTML('cert-title', dict.certifications?.title);
  renderTypedItems('cert-list', dict.certifications?.items, colon);

  setHTML('patents-title', dict.patents?.title);
  renderTypedItems('patents-list', dict.patents?.items, colon);

  setHTML('awards-title', dict.awards?.title);
  renderTypedItems('awards-list', dict.awards?.items, colon);

  const refereeSection = document.getElementById('referee-section');
  const refereeList = document.getElementById('referee-list');
  const refereeNote = document.getElementById('referee-note');
  const referees = dict.referees?.items || [];
  if (refereeSection && refereeList) {
    if (!referees.length) {
      refereeSection.hidden = true;
      refereeList.innerHTML = '';
      if (refereeNote) {
        refereeNote.textContent = '';
        refereeNote.hidden = true;
      }
    } else {
      refereeSection.hidden = false;
      setHTML('referee-title', dict.referees?.title || (isZH ? '推荐人' : 'Referees'));
      refereeList.innerHTML = '';
      referees.forEach(ref => {
        const entry = document.createElement('div');
        entry.className = 'referee-entry';
        const metaParts = [ref.title, ref.organization].filter(Boolean);
        const meta = metaParts.length ? metaParts.join(', ') : '';
        const relationship = ref.relationship ? (meta ? ` - ${ref.relationship}` : ref.relationship) : '';
        entry.innerHTML = `
          <div class="referee-name">${ref.name || ''}</div>
          ${meta || relationship ? `<div class="referee-meta">${meta}${relationship}</div>` : ''}
          ${ref.contact ? `<div class="referee-contact">${ref.contact}</div>` : ''}
        `;
        refereeList.appendChild(entry);
      });
      if (refereeNote) {
        const noteText = dict.referees?.note || '';
        refereeNote.textContent = noteText;
        refereeNote.hidden = !noteText;
      }
    }
  }
}

async function switchLang(lang) {
  document.body.setAttribute('lang', lang);
  localStorage.setItem('cv_lang', lang);
  updateLangUI(lang);
  setLoading(true);
  try {
    const dict = await loadLang(lang);
    renderCv(dict);
  } catch (err) {
    console.error(err);
    alert('Failed to load CV content. Please refresh the page and try again.');
  } finally {
    setLoading(false);
  }
}

(function init() {
  loadCvConfig().then(config => {
    injectGoogleAnalytics(config.local?.google_analytics_id || config.shared?.google_analytics_id);
  });

  let lang = localStorage.getItem('cv_lang');
  if (!lang) lang = (navigator.language || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  switchLang(lang);

  const langToggleBtn = document.getElementById('lang-toggle');
  const langMenu = document.getElementById('lang-menu');

  if (langToggleBtn && langMenu) {
    langToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
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

window.addEventListener('beforeprint', function() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  lastTitleBeforePrint = document.title;
  const lang = (document.body.getAttribute('lang') || localStorage.getItem('cv_lang') || 'en').toLowerCase();
  const suffix = lang.startsWith('zh') ? 'zh' : 'en';
  const filenameBase = window.currentCvData?.site?.print_filename
    || window.currentCvData?.profile?.name
    || 'CV';
  const safeBase = String(filenameBase).trim().replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'CV';
  document.title = `${safeBase}-${suffix}-${year}-${month}-${day}.pdf`;
});
window.addEventListener('afterprint', function() {
  if (lastTitleBeforePrint) document.title = lastTitleBeforePrint;
});
