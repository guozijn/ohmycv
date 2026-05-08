export function renderHero({ data }) {
  const root = document.getElementById('hero');
  if (!root) return;

  const name = data.profile?.name ?? '';
  const tagline = data.homepage?.tagline ?? '';
  const explicitMeta = Array.isArray(data.homepage?.meta) ? data.homepage.meta : null;
  const meta = explicitMeta && explicitMeta.length > 0 ? explicitMeta : deriveMeta(data);

  const taglineHtml = tagline ? `<p class="hero-tagline">${escapeHtml(tagline)}</p>` : '';
  const metaHtml = meta.length
    ? `<p class="hero-meta">${meta
        .map(escapeHtml)
        .join('<span class="hero-meta-sep" aria-hidden="true"> / </span>')}</p>`
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

function deriveMeta(data) {
  const out = [];
  const job = data.experience?.jobs?.[0];
  const location = job?.location || firstAddressLike(data.profile?.contact_info);
  if (location) out.push(location);
  if (job?.title) out.push(job.title);
  return out;
}

function firstAddressLike(contactInfo) {
  if (!contactInfo || typeof contactInfo !== 'object') return '';
  for (const value of Object.values(contactInfo)) {
    if (typeof value !== 'string' || !value) continue;
    if (/@/.test(value)) continue;
    if (/^\+?\d[\d\s().-]{4,}$/.test(value)) continue;
    if (/^https?:\/\//i.test(value)) continue;
    if (/\.[a-z]{2,}\//i.test(value)) continue;
    return value;
  }
  return '';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}
