const CJK_HREF =
  'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;700&display=swap';
const STORAGE_KEY = 'ohmycv:lang';

export function readPersistedLang(fallback = 'en') {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === 'en' || v === 'zh') return v;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function persistLang(lang) {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}

export function ensureCjkFontsLoaded() {
  if (document.querySelector('link[data-cjk]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CJK_HREF;
  link.setAttribute('data-cjk', 'true');
  document.head.appendChild(link);
}

export function applyLangAttribute(lang) {
  document.documentElement.lang = lang;
  if (document.body) document.body.lang = lang;
  if (lang === 'zh') ensureCjkFontsLoaded();
}
