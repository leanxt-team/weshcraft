// Builds the OpenChamber frames: sandboxed iframes cannot load ES modules, so each page gets one
// classic IIFE script. The service is plain Node ESM and needs no build.
//   node openchamber/build.mjs
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const [entry, out] of [['src/panel.js', 'panel/main.js'], ['src/status.js', 'status/main.js']]) {
  await build({
    entryPoints: [path.join(here, entry)], outfile: path.join(here, out),
    bundle: true, format: 'iife', platform: 'browser', target: 'es2020', minify: true, legalComments: 'none',
    banner: { js: '/* WeshCraft for OpenChamber, built from openchamber/src by openchamber/build.mjs */' },
  });
  console.log(`built openchamber/${out}`);
}
