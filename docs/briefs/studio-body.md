# Briefs for a studio body in the app

A manager uses these templates to put an animal of `lowpoly-studio/` into the app for a role, by
route 3 of `AGENTS.md`. Examples are a violinist rabbit and a cellist dog. A round has one
implementation agent. A review agent and a fix agent follow only when the round changes code of
the kinds that design 9.8 names. These are tool code that deletes files, starts processes, or
changes the git state, and a rule of the pure core. The model work of a round gets no review
agent. The manager reads the report and the close views, and the merge script runs the checks.
Copy each template to the scratch folder of the session, replace each `<...>`, and delete the
notes in parentheses.

Since 2026-10-16, all tests are paused
([`2026-10-16-all-tests-pause.md`](../decisions/2026-10-16-all-tests-pause.md)). Until the user
ends the pause, delete each step of a template that adds, breaks, or runs a test: the shard files
of a sweep, the break commands, `pnpm test src/shots/`, and `pnpm test:e2e`. Keep the probe tools,
such as `SWEEP_ROLES` for `pnpm pose-depth`, and keep `tools/check-commits.sh --tip main`.

The polar bear pianist of 2026-10-12 took about 2.3 hours. The retrospective of that task made
the tools that these templates name ([`2026-10-13-route-3-retro.md`](../research/2026-10-13-route-3-retro.md)).

```text
 manager            agents                                   manager
 +-----------+      +----------------+                       +-------+   +-------+
 | baseline, | ---> | implementation | --------------------> | merge | > | retro |
 | inspect,  |      | sweep, probes  |                       | cache |   |       |
 | brief     |      +----------------+                       | hits  |   +-------+
 +-----------+              |                                +-------+
                            | only for the code of design 9.8    ^
                            v                                    |
                      +-----------+   +-----+                    |
                      |  review   | > | fix | -------------------+
                      | 10 min,   |   |     |
                      | code only |   +-----+
                      +-----------+
```

## 1. Before the brief

Run these commands on `main`. Put the output and the numbers into the brief, so that no agent
makes a baseline worktree.

| Fact | Command |
|---|---|
| The meshes, joints, digits, morph targets, clips, props, bind hips, and lowest skin point of the GLB file | `pnpm studio-body <animal> --inspect` |
| The same facts of the last studio body, for the section "What is new" | `pnpm studio-body bear --inspect` |
| The depth of each part and the note errors of a role that exists | `pnpm pose-depth <role>` |
| The folded faces of the studio bodies | `pnpm fold-probe <role>`, with `--glb <file>` for a new GLB file of the body of the role |
| The smallest gaps of the head to the instrument and of the paws to the body | `pnpm pose-depth <role> --gaps` |
| The reach of the arms against the instrument | `pnpm studio-body <animal> --inspect` for the arms, and `pnpm hold-reach <species>` for a violin or a viola. For a new GLB file of a species with a studio body, add `--glb <file>`. For a species with no studio body, use a scratch copy with an entry in `ANIMALS` (below). |
| The size of the first download | `pnpm build && pnpm size` |
| The posture of a real player of the instrument at rest, when ready, and in a play | a source on the web, and the clips of the studio: `python3 studio view <animal>`, then the viewer query `shot&view=free&clip=<clip>&t=<s>&az=<deg>` |

Compare the reach of the arms with the instrument before the round. When the species already has
a studio body and the round gives it a new GLB file, run `pnpm studio-body <animal> --inspect
--glb <file>` and `pnpm hold-reach <species> --glb <file>`. They use the settings of the animal in
`ANIMALS` and the body that the export makes from the file, with no edit. Else make a scratch copy
of the body in a scratch worktree. First, add the animal to `ANIMALS` of `tools/studio-body.ts`
with the landmark of its scale. The meters of `--inspect` and of `pnpm hold-reach` hold only at that
scale. Without an entry, `--inspect` assumes the shoulders at 1 m. Then run
`pnpm studio-body <animal> --inspect` for the arms. For a violin or a viola, also run
`pnpm studio-body <animal>`, add the module to `STUDIO_BODIES`, and give the species the body in
`SPECIES`. Then run `pnpm hold-reach <species>`. It gives the reached parts of the fingerboard and
the bow, and the scale of the rule of a violin shop. When the rule gives a violin outside the
real sizes, ask the user before the round. The tool gives no real viola sizes, and the app has no
viola scale. So for a viola, a rule scale below 1 is a question to the user. Give the measures
and the choices, such as longer arms in the studio or a smaller instrument. The rabbit of
2026-10-13 had arms of 0.27 m. The rule gave it a violin of 0.15 m, less than half of the smallest
real violin (0.33 m). The app agent found it at minute 14 of its round, and the user saw it only
after the round, then chose longer arms
([`2026-10-13-rabbit-retro.md`](../research/2026-10-13-rabbit-retro.md)).

Finish the look rounds of the studio before the app round starts. A merge of a studio round
during the app round makes the app agent rebase. Each commit then gets a new tree, and the check
runs on each commit again. In the rabbit task, this took about 10 minutes for each merge. When the
studio work and the app work must overlap, put the studio round on the app branch. Then one agent
works after the other, as for the arms of the rabbit (round 4).

Start a hold round of a body only after each form or scale round of the same body has merged. A
form change moves the shoulder joints, the arms, and the head, so the holds need a new fit. The
tan flute fox of 2026-10-14 got its flute hold on the fox form of the size round, and a second
fit on the final fox form (commit `763037b2`). When the manager knows of a form change of the body,
the brief names it as a dependency, and the hold round waits for its merge.

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
   `src/pose/<role>-clearance-<k>.test.ts`. The shard files are paused tests, so `pnpm test`
   skips them. Each accepted limit is an `AcceptedDepth` with a decision row.
   `pnpm pose-depth <role>` shows each other part within the contact depth.
4. `tools/check-commits.sh --tip main` passes one time before the report. Build, size, and
   `ZOOPHONY_E2E_PORT=<port> pnpm test:e2e --project=chromium` pass on the tip.
5. The role is in `ROLE_VIEWS` of `tools/close-views.ts` and in `FOLD_ROLES` of
   `tools/fold-probe.ts`. `pnpm close-views <role> <dir> --base main` ran on the last pose, and
   you compared each view with the grid of `main` above it.
6. `pnpm snapshot` ran after the last code commit.
7. The docs below are true.

## Dependencies

<each form or scale round of the same body that has not merged, or "none". The round starts
after the merge of each one.>

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

## Poses

- The rest pose, the ready pose, and the play pose follow the posture of a real player of the
  instrument: <the posture, with its source>. A clip of the studio fits the body, so take the
  lean, the reach, and the clearance from it. Its look can be wrong: a rest pose after the rest clip of
  the polar bear leaned 22° forward, and the user found it strange (2026-10-13).
- Before a fit, check that the pose code can show the rest pose and the hold of the source, such
  as a head turn to the side of a flute. When a part of the posture has no mechanism, add the
  mechanism first, with values that change nothing. Then fit.

## Range and stop

<For each fallback rule of this brief, give the range of its result and the stop when the result
is outside it. For example: "When the left paw cannot reach the neck, give the species a smaller
violin. Size it by the rule of a violin shop (`pnpm hold-reach <species>`). Range: a violin of
0.33 m (1/32) to 0.59 m (4/4). Outside it, stop, and write the measures into the handoff file.
Then report to the manager." The fallback rule of the rabbit of 2026-10-13 had no range. It gave
a violin of 0.15 m.>

- When a measure chooses a value, such as a crease angle or a scale, check first that the
  reference lies inside the range of the renders of the variants. When it does not, the measure
  cannot choose. Stop, and send the table of the variants and the reference to the manager.
  (The facet contrast of the rabbit references of 2026-10-14, 4.01% and 4.61%, lay above the
  flat rabbit, 3.28% and 2.64%. The round took 10°. The manager changed it to 35°, and that
  cost six more commits.)


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
  `pnpm build && pnpm size --base main` prints the change.
- `pnpm fold-probe` and `pnpm pose-depth` of the other roles stay as in the baseline.

## Tests

- Remove each old check that was tuned on the parametric bodies and that the studio body fails.
  Try a cheap fix first. List each removed check in its commit message with the reason. A paused
  test (`PAUSED_TESTS` of `vite.config.ts`) needs no fix. Run it with `pnpm test:paused <path>`
  only when the change needs its check.
- A test compares no value of one body with a value of another body, such as "the fox arm is
  shorter than the wolf arm". Each form change of one body breaks such a test, and the test finds
  no fault. Test each body against its own rule, such as the reach of its instrument.
- For each new test, give in the report one command that breaks the code that it covers, and
  the failure that it gives. For a new pure function, give one command for each rule of its
  TSDoc. Run each command with `tools/break-test.sh '<perl expr>' <file> <test files>`.

## Files

<the files of the round, and the files of other agents>

## Report format

Reply with these parts, in this order, and nothing else: Result; Numbers (| Measure | main |
branch |); Decisions; Removed or changed tests (| Test | Reason |); Break commands (| Test |
Command | Failure |); Commits; Images to review; Open problems and the next step.
```

## 3. Review brief (optional)

Use this brief only when the round changes code of the kinds of design 9.8, such as a tool that
removes a folder or starts a server. Name that code in `<paths>`. The review takes about 10
minutes and reads the code only.

```markdown
You are the independent review agent of the branch `<branch>` (design 9.8), in the worktree
`<path>`. Do not edit, commit, merge, or push. Write files only into `<scratch>/review/`.
Time box 10 minutes. Review only the code of `<paths>`: <the tool code that deletes files,
starts processes, or changes the git state, or the rule of the pure core>. Read
`<scratch>/rules-common.md`, the brief `<path>`, `AGENTS.md`, and the diff of that code:
`git log -p main..<branch> -- <paths>`.

1. Run `tools/check-commits.sh --tip main` one time, in the background, with no edits during the
   run. It reads the results of the implementer from the cache. Do not check each commit again
   in another way.
2. Run each break command of the report for that code with `tools/break-test.sh`, and read the
   test that fails. The script restores the file.
3. Check the correctness, the rules of `AGENTS.md`, and the edge cases. For a tool, these are the
   stop paths (a failure, and Ctrl-C through pnpm), the removed files, the ports, and the git
   state. For the pure core, these are the rules of its design section.
4. Run no image tool and no probe of a body. The manager reads the close views, the snapshot, and
   the probes of the report.

Reply with only: Verdict; Findings (| # | Severity | File:line | Finding | Evidence | Fix |);
Checks run (| Check | Result |).
```

## 4. Fix brief (after a review)

Use this brief when the review finds a fault. The fixes get no second review (design 9.8). The
manager reads the report of the fixes, and the merge script runs the checks.

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

## 7. A mesh with no skeleton

The user can give a textured mesh with no skeleton, as the rabbit
`assets/models/rabbit/rabbit-4.glb` of 2026-10-13 and the fox `assets/models/fox/fox.glb` of
2026-10-14. `pnpm rig-mesh <animal>` rigs it into the GLB
format of a studio body ("A mesh with no skeleton into route 3" of `AGENTS.md`). That task took
five agent rounds ([`2026-10-14-rabbit-mesh-retro.md`](../research/2026-10-14-rabbit-mesh-retro.md)).
Add these items to the briefs of the rig round and of the app round.

- **The arms.** Write a first config with the measured joints, `armFactor` 1, and the rule of
  the thin faces (`check.thin`). Then run `pnpm rig-mesh <animal> --check` before the question to
  the user about the arms. Its first line
  gives the shoulder joint, the reach with no factor, and the factor of the target reach. Ask
  with that measured factor. Choose the landmark of the scale before the question: for the fox,
  the factor of the rabbit reach was 1.41 at the shoulders of the parametric fox and 1.078 at its
  head top. For the rabbit, the manager estimated 1.25 from a render, and the
  measure gave 1.445.
- **The faces.** Permit rings at the joints from the start (`refine.rings` of the config). Also
  permit edge flips of faces that lie almost on one plane (`refine.flip`). `--check` lists the thin faces near
  the joints of the limbs as candidates for a ring. The rule "keep the faces of the source"
  stopped the app round of the rabbit at 45% play folds.
- **The order of the goals.** When two goals conflict, keep this order:
  1. the clearance of the sweeps (`pnpm pose-depth <role>`);
  2. the play folds, at most 1% of the play samples (`pnpm fold-probe <role>`);
  3. the range of the instrument (`pnpm hold-reach <species>`);
  4. the look of the hold.

  The folds and the violin size of the rabbit pulled against each other.
- **The checks before the docs.** Run each check of the app before the first docs commit.
  `pnpm rig-mesh <animal> --check` gives the triangles, the module size, the seat, the chair, and
  H. It also gives the reach, the standing body, the violin rule, and the folds. Then look at the close views.
  Write the docs last. The rig round of the rabbit found the seat of 0 m after its docs commits.
- **The variants.** Fit each variant of a hold with `pnpm hold-fit <role> --set <changes>`. One
  table gives the play and the lift folds, the deepest point of each sample set of the sweep,
  and, for a violin, the rule scale, `stopRange`, and `bowRange`. Fit each variant of the rig
  config with `pnpm rig-mesh <animal> --check --set <path>=<value>`. Before a change of a weight
  rule, read the weights of the faces that fold with `pnpm fold-probe <role> --faces <n>`. The
  fox round lost about 45 minutes to hand probes between these tools
  ([`2026-10-14-fox-retro.md`](../research/2026-10-14-fox-retro.md)).
- **A moved instrument.** A moved instrument can break a user rule, such as the reach of the nut.
  Check the hold anchors: the table of `pnpm rig-mesh <animal> --check` gives the head center,
  the head height H, the nose, and the box of the instrument of each player against `main`, and
  marks each move above 1 mm. The neck of the fox rig moved the head center by 1.71 cm, and the
  violin moved with it.
- **The demos of a fit.** Fit on `FIT_DEMOS`, the default of `pnpm hold-fit`, or on all demos
  (`--demo all`), never on one demo. A candidate of the flute rest that a search fit on
  `beethoven-8` alone gave depths of 1.63 cm and 1.80 cm on all demos, over the limit of 1.5 cm.
- **The size of a body.** A change of the size of a body keeps the values of the pose in meters,
  such as the free hair of the bow (`freeHair` of each bowed hold), the lift of the bow, and the contact limits of
  the sweep. The trap of a body size in route 3 of `AGENTS.md` lists them with their files.
  Compare the folds and the depths in the H of each body first, with
  `pnpm hold-fit <role> --base main` and `pnpm pose-depth <role> --base main`. Then probe these
  values before a fit of a hold. Compare the heights with
  `pnpm close-views lineup <species,...> <dir> --base main`, which keeps one camera for both
  trees. The size round lost about 55 minutes to hand probes and to these values
  ([`2026-10-14-size-retro.md`](../research/2026-10-14-size-retro.md)).
- **The seat and the tail.** Give the seat height and the lowest point of the tail of
  `pnpm rig-mesh <animal> --check` before a plan of a tail. The brief of the fox asked for a tail
  tip down behind the chair, and the seat of 0.126 m does not give room for a tip of 0.31 m.
- **The end of the round.** Run `pnpm snapshot` after the last check of the code. Give the line of
  `pnpm size --base main` in the commit that adds the body.
- **The probes.** Look at a rig with `pnpm rig-mesh <animal> --check --preview <dir>`, which
  writes no file into the repository. A plain `--preview` writes the GLB file. Probe a rig before
  the swap with `--glb <file>` of `pnpm studio-body --inspect`, `pnpm hold-reach`, and
  `pnpm fold-probe`. Do not edit `ANIMALS` for a probe.
- **The GLB file.** Commit each rule of the rig script with the GLB file unchanged. Only the last
  commit of a series of rig commits writes the GLB file again. The rig GLB file of the rabbit has
  12 versions in the history, with blobs of 7,450,048 B in all. The rig round wrote five files of
  about 0.91 MB. The app round wrote one file of 0.89 MB and five of 0.33 MB, and the folds round
  wrote one of 0.34 MB. This command gives the sizes:

  ```bash
  F=assets/models/rabbit/rabbit-4.rig.glb
  git log --format=%h -- $F | while read h; do echo "$h $(git cat-file -s $h:$F)"; done
  ```
- **The look tests.** Name the look tests that can change with the new body. The app round of the
  rabbit changed two of them:
  - `src/pose/bowed.test.ts`: "holds the violin of a rabbit on the left shoulder about level, as
    a real violinist". Its old title was "scroll down, as its sheet".
  - `src/models/studio-rig.test.ts`: the leg angle of "straightens the legs under the hips".

  A new body changes their target, and they find no fault. Since 2026-10-14, `bowed.test.ts` is a
  paused test (`docs/decisions/2026-10-14-test-pause.md`), and a round does not fix it.
  `studio-rig.test.ts` stays in `pnpm test`. A new body in a section also changes the layout, so
  a kept test of a shot plan can change: the fox moved the check of the choir shots of the Ode to
  Joy into the paused file `src/shots/choir-theme.test.ts`. A test that takes a species as the
  sample of a parametric body moves to a species that keeps it, as the tan fox.
- **The shot plans.** A change of the footprints of a body changes the layout of the sections,
  and the layout changes the shot plans of the camera. Run `pnpm test src/shots/` early in a
  round that changes a body, before the fit of the holds. A shot test of the size round failed on
  the new layout, and its agent read the planner for 12 minutes to find the cause.
