# Briefs for a studio body in the app

A manager uses these templates to put an animal of `lowpoly-studio/` or a mesh of the user into the
app for a role, by route 3 of `docs/agents/model-work.md`. A round has one implementation agent and
no review agent (design 9.8). Copy each template to the scratch folder of the session, and replace
each `<...>`. While all tests are paused
([`2026-10-16-all-tests-pause.md`](../decisions/2026-10-16-all-tests-pause.md)), a brief has no
step that adds, breaks, or runs a test.

```text
 manager            agent                    manager
 +-----------+      +----------------+       +--------------+   +-------+
 | baseline, | ---> | implementation | ----> | report,      | > | retro |
 | inspect,  |      | sweep, probes  |       | images,      |   |       |
 | brief     |      +----------------+       | merge (hits) |   +-------+
 +-----------+                               +--------------+
```

## 1. Before the brief

Run these commands on `main`, and put the output and the numbers into the brief, so that no agent
makes a baseline worktree.

| Fact | Command |
|---|---|
| The facts of the GLB file and of the last studio body | `pnpm studio-body <animal> --inspect` |
| The depths, the note errors, and the gaps of a role that exists | `pnpm pose-depth <role> --gaps` |
| The bow of a bowed species that stands as a soloist | `pnpm pose-depth <role> --soloist <species>` |
| The arm gate: the folds, the twist, the flat share, the paw turn, and the stretch | `pnpm arm-check <role>`, with `--glb <file>` for a new GLB file |
| The reach of the arms against the instrument | `pnpm hold-reach <species> --instrument <id>`, with `--glb <file>` for a new GLB file |
| The size of the first download | `pnpm build && pnpm size` |
| The posture of a real player at rest, when ready, and in a play | a source on the web, and the clips of the studio (`python3 studio view <animal>`) |

When the rule of a violin shop gives a violin outside the real sizes, or a viola scale below 1, ask
the user before the round, with the measures and the choices (longer arms or a smaller
instrument).

Finish the look rounds of the studio before the app round, or put them on the app branch. Start a
hold round only after each form or scale round of the same body has merged, because a form change
moves the joints and the head. The brief names each such round as a dependency.

An agent beside another agent gets a worktree:
`git worktree add .claude/worktrees/<branch> -b <branch> main`. Two mesh rounds side by side edit
the same shared lists of the docs and the tools. The rebase of the deer round over the rhino round
cost about 25 minutes. So the second round makes its docs commits only after the first round
merges, and rebases first.

## 2. Implementation brief

```markdown
# Brief: the studio <animal> as the <role> of the app

Date <date>. Manager <session>. Start commit `<hash>` of `main`. <On `main` in the main checkout,
or worktree `<path>` on branch `<branch>`>. Handoff file `scratch/handoff-<round>.md`.
Time box <minutes>. Read `<scratch>/rules-common.md` first.

## Goal

The user said: "<quote>". The <species> of the <section> gets the studio body of `<glb file>` by
route 3 of `docs/agents/model-work.md`. The app keeps its own motion, instrument, and seat.

Done when:
1. `pnpm studio-body <animal>` writes `src/models/studio/<animal>.ts`, and the species has the body.
2. <the pose claims: the seat, the feet on the floor, the hold on the instrument>.
3. The role is in `SWEEP_ROLES`, `FOLD_ROLES`, and `ROLE_VIEWS`, and in the table "Bodies and
   roles" of `docs/agents/model-work.md`. Each accepted limit is an `AcceptedDepth` with a decision
   row. `pnpm pose-depth <role>` shows each other part within the contact depth.
4. `pnpm close-views <role> <dir> --base main` ran on the last pose, and you compared each view
   with the grid of `main`. `pnpm snapshot` ran after the last code commit.
5. `pnpm arm-check <role> --base <start> --views <dir>` gives no `FAIL`. A new role has its entry
   in `ACCEPTED_GRIPS` of `tools/arm-check.ts`, from the play median of its accepted grip.
6. `tools/check-commits.sh --tip <base>` passed one time before the report.
7. The docs of the section "Docs" are true.

## Dependencies

<each form or scale round of the same body that has not merged, or "none">

## Facts and baseline

<the output of section 1, and each difference from the last studio body, such as a seated bind
or a held instrument, with the code that it touches>

## Scale, seat, and poses

- Landmark: the shoulder joints of a standing role, the top of the keys of a pianist, or <the
  landmark of the instrument>. Record the choice and its measure as a decision row.
- A seat fits the legs of the body. Do not stretch the legs (user rule of 2026-10-10). Look at the
  knees from the side.
- The poses follow a real player of the instrument: <the posture, with its source>. A clip of the
  studio fits the body, but its look can be wrong.

## Range and stop

<For each fallback rule, the range of its result, such as a violin of 0.33 m to 0.59 m. Outside
it, stop, and report the measures.>

- When a measure chooses a value, such as a crease angle, check first that the reference lies
  inside the range of the variants. Else stop, and send the table to the manager.
- A round that changes a grip on purpose expects a `FAIL` of the grip turn. Give the new play
  median for `ACCEPTED_GRIPS` with the 2x paw crops, and do not try to clear the `FAIL`.

## Process

- Commit the mechanism first, with values that change nothing. Then tune, and commit the tuned
  values.
- Tune a hold with `--set` of `pnpm hold-fit`, `pnpm pose-depth`, and `pnpm arm-check`, with no
  edit of the source for each variant. Check a new limit over all demos.
- In phase 1 of a hold round (a mock), measure the direction of no paw twist of the grip
  (`paw-turn.ts` of `docs/research/2026-10-19-elephant-pose/`), and check the 2x paw crops of
  `pnpm arm-check --views` at a strike and at rest, beside the whole composition.

## Docs

- `docs/design/`: <sections>. Check the diff for copied values:
  `git diff -U0 <base> -- docs/design | grep -nE '^\+.*([0-9]+°|[A-G][♭♯]?[0-9])'`.
- A new decision file `docs/decisions/<date>-<topic>.md` and a new research report, in the limits
  and the templates of `docs/agents/writing.md`. The first row is the decision of the user, with
  the quote.
- Each place of section 8 of `docs/briefs/studio-body.md`. At the end, `pnpm docs-species <species>`
  lists no miss.

## Values to keep

- `pnpm body-probe --base main`: each other body, player, and pose set stays equal.
- `pnpm size --base main`: the first download stays below 1 MB.
- `pnpm arm-check --all --base main` gives no `FAIL`, and `pnpm pose-depth` of the other roles
  stays as in the baseline.

## Files

<the files of the round, and the files of other agents>

## Report format

Reply with these parts, in this order, and nothing else: Result; Numbers (| Measure | main |
round |, and the table of `pnpm arm-check`); Decisions; Commits; Images to review (with the crop
pairs of the gate); Open problems and the next step.
```

After the test pause, a brief also asks for the sweep shards, the removal of old checks that the
body fails, and break commands (`workflow.md`, "Tests").

## 3. Review brief (not used)

See [`2026-10-16-no-review.md`](../decisions/2026-10-16-no-review.md).

## 4. Fix brief (not used)

## 5. Common rules of the agents

Copy this list into `<scratch>/rules-common.md`, and add the report format of the round.

- Work where the brief says. Read `AGENTS.md` first. On `main`, write the start commit in place of
  each `--base main`, because `main` moves with your commits.
- Make very fine-grained Conventional Commits, and stage each path by its name.
- `grep` is a shell function that runs ugrep, so use `perl -0pi -e` for a temporary edit. No
  `timeout`, and no foreground `sleep`. Read the exit code of the command itself.
- Make a lasting edit of code with the Edit tool, not with `perl`.
- Never take ports 5173, 5190, or 4182. Stop each process that you start, by its PID. Never stop a
  process that you did not start, and never use `pkill -f`.
- Do not edit the working tree while a tool builds the site.
- No merge and no push. End with no rebase in progress and a clean tree.
- Ask no questions when the user is not available. Record each open choice as a decision row.
- Write all prose in ASD-STE100 Simplified Technical English. Keep the handoff file current.

## 6. After the merge

After the merge of a branch, ask each agent of the round, with `SendMessage`, what would make the
next similar task faster. Decide, and apply the items that are worth the cost (user rule of
2026-10-12). Record the times, the decisions, and the measured gains in a research report.

## 7. A mesh with no skeleton

Add these items to the briefs of the rig round and of the app round of a mesh of the user ("A
mesh with no skeleton into route 3" of `docs/agents/model-work.md`).

- **The options.** Choose the landmark of the scale first. Then make the mid-report and the
  question to the user with `pnpm mesh-options` (step 2 of the route in `model-work.md`).
- **The size.** The brief gives the pixel heights of the species and of an anchor that stands or
  sits as it does in the reference images. Run `pnpm mesh-options` at the ends and the middle of
  the reference range. When no reference image shows the species, the
  mesh takes the head top of the parametric body (user, 2026-10-19, `2026-10-19-mouse-size.md`).
- **The elbows.** In the first hold fit, compare 3 or 4 elbow directions with `pnpm arm-check
  --set`, because an upper arm can twist into a flat band within the depths and the folds.
- **The faces.** Permit rings at the joints (`refine.rings`) and edge flips of faces that lie
  almost on one plane (`refine.flip`) from the start.
- **The order of the goals.** When two goals conflict, keep this order:
  1. the clearance of the sweeps (`pnpm pose-depth <role>`);
  2. the arm gate with no `FAIL` (`pnpm arm-check <role> --base main`);
  3. the range of the instrument (`pnpm hold-reach <species>`);
  4. the look of the hold.
- **The checks before the docs.** Run `pnpm rig-mesh <animal> --check`, each check of the app,
  `pnpm arm-look <role>`, and the close views before the first docs commit.
- **The depth of each variant.** Run `pnpm pose-depth <role> --glb <kept file> --every 4` on the
  first variant of a mesh edit, not only at the end. A patch of the rabbit elbow went 5.9 cm
  into the trunk, and the round found it with no time left (retro, 2026-10-22).
- **A moved instrument.** Read the hold anchors of `pnpm rig-mesh --check` against `main`, because
  a moved instrument can break a user rule.
- **The demos of a fit.** Fit each step on the default demos of `pnpm hold-fit`: `FIT_DEMOS`, or
  the one demo with the most notes of a role that they do not have. Check the last fit on all demos
  (`--demo all`).
- **The size of a body.** A change of the size keeps the values of the pose in meters ("Values in
  meters" of `docs/agents/model-traps.md`). Compare the folds and the depths in H first with
  `--base main`, and the heights with `pnpm close-views lineup <species,...> <dir> --base main`.
- **The seat and the tail.** Give the seat height, the lowest point of the tail, and the tail gaps
  to the chair of `pnpm rig-mesh <animal> --check` before a plan of a tail. Give `sit.top` the
  final seat top of `pnpm rig-mesh --check`, not the seat top of the first rig. Else the flat
  underside of the haunch stays about 1 cm above the seat, and a pale rim shows under it.
- **The images.** Make the images of the round with one batch. A brief names a grid by its folder,
  such as `<dir>/species-rest/species-base-views.webp`. Each lineup and crop set of a mesh shows
  the front, the back, and each side, at a note and at rest (user, 2026-10-21).

  ```bash
  pnpm close-views batch <dir> --species <species,...> --role <role> --lineup \
    --camera default --camera violins --base main
  ```

- **The end of the round.** Give the line of `pnpm size --base main` in the commit that adds the
  body.
- **The GLB file.** A plain `--preview` of `pnpm rig-mesh` writes the GLB file. Only the last rig
  commit writes it, because each version stays in the history.
- **The early checks.** A new body moves the layout, the shots, and other poses. After the commit
  of the body, run `pnpm test:paused src/shots/` and `pnpm body-probe --base <base>`, and name each
  failure in the handoff.

## 8. Docs of a new body, role, or hold

Use these lists in the section "Docs" of a brief. A new species with a studio body also adds its
role and its hold, so its round reads all three lists. This command prints each place that does
not name the species yet:

```bash
pnpm docs-species <species>
```

`tools/docs-species.ts` reads these tables. Its TSDoc gives the rules of the cells "File",
"Heading", and "Not for", and `DOC_NAMES` gives the names of each species.

A new species with a studio body:

| File | Heading | The place lists | Not for |
|---|---|---|---|
| `docs/design/01-goals.md` | "1. Goals and budgets" | each reference sheet, and the image that wins over it | |
| `docs/design/04-stage-cast-look.md` | "4.3 Species", first paragraph | the species with a body of their own | |
| `docs/design/04-stage-cast-look.md` | "4.3 Species", the type `OwnBodyParams` | the union of the bodies (`body`) | |
| `docs/design/04-stage-cast-look.md` | "4.3 Species", "Short legs.", the item of `models/species.ts` | the mesh species and their seat heights | |
| `docs/design/04-stage-cast-look.md` | "4.3 Species", "The shape parameters of each species", first paragraph | the species with no row of shape parameters | |
| `docs/design/04-stage-cast-look.md` | "4.4 Models", first paragraphs | the bodies of their own and the decisions of the user | |
| `docs/design/04-stage-cast-look.md` | "4.4 Models", "Studio bodies" | each studio body with its decision file, landmark, seat, crease angle, and rig rules | |
| `docs/design/04-stage-cast-look.md` | "4.5 Visual values", "Species colors" | the accent of each species | |
| `docs/design/04-stage-cast-look.md` | "4.5 Visual values", "Facets and triangle budgets" | the studio bodies and the triangles of the pea eyes | |
| `docs/design/04-stage-cast-look.md` | "4.6 Model inventory", "The instruments follow the reference image", first paragraph | the instrument scale and the reach of each species | |
| `docs/design/04-stage-cast-look.md` | "4.7 Rig" | the optional bones of a rig, such as `tail_tip` | |
| `docs/design/07-architecture.md` | "7.1 Modules", the text of `VIEW_SHEETS` | the sheet pages of `views.html` | `cat`, `panda`, `hippo`, `mouse`, `elephant`, `beaver`, `pig`, `wolf`, `badger`, `monkey`, `rhino`, `deer`, `penguin` |
| `docs/agents/model-work.md` | "Bodies and roles" | each body with its source, decision file, and role | |
| `docs/agents/model-traps.md` | the whole file | each trap that cost the round a step | |
| `assets/models/<s>/README.md` | the whole file | the source, license, and checksum of a mesh of the user | |
| `lowpoly-studio/docs/handoff.md` and `lowpoly-studio/README.md` | the whole files | only a body that the studio builds | `rabbit`, `fox-red`, `fox-tan`, `cat`, `dog`, `panda`, `hippo`, `mouse`, `elephant`, `beaver`, `pig`, `wolf`, `badger`, `monkey`, `rhino`, `deer`, `penguin` |

A new role:

| File | Heading | The place lists | Not for |
|---|---|---|---|
| `docs/design/05-animation.md` | "Pose index" | one row for each role | |
| `docs/design/07-architecture.md` | "7.1 Modules", the text of `pnpm close-views` | the views and the moments of each role (`ROLE_VIEWS`) | |
| `docs/design/09-process.md` | "9.3 Tests" | the sweep of each role (`SWEEP_ROLES`), or the reason for no sweep | |
| `docs/agents/model-work.md` | "Bodies and roles" | the role of the species for the tools | |

A new hold:

| File | Heading | The place lists | Not for |
|---|---|---|---|
| `docs/design/05-animation.md` | "Pose index" | the support, source, play, rest, code, and docs of the role | |
| `docs/design/05-animation.md` | "5.2 Rest pose" | the rest of the instrument and of the bow | |
| `docs/design/05-animation.md` | "5.3 Instrument motion", "Bowed strings in detail" | the hold, the rest bow, and the standing bow of each species with a bow | `fox-tan`, `panda`, `mouse`, `elephant`, `beaver`, `pig`, `wolf`, `badger`, `monkey`, `rhino`, `deer`, `penguin`, `bear` |
| `docs/design/05-animation.md` | "5.3 Instrument motion", "Woodwinds and brass in detail" | the hold of each species with a wind instrument | `rabbit`, `fox-red`, `cat`, `dog`, `hippo`, `elephant`, `badger`, `deer`, `penguin`, `bear` |
| `docs/design/04-stage-cast-look.md` | "4.6 Model inventory", "The instruments follow the reference image", first paragraph | the reach of the nut, or of the grip of a wind instrument | |
| `docs/decisions/<date>-<topic>.md` | the whole file | the decision file of the hold | |
| `docs/design.md` | "10. Decisions to confirm" | the line of the decision file | |

The code has its own lists: `ANIMALS` of `tools/studio-body.ts`, `STUDIO_BODIES` of
`src/models/studio-body.ts`, `SPECIES` of `src/models/species.ts`, `SWEEP_ROLES` of
`src/pose/test-sweep-roles.ts`, `ROLE_VIEWS` of `tools/close-views.ts`, `FOLD_ROLES` of
`tools/fold-probe.ts`, `SPECIES_HOLDS` of `src/pose/bowed-rig.ts`, and `SPECIES_WIND_HOLDS` of
`src/pose/winds.ts` with `LEG_RESTS` of `tools/hold-fit.ts` for a wind hold, and
`PERCUSSION_HOLDS` of `src/pose/percussion-rig.ts` for a percussion hold.
