# Decisions of the pause of all tests

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-16, the user said: "pause / disable all tests as they're taking too long to run and
we're still iterating on the project". The manager of the session decided the other rows. The
pause of 2026-10-14 ([`2026-10-14-test-pause.md`](2026-10-14-test-pause.md)) paused only the
tests of the look, the fit, and the clearance of the bodies. This pause adds each other test. The
user can reverse each decision. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The user: pause all tests. The manager: pause, and delete no test. The switch `ALL_TESTS_PAUSED` of `vite.config.ts` makes each unit test file a paused test in the Vitest project `paused`. The project `unit` of `pnpm test` then has no file, and it passes (`passWithNoTests`). On 2026-10-16, a run of `pnpm test` took 1.4 s. `pnpm test:paused` runs all 245 unit test files for information. The typecheck and the lint still read each test file | 9.3 |
| `tools/check-commits.sh` and `tools/merge-branch.sh` still call `pnpm test`, so they run no unit test. Their code of the unit tests stays, and the end of the pause brings these checks back with no edit | 9.3 |
| `tools/merge-branch.sh` runs no end-to-end test. `MERGE_E2E=1` runs them as before, with the wait for a quiet machine and the second run. The build and the size check still run | 9.8 |
| CI: the step `pnpm test:perf` and the job `playwright` of `.github/workflows/ci.yml` have `if: false`. The Pages workflow skips the install of Chromium and `pnpm test:e2e` with `if: false`. The typecheck, the lint, the format check, the build, and the size check still run in CI. Thus a commit that fails a test can deploy | 9.2 |
| The speed tests stay in the Vitest project `perf`, and `pnpm test:perf` runs them by hand. No check runs them. The rule of `AGENTS.md` that a change of the speed of `score/`, `pose/`, or the synth passes `pnpm test:perf` waits for the end of the pause. This row replaces the row of the speed tests of `2026-10-14-test-pause.md` | 9.3 |
| The manager: until the user ends the pause, a change adds no test and runs no break test (`tools/break-test.sh`), unless the user asks. A test that no check runs goes out of date, and the user asked for less test work. A change that needs a check runs one file with `pnpm test:paused <path>`. A change that breaks the typecheck or the lint of a test file fixes that file, because both checks still read it | 9.3 |
| The manager: no review agent for the change of `tools/merge-branch.sh`. The change only skips the block of the end-to-end tests, and it adds no deletion of a file, no process, and no git command. A run of the new script with `--check-only` on the branch of the change passed | 9.8 |
| To end the pause, set `ALL_TESTS_PAUSED` to false, set the default of `MERGE_E2E` in `tools/merge-branch.sh` to 1, and remove each `if: false` of the two workflows. Then update this file and the rules of `AGENTS.md`. `pnpm test` then runs the tests of the pause of 2026-10-14 again. Run `pnpm test`, `pnpm test:perf`, and `pnpm test:e2e` before the first merge after the pause, because a test that no check ran can fail | 9.3 |
