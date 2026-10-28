# The bow grip of the hippo bassist

Date 2026-10-28. Round `sixth-hippo-grip`. Decisions:
[`2026-10-28-hippo-grip.md`](../decisions/2026-10-28-hippo-grip.md). The probes, their outputs,
and the images are in [`2026-10-28-hippo-grip/`](2026-10-28-hippo-grip/). Each command runs from
the root of the tree. The round started at `main` 7712e55b3, and the final probes ran against
`main` 34e12b400.

## 1. The question

The user said on 2026-10-28: "also the hippo's arm is messed up. fix it", with a close image of
the bow arm from the right (`user-56.webp`), and "always take screenshots from all angles and
validate them to ensure things are fixed and no new regressions are introduced". The wrist round
and the paw round fixed the band of the wrist and the lump under the paw. Two faults stayed open
([`2026-10-28-hippo-paw.md`](2026-10-28-hippo-paw.md), section 7): the paw slid on the stick, up
to 2.4 cm off the middle of the paw, and in about 5% of the play the hand turned past the 70°
limit of `PAW_TURN`, so that the paw swung up to 41.6° off the forearm.

## 2. The cause

`probes/grip-probe.ts` measures each sample of the bassist sweep (`grip-main.txt`).

- **The slide.** The bow is fixed in the hand of the player, and the retarget turns the paw
  toward the forearm in the plane of the palm. Over a stroke, the forearm angle runs from 26° to
  64° (bowing, p5 to p95), so the middle of the paw moves on an arc around the wrist. The grip
  lay 2.5 cm from the middle of the paw toward the frog (`probes/paw-middle.ts`).
- **The pizzicato.** Each sample past 70° is a pizzicato sample, with the forearm at 92° to 109°.
  The bow tip pointed up, left, and forward, so the plucking hand was bent back on the forearm,
  and the paw swung 22° to 41°.
- **The stop in pizzicato.** The worst gap (2.43 cm) and the worst swing (82°) of `main` are in
  the lowering at the end of `boulanger-matin`, which starts in pizzicato
  (`probes/move-probe.ts`, `move-main.txt`): there the forearm angle goes up to 152°.

## 3. The fix

| Commit | Change |
|---|---|
| `feat(pose): add a turn of the bow hand around the grip on the stick` | `turnOnStick()` of `pose/bowed.ts` turns the bow hand in the plane of its palm around the grip, so that the solved forearm keeps one angle in that plane (`BowedHold.stickTurnR`). The `bow` bone turns back by the same turn, so the bow keeps its place on the strings. No hold uses it yet. |
| `fix(pose): turn the hippo bow hand around the middle of its paw` | The hippo hand keeps 45°, with a turn of up to 90°, and the grip lies in the middle of the paw (`bowGrip`, from `paw-middle.txt`). |
| `fix(pose): point the hippo pizzicato tip straight up with a higher elbow` (after a first tip) | `pizzicatoTip` [0, 1, 0], up and square to the strings, and `polePizzicato` [3, 0.9, -1]. |
| `fix(pose): lower the hippo bow elbow at the tip a little` (after a first raise) | `poleTipR` [2, 0.15, -1]. |
| `fix(pose): move the hippo rest grip out in place of down` (after a first lower) | `restBow.lap.offset` [0.8, 1, -0.4]. |

The paw keeps one turn on the hand, so the stick keeps its place in the paw. The bow turns in the
paw by the turn of the hand, about as much as on `main`: the stick angle in the paw runs from
-62° to -29° in the bowing (p5 to p95, -66° to -28° on `main`).

The scans:

- With the grip of `main`, the turn left a gap of 0.9 cm to 1.7 cm (`scan-turn-old-grip.txt`).
- Each pizzicato tip that points down bent the plucking hand back by 130° to 170°
  (`scan-pizz-tips.txt`). With the tip up, forward, and a little out, the straight paw twisted
  159° in the lowering after a pizzicato, past the move twist of `main` (144°) in the arm gate
  (`scan-twist.txt`).
- With a share 1 - weight³ of the turn that the bow takes with the hand in the moves, the bow went
  4.1 cm into the contrabass (`scan-depth-share.txt`).
- With the elbow level at the tip, the right upper arm went 3.0 cm into the body, and with the
  elbow of the frog, face 443 folded in 0.3% of the play (`scan-depth-tip-elbow.txt`,
  `scan-fold-tip-elbow.txt`). At the rest grip of `main`, faces 469 and 470 folded at rest, and
  0.1 H lower, the upper arm went 6.2 cm into the body (`scan-rest.txt`).

## 4. The measures

`main` is 34e12b400.

| Measure | main | Round | Output |
|---|---|---|---|
| Stick gap to the middle of the paw, each sample: p50 / max | 1.08 / 2.43 cm | 0.02 / 0.35 cm | `grip-main.txt`, `grip-round.txt` |
| Stick gap, bowing: p50 / max | 1.02 / 1.77 cm | 0.02 / 0.05 cm | same |
| Stick gap, pizzicato: p50 / max | 1.72 / 1.87 cm | 0.03 / 0.03 cm | same |
| Stick depth in the closed paw: min | 1.40 cm | 1.81 cm | same |
| Forearm angle in the plane of the palm: p5 / p95 | 27° / 104° | 44.9° / 45.1° | same |
| Samples past the 70° limit of `PAW_TURN` | 16.9% | 0% | same |
| Paw swing, play at 0.25 s steps: p95 / max | 2.0° / 41.6° | 2.1° / 5.4° | `swing-main.txt`, `swing-round.txt` |
| Stop in pizzicato: swing max, gap max | 82° / 2.43 cm | 22° / 0.35 cm | `move-main.txt`, `move-round.txt` |
| Stop in pizzicato: stick angle in the paw | -72° to -50° | -124° to -45° | same |
| Stop in pizzicato: frog part of the stick to the forearm line, min | 1.2 cm | 2.1 cm | same |
| Stop in pizzicato: paw twist on the forearm, max | 139° | 139° | same |
| Folds of the bassist: play / lift / rest | 9.7% / 0% / 0% | 8.9% / 0% / 0% | `fold.txt` |
| Right upper arm in the body: play / rest | 2.8 / 6.1 cm | 2.8 / 5.7 cm | `depth.txt` |
| Poses (`pnpm body-probe --base main`) | | 1,420 of 1,492 equal | `body-probe.txt` |
| Arm gate, bassist right: move twist max / move turn max | 144° / 1,380°/s | 140° / 881°/s | `gate-all.txt` |
| First download | 837,128 B | 837,387 B (+259 B) | `size.txt` |

`pnpm arm-check --all --base main` (`gate-all.txt`): 23 roles, no `FAIL`. Each value of the right
arm of the bassist is equal or better. The left paw twist of the bassist and the rest folds of the
pianist stay `OPEN` as on `main`.

`pnpm pose-depth bassist --base main`: no `GROWS`. `pnpm fold-probe bassist --base main`: no new
folded face (`fold-faces.txt`), and face 883 of the chest goes. `pnpm body-probe --base main`:
only the hippo players change. `pnpm carry-check bassist` does not apply (`carry.txt`).
`pnpm rig-mesh hippo --check` gives the reach of `main`, 0.539 m (`rig-check.txt`).

## 5. The images

`main` is above the round in each image.

- `u56-30.webp` and `u56-52.webp`: the cameras of image 56 at 30 s (bow) and 52.13 s
  (pizzicato) of `boulanger-matin` (`pnpm close-views play <dir> --demo boulanger-matin
  --camera-file cams.json --time 30 --time 52.13 --base main`, `probes/pairs.py`). At 52.13 s,
  the paw of `main` bends back, and the stick leaves it at the claws. The paw of the round lies
  on the line of the forearm.
- `paw-close-30.webp` and `paw-close-52.webp`: the paw from az60, az90, az120, az150 at
  elevation 20, and az90 and az150 at 40, from the `paw-` cameras of the same run.
- `sheet-e20-<view>.webp` and `sheet-e40-<view>.webp`: each moment of the role (frog, tip,
  crossing, rest, lift30 to lower70) from the front, the back, the left, the right, ±35°, and
  ±150° (`pnpm close-views bassist <dir> --views front,back,left,right,35,-35,150,-150 --moments
  frog,tip,crossing,rest,lift30,lift50,lift70,lower30,lower50,lower70 --elevation <e> --zoom 1
  --scale 2 --sheet --box 0.05,0.2,0.9,0.5 --base main`).
- `paw-e20-<view>.webp` and `paw-e40-<view>.webp`: each cell cut where the round differs
  (`probes/paw-crops.py`). Each change is at the bow paw, the stick, and the rest paw, which hangs
  a little further out. No view shows a new fold, slit, or notch.
- `pizz-e20-a.webp`, `pizz-e20-b.webp`, `pizz-e40-a.webp`, and `pizz-e40-b.webp`: the pizzicato
  at 52.13 s from the front, the right, the back, the left, ±35°, and ±150° (`pnpm close-views
  play <dir> --demo boulanger-matin --at hippo --azimuth <a>... --zoom 2 --elevation <e> --time
  52.13 --base main`).
- `others-<role>-<view>.webp`: the rabbit, the red fox, the cat, and the dog at each moment of
  their roles from the front, the back, and both sides at elevation 40 (`pnpm close-views <role>
  <dir> --views front,back,left,right,150,-150 --elevation 40 --zoom 1 --sheet --box
  0.05,0.2,0.9,0.5 --base main`). Each pair looks the same, and the pixel counts
  (`others-pixels.txt`) are of the size of the render noise of the paw round.

## 6. Open

- **The stop in pizzicato.** The path of the bow from the pluck to the rest
  (`liftMix()`, `BowVia` of `pose/bowed.ts`) turns the forearm up to 79° off its angle in the plane
  of the palm. The bow then turns 79° in the paw in about 0.6 s, and the paw swings up to 22°
  toward the palm. On `main` the paw bent 82° there. `close-views` renders no moment of a stop
  after a pizzicato, so this move has no image.
- The bassist left paw twist and the rest folds of the pianist stay `OPEN` as on `main`.
