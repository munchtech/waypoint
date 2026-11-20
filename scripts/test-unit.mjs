// The unit suites: plain Node, no Electron window. Builds first, because the TypeScript suites run from the bundles
// that build-desktop.mjs writes to .sites-runtime/. verify.mjs runs the same list as separate steps.
//   node scripts/test-unit.mjs [--skip-build]
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const unitSuites = [
  ['memory tests', '.sites-runtime/memory-tests/test-memory.mjs'],
  ['rules tests', '.sites-runtime/rules-tests/test-rules.mjs'],
  ['claude engine tests', 'scripts/test-cloud-engine.mjs'],
  ['book text tests', '.sites-runtime/book-tests/test-book-text.mjs'],
  ['playbook tests', '.sites-runtime/playbook-tests/test-playbook.mjs'],
];

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const run = (file) =>
    spawnSync(process.execPath, [file], { cwd: root, stdio: 'inherit', windowsHide: true }).status;
  if (!process.argv.includes('--skip-build') && run('scripts/build-desktop.mjs') !== 0) {
    console.error('\nBuild failed, so the unit suites did not run.');
    process.exit(1);
  }
  const failed = [];
  for (const [name, file] of unitSuites) {
    console.log('\n── ' + name);
    if (run(file) !== 0) failed.push(name);
  }
  console.log(
    '\n' +
      (failed.length
        ? failed.length + ' of ' + unitSuites.length + ' unit suites failed: ' + failed.join(', ')
        : 'All ' + unitSuites.length + ' unit suites passed.'),
  );
  process.exitCode = failed.length ? 1 : 0;
}
