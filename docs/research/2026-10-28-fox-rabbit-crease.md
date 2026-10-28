# The arm creases of the red fox and the rabbit

Date 2026-10-28. Round `sixth-fox-rabbit-crease`. Decisions:
[`2026-10-28-fox-rabbit-crease.md`](../decisions/2026-10-28-fox-rabbit-crease.md). The probes and
their outputs are in [`2026-10-28-fox-rabbit-crease/`](2026-10-28-fox-rabbit-crease/). Each
command runs from the root of the tree. "Main" is `3003f8da`. Copy a probe of `probes/` to `scratch/`
before you run it.

## 1. The question

The user said: "seeing visible crease on fox and rabbit's arm. these were not there before this
round", then: "it may be existing fault. anyways, fix them". Image 54 shows a lit forearm of the
red fox with a notch, and image 55 a vertical slit with a sharp corner on the rabbit. The target:
no visible crease, slit, notch, or dent on the arms under the front key light, at rest, in the
play, and in the moves, from each angle.

## 2. The angles

`pnpm close-views play <dir> --at <species> --time 30 --pause --zoom 2.5 --elevation 10` of
`boulanger-matin` matches both images at rest (`angles.webp`):

- Image 54: the red fox from `--azimuth 45`. The notch lies in the crook of the right elbow, which
  bends to hold the bow upright.
- Image 55: the rabbit from `--azimuth 60`. The slit runs down the seam between the front of the
  right upper arm and the trunk, with its sharp corner at the top.

## 3. The cause

The app makes the smooth normals one time from the seated bind, with the crease angle 35, and
moves them with the skin of each vertex (`studioNormals()`). Each corrective shape adds the
moves of the normals that the same rule gives on the bind plus the shape.

```text
 seated bind (elbow bent, arm raised) --crease 35--> corner normals N
 bind + arm-down shape               --crease 35--> corner normals N'
 rest pose: weight 1 of the arm-down shape --> N + (N' - N), moved by the skin of the vertex
   two faces at one vertex take different normals --> a hard line along their edge
```

`probes/crease.ts` measures this jump: for each edge near an arm root (0.12 m) or an elbow
(0.08 m), the angle between the corner normals of its two faces at the same vertex, over the
rest, the play, and the lift of each demo. A jump over 15° is a hard line. The colors probe of the
fox shows no dark face at the elbow, and the rig log of the rabbit gives no dark face outside the
eyes and the nose. The normals probe shows the split (`normals-fox.webp`, `normals-rabbit.webp`).

| Body, region | Hard edges at rest | Largest jump at rest | Largest bind angle | Faces (examples) |
|---|---:|---:|---:|---|
| Red fox, right elbow | 124.9 cm | 151° | 66° | 497, 504 to 506, 531 to 534, 540 |
| Red fox, left elbow | 86.2 cm | 62° | 54° | 960 to 966, 1847 to 1852, 1898 to 1900 |
| Rabbit, right arm root | 98.8 cm | 109° | 110° | 730 to 733, 741 to 745 |
| Rabbit, left arm root | 93.8 cm | 117° | 121° | 1242, 1243, 1248, 1249, 1741 to 1749 |
| Rabbit, right elbow | 61.2 cm | 78° | 99° | 481, 483, 515, 517 |
| Rabbit, left elbow | 46.2 cm | 76° | 106° | 1347, 1348, 2279 to 2281 |

(`crease-<role>-main.txt`, `bind-angles.txt`.) On the fox, the seated bind bends each elbow, and
the inner elbow faces meet at up to 66°. The arm-down shape has the weight 1 at rest, and its own
split normals take the largest jump from 61° (`--noshapes`, `crease-fox-noshapes.txt`) to 151°.
On the rabbit, the bind turns each hanging arm up, so the arm root faces meet at up to 121°. At
rest, the shape gives the root the form of the copy again, but the split stays. `cause-fox.webp` and
`cause-rabbit.webp` draw the posed rest skin with the faces of the hard edges in red.

## 4. The start

`probes/reg.sh <ref> <role> --sets rest,play --step 2` runs the probe in a tree of each commit
(`reg-fox.txt`, `reg-rabbit.txt`):

| Commit | Change | Fox right elbow at rest |
|---|---|---|
| `ff9b7f64` | before the rebuilt fox arms | 63.0 cm, 78° |
| `1fa31a96` | rebuilt fox arms | 127.7 cm, 123° |
| `ce7bfd6c` | skin normals of the fox arm roots | 126.8 cm, 123° |
| `5ccd82c1` | before the bind of the fox left paw | 124.9 cm, 151° |
| `83a6dfa4` | bind of the fox left paw | 124.9 cm, 151° |

| Commit | Change | Rabbit right arm root at rest |
|---|---|---|
| `8dabc0e2` | before the A-pose rabbit | 96.2 cm, 157° |
| `fa43f2c9` | A-pose rabbit rig | 197.3 cm, 174° |
| `0aed3259` | before the rebuilt rabbit arms | 270.3 cm, 172° |
| `21252a3d` | rebuilt rabbit arms | 91.9 cm, 110° |
| `2187970a` | before the bind of the rabbit left paw | 98.8 cm, 109° |
| `5ccd82c1` | bind of the rabbit left paw | 98.8 cm, 109° |

Both creases are old faults, and the bind round did not change them. The fox elbow lines doubled
with the rebuilt arms of 2026-10-25. Each rig of the rabbit that the probe reads has the arm root
lines. The key light moved to the front on 2026-10-27 (`2026-10-27-key-front.md`), and now lights
the crook of the elbow and the front of the arm root at a grazing angle.

## 5. The fix and the tries

The rim of `rootNormals` gives each corner of a face in it the mean normal of all skin faces at
its vertex, in the bind and in the bind plus each shape (`root_rim()` of
`tools/blender/rig_mesh.py`). The radii are in the units of each rig (`tries.txt`):

| Rig | Result |
|---|---|
| Fox, elbow 0.04 | the right elbow keeps a jump of 151° at rest |
| Fox, elbow 0.06 | an edge of the right inner elbow jumps 60° in 68% of the play |
| **Fox, elbow 0.07** | no elbow edge jumps more than 16° |
| Fox, elbow 0.08 | as 0.07, and the 2x cells look as 0.06 |
| Rabbit, root 0.08 | hard edges of 17.6 cm at the left root, with a light wedge |
| Rabbit, root 0.10 | 2.8 cm at the right root in the play |
| Rabbit, root 0.10, elbow 0.05 | 10 cm to 13 cm at the right inner elbow |
| Rabbit, root 0.12, elbow 0.06 | no hard edge at p95, but the trunk faces of the upper chest and the back lose their facets, and the back of the right shoulder shades as a soft dark patch from az150 |
| Rabbit, as above, with the turn rule of the hippo (60°, `rig-rabbit3.log`) | hard edges of 10 cm to 50 cm at the arm roots |
| **Rabbit, as above, with the arm share of the hippo (0.3)** | no edge of the arm roots jumps more than 12°, and the trunk keeps its facets |

The rig checks of all tries give the triangles, the seat, the reach, the folds, and the form of
`main`: the rim changes only the normals.

## 6. The measures

`probes/crease.ts` at a step of 1 s over each demo (`crease-<role>-main.txt`,
`crease-<role>-round.txt`): the hard edges of each region at rest, and p50 / p95 in the play, with
the largest jump. The other regions have no hard edge on `main` and in the round.

| Role, region | Main: rest, play | Round: rest, play |
|---|---|---|
| Red fox, right elbow | 124.9 cm (151°), 105.7 / 116.6 cm (144°) | 0 cm (0°), 0 / 0 cm (0°) |
| Red fox, left elbow | 86.2 cm (62°), 60.2 / 61.3 cm (66°) | 8.0 cm (16°), 0 / 0 cm (0°) |
| Tan fox, right elbow | 141.4 cm (122°), 75.9 / 75.9 cm (65°) | 0 cm (0°), 0 / 0 cm (0°) |
| Tan fox, left elbow | 94.6 cm (76°), 68.0 / 68.9 cm (54°) | 8.1 cm (16°), 0 / 0 cm (0°) |
| Rabbit, right arm root | 98.8 cm (109°), 105.6 / 116.9 cm (113°) | 0 cm (3°), 0 / 0 cm (11°) |
| Rabbit, left arm root | 93.8 cm (117°), 90.1 / 96.6 cm (115°) | 0 cm (11°), 0 / 0 cm (12°) |
| Rabbit, right elbow | 61.2 cm (78°), 57.9 / 65.0 cm (102°) | 0 cm (0°), 0 / 0 cm (68° in one sample) |
| Rabbit, left elbow | 46.2 cm (76°), 33.0 / 34.9 cm (91°) | 0 cm (2°), 0 / 0 cm (2°) |

The concave edges of each region keep the values of `main`: the form does not change.

| Check | Result | Output |
|---|---|---|
| `pnpm arm-check --all --base main` | No `FAIL`. Each arm of the violinist, the red fox violinist, and the flutist passes with the values of `main`. The pianist and the bassist stay `OPEN` as on `main` | `gate.txt` |
| `pnpm pose-depth violinist --base main` | No `GROWS`: each pair of the rabbit and the red fox equals `main` | `depth-violinist.txt` |
| `pnpm fold-probe <role> --base main` | Equal shares and counts for the violinist, the red fox violinist, and the flutist | `fold-*.txt` |
| `pnpm carry-check violinist,fox-violinist --base main` | 0 opposite steps, net turns 22° and 27°, as on `main` | `carry.txt` |
| `pnpm wind-grip flutist fox-violinist` | Both flute paws grasp in each play sample, the red fox left paw holds the neck | `wind-grip.txt` |
| `pnpm hold-fit flutist --base main` | No `GROWS` | `hold-fit-flutist.txt` |
| `pnpm body-probe --base main` | Only the normals of the rabbit, the red fox, and the tan fox change. 1,492 of 1,492 pose sets and each joint equal `main` | `body-probe.txt` |
| `pnpm rig-mesh fox --check`, `rabbit --check` | The triangles, the packed mesh, the seat, the reach, the folds, the form, the hold anchors, and the stage sides of `main` | `rig-check-*.txt` |
| `pnpm size --base main` | 835,989 B of 1,000,000 B, +3,205 B: the lists of the rim faces in the fox and rabbit modules | `size.txt` |

## 7. The images

Each image shows `main` beside or above the round, in the stage light of the front key.

- `angles.webp`: the user images beside the renders of `main` that match them.
- `user54.webp` and `user55.webp`: `pnpm close-views play <dir> --at fox-red --azimuth 45
  --azimuth 30` and `--at rabbit --azimuth 60 --azimuth 45`, `--zoom 3 --elevation 10 --time 30
  --pause --base main`.
- `cause-fox.webp`, `cause-rabbit.webp`: the posed rest skin of `main` with the faces of the hard
  edges in red (`probes/crease.ts --obj` and `obj-views.py` of `docs/research/2026-10-27-cat-fox/`).
  `normals-fox.webp`, `normals-rabbit.webp`: `--probe normals` of `main` at rest.
- `<role>-e20.webp`, `<role>-e40.webp`: rest, the play, lift40, and lower60 from front, back,
  left, right, ±35°, and ±150°, from `pnpm close-views <role> <dir> --base main --sheet --moments
  <each moment> --views front,back,left,right,35,-35,150,-150 --zoom 2.2 --elevation <e>`. The
  sheets of each moment of `ROLE_VIEWS` with each step of the moves were checked one by one.

On `main`, the stage camera shows a dark notch in the crook of the right elbow of both foxes in
the moves and at rest (az±35), and hard lines with dark slits at both arm roots of the rabbit
(front, az±35). The round shows none of them, and no new line, dent, or fold in any view.

## 8. Open

- At rest, the crook of the right fox elbow keeps a soft fold of the skin, with no hard line: the
  linear blend pinches the bent inner elbow. A dual quaternion bind folds a bow arm that bends
  further than the bind (`docs/research/2026-10-27-cat-arm.md`).
- At rest, a soft groove stays between the front of each rabbit upper arm and the trunk. It is the
  gap of the arm copy, which the arm-down shape gives back. A fill of the gap in
  `tools/blender/violin_arms.py` can close it.
- The white chest of both foxes shows thin dark V lines: splits of the normals of the fur spikes
  of the user mesh, on `main` too. They lie on the trunk, outside the regions of this round.
