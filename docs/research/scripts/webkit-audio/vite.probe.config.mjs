// Bundles synth-probe.ts into page/synth-probe.js, a module for audioWorklet.addModule().
// Usage (from the repository root):
//   pnpm exec vite build -c docs/research/scripts/webkit-audio/vite.probe.config.mjs
import { defineConfig } from 'vite';

const here = import.meta.dirname;

export default defineConfig({
  root: here,
  logLevel: 'warn',
  build: {
    outDir: `${here}/page`,
    emptyOutDir: false,
    lib: { entry: `${here}/synth-probe.ts`, formats: ['es'], fileName: () => 'synth-probe.js' },
  },
});
