# The rhino arms of the fifth review

Date 2026-10-27. Round `fifth-rhino`. Decisions:
[`2026-10-26-fifth-review-rhino.md`](../decisions/2026-10-26-fifth-review-rhino.md). The probes and
their outputs are in [`2026-10-26-fifth-rhino/`](2026-10-26-fifth-rhino/). Each command runs from
the root of the tree. "Base" is `57849ac5`.

## 1. The question

On 2026-10-26, the user said: "the rhino's arms are stretched / twisted in unnatural ways". The
image shows the left arm of the tubist from the left: the forearm crosses the front of the tuba to
the grip, and it looks long and thin, with a twisted band of faces between the elbow and the paw.
The round decides by the 2x crops of both arms from many views at rest, in the play, and in the
moves, by the twist steps between neighbor arm bones (target 25°), by the arm gate, by the depths,
and by the grasp of both paws.

## 2. The causes

`probes/forearm-turn.ts` measures the turn of each paw around its forearm as anatomy reads it: the
angle of the palm from the elbow axis, positive toward the supinated side. A neutral forearm has
the palm along the elbow axis. A real forearm turns about 90° from neutral
(`docs/agents/rig-blender.md`).

```text
            bind paw, degrees       paw in the play, degrees    paw twist of the gate, degrees
 base   L   -78 (elbow bent up) --> +84 (elbows out)        --> 169 on 2 bones (84.4 each)
        R   -78                 --> +57, +65 at rest        --> 148 on 2 bones (74.1 each)
 round  L   -13 (elbow forward) --> +67 (elbows down)       -->  87 on 4 segments (21.7 each)
        R   -13                 --> +15, +21 at rest        -->  37 on 4 segments (9.4 each)
```

Three causes add up:

- **The skin.** The forearm had two bones, the forearm and the twist bone at half of the paw
  turn, and long thin faces of the Meshy mesh. Each bone took 84.4° of the left paw turn
  (`twist-base.txt`), and the skin collapsed into a thin twisted band.
- **The bind of the rig.** The forearm of the app turns with the elbow hinge, so the seated bind
  sets the zero of the paw twist. The bind arms of the other meshes bend the elbow up, and the
  A-pose paw then sat 78° pronated on its forearm. With a forward elbow, the same source paw sits
  15° pronated (`bind-hinge.txt`). The bind thus added about 63° on each forearm. The bind of the
  round reads 13° (`forearm-turn-after.txt`).
- **The hold.** The elbows pointed out, and the palms face their tubes, so the left forearm stood
  at 84° of supination, the end of the turn of a real forearm (`forearm-turn-base.txt`).

## 3. The fixes and the variants

`tools/blender/rhino_arms.py` rebuilds the arms headless with the settings of the probe of
2026-10-25, and a run gives the same bytes. The rig states of the variant files: A is the base
rig, B has the rebuilt arms with the old bind, C turns the bind forearm and the bind hand 68°
about the bind upper arm, and D turns the bind forearm 68° and keeps the wrist bend of the bind
hand in the frame of the palm (the round). Each hold change is a `--set` of the file.

| Variant | Rig | Value | Output |
|---|---|---|---|
| Blender weights on the paws, base hold | B | 13 and 11 folds in the gate (limit 8) | `gate-blender-paws.txt` |
| Rule weights on both paws, base hold | B | 8 and 6 faces at most in a sample | `rig-check-paws.txt`, `rig-check-paws-each.txt` |
| Left elbow (-0.25, -1, 0), right (0.5, -1, 0) | A | paw twist 125° and 87°, upper arms 4.0 and 2.8 cm in | `scan-poles-old-rig.txt` |
| Bind hand turned with the forearm, base hold | C | paw twist 103° and 77°, paw swing 46° and 49° (28° and 30° on A) | `gate-swing2.txt`, variant g |
| Elbows straight down, (0, -1, 0) | C | upper arms 6.4 cm in | `scan-poles-new-bind.txt` |
| Left elbow (-0.25, -1, 0) | C | upper arms 3.6 cm in | `scan-poles-new-bind.txt` |
| Elbows (-0.75, -1, 0) and (0.75, -1, 0), no flatten | D | upper arms 2.1 to 2.6 cm in | `depth-no-flatten.txt` |
| Elbows (-0.75, -1, 0) and (0.75, -1, 0), flatten | D | upper arms 0.3 to 0.9 cm in | `depth-flatten.txt` |
| Left grip 0.16 H toward the branch | D | left paw 2.3 cm in the branch (limit 2.2) | `scan-grip-depth.txt` |
| Left grip 0.13 H, left elbow (-0.5, -1, 0) | C | finger tips 0.8 cm off, no grasp | `scan-grip-c.txt` |
| Left grip 0.145 H | D | 1.9 cm, both paws grasp | `scan-grip.txt` |

## 4. The measures

| Measure | Base | Round | Command, output |
|---|---|---|---|
| Largest twist step L / R | 84.4° / 74.1° | 22.7° / 19.6° | `node docs/research/2026-10-24-violin-arms/twist-steps.ts tubist 0.25`, `twist-base.txt`, `twist-after.txt` |
| Paw turn from neutral, play L / R | +84° / +57° | +67° / +15° | `probes/forearm-turn.ts`, `forearm-turn-base.txt`, `forearm-turn-after.txt` |
| Gate: folds p95 L / R | 5 / 4 | 5 / 3 | `pnpm arm-check tubist --base 57849ac5`, `gate.txt` |
| Gate: paw twist p95 L / R | 169 / 148 | 87 / 37 | `gate.txt` |
| Gate: forearm twist p95 L / R | 69 / 62 | 34 / 15 | `gate.txt` |
| Gate: flat p5 L / R | 0.61 / 0.65 | 0.92 / 0.94 | `gate.txt` |
| Gate: stretch p95 L / R | 0.24 / 0.15 | 0.07 / 0.05 | `gate.txt` |
| Upper arms in body cm | 1.4 to 1.5 | 0.3 to 0.9 | `pnpm pose-depth tubist --base 57849ac5`, `pose-depth.txt` |
| Paws in tuba cm (limit 2.2) | 1.8 | 1.9 | `pose-depth.txt` |
| Forearms in tuba cm (limit 1.5) | 0.5 to 0.8 | 1.1 to 1.5 | `pose-depth.txt` |
| Grasp L / R, each set | 100% / 100% | 100% / 100% | `pnpm wind-grip tubist`, `wind-grip.txt` |
| First download B | 801,256 | 807,881 | `pnpm size --base 57849ac5`, `size.txt` |

The paw swing stays at the values of the base only when the bind hand keeps its wrist bend in
the frame of the palm. A bind hand turned with the forearm moved the zero of the swing, and the
gate read 46° for the base hold. The accepted grips of the tubist take the new medians, -87° and
-32°, because the bind moved the zero of the paw twist.

`pnpm body-probe --base 57849ac5` (`body-probe.txt`): only the 5 rhino bodies and the tubist
change. The joints of the standing rhino move 0.001 mm.

`pnpm frame` under `tools/measure-lock.sh` (`frame.txt`, one run): the main thread p50 3.90 ms and
p95 5.02 ms, the GPU rows p50 7.87 ms and p95 8.10 ms, and 132.8 fps with no cap. The arm
segments add 20 bone matrices. The target of design 9.7 fails, as on `main` (3.87 ms, 7.82 ms,
and 131.6 fps in `2026-10-25-beaver-rhino-arms.md`).

## 5. The images

Each sheet shows the base on the left of each pair and the round on the right. The cells come
from `pnpm close-views tubist <dir> --base 57849ac5` with each moment of `ROLE_VIEWS` at the zoom
1.6 and the scale 2, and from `pnpm close-views play` at the seat of the rhino.

- `arms-e20.webp`: the front, the back, and each side at each moment, elevation 20.
- `arms-diag.webp`: az150, az-150, az35, and az-35 at each moment, elevation 20.
- `arms-e40.webp`: each side, az150, and az-150 at the note, the rest, the lift, and the
  lowering, elevation 40, as the stage camera.
- `arms-sides-e35.webp`: each side at each moment, elevation 35.
- `paws.webp`: 2x crops of the right paw on the valves and of the left paw on the main branch at
  rest and at the note.
- `strips.webp`: the play strips of the stage camera at az -90, 90, 0, and 180 from a rest over
  the lift, the play, and the lowering (112.6 s to 120.1 s of `boulanger-matin`), and a strip
  at az -75 with the zoom 1.8.
- `user-angle.webp`: the angle of the image of the user, at 116 s.

In each view of the base, the forearms show a twisted band, and the right arm shows a sharp inner
elbow. In the round, both arms are round tubes that bend at the elbow, from each side, at rest,
in the play, and in the moves. Both paws hold their tubes as on the base. A soft shadow stays
under each upper arm. The colors probe shows no dark face there.

## 6. Open

- The left forearm comes 1.5 cm into the main branch in the moves and at rest (limit 1.5 cm,
  0.8 cm on the base), because the left elbow is lower.
- The other mesh rigs take the bind arms with the elbow bent up. Their paws can start pronated
  on the forearm too. `probes/forearm-turn.ts` reads the bind turn of each role.
