# NanoGPT Browser Assistant

Browser extensions for using NanoGPT on webpages.

The assistant opens a browser side panel/sidebar where users can:

- Attach an entire page, selected element, image, or marked area.
- Summarize, explain, translate, or ask follow-up questions with page context.
- Toggle web search when page context is not enough.
- Choose NanoGPT models directly from the assistant.
- Sign in or store a NanoGPT API key locally in the extension.

## Browser Packages

- `Chrome extension/` contains the Manifest V3 Chrome package.
- `Firefox extension/` contains the Firefox add-on package.

## Shortcuts

- Chrome: `Alt+S` by default.
- Firefox: `Alt+S` on macOS/Linux and `Ctrl+Alt+S` on Windows by default.

The shortcut toggles the assistant open and closed where browser APIs support it.

## Build

Each browser folder includes a `build.sh` script for producing a zip package from that folder.

Release automation and store upload notes are documented in `docs/release.md`.

## Privacy and Security

See `PRIVACY.md` for how browser data, page context, diagnostics, and local storage are handled.

See `SECURITY.md` for responsible disclosure and secret-handling guidance.
