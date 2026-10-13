# The lap pose of the pianist (2026-10-13)

On 2026-10-13, the user looked at the rest pose of the polar bear pianist of `6dbe9953` in the
app and said: "the pose is still strange. Identify what's the common pose for real pianist when
they're preparing for a performance". The screenshot of the user showed the bear from behind and
from the left: a round, slumped back, the head forward, and the arms that hung down to the
height of the bench.

This report gives the rest position of a real pianist, the measures of the rest pose on `main`
(`6dbe9953`), on the first try of the branch (`2ca2452f`), on the branch after the review
(`d64bb074`), and in the `ready` clip of the studio, and the search of the lap pose. The decisions are in
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
  rest holds at random for the first try, and `search-lap-low.ts` for the paws low in the lap
  (section 4).
- `node docs/research/2026-10-13-pianist-lap/lift-arms.ts [--set <changes>]...` gives the angle
  of the upper arms in the back view at rest and its peak in the lift (section 5).
- `node docs/research/2026-10-13-pianist-lap/profile-body.ts` cuts the body skin (section 4).
- `node docs/research/2026-10-13-pianist-lap/pose-hash.ts > <file>` prints a hash of the pose of
  each player and of the conductor of each demo at rest, in the lift, and in the first 20 s of a
  play (section 6). `pnpm body-probe --base main` now does this, with the lowering.
- `pnpm pose-depth pianist --gaps` and `pnpm fold-probe pianist` give the sweep, the gaps, and
  the folds.

The head pitch of the studio uses the forward axis (+z) of the bind pose of its head. The head of
the bind pose of the studio may not look level, so the studio value is not a direct target.

## 3. Measures

The app columns are the Bach demo. The Boulanger demo is in parentheses where it differs. "First
try" is the pose of `2ca2452f`, which the review of the branch rejected (section 4).

| Measure | main | first try | branch | studio `ready` |
|---|---:|---:|---:|---:|
| Trunk lean | 20.8° (21.5°) | 10.4° (11.0°) | 10.4° (11.0°) | 9.4° |
| Head pitch | -0.1° (-1.6°) | -0.1° (-1.6°) | -0.1° (-1.6°) | -7.2° (bind axis) |
| Palm from the middle line (knee 0.28 m) | 0.59 m | 0.23 m | 0.27 m | not measured |
| Palm height above the floor | 0.53 m | 0.66 m | 0.62 to 0.63 m | not measured |
| Paw gap to the body, L / R | 11.5 / 11.4 cm | 0.3 / 0.8 cm | 0.9 / 0.0 cm | not measured |
| Palm point to the body | not measured | 8.1 cm (review) | 7.6 cm | not measured |
| Paw gap to the case of the piano | 11.9 cm (review) | 0.5 cm | 6.7 cm | not measured |
| Wrist from the knee (out, up, forward) | 0.29, 0.22, 0.09 m | -0.05, 0.38, 0.23 m | 0.03, 0.32, 0.18 m | -0.02 to 0.10, 0.55, 0.22 m (on the keys) |
| Elbow from the shoulder (out, up, forward) | 0.27, -0.23, 0.04 m | 0.12, -0.20, 0.26 m | 0.11, -0.32, 0.11 m | 0.16 to 0.23, -0.19 to -0.22, 0.18 to 0.23 m |
| Upper arm angle in the back view | 49.9° | 31.4° | 19.6° | 35.8° and 50.2° |
| Depth at rest (sweep): forearms, upper arms | 0.0, 0.0 cm | 0.6, 0.0 cm | 2.8, 1.5 cm | not measured |

The trunk lean of the branch is 1.0° (Bach) and 1.6° (Boulanger) more than the `ready` clip,
within the 3° of the brief. A rest lean of 7° gives 9.6°
(`measure-rest.ts --set 'piano.restLean=7deg'`), but the random search of the first try found
less depth with 8° to 9°, because the shoulders come forward over the belly.

The paw gap is the gap of the paw with its claws. The palm point is in the middle of the thick
paw, so it is 7.6 cm from the skin while the paw touches the belly.

## 4. The lap of the round polar bear

`profile-body.ts --set 'piano.restLean=7deg'` cuts the skin of the trunk and the legs at rest
with lines along x, y, and z:

- The front of the belly is nearly vertical from 0.30 m to 0.75 m above the floor, at z = -0.53 m
  to -0.62 m in the model axes (the hips joint is at -0.10 m, the knee joint at -0.39 m). It
  covers the thighs and reaches the front of the knees.
- The top of the leg above the knee joint, as `lapPoint()` finds it, is the belly at 0.59 m. The
  key top of the piano is at 0.70 m.
- The shoulder joint is 1.02 m above the floor. The upper arm is 0.35 m long and the forearm
  0.23 m.

Thus the body has no level lap in front of the belly, and a palm down on the thighs is not
possible. The paws can rest on the front of the belly over the thighs.

### 4.1 The first try

`search-lap.ts` tried 400 holds at a time. The score adds the depth over 0.5 cm, the gap over
0.8 cm, 0.1 for each degree of the upper arm over 30° in the back view, and a weight times the
palm height over 0.55 m. The lowest palms with each depth:

| Palm height | Deepest part at rest | Upper arm angle |
|---:|---:|---:|
| 0.56 m | forearms 3.7 cm | 10° |
| 0.60 m | forearms 1.8 cm | 34° |
| 0.62 m | forearms 1.2 cm, claws 0.3 cm | 33° |
| 0.66 m (first try) | forearms 0.5 cm | 31° |

The first try took the hold of 0.66 m. The palms faced in and back, and the elbows pointed out
and 0.26 m forward. The review of the branch found that the paws were not in the lap: the claws
were 0.5 cm from the case under the keys, and from the left and from behind the bear held its
paws up at the keys, as before a first chord. That report claimed that the targets of the arms
and the paws held. They did not.

### 4.2 The paws low in the lap

`search-lap-low.ts` keeps the rest lean of 8° and accepts depths up to 3 cm, the room of the
brief. Its score also counts the gap of the paws to the case under 5 cm, the elbow forward of the
shoulder over 10 cm (weight `FW`), and a palm side that faces down less. `search-lap-low-runs.sh`
holds the commands of the runs, with their ranges:

| Run | Lowest palm within 3 cm | Elbow forward | Upper arm angle | Gap to the case |
|---|---:|---:|---:|---:|
| `400 29` near the 0.60 m hold of 4.1 | 0.60 m (forearms 2.1 cm) | 0.20 m | 31° | 5.2 cm |
| `400 31` with `FW=1` | 0.63 m (forearms 2.5 cm) | 0.11 m | 19° | 5.8 cm |
| `300 43` with `YW=4 FW=0.6` | 0.61 m (forearms 3.0 cm) | 0.13 m | 19° | 5.5 cm |

A palm low on the belly needs a straight arm in front of the belly or the elbows forward. With
the elbows by the sides, the forearms lie on the belly, and each 1 cm lower costs about 0.2 cm of
depth. The close views of three holds are in `variants.webp`: the first try, the lowest hold
within 3 cm (palms 0.60 m, elbows 0.20 m forward), and the branch (palms 0.62 to 0.63 m, elbows
0.11 m forward). From the left, the first try and the lowest hold show the forearms forward and
the paws up in front of the belly. The branch shows the upper arms down by the sides and the
forearms along the belly to the paws in the lap. It is nearest to a pianist with the hands in the
lap. Its palms face back and down, and the fingers point in, toward each other. A hold of the
branch at 0.62 m put the forearms 2.9 cm into the belly, at the limit, so the branch keeps
0.62 m to 0.63 m with 2.8 cm in the sweep.

## 5. The lift, the lowering, and the folds

`lift-arms.ts` gives the largest angle of the upper arms in the back view over the lift, with the
branch rest place (Bach and Boulanger):

| Arc of the wrists (`restArc`) | Rest | Lift peak |
|---|---:|---:|
| 0.5 H out, 0.5 H up (first try) | 19.6° | 61.0° (0.50 s) |
| 0.2 H out, 0.5 H up | 19.6° | 50.7° |
| 0.1 H out, 0.4 H up | 19.6° | 40.6° |
| 0.4 H up (branch) | 19.6° | 36.8° (Bach 1.45 s, a play) and 34.2° (Boulanger) |
| 0.5 H up | 19.6° | 38.9° |

With the first try, the review measured 71.3° at 0.4 s. With the branch arc, the upper arms stand
out no further than in a play.

`pnpm pose-depth pianist --gaps` on the branch, deepest of the two demos:

| Set | Part | main | branch |
|---|---|---:|---:|
| play | forearms in the body | 8.0 cm | 8.0 cm |
| play | upper arms in the body | 2.9 cm | 2.9 cm |
| play | claws in the case | 0.1 cm | 0.1 cm |
| lift | forearms in the body | 0.0 cm | 2.8 cm (accepted 3 cm) |
| lift | upper arms in the body | 0.0 cm | 1.5 cm (accepted 3 cm) |
| lift | claws in the case | 0.1 cm | 0.1 cm |
| rest | forearms in the body | 0.0 cm | 2.8 cm (accepted 3 cm) |
| rest | upper arms in the body | 0.0 cm | 1.5 cm (accepted 3 cm) |
| rest | gap of the paws to the body, L / R | not measured | 0.9 / 0.0 cm |
| rest | gap of the head to the case | not measured | 12.5 cm |
| lower | claws in the case | 0.9 cm | 0.1 cm |
| lower | forearms in the body | 8.0 cm | 8.1 cm |
| lower | upper arms in the body | 2.7 cm | 2.7 cm |

The paws stay out of the body in each set, the claws go at most 0.6 cm into it, and the
note-target error stays 0.00 mm. A temporary query of the gallery showed the lift at 0.3 s,
0.6 s, 0.9 s, and 1.2 s after the start from the left, the back, and the keys (`lift-views.webp`):
the paws rise from the lap to the keys, and the back view shows no wing arms.

`pnpm fold-probe pianist`: no face folds at rest (2 samples) or in the lift (62 samples). A play
keeps up to 8 folded faces, as on `main`.

## 6. The other players

`pnpm body-probe --base main` gives 95 of 95 bodies, 23 of 23 players, and 664 of 672 pose sets
equal. The 8 other sets are the rest, the lift, the play, and the lowering of the pianist of the
Bach demo and of the Boulanger demo. The play set starts at the count-in, and the rest pose
changes the lift and the lowering. In a play, the rotation of the left paw is the same rotation,
with the opposite sign of its quaternion: the mix of the rest and the playing rotation keeps the
shorter path, so its sign follows the rest rotation. A probe that compared each rotation with
both signs found no difference in the first 20 s of the Bach demo. `pose-hash.ts` gives 168
players and conductors of the six demos, and only the two pianists change.

## 7. Images

- [`rest-views.webp`](2026-10-13-pianist-lap/rest-views.webp): the rest pose from the front, the
  left, the right, the back, and the keys. The rows are the `ready` clip of the studio, `main`,
  and the branch.
- [`variants.webp`](2026-10-13-pianist-lap/variants.webp): the first try, the lowest hold within
  3 cm, and the branch, from the left, the back, the keys, and the front, and in the first screen.
- [`lift-views.webp`](2026-10-13-pianist-lap/lift-views.webp): the lift of the branch at 0.3 s,
  0.6 s, 0.9 s, and 1.2 s (columns), from the left, the back, and the keys (rows).
- [`first-screen.webp`](2026-10-13-pianist-lap/first-screen.webp): the first screen of the default
  demo on the branch, and the pianist of the first screen on `main` and on the branch. The first
  screen shows the bear from behind and from the left, as the screenshot of the user.

On the branch, the trunk is upright, the head is up, the elbows hang by the sides, and the paws
rest on the low front of the belly over the thighs. The back hides the arms. The front close view
shows both eyes over the lid.
