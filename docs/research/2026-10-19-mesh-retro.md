# The tool round of the retro of the mouse and elephant meshes

Date 2026-10-19. Round `mesh-retro`, on `main` from `be8a910c`. Decisions:
[`2026-10-19-mesh-retro.md`](../decisions/2026-10-19-mesh-retro.md). The probes and their outputs
are in [`2026-10-19-mesh-retro/`](2026-10-19-mesh-retro/). Each command runs from the root of the
tree.

## 1. The question

The manager chose eight items of the retro of the mouse and elephant mesh rounds. Each new tool or
option must give again a number of one of these rounds, in less time than the probe of the round.
A change of a module of the app must keep each body and each pose.

## 2. The measures

| Item | Number of the round | Number of the tool | Time of the round | Time with the tool |
|---|---|---|---|---|
| 1. `pnpm raise-fit`, left wrist of the elephant | `turns.hand` (-0.0216, -0.291, -0.9565, 0.0044), mean 169.5° | (-0.022, -0.2907, -0.9566, 0.0038), mean 169.6° | about 40 min for each round (copied probes, conversion by hand) | 15 s for each rule |
| 1. `pnpm raise-fit`, right wrist of the elephant | (-0.015, 0.3418, 0.9381, 0.0541) | (-0.0148, 0.3417, 0.9381, 0.0545) | as above | 15 s |
| 1. `pnpm raise-fit`, arms of the elephant | upper arm L (0.5053, -0.296, 0.3148, 0.7469), R (0.4687, 0.3506, -0.3272, 0.7419), fade 10° to 20° | the same, to 4 decimals, fade 10° to 20° | as above | 15 s |
| 1. `pnpm raise-fit`, rules of the mouse (play and rest) | upper arm (0.1177, -0.4662, 0.051, 0.8753) and (0.1432, -0.37, 0.2611, 0.88), fade 10° to 20° | the same, to 4 decimals, fade 10° to 20° | as above | 19 s |
| 1. `pnpm fold-probe --faces`, rigid face of the mouse | `weights.rigid` (0.0803, 0.6511, 0.0279) | face 1690: (0.0803, 0.6511, 0.0279) | three Blender probes, time not recorded | 22 s (2 s of Blender) |
| 2. `pnpm pose-depth --targets`, elephant | final hold 100% within 5 mm, worst 0.0 cm; `kettles.arc=0.8` 16.3%, 6.2 cm; kettles and hold of `main` with `sides` 0%, 23.4 cm | 100% of 2,225, 0.00 mm; 16.3%, 62.3 mm; 0.0%, 233.9 mm | full sweep about 5 min (5 runs); `reach-scan.ts` 6 s | 4.5 s to 6.7 s for each variant |
| 2. `pnpm hold-fit`, target column | as above | `kettles.arc=0.8`: 62.3 mm (16.3%) | 5 min for each sweep | 29 s for 2 rows with `--sets lift` |
| 3. `pnpm hold-fit`, arm turns of the mouse | right arm 83°/160°, 64°/118°, 61°/99°, 63°/82°, 99°/178°; left arm 56°/141°, 58°/122°, 64°/104°, 80°/158° | the same values | `keys-dump.ts --demo` for each pole, time not recorded | 50 s for 5 variants |
| 4. `--set timpani.hands=alternate` | 60.4% within 5 mm, worst 21.6 cm (probe with `Reflect.set`) | 60.4%, 216.1 mm | a probe of its own | 6 s |
| 5. `pnpm rig-mesh --check --hold`, right elbow of the mouse out and level | 7 faces of the right arm fold in each play sample | play folds 100%, 7 faces of the right arm | a commit of the hold before each check | 26 s, no commit |
| 6. nose tip, mouse with no nose box | the whisker moved the oboe 0.33 m | old export 336.0 mm, new export 0.0 mm | not recorded | 38 s for each check |
| 7. `pnpm hold-reach --instrument timpani`, elephant | final hold 100%, 0.0 cm (`mallet-reach.txt`) | 100% of 2,225, 0.0 mm | `mallet-reach.ts` | 6 s |
| 7. `pnpm mesh-options --instrument timpani`, elephant at 1.92 m | arm factor 1: 100%, 0.0 cm | arm factor 1: 100%, 0.0 mm; 0.8: 10.3%, 79.5 mm; 1.3: 100% | no strike measure for each arm factor | 43 s for 3 variants |
| 8. `docs/agents/model-traps.md` | 3,254 words, 71 traps | 3,038 words, 71 traps | | |

The first number of the round of the wrists comes from `wrist-turn.ts`, which skipped the
count-in. The tool takes the play samples of the fold probe from the count-in, so 1,208 in place of
1,200 samples fold, and the mean turn moves by less than 0.1°.

The first row of the arm turns of the mouse round, (1, 0, -1), kept the left pole of the oboe of
`main`, (-1, -1, -1), so its left arm gives 56° and 141°. The tool row with both poles at
(±1, 0, -1) gives 67° and 180° for the left arm. Each other cell is the same.

Other measures of the round:

| Measure | Result | Output |
|---|---|---|
| Studio modules after `pnpm studio-body` for each of the 10 animals | each byte the same | `git diff` empty |
| `pnpm body-probe --base be8a910c` | 95 of 95 bodies, 23 of 23 players, 1,492 of 1,492 pose sets equal | `body-probe.txt` |
| Distance of the nose tip from the middle plane | hippo 2.84 cm (warns), the other 9 bodies at most 0.45 cm | `nose-plane.txt` |
| Strikes of the badger | bass drum 127, cymbals 864, small percussion 611, each 100% within 5 mm. No demo has a snare drum or a xylophone. | `hold-reach-percussion.txt` |
| `docs/agents/commands.md` | 3,000 words at the start, 3,229 with the new rows, 3,041 after the cut | |

The commands:

- `docs/research/2026-10-19-mesh-retro/raise-fit.sh` makes the old rigs and writes
  `raise-fit-*.txt` and `fold-probe-mouse-9c38bfcd.txt`.
- `pnpm pose-depth timpanist --targets --demo beethoven-1 --demo beethoven-8-4 --demo beethoven-9
  --demo brahms-2 --set kettles.arc=0.8 --set '<kettles and hold of main>'`:
  `pose-depth-targets-elephant.txt`. With `--set timpani.hands=alternate`:
  `pose-depth-targets-hands.txt`.
- `pnpm hold-fit timpanist --sets lift --set kettles.arc=0.8`: `hold-fit-targets-elephant.txt`.
- `pnpm hold-fit oboist --demo boulanger-matin --step 8 --sets play` with the four pole variants:
  `hold-fit-turns-mouse.txt`.
- `pnpm rig-mesh mouse --check --roles oboist --step 1` with and without
  `--hold 'oboe@mouse.poleR=1,0,-1;oboe@mouse.poleL=-1,-1,-1'`: `rig-check-mouse-*.log`.
- `pnpm rig-mesh mouse --check --roles oboist --step 8 --set 'colors.noseBox=[[0,0,0],[0,0,0]]'` on
  `be8a910c` and on the new export: `rig-check-mouse-no-nose-box*.log`. `node
  docs/research/2026-10-19-mesh-retro/nose-plane.ts`: `nose-plane.txt`.
- `pnpm hold-reach elephant --instrument timpani` with two variants, and `pnpm hold-reach badger
  --instrument <id>` for each instrument of the badger: `hold-reach-percussion.txt`.
- `pnpm mesh-options elephant <dir> --size ref=1.92 --legs 1 --arms 0.8,1.3 --instrument timpani
  --species elephant`: `mesh-options-elephant-timpani.md`.

## 3. The result

Each item of the scope is done, with a commit series and its docs. The tools give each number of
the rounds again, or a number within 0.1° where the round took other samples.

- The raise rule of a round takes 15 s to 19 s in place of about 40 minutes. The proposed fade is
  the fade of the four arm rules. The two wrist rules of the elephant took 5° to 25° from a scan of
  the rig check, and the tool proposes 15° to 25°, with that fade in its table.
- The reach of the note targets of a variant takes about 5 s in place of a sweep of about 5
  minutes. A text field of a hold takes `--set`, so the hands rule needs no probe.
- The nose tip comes from the vertices within 3 cm of the middle plane. With 2 cm, the tip of the
  hippo moved 3.0 cm up to the plane, and it sets the jaw of its rig, so the band is 3 cm and the
  check warns from 2 cm. Only the hippo warns.
- The badger has no mesh yet, so the strike measures of the badger use its parametric body. No
  demo has a snare drum or a xylophone, so the tools measure no strike of these.
