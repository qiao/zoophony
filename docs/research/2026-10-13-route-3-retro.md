# The retrospective of route 3 (2026-10-13)

On 2026-10-12 the user asked: "replace the polar bear pianist by the polar bear model from the
lowpoly studio folder". The task merged at `47985066`. Then the user asked the agents for
changes that make future similar tasks faster, "including but not limited to removing
constraints, create reusable tools, better algorithms, better process", and said: "you can make
the decision and apply whatever you think is worth the investment". This report gives the times
of the task, the proposals of the agents, the decisions of the manager, and the measured gains.

A similar task puts an animal of `lowpoly-studio/` into the app for a role by route 3 of
`AGENTS.md`, for example a violinist rabbit or a cellist dog.

## 1. The times of the task

| Step | Minutes | Source |
|---|---:|---|
| Brief of the manager | about 15 | session times |
| Implementation | 70 | agent time, 18 commits |
| Review | 17 | agent time, 10 findings |
| Fix | 23 | agent time, 10 commits |
| Merge | 9 | `tools/merge-branch.sh`: 326 s for the check of each commit, 30 s for the full suite, 92 s of wait for the load, 74 s for the site checks |

The same 28 commits got the same checks four times: by the implementation agent (13 minutes),
the review agent (10 minutes), the fix agent (4 to 9 minutes), and the merge (5.4 minutes). Main
did not move during the task, so each check saw the same trees.

The largest time sinks of the implementation agent:

| Time sink | Minutes |
|---|---:|
| Fit of the piano hold to the round belly, with an edit of `src/pose/hands.ts` for each variant | 20 |
| The checks of each commit | 13 |
| Docs | 9 |
| Inspection of the GLB file and its frames, with no tool | 8 |
| Baselines of `main` in temporary worktrees | 7 |
| Close views with a camera around the middle of the item | 6 |

The review found two faults that a sweep over the demos finds: a wide chord past the reach of a
paw, and forearms in the belly. These took 12 of the 15 minutes of the work of the fix round.
The fix agent then needed three probes to measure the true depth of a forearm, because the old
depth helper takes the sign of the nearest face of an open body.

## 2. Decisions

| Proposal | Saves for each task | Cost | Decision |
|---|---:|---:|---|
| A cache of check results by tree, used by the agents and the merge | about 20 min | 60 min | applied (E1) |
| One sweep for each role: the arms against the closed body and the instrument, and the note targets | about 15 min, and 2 review findings | 120 min | applied (E2a) |
| `pnpm pose-depth` with `--set` changes of a hold in memory | about 10 min | in E2a | applied (E2a) |
| The port variable of the end-to-end tests, the decision-row finder, the index test of the decision files, the `scratch/` folder | about 6 min | 40 min | applied (E1) |
| `studio-body --inspect`, `pnpm fold-probe`, `body-probe --base`, close views with a free camera, a `--set` root for the holds of a species | about 12 min | 100 min | applied (E2b) |
| Brief templates of route 3 with the process rules of this task | about 15 min | 30 min | applied (`docs/briefs/studio-body.md`) |
| The studio builds a role at the props of the app | about 15 min | 120 min, new GLB files | deferred: the low bench of the polar bear comes from its short legs. The props of each role differ |
| `out/<id>.layout.json` from the studio | about 3 min | 30 min | deferred: `tools/studio-body.ts` reads the same values from the props of the GLB file |
| The seated drop of the studio at the lowest point of the skin | about 3 min | 20 min, new GLB files | deferred |
| A corrective shape of the studio for a bent arm against a round belly | a quality fix, no time | 90 to 120 min | deferred: it is a quality item, and the sweep records the depth as an accepted limit |
| A lint rule for TSDoc on each member | about 3 min | 90 min | deferred |
| A reflow tool for Markdown | about 2 min | 20 min | deferred |

## 3. Measured gains

| Measure | Before | After |
|---|---:|---:|
| The step of each commit in a merge | 326 s (28 commits) | 4 s (28 commits, all cache hits) |
| A merge of a branch that an agent checked | 523 s | 191 s, of which 95 s is the wait for the load |
| One tuning step of a hold (a value, then the depth of the forearms and the paws) | 14.1 s for each edit and test run, with only pass or fail | 5.5 s for each variant, with no edit; 1.3 s for 3 variants at 2 times |
| The conductor clearance shards | 55.2 s of file time | 33.5 s |
| `pnpm test` | 29.8 to 30.5 s | 27.4 to 28.3 s |
| The facts of a GLB file | 8 min of scratch scripts | 0.12 s (`pnpm studio-body <animal> --inspect`) |
| The folded faces of the pianist and the conductor | a script to write, then 25.9 s | 5.6 s and 11.5 s (`pnpm fold-probe <role>`) |
| `body-probe` against a commit | 2 min with a manual worktree | about 2 s (`pnpm body-probe --base <ref>`) |
| The camera of the close views of a new role | 6 min of tuning | one `ROLE_VIEWS` entry with a camera around the body |

The sweep finds both faults of the review of the polar bear: with the old split of the wide
chords, the left palm misses its keys by 17.1 mm, and with the old rest place the forearms go
7.8 cm into the body. The check cache found 16 red commits in its first use: a decision file
with no index line.

## 4. What the sweep showed

The new depth closes the open loops of the body, so it measures the true depth of each part.
The old tests checked only the paws. The accepted limits are in
`docs/decisions/2026-10-13-role-sweep.md`. The forearms of the pianist go up to 8.0 cm into the
body in a play, and the arms of the conductor up to 3.7 cm when they lift and lower. These are
faults of the current models, which the old tests did not see. A corrective shape of the studio
or a new hold can remove them.

## 5. The process for the next task

[`docs/briefs/studio-body.md`](../briefs/studio-body.md) gives the templates of the three
agents and the steps of the manager:

```text
 manager: baseline + inspect --> brief --> implementation --> review --> fix --> merge --> retro
                                            (sweep, probe)    (tip only)          (cache hits)
```
