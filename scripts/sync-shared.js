const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sharedDir = path.join(root, 'shared');
const targets = [
  path.join(root, 'Chrome extension', 'shared'),
  path.join(root, 'Firefox extension', 'shared'),
];

for (const target of targets) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(sharedDir)) {
    fs.copyFileSync(path.join(sharedDir, entry), path.join(target, entry));
  }
}
