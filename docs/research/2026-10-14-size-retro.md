# The retro tools of the size round (2026-10-14)

The size round of 2026-10-14 made the red fox 1.3 times and the rabbit 1.2 times larger
([`2026-10-14-animal-size/`](2026-10-14-animal-size/)). Its agent lost about 55 minutes in hand
probes. The manager chose four items against these losses. This report gives the tools, their
times, and the break commands of their new pure functions. The probes and the logs are in
[`2026-10-14-size-retro/`](2026-10-14-size-retro/).

| Lost | Cause | Item |
|---|---|---|
| 20 min | A compare of the depths of `main` and the branch in head heights by hand scripts (`depth-compare.py`, `depth-sum.py`). The sweep named a player only `violinist 0`, so the scripts guessed the species from the index. The agent extracted `main` by hand. | `--base` of `pnpm pose-depth` and `pnpm hold-fit`, and the species in each label |
| 25 min | Five hold variants before the agent found that the free hair of the bow (`HAIR_END`) stays 0.03 m on the larger body. | The trap of a body size in route 3 of `AGENTS.md` and in section 7 of `docs/briefs/studio-body.md` |
| 10 min | A hand probe for the lineup (`frames.ts`). The gallery camera fits the row, so `main` and the branch had different camera distances. | `pnpm close-views lineup` |
| 12 min | A shot test failed on the new layout, and the agent read the planner to find the cause. | `pnpm test src/shots/` early in a body round (section 7 of the brief template) |

## The tools

```text
 pnpm pose-depth <role> --base <ref>          pnpm hold-fit <role> --base <ref>
            |                                            |
            v                                            v
 probeBeside() of tools/ref-tree.ts: one folder of withProbeTree() (src/ and the demos of
 the commit, the scripts of tools/ of the working tree, a link to node_modules)
            |                                            |
   child 1: the script on the commit           child 2: the script on the working tree
   (no --set), --json <folder>/base.json       (each --set), --json <folder>/tree.json
            |                                            |
            +--------------------+-----------------------+
                                 v
     the parent reads both files: the output of the working tree, then compareDepths()
     for each variant (one row for each species, sample set, and pair, in cm and in H)
```

The parent only waits for its two children. Thus Ctrl-C through `pnpm` ends both children at
once, and the folder goes away. The sweeps of the two trees run on two cores at the same time.

| Command | Output | Time |
|---|---|---|
| `pnpm pose-depth violinist --base main` | The sweep of the working tree, then the compare of the depths of the rabbit and the red fox in cm and in H | 304 s for the two sweeps, 5 min 4 s in all |
| `pnpm pose-depth violinist --demo beethoven-8 --base main` | The same for one demo | 15.7 s |
| `pnpm hold-fit fox-violinist --base main` | The fit table with the row of `main` first, then the compare of the depths in H | 44 s |
| `pnpm hold-fit pianist --demo bach-bwv1048 --step 5 --set piano.lean=16deg --base main` | Two marks `GROWS` for the variant: the upper arms in the body in the play and in the lowering | 22.2 s |
| `pnpm close-views lineup rabbit,fox-red,cat,bear <dir> --base main` | `lineup-base-views.png`: the lineup of `main` above the lineup of the working tree, at one camera (target 0.664 m, distance 5.48 m), as `lineup-main.webp` of the probe folder | 7.2 s with both builds |
| `pnpm body-probe --base main` | All equal: 95 bodies, 23 players, 1492 pose sets | 6.2 s |

The load average of the machine was 23 to 29 during the runs, because another round ran its
checks at the same time. The two children of `--base` each took 300 s of CPU time for the full
violinist sweep. The fit of `fox-violinist` took 44 s, about the time of one variant alone
(45 s in `AGENTS.md`), because the two children run on two cores. The logs are `pose-depth-violinist-base-main.txt`,
`hold-fit-fox-violinist-base-main.txt`, and `stop-checks.txt` of the probe folder.

The mark `GROWS` follows a depth whose value in H grows by more than one step of the print of the
depths (0.1 cm) in the H of the body of the working tree. A body that grows keeps its depths in
H, so its depths in cm grow with it and get no mark. The hand script of the size round passed a
depth with a ratio of the depths in cm of at most the scale of the body, plus 0.05 cm. The new
rule is the same rule in H, with one step of the print in place of half a step.

The label of each player of the sweep names its species, such as `violinist 4 (fox-red, chair)`.
The tool finds the species by the model of the player in the scene (`speciesOf()` of
`tools/pose-depth.ts`), so the probe of an older commit finds it too.

The lineup reads the box of the models of each site (the attribute `data-row` of the gallery
canvas). Then `lineupCamera()` chooses one target and one distance (the gallery query
`distance`) that show the tallest model and the widest row of both trees whole. The gallery of
`main` before this round has no query `distance`. Thus the build of the commit takes
`src/gallery/` of the working tree (`overlayTree()` of `tools/ref-tree.ts`). A lineup with
`--base 658027d0`, the commit before the size round, shows the fox and the rabbit grow at one
camera (`lineup-658027d0.webp`).

## Ctrl-C

The probe `stop-check.ts` starts a tool through `pnpm` in a process group of its own, sends INT
to the group and a second INT to `pnpm`, as a terminal does. Then it lists the temporary folders
and the processes that remain (`stop-checks.txt`).

| Tool | Exit code of `pnpm` | Stop time | Folders left | Processes left |
|---|---|---|---|---|
| `pnpm pose-depth violinist --demo beethoven-8 --base main` | 130 | 602 ms | none | none |
| `pnpm hold-fit fox-violinist --base main` | 130 | 607 ms | none | none |
| `pnpm close-views lineup rabbit,fox-red <dir> --base main`, during the renders | `pnpm` ends by a signal and says `Command failed` | 714 ms | none | none |

## Break commands

Each command breaks one rule of a new pure function with `tools/break-test.sh`, and names the
test that fails. The output of each run is in `break-tests.txt`.

| Rule | Command | Failing test |
|---|---|---|
| probeScripts copies no test file | ``tools/break-test.sh 's/ && !file\.endsWith\('\.test\.ts'\)//' tools/ref-tree.ts tools/ref-tree.test.ts`` | tools/ref-tree.test.ts > probeScripts > copies each script of tools/ with no test and with no path of the commit<br>tools/ref-tree.test.ts > withProbeTree > gives the code of a commit with the scripts and the node_modules of the working tree |
| probeScripts takes the paths of the commit from the commit | ``tools/break-test.sh 's/ && !PROBE_PATHS\.includes\(`tools\/\$\{file\}`\)//' tools/ref-tree.ts tools/ref-tree.test.ts`` | tools/ref-tree.test.ts > probeScripts > copies each script of tools/ with no test and with no path of the commit |
| withoutOptions removes the value of an option | ``tools/break-test.sh 's/      i\+\+;\n//' tools/ref-tree.ts tools/ref-tree.test.ts`` | tools/ref-tree.test.ts > withoutOptions > removes each option with its value and each flag, and keeps the other arguments |
| overlayTree removes a file that only the commit has | ``tools/break-test.sh 's/    rmSync\(join\(dir, path\), \{ recursive: true, force: true \}\);\n//' tools/ref-tree.ts tools/ref-tree.test.ts`` | tools/ref-tree.test.ts > overlayTree > replaces a path of the tree of a commit with the path of the working tree |
| playerLabel puts the species inside the parentheses of a name | ``tools/break-test.sh 's/return inner \? /return false ? /' tools/pose-depth.ts tools/pose-depth.test.ts`` | tools/pose-depth.test.ts > playerLabel > adds the species inside the parentheses of a name, or in new parentheses<br>tools/pose-depth.test.ts > sweepDemos > sweeps each player over all samples of a set that is a generator |
| speciesOf gives the species of the place with the model | ``tools/break-test.sh 's/      return cast\.species;/      return null;/' tools/pose-depth.ts tools/pose-depth.test.ts`` | tools/pose-depth.test.ts > sweepDemos > sweeps each player over all samples of a set that is a generator |
| compareDepths compares in the H of each body | ``tools/break-test.sh 's/b\.depth \/ b\.headHeight - a\.depth \/ a\.headHeight > DEPTH_STEP \/ b\.headHeight/b.depth - a.depth > DEPTH_STEP/' tools/pose-depth.ts tools/pose-depth.test.ts`` | tools/pose-depth.test.ts > compareDepths > marks a depth that grows in H by more than one step of the print |
| compareDepths marks a growth of more than one step | ``tools/break-test.sh 's/> DEPTH_STEP \/ b\.headHeight;/> 2 * DEPTH_STEP \/ b.headHeight;/' tools/pose-depth.ts tools/pose-depth.test.ts`` | tools/pose-depth.test.ts > compareDepths > marks a depth that grows in H by more than one step of the print |
| compareDepths leaves out a pair that prints 0.0 cm on both sides | ``tools/break-test.sh 's/< DEPTH_STEP \/ 2\)/< 0)/' tools/pose-depth.ts tools/pose-depth.test.ts`` | tools/pose-depth.test.ts > compareDepths > groups the rows by species, and leaves out a pair with no depth on both sides |
| compareDepths groups the rows by species | ``tools/break-test.sh 's/keys\.filter\(\(k\) => k\.startsWith\(`\$\{name\}\\t`\)\)/keys.filter(() => name === species[0])/' tools/pose-depth.ts tools/pose-depth.test.ts`` | tools/pose-depth.test.ts > compareDepths > groups the rows by species, and leaves out a pair with no depth on both sides |
| restoreDepth gives back NaN | ``tools/break-test.sh 's/along: stored\.along \?\? Number\.NaN/along: stored.along ?? 0/' tools/pose-depth.ts tools/pose-depth.test.ts tools/hold-fit.test.ts`` | tools/hold-fit.test.ts > fitTable > gives back the rows of its JSON text, with NaN for a depth with no bone<br>tools/pose-depth.test.ts > rowsJson > gives back NaN and the infinite gaps of the rows that it writes |
| restoreGap gives back an infinite gap | ``tools/break-test.sh 's/gap: stored\.gap \?\? Infinity/gap: stored.gap ?? 0/' tools/pose-depth.ts tools/pose-depth.test.ts`` | tools/pose-depth.test.ts > rowsJson > gives back NaN and the infinite gaps of the rows that it writes |
| parseOptions refuses --base with --json | ``tools/break-test.sh 's/  if \(base !== null && json !== null\) \{/  if (false) {/' tools/pose-depth.ts tools/pose-depth.test.ts`` | tools/pose-depth.test.ts > parseOptions > reads the commit of --base and the file of --json, and refuses both together |
| parseFitOptions refuses --base with --json | ``tools/break-test.sh 's/  if \(base !== null && json !== null\) \{/  if (false) {/' tools/hold-fit.ts tools/hold-fit.test.ts`` | tools/hold-fit.test.ts > parseFitOptions > stops on --base with --json |
| foldShares keeps the lift | ``tools/break-test.sh 's/lift: \{ samples: lift\.samples, withFold: lift\.withFold \}/lift: { samples: play.samples, withFold: play.withFold }/' tools/hold-fit.ts tools/hold-fit.test.ts`` | tools/hold-fit.test.ts > fitTable > marks a depth over its limit and play folds over the goal of 1% |
| lineupCamera shows the tallest model whole | ``tools/break-test.sh 's/const top = height \* 1\.05;/const top = height * 0.8;/' tools/close-views.ts tools/close-views.test.ts`` | tools/close-views.test.ts > lineupCamera > shows the tallest model and the widest row of all trees whole, and fills the image |
| lineupCamera shows the widest row whole | ``tools/break-test.sh 's/\(halfWidth \* 1\.05\)/(halfWidth * 0.8)/' tools/close-views.ts tools/close-views.test.ts`` | tools/close-views.test.ts > lineupCamera > shows the tallest model and the widest row of all trees whole, and fills the image |
| lineupCamera takes the tallest model of all trees | ``tools/break-test.sh 's/Math\.max\(\.\.\.boxes\.map\(\(box\) => box\.height\)\)/boxes[0]?.height ?? 0/' tools/close-views.ts tools/close-views.test.ts`` | tools/close-views.test.ts > lineupCamera > shows the tallest model and the widest row of all trees whole, and fills the image |
| lineupArgs refuses an unknown species | ``tools/break-test.sh 's/    species\.length !== names\.length \\|\\|\n//' tools/close-views.ts tools/close-views.test.ts`` | tools/close-views.test.ts > lineupArgs > reads the species, the folder, the URL, and the commit, and refuses a wrong line |
| lineupPath shows the species standing | ``tools/break-test.sh 's/    stand: '',\n//' tools/close-views.ts tools/close-views.test.ts`` | tools/close-views.test.ts > lineupPath > shows the species standing in the rest pose, low, at a fixed camera or at the fit |
| closeView reads a distance above 0 m only | ``tools/break-test.sh 's/read\('distance', 0\) > 0 \?/read('distance', 0) >= 0 ?/' src/gallery/items.ts src/gallery/items.test.ts`` | src/gallery/items.test.ts > closeView > reads the zoom, the target, and the direction of the query, with defaults<br>src/gallery/items.test.ts > closeView > reads a fixed distance of the camera above 0 m, or none |

## Decisions

[`2026-10-14-size-retro.md`](../decisions/2026-10-14-size-retro.md) gives the decisions of the
round: the two children, the probe folder, the rule of the mark `GROWS`, the species label, the
gallery query `distance`, and the overlay of the gallery in the build of a commit.
