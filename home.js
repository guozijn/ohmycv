import { loadLang, loadCvConfig } from './home/config.js';
import { initConsole } from './home/console.js';
import { renderTopbar } from './home/render-topbar.js';

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

function getPreferredLang() {
  return (navigator.language || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

async function renderForLang(lang) {
  setLoading(true);
  try {
    const data = await loadLang(lang);
    document.documentElement.lang = lang;
    document.body.setAttribute('lang', lang);
    renderTopbar({ data, lang, onLanguageChange: (next) => renderForLang(next) });
    initConsole({ data });
  } catch (err) {
    console.error(err);
    alert('Failed to load page content. Please refresh the page and try again.');
  } finally {
    setLoading(false);
  }
}

async function loadHome() {
  loadCvConfig().then(config => {
    injectGoogleAnalytics(
      config.local?.google_analytics_id ||
      config.main?.google_analytics_id ||
      config.shared?.google_analytics_id
    );
  });
  await renderForLang(getPreferredLang());
}

(function init() {
  loadHome();
})();
