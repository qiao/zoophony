# A list of corrective shapes in a rig, and the arms of the cat

Date 2026-10-17. Branch `multi-shape` on `main` at `c4e35add`. The decisions are in
[`2026-10-17-multi-shape.md`](../decisions/2026-10-17-multi-shape.md). The probes, the logs, and
the images are in [`2026-10-17-multi-shape/`](2026-10-17-multi-shape/).

## Why

After the round `cat-bow`, the cat violist folded in each play sample. The left wrist had its
shape, and the folds came from the right arm. The rig format held one corrective shape of the
kind `raise` for each rig, so a second shape needed a new format first.

## The format

`raise` of a mesh rig config holds one rule or a list of up to four rules. Each rule gives one
morph target and one pose in the extras of the GLB file. The app weights each shape by the turn
of its own key bone.

```text
 tools/mesh-rigs/cat.json          cat.rig.glb                     src/models/studio/cat.ts
 raise: [                          targets           extras        raises: [
   { L, bone hand }      ------->  arm_raise_L   +   pose L    -->   { L, hand }
   { R, bone forearm }   ------->  arm_raise_R   +   pose R    -->   { R, forearm }
   { R }                 ------->  arm_raise_R2  +   pose R2   -->   { R }
   { L, bone forearm }   ------->  arm_raise_L2  +   pose L2   -->   { L, forearm }
 ]                       rig_mesh.py                 raisesOf()  ]
                                                                      |
                     poseStudioBones(): weight k = raiseWeight(raises[k], turn of its key)
```

```typescript
export interface StudioRaise {
  /** The arm of the shape. */
  readonly side: Side;
  /** The key bone: the upper arm when not given, the forearm, or the paw. */
  readonly bone?: 'forearm' | 'hand';
  /** The turn of the key bone at which the shape has its full weight. */
  readonly turn: Quat;
  /** The angles from that turn, in radians, at which the weight starts to fall and reaches 0. */
  readonly fade: readonly [full: number, none: number];
}

export interface StudioBody {
  /** Up to STUDIO_RAISES poses, in the order of their shapes after the arm-down shapes. */
  readonly raises?: readonly StudioRaise[];
}
```

The keys are the upper arm in the axes of the chest, the forearm from the upper arm, and the paw
from the forearm. Each rule relaxes the skin with the shapes of the rules before it on the same
side at their weights in its pose (`raise_weight()`), so that two shapes of one side add up as in
the app. One rule writes the extras of `main`, and the rigs of the fox, the rabbit, and the cat of
`main` keep their bytes (`rig-bytes.txt`, `rig-bytes.sh`). The modules change only from `raise` to
`raises`, and `pnpm body-probe --base main` gives each body, player, and pose set equal
(`body-probe-format.txt`).

## The keys of the folds

`arm-turn.ts` gives the turn of one key over the play samples of the first seated cat of each
demo at a step of 1 s, with the share of the samples with a fold in each bin of 10° from the mean
turn of the folded samples. `fold-keys.ts` splits the samples by the upper arm and the forearm
together, in cells of 5°.

| Faces | Upper arm key | Forearm key | Rule |
|---|---|---|---|
| 235, 332, 338 (right elbow) | folds over 90° of turns (`turns-235.txt`) | 3,830 of 4,426 samples within 10°, each folded (`elbow-235.txt`) | bent right elbow |
| 204, 162, 187, 206, 188, 254, 336 (right shoulder, `main`) | each sample folds (`upper-shoulder.txt`) | not probed | none: the shape of the elbow removed most |
| 162, 206, 254 (after the elbow shape) | within 30°, 25°, 20° of 112°, 126°, 138° on one axis (`elbow-turns-*.txt`) | not probed | raised right arm |
| 1292 (left upper arm) | 44% within 10° (`turns-1292.txt`) | 924 of 1,127 samples within 5° (`keys-1292.txt`) | bent left elbow |
| 206, 187, 188, 336 (after four shapes) | each within 20° of 138° to 140° (`keys4-*.txt`) | elbow 12° to 14° from the bind | none: a fifth rule did not help |

The clavicle of the right arm turns 30° around y in each play sample, and the left clavicle keeps
its bind turn (`clavicle-shoulder.txt`, `clavicle-1292.txt`). The rules take these turns.

## The rules of the cat

`pnpm rig-mesh cat --check --roles violist --step 1` gives the play folds after each rule.

| Step | Rule | Play folds at a step of 1 s | Log |
|---|---|---:|---|
| `main` | the bent left wrist (`cat-bow`) | 100% | `fold-probe-main-faces12.txt` |
| 1 | the bent right elbow: 44.6° from the bind, fade 20° to 40° | 43.5% | `rig-check-elbow1.log` |
| 2 | the raised right arm at the mean turn of face 162, with the elbow of rule 1, fade 30° to 50° | 33.7% | `rig-check-shoulder1.log`, `rig-check-shoulder2.log` |
| 3 | the bent left elbow: 15.0° from the bind, fade 5° to 10° | 16.1% | `rig-check-left1.log` |
| no | a fifth rule of the right shoulder at 140.2° | 15.9% to 17.0% | `rig-check-right3.log`, `rig-check-right3b.log` |

The cosines 0.3 and 0.5 and one ring of neighbors (`grow`) changed each step by at most 0.3
points. In the pose of the fifth rule, two faces stayed turned over after the relax with each
tried cosine and ring.

## Measures

`pnpm fold-probe violist --base main --faces 12` (all demos at a step of 0.25 s), `pnpm hold-fit
violist --base main` (all sets on `FIT_DEMOS`), `pnpm rig-mesh cat --check`, `pnpm body-probe
--base main`, and `pnpm size --base main`.

| Measure | Main | Branch | Goal | Log |
|---|---|---|---|---|
| Play folds of the cat | 100% | 16.4% | 4.0% | `fold-probe-violist-base-main.txt` |
| Lift folds of the cat | 95.6% | 52.3% | at most main | `fold-probe-violist-base-main.txt` |
| Rest folds, most faces in one rest sample | 100%, 12 | 100%, 12 | at most main | `fold-probe-violist-base-main.txt` |
| Faces 235, 332, 338: play | 92.6%, 87.7%, 31.2% | 0%, 0%, 0% | none | `fold-probe-violist-base-main.txt` |
| Faces 204, 162, 187: play | 83.1%, 45.7%, 32.5% | 1.3%, 0.7%, 3.8% | none | `fold-probe-violist-base-main.txt` |
| Face 1292: play | 22.7% | 1.3% | none | `fold-probe-violist-base-main.txt` |
| Faces 336, 206, 2694: play | 8.8%, 13.8%, 7.0% | 8.7%, 7.7%, 7.0% | none | `fold-probe-violist-base-main.txt` |
| Play folds and lift folds on `FIT_DEMOS` | 100%, 96.8% | 19.8%, 59.7% | report | `hold-fit-violist-base-main.txt` |
| Depths of the fit | 0.1 cm to 2.7 cm | each as on `main` | main + 0.5 cm | `hold-fit-violist-base-main.txt` |
| Standing body against the source | 0.436 mm | 0.436 mm | 1 mm | `rig-mesh-check-final.log` |
| Triangles | 3,155 | 3,155 | 3,200 | `rig-mesh-check-final.log` |
| Packed mesh after gzip | 27,202 B | 27,409 B | 32,000 B | `rig-mesh-check-final.log` |
| First download after gzip | 434,355 B | 434,708 B (+353 B) | 1 MB | `size.txt` |

## Images

`pnpm close-views batch <dir> --species cat --moments play,rest,lift50,lower50 --views
front,front35,side,left --zoom 1 --zoom 2.5 --role violist --base main`, with `main` above the
branch in each grid.

- `species-<moment>-base-views.webp` and `species-<moment>-zoom2.5-base-views.webp`: the cat in
  the play, the rest, and the middle of the lift and of the lowering. Most faces that the shapes
  open are thin (face 235 has a corner of 150.9°), so the grids show only small changes of the
  shading at the right elbow and the right shoulder in the play. The fold probe gives the
  measure. The lift and the lowering look as on `main`.
- `violist-base-views.webp`: the close views of the role `violist`.
