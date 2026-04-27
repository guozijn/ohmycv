function getBasePath() {
  const basePath = document.body?.dataset?.basePath || '.';
  return basePath.replace(/\/$/, '');
}

function withBasePath(path) {
  const base = getBasePath();
  const normalized = path.replace(/^\.\//, '');
  if (/^(mailto:|tel:|https?:\/\/)/i.test(normalized)) return normalized;

  if (/^https?:\/\//i.test(base)) {
    return new URL(normalized, `${base}/`).toString();
  }

  return `${base}/${normalized}`.replace(/([^:])\/{2,}/g, '$1/');
}

function toAbsoluteUrl(value) {
  if (!value || /^(mailto:|tel:)/i.test(value)) return value;
  try {
    return new URL(value, window.location.href).toString();
  } catch {
    return value;
  }
}

async function loadLang(lang) {
  const path = withBasePath(`i18n/${lang}.json`);
  const [res, config] = await Promise.all([
    fetch(path, { cache: 'no-store' }),
    loadCvConfig()
  ]);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  const dict = await res.json();
  const jobOverrides = await loadJobOverrides(config, lang);
  const sharedOverrides = applyConfigOverrides(dict, config.shared, lang);
  return applyConfigOverrides(mergeCvData(sharedOverrides, jobOverrides), config.local, lang);
}

let _cvConfigPromise = null;

async function loadCvConfig() {
  if (!_cvConfigPromise) {
    _cvConfigPromise = Promise.all([
      fetchJson('config/cv.json'),
      fetchJson('config/local.json')
    ]).then(([shared, local]) => ({ shared: shared || {}, local }));
  }
  return _cvConfigPromise;
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
    if (res.ok) return await res.json();
  } catch {
    return null;
  }
  return null;
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

function normaliseUrl(value) {
  if (!value) return '';
  if (/^(mailto:|tel:|https?:\/\/)/i.test(value)) return value;
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) return `mailto:${value}`;
  if (/^[+0-9()\-\s]+$/.test(value)) return `tel:${value.replace(/\s+/g, '')}`;
  return `https://${value}`;
}

function escapeHTML(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getContactLabelMap() {
  return {
    'Phone': { key: 'phone', label: 'Phone' },
    'Email': { key: 'email', label: 'Email' },
    'Blog': { key: 'blog', label: 'Blog' },
    'Github': { key: 'github', label: 'GitHub' },
    'LinkedIn': { key: 'linkedin', label: 'LinkedIn' }
  };
}

function buildHomeLinks(dict) {
  const profile = dict.profile || {};
  const contactInfo = profile.contact_info || {};
  const labelMap = getContactLabelMap();
  const links = [];
  const seen = new Set();

  function pushLink(key, label, value, href) {
    const dedupeKey = `${key}:${href}`;
    if (!href || seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    links.push({ key, label, value, href, displayHref: toAbsoluteUrl(href) });
  }

  pushLink(
    'cv',
    'CV',
    'CV',
    withBasePath(`cv/${window.location.search || ''}`)
  );

  Object.entries(contactInfo).forEach(([key, value]) => {
    const mapped = labelMap[key];
    if (!mapped || !value) return;
    pushLink(mapped.key, mapped.label, value, normaliseUrl(value));
  });

  (dict.homepage?.links || []).forEach(item => {
    if (!item?.label || !item?.url) return;
    pushLink(
      item.command || item.label.toLowerCase().replace(/[^a-z0-9]+/g, ''),
      item.label,
      item.text || item.url,
      item.url
    );
  });

  return links;
}

function getLocationValue(contactInfo) {
  return contactInfo.Address || '';
}

function getUIStrings(dict = {}) {
  return {
    prompt: dict.homepage?.prompt || 'guest@ohmycv:~$',
    helpIntro: 'Available commands:',
    quickLinksLabel: 'Quick links',
    locationLabel: 'Location',
    unknown: cmd => `Unknown command: ${cmd}`,
    unknownHint: 'Type `help` to list the available commands.',
    emptyState: 'This entry is not configured.',
    missingArg: cmd => `${cmd}: missing operand`,
    cannotCat: value => `cat: ${value}: No such file or directory`,
    opened: label => `Opening ${label}...`,
    commands: {
      help: 'help',
      ls: 'ls',
      pwd: 'pwd',
      cat: 'cat',
      date: 'date',
      whoami: 'whoami',
      about: 'about',
      links: 'links',
      cv: 'cv',
      blog: 'blog',
      github: 'github',
      linkedin: 'linkedin',
      email: 'email',
      location: 'location',
      clear: 'clear'
    },
    commandDescriptions: {
      help: 'show this help manual',
      ls: 'list available entries',
      pwd: 'print current path',
      cat: 'print entry content',
      date: 'show current date and time',
      whoami: 'show the current user name',
      about: 'show profile summary',
      links: 'list all quick links',
      cv: 'open the CV page',
      blog: 'open the blog link',
      github: 'open the GitHub profile',
      linkedin: 'open the LinkedIn profile',
      email: 'open the email link',
      location: 'show the current location',
      clear: 'clear terminal output'
    }
  };
}

function isExternalLink(href) {
  return /^https?:\/\//.test(href);
}

function isOpenInNewTab(href) {
  return isExternalLink(href) || href === withBasePath('cv/');
}

function getAnchorAttrs(href) {
  return isOpenInNewTab(href)
    ? ' target="_blank" rel="noopener"'
    : '';
}

function formatLinksList(links, ui) {
  const lines = links.map(item => {
    const text = item.displayHref || item.value || item.label;
    return `<div class="terminal-list-item"><span class="terminal-key">${escapeHTML(item.key)}</span><span class="terminal-sep">-</span><a href="${escapeHTML(item.href)}"${getAnchorAttrs(item.href)}>${escapeHTML(text)}</a></div>`;
  });
  return `<div class="terminal-block">${lines.join('')}</div>`;
}

function formatContactList(contactInfo) {
  const order = ['Address', 'Phone', 'Email', 'Blog', 'Github', 'LinkedIn'];
  const lines = order
    .filter(key => contactInfo[key])
    .map(key => `<div class="terminal-list-item"><span class="terminal-key">${escapeHTML(key)}</span><span class="terminal-sep">:</span><span>${escapeHTML(contactInfo[key])}</span></div>`);
  return lines.join('');
}

function createTerminalState(dict) {
  const ui = getUIStrings(dict);
  const profile = dict.profile || {};
  const contactInfo = profile.contact_info || {};
  const links = buildHomeLinks(dict);
  const linkMap = new Map(links.map(item => [item.key, item]));
  const locationValue = getLocationValue(contactInfo);
  const directoryEntries = Array.from(new Set(['about', ...links.map(item => item.key), 'location']));
  const catTargets = [...directoryEntries, 'links'];

  const handlers = {
    help() {
      const commands = Object.keys(handlers).sort();
      const lines = commands
        .map(key => {
          const link = linkMap.get(key);
          const desc = ui.commandDescriptions[key] || (link ? `open ${link.label}` : '');
          return `<div class="terminal-list-item"><span class="terminal-key">${escapeHTML(key)}</span><span class="terminal-sep">-</span><span>${escapeHTML(desc)}</span></div>`;
        })
        .join('');
      return `<div class="terminal-block"><div class="terminal-block-title">${escapeHTML(ui.helpIntro)}</div>${lines}</div>`;
    },
    ls() {
      const lines = catTargets
        .map(key => `<span class="terminal-command-token">${escapeHTML(key)}</span>`)
        .join('');
      return `<div class="terminal-command-list">${lines}</div>`;
    },
    pwd() {
      return '<div>/</div>';
    },
    cat(arg) {
      const value = (arg || '').trim().toLowerCase();
      if (!value) return `<div>${escapeHTML(ui.missingArg('cat'))}</div>`;
      if (value === 'location') {
        return locationValue
          ? `<div>${escapeHTML(locationValue)}</div>`
          : `<div>${escapeHTML(ui.emptyState)}</div>`;
      }
      if (value === 'links') {
        return formatLinksList(links, ui);
      }
      if (value === 'about') {
        return `<div>${escapeHTML(profile.summary || '')}</div>`;
      }
      const entry = linkMap.get(value);
      if (entry) {
        return `<div>${escapeHTML(entry.displayHref || entry.href)}</div>`;
      }
      return `<div>${escapeHTML(ui.cannotCat(arg.trim()))}</div>`;
    },
    date() {
      return `<div>${escapeHTML(new Date().toString())}</div>`;
    },
    whoami() {
      return `<div>${escapeHTML(profile.name || '')}</div>`;
    },
    about() {
      return `<div>${escapeHTML(profile.summary || '')}</div>`;
    },
    links() {
      return formatLinksList(links, ui);
    },
    location() {
      return locationValue
        ? `<div>${escapeHTML(locationValue)}</div>`
        : `<div>${escapeHTML(ui.emptyState)}</div>`;
    },
    clear() {
      return { clear: true };
    }
  };

  linkMap.forEach((_, key) => {
    handlers[key] = () => {
      const entry = linkMap.get(key);
      if (!entry) return `<div>${escapeHTML(ui.emptyState)}</div>`;
      return {
        html: `<div>${escapeHTML(ui.opened(entry.label))}</div>`,
        open: entry.href
      };
    };
  });

  return { ui, profile, contactInfo, links, handlers, catTargets };
}

function openLink(href) {
  if (!href) return;
  if (href.startsWith('mailto:') || href.startsWith('tel:')) {
    window.location.href = href;
    return;
  }
  if (isOpenInNewTab(href)) {
    window.open(href, '_blank', 'noopener');
    return;
  }
  window.location.href = href;
}

let homeState = null;
let commandHistory = [];
let historyIndex = -1;
let draftInput = '';
let tabCompletionState = null;

function appendOutput(command, resultHTML) {
  const output = document.getElementById('terminal-output');
  if (!output) return;
  const row = document.createElement('div');
  row.className = 'terminal-entry';
  row.innerHTML = `
    <div class="terminal-command"><span class="terminal-command-prompt">${escapeHTML(homeState.ui.prompt)}</span><span class="terminal-command-text">${escapeHTML(command)}</span></div>
    <div class="terminal-response">${resultHTML}</div>
  `;
  output.appendChild(row);
  output.scrollTop = output.scrollHeight;
}

function appendPromptOnly() {
  const output = document.getElementById('terminal-output');
  if (!output || !homeState) return;
  const row = document.createElement('div');
  row.className = 'terminal-entry terminal-entry-empty';
  row.innerHTML = `
    <div class="terminal-command"><span class="terminal-command-prompt">${escapeHTML(homeState.ui.prompt)}</span></div>
  `;
  output.appendChild(row);
  output.scrollTop = output.scrollHeight;
}

function appendCompletionMatches(matches) {
  const output = document.getElementById('terminal-output');
  if (!output || !matches.length) return;
  const row = document.createElement('div');
  row.className = 'terminal-entry terminal-entry-empty';
  row.innerHTML = `
    <div class="terminal-response"><div class="terminal-command-list">${matches.map(match => `<span class="terminal-command-token">${escapeHTML(match)}</span>`).join('')}</div></div>
  `;
  output.appendChild(row);
  output.scrollTop = output.scrollHeight;
}

function buildGreetingHTML(dict, links) {
  const linkMap = new Map((links || []).map(item => [item.key, item]));
  const tokens = {
    help: '<code>help</code>',
    cv: `<a href="${escapeHTML(withBasePath('cv/'))}"${getAnchorAttrs(withBasePath('cv/'))}>cv</a>`
  };
  linkMap.forEach((item, key) => {
    tokens[key] = `<a href="${escapeHTML(item.href)}"${getAnchorAttrs(item.href)}>${escapeHTML(key)}</a>`;
  });

  const template = dict.homepage?.greeting || 'Type {help} to see commands, or jump straight to {cv}.';
  return escapeHTML(template).replace(/\{([a-z0-9_-]+)\}/gi, (match, key) => tokens[key] || match);
}

function setIntro(dict) {
  document.title = dict.homepage?.title || dict.site?.title || dict.profile?.name || 'OhMyCV';
  document.documentElement.lang = 'en';
  document.body.setAttribute('lang', 'en');
  document.body.classList.add('terminal-home');

  const promptEl = document.getElementById('terminal-prompt');
  if (promptEl) promptEl.textContent = getUIStrings(dict).prompt;
}

function resetOutput() {
  const output = document.getElementById('terminal-output');
  if (!output) return;
  output.innerHTML = '';
}

function runCommand(rawInput) {
  const input = rawInput.trim();
  if (!homeState) return;
  if (!input) {
    appendPromptOnly();
    return;
  }

  if (!commandHistory.length || commandHistory[commandHistory.length - 1] !== input) {
    commandHistory.push(input);
  }
  historyIndex = commandHistory.length;
  draftInput = '';

  const [commandName, ...argParts] = input.split(/\s+/);
  const key = (commandName || '').toLowerCase();
  const arg = argParts.join(' ');
  const handler = homeState.handlers[key];
  if (!handler) {
    appendOutput(input, `<div class="terminal-status terminal-status-error">${escapeHTML(homeState.ui.unknown(input))}</div><div>${escapeHTML(homeState.ui.unknownHint)}</div>`);
    return;
  }

  const result = handler(arg);
  if (result?.clear) {
    resetOutput();
    return;
  }

  appendOutput(input, typeof result === 'string' ? result : result.html || '');
  if (result?.open) {
    window.setTimeout(() => openLink(result.open), 120);
  }
}

function setCaretToEnd(input) {
  const length = input.value.length;
  input.setSelectionRange(length, length);
}

function getCommandMatches(value) {
  if (!homeState) return [];
  const commands = Object.keys(homeState.handlers);
  const raw = value.toLowerCase();
  const trimmed = value.trim().toLowerCase();

  if (!trimmed) return [...commands].sort();

  if (raw.startsWith('cat ')) {
    const arg = raw.slice(4).trim();
    const targets = homeState.catTargets || [];
    if (!arg) return [...targets].sort().map(target => `cat ${target}`);
    return targets
      .filter(target => target.startsWith(arg))
      .sort()
      .map(target => `cat ${target}`);
  }

  return commands.filter(command => command.startsWith(trimmed)).sort();
}

function getSharedPrefix(values) {
  if (!values.length) return '';
  let prefix = values[0];
  for (let i = 1; i < values.length; i += 1) {
    while (!values[i].startsWith(prefix) && prefix) {
      prefix = prefix.slice(0, -1);
    }
  }
  return prefix;
}

function resetTabCompletionState() {
  tabCompletionState = null;
}

function attachHomeEvents() {
  const form = document.getElementById('terminal-form');
  const input = document.getElementById('terminal-input');
  const terminalWindow = document.querySelector('.terminal-window');
  const terminalBody = document.querySelector('.terminal-body');
  const terminalOutput = document.getElementById('terminal-output');
  const terminalInputRow = document.querySelector('.terminal-input-row');
  
  function focusInput() {
    input?.focus();
  }

  if (form && input) {
    form.addEventListener('submit', event => {
      event.preventDefault();
      const value = input.value;
      input.value = '';
      resetTabCompletionState();
      runCommand(value);
      focusInput();
    });

    input.addEventListener('keydown', event => {
      if (event.ctrlKey && !event.metaKey && !event.altKey) {
        if (event.key.toLowerCase() === 'u') {
          event.preventDefault();
          input.value = '';
          draftInput = '';
          resetTabCompletionState();
          return;
        }
      }

      if (event.key === 'ArrowUp') {
        if (!commandHistory.length) return;
        event.preventDefault();
        if (historyIndex === commandHistory.length) {
          draftInput = input.value;
        }
        historyIndex = Math.max(0, historyIndex - 1);
        input.value = commandHistory[historyIndex] || '';
        setCaretToEnd(input);
        resetTabCompletionState();
        return;
      }

      if (event.key === 'ArrowDown') {
        if (!commandHistory.length) return;
        event.preventDefault();
        historyIndex = Math.min(commandHistory.length, historyIndex + 1);
        input.value = historyIndex === commandHistory.length
          ? draftInput
          : (commandHistory[historyIndex] || '');
        setCaretToEnd(input);
        resetTabCompletionState();
        return;
      }

      if (event.key === 'Tab') {
        const value = input.value;
        const matches = getCommandMatches(value);
        if (!matches.length) return;
        event.preventDefault();
        if (matches.length === 1) {
          input.value = matches[0];
          resetTabCompletionState();
          setCaretToEnd(input);
          return;
        }

        const matchesKey = matches.join('\n');
        const isRepeatedTab = tabCompletionState
          && tabCompletionState.value === value
          && tabCompletionState.matchesKey === matchesKey;

        if (isRepeatedTab) {
          appendCompletionMatches(matches);
        } else {
          input.value = getSharedPrefix(matches);
          tabCompletionState = {
            value: input.value,
            matchesKey
          };
        }
        setCaretToEnd(input);
        return;
      }

      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        resetTabCompletionState();
      }
    });

    window.setTimeout(() => focusInput(), 50);
  }

  if (terminalWindow && input) {
    const focusFromTerminalTap = event => {
      const rawTarget = event.target;
      const target = rawTarget instanceof HTMLElement ? rawTarget : rawTarget?.parentElement;
      if (!target) return;
      if (target.closest('a, button')) return;
      if (window.getSelection && String(window.getSelection()).trim()) return;

      if (terminalInputRow && target.closest('.terminal-input-row')) {
        focusInput();
        return;
      }

      if (terminalOutput && target === terminalOutput) {
        focusInput();
        return;
      }

      if (target.closest('.terminal-output')) return;

      if (target === terminalWindow || target === terminalBody) {
        focusInput();
      }
    };

    terminalWindow.addEventListener('click', focusFromTerminalTap);
    terminalWindow.addEventListener('touchend', focusFromTerminalTap, { passive: true });
  }

  if (input) {
    document.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      const target = event.target;
      if (target === input) return;
      if (target instanceof HTMLElement && target.closest('a, button')) return;
      event.preventDefault();
      focusInput();
    });
  }
}

function renderHome(dict) {
  homeState = createTerminalState(dict);
  setIntro(dict);
  resetOutput();
  appendOutput('boot', `<div>${buildGreetingHTML(dict, homeState.links)}</div>`);
}

async function loadHome() {
  setLoading(true);
  try {
    loadCvConfig().then(config => {
      injectGoogleAnalytics(config.local?.google_analytics_id || config.shared?.google_analytics_id);
    });
    const dict = await loadLang('en');
    renderHome(dict);
  } catch (err) {
    console.error(err);
    alert('Failed to load page content. Please refresh the page and try again.');
  } finally {
    setLoading(false);
  }
}

(function init() {
  loadHome();
  attachHomeEvents();
})();
