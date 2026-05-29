const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');

const bundles = [
  {
    dir: 'Chrome extension',
    manifest: 'manifest.json',
    files: [
      'manifest.json',
      'background.js',
      'sidepanel.html',
      'sidepanel.css',
      'sidepanel.js',
      'popup.js',
      'popup.html',
      'content.js',
      'overlay.css',
      'shared/background-utils.js',
      'shared/composer-utils.js',
      'shared/content-utils.js',
    ],
  },
  {
    dir: 'Firefox extension',
    manifest: 'manifest.json',
    files: [
      'manifest.json',
      'background.js',
      'sidebar.html',
      'sidebar.css',
      'sidebar.js',
      'content.js',
      'popup.js',
      'popup.html',
      'overlay.css',
      'browser-polyfill.min.js',
      'shared/background-utils.js',
      'shared/composer-utils.js',
      'shared/content-utils.js',
    ],
  },
];

function archivePath(bundle) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, bundle.dir, bundle.manifest), 'utf8'));
  return path.join(root, bundle.dir, 'versions', `version-${manifest.version}.zip`);
}

test('release bundles exist for current manifest versions and include fresh source files', () => {
  for (const bundle of bundles) {
    const zipPath = archivePath(bundle);
    assert.equal(fs.existsSync(zipPath), true, `${zipPath} does not exist`);

    for (const file of bundle.files) {
      const sourcePath = path.join(root, bundle.dir, file);
      const source = fs.readFileSync(sourcePath);
      const archived = execFileSync('unzip', ['-p', zipPath, file]);
      assert.deepEqual(archived, source, `${bundle.dir}/${file} is stale in ${path.basename(zipPath)}`);
    }
  }
});
