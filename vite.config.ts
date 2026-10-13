import { configDefaults, defineConfig } from 'vitest/config';

/** The speed tests: each one compares the time of a work with a reference work (design 9.3). */
const SPEED_TESTS = '**/*-speed.test.ts';

/**
 * The base path of the site. The Pages workflow sets `ZOOPHONY_BASE=/zoophony/`, the name of the
 * repository (design 9.2), for the build and for `vite preview`. Without it, the site is at `/`.
 */
const BASE = process.env['ZOOPHONY_BASE'] ?? '/';

export default defineConfig({
  base: BASE,
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
    // The probe scripts of an agent in scratch/ are no tests.
    exclude: [...configDefaults.exclude, '.claude/**', 'scratch/**'],
    // The slowest tests take 0.5 to 3.5 s with a low load, and 5 to 13 s at a load average of
    // 300. The default limit of 5 s failed a test under load. A test that does not end fails
    // after 60 s.
    testTimeout: 60_000,
    projects: [
      {
        extends: true,
        test: { name: 'unit', exclude: [SPEED_TESTS] },
      },
      {
        // The speed tests compare times, so load on the machine can make them fail. They run
        // one file at a time with `pnpm test:perf`, and `pnpm test` skips them (design 9.3).
        extends: true,
        test: { name: 'perf', include: [SPEED_TESTS], fileParallelism: false },
      },
    ],
  },
  worker: {
    // The decode Worker is a module Worker, and the worklet processor is a module script.
    format: 'es',
  },
});
