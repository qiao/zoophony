# The probe tools of the retro of the form and neck rounds (2026-10-14)

The form round and the neck round of 2026-10-14 lost about 2 hours in hand probes
([`2026-10-14-fox-rabbit-form.md`](2026-10-14-fox-rabbit-form.md)). The manager chose five items
against these losses. This report gives the tools, their times, and the break commands of their
new functions. The probes and the logs are in [`2026-10-14-probe-retro/`](2026-10-14-probe-retro/).

| Lost | Cause | Item |
|---|---|---|
| 35 min | Three patched copies of `src/shots/prepare.ts` to find why a two-shot and a solo shot dropped out | `traceShots()` and `pnpm shot-trace` |
| 30 min | About ten runs of `pnpm hold-fit` with hand-picked variants, and no view of the faces that fold | `pnpm hold-fit --grid` and `--faces` |
| 35 min | No way to tell if faces 389 and 390 also folded on `main` | `pnpm fold-probe --base` and the bone of a fold |
| 10 min | The arm factor of each violin size solved by hand from two runs | `pnpm hold-reach --size` |
| 25 min | A red commit: the shot test reacts to body moves of 2 cm | The trap of the shot test in route 3 of `AGENTS.md` |

## The trace of the shot planner

`traceShots()` of `src/shots/prepare.ts` runs the planner of `prepareShots()` with a trace. The
planner writes the choice at each cut of the range into the trace. The tool formats it.

```text
 score, layout, seed, range
          |
          v
 planShots(..., trace) ---- trace = null ----> prepareShots(): ShotPlan
          |
          | trace = TraceSink (range, cuts, kept refusals, the cut and the try of now)
          v
 each cut: candidatesAt() -> dropped (rule)    search order -> CandidateTrace
          each try of a band -> searchClose() -> SearchTrace -> CameraTrace (refusal)
          |
          v
 traceShots(): { plan, cuts }  -->  tools/shot-trace.ts: shot rows, cut lines
```

```typescript
export interface CameraTrace {
  /** The azimuth of the camera at the start of the move, in radians. */
  readonly azimuth: number;
  readonly elevation: number;
  readonly arc: number;
  /** 'jump' | 'repeat' | 'head' | 'beamEdge' | 'distance' | 'beamSide' | 'camera' | 'sight' | 'line' | 'object', or null for the camera of the shot. */
  readonly refusal: CameraRefusal | null;
  /** True when the refusal is the result of the same test at an earlier cut. */
  readonly kept: boolean;
  /** For a refusal by the distance: the largest share of the default distance. Else null. */
  readonly share: number | null;
}
```

The camera tests give their first refusal in place of a boolean, in the same order. The plans of
the 14 demos and the 4 chamber test files are the same on `main` and on the branch, byte for byte
(`plans.ts`, `plans-compare.txt`). `pnpm body-probe --base main` gives 95 of 95 bodies, 23 of 23
players, and 1492 of 1492 pose sets equal (`body-probe-base-main.txt`).

The trace of the duo gives the margin that the form round measured with patched copies: three
cameras of the two-shot fail the distance, the nearest with the share 0.4401 against the limit
0.44 (`shot-trace-duo.txt`). The trace of K. 315 gives the cause of the side shot at 78.3 s: each
tested camera of the brass section in each band has a head in the foreground
(`shot-trace-k315.txt`).

## The other tools

- `pnpm hold-fit <role> --grid <path>=<a>:<b>:<step>` adds the variants of a range, and several
  grids give the product, up to 40 variants. The table sorts the variants by the play folds, then
  by the deepest point. `--faces <n>` prints the face table of `pnpm fold-probe --faces` for the
  base and the best variant (`hold-fit-pianist-grid.txt`).
- `pnpm fold-probe <role> --faces <n>` gives the worst fold of each face and the bone of the fold:
  the bone whose turn from its parent changes the normal most. Each corner takes the skin matrix
  of the parent of the bone, and the normal turns. `--base <ref>` gives the shares of both trees
  side by side, with the marks `new` and `gone`. Faces 389 and 390 of the red fox fold in the same
  share of the lift on `main` and on the branch, and the turn of `upper_arm_R` folds them
  (`fold-probe-fox-base-main.txt`).
- `pnpm hold-reach <species> --size <list>` gives the reach and the arm factor of each violin size.
  For the rabbit, the scale 0.85 needs the arm factor 1.623 of its rig and the scale 1.0 needs
  1.884, where the form round estimated about 1.63 and 1.88 by hand (`hold-reach-rabbit-size.txt`).
  The player rebuilt at each scale agrees within 1 mm.

## The times

Each time is the `real` time of one run on the development Mac, with the command in the first line
of its log.

| Command | Time | Log |
|---|---:|---|
| `pnpm shot-trace violin-piano --from 33 --to 34` | 0.5 s | `shot-trace-duo.txt` |
| `pnpm shot-trace mozart-k315 --from 75 --to 95` | 0.6 s | `shot-trace-k315.txt` |
| `pnpm shot-trace mozart-k315 --from 78 --to 79 --cameras` | 0.6 s | `shot-trace-k315-cameras.txt` |
| `pnpm shot-trace violin-piano --base main --from 30 --to 40` | 0.8 s | `shot-trace-duo-base-main.txt` |
| `pnpm hold-fit pianist --demo boulanger-matin --step 4 --grid 'piano.lean=14deg:18deg:4deg' --faces 2` (3 rows) | 32.1 s | `hold-fit-pianist-grid.txt` |
| `pnpm fold-probe fox-violinist --demo beethoven-8 --step 1 --faces 4 --base main` | 1.5 s | `fold-probe-fox-base-main.txt` |
| `pnpm fold-probe pianist --faces 4` | 13.0 s | `fold-probe-pianist-faces.txt` |
| `pnpm fold-probe pianist` on `main` and on the branch | 10.8 s and 11.4 s | `fold-probe-time.txt` |
| `pnpm hold-reach rabbit --size 0.85,1` | 0.6 s | `hold-reach-rabbit-size.txt` |
| `pnpm hold-reach fox-red --size 0.85,1` | 0.5 s | `hold-reach-fox-size.txt` |
| `pnpm hold-reach rabbit --size 0.85,1 --glb assets/models/rabbit/rabbit-4.rig.glb` | 0.9 s | `hold-reach-rabbit-size-glb.txt` |

The worst fold of each face costs the fold probe about 5%: the angle of each folded face, and the
bone of a fold only at a new worst sample of the face.

## The break commands

Each command runs from the root of the worktree as
`tools/break-test.sh '<perl expr>' <file> <test file>`. Each log in `breaks/` gives the diff of the
break and the tests that fail. Each break makes at least one test fail.

`traceShots()`, `src/shots/prepare.ts` with `src/shots/trace.test.ts`:

| Rule | Perl expression | Failing test |
|---|---|---|
| The plan is the plan of `prepareShots()` | `s/planner\.fullSearch = entering;/planner.fullSearch = entering \|\| trace !== null;/` | gives the plan of prepareShots() |
| Each cut of the range, with both ends | `s/cut >= trace\.range\.fromSec - 1e-9/cut > trace.range.fromSec + 1e-9/` | traces each cut of the range with both ends, in the order of the cuts |
| A cut of a hold is a cut too | `s/traced\.outcome = 'hold';/traced.outcome = 'candidate';/` | traces a cut at which the previous shot holds on |
| Each dropped candidate with its rule | `s/drop\(candidate, 'subject'\);//` | names the rule that drops each candidate |
| The candidates in the order of the search | `s/traced\?\.candidates\.push\(\.\.\.traces\)/traced?.candidates.push(...traces.toReversed())/` | ends the search of a cut with the candidate of the shot |
| Each try with its result | `s/attempt\.found = framing !== null;/attempt.found = true;/` | ends the search of a cut with the candidate of the shot |
| The conductor that fills the time | `s/(traced\.outcome = framing \? )\x27conductor\x27/$1\x27wide\x27/` | traces the conductor that fills the time when no candidate fits |
| Each tested camera with its refusal | `s/'repeat'\);/'jump');/` | accepts the camera of the shot, and refuses a jump cut only near the previous view |
| The camera of the shot | `s/search\?\.cameras\.push\(\{ azimuth, elevation, arc, refusal: null/search?.cameras.push({ azimuth: azimuth + arc, elevation, arc, refusal: null/` | accepts the camera of the shot, and refuses a jump cut only near the previous view |
| The largest share above the limit | `s/largest = Math\.max\(largest, share\)/largest = Math.min(largest, share)/` | gives the share of the distance of each camera that the distance refuses |
| A kept refusal, so the trace does not depend on the range | `s/if \(kept && refusal\) \{/if (kept \&\& refusal \&\& search) {/` | gives a cut the same trace in a range that starts at the cut |

`tools/shot-trace.ts` with `tools/shot-trace.test.ts`:

| Rule | Perl expression | Failing test |
|---|---|---|
| The demo with no `.mid` | `s/first\.replace\(\/\\\.mid\$\/, ''\)/first/` | reads the demo with no .mid, the range, and the switch of the cameras |
| An empty range stops the tool | `s/if \(fromSec > toSec\) \{/if (fromSec > toSec + 1e9) {/` | stops on a missing demo, an empty range, a time that is not a number, or both outputs |
| The shots of the range, with both ends | `s/shot\.startSec >= fromSec - 1e-9/shot.startSec > fromSec + 1e-9/` | writes each shot that starts in the range, with both ends |
| The nearest share of the distance | `s/\(a\.share \?\? 0\) - \(b\.share \?\? 0\)/(b.share ?? 0) - (a.share ?? 0)/` | counts the refusals and gives the nearest share of the distance and the camera |
| The rule of each dropped candidate | ``s/subject: `rule 1, the subject of the previous shot`/subject: 'rule 1'/`` | writes the end of the cut, the rule of each dropped candidate, and each try |

`tools/fold-probe.ts` with `tools/fold-probe.test.ts`:

| Rule | Perl expression | Failing test |
|---|---|---|
| The angle of a fold | `s/return Math\.acos\(Math\.min\(1, Math\.max\(-1, cos\)\)\) \* \(180 \/ Math\.PI\);/return 90;/` | gives 0° in the bind pose and 180° for a face whose corner crosses the opposite edge |
| The matrix of the parent | `s/normalWith\(\[bone, STUDIO_BONES\.indexOf\(parent\)\]\)/normalWith([bone, bone])/` | names the bone whose turn from its parent folds the face |
| The worst fold over all sets | `s/if \(fold && fold\.angle > \(worst\?\.angle \?\? 0\)\) \{/if (fold) {/` | gives the fold with the largest angle over all sets |
| The worst fold of each folded face | `s/count\.faceWorst\.set\(face, \{ label, angle, \.\.\.turnBone\(rig\.mesh, studio, face\) \}\);//` | counts each sample set of the demos with the role, and skips the other demos |
| The same index with the same corners | `s/if \(topology === other\.topology\) \{/if (topology === other.topology + "x") {/` | takes the same index when the corners are the same, else the nearest middle within 1 cm |
| The nearest middle within 1 cm | `s/if \(distance <= nearest\) \{/if (distance <= nearest * 100) {/` | takes the same index when the corners are the same, else the nearest middle within 1 cm |
| The marks `new` and `gone` | `s/const mark = !row\.base \? 'new' : !row\.tree \? 'gone' : '';/const mark = '';/` | gives the shares of both trees, and marks the new and the gone faces |
| The worst fold in the JSON text | `s/worst: worstFold\(report, face\),/worst: null,/` | write and read each folded face with its worst fold and the hash of the corners |

`tools/hold-fit.ts` with `tools/hold-fit.test.ts`:

| Rule | Perl expression | Failing test |
|---|---|---|
| Both ends of a grid | `s/Math\.floor\(Math\.abs\(b - a\) \/ step \+ 1e-9\) \+ 1/Math.floor(Math.abs(b - a) \/ step + 1e-9)/` | gives each value from the first to the last at each step, with both ends and the unit |
| A grid from a larger to a smaller value | `s/const direction = b < a \? -1 : 1;/const direction = 1;/` | gives each value from the first to the last at each step, with both ends and the unit |
| The unit `deg` | `s/const unit = degrees\[0\] \? 'deg' : '';/const unit = '';/` | gives each value from the first to the last at each step, with both ends and the unit |
| The limit of 40 variants | `s/if \(total > GRID_LIMIT\) \{/if (total > GRID_LIMIT * 2) {/` | stops on more variants than the limit, and states the count |
| The product, the first grid outermost | `s/variants\.flatMap\(\(variant\) => range\.map\(\(c\) =>/range.flatMap((c) => variants.map((variant) =>/` | gives the product of the grids, the first grid outermost |
| The grids after the variants of `--set` | `s/variants\.push\(\.\.\.gridVariants\(grids\)\);//` | adds the variants of the grids after the variants of --set, and takes --faces |
| The sort by the folds, then by the depth | `s/share\(a\) - share\(b\) \|\| margin\(a\) - margin\(b\)/share(a) - share(b)/` | sorts the variants by the play folds, then by the deepest point, after the base |
| The best variant | `s/const best = sortFitRows\(rows\)\[1\];/const best = rows[1];/` | writes the faces of the base and of the best variant |

`tools/hold-reach.ts` with `tools/hold-reach.test.ts`:

| Rule | Perl expression | Failing test |
|---|---|---|
| The violin grows along its axis | `s/\.multiplyScalar\(factor\)/.multiplyScalar(1)/` | grows the instrument from its tail end along its axis |
| The paw keeps its size | `s/return \(reach - paw\) \/ \(arm - paw\);/return reach \/ arm;/` | makes the upper arm and the forearm longer, and keeps the paw |
| `--size` leaves the other arguments | `s/i !== at && i !== at \+ 1/i !== at/` | takes the scales of --size out of the arguments |
| A scale above 0 | `s/Number\.isFinite\(size\) && size > 0/Number.isFinite(size)/` | stops on no value, a second --size, or a scale that is not above 0 |
| The arm factor of the rig | `s/rigFactor: rig \? armFactorFor\(reach, rig\.short, rig\.paw\) : null,/rigFactor: rig ? armFactorFor(reach, rig.short * 1.05, rig.paw) : null,/` | needs the reach of the arm at the size of the rule, and the arm factor of the rig there |
| The factor of the current length | `s/scrollReach\(toVec3\(tail\), toVec3\(scroll\), toVec3\(shoulder\), wanted \/ scale\)/scrollReach(toVec3(tail), toVec3(scroll), toVec3(shoulder), wanted)/` | needs the reach of the arm at the size of the rule, and the arm factor of the rig there |
