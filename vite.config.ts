import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { LICENSES_FILE } from './src/app/credits.ts';
import { DEFAULT_DEMO, demoUrl } from './src/app/demos.ts';
import { gzipSiteAudio } from './tools/gzip-site.ts';
import { licenseDocument, licenseEntries } from './tools/licenses.ts';
import { configDefaults, defineConfig } from 'vitest/config';

/** The speed tests: each one compares the time of a work with a reference work (design 9.3). */
const SPEED_TESTS = '**/*-speed.test.ts';

/**
 * The paused test files (design 9.3, decision `2026-10-14-test-pause.md`). Each model round
 * changes the look of the animals, and these tests check the look, the fit, or the clearance of
 * the bodies. `pnpm test` skips them, and `pnpm test:paused` runs them for information. The
 * typecheck and the lint still read them. Remove a file from the list to bring it back.
 */
const PAUSED_TESTS = [
  // The clearance of the bodies: the sweeps of the roles and the other clearance tests.
  'src/pose/*-clearance-*.test.ts',
  'src/pose/violinist-standing-clearance.test.ts',
  'src/pose/rest-clearance.test.ts',
  // The fit of a pose to a body: the bow on the strings, the reach, the holds, the paws on the
  // keys, the feet on the floor, and the poses of the sheet pages and of the gallery.
  'src/pose/bowed.test.ts',
  'src/pose/bow-hold.test.ts',
  'src/pose/hands.test.ts',
  'src/pose/winds.test.ts',
  'src/pose/percussion.test.ts',
  'src/pose/choir.test.ts',
  'src/pose/seated-feet.test.ts',
  'src/models/player.test.ts',
  'src/gallery/sheet-poses.test.ts',
  'src/gallery/view-poses.test.ts',
  // The look and the geometry of a body and of its seat: the forms, the sizes, the colors, the
  // faces, the eyes, and the triangle budgets.
  'src/models/species.test.ts',
  'src/models/budget.test.ts',
  'src/models/proportions.test.ts',
  'src/models/legs.test.ts',
  'src/models/props.test.ts',
  // The layout from the footprints of the bodies: the growth of the stages, the gaps between
  // the players, the heads that hide behind larger animals, and a shot plan that the layout of
  // one demo decides.
  'src/models/layout-scene.test.ts',
  'src/scene/hidden-heads.test.ts',
  'src/shots/choir-theme.test.ts',
  'src/shots/plan-counts.test.ts',
  'src/shots/opening-drawer.test.ts',
];

/**
 * The switch of the pause of all tests (design 9.3, decision `2026-10-16-all-tests-pause.md`).
 * While it is true, each unit test file is a paused test: `pnpm test` runs no test and passes,
 * and `pnpm test:paused` runs each unit test for information. Set it to false to end the pause.
 * Then `PAUSED_TESTS` gives the paused files again.
 */
const ALL_TESTS_PAUSED: boolean = true;

/** The test files of the project `paused`: each unit test file, or the files of `PAUSED_TESTS`. */
const PAUSED_FILES = ALL_TESTS_PAUSED ? ['**/*.test.ts'] : PAUSED_TESTS;

/**
 * The base path of the site. The Pages workflow sets `ZOOPHONY_BASE=/zoophony/`, the name of the
 * repository (design 9.2), for the build and for `vite preview`. Without it, the site is at `/`.
 */
const BASE = process.env['ZOOPHONY_BASE'] ?? '/';

/**
 * The plugin that gives the production build an empty module in place of the look override of
 * the dev server (`src/app/look-override.ts`, design 9.3). The override is the first import of
 * `src/main.ts`, so that it acts before the other modules load. Its code is dead in the build, but
 * its imports moved the modules of the look to the front of the chunk, and the new order grew
 * the first download by about 400 B after gzip (design 7.2). The stub keeps the old order.
 */
const DEV_LOOK_OVERRIDE: Plugin = {
  name: 'zoophony:dev-look-override',
  apply: 'build',
  load(id) {
    return id.endsWith('/src/app/look-override.ts') ? 'export function soloFromQuery() {}' : null;
  },
};

/**
 * The plugin that writes the URL of the default demo into the preload script of `index.html`
 * (design 7.2), from `DEFAULT_DEMO` of `src/app/demos.ts`, so that the two cannot differ.
 */
const DEFAULT_DEMO_URL: Plugin = {
  name: 'zoophony:default-demo-url',
  transformIndexHtml(html) {
    return html.replace('%DEFAULT_DEMO_URL%', demoUrl(DEFAULT_DEMO, BASE));
  },
};

/**
 * The plugin that gzips the preset files and the demo files of the build in place, after Vite
 * writes `dist/` (design 6.2, 7.2, `tools/gzip-site.ts`). GitHub Pages sends these types with no
 * gzip. The dev server and the Node tools keep the plain files of `public/`.
 */
const GZIP_AUDIO: Plugin = {
  name: 'zoophony:gzip-audio',
  apply: 'build',
  async writeBundle() {
    const { root, build } = this.environment.config;
    const summary = await gzipSiteAudio(resolve(root, build.outDir));
    const bytes = (value: number): string => `${value.toLocaleString('en-US')} B`;
    this.environment.logger.info(
      `Gzipped ${summary.files} preset and demo files: ${bytes(summary.plainBytes)} to ${bytes(summary.gzipBytes)}.`,
    );
  },
};

/**
 * The plugin that serves the third-party license file in the dev server (design 7.3). The build
 * writes the file into `dist/` after Vite (`tools/licenses.ts`), so the dev server has no file at
 * its path, and its HTML fallback sent the app for the link "Third-party licenses" of the credits.
 * The plugin makes the same text for each request.
 */
const DEV_LICENSES: Plugin = {
  name: 'zoophony:dev-licenses',
  apply: 'serve',
  configureServer(server) {
    const path = `${server.config.base}${LICENSES_FILE}`;
    server.middlewares.use((request, response, next) => {
      if (request.url?.split('?')[0] !== path) {
        next();
        return;
      }
      licenseEntries(server.config.root).then((entries) => {
        response.setHeader('Content-Type', 'text/plain; charset=utf-8');
        response.end(licenseDocument(entries));
      }, next);
    });
  },
};

export default defineConfig({
  base: BASE,
  plugins: [DEV_LOOK_OVERRIDE, DEFAULT_DEMO_URL, GZIP_AUDIO, DEV_LICENSES],
  build: {
    // tools/size.ts reads the manifest to find the static imports of the entry chunk.
    manifest: true,
    // The largest chunk, `renderer`, holds three.js, the scene code, and the studio bodies: 1,923
    // kB, or 739 kB after gzip, on 2026-10-29. The base64 text of the studio bodies is about 500 kB
    // of it after gzip. The limit of the warning of Vite is in kB before gzip, a little above that
    // chunk. The size check of design 7.2 (`pnpm size`, 1 MB after gzip) is the real limit.
    chunkSizeWarningLimit: 2000,
    rolldownOptions: {
      // The gallery and the animal views are separate entries, so they do not add to the first
      // download (7.1, 7.2).
      input: {
        index: 'index.html',
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
    // While all tests are paused, the project `unit` has no file, and `pnpm test` passes.
    passWithNoTests: ALL_TESTS_PAUSED,
    projects: [
      {
        extends: true,
        test: { name: 'unit', exclude: [SPEED_TESTS, ...PAUSED_FILES] },
      },
      {
        // The speed tests compare times, so load on the machine can make them fail. They run
        // one file at a time with `pnpm test:perf`, and `pnpm test` skips them (design 9.3).
        extends: true,
        test: { name: 'perf', include: [SPEED_TESTS], fileParallelism: false },
      },
      {
        extends: true,
        test: { name: 'paused', include: PAUSED_FILES, exclude: [SPEED_TESTS] },
      },
    ],
  },
  worker: {
    // The decode Worker is a module Worker, and the worklet processor is a module script.
    format: 'es',
  },
});
