import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    // tools/size.ts reads the manifest to find the static imports of the entry chunk.
    manifest: true,
    // The largest chunk holds three.js and the scene code: 615 kB, or 159 kB after gzip, on
    // 2026-10-05. Nearly all of it is three.js. The warning of Vite starts at 500 kB, before gzip.
    // The size check of design 7.2 (`pnpm size`, 1 MB after gzip) is the real limit.
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      // The spike page, the gallery, and the animal views are separate entries, so they do not
      // add to the first download (7.1, 7.2).
      input: {
        index: 'index.html',
        spike: 'spike.html',
        gallery: 'gallery.html',
        views: 'views.html',
      },
    },
  },
  test: {
    // Agent worktrees under .claude/ hold copies of the tests. Run only the tests of this checkout.
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
  worker: {
    // The decode Worker is a module Worker, and the worklet processor is a module script.
    format: 'es',
  },
});
