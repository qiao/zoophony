# The balance of the standing trumpet monkey

Date 2026-10-21. Round `monkey-stand`. Decisions:
[`2026-10-21-monkey-stand.md`](../decisions/2026-10-21-monkey-stand.md). The probes and their
outputs are in [`2026-10-20-monkey-stand/`](2026-10-20-monkey-stand/). Each command runs from the
root of the tree, and the base is `74ad085a`.

## 1. The question

The user said: "ok, no chair now. make the monkey stand, but fix its pose so that the center of
the gravity of the monkey is natural". The monkey stands in its seated pose with no chair. The
measure that decides is the place of the center of mass over the support area of the soles, with
the legs of the mesh (`legFactor` 1), the soles flat, the tail curl on the floor, and the trumpet
at the mouth.

## 2. The measures

**Probe.** `node docs/research/2026-10-20-monkey-stand/balance.ts` poses the first trumpet monkey
of `bach-bwv1047.mid` at rest and at each note (344 samples, steps of 0.5 s). The center of mass
is the volume centroid of the posed body surface, at 1000 kg for each cubic meter, with the
trumpet as 0.5 kg at the centroid of its faces. The support area is the convex hull of the sole
corners within 5 mm of the floor, and its middle is the area centroid. In the axes of the player,
-z is forward. `balance-main.txt` and `balance-variants.txt` give the tables. `marks.py` draws the
side views with the marks (`balance-marks.webp`).

**Source.** A stand is most stable when the center of foot pressure lies at 30% to 60% of the
foot length (H. Asai, "Functional Role of the Somatosensory Information to Perceive the Standing
Position in the Anteroposterior Direction", in *Somatosensory and Motor Research*, IntechOpen,
2020). In a quiet stand, the center of mass stays over the mean center of pressure. So the target
is the center of mass over the middle of the soles.

**Main.** At the median note, the center of mass is 16.9 cm behind the middle of the soles and
7.4 cm behind their back edge, so the monkey would fall back. It is 1.3 cm behind the hip joints,
and the long feet put the middle of the soles 7.9 cm in front of the ankles.

**Legs alone.** `pnpm rig-mesh monkey --check --set <changes> --keep <dir>`, with the leg turns of
`docs/research/2026-10-16-hip-open/leg_turns.py <config> <down> 15 <slant>` and the rig chair
behind the shins (`chair.front` -0.05). The shin is 8.9 cm, so the feet cannot go 17 cm back
(`check-legs.log`):

| Thigh down, shin slant | 45°, -20° | 55°, -25° | 65°, -20° | 75°, -10° |
|---|---|---|---|---|
| Center of mass in front of the middle, note | -12.2 cm | -10.6 cm | -9.9 cm | -10.1 cm |

**Lean.** `studio.trunk.open` below 0 closes the hip angle (`check-lean.log`): -10, -20, and -30
with the legs 65°, -20° give -2.6 cm, 3.9 cm, and 10.0 cm.

**Variants.** `variants.txt` gives the changes, and `check-variants.log`, `check-tail.log`,
`check-final.log`, and `check-nosit.log` the logs:

| Variant | Legs | Lean (pelvis) | Tail root | Note | Rest | Head top | Turned faces | Tail above the floor |
|---|---|---|---|---|---|---|---|---|
| `main` | 25° down, shin vertical | none | 47° | -16.9 cm | -17.9 cm | 1.126 m | 2 | 0.1 cm |
| A | 35° down, -35° (knee 90°) | none | 45° | -11.8 cm | -12.8 cm | 1.122 m | 3 | 0.6 cm |
| B | as A | -15 (20.0°) | 51° | -1.0 cm | -2.1 cm | 1.115 m | 2 | 0.4 cm |
| C | 65° down, -20° (knee 135°) | -14 (18.7°) | 61° | 0.1 cm | -1.0 cm | 1.158 m | 0 | 0.8 cm |
| C' (chosen) | as C, no `sit` | -14 (18.7°) | 63° | 0.2 cm | -0.9 cm | 1.158 m | 0 | 0.2 cm |

The soles stay on the floor in each variant. With the `sit` of the other meshes, the lean of C
turns the haunch down into the rig chair, and the trunk step lifts 203 vertices by up to 6 cm. C'
has no `sit`, and no vertex moves. The haunch of `main` shows a dark flat band from the back, and
the haunch of C' stays round (`legs-crops.webp`). The views come from
`pnpm close-views trumpeter <dir> --glb <file>` in a probe worktree (`lineup.webp`,
`views-*/trumpeter-views.webp`).

**Gates of C'.** `hold-reach.txt`: the palms reach the grips with 7.6 cm and 6.3 cm to spare in
the play (9.5 cm and 8.2 cm on the base) and 17.3 cm and 17.6 cm at rest, and the trumpet stays
at the mouth. `arm-check-final.txt`: PASS. The grip turn p50 is 8° and 9° (1° on the base), and
the flat share p5 is 0.64 and 0.67 (0.68 and 0.71). The crop pairs show the arm shapes of the
base (`arms/`). `pose-depth.txt`: the deepest part is 0.4 cm of the paws in the trumpet, and each
note target is within 5 mm. `body-probe.txt`: only the monkey bodies, the monkey player, and the
poses that read its head change, as the cues of the conductor and of the beavers. The stage side
of `beethoven-9.mid` is 0.6% smaller. `shots.txt` and `shots-base.txt`: the same 5 shot tests fail
on the base. `size.txt`: +3 B, 736,558 B in all.

## 3. The result

C' puts the center of mass on the middle of the soles: at 51% of their length at a note and 45%
at rest, inside the 30% to 60% of the source. It keeps the trumpet at the mouth, passes the arm
gate, and adds no turned face and no sheet. B also balances, but it turns 2 shin faces over and
crouches deeper. The head top of C' is 3.2 cm higher than on `main`, because its legs are
straighter.
