#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const extensionDir = path.join(root, 'Firefox extension');
const artifactsDir = path.join(extensionDir, 'versions', 'signed');

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

function main() {
  const manifest = readJson(path.join(extensionDir, 'manifest.json'));
  const channel = getArg('channel', process.env.FIREFOX_RELEASE_CHANNEL || 'listed');

  if (!['listed', 'unlisted'].includes(channel)) {
    throw new Error(`Unsupported Firefox release channel: ${channel}`);
  }

  console.log(`Firefox ${channel} submission target: ${manifest.name} ${manifest.version}`);
  console.log(`Source: ${extensionDir}`);
  console.log(`Artifacts: ${artifactsDir}`);

  if (isDryRun()) {
    console.log('DRY_RUN is enabled; skipping Mozilla Add-ons submission.');
    return;
  }

  fs.mkdirSync(artifactsDir, { recursive: true });

  const args = [
    'web-ext',
    'sign',
    '--source-dir',
    extensionDir,
    '--artifacts-dir',
    artifactsDir,
    '--api-key',
    getRequiredEnv('AMO_JWT_ISSUER'),
    '--api-secret',
    getRequiredEnv('AMO_JWT_SECRET'),
    '--channel',
    channel,
    '--approval-timeout',
    '0',
    '--no-input',
    '--ignore-files',
    'versions',
    'versions/**',
    'build.sh',
    '.DS_Store',
  ];

  const result = spawnSync('npx', args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`web-ext sign failed with exit code ${result.status}`);
  }
}

try {
  main();
} catch (error) {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
}
