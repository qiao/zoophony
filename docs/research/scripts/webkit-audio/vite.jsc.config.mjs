// Bundles jsc-main.ts into out/jsc-bench.js, one classic script for the jsc shell.
// Usage (from the repository root):
//   pnpm exec vite build -c docs/research/scripts/webkit-audio/vite.jsc.config.mjs
import { defineConfig } from 'vite';

const here = import.meta.dirname;

export default defineConfig({
  root: here,
  logLevel: 'warn',
  build: {
    outDir: `${here}/out`,
    emptyOutDir: false,
    minify: false,
    lib: { entry: `${here}/jsc-main.ts`, formats: ['iife'], name: 'bench', fileName: () => 'jsc-bench.js' },
  },
});
