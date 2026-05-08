export function renderHero({ data }) {
  const root = document.getElementById('hero');
  if (!root) return;

  const name = data.profile?.name ?? data.site?.title ?? '';
  const tagline = data.homepage?.tagline ?? '';
  const meta = Array.isArray(data.homepage?.meta) ? data.homepage.meta : [];

  const taglineHtml = tagline ? `<p class="hero-tagline">${escapeHtml(tagline)}</p>` : '';
  const metaHtml = meta.length
    ? `<p class="hero-meta">${meta
        .map(escapeHtml)
        .join('<span class="hero-meta-sep" aria-hidden="true"> · </span>')}</p>`
    : '';

  root.innerHTML = `
    <h1 class="hero-name">${escapeHtml(name)}</h1>
    ${taglineHtml}
    ${metaHtml}
    <hr class="rule" />
  `;

  requestAnimationFrame(() => {
    root.setAttribute('data-motion', 'entered');
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}
