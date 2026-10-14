# The retrospective of the rabbit mesh task (2026-10-14)

On 2026-10-13 the user gave a textured mesh with no skeleton and said: "replace the rabbit by
using the model at @~/Downloads/rabbit-4.glb. Note that you need to rig it yourself." The task
took five agent rounds ([`2026-10-13-rabbit-mesh.md`](2026-10-13-rabbit-mesh.md)). After the
merge, the agents of the rig round and of the app round named what would make the next task of
this shape faster. A user rule of 2026-10-12 says that the manager decides and applies the items
that are worth their cost. This report gives the times of the task, each item with its decision,
and the measures of the new tools. The decisions of the round are in
[`2026-10-14-mesh-rig-retro.md`](../decisions/2026-10-14-mesh-rig-retro.md). The logs are in
[`2026-10-14-rabbit-mesh-retro/`](2026-10-14-rabbit-mesh-retro/).

## 1. The times of the task

The manager of the session gave these times in the brief of the retro round.

| Step | Time |
|---|---|
| Manager: inspect, face color test, question, brief | about 25 min (22:40 to 23:05) |
| Rig round (14 commits) | 37 min |
| App round (12 commits) | 72 min |
| Review of the tip `a3ef0b2a` (parallel with the folds round) | 12 min |
| Folds round (9 commits) | 48 min |
| Fix round: rebase onto the new demos, review findings (13 commits) | 40 min |
| `pnpm frame --gpu-only` on the tip | 152 s |
| First merge: stopped at 3 end-to-end tests that `eeeb7557` broke on main | about 15 min |
| End-to-end fix (1 commit) | 4 min |
| Second merge | 233 s |

The folds took the most time. The app round stopped at 45.0% of the play samples with a fold,
because its brief kept the faces of the source. The folds round then added a ring at the left
elbow and edge flips, and it came to 5.0%. The rig round found the seat of 0 m only after its docs
commits, and the module of 54 KB after gzip and the folds were found only in later rounds.

```text
 manager    rig       app          folds       fix         merge
 +------+   +-----+   +---------+  +-------+   +-------+   +----------+
 | 25 m |-->| 37 m|-->|  72 m   |->| 48 m  |-->| 40 m  |-->| 15 m +   |
 +------+   +-----+   | (stop:  |  | (5.0% |   +-------+   | 4 m +    |
                      |  45%    |  | folds)|               | 233 s    |
                      |  folds) |  +-------+               +----------+
                      +---------+  review 12 m in parallel
```

## 2. The items and their decisions

The brief of the manager chose items 1 to 5 of the retro round and four skipped items. For each
other item, this report gives the round of the task that did it, or the reason to skip it. The
saves and the costs are the estimates of the agent that named the item.

### Items of the rig agent

| Item | Saves | Cost | Decision |
|---|---|---|---|
| The palette in Oklab and the face walk as the default of `rig_mesh.py`, with the gzip size in the log | 1 to 2 h | about 1 h | Done in the app round (`colors.palette` and the walk order). The gzip size of the module and of the packed mesh is now a line of `pnpm rig-mesh --check`, and a test limits it (items 2 and 4) |
| A smaller eye shell, and a stop above the triangle budget | 30 min to 1 h | about 1 h | The eye fans came in the app round (`eyeShell.points`). `pnpm rig-mesh --check` stops above the budget of 3,100 triangles (item 2) |
| A mesh pass before the weights: rings near the joints and edge flips | 1 to 2 h | about 2 h | The rings and the flips came in the folds round (`refine.rings`, `refine.flip`). `--check` lists the thin faces near the joints as candidates for a ring, and the brief template permits rings and flips from the start (items 2 and 5) |
| The arm by its connectivity at its root ring, or bone heat with the arms out | 30 min to 1 h | 1 to 2 h | Skipped. The folds round gave the side of the trunk below the armpit to the trunk, and each play sample folded. A new weight method costs 1 to 2 h with no measured gain |
| `--glb <file>` for `pnpm studio-body`, `pnpm hold-reach`, and `pnpm fold-probe` | 10 to 15 min for each round, and the risk of lost work | about 1 h | Applied (item 1) |
| `pnpm rig-mesh --check` | 15 to 20 min | about 1 h | Applied (item 2) |
| A tool that proposes the joints from the loops of the cuts | 10 to 20 min | 2 to 3 h | Skipped: the cost is above the saving for one task of this shape |
| The brief gives the reach target, and the factor comes from the measured shoulder joint | 5 to 10 min | 10 min | Applied (item 5) |
| All app checks before the first docs commit | 10 to 15 min | none | Applied (item 5) |
| Each fix of the script before the asset, or the GLB file only in the last commit of a series | about 10 min | none | Applied (item 5) |
| A safe first run: no imported objects, and no path name that a loop reuses | 5 to 10 min | done | Done in the rig round |
| A stop for each part of the body below the floor or in the seat | 10 to 15 min | about 20 min | Skipped. The stop on a foot over the chair came in the rig round, and `--check` now prints the seat height and the standing error before the docs commits |

### Items of the app agent

| Item | Saves | Cost | Decision |
|---|---|---|---|
| Rings at the joints within the budget of 3,100 triangles | the folds round, and 25 min of variants | 1 to 2 h | Done in the folds round (`refine.rings`). The brief template permits them from the start (item 5) |
| A fold check in `pnpm rig-mesh` | about 20 min of each fold round | 1 to 2 h | Applied with the real probe: `--check` runs `pnpm fold-probe <role>` on the body of the rig over each demo (item 2) |
| `pnpm hold-score <role> --set ...` | about 15 min for each hold refit | about 2 h | Skipped: the cost is above the saving for one task of this shape |
| An order of the goals that can conflict | 10 to 15 min | about 10 min | Applied (item 5) |
| `--set` for `pnpm hold-reach` | about 5 min | about 15 min | Applied (item 3) |
| The probe of the module parts as a tool, a size budget test, and the palette as the default | about 8 min | about 30 min | The budget test is applied (item 4). The palette came in the app round. The probe of the parts stays in [`2026-10-13-rabbit-mesh/module-parts.ts`](2026-10-13-rabbit-mesh/module-parts.ts), because a body needs it only above the budget |
| Commit each rig rule when it passes, and the GLB file only in the last rig commit | about 8 min, and 1.7 MB of history | one line | Applied (item 5) |
| The sweep accepts small open loops, or the rig closes each eye fan | about 5 min | about 30 min | Skipped: the cost is above the saving for one task of this shape (with the next item, 1.5 h for 10 min) |
| The depth to the nearest body triangle beside the depth to the cap | about 5 min | about 1 h | Skipped, as the item above |
| `pnpm role-report <role>` for the probes of a role report | about 10 min | 1 to 2 h | Skipped: the cost is above the saving. `--check` now gives H, the triangles, the violin rule, and the folds |
| A worst-case stroke set in the violinist sweep | about 1 h | about 1 h | Skipped: the sweep already runs each demo |
| Name the look tests that can change before the round | about 5 min | one line | Applied (item 5) |
| A failed rig fails the tool, and a check that each eye shell lies over the surface | about 5 min | about 20 min | Done in the app round: Blender runs with `--python-exit-code 1`, and the log gives the gap of each eye fan over the eye |

## 3. What the round changed

```text
 tools/mesh-rigs/<animal>.json
        | pnpm rig-mesh <animal> --check
        v
 temporary folder: <animal>.rig.glb + source-long-arms.obj
        |                                        |
        v                                        v
 tools/rig-mesh-check.ts                  tools/glb-swap.ts: a copy of src/ with the
 triangles, module gzip, seat,            module of the rig, and a child process
 chair, H, reach, standing error,           |-- pnpm hold-reach <species> (violinist)
 thin faces near the joints                 +-- pnpm fold-probe <role>
```

- **Item 1.** `pnpm studio-body <animal> --inspect --glb <file>`, `pnpm hold-reach <species>
  --glb <file>`, and `pnpm fold-probe <role> --glb <file>`. The two probes run in a child process
  on a copy of `src/`, as `pnpm body-probe --base` does, so the pure core keeps no state.
- **Item 2.** `pnpm rig-mesh <animal> --check` writes no file into the repository.
- **Item 3.** `pnpm hold-reach <species> --set <changes>`, with the syntax of `pnpm pose-depth`.
- **Item 4.** `src/models/studio-size.test.ts` limits the gzip size of the packed mesh of each
  studio body to 32,000 B (`tools/studio-budgets.ts`).
- **Item 5.** Section 7 of [`docs/briefs/studio-body.md`](../briefs/studio-body.md).

## 4. Measures of the new tools

Each time is one run on the development Mac (`times.txt`).

| Measure | Value | Log |
|---|---|---|
| `pnpm rig-mesh rabbit --check` | 38.3 s, and 39.3 s in the fix round | `times.txt`, `rig-mesh-check.txt` (the run of the fix round) |
| The part of the folds in it (`pnpm fold-probe violinist`, 14 demos) | 35.9 s | `times.txt` |
| `pnpm fold-probe violinist --glb <the rig of main>` | 36.2 s, the same lines as with no `--glb` | `times.txt`, `fold-probe-same.txt` |
| `pnpm hold-reach rabbit` / with `--glb` | 0.30 s / 0.62 s | `times.txt` |
| `pnpm studio-body rabbit --inspect --glb <file>` | 0.15 s | `times.txt` |
| The Blender rig of the rabbit, with no preview | 1.5 s | `times.txt`, the run of the fix round |
| Packed mesh after gzip: bear, polar bear, rabbit | 17,299 B, 16,597 B, 23,682 B (budget 32,000 B) | `mesh-gzip.txt` (`node docs/research/2026-10-14-rabbit-mesh-retro/mesh-gzip.ts`) |
| `pnpm body-probe --base main` | 95 of 95 bodies, 23 of 23 players, 1,492 of 1,492 pose sets equal | `body-probe.txt` |
| The GLB file of `pnpm rig-mesh rabbit` | the same bytes (sha256 `5f590568…`) | `rig-mesh-check.txt` and the run of the tool |

The check on the rig of main gives the facts that the rounds of the task found one by one:
3,100 triangles of the budget of 3,100, a packed mesh of 23,682 B after gzip, a seat of 0.103 m,
a chair of 0.195 m, H of 0.269 m, arms of 0.377 m, a standing error of 0.234 mm, a violin of
0.536 by the rule, and play folds in 3.9% of the samples. It lists 17 thin faces near the joints
of the limbs, 15 of them at the elbows.

The gains against the task of 2026-10-13, from the evidence of the agents:

| Work | Before | After |
|---|---|---|
| A probe of a rig before the swap | a temporary edit of `ANIMALS`, an export into `src/`, the probe, and a restore: five cycles in the rig round, and one checkout removed edits | one option, 0.3 s more than the probe |
| The facts of a rig: export, seat, module size, standing error, violin rule, folds | four probes and a temporary swap, and the seat of 0 m was found after the docs commits | one command, 38 s |
| A variant of a hold for the violin rule | a probe script (`reach-set.ts`) | `--set`, 0.3 s for each variant |
| A body module that is too large for the first download | found in the next round (54 KB after gzip) | a red unit test |
