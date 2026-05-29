#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const extensionDir = path.join(root, 'Chrome extension');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function getArg(name, fallback) {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function isDryRun() {
  return ['1', 'true', 'yes'].includes(String(process.env.DRY_RUN || '').toLowerCase());
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!response.ok) {
    const detail = typeof body === 'string' ? body : JSON.stringify(body);
    throw new Error(`Chrome Web Store request failed (${response.status}): ${detail}`);
  }
  return body;
}

async function getAccessToken() {
  const serviceAccount = JSON.parse(getRequiredEnv('CHROME_SERVICE_ACCOUNT_JSON'));
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = serviceAccount.token_uri || 'https://oauth2.googleapis.com/token';
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/chromewebstore',
    aud: tokenUri,
    exp: now + 3600,
    iat: now,
  };
  const unsigned = `${base64UrlJson(header)}.${base64UrlJson(claim)}`;
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(unsigned)
    .sign(serviceAccount.private_key, 'base64url');
  const assertion = `${unsigned}.${signature}`;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const response = await requestJson(tokenUri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response || !response.access_token) {
    throw new Error('Chrome OAuth response did not include an access token.');
  }
  return response.access_token;
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

async function main() {
  const manifest = readJson(path.join(extensionDir, 'manifest.json'));
  const zipPath = path.resolve(
    root,
    getArg('zip', path.join('Chrome extension', 'versions', `version-${manifest.version}.zip`)),
  );
  const action = getArg('action', process.env.CHROME_RELEASE_ACTION || 'upload');

  if (!['upload', 'publish'].includes(action)) {
    throw new Error(`Unsupported Chrome release action: ${action}`);
  }
  if (!fs.existsSync(zipPath)) {
    throw new Error(`Chrome release archive does not exist: ${zipPath}`);
  }

  console.log(`Chrome ${action} target: ${manifest.name} ${manifest.version}`);
  console.log(`Archive: ${zipPath}`);

  if (isDryRun()) {
    console.log('DRY_RUN is enabled; skipping Chrome Web Store API calls.');
    return;
  }

  const publisherId = getRequiredEnv('CHROME_PUBLISHER_ID');
  const extensionId = getRequiredEnv('CHROME_EXTENSION_ID');
  const uploadUrl = `https://chromewebstore.googleapis.com/upload/v2/publishers/${publisherId}/items/${extensionId}:upload`;
  const publishUrl = `https://chromewebstore.googleapis.com/v2/publishers/${publisherId}/items/${extensionId}:publish`;

  const token = await getAccessToken();
  const uploadResponse = await requestJson(uploadUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/zip',
    },
    body: fs.readFileSync(zipPath),
  });

  const responsePath = path.join(extensionDir, 'versions', `upload-response-${manifest.version}.json`);
  fs.writeFileSync(responsePath, `${JSON.stringify(uploadResponse, null, 2)}\n`);
  console.log(`Chrome upload response written to ${responsePath}`);

  if (action === 'publish') {
    const publishResponse = await requestJson(publishUrl, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    });
    console.log(JSON.stringify(publishResponse, null, 2));
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
