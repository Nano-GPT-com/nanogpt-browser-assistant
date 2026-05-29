(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NanoGPTDiagnosticsUtils = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const DEFAULT_ERROR_LIMIT = 50;
  const STRING_LIMIT = 500;

  function cleanString(value, maxLength = STRING_LIMIT) {
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') return '';
    return String(value)
      .replace(/https?:\/\/[^\s"'<>]+/gi, '[url]')
      .replace(/data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+/gi, '[image-data]')
      .replace(/sk-[a-z0-9_-]{12,}/gi, '[api-key]')
      .trim()
      .slice(0, maxLength);
  }

  function sanitizeErrorEntry(entry) {
    const timestamp = Number.isFinite(entry?.timestamp) ? entry.timestamp : Date.now();
    const requestId = cleanString(entry?.requestId || '', 256);
    return {
      timestamp,
      component: cleanString(entry?.component || 'sidepanel', 64),
      action: cleanString(entry?.action || 'unknown', 96),
      message: cleanString(entry?.message || entry?.error || 'Unknown error', 1000),
      ...(requestId ? { requestId } : {}),
      ...(Number.isFinite(entry?.status) ? { status: entry.status } : {}),
    };
  }

  function appendDiagnosticError(existing, entry, limit = DEFAULT_ERROR_LIMIT) {
    const list = Array.isArray(existing) ? existing : [];
    return [...list, sanitizeErrorEntry(entry)].slice(-Math.max(1, limit));
  }

  function sanitizeSettings(settings) {
    const source = settings && typeof settings === 'object' ? settings : {};
    const floatingIconCorner = cleanString(source.floatingIconCorner || '', 32);
    return {
      onlineSearchEnabled: source.onlineSearchEnabled !== false,
      floatingIconEnabled: source.floatingIconEnabled !== false,
      ...(floatingIconCorner ? { floatingIconCorner } : {}),
      hasApiKey: Boolean(source.hasApiKey),
    };
  }

  function buildDiagnosticsPayload(input) {
    const source = input && typeof input === 'object' ? input : {};
    const manifest = source.manifest && typeof source.manifest === 'object' ? source.manifest : {};
    const state = source.state && typeof source.state === 'object' ? source.state : {};
    const errors = Array.isArray(source.errors) ? source.errors.map(sanitizeErrorEntry).slice(-DEFAULT_ERROR_LIMIT) : [];

    return {
      generatedAt: new Date().toISOString(),
      extension: {
        name: cleanString(manifest.name || 'NanoGPT Browser Assistant', 128),
        version: cleanString(manifest.version || '', 32),
        browser: cleanString(source.browser || '', 256),
        platform: cleanString(source.platform || '', 128),
      },
      settings: sanitizeSettings(source.settings),
      conversation: {
        localMessageCount: Number.isFinite(state.localMessageCount) ? state.localMessageCount : 0,
        model: cleanString(state.model || '', 256),
        online: state.online === true,
        composerMode: cleanString(state.composerMode || '', 64) || null,
        draftImageCount: Number.isFinite(state.draftImageCount) ? state.draftImageCount : 0,
        draftTextCount: Number.isFinite(state.draftTextCount) ? state.draftTextCount : 0,
      },
      recentErrors: errors,
    };
  }

  function formatDiagnosticsForReport(payload) {
    return JSON.stringify(buildDiagnosticsPayload(payload), null, 2);
  }

  return {
    appendDiagnosticError,
    buildDiagnosticsPayload,
    cleanString,
    formatDiagnosticsForReport,
    sanitizeErrorEntry,
    sanitizeSettings,
  };
});
