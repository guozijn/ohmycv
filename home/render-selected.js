export function renderSelected({ data }) {
  const root = document.getElementById('selected');
  if (!root) return;

  const items = Array.isArray(data.homepage?.selected) ? data.homepage.selected : [];
  if (items.length === 0) {
    root.innerHTML = '';
    return;
  }

  root.innerHTML = `
    <span class="section-label">// selected</span>
    <ul class="selected-list" role="list">
      ${items.map(renderCard).join('')}
    </ul>
  `;

  observeReveals(root.querySelectorAll('.selected-card'));
}

function renderCard(item) {
  const link = item?.link?.href
    ? `<a class="selected-link" href="${escapeAttr(item.link.href)}"${
        isExternal(item.link.href) ? ' rel="noreferrer noopener" target="_blank"' : ''
      }>→ ${escapeHtml(item.link.label || 'open')}</a>`
    : '';
  return `
    <li class="selected-card">
      <div class="selected-top">
        <span class="selected-kind">${escapeHtml(item?.kind || '')}</span>
        <span class="selected-meta">${escapeHtml(item?.meta || '')}</span>
      </div>
      <h2 class="selected-title">${escapeHtml(item?.title || '')}</h2>
      <p class="selected-body">${escapeHtml(item?.body || '')}</p>
      ${link}
    </li>
  `;
}

function observeReveals(elements) {
  const reduce =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || typeof IntersectionObserver === 'undefined') {
    elements.forEach((el) => el.setAttribute('data-revealed', 'true'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.setAttribute('data-revealed', 'true');
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.2 }
  );
  elements.forEach((el) => io.observe(el));
}

function isExternal(href) {
  return /^https?:\/\//i.test(href);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}
