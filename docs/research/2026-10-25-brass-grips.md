# The brass grips of the trumpet and the tuba

Date 2026-10-25. Round `brass-grips`. Decisions:
[`2026-10-25-brass-grips.md`](../decisions/2026-10-25-brass-grips.md). The probes and their
outputs are in [`2026-10-25-brass-grips/`](2026-10-25-brass-grips/). "Main" is `main` at
c566237f. Each command runs from the root of the tree.

## 1. The question

The role visual audit (`docs/audits/2026-10-25-role-visual-audit.md`, fault 2) found that both
trumpet paws of the monkey pressed together in front of the mouth like praying hands, with the
fingers up. The arm gate failed the left grip turn of the trumpeter (48°, limit 45°) and of the
tubist (96°). A real trumpet player wraps the left hand around the valve casings and arches the
right fingertips on the valves (wind-technique 2.1). A real tubist works the valves with the
right hand and grips the tubing at the side of a rotary tuba with the left hand, "with her
knuckles facing left" (wind-technique 3).

`probes/brass-probe.ts` measures the visible paws in the axes of the instrument: the direction of
the fingers, the palm, and the thumb of the skin, the places of the paw and its finger tips, and
the arm joints. `pnpm wind-grip`, the arm gate, `pnpm pose-depth`, and the images decide.

## 2. The causes

- **Trumpet.** Both palms faced the valve block from its two sides, and each paw aimed along the
  line from its shoulder. The big head puts the mouthpiece 0.23 m above the shoulder joints, so
  the forearms rose almost straight up (0.91 up), and both paws pointed up (0.68 and 0.83 up) with
  their palms toward each other (`brass-main.txt`).
- **Tuba.** The left grip lay at the back left of the main branch, so the paw pointed at the
  branch. The roll that turns the palm to the tube takes the direction to the tube square to the
  paw, and that direction then is mostly up: the left palm faced up (0.81). The grip turn reads
  this roll against the entry of the A-pose hold, in which the back of the paw faced the branch.

## 3. The fixes

- **Trumpet.** The left palm faces the upright casings from the left, below their middle, and the
  fingers curl 109° around them. The right palm lies above the valves, 3.6 cm to their right, and
  faces down. The right paw points to the left across the valve tops by a side aim of 0.8, and the
  fingers curl 92° onto them. The side aim became a pair, because the retarget turns a paw back to
  its forearm in the plane of its palm (`PAW_TURN`): with the side aim on the left paw too, the
  left paw left its grip by 4.2 cm. The elbows point down and out. Both paws keep the hold at
  rest, and the left rest grip moves 0.04 H toward the bell.
- **Tuba.** The left grip moves to the left side of the main branch. There, the palm faces the
  branch, and the back of the paw faces out to the left. The left elbow points out and down, the
  left fingers curl 92°, and at rest the grip moves 0.02 H out from the branch.

## 4. The scans

- **Trumpet elbows** (`arm-trumpet-scan.txt`). Elbows out and level gave the flattest forearms,
  but the right upper arm went flat (0.51, limit 0.55) and the right wrist bent 71° (limit 70°).
  Elbows down and out pass each value. A side aim of 0.8 keeps the right wrist at 56°; 1.0 gave
  71° with the elbows out.
- **Tuba left grip** (`tuba-scan.txt`). On the left side of the branch, a left elbow down put the
  thick left upper arm 2.5 cm to 3.3 cm into the body, and an elbow further out turned the paw
  past 170° on its forearm, with a flip in the lift (17,996°/s). A grip 0.07 H up with the elbow
  (-1, -0.75, 0) keeps the upper arm at 1.4 cm, the depth of main. A larger curl closes the tips,
  but 100° folds 7 faces (limit 8), so the grip moves 0.16 H toward the branch and the curl is 92°.

## 5. The measures, main against the branch

| Measure | Main | Branch |
|---|---|---|
| Trumpet left paw: fingers, palm (forward, up, right) | +0.73 +0.68 0.00, -0.61 +0.65 +0.44 | +0.39 +0.90 +0.21, -0.28 -0.10 +0.95 |
| Trumpet right paw: fingers, palm | +0.55 +0.83 +0.01, -0.59 +0.40 -0.70 | +0.15 +0.11 -0.98, -0.08 -0.99 -0.12 |
| Trumpet right thumb | -0.59 +0.38 +0.71 | -0.98 +0.10 -0.14 |
| Trumpet paw tops above the mouthpiece, left and right (cm) | 1.8, 3.1 | 1.4, 6.1 |
| Trumpet grasps, play and rest, left and right (`grip-*.txt`) | 100% 100%, 100% 0% | 100% 100%, 100% 100% |
| Tuba left paw: fingers, palm | +0.55 -0.58 +0.60, +0.46 +0.81 +0.35 | +0.91 -0.35 +0.23, -0.06 +0.43 +0.90 |
| Tuba left grasps, play and rest | 100%, 100% | 100%, 100% |
| Grip turn p50, trumpet L and R, tuba L (°, `arm-check.txt`) | 48, 26, 96 | 17, 33, 40 |
| Tuba left paw twist p95, stretch p95 | 148, 0.08 | 169, 0.24 |
| Tuba depths: left paw in the tuba, left forearm in the tuba at rest (cm, `tuba-scan.txt`) | 1.2, 0.0 | 1.8, 0.8 |
| Turns over 30° in one step of 0.01 s (`jumps-branch.txt`) | - | 0 |

The tuba stretch is not a spike: in the play, the worst forearm edge is 2.1% longer than in the
bind. The rest pose of the lowered tuba makes that edge 22% shorter than in the bind, and the
measure counts from the rest (`pnpm arm-check tubist --explain stretch`). The trumpet paws still
touch at the casings (smallest gap 0.0 cm), but their middles lie 4.9 cm apart, one above the
valves and one at their left side.

## 6. The gates

`pnpm arm-check --all --base main` (`arm-check.txt`) fails only margins of the tubist inside the
limits: the stretch (0.24 against 0.08, limit 0.35) and the move twist (169° against 148°,
limit 176°). Both come from the left paw that now turns to the side of the branch on purpose.
`pnpm clip-probe --base main` (`clip-probe.txt`) gives no new clip.

## 7. The images

`trumpeter-note-e40.webp` puts the zoom 2 cells of main above those of the branch, from the
elevation 40 of the stage camera: the mouth shows above the right paw. The `*-crop3-*.webp` sheets
are 3x crops of the paws at the elevation 20, main above the branch. From the front at the
elevation 20, the right trumpet paw covers the mouth. The full sets of each moment at the
elevations 20 and 40 stay out of the repository.
