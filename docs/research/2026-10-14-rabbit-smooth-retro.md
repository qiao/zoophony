# The retrospective of the smooth studio bodies (2026-10-14)

On 2026-10-14 the round `rabbit-smooth` gave the three studio bodies smooth normals with a crease
angle for each body ([`2026-10-14-rabbit-smooth.md`](2026-10-14-rabbit-smooth.md)). It merged at
`d46d7fbe`. Its review found nine gaps in the docs and the tests. After the merge, the
implementer and the reviewer named what would make the next round of this shape faster. A user
rule of 2026-10-12 says that the manager decides and applies the items that are worth their cost.
The user changes the look of the animals often now, so a tool that compares a branch with `main`
pays back in a few rounds. This report gives the times of the round, each item with its decision,
and the measures of the new tools. The decisions of the retro round are in
[`2026-10-14-smooth-retro.md`](../decisions/2026-10-14-smooth-retro.md). The logs are in
[`2026-10-14-rabbit-smooth-retro/`](2026-10-14-rabbit-smooth-retro/).

## 1. The times of the round

The manager gave the times of the second column in the brief of the retro round. The third column
gives what the commit times (`commit-times.txt`) and the file times of the scratch folder of the
manager show.

| Step | Time (brief) | Commit and file times |
|---|---|---|
| Manager: the measures of the shading, the normals, the texture, and the mesh, then the brief | about 15 min (08:19 to 08:34) | The brief file has the time 08:29:33. The first commit of the round is at 08:31:47 |
| Implementation round with two addenda (13 commits) | 44.5 min by the duration of the agent run | The 13 commits lie from 08:31:47 to 08:59:24 (27.6 min). From the brief file to the 13th commit is 29.9 min. 08:29:33 plus 44.5 min is 09:14, after the 6 commits of the 35° pass (09:09:20 to 09:12:17) |
| Manager decision of 35° and the second pass (6 commits) | 52 min | From the 13th commit to the last commit of the pass is 12.9 min. The commits do not show 52 min |
| Review | 8 min | The review brief has the time 09:09:19 |
| Fix round (7 commits) and the frame record (1 commit) | 9 min | The 7 commits lie from 09:25:44 to 09:28:08, and the frame record is at 09:35:58 |
| Manager: `pnpm frame --gpu-only` two times on each tree | about 11 min | The install logs of the two trees have the time 09:24:51, and the last frame log 09:34:43 (9.9 min) |
| Merge | 247 s | The merge log gives 247 s, with 61 s of wait for the load and 87 s of the full unit suite |

The report of the implementation round gave about 190 minutes. The commit times do not support
it. The manager started at 08:19, and the merge log has the time 09:41:55, so the whole task took
83 minutes. The commit times agree with the 44.5 minutes of the agent run. A run that started
with the brief file at 08:29:33 ended at about 09:14, after the last commit of the 35° pass.

```text
 08:19     the manager starts the measures            -+
 08:29:33  the brief file                    -+         |
 08:31:47  the first commit                   |         |
 08:59:24  the 13th commit                    | agent   |
 09:09:19  the review brief                   | run,    |
 09:09:20  the first commit of the 35° pass   | 44.5    | 83 min
 09:12:17  the last commit of the 35° pass    | min     |
 09:14     08:29:33 plus 44.5 min            -+         |
 09:25:44  the first of the 7 fix commits               |
 09:28:08  the last fix commit                          |
 09:35:58  the commit of the frame record               |
 09:41:55  the end of the merge (247 s)               -+
```

## 2. The items and their decisions

The table gives the eight items of both agents: six applied items and two skipped items. It counts
the compare options of `pnpm close-views` and `pnpm size` as one item. The brief of the retro
round names the agent only for the first two items.

| # | Item | Evidence | Decision |
|---|---|---|---|
| 1 | `--base <ref>` for `pnpm close-views` and `pnpm size` (the implementer) | The implementer made a worktree of `main` by hand three times, started four dev servers, joined the images with ad hoc Python, and built `main` only for its size | Applied (item 1 of the brief) |
| 2 | `pnpm body-probe` names the changed fields of a mesh (the reviewer) | The probe printed "body rabbit chair: mesh differs, joints same", and the reviewer wrote a compare script to show that only the colors changed | Applied (item 2) |
| 3 | `tools/break-test.sh`, and a break command for each rule of the TSDoc of a new pure function | The weight by the corner angle of `studioNormals()` had no test until the review | Applied (items 3 and 4) |
| 4 | A rule in "Keep the docs true": the docs of a setting change in the commit of its value | Commit `18cd7e3b` changed `crease` from 10 to 35 with no docs, and three old claims stayed | Applied (item 4) |
| 5 | A rule in "Tests": run an image probe with `uv run --no-project --with pillow --with numpy --with scipy python -I` | The Python of Homebrew and of the system have no numpy, and the Python of Blender has no Pillow | Applied (item 4) |
| 6 | The brief template checks that the reference lies inside the range of the renders of the variants before a measure chooses a value | The rabbit references (4.01% and 4.61%) lay above the flat rabbit (3.28% and 2.64%). The round took 10°, and the manager changed it to 35°, which cost six more commits | Applied (item 5) |
| 7 | A saved tool for the facet contrast | It saves about 40 minutes, and it costs about 3 hours | Skipped: the cost is above the saving, and the measure could not choose the rabbit angle |
| 8 | A tool that wraps Markdown lines | It saves about 5 minutes, and it costs about 30 minutes | Skipped: the cost is above the saving |

## 3. What the round changed

```text
                       tools/ref-tree.ts
  withRefTree(ref, use) : git archive -> temporary folder -> use(dir) -> remove, also after
        |                 a failure or INT/TERM
        +-- withRefBuild(ref, use) : link node_modules -> pnpm build of the commit -> use(dir)
        |       |
        |       +-- pnpm size --base <ref>          : total of the commit, of the tree, difference
        |       +-- pnpm close-views <role> <dir> --base <ref> : grid of the commit above the
        |                                             grid of the working tree
        +-- probeRef() of pnpm body-probe --base <ref> : the probe of the commit in a child process
```

- **Item 1.** `pnpm size --base <ref>` and `pnpm close-views <role> <dir> --base <ref>`. The
  option of `pnpm close-views` that names a running site is now `--url <url>`.
- **Item 2.** Each body and each player of `pnpm body-probe` has a hash of each field of its
  mesh. A studio body adds its corrective shapes and its smooth normals. The compare names the
  fields, such as `mesh differs (colors, normals)`.
- **Item 3.** `tools/break-test.sh '<perl expr>' <file> <test files>...`, with
  `tools/break-test.ts` for the read of the JSON report of Vitest.
- **Item 4.** Three rules of `AGENTS.md`: the docs of a setting, a break command for each rule of
  a TSDoc, and the image probes with `uv`.
- **Item 5.** The range check in "Range and stop" of the implementation brief of
  [`docs/briefs/studio-body.md`](../briefs/studio-body.md). The briefs also run the new compares
  and the break script.

## 4. Measures of the new tools

Each time is one run on the development Mac at the load average 3.96, from `times.sh`
(`times.txt`), unless the row names another log.

| Measure | Value | Log |
|---|---|---|
| `pnpm close-views violinist <dir>` (with the build of the working tree) | 14.95 s | `times.txt` |
| `pnpm close-views violinist <dir> --base main` (with both builds) | 31.05 s, and 30.66 s in a first run | `times.txt` |
| `pnpm size` / `pnpm size --base main` | 0.31 s / 2.72 s | `times.txt` |
| `pnpm build` of the working tree | 1.18 s | `times.txt` |
| `pnpm body-probe` with the tool of `main` / with the new tool | 4.53 s / 5.62 s, and 6.06 s in `times.txt` | `body-probe-compat.txt`, `times.txt` |
| `pnpm body-probe --base main` | 5.97 s | `times.txt` |
| The JSON of the body probe, the tool of `main` / the new tool | 2,566,320 B / 2,596,526 B | `body-probe-compat.txt` (the sizes of `ls -l`) |
| One run of `tools/break-test.sh` on `tools/close-views.test.ts` | 1.95 s | `times.txt` |
| The 16 break commands of the retro round, one after the other | 118 s | `breaks.txt` |

The compare of the JSON of the tool of `main` with the JSON of the new tool on the same tree
gives 80 of 95 bodies and 20 of 23 players equal (`body-probe-compat.txt`). A mesh with no studio
skin keeps its hash. The 15 studio bodies and the 3 studio players get a new hash, because the
corrective shapes and the normals now count.

The new probe names the change of the crease angle of the rabbit. The tool of `main` gives each of
the 95 bodies equal across that change (`body-probe-crease-main-tool.txt`).
`pnpm body-probe --base 18cd7e3b~1` gives the five rabbit bodies and the violinist with
`mesh differs (normals)` (`body-probe-crease.txt`). `pnpm body-probe --base 2bb97ae2`, the base of
the round, gives `colors, normals` for the rabbit and `normals` for the two bears
(`body-probe-round.txt`). That is the answer of the compare script of the reviewer.

The break commands found one weak break of their own. The expression `s/working tree: /new: /`
hit a TSDoc comment first, and the script printed the diff and "No test fails". The expression
``s/`working tree: /`new: /`` hit the code, and the test failed (`breaks.txt`, runs 6 and 6b).

`violinist-base-views.webp` is the output of `pnpm close-views violinist <dir> --base main` on
the first run: the grid of `main` (`cc83899c`) above the grid of the working tree.
