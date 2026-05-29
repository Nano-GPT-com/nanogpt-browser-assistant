const STORAGE_KEY = 'nanogpt_sidebar_conversation';
const PENDING_PROMPT_KEY = 'nanogpt_pending_sidebar_prompt';
const DIAGNOSTIC_ERRORS_KEY = 'nanogpt_diagnostic_errors';
const DEFAULT_MODEL = 'openai/gpt-chat-latest';
const LEGACY_DEFAULT_MODEL = 'chatgpt-4o-latest';
const PREFERRED_TOP_MODELS = [
  { id: DEFAULT_MODEL, label: 'OpenAI Chat' },
  { id: 'anthropic/claude-sonnet-latest', label: 'Claude Sonnet' },
  { id: 'gemini-2.5-pro', label: 'Gemini Pro' },
];
const MODEL_DISPLAY_ALIASES = {
  [DEFAULT_MODEL]: 'OpenAI Chat',
  [LEGACY_DEFAULT_MODEL]: 'ChatGPT-4o',
  'anthropic/claude-sonnet-latest': 'Claude Sonnet',
  'gemini-2.5-pro': 'Gemini Pro',
};
const PROVIDER_ICON_MAP = {
  openai: 'provider-icons/OpenAI.svg',
  anthropic: 'provider-icons/Anthropic.svg',
  ai21: 'provider-icons/AI21.svg',
  arcee: 'provider-icons/Arcee.svg',
  gemini: 'provider-icons/Gemini.svg',
  google: 'provider-icons/Google.svg',
  ibm: 'provider-icons/IBM.png',
  akash: 'provider-icons/Akash.svg',
  chutes: 'provider-icons/Chutes.webp',
  hyperbolic: 'provider-icons/Hyperbolic.svg',
  microsoft: 'provider-icons/Azure.svg',
  azure: 'provider-icons/Azure.svg',
  meta: 'provider-icons/Meta.svg',
  perplexity: 'provider-icons/Perplexity.svg',
  exa: 'provider-icons/Exa.svg',
  tavily: 'provider-icons/Tavily.svg',
  kagi: 'provider-icons/Kagi.svg',
  mistral: 'provider-icons/Mistral.svg',
  deepseek: 'provider-icons/DeepSeek.svg',
  qwen: 'provider-icons/Qwen.svg',
  '01.ai': 'provider-icons/01AI.svg',
  alibaba: 'provider-icons/Alibaba.svg',
  cohere: 'provider-icons/Cohere.svg',
  groq: 'provider-icons/Groq.svg',
  xai: 'provider-icons/Groq.svg',
  moonshot: 'provider-icons/MoonshotAI.svg',
  moonshotai: 'provider-icons/MoonshotAI.svg',
  zhipu: 'provider-icons/Zhipu.svg',
  zai: 'provider-icons/Zhipu.svg',
  'z-ai': 'provider-icons/Zhipu.svg',
  minimax: 'provider-icons/Minimax.svg',
  openrouter: 'provider-icons/Openrouter.svg',
  deepinfra: 'provider-icons/Deepinfra.svg',
  parasail: 'provider-icons/Parasail.svg',
  together: 'provider-icons/Together.svg',
  fireworks: 'provider-icons/Fireworks.svg',
  novita: 'provider-icons/Novita.svg',
  nvidia: 'provider-icons/Nvidia.svg',
  amazon: 'provider-icons/Amazon.svg',
  awsbedrock: 'provider-icons/Amazon.svg',
  siliconflow: 'provider-icons/Siliconflow.svg',
  cerebras: 'provider-icons/Cerebras.svg',
  cloudflare: 'provider-icons/Cloudflare.svg',
  baseten: 'provider-icons/Baseten.svg',
  friendli: 'provider-icons/Friendli.svg',
  wandb: 'provider-icons/Wandb.svg',
  phala: 'provider-icons/Phala.svg',
  nebius: 'provider-icons/Nebius.svg',
  sambanova: 'provider-icons/Sambanova.svg',
  baidu: 'provider-icons/Baidu.svg',
  tencent: 'provider-icons/Tencent.svg',
  stepfun: 'provider-icons/Stepfun.svg',
  ollama: 'provider-icons/Olmo.svg',
  nanogpt: 'provider-icons/icon-192x192.png',
};
const PROVIDER_LABELS = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
  google: 'Google',
  microsoft: 'Azure',
  azure: 'Azure',
  meta: 'Meta',
  xai: 'xAI',
  nanogpt: 'NanoGPT',
};
const DARK_ICON_PROVIDERS = new Set(['openai', 'together', 'moonshot', 'moonshotai', 'zhipu', 'zai', 'z-ai', 'ollama']);
const PROMPT_MODES = {
  summarise: 'Summarise this clearly and concisely.',
  explain: 'Explain this clearly, with enough context to make it easy to understand.',
  translate: 'Translate this to English.',
};
const {
  buildPromptPayload,
  contentImages,
  contentText,
  toApiMessages,
} = NanoGPTComposerUtils;
const {
  appendDiagnosticError,
  formatDiagnosticsForReport,
} = NanoGPTDiagnosticsUtils;
const extensionApi = typeof browser !== 'undefined' ? browser : chrome;

const els = {
  status: document.getElementById('conversation-status'),
  settingsPanel: document.getElementById('settings-panel'),
  openSettings: document.getElementById('open-settings'),
  newChat: document.getElementById('new-chat'),
  askSelection: document.getElementById('ask-selection'),
  askImage: document.getElementById('ask-image'),
  askPage: document.getElementById('ask-page'),
  circleSearch: document.getElementById('circle-search'),
  modeSummarise: document.getElementById('mode-summarise'),
  modeExplain: document.getElementById('mode-explain'),
  modeTranslate: document.getElementById('mode-translate'),
  topModels: document.getElementById('top-models'),
  modelSelect: document.getElementById('model-select'),
  modelBrowserTrigger: document.getElementById('model-browser-trigger'),
  selectedModelIcon: document.getElementById('selected-model-icon'),
  selectedModelLabel: document.getElementById('selected-model-label'),
  modelBrowser: document.getElementById('model-browser'),
  modelSearch: document.getElementById('model-search'),
  modelCategories: document.getElementById('model-categories'),
  modelResults: document.getElementById('model-results'),
  onlineToggle: document.getElementById('online-toggle'),
  floatingIconToggle: document.getElementById('floating-icon-toggle'),
  authTitle: document.getElementById('auth-title'),
  apiKey: document.getElementById('api-key'),
  toggleKey: document.getElementById('toggle-key'),
  saveKey: document.getElementById('save-key'),
  ssoLogin: document.getElementById('sso-login'),
  openShortcuts: document.getElementById('open-shortcuts'),
  reportIssue: document.getElementById('report-issue'),
  clearChat: document.getElementById('clear-chat'),
  emptyState: document.getElementById('empty-state'),
  messages: document.getElementById('messages'),
  errorBanner: document.getElementById('error-banner'),
  draftAttachments: document.getElementById('draft-attachments'),
  form: document.getElementById('chat-form'),
  prompt: document.getElementById('prompt-input'),
  send: document.getElementById('send-button'),
  confirmModal: document.getElementById('confirm-modal'),
  confirmTitle: document.getElementById('confirm-title'),
  confirmMessage: document.getElementById('confirm-message'),
  confirmCancel: document.getElementById('confirm-cancel'),
  confirmAction: document.getElementById('confirm-action'),
  reportModal: document.getElementById('report-modal'),
  reportForm: document.getElementById('report-form'),
  reportDescription: document.getElementById('report-description'),
  reportContact: document.getElementById('report-contact'),
  reportIncludeDiagnostics: document.getElementById('report-include-diagnostics'),
  reportDiagnosticsPreview: document.getElementById('report-diagnostics-preview'),
  reportCancel: document.getElementById('report-cancel'),
  reportSubmit: document.getElementById('report-submit'),
};

let state = {
  messages: [],
  model: DEFAULT_MODEL,
  online: true,
  composerMode: null,
};

let isSending = false;
let draftImages = [];
let draftTexts = [];
let topModels = PREFERRED_TOP_MODELS;
let modelCatalog = PREFERRED_TOP_MODELS.map((model) => ({ ...model, name: model.label, provider: inferModelProvider(model), search: `${model.id} ${model.label}`.toLowerCase() }));
let activeModelCategory = 'recommended';

const nowId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const storageGet = (keys) => extensionApi.storage.local.get(keys);
const storageSet = (values) => extensionApi.storage.local.set(values);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function formatTime(timestamp) {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
  } catch {
    return '';
  }
}

function setBanner(message, variant = 'error') {
  els.errorBanner.textContent = message || '';
  els.errorBanner.hidden = !message;
  els.errorBanner.classList.toggle('notice', Boolean(message) && variant === 'notice');
}

function setError(message) {
  setBanner(message, 'error');
  if (message) recordDiagnosticError('visible-error', { message });
}

function setNotice(message) {
  setBanner(message, 'notice');
}

function userFacingErrorMessage(error) {
  const raw = error && error.message ? error.message : String(error || '');
  const requestId = error && typeof error.requestId === 'string' ? error.requestId.trim() : '';
  const withoutPrefix = raw.replace(/^API error\s+\d+:\s*/i, '').trim();
  const withRequestId = (message) => requestId ? `${message}\n\nRequest ID: ${requestId}` : message;
  if (!withoutPrefix) return withRequestId('Request failed.');

  try {
    const parsed = JSON.parse(withoutPrefix);
    const message = parsed?.error?.message || parsed?.message || parsed?.error;
    if (typeof message === 'string' && message.trim()) return withRequestId(message.trim());
  } catch {
    // Fall through to plain text.
  }

  return withRequestId(withoutPrefix);
}

async function recordDiagnosticError(action, error = {}) {
  try {
    const result = await storageGet(DIAGNOSTIC_ERRORS_KEY);
    const requestId = typeof error.requestId === 'string' ? error.requestId : '';
    const message = error && error.message ? error.message : error.message === '' ? '' : String(error.message || error || '');
    await storageSet({
      [DIAGNOSTIC_ERRORS_KEY]: appendDiagnosticError(result[DIAGNOSTIC_ERRORS_KEY], {
        component: 'sidebar',
        action,
        message,
        requestId,
        status: error.status,
      }),
    });
  } catch {
    // Diagnostics should never affect the assistant itself.
  }
}

async function buildReportDiagnostics() {
  const result = await storageGet([
    DIAGNOSTIC_ERRORS_KEY,
    'onlineSearchEnabled',
    'floatingIconEnabled',
    'floatingIconCorner',
    'nanogpt_api_key',
  ]);

  return formatDiagnosticsForReport({
    manifest: extensionApi.runtime.getManifest ? extensionApi.runtime.getManifest() : {},
    browser: navigator.userAgent,
    platform: navigator.platform,
    settings: {
      onlineSearchEnabled: result.onlineSearchEnabled,
      floatingIconEnabled: result.floatingIconEnabled,
      floatingIconCorner: result.floatingIconCorner,
      hasApiKey: Boolean(result.nanogpt_api_key),
    },
    state: {
      localMessageCount: state.messages.length,
      model: state.model,
      online: state.online,
      composerMode: state.composerMode,
      draftImageCount: draftImages.length,
      draftTextCount: draftTexts.length,
    },
    errors: result[DIAGNOSTIC_ERRORS_KEY],
  });
}

async function refreshReportDiagnosticsPreview() {
  if (!els.reportDiagnosticsPreview) return;
  els.reportDiagnosticsPreview.value = els.reportIncludeDiagnostics.checked
    ? await buildReportDiagnostics()
    : 'Diagnostics disabled.';
}

async function setReportModalOpen(open) {
  els.reportModal.hidden = !open;
  if (!open) {
    els.reportDescription.value = '';
    els.reportContact.value = '';
    els.reportSubmit.disabled = false;
    els.reportSubmit.textContent = 'Send report';
    els.openSettings.focus();
    return;
  }

  await refreshReportDiagnosticsPreview();
  requestAnimationFrame(() => els.reportDescription.focus());
}

async function submitIssueReport() {
  const description = els.reportDescription.value.trim();
  if (description.length < 2) {
    setError('Please describe the issue before sending a report.');
    return;
  }

  els.reportSubmit.disabled = true;
  els.reportSubmit.textContent = 'Sending...';

  const contactInfo = els.reportContact.value.trim();
  const includeDiagnostics = els.reportIncludeDiagnostics.checked;
  const diagnostics = includeDiagnostics ? JSON.parse(await buildReportDiagnostics()) : null;
  const bodyText = [
    description,
    '',
    'Source: NanoGPT Browser Assistant',
    contactInfo ? `Contact: ${contactInfo}` : null,
  ].filter(Boolean).join('\n');
  const reportPayload = {
    reportType: 'extension',
    reportVersion: 1,
    issue: { description },
    included: {
      extensionDiagnostics: includeDiagnostics,
      contactInfo: Boolean(contactInfo),
    },
    ...(includeDiagnostics ? { diagnostics } : {}),
    ...(contactInfo ? { contact: { contactInfo } } : {}),
  };

  const formData = new FormData();
  formData.append('bugReport', bodyText);
  formData.append('reportType', 'extension');
  formData.append('reportPayload', JSON.stringify(reportPayload));
  if (contactInfo) formData.append('contactInfo', contactInfo);

  try {
    const response = await fetch('https://nano-gpt.com/api/bug-report', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to submit report.');
    }
    await setReportModalOpen(false);
    setNotice('Report sent. Thank you.');
  } catch (error) {
    await recordDiagnosticError('submit-issue-report', error);
    setError(error.message || String(error));
    els.reportSubmit.disabled = false;
    els.reportSubmit.textContent = 'Send report';
  }
}

function showConfirmDialog({ title, message, actionLabel }) {
  return new Promise((resolve) => {
    const previousFocus = document.activeElement;
    let settled = false;

    const finish = (confirmed) => {
      if (settled) return;
      settled = true;
      els.confirmModal.hidden = true;
      document.removeEventListener('keydown', onKeyDown, true);
      els.confirmCancel.removeEventListener('click', onCancel);
      els.confirmAction.removeEventListener('click', onConfirm);
      if (previousFocus && typeof previousFocus.focus === 'function') {
        previousFocus.focus();
      }
      resolve(confirmed);
    };

    const onCancel = () => finish(false);
    const onConfirm = () => finish(true);
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      }
    };

    els.confirmTitle.textContent = title;
    els.confirmMessage.textContent = message;
    els.confirmAction.textContent = actionLabel;
    els.confirmModal.hidden = false;
    els.confirmCancel.addEventListener('click', onCancel);
    els.confirmAction.addEventListener('click', onConfirm);
    document.addEventListener('keydown', onKeyDown, true);
    els.confirmCancel.focus();
  });
}

function setStatus() {
  const count = state.messages.filter((message) => message.role !== 'system').length;
  els.status.textContent = count ? `${count} local messages` : 'Local chat';
}

function normalizeStoredModel(model) {
  return model === LEGACY_DEFAULT_MODEL ? DEFAULT_MODEL : model;
}

function normalizeProvider(provider) {
  if (!provider || typeof provider !== 'string') return '';
  const normalized = provider.trim().toLowerCase();
  if (normalized === 'azure-openai') return 'azure';
  if (normalized === 'google-ai' || normalized === 'google-vertex') return 'google';
  if (normalized === 'anthropic-vertex') return 'anthropic';
  if (normalized === 'x-ai' || normalized === 'grok') return 'xai';
  if (normalized === '01ai') return '01.ai';
  return normalized;
}

function inferModelProvider(modelOrId) {
  const model = typeof modelOrId === 'string' ? { id: modelOrId } : (modelOrId || {});
  const explicit = normalizeProvider(model.provider || model.owned_by || model.owner || model.source);
  if (explicit && explicit !== 'system') return explicit;

  const haystack = `${model.id || ''} ${model.name || ''} ${model.label || ''}`.toLowerCase();
  if (/azure/.test(haystack)) return 'azure';
  if (/anthropic|claude/.test(haystack)) return 'anthropic';
  if (/gemini/.test(haystack)) return 'gemini';
  if (/google|palm|bison/.test(haystack)) return 'google';
  if (/openai|chatgpt|gpt-|^gpt|^o\d|\/o\d/.test(haystack)) return 'openai';
  if (/meta|llama/.test(haystack)) return 'meta';
  if (/perplexity|sonar/.test(haystack)) return 'perplexity';
  if (/mistral|mixtral|codestral|devstral/.test(haystack)) return 'mistral';
  if (/deepseek/.test(haystack)) return 'deepseek';
  if (/qwen|qwq/.test(haystack)) return 'qwen';
  if (/grok|xai|x-ai/.test(haystack)) return 'xai';
  if (/moonshot|kimi/.test(haystack)) return 'moonshot';
  if (/zhipu|glm|z-ai|zai/.test(haystack)) return 'zhipu';
  if (/minimax/.test(haystack)) return 'minimax';
  if (/alibaba|dashscope/.test(haystack)) return 'alibaba';
  if (/cohere|command/.test(haystack)) return 'cohere';
  if (/groq/.test(haystack)) return 'groq';
  if (/openrouter/.test(haystack)) return 'openrouter';
  if (/deepinfra/.test(haystack)) return 'deepinfra';
  if (/together/.test(haystack)) return 'together';
  if (/fireworks/.test(haystack)) return 'fireworks';
  if (/novita/.test(haystack)) return 'novita';
  if (/nvidia|nemotron/.test(haystack)) return 'nvidia';
  if (/amazon|bedrock|nova/.test(haystack)) return 'amazon';
  return 'nanogpt';
}

function providerLabel(provider) {
  const normalized = normalizeProvider(provider);
  if (!normalized) return 'NanoGPT';
  if (PROVIDER_LABELS[normalized]) return PROVIDER_LABELS[normalized];
  return normalized
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function iconInitials(label) {
  const words = label.split(/\s+/).filter(Boolean);
  const initials = words.length > 1 ? `${words[0][0]}${words[1][0]}` : label.slice(0, 2);
  return initials.toUpperCase();
}

function renderProviderIcon(target, modelOrProvider) {
  if (!target) return;
  const provider = typeof modelOrProvider === 'string' ? normalizeProvider(modelOrProvider) : inferModelProvider(modelOrProvider);
  const label = providerLabel(provider);
  const src = PROVIDER_ICON_MAP[provider];
  target.textContent = '';
  target.className = 'model-provider-icon';
  target.title = label;

  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    target.classList.toggle('invert', DARK_ICON_PROVIDERS.has(provider));
    target.appendChild(img);
    return;
  }

  target.classList.remove('invert');
  target.textContent = iconInitials(label);
}

function setSettingsOpen(open) {
  els.settingsPanel.hidden = !open;
  els.openSettings.classList.toggle('active', open);
  els.openSettings.setAttribute('aria-expanded', open ? 'true' : 'false');
  els.openSettings.title = open ? 'Close settings' : 'Settings';
  els.openSettings.setAttribute('aria-label', open ? 'Close settings' : 'Settings');
}

function setAuthState(isSignedIn) {
  els.settingsPanel.classList.toggle('signed-in', isSignedIn);
  els.settingsPanel.classList.toggle('signed-out', !isSignedIn);
}

async function saveApiKey(value, statusMessage = 'API key saved') {
  await storageSet({ nanogpt_api_key: value });
  els.apiKey.type = 'password';
  els.apiKey.value = '••••••••••••••';
  els.apiKey.dataset.masked = 'true';
  els.toggleKey.textContent = 'Show';
  setAuthState(true);
  setError('');
  els.status.textContent = statusMessage;
  setTimeout(setStatus, 1800);
}

function renderDraftAttachments() {
  els.draftAttachments.innerHTML = '';
  els.draftAttachments.hidden = draftImages.length === 0 && draftTexts.length === 0;

  for (const attachment of draftTexts) {
    const item = document.createElement('div');
    item.className = 'draft-attachment text';

    const label = document.createElement('span');
    label.textContent = attachment.label || 'Selection attached';

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'secondary-button draft-remove';
    remove.title = 'Remove selection';
    remove.setAttribute('aria-label', 'Remove selection');
    remove.textContent = 'x';
    remove.addEventListener('click', () => {
      draftTexts = draftTexts.filter((item) => item.id !== attachment.id);
      renderDraftAttachments();
      if (!draftTexts.length && !draftImages.length) setNotice('');
      els.prompt.focus();
    });

    item.append(label, remove);
    els.draftAttachments.appendChild(item);
  }

  for (const attachment of draftImages) {
    const item = document.createElement('div');
    item.className = attachment.label ? 'draft-attachment' : 'draft-attachment compact';

    const preview = document.createElement('button');
    preview.type = 'button';
    preview.className = 'draft-preview-button';
    preview.title = 'Preview image';
    preview.setAttribute('aria-label', 'Preview image');

    const img = document.createElement('img');
    img.src = attachment.url;
    img.alt = 'Draft image attachment';
    preview.appendChild(img);
    preview.addEventListener('click', () => {
      openDraftImagePreview(attachment.url);
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'secondary-button draft-remove';
    remove.title = 'Remove image';
    remove.setAttribute('aria-label', 'Remove image');
    remove.textContent = 'x';
    remove.addEventListener('click', () => {
      draftImages = draftImages.filter((item) => item.id !== attachment.id);
      renderDraftAttachments();
      if (!draftImages.length && !draftTexts.length) setNotice('');
      els.prompt.focus();
    });

    item.append(preview);
    if (attachment.label) {
      const label = document.createElement('span');
      label.textContent = attachment.label;
      item.append(label);
    }
    item.append(remove);
    els.draftAttachments.appendChild(item);
  }
}

function openDraftImagePreview(url) {
  if (!url) return;
  document.querySelector('.image-preview-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'image-preview-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Image preview');

  const panel = document.createElement('div');
  panel.className = 'image-preview-panel';

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'secondary-button image-preview-close';
  close.textContent = 'Close';
  close.setAttribute('aria-label', 'Close preview');

  const img = document.createElement('img');
  img.src = url;
  img.alt = 'Large draft image preview';

  const cleanup = () => {
    document.removeEventListener('keydown', onKeyDown, true);
    overlay.remove();
    els.prompt.focus();
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') cleanup();
  };

  close.addEventListener('click', cleanup);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) cleanup();
  });
  panel.append(close, img);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  document.addEventListener('keydown', onKeyDown, true);
  close.focus();
}

function addDraftImage(url, label = '', noticeLabel = 'Image') {
  if (!url) return;
  draftImages.push({ id: nowId(), url, label });
  renderDraftAttachments();
  setNotice(`${noticeLabel || 'Image'} attached. Add a message and send when ready.`);
  els.prompt.focus();
}

function addDraftText(text, label) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return;
  draftTexts.push({ id: nowId(), text: trimmed, label });
  renderDraftAttachments();
  setNotice(`${label} attached. Add a message and send when ready.`);
  els.prompt.focus();
}

function clearDraftImages() {
  draftImages = [];
  renderDraftAttachments();
}

function clearDraftAttachments() {
  draftImages = [];
  draftTexts = [];
  renderDraftAttachments();
}

function appendInlineMarkdown(parent, text) {
  const pattern = /(`[^`\n]+`|\*\*[^*]+?\*\*|\*[^*\n]+?\*|\[[^\]\n]+?\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\))/g;
  let cursor = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      parent.appendChild(document.createTextNode(text.slice(cursor, match.index)));
    }

    const token = match[0];
    if (token.startsWith('`')) {
      const code = document.createElement('code');
      code.textContent = token.slice(1, -1);
      parent.appendChild(code);
    } else if (token.startsWith('**')) {
      const strong = document.createElement('strong');
      appendInlineMarkdown(strong, token.slice(2, -2));
      parent.appendChild(strong);
    } else if (token.startsWith('*')) {
      const em = document.createElement('em');
      appendInlineMarkdown(em, token.slice(1, -1));
      parent.appendChild(em);
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]\n]+?)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)$/);
      if (linkMatch) {
        const anchor = document.createElement('a');
        anchor.href = linkMatch[2];
        anchor.target = '_blank';
        anchor.rel = 'noreferrer';
        anchor.textContent = linkMatch[1];
        parent.appendChild(anchor);
      } else {
        parent.appendChild(document.createTextNode(token));
      }
    }

    cursor = match.index + token.length;
  }

  if (cursor < text.length) {
    parent.appendChild(document.createTextNode(text.slice(cursor)));
  }
}

function renderMarkdown(text) {
  const root = document.createElement('div');
  root.className = 'markdown-body';
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  let index = 0;

  const appendParagraph = (paragraphLines) => {
    const content = paragraphLines.join(' ').trim();
    if (!content) return;
    const paragraph = document.createElement('p');
    appendInlineMarkdown(paragraph, content);
    root.appendChild(paragraph);
  };

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^\s*```([a-z0-9_-]*)\s*$/i);
    if (fence) {
      index += 1;
      const codeLines = [];
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      if (fence[1]) code.dataset.language = fence[1];
      code.textContent = codeLines.join('\n');
      pre.appendChild(code);
      root.appendChild(pre);
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = String(heading[1].length + 2);
      const element = document.createElement(`h${level}`);
      appendInlineMarkdown(element, heading[2].trim());
      root.appendChild(element);
      index += 1;
      continue;
    }

    const listMatch = line.match(/^\s*(?:([-*+])|(\d+)\.)\s+(.+)$/);
    if (listMatch) {
      const ordered = Boolean(listMatch[2]);
      const list = document.createElement(ordered ? 'ol' : 'ul');
      while (index < lines.length) {
        const itemMatch = lines[index].match(/^\s*(?:([-*+])|(\d+)\.)\s+(.+)$/);
        if (!itemMatch || Boolean(itemMatch[2]) !== ordered) break;
        const item = document.createElement('li');
        appendInlineMarkdown(item, itemMatch[3].trim());
        list.appendChild(item);
        index += 1;
      }
      root.appendChild(list);
      continue;
    }

    const paragraphLines = [line];
    index += 1;
    while (
      index < lines.length
      && lines[index].trim()
      && !/^\s*```/.test(lines[index])
      && !/^(#{1,3})\s+/.test(lines[index])
      && !/^\s*(?:[-*+]|\d+\.)\s+/.test(lines[index])
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    appendParagraph(paragraphLines);
  }

  return root;
}

function renderMessage(message) {
  const wrapper = document.createElement('article');
  wrapper.className = `message ${message.role || 'assistant'}`;

  const meta = document.createElement('div');
  meta.className = 'message-meta';
  const label = message.role === 'user' ? 'You' : message.role === 'system' ? 'Notice' : 'NanoGPT';
  meta.textContent = `${label}${message.timestamp ? ` · ${formatTime(message.timestamp)}` : ''}`;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  if (message.pending) {
    const typing = document.createElement('span');
    typing.className = 'typing';
    typing.setAttribute('aria-label', 'NanoGPT is typing');
    typing.innerHTML = '<span></span><span></span><span></span>';
    bubble.appendChild(typing);
  } else {
    const text = contentText(message.content);
    const images = contentImages(message.content);
    if (text) {
      bubble.appendChild(message.role === 'assistant' ? renderMarkdown(text) : document.createTextNode(text));
    }
    for (const imageUrl of images) {
      const img = document.createElement('img');
      img.className = 'message-image';
      img.src = imageUrl;
      img.alt = 'Attached image';
      bubble.appendChild(img);
    }
    if (message.authAction === 'sign-in') {
      const actions = document.createElement('div');
      actions.className = 'message-actions';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'primary-button message-action-button';
      button.textContent = 'Sign in on nano-gpt.com';
      button.addEventListener('click', () => {
        signInWithNanoGPT().catch((error) => setError(error.message || String(error)));
      });
      actions.appendChild(button);
      bubble.appendChild(actions);
    }
    if (!text && images.length === 0 && !message.authAction) {
      bubble.textContent = '';
    }
  }

  wrapper.append(meta, bubble);
  return wrapper;
}

function render() {
  els.messages.innerHTML = '';
  els.emptyState.hidden = state.messages.length > 0;

  for (const message of state.messages) {
    els.messages.appendChild(renderMessage(message));
  }

  setStatus();
  requestAnimationFrame(() => {
    els.messages.scrollTop = els.messages.scrollHeight;
  });
}

async function persist() {
  await storageSet({
    [STORAGE_KEY]: {
      messages: state.messages.filter((message) => !message.pending),
      model: state.model,
      online: state.online,
      composerMode: state.composerMode,
      updatedAt: Date.now(),
    },
    onlineSearchEnabled: state.online,
  });
}

function autosizePrompt() {
  els.prompt.style.height = 'auto';
  els.prompt.style.height = `${Math.min(els.prompt.scrollHeight, 160)}px`;
}

async function loadSettings() {
  const result = await storageGet([
    STORAGE_KEY,
    'onlineSearchEnabled',
    'floatingIconEnabled',
    'nanogpt_api_key',
  ]);

  const stored = result[STORAGE_KEY] || {};
  state = {
    messages: Array.isArray(stored.messages) ? stored.messages : [],
    model: normalizeStoredModel(stored.model) || DEFAULT_MODEL,
    online: typeof stored.online === 'boolean'
      ? stored.online
      : result.onlineSearchEnabled !== false,
    composerMode: stored.composerMode === 'summarise' || stored.composerMode === 'explain' || stored.composerMode === 'translate'
      ? stored.composerMode
      : null,
  };

  els.onlineToggle.checked = state.online;
  els.floatingIconToggle.checked = result.floatingIconEnabled !== false;
  syncComposerMode();
  syncModelControls();

  if (result.nanogpt_api_key) {
    els.apiKey.value = '••••••••••••••';
    els.apiKey.dataset.masked = 'true';
  }
  setAuthState(Boolean(result.nanogpt_api_key));

  render();
}

async function consumePendingPrompt() {
  const result = await storageGet(PENDING_PROMPT_KEY);
  const pending = result[PENDING_PROMPT_KEY];
  if (!pending || !pending.id) return;

  await storageSet({ [PENDING_PROMPT_KEY]: null });
  clearModeButtons();

  if (pending.model && typeof pending.model === 'string') {
    state.model = normalizeStoredModel(pending.model) || DEFAULT_MODEL;
    syncModelControls();
  }
  if (typeof pending.online === 'boolean') {
    state.online = pending.online;
    els.onlineToggle.checked = pending.online;
  }

  const text = typeof pending.text === 'string' ? pending.text : '';
  const imageUrl = typeof pending.imageUrl === 'string' ? pending.imageUrl : '';
  if (imageUrl) {
    const attachmentLabel = typeof pending.attachmentLabel === 'string' ? pending.attachmentLabel : 'Image';
    const visibleLabel = attachmentLabel === 'Image' || attachmentLabel === 'Area'
      ? attachmentLabel
      : (text === 'What is in this image?' ? '' : text);
    addDraftImage(imageUrl, visibleLabel, attachmentLabel);
    return;
  }

  if (pending.draft && text) {
    addDraftText(text, 'Selection');
    return;
  }

  await sendPrompt(text, { displayText: text });
}

function chooseTopModels(modelIds) {
  const available = new Set(modelIds);
  const chosen = [];

  for (const preferred of PREFERRED_TOP_MODELS) {
    if (available.has(preferred.id)) chosen.push(preferred);
  }

  if (!chosen.some((model) => model.id === DEFAULT_MODEL)) {
    chosen.unshift(PREFERRED_TOP_MODELS[0]);
  }

  for (const id of modelIds) {
    if (chosen.length >= 3) break;
    if (chosen.some((model) => model.id === id)) continue;
    chosen.push({ id, label: humanizeModelId(id), provider: inferModelProvider(id) });
  }

  return chosen.slice(0, 3);
}

function renderTopModels() {
  if (!els.topModels) return;
  els.topModels.innerHTML = '';
  for (const model of topModels) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'top-model-button';
    button.dataset.model = model.id;
    button.title = model.id;
    button.textContent = model.label;
    button.setAttribute('aria-pressed', model.id === state.model ? 'true' : 'false');
    button.classList.toggle('active', model.id === state.model);
    els.topModels.appendChild(button);
  }
}

function humanizeModelId(id) {
  if (!id) return '';
  if (MODEL_DISPLAY_ALIASES[id]) return MODEL_DISPLAY_ALIASES[id];
  let value = id
    .replace(/^openai\//i, '')
    .replace(/^anthropic\//i, '')
    .replace(/^google\//i, '')
    .replace(/^azure-/i, '')
    .replace(/^models\//i, '')
    .replace(/^TEE\//i, '')
    .replace(/[:/_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  value = value.split(' ').map((part) => {
    const lower = part.toLowerCase();
    if (lower === 'gpt') return 'GPT';
    if (lower === 'chatgpt') return 'ChatGPT';
    if (lower === 'ai') return 'AI';
    if (lower === 'api') return 'API';
    if (lower === 'tee') return 'TEE';
    if (lower === 'glm') return 'GLM';
    if (lower === 'vl') return 'VL';
    if (lower === 'ui') return 'UI';
    if (lower === 'ocr') return 'OCR';
    if (/^o\d/.test(lower)) return lower;
    if (/^gpt\d/.test(lower)) return `GPT-${part.slice(3)}`;
    return part.charAt(0).toUpperCase() + part.slice(1);
  }).join(' ');

  value = value
    .replace(/\bGPT ([\w.]+)/g, 'GPT-$1')
    .replace(/\bChatGPT ([\w.]+)/g, 'ChatGPT-$1')
    .replace(/\bClaude 3 5\b/g, 'Claude 3.5')
    .replace(/\bClaude 3 7\b/g, 'Claude 3.7')
    .replace(/\b4 O\b/g, '4o')
    .replace(/\b4o\b/g, '4o')
    .replace(/\bLatest\b$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  return value || id;
}

function cleanModelName(name, id) {
  const raw = typeof name === 'string' ? name.trim() : '';
  if (!raw || raw === id) return humanizeModelId(id);
  return raw.replace(/\s+Thinking(\s|$)/i, ' ').replace(/\s+/g, ' ').trim();
}

function modelDisplayName(model) {
  if (!model) return '';
  if (model.name) return model.name;
  if (model.label && model.label !== model.id) return model.label;
  return humanizeModelId(model.id);
}

function getModelById(id) {
  return modelCatalog.find((model) => model.id === id) || topModels.find((model) => model.id === id);
}

function modelMatchesCategory(model, category) {
  const haystack = `${model.id} ${model.name || ''} ${model.label || ''} ${model.provider || ''} ${model.category || ''}`.toLowerCase();
  if (category === 'all') return true;
  if (category === 'recommended') return topModels.some((topModel) => topModel.id === model.id);
  if (category === 'openai') return /openai|gpt|chatgpt|o\d/.test(haystack);
  if (category === 'claude') return /anthropic|claude/.test(haystack);
  if (category === 'gemini') return /google|gemini/.test(haystack);
  if (category === 'reasoning') return /reason|thinking|deep[- ]?research|o\d|r1|r2/.test(haystack);
  if (category === 'coding') return /code|coder|codex|devstral|qwen|deepseek/.test(haystack);
  if (category === 'vision') return /vision|vl|image|multimodal|gpt-4o|gemini|claude/.test(haystack);
  return true;
}

function modelBrowserCategories() {
  const categories = [
    { id: 'recommended', label: 'Recommended' },
    { id: 'all', label: 'All' },
    { id: 'openai', label: 'OpenAI' },
    { id: 'claude', label: 'Claude' },
    { id: 'gemini', label: 'Gemini' },
    { id: 'reasoning', label: 'Reasoning' },
    { id: 'coding', label: 'Coding' },
    { id: 'vision', label: 'Vision' },
  ];
  return categories.filter((category) => category.id === 'all' || modelCatalog.some((model) => modelMatchesCategory(model, category.id)));
}

function renderModelCategories() {
  els.modelCategories.innerHTML = '';
  for (const category of modelBrowserCategories()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'model-category-button';
    button.dataset.category = category.id;
    button.textContent = category.label;
    button.classList.toggle('active', category.id === activeModelCategory);
    button.setAttribute('aria-pressed', category.id === activeModelCategory ? 'true' : 'false');
    els.modelCategories.appendChild(button);
  }
}

function renderModelResults() {
  const query = els.modelSearch.value.trim().toLowerCase();
  const selectedTopIds = new Set(topModels.map((model) => model.id));
  const models = modelCatalog
    .filter((model) => modelMatchesCategory(model, activeModelCategory))
    .filter((model) => !query || model.search.includes(query))
    .sort((a, b) => {
      const topA = selectedTopIds.has(a.id) ? 0 : 1;
      const topB = selectedTopIds.has(b.id) ? 0 : 1;
      if (topA !== topB) return topA - topB;
      return modelDisplayName(a).localeCompare(modelDisplayName(b));
    })
    .slice(0, 80);

  els.modelResults.innerHTML = '';
  if (!models.length) {
    const empty = document.createElement('div');
    empty.className = 'model-empty';
    empty.textContent = 'No models found';
    els.modelResults.appendChild(empty);
    return;
  }

  for (const model of models) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'model-result-button';
    button.dataset.model = model.id;
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', model.id === state.model ? 'true' : 'false');
    button.classList.toggle('active', model.id === state.model);

    const icon = document.createElement('span');
    renderProviderIcon(icon, model);

    const copy = document.createElement('span');
    copy.className = 'model-result-copy';

    const name = document.createElement('span');
    name.className = 'model-result-name';
    name.textContent = modelDisplayName(model);

    const id = document.createElement('span');
    id.className = 'model-result-id';
    id.textContent = model.id;

    copy.append(name, id);
    button.append(icon, copy);
    els.modelResults.appendChild(button);
  }
}

function syncModelBrowser() {
  const selected = getModelById(state.model);
  renderProviderIcon(els.selectedModelIcon, selected || state.model || DEFAULT_MODEL);
  els.selectedModelLabel.textContent = modelDisplayName(selected) || state.model || 'Choose model';
  renderModelCategories();
  renderModelResults();
}

function setModelBrowserOpen(open) {
  els.modelBrowser.hidden = !open;
  els.modelBrowserTrigger.classList.toggle('active', open);
  els.modelBrowserTrigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) {
    renderModelCategories();
    renderModelResults();
    requestAnimationFrame(() => els.modelSearch.focus());
  }
}

async function selectModel(modelId) {
  state.model = normalizeStoredModel(modelId) || DEFAULT_MODEL;
  syncModelControls();
  setModelBrowserOpen(false);
  await persist();
}

function selectedModelName() {
  const model = getModelById(state.model);
  if (model) return modelDisplayName(model);

  const selectedOption = [...els.modelSelect.options].find((option) => option.value === state.model);
  if (!selectedOption) return state.model || 'NanoGPT';

  return selectedOption.textContent.replace(/\s+\([^)]+\)$/, '').trim() || selectedOption.value;
}

function syncModelControls() {
  if (![...els.modelSelect.options].some((option) => option.value === state.model)) {
    const option = document.createElement('option');
    option.value = state.model;
    option.textContent = state.model;
    els.modelSelect.prepend(option);
  }
  els.modelSelect.value = state.model || DEFAULT_MODEL;
  els.prompt.placeholder = `Ask ${selectedModelName()}`;
  renderTopModels();
  syncModelBrowser();
}

async function populateModels() {
  try {
    const result = await storageGet('nanogpt_api_key');
    const apiKey = result.nanogpt_api_key;
    const response = await fetch('https://nano-gpt.com/api/v1/models?detailed=true&ui=true&sort=mostused', {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    });
    if (!response.ok) throw new Error('Failed to fetch models');
    const data = await response.json();
    const models = Array.isArray(data && data.data) ? data.data : [];
    if (!models.length) return;

    els.modelSelect.innerHTML = '';
    const modelIds = [];
    const catalog = [];
    for (const model of models) {
      const id = model.id || model.name || model.model;
      if (!id) continue;
      const name = cleanModelName(model.displayName || model.name, id);
      const provider = inferModelProvider({
        id,
        name,
        provider: model.owned_by || model.provider || model.owner || model.source,
      });
      modelIds.push(id);
      catalog.push({
        id,
        name,
        label: name,
        provider,
        category: model.category || '',
        search: `${id} ${name} ${provider} ${providerLabel(provider)} ${model.description || ''} ${model.owned_by || ''} ${model.category || ''}`.toLowerCase(),
      });
      const option = document.createElement('option');
      option.value = id;
      option.textContent = name !== id ? `${name} (${id})` : id;
      els.modelSelect.appendChild(option);
    }

    topModels = chooseTopModels(modelIds);
    modelCatalog = catalog.length ? catalog : modelCatalog;
    if (!modelIds.includes(state.model)) state.model = DEFAULT_MODEL;

    syncModelControls();
  } catch {
    topModels = PREFERRED_TOP_MODELS;
    modelCatalog = PREFERRED_TOP_MODELS.map((model) => ({ ...model, name: model.label, provider: inferModelProvider(model), search: `${model.id} ${model.label}`.toLowerCase() }));
    syncModelControls();
  }
}

function runtimeSendMessage(message) {
  return extensionApi.runtime.sendMessage(message);
}

function setPendingFailure(pendingId, message, authRequired = false) {
  const pendingIndex = state.messages.findIndex((item) => item.id === pendingId);
  if (pendingIndex < 0) return;
  state.messages[pendingIndex] = {
    id: pendingId,
    role: 'system',
    content: message,
    timestamp: Date.now(),
    authAction: authRequired ? 'sign-in' : undefined,
  };
}

function streamAssistantResponse(pendingId, body) {
  const requestId = nowId();
  let streamedContent = '';
  let renderFrame = null;

  const updatePendingContent = () => {
    renderFrame = null;
    const pendingIndex = state.messages.findIndex((message) => message.id === pendingId);
    if (pendingIndex < 0) return;
    state.messages[pendingIndex] = {
      ...state.messages[pendingIndex],
      role: 'assistant',
      content: streamedContent,
      pending: true,
    };
    render();
  };

  const scheduleRender = () => {
    if (renderFrame !== null) return;
    renderFrame = requestAnimationFrame(updatePendingContent);
  };

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      extensionApi.runtime.onMessage.removeListener(onStreamMessage);
      if (renderFrame !== null) {
        cancelAnimationFrame(renderFrame);
        updatePendingContent();
      }
    };

    const finish = () => {
      cleanup();
      const pendingIndex = state.messages.findIndex((message) => message.id === pendingId);
      if (pendingIndex >= 0) {
        state.messages[pendingIndex] = {
          id: pendingId,
          role: 'assistant',
          content: streamedContent,
          timestamp: Date.now(),
        };
      }
      resolve();
    };

    const fail = (error) => {
      cleanup();
      reject(error);
    };

    const onStreamMessage = (message) => {
      if (!message || message.requestId !== requestId) return undefined;
      if (message.action === 'nanogpt_chat_delta') {
        streamedContent += message.delta || '';
        scheduleRender();
      } else if (message.action === 'nanogpt_chat_done') {
        finish();
      } else if (message.action === 'nanogpt_chat_error') {
        const error = new Error(message.error || 'Request failed.');
        error.requestId = message.serverRequestId || message.requestId || requestId;
        fail(error);
      }
      return undefined;
    };

    extensionApi.runtime.onMessage.addListener(onStreamMessage);
    runtimeSendMessage({
      action: 'nanogpt_chat_stream',
      requestId,
      body: { ...body, stream: true },
    }).then((started) => {
      if (!started || !started.ok) {
        const error = new Error(started && started.authRequired ? 'You are not signed in.' : started && started.error ? started.error : 'Request failed.');
        error.authRequired = Boolean(started && started.authRequired);
        error.requestId = started && started.requestId ? started.requestId : requestId;
        fail(error);
      }
    }).catch(fail);
  });
}

async function openShortcutSettings() {
  try {
    await extensionApi.tabs.create({ url: 'about:addons' });
    setError('In Add-ons Manager, open the gear menu and choose Manage Extension Shortcuts.');
  } catch {
    setError('Open about:addons, then use the gear menu to choose Manage Extension Shortcuts.');
  }
}

async function signInWithNanoGPT() {
  els.ssoLogin.disabled = true;
  els.ssoLogin.textContent = 'Opening sign in...';
  setError('');

  try {
    const startResponse = await fetch('https://nano-gpt.com/api/cli-login/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'NanoGPT Browser Assistant',
        source: 'extension',
      }),
    });

    const startData = await startResponse.json().catch(() => null);
    if (!startResponse.ok || !startData?.device_code || !startData?.verification_uri_complete) {
      throw new Error(startData?.error || `Sign-in start failed (${startResponse.status})`);
    }

    extensionApi.tabs.create({ url: startData.verification_uri_complete });
    els.ssoLogin.textContent = 'Waiting for approval...';
    els.status.textContent = `Approve code ${startData.user_code || ''}`.trim();

    const expiresAt = Date.now() + Math.max(30, Number(startData.expires_in || 600)) * 1000;
    const intervalMs = Math.max(2, Number(startData.interval || 2)) * 1000;

    while (Date.now() < expiresAt) {
      await sleep(intervalMs);
      const pollResponse = await fetch('https://nano-gpt.com/api/cli-login/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_code: startData.device_code }),
      });
      const pollData = await pollResponse.json().catch(() => null);

      if (pollResponse.status === 202 || pollData?.status === 'authorization_pending') {
        continue;
      }

      if (pollResponse.ok && pollData?.status === 'approved' && pollData?.key) {
        await saveApiKey(pollData.key, 'Signed in');
        return;
      }

      if (pollData?.status === 'expired' || pollResponse.status === 410) {
        throw new Error('Sign-in expired. Try again.');
      }

      throw new Error(pollData?.error || pollData?.status || `Sign-in failed (${pollResponse.status})`);
    }

    throw new Error('Sign-in timed out. Try again.');
  } finally {
    els.ssoLogin.disabled = false;
    els.ssoLogin.textContent = 'Sign in with NanoGPT';
  }
}

async function getActiveTab() {
  const tabs = await extensionApi.tabs.query({ active: true, currentWindow: true });
  return tabs && tabs[0];
}

async function sendActiveTabMessage(message) {
  const tab = await getActiveTab();
  if (!tab || !tab.id) {
    return { ok: false, error: 'No active tab found.' };
  }

  try {
    return await extensionApi.tabs.sendMessage(tab.id, message);
  } catch (error) {
    const messageText = error && error.message ? error.message : String(error);
    const missingReceiver = messageText.includes('Receiving end does not exist') || messageText.includes('Could not establish connection');
    if (!missingReceiver) {
      return { ok: false, error: messageText };
    }

    try {
      await extensionApi.tabs.executeScript(tab.id, { file: 'browser-polyfill.min.js' });
      await extensionApi.tabs.executeScript(tab.id, { file: 'content.js' });
      return await extensionApi.tabs.sendMessage(tab.id, message);
    } catch (injectError) {
      return {
        ok: false,
        error: 'This page is not available to the extension. Try reloading the tab or use a regular web page.',
      };
    }
  }
}

function setActiveQuickAction(button, isActive) {
  if (!button) return;
  button.classList.toggle('active', isActive);
  button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
}

function syncComposerMode() {
  const mode = state.composerMode;
  els.modeSummarise.classList.toggle('active', mode === 'summarise');
  els.modeSummarise.setAttribute('aria-pressed', mode === 'summarise' ? 'true' : 'false');
  els.modeExplain.classList.toggle('active', mode === 'explain');
  els.modeExplain.setAttribute('aria-pressed', mode === 'explain' ? 'true' : 'false');
  els.modeTranslate.classList.toggle('active', mode === 'translate');
  els.modeTranslate.setAttribute('aria-pressed', mode === 'translate' ? 'true' : 'false');
}

async function toggleComposerMode(mode) {
  state.composerMode = state.composerMode === mode ? null : mode;
  syncComposerMode();
  await persist();
}

function clearModeButtons() {
  setActiveQuickAction(els.askSelection, false);
  setActiveQuickAction(els.askImage, false);
  setActiveQuickAction(els.askPage, false);
  setActiveQuickAction(els.circleSearch, false);
}

function hasActivePageTool() {
  return [els.askSelection, els.askImage, els.circleSearch].some((button) => button?.classList.contains('active'));
}

function cancelActivePageTool() {
  if (!hasActivePageTool()) return;
  clearModeButtons();
  setNotice('');
  sendActiveTabMessage({ action: 'nanogpt_cancel_page_action' }).catch(() => undefined);
}

async function askActiveSelection() {
  setActiveQuickAction(els.askSelection, true);
  const response = await sendActiveTabMessage({ action: 'nanogpt_start_selection_pick' });
  if (!response || !response.ok) {
    setActiveQuickAction(els.askSelection, false);
    setError(response && response.error ? response.error : 'Selection mode is not available on this page.');
    return;
  }
  setNotice('Select text or click an element on the active page. Press Esc to cancel.');
}

async function activateImagePick() {
  setActiveQuickAction(els.askImage, true);
  const response = await sendActiveTabMessage({ action: 'nanogpt_start_image_pick' });
  if (!response || !response.ok) {
    setActiveQuickAction(els.askImage, false);
    setError(response && response.error ? response.error : 'Image pick mode is not available on this page.');
    return;
  }
  setNotice('Click an image on the active page. Press Esc to cancel.');
}

async function attachEntirePage() {
  setActiveQuickAction(els.askPage, true);
  const response = await sendActiveTabMessage({ action: 'nanogpt_get_page_text' });
  setActiveQuickAction(els.askPage, false);
  if (!response || !response.ok || !response.text) {
    setError(response && response.error ? response.error : 'Could not read page text from the active page.');
    return;
  }

  addDraftText(response.text, 'Entire page');
}

async function activateCircleSearch() {
  setActiveQuickAction(els.circleSearch, true);
  const response = await sendActiveTabMessage({ action: 'nanogpt_start_circle_search' });
  if (!response || !response.ok) {
    setActiveQuickAction(els.circleSearch, false);
    setError(response && response.error ? response.error : 'Circle search is not available on this page.');
    return;
  }
  setNotice('Drag around an area on the active page. Press Esc to cancel.');
}

async function sendPrompt(content, options = {}) {
  if (isSending) return;
  const attachedImages = draftImages.slice();
  const attachedTexts = draftTexts.slice();
  const { displayText: generatedDisplayText, imageUrls, prompt } = buildPromptPayload({
    content,
    draftImages: attachedImages,
    draftTexts: attachedTexts,
    composerMode: state.composerMode,
    promptModes: PROMPT_MODES,
  });
  const displayText = typeof options.displayText === 'string'
    ? options.displayText.trim()
    : generatedDisplayText;
  if (!displayText && imageUrls.length === 0) return;

  isSending = true;
  setError('');
  els.send.disabled = true;

  state.messages.push({
    id: nowId(),
    role: 'user',
    content: prompt,
    timestamp: Date.now(),
  });

  const pendingId = nowId();
  state.messages.push({
    id: pendingId,
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
    pending: true,
  });

  els.prompt.value = '';
  if (attachedImages.length || attachedTexts.length) clearDraftAttachments();
  autosizePrompt();
  render();
  await persist();

  const model = state.online ? `${state.model}:online` : state.model;
  const messages = toApiMessages(state.messages.filter((message) => message.id !== pendingId));

  try {
    await streamAssistantResponse(pendingId, {
      model,
      messages,
    });
  } catch (error) {
    const authRequired = Boolean(error && error.authRequired);
    const message = authRequired ? 'You are not signed in.' : userFacingErrorMessage(error);
    setPendingFailure(pendingId, message, authRequired);
    setError(authRequired ? '' : message);
  } finally {
    isSending = false;
    els.send.disabled = false;
    render();
    await persist();
    els.prompt.focus();
  }
}

function bindEvents() {
  els.openSettings.addEventListener('click', () => {
    setSettingsOpen(els.settingsPanel.hidden);
  });

  els.newChat.addEventListener('click', async () => {
    if (state.messages.length) {
      const confirmed = await showConfirmDialog({
        title: 'Start a new chat?',
        message: 'This clears the current local messages.',
        actionLabel: 'Start new chat',
      });
      if (!confirmed) return;
    }
    state.messages = [];
    clearDraftAttachments();
    setError('');
    render();
    await persist();
    els.prompt.focus();
  });

  els.clearChat.addEventListener('click', async () => {
    if (state.messages.length) {
      const confirmed = await showConfirmDialog({
        title: 'Clear chat?',
        message: 'This removes the current local messages.',
        actionLabel: 'Clear chat',
      });
      if (!confirmed) return;
    }
    state.messages = [];
    clearDraftAttachments();
    setError('');
    render();
    await persist();
  });

  els.askSelection.addEventListener('click', () => {
    askActiveSelection().catch((error) => setError(error.message || String(error)));
  });

  els.askImage.addEventListener('click', () => {
    activateImagePick().catch((error) => {
      setActiveQuickAction(els.askImage, false);
      setError(error.message || String(error));
    });
  });

  els.askPage.addEventListener('click', () => {
    attachEntirePage().catch((error) => {
      setActiveQuickAction(els.askPage, false);
      setError(error.message || String(error));
    });
  });

  els.circleSearch.addEventListener('click', () => {
    activateCircleSearch().catch((error) => {
      setActiveQuickAction(els.circleSearch, false);
      setError(error.message || String(error));
    });
  });

  els.modeSummarise.addEventListener('click', () => {
    toggleComposerMode('summarise').catch((error) => setError(error.message || String(error)));
  });

  els.modeExplain.addEventListener('click', () => {
    toggleComposerMode('explain').catch((error) => setError(error.message || String(error)));
  });

  els.modeTranslate.addEventListener('click', () => {
    toggleComposerMode('translate').catch((error) => setError(error.message || String(error)));
  });

  els.modelSelect.addEventListener('change', async () => {
    await selectModel(els.modelSelect.value);
  });

  if (els.topModels) {
    els.topModels.addEventListener('click', async (event) => {
      const button = event.target.closest('.top-model-button');
      if (!button || !button.dataset.model) return;
      await selectModel(button.dataset.model);
    });
  }

  els.modelBrowserTrigger.addEventListener('click', () => {
    setModelBrowserOpen(els.modelBrowser.hidden);
  });

  els.modelBrowser.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  els.modelBrowserTrigger.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  els.modelSearch.addEventListener('input', () => {
    activeModelCategory = els.modelSearch.value.trim() ? 'all' : activeModelCategory;
    renderModelCategories();
    renderModelResults();
  });

  els.modelSearch.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const selected = els.modelResults.querySelector('.model-result-button.active') || els.modelResults.querySelector('.model-result-button');
      if (selected && selected.dataset.model) {
        selectModel(selected.dataset.model).catch((error) => setError(error.message || String(error)));
      }
    }
  });

  els.modelCategories.addEventListener('click', (event) => {
    const button = event.target.closest('.model-category-button');
    if (!button || !button.dataset.category) return;
    activeModelCategory = button.dataset.category;
    renderModelCategories();
    renderModelResults();
  });

  els.modelResults.addEventListener('click', (event) => {
    const button = event.target.closest('.model-result-button');
    if (!button || !button.dataset.model) return;
    selectModel(button.dataset.model).catch((error) => setError(error.message || String(error)));
  });

  document.addEventListener('click', (event) => {
    if (els.modelBrowser.hidden) return;
    if (event.target.closest('.model-picker')) return;
    setModelBrowserOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!els.reportModal.hidden) {
      event.preventDefault();
      setReportModalOpen(false).catch(() => undefined);
      return;
    }
    if (!els.modelBrowser.hidden) {
      setModelBrowserOpen(false);
      return;
    }
    if (hasActivePageTool()) {
      event.preventDefault();
      cancelActivePageTool();
    }
  });

  els.onlineToggle.addEventListener('change', async () => {
    state.online = els.onlineToggle.checked;
    await persist();
  });

  els.floatingIconToggle.addEventListener('change', async () => {
    await storageSet({ floatingIconEnabled: els.floatingIconToggle.checked });
  });

  els.openShortcuts.addEventListener('click', () => {
    openShortcutSettings();
  });

  els.reportIssue.addEventListener('click', () => {
    setReportModalOpen(true).catch((error) => setError(error.message || String(error)));
  });

  els.reportCancel.addEventListener('click', () => {
    setReportModalOpen(false).catch(() => undefined);
  });

  els.reportIncludeDiagnostics.addEventListener('change', () => {
    refreshReportDiagnosticsPreview().catch((error) => setError(error.message || String(error)));
  });

  els.reportForm.addEventListener('submit', (event) => {
    event.preventDefault();
    submitIssueReport().catch((error) => setError(error.message || String(error)));
  });

  els.saveKey.addEventListener('click', async () => {
    if (els.apiKey.dataset.masked === 'true') {
      els.status.textContent = 'API key unchanged';
      setTimeout(setStatus, 1400);
      return;
    }

    const value = els.apiKey.value.trim();
    if (!value) {
      setError('Enter a NanoGPT API key before saving.');
      return;
    }

    await saveApiKey(value);
  });

  els.ssoLogin.addEventListener('click', () => {
    signInWithNanoGPT().catch((error) => setError(error.message || String(error)));
  });

  els.toggleKey.addEventListener('click', async () => {
    if (els.apiKey.dataset.masked === 'true') {
      const result = await storageGet('nanogpt_api_key');
      els.apiKey.value = result.nanogpt_api_key || '';
      els.apiKey.dataset.masked = '';
      els.apiKey.type = 'text';
      els.toggleKey.textContent = 'Hide';
    } else {
      els.apiKey.type = 'password';
      els.apiKey.value = els.apiKey.value ? '••••••••••••••' : '';
      els.apiKey.dataset.masked = 'true';
      els.toggleKey.textContent = 'Show';
    }
  });

  els.prompt.addEventListener('input', autosizePrompt);
  els.prompt.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      els.form.requestSubmit();
    }
  });

  els.form.addEventListener('submit', (event) => {
    event.preventDefault();
    sendPrompt(els.prompt.value).catch((error) => setError(error.message || String(error)));
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  bindEvents();
  await loadSettings();
  await populateModels();
  await consumePendingPrompt();
  extensionApi.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[PENDING_PROMPT_KEY] && changes[PENDING_PROMPT_KEY].newValue) {
      consumePendingPrompt().catch((error) => setError(error.message || String(error)));
    }
  });
  extensionApi.runtime.onMessage.addListener((message) => {
    if (!message || message.action !== 'nanogpt_page_action_state') return undefined;
    if (message.mode === 'selection') setActiveQuickAction(els.askSelection, message.active === true);
    if (message.mode === 'image') setActiveQuickAction(els.askImage, message.active === true);
    if (message.mode === 'circle') setActiveQuickAction(els.circleSearch, message.active === true);
    return undefined;
  });
  autosizePrompt();
  els.prompt.focus();
});
