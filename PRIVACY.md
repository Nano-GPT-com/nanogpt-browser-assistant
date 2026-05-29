# Privacy

NanoGPT Browser Assistant is designed to keep browser data local unless you explicitly use the assistant.

## What stays local

- Extension settings.
- Local assistant conversation history.
- Floating button preferences.
- Optional NanoGPT API key, if you choose to save one in the extension.

These values are stored in browser extension storage.

## What is sent to NanoGPT

The extension sends content to NanoGPT only when you submit a prompt or explicitly attach page context. Depending on the action you choose, that context can include:

- The readable text of the current page.
- Text from a selected page element.
- A selected image URL or image data needed for the request.
- A screenshot crop of a marked page area.
- Your prompt and selected model.

## Diagnostics and issue reports

If you submit an issue report from the extension, you can choose whether to include diagnostics. Diagnostics are intended to help debug extension behavior and include safe state such as browser/version information, settings flags, local message count, selected model, and recent sanitized error messages.

Diagnostics do not include your full local conversation history or full page content.

## Conversation storage

NanoGPT does not store your conversations. The extension stores local assistant messages in your browser so your side panel state can persist locally.

## Source code

The browser assistant source code is public at https://github.com/Nano-GPT-com/nanogpt-browser-assistant.

## Web search

When web search is enabled for a prompt, NanoGPT may use web search providers to answer that request. The toggle is shown beside the prompt modes.
