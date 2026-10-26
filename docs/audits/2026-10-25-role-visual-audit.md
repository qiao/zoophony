# Visual audit of the roles

Date: 2026-10-25. Base commit: `8e42b866` (`main`).

The user asked: "screenshot the animal poses from different angles and states, verify they render
correctly, no faults on twisting, clipping. verify their poses are correct, they are holding and
playing the instruments correctly. verify the instruments are facing correctly." This audit
finds and ranks the faults. It changes no code and no model. Other agents fix the faults.

## Scope and method

- Roles: the 22 roles of `ROLE_VIEWS` of `tools/close-views.ts`. The hippo bassist is out of
  scope, because another agent rebuilds its arms now.
- Images: `node tools/close-views.ts <role> <dir> --views front,back,left,right,35,-35,150,-150`
  at each moment of the role, at `--elevation 20` and `--elevation 40`, with `--zoom 2` and
  `--zoom 1`, on one `pnpm build` of `main` served by `vite preview` (`--url`). 3x crops:
  `--lineup --crop 3 --box 0.1,0.2,0.8,0.55 --zoom 1.5 --elevation 20` at the first moment and at
  rest. The auditor looked at each grid, and at single cells where a grid was not clear.
- Measures: `pnpm arm-check --all` and `pnpm clip-probe` (all demos and the percussion test
  score), one time each.
- The sheets of this folder are cuts of the cells. The full image set stays out of the
  repository.

The stage view looks at the players from the front and from above (near az ±35, elevation 40),
and at the conductor from the back. A fault in those views is more severe than a fault that shows
only from the back of a player.

| Severity | Meaning |
|---|---|
| high | The audience sees it in the stage view. |
| medium | It shows at the zoom 2. |
| low | It shows only in the 3x crops, or in one rare frame. |

The real-player facts come from the files of `docs/reference/`: `string-technique.md`,
`wind-technique.md`, `percussion-technique.md`, `harp-technique.md`, and
`piano-technique.md`, with their section numbers.

## Measures

`pnpm arm-check --all` exits with 1. The rows of the hippo bassist are out of scope.

| Role | Arm | Measure | Value | Limit | Worst sample |
|---|---|---|---|---|---|
| pianist | L | folds p95 (rest) | 20 | 8 | bach-bwv1047 rest |
| pianist | R | folds p95 (lift) | 13 | 8 | bach-bwv1047 wall 1.3 s |
| trumpeter | L | grip turn p50 (play) | 48 | 45 | beethoven-1 9.40 s |
| tubist | L | grip turn p50 (play) | 96 | 45 | brahms-2 142.88 s |

`pnpm clip-probe` gives `PASS` for each of the 15 files: no measure is above 1%. The probe does
not measure a mallet against the body of its player, so fault 1 comes from the images only.

## Faults, most severe first

Each image is in `2026-10-25-role-visual-audit/`. "Known" names the open item of `TODO.md` that
already describes the fault.

| # | Role | Moment | View | Image | Fault | Real player (source) | Severity |
|---|---|---|---|---|---|---|---|
| 1 | timpanist | rest, between | az-35 (e40), front | `timpanist-mallet.webp` | The right mallet lies level across the belly and points in, with its head in front of the middle of the belly, far from any kettle | Each mallet points forward and in, 10° to 45° from forward, over the head of the kettle (percussion 2, 3) | high |
| 2 | trumpeter | note, between, stand | front, az35, az-35 | `trumpeter-paws.webp` | Both paws press flat together in front of the mouth, fingers up, like praying hands. They hide the valves and the mouth. The arm gate fails the left grip turn (48°). Known: `TODO.md:277` | Left hand wraps the valve casing, right fingertips arch on the valve tops, right thumb under the leadpipe (wind 2.1) | high |
| 3 | pianist | rest | left, right, az35 | `pianist-rest.webp` | The paws hang in front of the chest at the height of the keys, away from the thighs. The arm gate fails the folds at rest (20) and in the lift (13) | The paws rest on the thighs, the trunk sits tall (piano 8, 9) | high |
| 4 | timpanist | left, between, right, rest | az-35 (e40) | `timpanist-moments.webp` | The four moments look almost the same: 1.9% to 4.5% of the pixels change from the rest. The heads stay at the drum heads between strikes and at rest (`ready` of `src/pose/percussion-rig.ts`) | The mallet leaves the head at once, and the upstroke starts before the strike (percussion 4) | medium |
| 5 | conductor | beat-1 to beat-4 | az35, right | `conductor.webp` | The baton crosses in front of the muzzle. From the right side, the right upper arm is a flat plank with a hard dark lower edge | `orchestra-latest.png` shows the baton up and forward, beside the head | medium |
| 6 | harpist | all | back, left, right (3x) | `harpist-crop3.webp` | From the back, each upper arm ends in a flap with a dark lower face at the elbow. The paws are dark fists at the strings. Known: `TODO.md:352`, `TODO.md:330` | Round arms, the hand curved with the fingers down and the thumb up (harp 4) | medium |
| 7 | cellist | frog, tip, crossing | az35 (e40) | `cellist-neck.webp` | The muzzle touches the fingerboard, and the neck stands in front of the left cheek. Known (ear): `TODO.md:787` | Neck above the left shoulder, C peg behind the left ear (string 2.7) | medium |
| 8 | hornist | all | left, right, front | `hornist-arms.webp` | The arms are boxes with hard corners. From the left side, the left forearm is a flat slab with a black lower edge. Known: `TODO.md:1150` | Round arms, the elbows near the body (wind 2.2) | medium |
| 9 | singer | all | left, right, az35 | `singer-belly.webp` | Dark triangle shards on the white belly beside each flipper root. Known: `TODO.md:370` | Clean white belly (`orchestra-latest.png`) | medium |
| 10 | snare-drummer, cymbalist, xylophonist, percussionist | all | front | `snare-crop3.webp`, `badger-mallets.webp` | From the front, the claws hang open and spread, and the stick lies between them. From the side, the paw curls around the stick | Back fingers wrap the stick loosely, fulcrum between the thumb and the index finger (percussion 1, 6) | low |
| 11 | trombonist | first, seventh | front, az35 | `trombonist-bell.webp` | Slide and bell point down and to the right of the panda, near level across the body from the front. This is a choice of the user (wind 4.1) | Toward the audience, never down to the ground (wind 1.1) | low |
| 12 | percussionist | triangle | front | `badger-mallets.webp` | The beater strikes the left side of the triangle at mid height | Middle of the bottom side, or outside near the bottom (percussion 8) | low |
| 13 | snare-drummer, percussionist | all | back | `badger-back.webp` | A thin dark slit on the upper back at the left shoulder blade | Clean back | low |
| 14 | fox-violinist | all | back, az150 | `fox-violinist-back.webp` | A small dark notch on the upper back under the nape | Clean back | low |

Main fixed these faults of the first pass of this audit (on `0953facb`): the curled trunk of the
pianist, the flaps of the rabbit bow arm, the rest of the rabbit violin (now on the left thigh),
the oboe paws (now around the tube), the rest arms of the bear, the slits of the elephant left
forearm, the slots of the rhino elbows, the upright harp (now leaned onto the right shoulder), the
rifle bassoon (now near upright), and the folds of the mouse forearms. The violist lift and
lowering now hold the viola at its neck. The rabbit, red fox, and cat pass the arm gate.

The flutist, the clarinetist, the bassoonist, the oboist, and the bass drummer show no fault at
the zoom 2 or the zoom 1. Their instruments face as a real player holds them.

## Unverified

These faults may be real, but no image of this audit proves them.

- **Rhino left grip.** The arm gate gives a left grip turn of 96° (limit 45°). The cells show the
  left paw on the back branch of the tuba, with no clear wrong turn. To see it:
  `pnpm arm-check tubist --views <dir>`.
- **Black band at the haunch.** The cat and the rabbit show a black band above the seat in each
  back view. It can be the shadow of the chair. To see it: the same back cells with no shadows in
  a probe build.
- **Right paw of the hornist.** From the right side, the right paw sits at the rim of the bell.
  Wind 4.2 puts the palm 2.5 cm inside the opening. To see it: `pnpm close-views hornist <dir>
  --views right,150 --zoom 3`.
- **Pianist left paw at rest.** From az35 at rest, the left paw seems to rise near the chin. To
  see it: `pnpm close-views pianist <dir> --moments rest --views 35,60 --zoom 2`.

## Status

Round `timpani-piano-rest` (`docs/research/2026-10-25-timpani-piano-rest.md`). Another round can
add its own verdicts below.

| Fault | Verdict | Commits | What is left |
|---|---|---|---|
| 1 timpanist mallet | fixed | 2f83f2e1, 86487c0b, 202686b4 | Each mallet keeps its strike direction between strikes and at rest, with the head 2 cm to 7 cm above its spot. The manager accepted the new grips of the strike roll (`ACCEPTED_GRIPS`, ef99326b) |
| 3 pianist rest | partly fixed | 93e1949a | The paws rest on the lower belly, 5 cm to 9 cm lower. The thighs are out of the reach of the arms. The left shoulder folds (rest p95 19) are a fault of the rig (`TODO.md`) |
| 4 timpanist moments | fixed | d1f53635, 86487c0b | The wrist lifts the head 10 cm to 15 cm above the set position before a strike. The new moment `up` of `pnpm close-views timpanist` shows it |
| Unverified: pianist left paw at rest | fixed | 93e1949a | From az35, the left forearm rises along the chest from the elbow, and the paw now lies on the lower belly, below the chest |
| Pianist elbow V in the chord (round brief) | open | none | Faces of the inner elbow fold at each elbow pole of the scan: a fault of the rig (`TODO.md`) |

Round `brass-grips` (`docs/research/2026-10-25-brass-grips.md`). The hashes are of the branch
before its merge.

| Fault | Verdict | Commits | What is left |
|---|---|---|---|
| 2 trumpeter paws | fixed | 30b42554, 1360d5a0, ec788797 | The left paw wraps the valve casings from the left, the right paw lies across the valve tops with the fingers down on them, and the left grip turn falls from 48° to 17°. From the front at the elevation 20, the right paw covers the mouth. The right thumb of the mesh does not reach under the lead pipe (`TODO.md`) |
| Unverified: rhino left grip | fixed | e858d96b | The left paw pointed at the main branch from its back left, so the palm faced up. It now lies on the left side of the branch with the knuckles to the left, and the grip turn falls from 96° to 40°. The left paw turns 169° on its forearm (limit 170°), and the stretch reads 0.24 from a short rest forearm (`TODO.md`) |
