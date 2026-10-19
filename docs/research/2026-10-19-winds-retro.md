# The tool round of the retro of the beaver and pig mesh rounds

Date 2026-10-19. Round `retro-winds`, on the branch `retro-winds` from `1ec972db`. Decisions:
[`2026-10-19-winds-retro.md`](../decisions/2026-10-19-winds-retro.md). The probes and their
outputs are in [`2026-10-19-winds-retro/`](2026-10-19-winds-retro/). Each command runs from the
root of the tree.

## 1. The question

The beaver and pig mesh rounds named six slow steps. During the round, the manager added two steps
of the beaver arm round (items 7 and 8). Each new mode must replace its step in less time, and a
change of a tool must keep the output of its old options.

## 2. The measures

**Times.** Each new mode against the step that it replaces. The steps of the rounds come from the
reports of their agents. The times of the new modes come from `time` or from the status logs
(`rig-status.txt`, `pd-status.txt`).

| Item | Step of the mesh round | New mode | Time |
|---|---|---|---:|
| 1 | A script that wrote each play turn as quaternion components for `--set` | `pnpm hold-reach beaver --instrument bassoon` with 4 variants of `holdTurn()` and `[...]`, and the spare reach table | 0.6 s |
| 2 | A first scan with a new scale that moved no grip | `pnpm typecheck` with a new item `horn` in `SCALED_INSTRUMENTS`: 5 errors | 0.7 s |
| 3 | A copy of each entry of `pnpm raise-fit` into the config by hand | `pnpm raise-fit bassoonist --faces 380,706,1246 --side L --json <file>`, then `pnpm rig-mesh beaver --check --roles bassoonist --demo beethoven-8 --set 'raise+=@<file>'` | 18 s + 19 s |
| 4 | A sweep of 4 rows over 10 demos for more than 20 minutes, with no warning | The plan and the estimate before the first row. The refusal of 6 rows | 0.5 s |
| 5 | Grid probes for a rest place with both paws in reach | `pnpm hold-fit hornist --scan` with 3 variants | 12 s |
| 5 | | `pnpm hold-fit hornist --sets rest` with 2 variants on 2 demos | 19.5 s |
| 6 | A failed check with only "blender failed with the status 1" | `pnpm rig-mesh pig --check` with a fifth rule: the cause in the table | 13 s |
| 7 | A rig of the variant by hand for its GLB file (about 5 minutes), and a watch with 0% after a cut | `pnpm rig-mesh beaver --check --watch <6 faces> --set 'cut={"top":0.6}' --keep <dir>` | 16 s |
| 8 | A crop script for a pair of the base and the tree (about 6 minutes) | `pnpm close-views bassoonist <dir> --base 1ec972db --scale 2 --pairs note-front,note-left --crop 0.2,0.25,0.6,0.45`, with both builds | 47 s |

**Item 4: the estimate.** `pd-runs.sh` and `plan-only.sh` run `pnpm pose-depth hornist`:

| Run | Estimate | Real time |
|---|---:|---:|
| `--demo beethoven-8`, 2 rows, the time of 1 demo from an earlier run | 20 s | 21 s |
| The same, the base row from the cache | 10 s | 12 s |
| All 10 demos, 2 rows, the time of 1 of 10 demos | 3.5 minutes | 4.9 minutes |
| All 10 demos, 4 `--set` rows and the base row, the times of 10 of 10 demos | 12.1 minutes | stopped |

With the time of 1 demo, the tool takes that time for the other 9 demos, and the estimate is low
by 28%. After a full row, the estimate holds the time of each demo.

**Item 5: the pig rest.** `hold-fit-scan-hornist.txt` gives, for each variant of the rest of the
horn, the folded faces, the instrument in the body, and the spare reach of each grip:

| Variant | Rest faces | Instrument in body cm | Spare L cm play / rest | Spare R cm play / rest |
|---|---|---:|---:|---:|
| base | 7 | 4.0 | 8.0 / 3.8 | 8.8 / 5.4 |
| `restShift=[0.05,-0.25,-0.2]` | 12 | 4.0 | 8.0 / 3.0 | 8.8 / 4.0 |
| `restShift=[0.05,-0.3,-0.15]` | 15 | 5.7 | 8.0 / 3.6 | 8.8 / 3.7 |
| `restPoleR=[1,-1,0]` | 12 | 4.0 | 8.0 / 3.8 | 8.8 / 5.4 |

Each variant takes 0.044 s, and the scenes of the demos take 11.4 s.

**Item 7: the paired watch.** `rig-mesh-watch-cut.txt`: after the cut of top 0.6, faces 380, 706,
and 1246 have no folded face within 1 cm (`none`), and faces 427, 692, and 1084 pair with faces
1738, 989, and 2217. Face 427 folded in 0% of the play samples of the base, and its pair folds in
100% of the play samples of the cut. A probe of each face middle of both kept GLB files gives the
same pairs at 9.74 mm, 0.45 mm, and 0.24 mm (`watch-middles.sh`, `watch-middles.txt`).

**Old options.** Each old option gives the same output:

- `pnpm body-probe --base 1ec972db`: 95 of 95 bodies, 23 of 23 players, and 1492 of 1492 pose
  sets equal (`body-probe.txt`). Each module of `src/models/studio/` has the hash of `1ec972db`.
- Item 2: the 418 instrument models of each species have one SHA-256 before and after the change
  (`instrument-hash.ts`, `instrument-hash.txt`).
- `pnpm pose-depth hornist --demo beethoven-8 --json <file>` with the tool of `e396f173` and of
  `4013cd0c` gives the same results. Only the two lines of the plan come first.
- `pnpm hold-fit violist --scan` and `pnpm hold-fit violist --sets rest --demo beethoven-8` on
  `4013cd0c` and on the branch give the same table.
- A variant with `poleL=[-0.4,-1,-0.4]` gives the reach of the variant with three component
  changes, and `play=holdTurn(20,20)` gives the reach of the hold of the beaver.

## 3. The result

The round built the eight items. The largest saving is item 4: a run of more than 5 rows over all
demos stops at once, and each run gives its time before the first row. Items 3, 7, and 8 replace a
manual step of about 5 minutes with one command.

Open: `tools/hold-sets.test.ts` fails 1 of 6 tests on `1ec972db` and on the branch. The test
expects `piano.action=pluck` to fail, and `--set` takes it as a member of the union of its field
(`TEXT_FIELDS`). All tests are paused, so the round did not change it.

## 4. The items of the hippo arm round

**The fix of `--base`.** Since `0d12385f`, `pose-depth.ts` asks git for the folder of the probe
caches (`timesFile()`). The probe of a commit runs in a temporary folder with no git, so
`pnpm pose-depth --base` failed after 1 s with "not a git repository". Now `withProbeTree()` of
`tools/ref-tree.ts` runs `git init` in the folder. Thus the tools of each commit run there, also
the tools of a commit before the fix, and their times go away with the folder. No other probe of a
commit calls git. The children of `hold-fit`, `fold-probe`, `shot-trace`, `body-probe`, and
`rig-form` call none, `baseCacheFile()` runs only in the repository, and the base child of
`pose-depth` gets no `--set`, so it reads no tree cache. `pnpm pose-depth bassist --demo
boulanger-matin --base 16f16e44` now ends in 24 s (`pose-depth-base.txt`). `PROBE_NO_CACHE=1 pnpm
fold-probe bassist --demo boulanger-matin --base 16f16e44` takes 6 s, against 5 s before the fix
(`fold-probe-base.txt`).
