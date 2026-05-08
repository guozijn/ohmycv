export function renderFooter({ data }) {
  const root = document.getElementById('elsewhere');
  if (!root) return;

  const contact = data.profile?.contact_info || {};
  const colophon = data.homepage?.colophon || '';
  const cvHrefs = data.__cv_pdf_hrefs || {};

  const contactItems = Object.entries(contact)
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => renderContact(label, value));

  const cvItems = [];
  if (cvHrefs.en) {
    cvItems.push(
      `<li><a class="cv-link" data-lang="en" href="${escapeAttr(cvHrefs.en)}" download>↓ cv · en</a></li>`
    );
  }
  if (cvHrefs.zh) {
    cvItems.push(
      `<li><a class="cv-link" data-lang="zh" href="${escapeAttr(cvHrefs.zh)}" download>↓ cv · zh</a></li>`
    );
  }

  root.innerHTML = `
    <hr class="rule" />
    <span class="section-label">// elsewhere</span>
    <ul class="contact-list" role="list">
      ${contactItems.join('<span class="contact-sep" aria-hidden="true"> · </span>')}
    </ul>
    <ul class="cv-list" role="list">${cvItems.join('')}</ul>
    ${colophon ? `<p class="colophon">${escapeHtml(colophon)}</p>` : ''}
  `;
}

function renderContact(label, value) {
  const href = toHref(label, value);
  if (!href) return `<li><span>${escapeHtml(value)}</span></li>`;
  return `<li><a href="${escapeAttr(href)}">${escapeHtml(value)}</a></li>`;
}

function toHref(label, value) {
  if (/^email$/i.test(label)) return `mailto:${value}`;
  if (/^phone|^tel/i.test(label)) return `tel:${value}`;
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
