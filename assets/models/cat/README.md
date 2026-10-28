# Cat model

This folder holds the cat mesh that the user gave. The app does not serve it.

## cat-arms.glb and cat-weights.json

`cat-arms.glb` is `cat.glb` with new faces on each arm and under it, with the upper arm 0.92 and
the forearm 0.78 as long, and with arms 0.85 as thick. On 2026-10-24 the user said: "note that there's significant twisting
happening for the arms and wrists. add loop edges and retopology and additional bones if needed to
address them". The upper arm of `cat.glb` joins the side of the trunk down to the elbow, so the edit
also makes an armpit: a cut along the seam where the arm meets the trunk, a side wall of the trunk
under the arm, and a quad tube from the shoulder to the wrist, whose flat inner side lies on the
side wall and meets it only at the armpit line. `tools/blender/cat_arms.py` replays the Blender
session that made both files, byte for byte. The faces of the paws, the trunk, the legs, and the
head are the faces of the user. The arms get their length in the copy, because a rig with arm
segments does not stretch the arms: 1.10 head heights from the shoulder joint to the wrist, 1.30
on the mesh of the user, with the cross-section 0.85 of the source (`armGirth` 0.85 of
2026-10-17). The user said "the cat's arm has dent and is longer than expected" on 2026-10-27.
From 2026-10-25 to 2026-10-26 they were 1.1496 times longer, and the user said "the cats arms are
too long". `pnpm rig-mesh cat` writes `cat.rig.glb` from it (`tools/mesh-rigs/cat.json`),
and `pnpm studio-body cat` writes `src/models/studio/cat.ts`.

The trunk of the copy is an even oval from the front and from the side. The user said "make the
cat's belly more oval and smooth" on 2026-10-27. The belly front of `cat.glb` has an upright chest
and a peak low on the belly, and its sides are a straight cone. The step `step_belly()` of the
script moves the belly front onto an ellipse arc, each side onto an even curve, and the belly
front part of the way to a half ellipse at each height, at most 0.016 units. The front of the
upper belly, where the bow upper arm lies in the play, is a little flatter, most at the middle
line (`flat`, `docs/research/2026-10-27-cat-lap.md`). The faces and the colors of the trunk stay
(`docs/research/2026-10-27-cat-belly.md`).

The side wall under each arm rounds into the trunk. The fill of the seam was a flat fan of 27
long thin faces, and the cut left lips under it: small trunk faces that turned back under the
wall. The raised arm of the play showed them as a light patch with a crease, and the user said
"the cat's arm has lumps" on 2026-10-27. The step `step_round_wall()` of the script deletes the
lips, fills the hole again with even faces, and smooths the wall and the trunk near it along the
normal of the plane of the seam (`docs/research/2026-10-28-cat-wall.md`).

The tube of each arm is an even round from the shoulder to the paw. The seated bind of
`pnpm rig-mesh cat` bends each elbow 79° and turns the left paw 120°, so it binds the left lower
arm with the dual quaternion blend (`bind.arm` of the config): the elbow and the forearm keep the
round of the tube. With the linear blend, they were 0.86 and 0.84 as thick, and the user said
"the cat's arm has lumps" on 2026-10-27 (`docs/research/2026-10-27-cat-arm.md`). The bow arm
keeps the linear blend, because it bends further than the bind in the play.

| Item | Value |
|---|---|
| `cat-arms.glb` | 1,181,012 bytes, SHA-256 `9dd6e48077b7badc90917ecb5a61595750911531bc41c2d1110108e888e2e76f` |
| Mesh | 2,156 vertices after a weld at 1e-5, 4,307 triangles (3,121 in the source): on each arm a tube of 16 rings of 16 vertices, joined to the shoulder socket and to the paw with Bridge Edge Loops, and a side wall of 54 (left) and 50 (right) faces under each arm |
| Material | One material with one base color JPEG of 4096 × 4608 pixels: the atlas of the source, and a strip of 512 pixels on top with the fur color of the source arms, baked onto the new faces. The side walls and the flat inner sides of the arms take one gray fur texel of the trunk beside the seam. No metallic-roughness texture |
| `cat-weights.json` | 482,622 bytes, SHA-256 `22bf33d4aff9598bd5e61fec6dff3c1b143952cb6c1568f422cd0e92a7db673f` |
| Weights | The automatic weights of Blender with the Weight Paint fixes of the session, on the studio bones and the arm segments and helpers (`armSegments` of the config), for `paintedWeights` of the config |
| License | Derived from the mesh of the user, who holds its rights |

```bash
shasum -a 256 assets/models/cat/cat-arms.glb assets/models/cat/cat-weights.json
```

## cat.glb

`cat.glb` is a mesh with no skeleton. The user gave it on 2026-10-16. The file is the file of the
user, byte for byte. The rig of this project makes a studio body from it, as for the rabbit mesh
and the fox mesh (route 3 of `AGENTS.md`, `tools/mesh-rigs/cat.json`): `pnpm rig-mesh cat` writes
the rigged file `cat.rig.glb`, and `pnpm studio-body cat` writes the module
`src/models/studio/cat.ts` from it. The app does not serve the two GLB files.

The user said these things on 2026-10-16, in this order:

1. With the sheet `docs/reference/cat-views.png`: "after this round, update the cat model to use
   this".
2. "note that we should use the same bead/pea eyes as the fox and rabbit".
3. "this is the model for cat:
   /Users/xueqiaoxu/Downloads/Meshy_AI_Cat_Remeshed_3K_Trian_1017021112_texture.glb".

| Item | Value |
|---|---|
| File | `cat.glb`, 14,466,300 bytes |
| SHA-256 | `0ca57eaa7f831ce5f17ff889d46b935e6c21400e69a597347c1381f0305cda9e` |
| Source | Generated by the user, who gave it to this project on 2026-10-16 as `Meshy_AI_Cat_Remeshed_3K_Trian_1017021112_texture.glb` |
| Writer | Khronos glTF Blender I/O v4.3.47 |
| Contents | One node `output_unwrapped` with one mesh of one primitive: 3,121 triangles and 4,148 vertices with POSITION, NORMAL, TEXCOORD_0, and indices. No skin and no animation |
| Material | One material `BakedMaterial`, double-sided, with a base color texture and a metallic-roughness texture, each a PNG of 4096 × 4096 pixels. The texture is an atlas of an automatic unwrap |
| License | The user generated the model and holds its rights. It is no third-party file, so the third-party license file (design 7.3) has no entry for it |

To check the file:

```bash
shasum -a 256 assets/models/cat/cat.glb
```

These facts of the mesh were measured on 2026-10-16 with the probes of
`docs/research/2026-10-16-cat-mesh/` (`facts.txt`, `sections-y.txt`, and `head-colors.txt`):

- A weld at 1e-5 gives 1,563 vertices in one connected part. The mesh has 2 open edges and 6
  edges with more than two faces. 318 faces have a corner angle below 10° (the fox mesh has 178).
- The box is x -0.491 to 0.490, y -0.952 to 0.952, and z -0.419 to 0.426. Thus the cat is 1.903
  units high from the soles to the tips of the ears.
- The cat faces +z, with its left side at +x. These are the axes of the studio.
- The cat stands in an A-pose: the arms go down and out at about 58° below the horizontal.
- It has gray fur, a cream chest and belly, white paws, pink inner ears, and a pink nose. The eyes
  are dark faces of the head surface with a few green faces, with no shells. Thin whiskers stand
  out from the muzzle.
- The tail hangs down behind the legs from the lower back, and its end goes back along the floor.
  The sheet shows a tail that curls up at its end.
