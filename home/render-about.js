export function renderAbout({ data }) {
  const root = document.getElementById('about');
  if (!root) return;

  const summary = data.profile?.summary;
  if (!summary) {
    root.innerHTML = '';
    return;
  }
  const emphasis = data.profile?.summary_emphasis;

  root.innerHTML = `
    <span class="section-label">// about</span>
    <p>${decorateEmphasis(summary, emphasis)}</p>
  `;
}

function decorateEmphasis(text, emphasis) {
  const safeText = escapeHtml(text);
  if (!emphasis) return safeText;
  const safeEmph = escapeHtml(emphasis);
  const idx = safeText.indexOf(safeEmph);
  if (idx === -1) return safeText;
  return (
    safeText.slice(0, idx) +
    `<em class="about-emphasis">${safeEmph}</em>` +
    safeText.slice(idx + safeEmph.length)
  );
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}
