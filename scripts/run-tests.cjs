const { readdirSync } = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
function findTests(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) return findTests(filename);
    return entry.name.endsWith('.test.cjs') ? [filename] : [];
  });
}
const files = ['src', 'scripts'].flatMap(dir => findTests(path.join(root, dir))).sort();
if (!files.length) throw new Error('No tests found');
console.log(`Running ${files.length} test files`);
const result = spawnSync(process.execPath, ['--test', ...files], {
  cwd: root,
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
