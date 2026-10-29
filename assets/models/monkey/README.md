# Monkey model

This folder holds the source mesh of the monkey and its rigged copy. The app does not serve these
files. It loads the module `src/models/studio/monkey.ts`, which this chain writes:

```text
monkey.glb                     source mesh
   │  pnpm rig-mesh monkey     config tools/mesh-rigs/monkey.json
   v
monkey.rig.glb                 rigged mesh
   │  pnpm studio-body monkey
   v
src/models/studio/monkey.ts    studio body of the app
```

`docs/agents/rigging.md` gives the steps of the chain.

## Files

| File | Origin | Rebuild |
|---|---|---|
| `monkey.glb` | Source mesh (below) | None |
| `monkey.rig.glb` | Output of the rig. License as `monkey.glb` | `pnpm rig-mesh monkey` |

## monkey.glb

| Item | Value |
|---|---|
| Size | 16,090,928 bytes |
| SHA-256 | `9bc5c97007e30b23f7220eed227124c979bbce86b6d47eea1988d7ddfb91efc6` |
| Origin | Generated with Meshy by the project author on a paid plan. The author holds the rights |
| License | CC BY-NC 4.0 (`../LICENSE`). It is no third-party file, so the third-party license file (design 7.3) has no entry for it |
| Writer | Khronos glTF Blender I/O v4.3.47 |
| Contents | One node `output_unwrapped` with one mesh of one primitive: 3,129 triangles and 5,211 vertices with POSITION, NORMAL, TEXCOORD_0, and indices. No skin and no animation |
| Material | One material `BakedMaterial`, double-sided, with a base color texture (10.4 MB) and a metallic-roughness texture (5.5 MB), each a PNG |

```bash
shasum -a 256 assets/models/monkey/monkey.glb
```

## Mesh facts

The values are in the units of the studio: 1 unit from the soles to the highest point, the soles
at y = 0, +z forward, and +x the left side of the animal. The mesh faces +z, with its left side at
+x. The weld is at 1e-5.

- The weld gives 1,568 vertices in one part. 6 edges are open and 3 edges have more than two
  faces. 229 faces have a corner angle below 10°.
- The box is x -0.283 to 0.283, y 0 to 1, and z -0.148 to 0.147. The monkey is 1.8988 units of
  the file high from the soles to the top of a small tuft of hair on the head. The skull top
  under the tuft is at about y 0.965.
- The monkey stands upright on short legs, with the crotch at y 0.215. The long arms hang down
  and out. They are apart from the body from x 0.09 out, with long dark brown hands and fingers
  down to y 0.27. The feet are dark brown too.
- The fur is brown, with a cream face, chest, and belly. The large dark eyes have white rims, at
  y 0.83 to 0.87 and z 0.10, with no shells.
- A small brown nose is at the front of the muzzle (z 0.147 at y 0.81). The texture has thin
  brown brows and a thin smile line.
- The round pink ears stand at the sides of the head, from x 0.12 to 0.17.
- The long thin tail leaves the back of the haunch at y 0.27 and goes down to the floor behind
  the right foot. It ends in a curl that stands up on the floor at x -0.25 to -0.13.
