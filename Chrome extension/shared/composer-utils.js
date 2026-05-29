(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.NanoGPTComposerUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function toApiMessages(messages) {
    return (messages || [])
      .filter((message) => message.role === 'user' || message.role === 'assistant' || message.role === 'system')
      .map((message) => ({ role: message.role, content: message.content }));
  }

  function contentText(content) {
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && part.type === 'text') return part.text || '';
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  function contentImages(content) {
    if (!Array.isArray(content)) return [];
    return content
      .map((part) => part && part.type === 'image_url' && part.image_url ? part.image_url.url : '')
      .filter(Boolean);
  }

  function applyComposerMode(text, hasImages, mode, promptModes) {
    const instruction = promptModes && promptModes[mode];
    if (!instruction) return text;
    if (text) return `${instruction}\n\n${text}`;
    return hasImages ? instruction : text;
  }

  function buildPromptPayload({ content, draftImages = [], draftTexts = [], composerMode, promptModes }) {
    const rawPromptText = typeof content === 'string' ? content.trim() : contentText(content).trim();
    const draftTextContent = draftTexts.map((attachment) => `${attachment.label}:\n${attachment.text}`).join('\n\n');
    const combinedPromptText = [rawPromptText, draftTextContent].filter(Boolean).join('\n\n');
    const promptText = applyComposerMode(combinedPromptText, draftImages.length > 0, composerMode, promptModes);
    const prompt = draftImages.length
      ? [
        ...(promptText ? [{ type: 'text', text: promptText }] : []),
        ...draftImages.map((attachment) => ({
          type: 'image_url',
          image_url: { url: attachment.url },
        })),
      ]
      : (typeof content === 'string' ? promptText : content);

    return {
      displayText: contentText(prompt).trim(),
      imageUrls: contentImages(prompt),
      prompt,
    };
  }

  return {
    applyComposerMode,
    buildPromptPayload,
    contentImages,
    contentText,
    toApiMessages,
  };
});
