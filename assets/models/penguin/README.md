# Penguin model

This folder holds the source mesh of the penguin, two edited copies, and the rigged copy. The app
does not serve these files. It loads the module `src/models/studio/penguin.ts`, which this chain
writes:

```text
penguin.glb                    source mesh
   │  beak_split.py            split beak, so that the beak opens
   v
penguin-beak.glb
   │  edge_cut.py              faces cut along the black and white edge of the texture
   v
penguin-edge.glb               source of the rig (`source` of tools/mesh-rigs/penguin.json)
   │  pnpm rig-mesh penguin
   v
penguin.rig.glb                rigged mesh
   │  pnpm studio-body penguin
   v
src/models/studio/penguin.ts   studio body of the app
```

`docs/agents/rigging.md` gives the steps of the chain.

## Files

| File | Origin | Rebuild |
|---|---|---|
| `penguin.glb` | Source mesh (below) | None |
| `penguin-beak.glb` | Copy of `penguin.glb` with a split beak. License as `penguin.glb` | `beak_split.py` (below) |
| `penguin-edge.glb` | Copy of `penguin-beak.glb` with the color edge cut. License as `penguin.glb` | `edge_cut.py` (below) |
| `penguin.rig.glb` | Output of the rig. License as `penguin.glb` | `pnpm rig-mesh penguin` |

## penguin.glb

| Item | Value |
|---|---|
| Size | 13,514,964 bytes |
| SHA-256 | `a4e098c5d90f3b0de0a2a9873d783c3367c5c09afcb33a9327301382e1c7bfb2` |
| Origin | Generated with Meshy by the project author on a paid plan. The author holds the rights |
| License | CC BY-NC 4.0 (`../LICENSE`). It is no third-party file, so the third-party license file (design 7.3) has no entry for it |
| Writer | Khronos glTF Blender I/O v4.3.47 |
| Contents | One node `output_unwrapped` with one mesh of one primitive: 3,103 triangles and 3,656 vertices with POSITION, NORMAL, TEXCOORD_0, and indices. No skin and no animation |
| Material | One material `BakedMaterial`, double-sided, with a base color texture (7.5 MB) and a metallic-roughness texture (5.9 MB), each a PNG |

The values below are in the units of the studio: 1 unit from the soles to the crown, the soles at
y = 0, +z forward, and +x the left side of the animal. The mesh faces +z. The weld is at 1e-5.

- The weld gives 1,553 vertices in one part. 2 edges are open and 3 edges have more than two
  faces. 200 faces have a corner angle below 10°.
- The box is x -0.324 to 0.324, y 0 to 1, and z -0.236 to 0.234. The penguin is 1.903 units of
  the file high from the soles to the crown.
- The body is one egg from the feet up to the crown, widest at y 0.31 to 0.37 (x ±0.224) and
  deepest at y 0.43 (z -0.223 to 0.214). The head has no neck: the body is narrowest at y 0.79
  (x ±0.133).
- Each flipper hangs out and down from its root on the side of the body (y 0.48 to 0.65) to its
  tip at x 0.324 and y 0.29. It is broad from the front to the back (z -0.066 to 0.087) and free
  of the body below its root.
- The closed orange beak goes from its root at z 0.15 to its tip at z 0.234 and y 0.88. The black
  eyes are at y 0.91, with no shells.
- The feet stand under the egg, from y 0 to 0.09, with the toes forward to z 0.105. A short
  pointed tail sticks out back at y 0.05 to 0.16 and z -0.236.

## penguin-beak.glb

| Item | Value |
|---|---|
| Size | 13,518,096 bytes |
| SHA-256 | `27302fbcae0699a0ce8aa6a2a3010d66ea5438205a6737afbed6c50751330f70` |
| Writer | Khronos glTF Blender I/O of the Blender of the script |

The script splits the beak, so that the beak opens. The edits, in the units of the studio:

1. It welds the vertices at 1e-5 units of the file, as `pnpm rig-mesh` welds them.
2. The level plane at y 0.883, the height of the tip of the beak, cuts the 93 faces of the beak.
   The cut is a path of 20 edges from the left corner of the mouth (x 0.045, z 0.140) around the
   tip to the right corner (x -0.045).
3. The faces split along the path into an upper part and a lower part. Each corner of the mouth
   stays one vertex.
4. The vertices of the path move 0.0005 units of the file up on the upper part and down on the
   lower part, so that the weld does not join them again. The outer form of the closed beak stays
   the same.
5. A cap of 21 corners closes each part. The two caps share the edge between the corners of the
   mouth, and their normals point into the mouth.
6. A patch of 24 × 24 pixels of the mouth color `#4d2312` goes into a free place of the base color
   texture (u 0.044, v 0.009), and the caps take its UV.

The copy has 3,185 triangles, with the same 2 open edges and 3 edges with more than two faces. A
headless run gives the same bytes:

```bash
blender --background --factory-startup --python beak_split.py -- \
  assets/models/penguin/penguin.glb assets/models/penguin/penguin-beak.glb 0.883
```

## penguin-edge.glb

| Item | Value |
|---|---|
| Size | 13,527,960 bytes |
| SHA-256 | `0f1ac9c7397f37d7c19e82ffd7beaeb3fc2f38b3c4edf4e07b13dd10ab52277e` |
| Writer | Khronos glTF Blender I/O of the Blender of the script |

The script cuts the faces along the black and white edge of the texture. Thus each face of the rig
lies on one side, and the edge runs through the faces as on the source mesh, with no gradient. The
edits:

1. It welds the vertices at 1e-5 units of the file, as `pnpm rig-mesh` welds them.
2. Each vertex is light or dark by the Oklab lightness 0.5 of the texture at its UV. A vertex on
   the orange beak or feet has no side, because a cut at the root of the beak gave thin faces that
   folded when the beak opened.
3. Each of the 182 edges between a light and a dark vertex splits where the texture changes along
   it, from 0.15 to 0.85 of the edge. Each of the 178 faces with two new vertices splits along the
   line between them.

The copy has 3,549 triangles, with the same 2 open edges and 3 edges with more than two faces. A
headless run gives the same bytes:

```bash
blender --background --factory-startup --python edge_cut.py -- \
  assets/models/penguin/penguin-beak.glb assets/models/penguin/penguin-edge.glb
shasum -a 256 assets/models/penguin/*.glb
```
