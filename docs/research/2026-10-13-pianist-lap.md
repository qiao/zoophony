# The lap pose of the pianist (2026-10-13)

On 2026-10-13, the user looked at the rest pose of the polar bear pianist of `6dbe9953` in the
app and said: "the pose is still strange. Identify what's the common pose for real pianist when
they're preparing for a performance". The screenshot of the user showed the bear from behind and
from the left: a round, slumped back, the head forward, and the arms that hung down to the
height of the bench.

This report gives the rest position of a real pianist, the measures of the rest pose on `main`
(`6dbe9953`), on the branch (`aee668b6`), and in the `ready` clip of the studio, and the search of
the lap pose. The decisions are in
[`2026-10-13-pianist-lap.md`](../decisions/2026-10-13-pianist-lap.md).

## 1. The rest position of a real pianist

The manager of the round collected these facts from the sources below. The agent did not open the
sources again.

- A Suzuki checklist for the moment before the first note: "sitting ... tall, strong in the small
  of their back, head up, shoulders down, elbows relaxed, pianists with both hands resting on
  lap". Then the player lifts the hands to the keyboard
  (<https://europeansuzuki.org/assets/Uploads/Ready-Steady-Go-Preparing-for-the-first-note.pdf>).
- Posture guides agree on the seat: a straight back with at most a slight lean toward the piano,
  the shoulders relaxed, the elbows a little in front of the trunk at about the height of the
  keys, and the forearms about level with the keys
  (<https://www.musicradar.com/how-to/how-to-sit-correctly-at-the-piano>,
  <https://www.dummies.com/art-center/music/piano/good-piano-posture/>).
- The `ready` clip of the studio (`clip_ready()` of `lowpoly-studio/roles/pianist/clips.py`)
  leans the trunk 0.8 of the play lean of the studio (0.8 × 12° = 9.6° over spine, spine1, and
  chest), pitches the head 2° up, and puts both paws over the first notes. It is upright and
  alert, with the elbows by the sides.

In the app, the rest pose is the pose with the instrument down (design 5.2). For a pianist, the
hands rest in the lap. The lift of the count-in brings the paws to the keys, as a real pianist
lifts the hands when the conductor signals.

## 2. Method

The probes are in [`2026-10-13-pianist-lap/`](2026-10-13-pianist-lap/). Run each one from the
repository root.

- `node docs/research/2026-10-13-pianist-lap/measure-rest.ts [--set <changes>] [--studio <s>]`
  measures the rest pose of the pianist of each demo with a piano (before the first play, wall
  time 10 s), and the `ready` clip of `lowpoly-studio/animals/polar-bear/out/polar-bear.glb` at
  1.5 s. The trunk lean is the angle of the line from the hips joint to the neck joint from the
  vertical, in the side view: the method of
  [`2026-10-13-pianist-rest.md`](2026-10-13-pianist-rest.md), section 2. The probe gives the
  values of that report for `main`: 20.8°, the wrist 0.29, 0.22, and 0.09 m from the knee, and an
  upper arm angle of 49.9°. The head pitch is the angle of the forward axis of the head from the
  level. The paw gap is the smallest distance from the paw and the claws to the trunk, the hips,
  and the legs. The depths are the deepest points of the arm parts in the closed body, as the
  sweep measures them.
- `node docs/research/2026-10-13-pianist-lap/search-lap.ts <tries> [seed] [center JSON]` tries
  rest holds at random (section 4).
- `node docs/research/2026-10-13-pianist-lap/pose-hash.ts > <file>` prints a hash of the pose of
  each player and of the conductor of each demo at rest, in the lift, and in the first 20 s of a
  play (section 6).
- `pnpm pose-depth pianist` and `pnpm fold-probe pianist` give the sweep and the folds.

The head pitch of the studio uses the forward axis (+z) of the bind pose of its head. The head of
the bind pose of the studio may not look level, so the studio value is not a direct target.

## 3. Measures

The app columns are the Bach demo. The Boulanger demo is in parentheses where it differs.

| Measure | main | branch | studio `ready` |
|---|---:|---:|---:|
| Trunk lean | 20.8° (21.5°) | 10.4° (11.0°) | 9.4° |
| Head pitch | -0.1° (-1.6°) | -0.1° (-1.6°) | -7.2° (bind axis) |
| Palm from the middle line (knee 0.28 m) | 0.59 m | 0.23 m | not measured |
| Palm height above the floor | 0.53 m | 0.66 m | not measured |
| Paw gap to the body, L / R | 11.5 / 11.4 cm | 0.3 / 0.8 cm | not measured |
| Wrist from the knee (out, up, forward) | 0.29, 0.22, 0.09 m | -0.05, 0.38, 0.23 m | -0.02 to 0.10, 0.55, 0.22 m (on the keys) |
| Elbow from the shoulder (out, up, forward) | 0.27, -0.23, 0.04 m | 0.12, -0.20, 0.26 m | 0.16 to 0.23, -0.19 to -0.22, 0.18 to 0.23 m |
| Upper arm angle in the back view | 49.9° | 31.4° | 35.8° and 50.2° |
| Depth at rest: paws, claws, forearms, upper arms | 0.0, 0.0, 0.0, 0.0 cm | 0.0, 0.0, 0.6, 0.0 cm | not measured |

The trunk lean of the branch is 1.0° (Bach) and 1.6° (Boulanger) more than the `ready` clip,
within the 3° of the brief. A rest lean of 7° gives 9.6° (`measure-rest.ts --set 'piano.restLean=7deg'`), but the
random search found less depth with 8° to 9°, because the shoulders come forward over the belly.

## 4. The lap of the round polar bear

`profile-body.ts --set 'piano.restLean=7deg'` cuts the skin of the trunk and the legs at rest
with lines along x, y, and z:

- The front of the belly is nearly vertical from 0.30 m to 0.75 m above the floor, at z = -0.53 m
  to -0.62 m in the model axes (the hips joint is at -0.10 m, the knee joint at -0.39 m). It
  covers the thighs and reaches the front of the knees.
- The top of the leg above the knee joint, as `lapPoint()` finds it, is the belly at 0.59 m.
- The shoulder joint is 1.02 m above the floor. The upper arm is 0.35 m long and the forearm
  0.23 m.

Thus the body has no level lap in front of the belly, and a palm down on the thighs is not
possible. The paws can rest on the front of the belly over the thighs.

`search-lap.ts` tried 400 holds at a time. The score adds the depth over 0.5 cm, the gap over
0.8 cm, 0.1 for each degree of the upper arm over 30° in the back view, and a weight times the
palm height over 0.55 m. The lowest palms with each depth:

| Palm height | Deepest part at rest | Upper arm angle |
|---:|---:|---:|
| 0.56 m | forearms 3.7 cm | 10° |
| 0.60 m | forearms 1.8 cm | 34° |
| 0.62 m | forearms 1.2 cm, claws 0.3 cm | 33° |
| 0.66 m (branch) | forearms 0.5 cm | 31° |

The first runs with no weight on the height found many holds with no depth, with the palms at
0.69 m to 0.77 m. The branch takes the try of 0.66 m (`search-lap.ts 250 5` near the try of
0.65 m of `search-lap.ts 400 41` with `YW=30`), with the values rounded. The palm faces in and back
to the belly, and the fingers point down and in along it. The elbows point out and a little
forward, as arms that hold a ball.

## 5. The lift, the lowering, and the folds

`pnpm pose-depth pianist` on the branch, deepest of the two demos:

| Set | Part | main | branch |
|---|---|---:|---:|
| play | forearms in the body | 8.0 cm | 8.0 cm |
| play | upper arms in the body | 2.9 cm | 2.9 cm |
| play | claws in the case | 0.1 cm | 0.1 cm |
| lift | forearms in the body | 0.0 cm | 0.6 cm |
| lift | claws in the case | 0.1 cm | 0.1 cm |
| rest | forearms in the body | 0.0 cm | 0.6 cm |
| lower | claws in the case | 0.9 cm | 0.1 cm |
| lower | forearms in the body | 8.0 cm | 7.9 cm |
| lower | upper arms in the body | 2.7 cm | 2.7 cm |

The paws and the claws stay out of the body in each set, and the note-target error stays 0.00 mm.
The arc of the paws (`restArc`) does not change. A temporary query of the gallery showed the lift
at 0.3 s, 0.6 s, 0.9 s, and 1.2 s after the start from the left, the back, and the keys: the paws
rise from the belly to the keys, and the elbows go out a little in the middle of the lift.

`pnpm fold-probe pianist`: no face folds at rest (2 samples) or in the lift (62 samples). A play
keeps up to 8 folded faces, as on `main`.

## 6. The other players

`pose-hash.ts` on `main` and on the branch gives 168 players and conductors of the six demos.
Only the pianist of the Bach demo and of the Boulanger demo change, at rest and in the lift.
Each play pose, the harp player, and each other player keep the hash of `main`.

## 7. Images

- [`rest-views.webp`](2026-10-13-pianist-lap/rest-views.webp): the rest pose from the front, the
  left, the right, the back, and the keys. The rows are the `ready` clip of the studio, `main`,
  and the branch.
- [`first-screen.webp`](2026-10-13-pianist-lap/first-screen.webp): the first screen of the default
  demo on the branch, and the pianist of the first screen on `main` and on the branch. The first
  screen shows the bear from behind and from the left, as the screenshot of the user.

On the branch, the trunk is upright, the head is up, and the paws rest on the front of the belly
over the thighs. The back hides the arms. The front close view shows both eyes over the lid.
