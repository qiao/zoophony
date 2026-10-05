import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // tools/size.ts reads the manifest to find the static imports of the entry chunk.
    manifest: true,
    rolldownOptions: {
      // The spike page is a separate entry, so it does not add to the first download (7.2).
      input: { index: 'index.html', spike: 'spike.html' },
    },
  },
  worker: {
    // The decode Worker is a module Worker, and the worklet processor is a module script.
    format: 'es',
  },
});
