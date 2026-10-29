# Bear model

This folder holds the T-pose source mesh of the bear, a copy with rebuilt arms and its weights,
and the rigged copy. The bear is the conductor. The app does not serve these files. It loads the
module `src/models/studio/bear.ts`, which this chain writes:

```text
bear-tpose.glb                     source mesh
   │  tools/blender/bear_arms.py   rebuilt arms and painted weights
   v
bear-arms.glb + bear-weights.json  `source` and `paintedWeights` of tools/mesh-rigs/bear.json
   │  pnpm rig-mesh bear
   v
bear-tpose.rig.glb                 rigged mesh
   │  pnpm studio-body bear
   v
src/models/studio/bear.ts          studio body of the app
```

`docs/agents/rigging.md` gives the steps of the chain.

## Files

| File | Origin | Rebuild |
|---|---|---|
| `bear-tpose.glb` | Source mesh (below) | None |
| `bear-arms.glb` | Copy of `bear-tpose.glb` with rebuilt arms. License as the source | `bear_arms.py` |
| `bear-weights.json` | Weights of the same Blender run. License as the source | `bear_arms.py` |
| `bear-tpose.rig.glb` | Output of the rig. License as the source | `pnpm rig-mesh bear` |

## bear-tpose.glb

The mesh has no skeleton. The arms are in a T-pose: out to the sides and a little down, free of
the trunk.

| Item | Value |
|---|---|
| Size | 15,839,832 bytes |
| SHA-256 | `adf2a4028fb286f90a009fb75a20215e68af4305f261e1c3f8c4c658fe242896` |
| Origin | Generated with Meshy by the project author on a paid plan. The author holds the rights |
| License | CC BY-NC 4.0 (`../LICENSE`). It is no third-party file, so the third-party license file (design 7.3) has no entry for it |
| Writer | Khronos glTF Blender I/O v4.3.47 |
| Contents | One node `output_unwrapped` with one mesh of one primitive: 3,142 triangles and 4,237 vertices with POSITION, NORMAL, TEXCOORD_0, and indices. No skin and no animation |
| Material | One material `BakedMaterial` with two PNG textures (10.2 MB and 5.5 MB) |

With a weld at 1e-5, in the units of the studio, the mesh has 1,573 vertices in one part, no open
edge, and 105 faces with a corner angle below 10°. The box is x -0.502 to 0.502, y 0 to 1, and
z -0.221 to 0.220. Each arm is free of the trunk beyond x 0.18, from y 0.58 to 0.75.

## bear-arms.glb and bear-weights.json

| Item | Value |
|---|---|
| `bear-arms.glb` | 880,212 bytes, SHA-256 `668dc799b8d8b35efe89c39deacae21dcdd50dba3dcfddce02c4f9e8eaa432c2` |
| Mesh | 4,070 triangles: on each arm a tube of 16 rings of 16 vertices, joined to the trunk and the paw with Bridge Edge Loops |
| Material | One material with one base color JPEG of 4096 × 4608 pixels: the atlas of the source, and a strip of 512 pixels on top with the fur color of the source arms, baked onto the new faces. No metallic-roughness texture |
| `bear-weights.json` | 455,330 bytes, SHA-256 `7e970caab8f2ad1f46b83825c98e73ab2ddb376fa9a74e3892f3bfc6e58747f9` |
| Weights | The automatic weights of Blender with the Weight Paint fixes of the script, on the studio bones and the arm segments and helpers (`armSegments` of the config), for `paintedWeights` of the config |

The script puts new quad faces on each arm from the shoulder line to the wrist, because the long
thin faces of the source arm folded into shards under the bent elbow. The faces of the paws, the
trunk, the legs, and the head are the faces of the source. The new arm surface lies on the old
one, with the arm length of the source, except at the taper of each wrist (below).

- **Flatten.** The inner side of each upper arm is a little flatter, so that it stays out of the
  round belly. The flatten comes after the bake, so that each texel takes the fur of its own place
  on the source arm. A flatten before the bake moves the tube out of the reach of the bake rays,
  and the bake then writes black texels under the armpits.
- **Wrist.** Each wrist band has 5 rings, from 0.016 units before the joint to 0.016 units past
  it on the paw (`WRIST_RINGS`). The wrist cut stands parallel to the last ring. Smooth Vertices
  and a Shrinkwrap even the band of each wrist (`cut_planes()` and `step_smooth_wrist()`), as on
  the polar bear, and a Smooth of the weights near each joint (`wristSmooth`) lets the paw
  weights start with no kink.
- **Taper.** The end of each forearm is thinner on the palm side: up to 0.02 units on the left
  and 0.03 units on the right, from 0.04 or 0.05 units before the joint (`step_taper()`). The
  paw is thick, so a bend of 40° about a joint on its axis bunches the skin of the inner side.
  Over the full source radius, the bunched skin made a light ridge and a dark slit across the
  wrist. The taper comes after the bake, as the flatten does.

A run gives the same bytes:

```bash
blender -b --factory-startup -P tools/blender/bear_arms.py
shasum -a 256 assets/models/bear/*.glb assets/models/bear/bear-weights.json
```
