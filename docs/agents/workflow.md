# Workflow

This module of `AGENTS.md` gives the rules of the work: the docs, the commits, the parallel work, the tests, the audits, and the end of a turn.

## Simplicity over compatibility

Nobody depends on this code yet, so simplicity outranks compatibility. Rename, move, and delete
symbols freely, and update all call sites in the same commit. Make each change directly, with no
deprecation shims, legacy branches, or compatibility aliases.

## Keep the docs true

- A change that alters behavior updates its file in `docs/design/` in the same session.
- A design file states the rules, the intent, and the reasons. It does not copy a value that
  lives in code and changes with each tuning, such as a color, a size, a stage width, or a test
  result. Name the code file instead, and put the measures of a tuning in its research report.
- When you move or delete code, update all pointers, comments, and TSDoc references. Grep for the
  old names before you finish.
- A commit that changes the value of a setting, or the reason for it, updates these in the same
  commit: its decision row, its design text, the line of its decision file in `docs/design.md`,
  and the TSDoc of the setting. Before the commit, grep `docs/`, `src/`, and `tools/` for the
  words of the old reason. Commit `18cd7e3b` changed the crease angle of the rabbit from 10° to
  35° with no docs, and three old claims stayed.
- `docs/research/` is a historical record. Keep each report as it was on its date.
- Each measured number of a research report names its log or the command of its probe. Keep the
  probe in the research folder of the report.
- `AGENTS.md` is in scope. Update it when one of its statements becomes wrong.

## Commits

Make one logical change per commit, and keep every commit green. After the project skeleton
exists (design 9.5, step 0), every commit passes `pnpm lint`, `pnpm typecheck`, and `pnpm test`.
A commit that can change the speed of `score/`, `pose/`, or the synth engine also passes
`pnpm test:perf`. If it fails under a heavy load, run it again when the load is lower. While all
tests are paused (below), `pnpm test` runs no test, and the rule of `pnpm test:perf` waits for
the end of the pause.

- Commit each verified change. Leave no verified work in the working tree.
- Before your report, run `tools/check-commits.sh --tip <base>` one time, with a clean tree.
  `<base>` is `main` on a branch, or the commit of `main` where your work started when you work on
  `main` (see "Parallel work"). It checks each commit and the full suite on the last commit. It keeps
  each passed result in the cache by tree. Then the merge gets a `hit` for each commit. Only the
  script writes an entry, and a claim in a report is no entry.
- After a commit that moves code between files, or a commit made while other changes are
  stashed, run `tools/check-commits.sh HEAD~1` before the next commit. It checks that one commit
  and writes its cache entry. The fox round checked such a commit with the lint and the
  typecheck only, and the full check failed at it later, which cost a rebase and a second run.
- Run the check script in the background, because a run with no cache can take more than the
  10-minute limit of a Bash call. Do not edit the worktree while it runs. An edit gives no entry,
  and the rebase abort after a failure removes the edits of the tracked files.
- A stop of the check script (Ctrl-C or `kill`) aborts its rebase. When a stop leaves the
  worktree in a rebase, for example after `kill -9`, run `git rebase --abort`.
- Write the subject as a Conventional Commit: `type(scope): subject`. Use the imperative mood,
  lower case, and no full stop at the end. Wrap the body at 75 characters.
- The types are `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `build`, and `ci`.
- The scope names the area that changed: a module (`midi`, `score`, `pose`, `models`, `scene`,
  `audio`, `ui`, `app`), or `demos`, `tools`, `ci`, `design`, `research`, `audits`, or `agents`.
  Reuse the spelling that the log already holds.
- Split a refactor of several steps into separate commits. For example, add the new path or move
  the tests first, then remove the old code.

## Parallel work

By default, an agent that works alone commits on `main` in the main checkout, so that the user can
check each commit at once in the running app (user, 2026-10-17). It needs no merge. It pushes
nothing, and it runs the check script on the commits of its round. An agent uses its own branch and
worktree only when another agent works on the repository at the same time.

Follow these rules when another agent works on the repository at the same time.

- Work in your own git worktree, on your own branch.
- Stage each path by its name: `git add <path>`. `git add -A` and `git add .` also stage the
  files of the other agents, so use neither.
- Merge a branch with `tools/merge-branch.sh <branch> [worktree]`. It does the steps below and
  stops at the first failure.
  - Rebase onto `main` with no `--force-rebase`, then check each commit with
    `tools/check-commits.sh main`. Each commit runs only the tests that its changes reach through
    the imports, and the tests that read a docs path when it changes docs. The parent of the
    commit passed the other tests. A tree that passed before prints `hit`, so this step takes
    seconds after the check of the agent. The full `pnpm test` runs one time on the last commit,
    with no cache.
  - Run `git merge --ff-only` only in a script with `set -euo pipefail`. A pipe such as
    `git merge --ff-only <branch> | tail` hides a failed merge. Then the next command can delete
    a branch that is not merged.
- A rebase is finished when the folder `$(git rev-parse --git-path rebase-merge)` does not exist.
  `REBASE_HEAD` can stay after a finished rebase, so it does not show the state.
- Let the agent that wrote a branch do a long rebase, because it knows the intent of each commit.
- A rebase with `--exec` runs its command in the tree of each commit. An old commit has an old
  copy of a script or none. Copy a script of the branch to a temporary path first, and run the
  copy. `tools/check-commits.sh` does this.
- Before the report, run `tools/decision-rows.sh --diff main`. It lists the decision rows that
  name an identifier or a string literal that the branch removes. Update or remove each row that
  the change makes wrong.
- Run `pnpm test:e2e` with `ZOOPHONY_E2E_PORT` set to a free port, because the merge script and
  other agents use port 4182.
- Put a new decision in a new decision file of `docs/decisions/`. Two branches then add two
  files, and their merge has no conflict.
- After a merge or a rebase, make each generated report again with its tool, for example the
  table of `docs/reviews/step-6/keyboard-check.md` with `pnpm keyboard`. Do not merge the
  conflict lines of a report by hand.
- Stop each dev server, preview server, and browser that you start, before you end your turn.
  `pgrep -fl 'vite|playwright|chrome-headless'` shows the processes that remain.

## Tests

Since 2026-10-16, all tests are paused (`docs/decisions/2026-10-16-all-tests-pause.md`). The user
asked for the pause, because the tests took too long while the project changes fast. `pnpm test`
runs no test, and no check runs a test. Until the user ends the pause, a change adds no test and
runs no break test. The rules below that add, break, or run a test wait for the end of the pause.
A change that needs a check runs one file with `pnpm test:paused <path>`. A change that breaks the
typecheck or the lint of a test file fixes that file, because both checks still read it.

- Ship the tests in the same commit as the change of behavior.
- Confirm that a new test fails without the change. Break the code that it covers, watch the test
  fail, then restore the code. A test that passes both ways pins nothing.
- The report of a new pure function gives one break command for each rule that its TSDoc
  states. Run each command with `tools/break-test.sh '<perl expr>' <file> <test files>`, and
  give the test that fails. Read the diff of the break that the script prints: a break that
  changes only a comment tests nothing. The weight by the corner angle of `studioNormals()` had
  no test until the review of 2026-10-14.
- Test behavior: the same pose after a seek, the note times of a pose, and the size budget of
  design 7.2. The tests of the clearance and of the fit of a body, such as no clipping and the
  bow on the strings, are paused (below). Do not pin an exact tuned value, a hash, or the
  geometry of a look. Each deliberate change of the look then edits such a test, and the test
  finds no fault.
- A test compares no value of one body with a value of another body, such as "the fox arm is
  shorter than the wolf arm". Each form change of one body breaks such a test, and the test finds
  no fault. Test each body against its own rule, such as the reach of its instrument.
- Leave no known red test of `pnpm test` or `pnpm test:perf` on `main`. Fix the cause, or change
  the test with the reason in the same session.
- Since 2026-10-14, the tests of the look, the fit, and the clearance of the bodies, and of the
  layout from their footprints, are paused (`docs/decisions/2026-10-14-test-pause.md`).
  `PAUSED_TESTS` of `vite.config.ts` lists them. `pnpm test` skips them, so a paused test that
  fails stops no commit and no merge. Do not fix a paused test in a model round. When a change
  needs a paused check, run its file with `pnpm test:paused <path>`. Put each new test of the
  look, the fit, or the clearance of a body into the list. To bring a test back, remove it from
  the list, make it pass, and update the decision file.
- A unit test goes beside its module, as `<name>.test.ts`.
- The lint refuses `vi.mock` (`anti-slop/no-module-mocking`). Thus a class that makes a
  `WebGLRenderer`, such as `StageScene`, moves the logic under test into a function with plain
  values, as `renderScenePass()` of `scene/stage-scene.ts` does, and the test calls the function.
- A tool that filters measured data prints what it drops, and checks its count against an
  independent count. For example, the GPU row of `pnpm frame` prints the time of the buffers that
  its filter drops, and compares its frames with the canvas writes of the trace.
- Build test inputs with the real `midi/` and `score/` modules. A hand-made `Score` copies the
  rules of design section 3, and it can drift from them.
- A model that the user gives can fail checks of `pnpm test` that were tuned on the parametric
  bodies. Remove such a check, and fix the checks of the new code (user decision of 2026-10-10).
  A model round does not fix or remove a paused test. Remove the tests and the test helpers of a
  body or a part that no species uses.
- Put a probe script in `scratch/` of your worktree. Git ignores the folder, and the lint, the
  typecheck, and the format check skip it. Run the probe with `node scratch/<name>.ts`. It
  imports `three` through the `node_modules` of the worktree, and the source modules by relative
  paths such as `../src/models/species.ts`. `pnpm test` skips the test files in `scratch/`.
- Run an image probe in Python with
  `uv run --no-project --with pillow --with numpy --with scipy python -I <script>`. The Python of
  Homebrew and the Python of the system have no numpy, and the Python of Blender has no Pillow.
- Vitest hides the `console.log` output of a passing test. A probe in a test writes its values
  into a file.
- In the shell of an agent, `grep` is a shell function that runs ugrep with `--ignore-files`.
  It skips the files that git ignores, such as `scratch/` and `node_modules/`. `command grep`
  runs the grep of the system. The `sed -i` of macOS needs a suffix argument, so make a
  temporary edit of a file with `perl -0pi -e`.

## Audits

- Write a codebase audit in `docs/audits/`, in a file whose name starts with the date. Give the
  file and the line of each finding. Put each finding that you could not confirm under an
  `Unverified` heading, with the steps to reproduce it.
- When you fix findings of an audit, add a `Status` section to that audit before the session
  ends. Give each finding that you touched a verdict (`fixed`, `partly fixed`, `rejected`, or
  `open`), the commit hashes, and one line on what is left. Put the status in one
  `docs(audits)` commit after the fixes, because a commit cannot name its own hash.

## Ending a turn

When work remains open, end the turn with the next concrete step. Give one recommendation, or two
for different goals, with its cost and scope. Base it on the work order (design 9.5). When the
task is finished, or when you answer a direct question, give no next step.
