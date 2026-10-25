# The arm roots of the beaver bassoonist and the rhino tubist

Date 2026-10-25. Round `beaver-rhino-arms`. Decisions:
[`2026-10-25-beaver-rhino-arms.md`](../decisions/2026-10-25-beaver-rhino-arms.md). The probes and
their outputs are in [`2026-10-25-beaver-rhino-arms/`](2026-10-25-beaver-rhino-arms/). Each command
runs from the root of the tree. "main" is `4c3d3f7e`.

## 1. The question

On `main`, the beaver bassoonist and the rhino tubist showed large black slots or wedges under both
arms, from the left and the right, in the play and at rest. The manager asked for the arm rebuild
of `docs/agents/rig-blender.md` on both bodies, with the grips of `2026-10-25-grips.md` kept. The
round decides by the 2x close views from each side and by the gates: the arm gate, the twist
steps, the depths, the grips, and the size.

## 2. The rebuilt arms

`probes/rhino_arms.py` and `probes/beaver_arms.py` build the two rebuilds headless and write them
into a folder that the caller names. Each run gives the same bytes as the session.

```text
 rhino-apose.glb --> wind_arms.py steps: cut 0.4 of the upper arm and 0.3 of the paw,
                     13 quad rings x 16, elbow gap 0.026 u, wrist gap 0.016 u
 beaver.glb      --> cat_arms.py steps: seam plane |x| 0.185 u at 0.57 u, side wall,
                     flat inner side, arms x 1.5 (the arm factor of the user)
     --> automatic weights, Limit Total 4, Weight Paint fixes --> rig-mesh --check --set
```

`loops-beaver.txt` and `loops-rhino.txt` (`probes/loops_probe.py`) give the closed loops around
each upper arm. The rhino arm is about 0.13 units thick and 0.11 long, with a loop from 0.4 of the
upper arm on the right. The beaver upper arm has a loop only at 0.9 of its length, because it joins
the trunk down to the elbow, so it took the seam cut of the cat.

| Rig | Folds L / R (main 4 / 4 rhino, 2 / 4 beaver) | Upper arms in body cm | Right paw grasps, play |
|---|---|---|---|
| rhino rebuild, plain fixes | 4 / 4 | 2.9 play, 3.5 rest | 0% |
| rhino rebuild, paw and neck fixes | 10 / 11 | 2.9 play, 3.5 rest | 0% |
| beaver rebuild | 15 / 15 | not measured | not measured |
| main | | 1.8 play, 2.0 rest (rhino) | 97% (rhino) |

Outputs: `trial-r0-gate-tubist.txt`, `trial-gate-tubist.txt`, `trial-pose-depth-tubist.txt`,
`trial-wind-grip-tubist.txt`, and `trial-gate-bassoonist.txt`. The twist steps of the rhino
rebuild were 32.2° to 34.5° on the forearm (`trial-twist-tubist.txt`, target 25°), because the
right paw turns 138° on its forearm in the grip of the grip round, and each of the four segments
takes a quarter of it.

The variants that failed, each rigged with `pnpm rig-mesh --check --set` and rendered with
`pnpm close-views --glb`:

- Rhino: a cut at 0.3 or 0.5, a wider armpit clean box, wider root Smooth boxes, Remove From Group
  of the clavicles and the trunk on the tube, and of the arm segments inside the shoulder. None
  removed the wedge. The bind arms of the A-pose softened it, but folded 12 faces of the right arm.
- Rhino depth: a right shoulder turn of 60° (`reach`) put the upper arms at 1.8 cm, but the right
  arm folded 8 faces (4 on `main`), and the right paw still missed the valves.
- Rhino grip: the automatic weights put about half of each paw on the wrist helper, which follows
  the forearm of the player. The paw fix moved the palm angle from 24° to 2° (7° on `main`), but
  the far claw corners stayed 1.2 cm off the valves. The rule weights on the paws gave 1.5 cm to 1.6 cm. A
  curl of 100° gave 51%, and 95° and 105° gave 0% to 1%.
- Beaver: a wider seam plane, a higher armpit line, more blend rings, more ruled rings, a longer
  weight ramp, the anchor shares 0 and 0.4, and the arm splits 0.17 to 0.25 all gave 42 or more
  folded faces in the most folded sample (6 on `main`).

## 3. The cause of the slots

The colors probe (`--probe colors`) showed no dark face at the slots, and the normals probe showed a
patch with its own normal direction at each arm root. The seated bind turns the hanging arm up,
so the faces of the arm root meet at more than the crease angle of 35°, and the smooth normals
split there. A crease angle of 70° for the whole rhino removed the wedge, but it smoothed the
facets of the trunk and the head. The new rule `rootNormals` of `tools/blender/rig_mesh.py` names
the skin faces within a radius of each shoulder joint as `rim`, and the app gives them the mean
normal of the skin with no crease angle (`studioNormals()`). On the rigs of `main`, the rule alone
removed most of the slots. On the rebuilt rhino arms, it gave the same look.

| Body | Radius u | Rim faces | Result in the side cells |
|---|---:|---:|---|
| rhino, rebuilt arms | 0.08 | 125 | the wedge stays under the left arm |
| rhino, rebuilt arms | 0.12 | 474 | soft armpit shading, the facets stay |
| rhino | 0.12 | 248 | soft armpit shading, the facets stay |
| beaver | 0.14 | 218 | the crease at the right root stays darker |
| beaver | 0.2 | 396 | softer crease, the facets of the arms stay |
| beaver | 0.26 | 599 | the arms lose their facets in the front view |

The round ships the rule with the radii 0.12 and 0.2 on the rigs of `main`.

## 4. The measures

`pnpm arm-check --all --base main` (`gate.txt`): each value of each role equals `main`, and no
value fails. The rows of the two roles (main in brackets):

| Role | Arm | Folds | Twist | Forearm twist | Flat | Paw twist | Grip turn | Verdict |
|---|---|---|---|---|---|---|---|---|
| tubist | L | 4 (4) | 42 (42) | 48 (48) | 0.76 (0.76) | 129 (129) | 0 (0) | PASS |
| tubist | R | 4 (4) | 22 (22) | 56 (56) | 0.66 (0.66) | 138 (138) | 19 (19) | PASS |
| bassoonist | L | 2 (2) | 29 (29) | 14 (14) | 0.79 (0.79) | 57 (57) | 175 (175) | OPEN |
| bassoonist | R | 4 (4) | 44 (44) | 37 (37) | 0.77 (0.77) | 110 (110) | 163 (163) | OPEN |

The OPEN grip turns are those of the grip round, which wait for the manager.

The twist steps (`twist-tubist.txt`, `twist-bassoonist.txt`,
`node docs/research/2026-10-24-violin-arms/twist-steps.ts <role> 0.25`) equal `main`: 64.5° on the
rhino forearm and 64.8° on the beaver upper arm, above the target 25°.

`pnpm pose-depth <role> --base main` (`pose-depth-tubist.txt`, `pose-depth-bassoonist.txt`): each
pair equals `main`. The rhino upper arms go 1.8 cm into the body in the play and 2.0 cm in the
lift, the rest, and the lowering, and the tuba 3.8 cm, as on `main`. The beaver arms go at most
1.5 cm in.

`pnpm wind-grip bassoonist tubist` (`wind-grip.txt`): each paw grasps as on `main`, the right tuba
paw in 97% of the play samples.

`pnpm body-probe --base main` (`body-probe.txt`): only the 5 beaver bodies, the 5 rhino bodies,
and their two players change, only in their normals, and all 1,492 pose sets stay equal.

`pnpm size --base main` after `pnpm build` (`size.txt`): 776,131 B, 1,631 B more than `main`
(774,500 B), for the two lists of rim faces. The limit is 1,000,000 B.

`pnpm frame` under `tools/measure-lock.sh` (`frame.txt`, one run, load average 6 to 19 from other work): the main thread p50 3.87 ms and p95 5.02 ms, the GPU rows p50 7.82 ms and p95 8.02 ms, and 131.6 fps with no cap. The target of design 9.7 fails, as on `main` (3.82 ms, 7.90 ms, and 130.3 fps in `2026-10-25-elephant-arms.md`). The rule adds no bone
matrix and no draw, because the app makes the normals one time for each rig.

## 5. The images

`tubist-views.webp`, `bassoonist-views.webp`, and their `-main` grids: the moments note, lift50, and
rest from the front, each side, the back, and ±35° at the zoom 2. The `-e40` grids give the
elevation 40 with az150 and az-150 in place of ±35°. The black slots and the hard wedges of `main`
are gone from each side of both bodies. Soft shading stays under the raised arms, as in a real
armpit.

## 6. The open faults

- A soft dark crease stays at the front of the right arm root of the beaver from the right side
  at the elevation 20.
- The twist steps of both bodies stay above 25°.
- The rhino upper arms go 1.8 cm to 2.0 cm into the body, as on `main` (goal 1.5 cm).
