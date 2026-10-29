# Panda model

This folder holds the source mesh of the panda and its rigged copy. The app does not serve these
files. It loads the module `src/models/studio/panda.ts`, which this chain writes:

```text
panda.glb                      source mesh
   │  pnpm rig-mesh panda      config tools/mesh-rigs/panda.json
   v
panda.rig.glb                  rigged mesh
   │  pnpm studio-body panda
   v
src/models/studio/panda.ts     studio body of the app
```

`docs/agents/rigging.md` gives the steps of the chain.

## Files

| File | Origin | Rebuild |
|---|---|---|
| `panda.glb` | Source mesh (below) | None |
| `panda.rig.glb` | Output of the rig. License as `panda.glb` | `pnpm rig-mesh panda` |

## panda.glb

| Item | Value |
|---|---|
| Size | 12,125,640 bytes |
| SHA-256 | `3938ac7d825f75608e3109018d8690a577b30b434f5655fc8fa296e773e1892f` |
| Origin | Generated with Meshy by the project author on a paid plan. The author holds the rights |
| License | CC BY-NC 4.0 (`../LICENSE`). It is no third-party file, so the third-party license file (design 7.3) has no entry for it |
| Writer | Khronos glTF Blender I/O v4.3.47 |
| Contents | One node `output_unwrapped` with one mesh of one primitive: 3,146 triangles and 3,953 vertices with POSITION, NORMAL, TEXCOORD_0, and indices. No skin and no animation |
| Material | One material `BakedMaterial`, double-sided, with a base color texture and a metallic-roughness texture, each a PNG of 4096 × 4096 pixels |

```bash
shasum -a 256 assets/models/panda/panda.glb
```

## Mesh facts

The values are in the units of the studio: 1 unit from the soles to the top of the ears, the soles
at y = 0, +z forward, and +x the left side of the animal. The mesh faces +z, with its left side at
+x. The weld is at 1e-5.

- The weld gives 1,575 vertices in one connected part. The mesh has no open edge and no edge with
  more than two faces. 64 faces have a corner angle below 10°.
- The box is x -0.344 to 0.344, y 0 to 1, and z -0.238 to 0.237. The panda is 1.9015 units of the
  file high from the soles to the top of the ears. The top of the skull is at y 0.986.
- The panda stands upright on short legs, with the crotch at y 0.157. Its arms hang down, out,
  and forward, with the paws beside the belly at y 0.35 to 0.45.
- The fur is white, with black ears, eye patches, shoulders, arms, and legs. The eyes are dark
  faces of the head surface inside the dark eye patches, with no shells. The nose is a patch of
  dark faces at the front of the muzzle.
- The small round ears stand on the top of the head, from y 0.90 to 1.0, beside the top of the
  skull.
- The short round tail is a ball at the back, from z -0.19 to -0.238 and from y 0.22 to 0.33.
