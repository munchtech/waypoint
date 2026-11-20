import { build } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { builtinModules } from 'node:module';
const root = process.cwd(),
  out = path.join(root, 'desktop/build');
// The app version lives in package.json only; the packaged app reads it from the manifest written below.
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
fs.mkdirSync(out, { recursive: true });
// The main process runs in Node, so packages must resolve to their Node entry points: without this, a package's `browser` field
// swaps in browser stubs. It must also be one file, because the packaged app ships main.cjs and nothing beside it.
const nodeResolve = {
  mainFields: ['module', 'main'],
  conditions: ['node', 'import', 'module', 'default'],
};
await build({
  configFile: false,
  root,
  publicDir: false,
  resolve: nodeResolve,
  build: {
    outDir: out,
    emptyOutDir: true,
    lib: {
      entry: path.join(root, 'desktop/main.ts'),
      formats: ['cjs'],
      fileName: () => 'main.cjs',
    },
    rolldownOptions: {
      external: ['electron', ...builtinModules, ...builtinModules.map((m) => 'node:' + m)],
      output: { codeSplitting: false },
    },
    target: 'node22',
    minify: false,
  },
});
const stray = fs.readdirSync(out).filter((file) => file !== 'main.cjs');
if (stray.length)
  throw new Error(
    'The main process must build to main.cjs alone, but the build also wrote: ' + stray.join(', '),
  );
fs.copyFileSync('desktop/speech-worker.py', path.join(out, 'speech-worker.py'));
fs.copyFileSync('desktop/preload.cjs', path.join(out, 'preload.cjs'));
fs.cpSync('desktop/data', path.join(out, 'data'), { recursive: true });
await build({
  configFile: false,
  root: path.join(root, 'desktop/renderer'),
  base: './',
  publicDir: path.join(root, 'public'),
  plugins: [react()],
  build: { outDir: path.join(out, 'renderer'), emptyOutDir: true, target: 'chrome130' },
});
fs.writeFileSync(
  path.join(out, 'package.json'),
  JSON.stringify(
    {
      name: 'waypoint',
      productName: 'Waypoint',
      version,
      description: 'A local companion for your D&D campaign',
      author: 'Waypoint',
      license: 'UNLICENSED',
      main: 'main.cjs',
    },
    null,
    2,
  ),
);
await build({
  configFile: false,
  root,
  publicDir: false,
  resolve: nodeResolve,
  build: {
    outDir: path.join(root, '.sites-runtime/desktop-tests'),
    emptyOutDir: true,
    lib: {
      entry: path.join(root, 'desktop/cloud-engine.ts'),
      formats: ['es'],
      fileName: () => 'cloud-engine.mjs',
    },
    rolldownOptions: {
      external: [...builtinModules, ...builtinModules.map((m) => 'node:' + m)],
      output: { codeSplitting: false },
    },
    target: 'node22',
    minify: false,
  },
});
console.log('Desktop app and isolated test module built.');

await build({
  configFile: false,
  root,
  publicDir: false,
  build: {
    outDir: path.join(root, '.sites-runtime/memory-tests'),
    emptyOutDir: true,
    lib: {
      entry: path.join(root, 'scripts/test-memory.ts'),
      formats: ['es'],
      fileName: () => 'test-memory.mjs',
    },
    rolldownOptions: { external: [...builtinModules, ...builtinModules.map((m) => 'node:' + m)] },
    target: 'node22',
    minify: false,
  },
});

await build({
  configFile: false,
  root,
  publicDir: false,
  build: {
    outDir: path.join(root, '.sites-runtime/playbook-tests'),
    emptyOutDir: true,
    lib: {
      entry: path.join(root, 'scripts/test-playbook.ts'),
      formats: ['es'],
      fileName: () => 'test-playbook.mjs',
    },
    rolldownOptions: { external: [...builtinModules, ...builtinModules.map((m) => 'node:' + m)] },
    target: 'node22',
    minify: false,
  },
});

await build({
  configFile: false,
  root,
  publicDir: false,
  build: {
    outDir: path.join(root, '.sites-runtime/campaign-tests'),
    emptyOutDir: true,
    lib: {
      entry: path.join(root, 'lib/campaign.ts'),
      formats: ['es'],
      fileName: () => 'campaign.mjs',
    },
    target: 'node22',
    minify: false,
  },
});

await build({
  configFile: false,
  root,
  publicDir: false,
  build: {
    outDir: path.join(root, '.sites-runtime/rules-tests'),
    emptyOutDir: true,
    lib: {
      entry: path.join(root, 'scripts/test-rules.ts'),
      formats: ['es'],
      fileName: () => 'test-rules.mjs',
    },
    rolldownOptions: { external: [...builtinModules, ...builtinModules.map((m) => 'node:' + m)] },
    target: 'node22',
    minify: false,
  },
});

await build({
  configFile: false,
  root,
  publicDir: false,
  build: {
    outDir: path.join(root, '.sites-runtime/ui-harness'),
    emptyOutDir: true,
    lib: {
      entry: path.join(root, 'desktop/rules-store.ts'),
      formats: ['es'],
      fileName: () => 'rules-store.mjs',
    },
    rolldownOptions: { external: [...builtinModules, ...builtinModules.map((m) => 'node:' + m)] },
    target: 'node22',
    minify: false,
  },
});

await build({
  configFile: false,
  root,
  publicDir: false,
  build: {
    outDir: path.join(root, '.sites-runtime/ui-harness'),
    emptyOutDir: false,
    lib: {
      entry: path.join(root, 'lib/player-display.ts'),
      formats: ['es'],
      fileName: () => 'player-display.mjs',
    },
    rolldownOptions: { external: [...builtinModules, ...builtinModules.map((m) => 'node:' + m)] },
    target: 'node22',
    minify: false,
  },
});

// The campaign store, so the UI harness answers campaign search from the real full-text index.
await build({
  configFile: false,
  root,
  publicDir: false,
  build: {
    outDir: path.join(root, '.sites-runtime/ui-harness'),
    emptyOutDir: false,
    lib: {
      entry: {
        'campaign-store': path.join(root, 'desktop/campaign-store.ts'),
        packs: path.join(root, 'desktop/packs.ts'),
      },
      formats: ['es'],
      fileName: (_format, name) => name + '.mjs',
    },
    rolldownOptions: { external: [...builtinModules, ...builtinModules.map((m) => 'node:' + m)] },
    target: 'node22',
    minify: false,
  },
});

await build({
  configFile: false,
  root,
  publicDir: false,
  build: {
    outDir: path.join(root, '.sites-runtime/pdf-tests'),
    emptyOutDir: true,
    lib: {
      entry: path.join(root, 'scripts/test-pdf.ts'),
      formats: ['es'],
      fileName: () => 'test-pdf.mjs',
    },
    rolldownOptions: { external: [...builtinModules, ...builtinModules.map((m) => 'node:' + m)] },
    target: 'node22',
    minify: false,
  },
});

await build({
  configFile: false,
  root,
  publicDir: false,
  build: {
    outDir: path.join(root, '.sites-runtime/book-tests'),
    emptyOutDir: true,
    lib: {
      entry: path.join(root, 'scripts/test-book-text.tsx'),
      formats: ['es'],
      fileName: () => 'test-book-text.mjs',
    },
    rolldownOptions: {
      external: [
        'react',
        'react/jsx-runtime',
        'react-dom/server',
        ...builtinModules,
        ...builtinModules.map((m) => 'node:' + m),
      ],
    },
    target: 'node22',
    minify: false,
  },
  esbuild: { jsx: 'automatic' },
});
