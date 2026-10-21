# Lens flare

Date 2026-10-20. Round `lens-flare`. Decisions:
[`2026-10-20-lens-flare.md`](../decisions/2026-10-20-lens-flare.md). The probes and their outputs
are in [`2026-10-20-lens-flare/`](2026-10-20-lens-flare/). Each command runs from the root of the
tree.

## 1. The question

The user asked: "is it possible to add lens flare effect?". Then "do it" for a flare in screen
space from the bloom chain, with no new dependency. The flare must come from the lamps of the
hall, and the small highlights of the brass and of the eyes must give no ghost that flickers.

## 2. The measures

### The source of the flare

A temporary patch of `src/scene/post-shaders.ts` wrote the brightness of the bloom levels to the
canvas, as `log2(1 + b) / 4`: the level 1/8 in red, and the level 1/16 in green. The frames are
1440 × 900 at a pixel ratio of 1. `level_regions.py` reads them (`levels.txt`).

| Region of the frame | Level 1/8 | Level 1/16 |
|---|---:|---:|
| Hall lamps, Cinematic 115 s | 1.66 | 0.39 |
| Lit white fur of the rabbits, Cinematic 115 s | 1.84 | 0.92 |
| Horns of the pigs, Cinematic 86 s | 0.08 | 0.04 to 0.06 |

A plain threshold cannot keep the fur out and let the lamps in. A lamp is small, so the next
level holds much less of its light. Thus the flare takes the level minus 2 times the next level
(`FLARE_LOOK.broad`): 0.88 for a lamp, and 0 for the fur and for the horns.

The level index follows the drawing buffer. At a pixel ratio of 2, a lamp covers 4 times the
texels of each level, so the same index gives about 4 times the light. The flare takes the first
level at or below 180 px of height (`flareLevel()`): the level 1/8 at 900 px, and the level 1/16
at 1800 px.

### The flare of each frame

A second temporary patch wrote the flare target of the medium variant to the canvas, as
`log2(1 + f) / 4`. `flare_energy.py` reads it (`flare-medium.txt`). The title box of the page is
masked.

| Frame | Largest flare | Pixels above 0.02 |
|---|---:|---:|
| Cinematic 115 s (lamps in the frame) | 0.579 | 29,827 |
| Cinematic 27 s | 0.103 | 11,974 |
| Default view 30 s | 0.079 | 5,120 |
| Horns 86.0000 s | 0 | 0 |
| Horns 86.0417 s | 0 | 0 |
| Horns 86.0833 s | 0 | 0 |

The horns give no flare in the three frames, so no ghost can flicker. Before the subtraction,
the light of the horns (0.08) is already below the start of the knee (`threshold - knee`, 0.1).
The subtraction takes it to 0.

### The variants

`variants.json` holds the variants. Each variant changes only `FLARE_LOOK.strength`:

| Variant | `FLARE_LOOK.strength` |
|---|---:|
| `main` | no flare |
| subtle | 0.5 |
| medium (the default of the code) | 1 |
| strong | 2.5 |

The lineups have `main` in the first column:

- [`lineup-shot-115.webp`](2026-10-20-lens-flare/lineup-shot-115.webp): the close Cinematic shot
  of the conductor at 115 s, with the lamps of the hall in the frame.
- [`lineup-shot-27.webp`](2026-10-20-lens-flare/lineup-shot-27.webp): the side shot at 27 s, with
  far lamps.
- [`lineup-default-30.webp`](2026-10-20-lens-flare/lineup-default-30.webp): the default view at
  30 s.
- [`lineup-brass-86.webp`](2026-10-20-lens-flare/lineup-brass-86.webp): the pig hornists at 86 s,
  three frames 1/24 s apart.

The probe `flare-frames.ts` pauses the transport and seeks to the exact song time, with the step
of the seek bar set to `any`. Thus the brass frames are exactly 1/24 s apart
(`frames-branch.log`). The build of `main` has no dev hook, so `frames-main.log` gives no song
time. The motion that follows the wall time still moves a few edges between two runs. Commands:

```bash
node docs/research/2026-10-20-lens-flare/flare-frames.ts docs/research/2026-10-20-lens-flare/main.json --out <frames>
node docs/research/2026-10-20-lens-flare/flare-frames.ts docs/research/2026-10-20-lens-flare/variants.json --out <frames>
uv run --no-project --with pillow python -I docs/research/2026-10-20-lens-flare/lineup.py <frames> docs/research/2026-10-20-lens-flare
```

### The frame cost

`pnpm frame --gpu-only` on the development Mac (Apple M1 Max), `perf-60.mid` in Cinematic mode,
a drawing buffer of 2880 × 1800. The guard of the GPU phase was valid in both runs. `main` ran in
a temporary worktree of 186712f7 (`frame-main.log`), and the branch in its worktree with the
medium variant (`frame-branch.log`).

| Tree | Frames | GPU p50 (ms) | GPU p95 (ms) | GPU max (ms) |
|---|---:|---:|---:|---:|
| `main` | 369 | 7.80 | 8.01 | 8.31 |
| branch | 353 | 7.95 | 8.16 | 8.41 |

The flare pass adds about 0.15 ms of GPU time for each frame. At this buffer, it runs at the
level 1/16 (180 × 112 texels).

## 3. The result

The streak is the clearest part of the flare: a thin warm line through the row of lamps at the
top of the close shots. The ghosts are soft discs, faint on the lit players in the medium
variant, and clear in the strong variant. The default view has no lamp in its frame, so it shows
almost no change. The code holds the medium variant, and the user chooses the final variant.

Two tries failed. A ghost disc with a fixed radius in the image showed the pattern of its taps
for the small ghosts. A disc of 0.04 in the source showed the pattern again. The disc of 0.025 in
the source (`FLARE_LOOK.ghostRadius`) shows no pattern.
