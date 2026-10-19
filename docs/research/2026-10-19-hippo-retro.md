# The tool round of the retro of the hippo chest round

Date 2026-10-19. Round `retro-hippo`, on the branch `retro-hippo` from `61e7b8cf`. Decisions:
[`2026-10-19-hippo-retro.md`](../decisions/2026-10-19-hippo-retro.md). The probes and their
outputs are in [`2026-10-19-hippo-retro/`](2026-10-19-hippo-retro/). Each command runs from the
root of the tree.

## 1. The question

The round `hippo-chest` named three slow steps: a probe of the contrabass in the chest, a probe of
close views from a user screenshot, and staged configs of the rig. Each new mode must give the
number of the probe of that round, and a change of a tool must keep the output of its old options.

## 2. The measures

**Times.** `timing.sh` runs each new mode and each probe of the chest round one at a time, on
`boulanger-matin` (`times.txt` in `scratch/`, copied below):

| Item | Probe of the chest round | Time | New mode | Time |
|---|---|---:|---|---:|
| 1 | `top-plate.ts`, each 4th sample, the instrument only | 3 s | `pnpm pose-depth bassist --demo boulanger-matin` | 23 s |
| 1 | | | the same with `--base 61e7b8cf` (both trees) | 25 s |
| 1 | | | `pnpm hold-fit bassist --demo boulanger-matin` | 36 s |
| 2 | `chest-views.ts`, 24 cells of 600 × 750 at 2 device pixels, no build | 21 s | `pnpm close-views bassist <dir> --elevation 30 --zoom 1.5 --scale 2`, 24 cells of 720 × 900, with the build | 21 s to 28 s |
| 3 | `variant.sh` with the config staged by a Python line, one variant | 9 s | `pnpm rig-mesh hippo --check --roles bassist --demo boulanger-matin --set 'raise.1=<rule>' --watch 617,618,323,477,461`, the base and one variant | 20 s |

The chest round spent about 25 minutes on the probe of item 1, 15 minutes on item 2, and 20
minutes on item 3. A sweep of item 1 takes longer than `top-plate.ts`, because it measures each
part in each sample. It needs no new probe.

**Item 1: the instrument in the body.** The sweep of each held role now has the part
`INSTRUMENT_PART`: the closed shells of the bones `instrument` and `slide`, in the body only, with
no limit. Each shell of each held instrument is closed (`shells.ts` gave 0 open shells of 12 to
15), so the part takes each corner of the instrument. The depths of `main` over all demos of each
role, with `pnpm pose-depth <role> --bones instrument,slide --into body` on `61e7b8cf`
(`instrument-main-<role>.txt`), and with the new sweep of the branch over all demos
(`pose-depth-<role>.txt`, `roles-run.sh`). The new sweep gives each value of the four sets
again:

| Role (species) | play cm | lift cm | rest cm | lower cm | New sweep, play cm | Sweep time |
|---|---:|---:|---:|---:|---:|---:|
| violinist (rabbit, red fox) | 2.3 | 3.3 | 0.9 | 3.3 | 2.3 | 469 s |
| violist (cat) | 2.4 | 2.4 | 0.0 | 2.4 | 2.4 | 245 s |
| cellist (dog) | 1.3 | 0.8 | 0.0 | 0.8 | 1.3 | 208 s |
| bassist (hippo) | 14.8 | 14.2 | 8.0 | 14.1 | 14.8 | 212 s |
| flutist (tan fox) | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 97 s |
| oboist (mouse) | 0.5 | 1.0 | 0.0 | 1.1 | 0.5 | 96 s |
| trombonist (panda) | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 39 s |
| violinist soloist (rabbit) | 1.5 | 2.6 | 0.5 | 2.5 | 1.5 | 9 s |
| violinist soloist (red fox) | 1.7 | 2.5 | 0.0 | 2.9 | 1.7 | 9 s |
| violist soloist (cat) | 2.6 | 5.1 | 4.4 | 5.4 | 2.6 | 9 s |

The rows of the soloists come from `pnpm pose-depth <role> --soloist <species>` of the branch
(`soloist-*.txt`): the standing soloist of the violin and piano duo, which no demo has.

On `boulanger-matin`, `pnpm pose-depth bassist --base 61e7b8cf` gives each old pair the same depth
on both trees, and the new pair "instrument in body" 14.7 cm in the play, 13.8 cm in the lift,
8.0 cm in the rest, and 14.0 cm in the lowering, with `no limit` (`pose-depth-bassist-base.txt`).
`top-plate.ts` of the chest round gives 14.6 cm for all corners at each 4th play sample, and 1.5
cm for the top plate (`top-plate.txt`). The pair thus finds the back of the upper bout, which
rests on the chest, and does not separate the top plate. `pnpm hold-fit bassist` gives the new
column "Instrument in body cm" as `14.7 play` (`hold-fit-bassist.txt`). The other columns of
hold-fit keep their values. The old limit of 1.5 cm of that column goes.

**Item 2: the camera of the role views.** `pnpm close-views bassist <dir> --elevation 30 --zoom
1.5 --scale 2` prints `Camera: zoom 1.5, 30°, cells of 720 × 900 px.` (`close-views.txt`), and
writes `close-views-bassist.webp`. The first run wrote a WebP grid of 338,952 B, above the limit
of 300,000 B. The WebP grid now keeps the cells of the factor 1 (241,958 B), and the PNG cells and
the PNG grid keep the size of `--scale`.

**Item 3: new keys and watched faces.** `pnpm raise-fit bassist --faces 477,461 --side R` gives a
second rule of the bow arm (`raise-fit-477.txt`, `raise1.json`). `pnpm rig-mesh --check --set
'raise.1=<rule>'` prints `The variant ... adds the new keys raise.1.`, and `--watch` prints
(`rig-mesh-watch.txt`):

| Variant | Face 617 | Face 618 | Face 323 | Face 477 | Face 461 |
|---|---|---|---|---|---|
| base | 0.0% / 0.0% / 0.0% | 0.0% / 0.0% / 0.0% | 0.0% / 0.0% / 0.0% | 46.2% / 83.9% / 0.0% | 18.1% / 71.0% / 0.0% |
| `raise.1` | 0.0% / 0.0% / 0.0% | 0.0% / 0.0% / 0.0% | 0.0% / 0.0% / 0.0% | 46.2% / 83.9% / 0.0% | 19.0% / 71.0% / 0.0% |

Each cell gives the play, the lift, and the rest. `variant.sh` of the chest round gives the same
shares for faces 477 and 461 of the variant: 46.2% and 83.9%, 19.0% and 71.0% (`variant.txt`).

**Kept outputs.** `pnpm body-probe --base 61e7b8cf` gives 95 of 95 bodies, 23 of 23 players, and
1,492 of 1,492 pose sets equal (`body-probe.txt`). No file of `src/models/` changes.

## 3. The result

All three items work. The sweep, `pnpm pose-depth`, and `pnpm hold-fit` give the instrument in the
body of each held role, with no limit. The role views take a camera and a cell size. `pnpm
rig-mesh --check` takes new keys and watches named faces. The pair of item 1 gives the deepest
corner of the instrument, so a clip of the visible top plate still needs `top-plate.ts`: an open
item of `TODO.md`.
