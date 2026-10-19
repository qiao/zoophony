# Elephant arms

Date 2026-10-19. Round `arms-elephant`, base `16f16e44`. Decisions:
[`2026-10-19-elephant-arms.md`](../decisions/2026-10-19-elephant-arms.md). The probes and their
outputs are in [`2026-10-19-elephant-arms/`](2026-10-19-elephant-arms/). Each command runs from
the root of the tree.

## 1. The question

The user said: "the arms for hippo and elephant seem twisted and deformed". The goal is round
arms of the elephant timpanist in the play, the lift, and the rest. The measures are the folds of
`pnpm fold-probe timpanist` (goal: at most 1% of the play samples), the strikes within 5 mm, the
gap of the trunk to the kettles (at least 9.1 cm), and the depths of `pnpm pose-depth timpanist`.
The render of the user view decides.

## 2. The measures

**See it.** `user-view.webp` puts the screenshot of the user beside the play of the base and of
this round, from the right side and from the left side (`pnpm close-views timpanist <dir> --zoom
1.6 --elevation 20 --base 16f16e44`). On the base, each upper arm is a flat band with a dark fold
along it, and the forearms twist. The mean play turns of the base are 83° and 84° for the upper
arms, and 141° and 164° for the paws on the forearms (`hold-fit-base.txt`).

**Grip.** `twist.ts` gives the turn of each paw on its forearm in the play of `beethoven-1`
(`twist.txt`):

| Grip | Paw on forearm L / R | Twist L / R | Upper arm L / R |
|---|---|---|---|
| Top of the grip up (base) | 173° / 168° | -165° / 165° | 83° / 84° |
| Top toward the shoulder (final) | 68° / 65° | 44° / -40° | 92° / 91° |
| Same, elbows out, down, and back | 79° / 73° | 65° / -59° | 85° / 84° |
| Same, elbows out and down | 87° / 81° | 77° / -72° | 83° / 80° |
| Same, elbows out, up, and back | 67° / 64° | 20° / -16° | 103° / 104° |

A lower elbow turns the paws further, and a higher elbow turns the upper arms further, so the
elbows stay out and back. The grip with the old shapes moved the folds to the armpits
(`fold-probe-grip.txt`).

**Rig.** `pnpm rig-mesh elephant --check --set <changes> --keep <dir>`, and
`pnpm fold-probe timpanist --glb <file>` for the faces:

| Variant | Play | Lift | Rest | Output |
|---|---:|---:|---:|---|
| `16f16e44` | 100% | 100% | 100% | `fold-probe-base.txt` |
| Cut 0.5, 0.58, 0.6, or 0.62, old grip | 100% | 99.2% to 100% | 100% | `rig-cut.txt` |
| Cut 0.55 | the rig stops | | | `rig-cut.txt` |
| Cut 0.64, old grip | 100% | 87.1% | 0% | `rig-cut.txt` |
| Cut 0.64, new grip, no shapes | 100% | 87.1% | 0% | `rig-grip.txt` |
| Same, four new shapes | 41.3% | 33.1% | 0% | `rig-shapes.txt` |
| Same, a ring at the left elbow | 41.2% | 31.5% | 0% | `rig-ring.txt` |
| Same, the rigid face of the outer left elbow (final) | 3.9% | 12.9% | 0% | `rig-rigid.txt` |
| Same, a rigid face of the left paw too | 1.4% | 25.8% | 100% | `rig-rigid.txt` |
| Final with a left wrist shape fitted on the ring rig | 76.0% | 78.2% | 0% | `rig-final1.txt` |

The four shapes come from `pnpm raise-fit timpanist --glb <file>` on the cut rig with the new
grip (`raise-fit.txt`).

**Final.** `pnpm fold-probe timpanist --faces 8 --base 16f16e44` (`fold-probe.txt`): at most 2
faces fold at a time, in place of 23. Face 2401, a thin face of the left paw, folds in 3.5% of the
play, and face 235 of the front of the right armpit in 0.4% of the play and 11.3% of the lift.

| Measure | `16f16e44` | Final |
|---|---|---|
| Upper arms in the body, deepest of the sets | 2.8 cm | 0.0 cm |
| Forearms in the body, play | 0.1 cm | 0.5 cm |
| Paws in the body, play | 0.5 cm | 4.7 cm, in 1.9% of `beethoven-8-4` |
| Mallets in the kettles, play | 2.3 cm | 2.3 cm |
| Gap of the trunk to the kettles | 9.1 cm | 9.1 cm |
| Strikes within 5 mm | 100% | 100% |

The base depths come from `hold-fit-base.txt` and `pose-depth-timpanist.txt` of
`docs/research/2026-10-19-elephant-mesh/`, because `pnpm pose-depth --base` failed in its
temporary folder. The cut leaves a loop of 3 edges at the right armpit (`loops-probe.txt`), so the
sweep counts 5 open loops. `pnpm body-probe --base 16f16e44` differs only for the elephant
(`body-probe.txt`). The first download shrinks by 620 B (`size.txt`).

**Images.** `pnpm close-views timpanist <dir> --base 16f16e44`: `timpanist-views.webp`, the base
above. With `--zoom 1.6 --elevation 20 --pairs ... --crop 0,0.2,1,0.7`: `pair-left-right.webp`,
`pair-left-left.webp`, `pair-rest-right.webp`, and `pair-lift50-left.webp`.

## 3. The result

The final rig takes the grip with its top toward the shoulder, the cut at 0.64, the ring at the
left elbow, the rigid face, and four new shapes. The play folds fall from 100% to 3.9%, the lift
from 100% to 12.9%, and the rest from 100% to none. In the user view, each upper arm reads as a
round arm to the paw, and the forearms do not twist. No variant reached 1% of the play with the
lift and the rest at most the base. Open: the thin face of the left paw, the left paw in the body
of `beethoven-8-4`, and the dark cap of the cut under the raised right arm.

## 4. The second round

**Paw depth.** The deepest sample is the lift before a strike on the kettle beside the player:
the mallet head rises 0.15 m over its target, and the wrist comes back into the side of the body
(`wait-8-4.txt`). `pnpm pose-depth timpanist --demo beethoven-8-4 --times <...> --bones handL
--into body` sweeps the lifts from 254 s to 264 s (`paw-depth.txt`):

| Variant | Left paw in the body | Samples over 1.5 cm |
|---|---:|---:|
| Round 1 | 4.7 cm | 7.0% |
| Left target 3, 7, or 10 cm further out (`offsetL`) | 3.8, 3.1, 2.2 cm | 5.5%, 2.0%, 1.0% |
| Left target 4 cm forward or back | 4.3, 3.7 cm | 7.5%, 5.5% |
| Elbow pole down or back | 4.3, 4.7 cm | 8.5%, 7.5% |
| Lift of 0.08 m | 3.2 cm | 1.5% |
| Home 0.35 H in front of the shoulder | 2.0 cm | 1.0% |
| Home 0.4, 0.45, or 0.5 H in front of the shoulder | 0.0 cm | 0% |

The home of 0.4 H keeps the playing spot and each strike (100% within 5 mm). The paws then turn
64° and 59° on the forearms, and the upper arms 87° (`twist.ts`).

**Paw folds.** With the home of 0.4 H, the play folds in 5.7% of the samples, most at the sliver
2401 at the back of the left paw (`fold-probe-home.txt`). `pnpm rig-mesh elephant --check --hold
timpani.home=0,-0.1,-0.4` (`rig-paw.txt`):

| Variant | Play | Lift | Rest |
|---|---:|---:|---:|
| Home 0.4 H | 5.7% | 12.9% | 0% |
| Rigid sliver | 1.8% | 24.2% | 100% |
| Sliver rule up to 0.05 u | 5.6% | 25.8% | 100% |
| Left wrist shape fitted again | 37.7% | 29.8% | 0% |
| Rigid sliver and its two wrist neighbors | 6.0% | 11.3% | 0% |
| Rigid sliver and its neighbor 2403 (final) | 0.4% | 11.3% | 0% |

With the rigid sliver alone, faces 2388 and 2403 of the left wrist folded in each rest sample.
The faces of the waiting left elbow fold in at most 0.1% of the play, so its shape stays.

**Final.** `pnpm fold-probe timpanist --base 16f16e44` (`fold-probe-2.txt`): the play folds in
0.4% of the samples, the lift in 11.3%, and the rest in none. Face 235 of the right armpit folds
in 9.7% of the lift. `pnpm pose-depth timpanist --gaps` (`pose-depth-2.txt`): the paws stay out of the body, the forearms go 0.2 cm in, the mallets 2.2 cm into the kettles, the trunk keeps 9.1 cm, and each strike stays within 5 mm. The first download shrinks by 670 B (`size-2.txt`). `pnpm
body-probe --base 16f16e44` differs only for the elephant (`body-probe-2.txt`). `user-view-2.webp`
shows the base, round 1, and round 2 from the right side and from the left side: the arms stay
round, and the forearms reach a little further forward.

## 5. The dark area under the right arm

In the right side view of the gallery, a large dark area lies under the raised right arm.
`probe-patch.py` swaps the material of the elephant for a probe, as `hidden/probe-patch.py` of
`docs/research/2026-10-18-panda-seam/` does (`armpit-probe.webp`). With the face colors and no
light, the area is light gray, so no face color is dark. The normals of the area are smooth and
equal to the normals of the chest around it. With no shadow on the elephant, the area is light.
Thus the dark area is the shadow of the raised round upper arm under the key light of the gallery.
On the base, the arm skin was stretched over the chest, so the chest under it took the light.

The box under the right arm of the cell `left-right` (`lum.py`, `armpit-light.txt`):

| Variant | Mean light | Dark share |
|---|---:|---:|
| `16f16e44` | 0.441 | 15.7% |
| Round 1 | 0.388 | 28.1% |
| Round 2 | 0.378 | 30.0% |
| Round 2, right elbow 0.25 lower (`poleR`) | 0.408 | 25.3% |
| Round 2, no shadow on the elephant (probe) | 0.507 | 4.5% |

No variant reached the base in the time box. On the stage, from the
right side of `beethoven-9` (`pnpm close-views play --camera -300,-40,14 --base 16f16e44`), the
stage light shows no dark area under the arm (`armpit-stage.webp`). The crop pairs
`armpit-pair-left-right.webp` and `armpit-pair-right-right.webp` show the area in the gallery
(`pnpm close-views timpanist --zoom 1.6 --elevation 20 --base 16f16e44 --pairs
left-right,right-right --crop 0.15,0.2,0.65,0.5`).
