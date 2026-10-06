# Decisions of the step 7 tests and deploy

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-05, the agent of the tests and the deploy of step 7 decided the details below. The
user can reverse each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The Playwright test reads the song time from the attribute `data-song-time` of the stage canvas, which `App` writes in all builds. `pnpm smoke` keeps the dev hook for the bow arm and the camera checks | 9.3 |
| The page of the Playwright test is 960 × 600, and the increase of the song time starts at the first sample below 0 | 9.3 |
| The Playwright test counts a failed request as an error | 9.3 |
| The keyboard check does not run in CI, because its checks fail with the slow frames of SwiftShader | 9.2 |
| One matrix job `playwright` for the three browsers, which uploads `test-results/` after a failure | 9.2 |
| The environment variable `ZOOPHONY_BASE` sets the base path of Vite. Without it, the base path is `/` | 9.2 |
| The Pages workflow starts after a CI run of a push to `main` passes, and runs the Chromium smoke test under `/zoophony/` before the deploy | 9.2 |
