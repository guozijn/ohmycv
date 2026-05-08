export function renderTopbar({ data, lang, onLanguageChange }) {
  const root = document.getElementById('topbar');
  if (!root) return;

  const cvHref = data.__cv_pdf_href;
  const downloadLabel = data.site?.download_label || 'CV';
  const cvLink = cvHref
    ? `<a class="topbar-cv" href="${escapeAttr(cvHref)}" download aria-label="${escapeAttr(downloadLabel)}">&#x2193; CV</a>`
    : '';

  root.innerHTML = `
    <div class="topbar-inner">
      <a class="wordmark" href="/" aria-label="Home">~/zijian</a>
      <nav class="topbar-nav" aria-label="Site">
        <div class="lang-toggle" role="group" aria-label="Language">
          <button type="button" data-lang="en" aria-pressed="${lang === 'en'}">EN</button>
          <span class="lang-toggle-sep" aria-hidden="true">·</span>
          <button type="button" data-lang="zh" aria-pressed="${lang === 'zh'}">ZH</button>
        </div>
        ${cvLink}
      </nav>
    </div>
  `;

  root.querySelectorAll('.lang-toggle button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-lang');
      if (next && next !== lang) onLanguageChange(next);
    });
  });
}

function escapeAttr(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}
