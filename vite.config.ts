import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    // tools/size.ts reads the manifest to find the static imports of the entry chunk.
    manifest: true,
    rolldownOptions: {
      // The spike page and the gallery are separate entries, so they do not add to the first
      // download (7.1, 7.2).
      input: { index: 'index.html', spike: 'spike.html', gallery: 'gallery.html' },
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
