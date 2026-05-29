# Security

## Reporting vulnerabilities

Please report security issues privately to:

security@nano-gpt.com

Include:

- A clear description of the issue.
- Steps to reproduce.
- Browser and extension version.
- Any relevant screenshots or logs.

Please do not open public issues for vulnerabilities until we have had a chance to investigate.

## Secret handling

This repository does not require secrets to build or test locally.

Release automation uses GitHub Actions secrets for store submission credentials. Do not commit service account JSON, API keys, AMO secrets, Chrome Web Store credentials, or NanoGPT API keys.
