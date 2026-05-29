# Browser Extension Release

Release packages are built from the browser-specific folders:

- Chrome: `Chrome extension/versions/version-<manifest version>.zip`
- Firefox: `Firefox extension/versions/version-<manifest version>.zip`

## Manual Store Uploads

- Chrome Web Store Developer Dashboard: https://chrome.google.com/webstore/devconsole
- Firefox Add-ons Developer Hub: https://addons.mozilla.org/en-US/developers/

## GitHub Actions Release

Run the `Release browser extensions` workflow manually from GitHub Actions.

Inputs:

- `target`: `chrome`, `firefox`, or `both`.
- `chrome_action`: `upload` uploads a package for review; `publish` calls the publish endpoint after upload.
- `firefox_channel`: `listed` for the public AMO listing; `unlisted` for signed self-distribution.
- `dry_run`: keep this enabled to build and verify without submitting to the stores.

Required repository secrets for Chrome:

- `CHROME_EXTENSION_ID`
- `CHROME_PUBLISHER_ID`
- `CHROME_SERVICE_ACCOUNT_JSON`

Required repository secrets for Firefox:

- `AMO_JWT_ISSUER`
- `AMO_JWT_SECRET`

Chrome uses the Chrome Web Store API v2 with a Google Cloud service account. Firefox uses Mozilla's `web-ext sign` command against the Add-ons API.

## Local Verification

```sh
npm ci
npm run build:all
npm test
```

To test the release wrappers without submitting:

```sh
DRY_RUN=true npm run release:chrome
DRY_RUN=true npm run release:firefox
```
