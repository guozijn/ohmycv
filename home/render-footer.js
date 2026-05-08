export function renderFooter({ data }) {
  const root = document.getElementById('elsewhere');
  if (!root) return;

  const contact = data.profile?.contact_info || {};

  const contactItems = Object.entries(contact)
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => renderContact(label, value));

  root.innerHTML = `
    <hr class="rule" />
    <span class="section-label">// get in touch</span>
    <ul class="contact-list" role="list">
      ${contactItems.join('<span class="contact-sep" aria-hidden="true"> / </span>')}
    </ul>
  `;
}

function renderContact(label, value) {
  const href = toHref(label, value);
  if (!href) return `<li><span>${escapeHtml(value)}</span></li>`;
  const external = /^https?:\/\//i.test(href);
  const attrs = external ? ' target="_blank" rel="noopener"' : '';
  return `<li><a href="${escapeAttr(href)}"${attrs}>${escapeHtml(value)}</a></li>`;
}

function toHref(label, value) {
  if (/^email$|^邮箱$/i.test(label)) return `mailto:${value}`;
  if (/^phone|^tel|^电话/i.test(label)) return `tel:${value}`;
  if (/^address$|^location$|^地址$/i.test(label)) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
  }
  if (/^https?:\/\//i.test(value)) return value;
  if (/^mailto:|^tel:/i.test(value)) return value;
  return `https://${value}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}
