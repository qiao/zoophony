# Briefs for a studio body in the app

A manager uses these templates to put an animal of `lowpoly-studio/` into the app for a role, by
route 3 of `AGENTS.md`. Examples are a violinist rabbit and a cellist dog. A round has three
agents, one after the other: the implementation, the review, and the fix. Copy each template to
the scratch folder of the session, replace each `<...>`, and delete the notes in parentheses.

The polar bear pianist of 2026-10-12 took about 2.3 hours. The retrospective of that task made
the tools that these templates name ([`2026-10-13-route-3-retro.md`](../research/2026-10-13-route-3-retro.md)).

```text
 manager            agents                                          manager
 +-----------+      +----------------+   +----------+   +-----+     +-------+   +-------+
 | baseline, | ---> | implementation | > |  review  | > | fix | --> | merge | > | retro |
 | inspect,  |      | sweep, probes  |   | tip only |   |     |     | cache |   |       |
 | brief     |      +----------------+   +----------+   +-----+     | hits  |   +-------+
 +-----------+                                                       +-------+
```

## 1. Before the brief

Run these commands on `main`. Put the output and the numbers into the brief, so that no agent
makes a baseline worktree.

| Fact | Command |
|---|---|
| The meshes, joints, digits, morph targets, clips, props, bind hips, and lowest skin point of the GLB file | `pnpm studio-body <animal> --inspect` |
| The same facts of the last studio body, for the section "What is new" | `pnpm studio-body bear --inspect` |
| The depth of each part and the note errors of a role that exists | `pnpm pose-depth <role>` |
| The folded faces of the studio bodies | `pnpm fold-probe <role>` |
| The size of the first download | `pnpm build && pnpm size` |

Make the worktree: `git worktree add .claude/worktrees/<branch> -b <branch> main`. Copy the
common rules of the agents into the scratch folder (section 5).

## 2. Implementation brief

```markdown
# Brief: the studio <animal> as the <role> of the app

Date <date>. Manager <session>. Base commit `<hash>` of `main`.
Worktree `<path>`, branch `<branch>`. Handoff file `<scratch>/handoff-<branch>.md`.
Time box <minutes>. Read `<scratch>/rules-common.md` first.

## Goal

The user said: "<quote>". The <species> of the <section> gets the studio body of
`lowpoly-studio/animals/<animal>/out/<animal>.glb` by route 3 of `AGENTS.md`. The app keeps its
own motion, instrument, and seat. It drives the bones of the studio on each frame.

Done when:
1. `pnpm studio-body <animal>` writes `src/models/studio/<animal>.ts`, and the species has the
   body.
2. <the pose claims: the seat, the feet on the floor, the hold on the instrument>.
3. The role is in `SWEEP_ROLES` of `src/pose/test-sweep-roles.ts`, with its parts, its
   instrument shells, its note targets, and its shard files
   `src/pose/<role>-clearance-<k>.test.ts`. Each accepted limit is an `AcceptedDepth` with a
   decision row. `pnpm pose-depth <role>` shows each other part within the contact depth.
4. `tools/check-commits.sh --tip main` passes one time before the report. Build, size, and
   `ZOOPHONY_E2E_PORT=<port> pnpm test:e2e --project=chromium` pass on the tip.
5. The role is in `ROLE_VIEWS` of `tools/close-views.ts` and in `FOLD_ROLES` of
   `tools/fold-probe.ts`. `pnpm close-views <role> <dir>` ran on the last pose, and you looked
   at each view.
6. `pnpm snapshot` ran after the last code commit.
7. The docs below are true.

## Facts of the source

<the output of `pnpm studio-body <animal> --inspect`>

## What is new against the last studio body

<each difference: props in the GLB file, digits, a seated bind pose, a held instrument, a new
attachment. Name the code that each one touches.>

## Baseline

<the numbers of section 1>

## Scale and seat

- Landmark: the shoulder joints for a standing role, the top of the keys for a pianist, or
  <the landmark of the instrument>. Record the choice and its measure as a decision row.
- A seat fits the legs of the body. Do not stretch the legs (user rule of 2026-10-10). Look at
  the knees from the side.

## Process

- Commit the mechanism first, with values that change nothing. Then tune. Then commit the tuned
  values with their tests.
- Tune a hold with `pnpm pose-depth <role> --set '<path>=<value>'` and
  `pnpm pose-probe <sheet> --set ...`. The own hold of a species is
  `<instrument>@<species>.<path>`. Do not edit, run, and restore the source for each variant.
- Test a new limit over all demos and over each branch of the code that it limits.
- Put the size note of the packed body into the commit of the generated module.
- Run `pnpm snapshot` only after the last code commit.
- One home for each tuned number: the research report holds the measures. A decision row names
  the code and keeps the value that made the decision. A comment gives the reason and no value
  that the code states. A design file names the code.
- Read each design paragraph that you change from its first sentence to its last.
- Put probe scripts into `scratch/` of the worktree. Put each probe that gives a number of the
  report into `docs/research/<date>-<topic>/` with the report, and give its command in the
  report. The merge removes the worktree with its `scratch/` folder.

## Docs

- `docs/design/`: <sections>. Check the diff for copied values:
  `git diff -U0 main -- docs/design | grep -nE '^\+.*([0-9]+°|[A-G][♭♯]?[0-9])'`.
- A new decision file `docs/decisions/<date>-studio-<animal>.md`. Its first row is the decision
  of the user, with the quote. Its line in `docs/design.md` goes into the same commit.
- Run `tools/decision-rows.sh <species> <props> <role>` and `tools/decision-rows.sh --diff main`.
  Remove or cut each row that the branch replaces, in the commit of the change.
- A new research report `docs/research/<date>-studio-<animal>.md`.
- `AGENTS.md` ("Model work"), `lowpoly-studio/docs/handoff.md`, and `lowpoly-studio/README.md`.

## Values to keep

- `pnpm body-probe --base main`: each other body and player, and each pose set, stays equal.
- The first download stays below 1 MB. Give a change of more than 5 KB in its commit message.
- `pnpm fold-probe` and `pnpm pose-depth` of the other roles stay as in the baseline.

## Tests

- Remove each old check that was tuned on the parametric bodies and that the studio body fails.
  Try a cheap fix first. List each removed check in its commit message with the reason.
- For each new test, give in the report one command that breaks the code that it covers, and
  the failure that it gives.

## Files

<the files of the round, and the files of other agents>

## Report format

Reply with these parts, in this order, and nothing else: Result; Numbers (| Measure | main |
branch |); Decisions; Removed or changed tests (| Test | Reason |); Break commands (| Test |
Command | Failure |); Commits; Images to review; Open problems and the next step.
```

## 3. Review brief

```markdown
You are the independent review agent of the branch `<branch>` (design 9.8), in the worktree
`<path>`. Do not edit, commit, merge, or push. Write files only into `<scratch>/review/`.
Read `<scratch>/rules-common.md`, the brief `<path>`, `AGENTS.md`, and the diff with no
generated module and no image:
`git log -p main..<branch> -- . ':!src/models/studio/*.ts' ':!*.webp' ':!*.png'`.

1. Run `tools/check-commits.sh --tip main` one time, in the background, with no edits during the
   run. It reads the results of the implementer from the cache. Do not check each commit again
   in another way.
2. Run each break command of the report, watch the test fail, and restore the file with
   `git checkout -- <path>`.
3. Run `pnpm pose-depth <role>`, `pnpm fold-probe <role>`, and `pnpm body-probe --base main`.
   Compare them with the report.
4. Check the correctness, the rules of `AGENTS.md`, and the edge cases of the shared pose code
   for the other species.
5. Run `tools/decision-rows.sh --diff main`. List each old row that the branch replaces and does
   not remove. Check the design files for copied values.
6. Look at the close views and the snapshot.

Reply with only: Verdict; Findings (| # | Severity | File:line | Finding | Evidence | Fix |);
Checks run (| Check | Result |).
```

## 4. Fix brief

```markdown
Fix round of the branch `<branch>`. Read `<scratch>/rules-common.md`, the brief `<path>`, the
handoff `<path>`, and `AGENTS.md`. Fix each finding in its own commit, after you check it
against the code. When a finding is wrong, give the reason. Tune with `pnpm pose-depth --set`.
At the end, run `tools/check-commits.sh --tip main` one time in the background.

| # | File:line | Finding | Fix |

Reply with only: Result; Findings (| # | Verdict | Commit | Note |); Checks run; Commits; Open
problems.
```

## 5. Common rules of the agents

Copy this list into `<scratch>/rules-common.md`, and add the report format of the round.

- Work only in your worktree on your branch. Never write into the main checkout. Read
  `AGENTS.md` of the worktree first.
- Stage each path by its name. Never use `git add -A` or `git add .`.
- Make very fine-grained Conventional Commits, with the body wrapped at 75 characters.
- `grep` is a shell function that runs ugrep, so use `perl -0pi -e` for a temporary edit.
  Vitest hides the `console.log` of a passing test, so a probe writes a file. No `timeout`, and
  no foreground `sleep`. Read the exit code of the command itself.
- Never take ports 5173, 5190, or 4182. Stop each process that you start, by its PID. Never
  stop a process that you did not start, and never use `pkill -f`.
- Do not edit the worktree while a tool builds the site or while `tools/check-commits.sh` runs.
- No merge and no push. End with your branch checked out, no rebase in progress, and a clean
  tree.
- Ask no questions when the user is not available. Record each open choice as a decision row.
- Write all prose in ASD-STE100 Simplified Technical English, with no em dashes.
- Keep the handoff file current after each finished step.

## 6. After the merge

Merge with `tools/merge-branch.sh <branch> <worktree>` from the main checkout. Then ask each
agent of the round, with `SendMessage`, what would make the next similar task faster. Decide,
and apply the items that are worth the cost (user rule of 2026-10-12). Record the times, the
decisions, and the measured gains in a research report.
