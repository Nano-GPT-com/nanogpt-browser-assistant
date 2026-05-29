const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

test('packaged shared files match canonical shared source', () => {
  const files = fs.readdirSync(path.join(root, 'shared'));
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, 'shared', file), 'utf8');
    for (const extensionDir of ['Chrome extension', 'Firefox extension']) {
      const packaged = fs.readFileSync(path.join(root, extensionDir, 'shared', file), 'utf8');
      assert.equal(packaged, source, `${extensionDir}/shared/${file} is out of sync`);
    }
  }
});
