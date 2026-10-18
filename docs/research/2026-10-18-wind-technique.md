# Wind technique: the trombone of the panda against real players

Date 2026-10-18. Round `wind-research`, base commit `3ef40f48`. Decisions:
[`2026-10-18-wind-technique.md`](../decisions/2026-10-18-wind-technique.md). The probe and its
output are in [`2026-10-18-wind-technique/`](2026-10-18-wind-technique/). Each command runs from
the root of the tree. The round changes no app code.

## 1. The question

The user asked: "is the pandas' motion professionally accurate?". The answer of the manager was
"partly", and the user chose "Research, then fix (Recommended)". The facts and their sources are
in the reference [`docs/reference/wind-technique.md`](../reference/wind-technique.md), and this
report names its sections as "reference 1.5" and so on. This report holds the measures of the app
and the motion spec of the fit round of the panda. The measure that decides is the difference of
each rule of the app from the reference.

## 2. The measures

`python3 -I docs/research/2026-10-18-wind-technique/probe.py` copies the values of
`src/pose/winds.ts`, `src/pose/wind-notes.ts`, and `src/models/instruments/brass.ts` and writes
`probe.txt`. `node docs/research/2026-10-18-wind-technique/arm-probe.ts` builds the panda
trombonist with `buildPlayer()` and `windRig()`, and writes `arm-probe.txt`: the distance from the
right shoulder joint to the slide grip, the elbow flexion of an arm with a straight wrist, and the
slide reach of other turns of the slide. The clearance and the folds of the turns come from the
report [`2026-10-18-panda-mesh.md`](2026-10-18-panda-mesh.md).

| Measure | App (panda mesh) | Real player | Reference |
|---|---|---|---|
| Slide in play, below the level | 40.0° (bind 15° and the turn 25°) | Toward the audience, and never down to the floor. No source gives degrees | 1.1 |
| Slide in play, to the right | 20.0° | No source | 1.1 |
| Slide of `WIND_HOLDS.trombone` | 15.0° below the level, straight ahead | As above | 1.1 |
| Reached travel, positions 1 to 7 | 0.155 m (`slideReach`) | 0.568 m (derived) | 1.2 |
| Reach as a share of the real travel | 27.3% | 100% | 1.2 |
| Model travel (`BRASS.trombone.travel`) | 0.55 m, 96.8% of the real travel on a model of 0.85 scale | 0.568 m | 1.2 |
| Step 1 to 2, and step 6 to 7 | 2.58 cm and 2.58 cm (equal) | 8.2 cm and 10.9 cm. Proportional on 0.155 m: 2.23 cm and 2.98 cm | 1.2 |
| Largest error of the equal steps on 0.155 m | 0.59 cm at position 3 | 0 | 1.2 |
| Time of a slide move | at most 0.1 s, it ends at the note start | 98 ms legato change, 1 to 5, bass trombone | 1.5 |
| Peak speed of a full move | 2.32 m/s (smoothstep, 1.5 × 1.55 m/s) | Around 2 m/s, sometimes more | 1.5 |
| F♯4, G4, A♭4 | positions 3, 2, 1 (the seventh partial) | 5, 4, 3 (the eighth partial, derived) | 1.3 |
| Breath | 0.4 s before a phrase after a gap of 0.5 s. The spine leans back 3° | The rib cage and the abdomen expand, and the shoulders stay still. One count | 1.6 |
| Rest | Slide 73.9° below the level and 6.3° to the left. Mouthpiece 6.6 cm left, 2.4 cm up, and 13.2 cm forward of the mouth. Both paws on their grips, the slide in the first position | Slide lock on. No source for the place | 1.7 |
| Right elbow flexion, position 1 to 7 | 75° to 29°, a range of 46° (shoulder to grip 0.459 m to 0.560 m) | 114° to 28° and 125° to 17°, positions 1 to 6, one player standing | 1.4 |
| Left elbow | Still on its grip | 120° to 131°, still | 1.4 |

The right arm reaches only the first part of the slide, so a real move of 56.8 cm is 15.5 cm in
the app. At the same time of 0.1 s, the speed of the app is 27% of the speed of a real move of the
same positions. A full move of the app (2.32 m/s peak) has about the real speed of a real slide.

## 3. The result

The app follows a real player in the grips, the time of the slide move, the stop of the slide in
each position, the speed that grows with the distance, the time of the breath, and the seated
posture. The app differs in the angle of the slide, the short travel, the elbow range (46°
against 86° to 108°), the equal steps, three positions of the seventh partial, the motion of the
breath, and the hands. No source gives the rest of an orchestral trombonist, so the rest has no
target. Section 4.2 of the reference compares the other winds.

## 4. The motion spec of the fit round

The items are in the order of the gain in realism that a viewer sees. The fit round checks each
item with `pnpm hold-fit trombonist`, `pnpm pose-depth trombonist --gaps`, and the close views.
The arm factor 1.497 of the user stays. The slide check asks for a reach of more than 0.15 m
(`src/pose/winds.test.ts`, paused).

| Item | Target | Source | Limit on the panda |
|---|---|---|---|
| T1. A slide nearer to the level | The slide points toward the audience: the smallest angle below the level that keeps a reach above 0.15 m and the clearance. Candidates: 35° right and 15° down (30° below the level, reach 0.160 m), and 30° right and 20° down (35° below the level, reach 0.165 m) | Reference 1.1, 1.4 [4] [1] [18] | The mouth is 0.40 m in front of the shoulder joints. Each 5° less down costs about 0.025 m to 0.03 m of reach, and each 5° more right gives about 0.02 m back (`arm-probe.txt`). 30° right and 15° down put the arms 1.8 cm deep (limit 1.5 cm). A turn further right moves the slide to the side, and real players hold the trombone straight forward [18]. A slide nearer to the level also shortens the elbow range of 46° |
| T2. The positions of the seventh partial. Done in the round `slide-notes`, also for the valves | `slidePosition()` of the trombone skips the seventh partial: F♯4 in position 5, G4 in 4, A♭4 in 3 | Reference 1.2, 1.3 [8] (derived) | None. The partials of the valves are a separate question (section 5) |
| T3. The breath in the chest | The chest lifts and widens and the belly goes out in the breath in, with no lean back and still shoulders. Keep 0.4 s and the end at the first note | Reference 1.6 [1] [16] | The rig has no breath shape. A small lift of the chest bone, or a `raise` shape of the studio rig, can show it. The big belly hides a small change |
| T4. Steps that grow. Done in the round `slide-notes` (`slideTravel()`). The largest change is 0.67 cm, at position 4 (7.75 cm against 7.08 cm in section 1 of `probe.txt`), in place of 0.59 cm at position 3 | Map the position by the real distance, `(2^((n−1)/12) − 1) / (2^(6/12) − 1)` of the reach, in place of `(n − 1) / 6` | Reference 1.2 [1] [8] | None. The change is at most 0.59 cm, and the paused test pins the equal steps |
| T5. Alternate positions | In a fast run, take the alternate that moves the slide less: B♭3 in 5 next to positions 4 to 7, F4 in 4 or 6 next to them | Reference 1.3 [8] [3] | None. The short travel makes the gain small |
| T6. Keep the slide time | Keep `slideSec` 0.1 s, the end at the note start, and the stop in each position | Reference 1.5 [9] [13] [14] [3] | None |
| T7. Keep the rest | Keep the rest of `WIND_HOLDS.trombone`, with the slide closed. Do not rest the trombone on the slide | Reference 1.7 [1] [6] | No source gives the place. The user can choose another place |

## 5. Open points

- The valve instruments use the same `PARTIALS`, so the trumpet plays the written A5 with valve 2
  from the seventh partial, where the reference gives 1-2 (reference 2.1). Done in the round
  `slide-notes`: the trumpet now plays it with 1-2.
- The other winds differ from the reference in five rules (reference 4.2): the oboe hangs 30° from
  the vertical and the clarinet 25°, where real players hold about 45°. The tan fox faces the
  front, where a flutist turns the body 45° to the right. The right paw of the horn stays outside
  the bell. The oboe does not breathe out before the breath in.
- No source gives the rest pose of an orchestral trumpet, clarinet, bassoon, tuba, or trombone,
  or the time of the lift before an entrance.
