# The bench of the polar bear pianist

Date 2026-10-27. Round `sixth-polar-bench`. Decisions:
[`2026-10-27-polar-bench.md`](../decisions/2026-10-27-polar-bench.md). The probes and their
outputs are in [`2026-10-27-polar-bench/`](2026-10-27-polar-bench/). Each command runs from the
root of the tree. "Main" is the base of each `--base main` run: `61889eec` in phase 1, and
`d330dd14` for the gates of phase 2.

## 1. The question

The user looked at the pianist from its left side and asked: "should the polar bear's seat be
taller for it to be more natural?" On `main`, the bear sat on a bench of 0.230 m. Its thighs
sloped 5° down to knees at 0.34 m, so it squatted. Phase 1 made three variants. The user chose
the bench of 0.38 m and "keep": the seated size of `main`.

## 2. The checks of the brief

`reference-side.txt` measures the side view of `polar-bear-views.png` in pixels.

- The keys of the app stand at 0.81 m (`PIANO.keyTop` × `PIANO_SCALE`), not 0.70 m. Against
  the head top of the bear, the reference puts the bench top at 0.28 of the head top: about
  0.39 m for a head top of 1.42 m.
- The head top of `main` is 1.50 m in the play and 1.54 m at rest (`bench-probe.txt`), not
  1.42 m: the upright hold of 2026-10-24 raised it after the size round.
- The haunch did not hang over the back of the bench. The bench reached 8.3 cm behind the
  haunch, and its front edge lay under the hip joints, so the thighs did not touch it.

## 3. The variants

`probes/variants.txt` and `probes/apply-variant.sh` give the three variants of phase 1, each
with the play head top at 1.42 m (`bench-probe.txt`, `rig-check.txt`, `side.webp`,
`views-play.webp`, `views-rest.webp`). Their forearms sloped 5°, 10°, and 15° down to the keys.

## 4. The chosen seat

| Measure | `main` | Round |
|---|---|---|
| Bench top | 0.230 m | 0.382 m |
| Bench depth | 0.35 m | 0.35 m |
| Haunch in front of the back edge of the bench | 8.3 cm | 0.4 cm |
| Hip joint and knee joint | 0.37 m and 0.34 m | 0.50 m and 0.50 m |
| Thigh below the level, shin from the vertical, knee | 5°, 0°, 95° | 0°, 0°, 90° |
| Head top in the play and at rest | 1.50 m and 1.54 m | 1.46 m and 1.535 m |
| Scale | 1.6346 m/u | 1.4389 m/u (0.880) |

The play values are the medians of `bach-bwv1047` (`bench-final.txt`). With the hold of `main`,
the head top of the round is 1.50 m in the play. The lean of section 5 lowers it to 1.46 m.

- **The legs.** `shinFactor` 3.208 makes the shins longer, and the thighs keep `legFactor` 1.6.
  `leg_turns.py` of `2026-10-16-hip-open/` with `0 15 0` makes the thighs level. The knee keeps
  its form (`knee-rays.txt`, `knee-edges.txt`): the stretch moves each shin point along the
  bone only.
- **The bench.** `benchFitOf()` of `tools/studio-body.ts` puts the back edge 2 cm behind the
  haunch, and the front edge under the thighs until their underside goes 1 cm below the seat
  top. With a limit of 2 mm, a dip of 6 mm at the groin stopped the bench at 0.25 m. The bench
  has the parts of the reference bench in 100 triangles.
- **The hips.** With level thighs, 2 faces of the hips turned over in the bind. 12 rounds of
  `crease` and 8 rounds of `sit.smooth` turn none over (`hips-scan.txt`). `studio.trunk.open` 4
  also did it, but folded more arm faces.

## 5. The hold fit

The shoulder joints stand about 0.3 m above the keys, and the upper arm is 0.227 m long. Thus
the hold of `main` put the elbows 13 cm above the keys and sloped the forearms 22° down. Nearer
keys alone did not lower the elbows (`hold-scan.txt`). The lean and the shoulder drop lower the
shoulders, and elbows that point down hang the upper arms nearer to the vertical. The fit:

- `lean` 23° (14° on `main`): the spine bends 19.3°, under the 20° of a neutral thorax. At 22°,
  one far left note missed by 6.8 mm.
- `shoulderDrop` 20° (6°): at 26°, the left arm folded 23 faces at p95 (19 on `main`).
- `poleL`, `poleR` (±1, −1.6, 0.4), from (±1, −0.8, 0.4).
- `PIANO_FRONT_H` 1.3 (1.16): the elbows bend 106°. At 1.0, they bent 85°.

The elbows are 6.5 cm and 5.9 cm above the keys (7.1 cm and 6.3 cm on `main`), and the forearms
slope 3.2° and 1.8° down (4.3° and 2.5°), over the play of the four demos (`posture-round.txt`,
`posture-main.txt`, `probes/posture.ts`).

## 6. The gates

| Gate | Result | Output |
|---|---|---|
| `pnpm arm-check --all --base main` | no `FAIL`. The pianist folds p95 19 and 15, as on `main` (`OPEN`) | `arm-check-all.txt` |
| `pnpm pose-depth pianist --gaps --base main` | each note target within 5 mm. Forearms 8.8 cm into the body (7.9 cm, limit 9 cm), upper arms 10.3 cm (8.2 cm) | `pose-depth.txt` |
| `pnpm fold-probe pianist --base main --faces 60` | rest 34, play 34 (32), lift 34. 8 new faces at the shoulders and 1 of the hips, 2 gone | `fold-probe.txt` |
| `pnpm hold-fit pianist --demo all --base main` | upper arm turn 51° and 47° (63° and 60°), paw twist −1° and 3° (−14° and 15°) | `hold-fit.txt` |
| `pnpm rig-mesh polar-bear --check` | 5,106 triangles, reach 0.463 m, 2.9% dark faces | `rig-check-final.txt` |
| `pnpm body-probe --base main` | only the polar bear bodies and the pianist change. The poses of the other players move with the layout | `body-probe.txt` |
| `pnpm carry-check violinist,fox-violinist,violist --base main` | each value of `main` | `carry-check.txt` |
| `pnpm size --base main` | 828,436 B, −3,923 B | `size.txt` |
| `pnpm test:paused` of the pianist, the piano, and the props | the 19 failures of `main`, and no other | `tests.txt` |

The round changes no file of `src/scene/` and no shader, so it runs no `pnpm frame`.

## 7. The wrist baseline

The user saw a crease around the wrist. `probes/posture.ts` gives the wrist bend, mean
[p5, p95]:

| Paw | Rest, `main` / round | Play, `main` | Play, round | Far left keys p95, `main` / round |
|---|---|---|---|---|
| Left | 35.9° / 36.0° | 4.3° [−3.0°, 11.5°] | 3.2° [−3.7°, 10.8°] | 13.4° / 15.5° |
| Right | 32.9° / 33.2° | 2.5° [−7.8°, 10.1°] | 1.8° [−7.8°, 9.5°] | 14.3° / 14.1° |

No face of the hand, the wrist helper, the fingers, or the last two forearm segments folds on
`main` or in the round (`fold-probe.txt`, the 60 faces that fold most). The forearm twist p95
is 13° and 11° (8° and 8°), and the grip turn p50 21° and 28° (9° and 16°, limit 45°).

## 8. The images

`main` is above the round in each image.

- `final-side.webp`, `final-views-play.webp`, `final-views-rest.webp`: the stage from the left,
  the back, and the angle of image 47 (`--at polar-bear --azimuth -80 --elevation 8 --zoom 1
  --size 434x726 --time 30`), the gallery from the front over the desk and from 35°, and the
  default view (`probes/render-variant.sh`, `probes/sheet.py`).
- `e20-<view>.webp`, `e40-<view>.webp`: the moments chord, between, far-left, far-right, and rest
  from the front, the back, each side, 150, −150, and −35. The case and the lid hide the body
  from the front and from −35. The role has no lift or lowering moment in `close-views`.
- `crops-<view>.webp`: 2x crops of the knees and the haunch on the bench.

## 9. Open

- The play head top is 1.46 m with the lean.
- The upper arms go 2.1 cm deeper into the trunk at the worst sample, and 8 faces at the
  shoulders fold in more play samples than on `main`.
- The thighs press up to 6 mm into the pad of the bench.
