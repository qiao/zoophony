# Shade on the bodies

Date 2026-10-18. Round "no shadow on the animals" (user, 2026-10-18). Decisions:
[`2026-10-18-body-shade.md`](../decisions/2026-10-18-body-shade.md). The probe outputs are in
[`2026-10-18-body-shade/`](2026-10-18-body-shade/). Each command runs from the root of the tree.

## 1. The question

The user said: "currently there's no shadow on the animals. They look plain, over-exposed,
low-contrast". The measures that decide: the share of each light on the faces that the camera
sees, the luma of the white fur in `pnpm look-lab`, and the frame time of `perf-60.mid`.

## 2. The measures

### 2.1 The share of each light

A probe with a temporary dev hook (not in the tree) turned each light on alone in the frame of the
camera `orchestra` of `pnpm close-views play` at 34 s, with the transport paused.

| Light alone | The fronts of the rabbits (the section at the left) |
|---|---|
| Key light | Black. Only the rims of the heads and the ears get light. |
| Side light at the left, near the rabbits | Lit from the camera side, almost as bright as with all lights. |
| Side light at the right, far from the rabbits | Lit from the right, with a shade side at the left. |
| Fill light and environment | Dim and warm, with soft steps. |

The rabbits stood inside the cone of 28° of the light at the left, and nearer to it than its aim
in the section at the right. Thus the near light gave them about the light of the far light, from
the other side, and each body had no shade side. The shadows of the key light fall on the backs,
which the camera does not see.

### 2.2 The look lab

`pnpm look-lab <dir>` at the start (`0c7ab083`) and after the light change (`03216576`). The
reference is `orchestra-latest.png`.

| Measure | Reference | Start | After |
|---|---|---|---|
| Stage luma p5 / p50 / p95, camera `orchestra` | 26 / 107 / 212 | 29 / 107 / 205 | 23 / 101 / 208 |
| Stage luma p5 / p50 / p95, camera `violins` | | 28 / 108 / 198 | 23 / 98 / 169 |
| White fur of the front rabbit, median luma | 163 | 176 | 143 |
| White fur, hue and saturation | 19°, 0.30 | 31°, 0.44 | 29°, 0.49 |
| Back of the conductor, median luma | 52 | 51 | 59 |
| Floor with the shadows of the players, luma p5, p90 / p5 | 63, 2.6 | 35, 4.2 | 31, 4.9 |

`before-after.webp` shows the frames of the cameras `orchestra` and `violins` at the start and
after the change.

### 2.3 The frame time

`frame_shade.sh` measures the start (A, `0c7ab083`) and the change (B, `03216576`) in turns, A B
A B, with `node tools/measure-frame.ts --no-metal`, as in
[`2026-10-18-light-frame-cost.md`](2026-10-18-light-frame-cost.md) (`logs/`). The time of a frame
is 1000 ms divided by the frame rate with no frame cap.

| Run | Frame rate with no cap | Time of a frame | Main thread p50 / p95 |
|---|---|---|---|
| A, round 1 | 180.7 fps | 5.53 ms | 4.57 / 5.72 ms |
| B, round 1 | 155.2 fps | 6.44 ms | 5.05 / 6.13 ms |
| A, round 2 | 181.7 fps | 5.50 ms | 4.63 / 5.78 ms |
| B, round 2 | 156.1 fps | 6.41 ms | 5.01 / 6.35 ms |

The two shadow maps of the side lights add about 0.9 ms of GPU time and 0.4 ms of main-thread
time in each frame of `perf-60.mid` on the high tier. Each map draws each player in its cone one
more time.

## 3. The result

The side lights stand at 1.4 S with a cone of 14°, so each one lights only the section on the far
side. They cast the shadows of the players on the players, and the players and the props take 0.6
of the fill light. The bodies now show a lit side, a shade side, and the shadows of the arms and
the instruments. The white fur moved from 176, above the reference, to 143, below it. Its median
holds the shade side, so the lit side of the fur stays bright.

The floor keeps the shadows of the key light alone. Its shadows got a little darker (p5 35 to 31),
because the near side light no longer lights the floor below the near section. The floor shadows
were already darker than the reference, so the stage takes the full fill light.

The white fur stays more yellow than in the reference. That open item of the cinematic light
(`TODO.md`) is a question of color, and this round did not change it.
