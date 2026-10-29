# Badger model

This folder holds the source mesh of the badger and its rigged copy. The app does not serve these
files. It loads the module `src/models/studio/badger.ts`, which this chain writes:

```text
badger.glb                     source mesh
   │  pnpm rig-mesh badger     config tools/mesh-rigs/badger.json
   v
badger.rig.glb                 rigged mesh
   │  pnpm studio-body badger
   v
src/models/studio/badger.ts    studio body of the app
```

`docs/agents/rigging.md` gives the steps of the chain.

## Files

| File | Origin | Rebuild |
|---|---|---|
| `badger.glb` | Source mesh (below) | None |
| `badger.rig.glb` | Output of the rig. License as `badger.glb` | `pnpm rig-mesh badger` |

## badger.glb

| Item | Value |
|---|---|
| Size | 15,344,392 bytes |
| SHA-256 | `773703b679ce831d8011429243cdc007b9e2c71daad3d05c057d97d8e5c5c77d` |
| Origin | Generated with Meshy by the project author on a paid plan. The author holds the rights |
| License | CC BY-NC 4.0 (`../LICENSE`). It is no third-party file, so the third-party license file (design 7.3) has no entry for it |
| Writer | Khronos glTF Blender I/O v4.3.47 |
| Contents | One node `output_unwrapped` with one mesh of one primitive: 3,129 triangles and 4,202 vertices with POSITION, NORMAL, TEXCOORD_0, and indices. No skin and no animation |
| Material | One material `BakedMaterial`, double-sided, with a base color texture (10.6 MB) and a metallic-roughness texture (4.6 MB), each a PNG |

```bash
shasum -a 256 assets/models/badger/badger.glb
```

## Mesh facts

The values are in the units of the studio: 1 unit from the soles to the skull top, the soles at
y = 0, +z forward, and +x the left side of the animal. The mesh faces +z, with its left side at
+x. The weld is at 1e-5.

- The weld gives 1,567 vertices in one part. 2 edges are open and 1 edge has more than two faces.
  131 faces have a corner angle below 10°.
- The box is x -0.301 to 0.301, y 0 to 1, and z -0.289 to 0.287. The badger is 1.9031 units of
  the file high from the soles to the skull top, which is the highest point.
- The badger stands upright on very short legs, with the crotch at y 0.12. The round body is
  widest at y 0.25 (x ±0.22). The short arms hang down, out, and forward. They are apart from the
  body from x 0.16 out, with the paws and the light claws at y 0.31 to 0.40.
- The front of the body, the arms, and the legs have dark gray fur. The back and the tail have
  gray fur. The head is white, with a black stripe over each eye from the snout to the ear.
- The black nose is at the tip of the snout (z 0.287 at y 0.838). The black eyes are at y 0.89
  and z 0.16. A dark smile line is under the snout.
- The round ears with white rims stand at the sides of the top of the head, from y 0.90 to 0.98.
- The short tail sits low on the back, from y 0.10 to 0.155 and back to z -0.289.
