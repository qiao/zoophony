# Workflow

This module of `AGENTS.md` gives the rules of the work: the docs, the commits, the place of the
work, the tests, the probes, the audits, and the end of a turn.

## Simplicity over compatibility

Nobody depends on this code yet, so simplicity outranks compatibility. Rename, move, and delete
symbols freely, and update all call sites in the same commit. Make each change directly, with no
deprecation shims, legacy branches, or compatibility aliases.

## Keep the docs true

- A change that alters behavior updates its file in `docs/design/` in the same session.
- A design file states the rules, the intent, and the reasons. It names the code file in place of
  a value that changes with each tuning, such as a color, a size, or a test result. The research
  report holds the measures. [`writing.md`](writing.md) gives the length limit of each kind of
  doc.
- When you move or delete code, update all pointers, comments, and TSDoc references. Grep for the
  old names before you finish.
- A commit that changes the value of a setting, or its reason, updates in the same commit its
  decision row, its design text, the line of its decision file in `docs/design.md`, and its TSDoc.
  Before the commit, grep `docs/`, `src/`, and `tools/` for the words of the old reason.
- `docs/research/` is a historical record. Keep each report as it was on its date. Each measured
  number of a report names its log or the command of its probe, and the probe stays in the
  research folder of the report.
- `AGENTS.md` and its modules in `docs/agents/` are in scope. Update them when one of their
  statements becomes wrong.

## Commits

Make one logical change per commit, and keep every commit green: each commit passes `pnpm lint`,
`pnpm typecheck`, and `pnpm test`. A commit that can change the speed of `score/`, `pose/`, or the
synth engine also passes `pnpm test:perf`, run again at a lower load after a failure under a heavy
load. While all tests are paused, `pnpm test` runs no test, and the rule of `pnpm test:perf` waits.

- Commit each verified change. Leave no verified work in the working tree.
- Write the subject as a Conventional Commit: `type(scope): subject`, in the imperative mood, in
  lower case, and with no full stop. Wrap the body at 75 characters.
- The types are `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `build`, and `ci`.
- The scope names the area: a module (`midi`, `score`, `pose`, `models`, `scene`, `audio`, `ui`,
  `app`), or `demos`, `tools`, `ci`, `design`, `research`, `audits`, or `agents`. Reuse the
  spelling of the log.
- Split a refactor of several steps into separate commits. For example, add the new path or move
  the tests first, then remove the old code.
- Before your report, run `tools/check-commits.sh --tip <base>` one time, with a clean tree.
  `<base>` is `main` on a branch. On `main`, `<base>` is the parent of your first commit, also
  when commits of others sit between your start commit and your first commit. It checks each
  commit and keeps each passed result in its cache by tree, so the merge gets a `hit` for each
  commit. Only the script writes an entry. A claim in a report is no entry.
- Run the check script in the background, because a run with no cache can take more than the
  10-minute limit of a Bash call. It checks the commits in a temporary worktree, so you can edit
  and commit while it runs. A new commit during the run gives the exit code 4: run it again.
  Wait for the exit notice of the background run. Do not wait in a loop on
  `pgrep -f "check-commits.sh"`: the loop shell holds the same text, matches itself, and never
  stops.
- After a commit that moves code between files, or a commit made while other changes are stashed,
  run `tools/check-commits.sh HEAD~1` before the next commit.
- A `kill -9` of the check script leaves its temporary worktree. `git worktree list` shows it,
  and `git worktree remove --force <path>` removes it.

## Where to work

An agent that works alone commits on `main` in the main checkout, so that the user sees each commit
at once in the running app (user, 2026-10-17). It needs no merge, and it pushes nothing. An agent
uses its own branch and worktree only when another agent works on the repository at the same time.
Then these rules hold:

- Stage each path by its name: `git add <path>`. `git add -A` and `git add .` also stage the files
  of the other agents.
- Merge a branch with `tools/merge-branch.sh <branch> [worktree]`. It rebases with no
  `--force-rebase`, checks each commit, and stops at the first failure. Run `git merge --ff-only`
  only in a script with `set -euo pipefail`, because a pipe such as `| tail` hides a failed merge.
- A rebase is finished when the folder `$(git rev-parse --git-path rebase-merge)` does not exist.
  `REBASE_HEAD` can stay after a finished rebase.
- Let the agent that wrote a branch do a long rebase, because it knows the intent of each commit.
- A rebase with `--exec` runs in the tree of each commit, which has an old copy of a script or
  none. Copy a script of the branch to a temporary path first.
- Put a new decision in a new decision file of `docs/decisions/`, so that two branches do not
  conflict.
- After a merge or a rebase, make each generated report again with its tool, such as
  `docs/reviews/step-6/keyboard-check.md` with `pnpm keyboard`. Do not merge its conflict lines by
  hand.
- A rebase can keep the old index line of a decision file beside the new one, with no conflict.
  After a merge, this command must print nothing:
  `grep -o 'decisions/[0-9-]*[a-z0-9-]*\.md' docs/design.md | sort | uniq -d`.

In both cases:

- Before the report, run `tools/decision-rows.sh --diff <base>`. Update or remove each decision
  row that names a removed identifier and that the change makes wrong.
- Run `pnpm test:e2e` with `ZOOPHONY_E2E_PORT` set to a free port, because the merge script and
  other agents use port 4182.
- Stop each dev server, preview server, and browser that you start, before you end your turn.
  `pgrep -fl 'vite|playwright|chrome-headless'` shows the processes that remain.

## Tests

Since 2026-10-16, all tests are paused (`docs/decisions/2026-10-16-all-tests-pause.md`), because
the tests took too long while the project changes fast. `pnpm test` runs no test, and no check runs
a test. Until the user ends the pause, a change adds no test and runs no break test, and the rules
below that add, break, or run a test wait. A change that needs a check runs one file with
`pnpm test:paused <path>`. A change that breaks the typecheck or the lint of a test file fixes that
file, because both checks still read it.

- Ship the tests in the same commit as the change of behavior.
- Confirm that a new test fails without the change: break the code that it covers, watch the test
  fail, then restore the code.
- The report of a new pure function gives one break command for each rule of its TSDoc. Run each
  command with `tools/break-test.sh '<perl expr>' <file> <test files>`, and read the diff of the
  break: a break that changes only a comment tests nothing.
- Test behavior: the same pose after a seek, the note times of a pose, and the size budget of
  design 7.2. Do not pin an exact tuned value, a hash, or the geometry of a look.
- A test compares no value of one body with a value of another body, such as "the fox arm is
  shorter than the wolf arm". Test each body against its own rule, such as the reach of its
  instrument.
- Leave no known red test of `pnpm test` or `pnpm test:perf` on `main`. Fix the cause, or change
  the test with the reason in the same session.
- The tests of the look, the fit, and the clearance of the bodies, and of the layout from their
  footprints, are paused since 2026-10-14 (`PAUSED_TESTS` of `vite.config.ts`,
  `docs/decisions/2026-10-14-test-pause.md`). A model round does not fix or remove a paused test.
  Put each new test of this kind into the list. To bring a test back, remove it from the list,
  make it pass, and update the decision file.
- A model that the user gives can fail checks of `pnpm test` that were tuned on the parametric
  bodies. Remove such a check, and fix the checks of the new code (user, 2026-10-10). Remove the
  tests and the test helpers of a body or a part that no species uses.
- A unit test goes beside its module, as `<name>.test.ts`.
- The lint refuses `vi.mock`. Move the logic under test into a function with plain values, as
  `renderScenePass()` of `scene/stage-scene.ts` does, and test the function.
- A tool that filters measured data prints what it drops, and checks its count against an
  independent count.
- Build test inputs with the real `midi/` and `score/` modules. A hand-made `Score` can drift from
  the rules of design 3.

## Probes and the shell

- Put a probe script in `scratch/` of your worktree. Git ignores the folder, and the lint, the
  typecheck, and the format check skip it. Run it with `node scratch/<name>.ts`. It imports the
  source modules by relative paths, such as `../src/models/species.ts`.
- Run an image probe in Python with
  `uv run --no-project --with pillow --with numpy --with scipy python -I <script>`. The other
  Pythons of the machine have no numpy or no Pillow.
- The machine has no `pdftotext`. Read the text of a PDF source with
  `uv run --no-project --with pypdf python -I <script>`, with `pypdf.PdfReader(path)` and
  `page.extract_text()`.
- Vitest hides the `console.log` output of a passing test, so a probe in a test writes a file.
- A sweep, such as `pnpm pose-depth` or `pnpm fold-probe`, reads the modules at its start. Do not
  edit or commit a module that it reads while it runs, because its result then belongs to no
  commit.
- In the shell of an agent, `grep` is a shell function that runs ugrep with `--ignore-files`, so
  it skips `scratch/` and `node_modules/`. `command grep` runs the grep of the system. Make a
  temporary edit of a file with `perl -0pi -e`, because the `sed -i` of macOS needs a suffix. Make
  a lasting edit of code with the Edit tool: a `|` or a `/` in TypeScript text can break the
  delimiter of a `perl` substitution and give a red commit.

## Performance rounds

- Run each timed measure through `tools/measure-lock.sh run --owner <name> -- <cmd>`: a trace,
  `pnpm load-probe`, `pnpm frame`, and each timed probe. The lock serves the tickets in their
  order, so two agents on one machine do not measure at the same time. `--gate <load>` also waits
  for a quiet CPU. `tools/measure-lock.sh status` shows the owner and the queue.
- A load round measures with `pnpm load-probe`. The Lighthouse tool of the chrome-devtools MCP
  server has no performance category.
- An ablation of a GPU cost reads the Metal trace of `pnpm frame`. With no frame cap, the main
  thread limits the frame rate, so the frame time alone does not show a GPU change.
- A change of the material IDs can change the order of the draws, and thus the pixels. Run
  `pnpm frozen` after such a change.

## Images of a mesh

Each image set that checks a mesh, a hold, or a clip shows four directions: the front, the back,
the left side, and the right side (azimuth 0, 180, -90, and 90). This rule applies to a lineup,
a crop set, and the crop pairs of a report (user, 2026-10-21). Add other views, such as ±35°,
only after these four. Look at all four images before you report: a clip, a fold, or a dark line
that shows only from the back or from one side is a fail.

Render each moment of the role, not only the first moment and rest (`--moments` with each name
of `ROLE_VIEWS`), at `--elevation 20` and `--elevation 40`, and add az150 and az-150. The stage
camera looks from behind and above. On 2026-10-22 a fix of the bear armpit passed at one
moment with raised arms, and the user then found a dent at the arm root from above, with the
arms lowered and at rest. A measure that says that no view shows a defect is no proof. Show the
images.

## Audits

- Write a codebase audit in `docs/audits/`, in a file whose name starts with the date. Give the
  file and the line of each finding. Put each finding that you could not confirm under an
  `Unverified` heading, with the steps to reproduce it.
- When you fix findings of an audit, add a `Status` section to the audit before the session ends:
  a verdict for each finding that you touched (`fixed`, `partly fixed`, `rejected`, or `open`),
  the commit hashes, and one line on what is left. Put the status in one `docs(audits)` commit
  after the fixes, because a commit cannot name its own hash.

## Ending a turn

When work remains open, end the turn with the next concrete step. Give one recommendation, or two
for different goals, with its cost and scope, from the work order of design 9.5. When the task is
finished, or when you answer a direct question, give no next step.
