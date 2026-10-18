# Cinematic light and render: audit and plan (2026-10-17)

This report audits the light and the render of the stage against the newest reference image. The
scope is `src/scene/`, the stage material, and design 4.1 and 4.5. The report gives measures,
findings in the order of their visual effect, the options for each finding with their costs, and
a plan in phases. Nothing in it is decided. Section 7 lists the conflicts with the design that
need a decision of the user.

The code is `main` at `b9583f0a`, with three.js 0.186.1. The probes and the compare image are in
[`2026-10-17-cinematic-lighting/`](2026-10-17-cinematic-lighting/). Run each probe from the root
of the repository:

| Probe | Command | Output |
|---|---|---|
| `tone_measure.py` | `uv run --no-project --with pillow python -I docs/research/2026-10-17-cinematic-lighting/tone_measure.py` | Section 2.1 |
| `floor_measure.py` | `uv run --no-project --with pillow python -I docs/research/2026-10-17-cinematic-lighting/floor_measure.py` | Section 2.2 |
| `stage_light.ts` | `node docs/research/2026-10-17-cinematic-lighting/stage_light.ts` | Sections 2.3 and 4.1 |
| `compare.py` | `uv run --no-project --with pillow python -I docs/research/2026-10-17-cinematic-lighting/compare.py` | `compare.webp` |

The report compares two frames:

- The app: [`play-1440x900.webp`](../snapshots/2026-10-17-eb4002fe/play-1440x900.webp) of the
  snapshot `2026-10-17-eb4002fe`. It shows the default demo in the default view.
- The target: [`orchestra-latest.png`](../reference/orchestra-latest.png). It wins over the other
  references (design 1). The close shots of [`scene.png`](../reference/scene.png) show the
  reflections of the brass and the piano.

Both frames show the stage from about the same height. The default view is 33° above its target,
and `DEFAULT_ELEVATION` of `src/shots/view.ts` records that this matches `orchestra-latest.png`.
The cast and the stage items differ: the reference has a choir, timpani, and trombones. So a
measure of the whole frame mixes the light with the content. Sections 2.2 and P0 use matched
regions for this reason.

## 1. Result

The post effects are good, and they do not limit the look. The scene renders into a float target
with MSAA. The final pass has a bloom, a thin-lens depth of field, AgX, a grade, a vignette, and
a grain. A visible beam uses the depth of the scene.

The gap is in the light model. The reference looks like a path-traced render. It has soft area
shadows that get harder at contact, contact occlusion, warm light that bounces from the lit
floor, and air with a little haze. The app has these differences:

- One shadow edge of a fixed width.
- No occlusion on the stage or the props.
- A fill light that does not follow the pool of light.
- No air outside the beam cone.

Four brightness corrections also stack up, and together they make the mid tones milky.

Three constraints shape the plan:

1. **The frame budget is already used.** The GPU time of a frame is above the target of 4 ms of
   design 9.7 (section 2.4). Each new pass needs a pass that it replaces, or a decision of the
   user.
2. **The species colors depend on the tone mapping.** The colors of 2026-10-08 were tuned under
   AgX and the grade. Design 7.1 records that a neutral tone mapping showed the fox fur at a value
   of 119 against 156 in `fox-views.png`.
3. **The design rejects per-pixel noise in the shadows.** Design 4.5 (SC5) removed the turn of
   the shadow samples by a noise, because it showed as a dither on the lit faces of close shots.

The recommended route has the largest gain inside these constraints:

- Bake the soft shadows and the contact occlusion of the static props into the stage, one time
  for each layout. This costs no GPU time in each frame.
- Keep AgX, and replace the grade and the highlight lift with a 3D lookup table (LUT) that code
  makes.
- Band-limit the grain of the floor.
- Capture the hall and the lit stage as the environment map.

Screen-space occlusion, PCSS, and temporal anti-aliasing come later, when the measures show a
gap. A move to `WebGPURenderer` belongs to the performance sweep.

## 2. Measures

### 2.1 The tone of the stage area

`tone_measure.py` measures the middle band of each frame (45% to 85% of the height, 20% to 80% of
the width). The luma is 0 to 255.

| Frame | p5 | p25 | p50 | p75 | p95 | Median saturation |
|---|---|---|---|---|---|---|
| App | 27 | 74 | **126** | 175 | 205 | **0.51** |
| `orchestra-latest.png` | 27 | 60 | **107** | 154 | 211 | **0.60** |

The black point (p5) and the white point (p95) match. The mid tones of the app are about 20 levels
brighter and less saturated. The problem is the shape of the light and the shadows. The total
brightness is correct.

### 2.2 The floor

`floor_measure.py` measures boxes of the floor. `compare.webp` shows the same regions.

![The reference (left) against the app (right): stands, the podium, and the lit floor](2026-10-17-cinematic-lighting/compare.webp)

Floor with cast shadows. The ratio is luma p90 divided by luma p5. The shadow color is the mean of
the darkest 5% of the pixels.

| Region | Luma p5 | Luma p90 | Ratio | Shadow color (RGB) |
|---|---|---|---|---|
| Reference, cello stands | 63.6 | 163.5 | 2.6 | (65, 43, 27) |
| Reference, podium front | 36.9 | 172.2 | 4.7 | (53, 30, 16) |
| App, rabbit shadows | 39.1 | 205.3 | 5.3 | (52, 32, 20) |
| App, viola shadows | 25.6 | 133.1 | 5.2 | (33, 17, 10) |

Lit floor with no shadow and no animal (median color of each box):

| Region | RGB | Hue | Saturation |
|---|---|---|---|
| Reference, right of the cellos | (191, 126, 79) | 25° | 0.59 |
| Reference, left of the podium | (239, 182, 128) | 29° | 0.46 |
| Reference, right of the podium | (214, 148, 95) | 27° | 0.56 |
| App, right of the podium | (231, 194, 143) | 35° | 0.38 |
| App, left of the podium | (231, 193, 137) | 36° | 0.41 |
| App, front left | (224, 176, 121) | 32° | 0.46 |

The shadows of the app have a higher contrast to the lit floor (5.2 to 5.3 against 2.6 to 4.7),
and they are dark warm brown. The lit floor of the app is more yellow (hue 32° to 36° against 25°
to 29°) and paler (saturation 0.38 to 0.46 against 0.46 to 0.59).

### 2.3 The key light and its shadow map

`stage_light.ts` builds the layout of each demo and reads the key light from `KEY_LIGHT` of
`src/scene/lights.ts` and `SPOT_HEIGHT_IN_SIDES` of `src/models/beam.ts`.

- The stage side `S` is 6.79 m to 12.33 m over the 14 demos. The default demo
  (`boulanger-matin.mid`) has `S` = 11.70 m.
- The key light stands 1.2 S above the stage top, 14.03 m for the default demo. It is 17.59 m from
  its aim point.
- One texel of the shadow map at the aim point is 1.29 cm on the high tier (2048 texels).

The edge of each shadow has one width at each distance from the caster:

| Tier | Map | Blur radius | Texel | Edge width |
|---|---|---|---|---|
| High | 2048 | 3 texels | 1.29 cm | 7.8 cm |
| Medium | 1024 | 1 texel | 2.59 cm | 5.2 cm |
| Low | 512 | 1 texel | 5.18 cm | 10.4 cm |

### 2.4 The frame time

[`2026-10-13-frame-time.md`](2026-10-13-frame-time.md) (section 10.3) gives the last measure of
the high tier with `perf-60.mid` on the development Mac. The run `cut1` gave a GPU time of p50
4.43 ms and p95 4.76 ms, with 19.9% of the frames within 4 ms. The target of design 9.7 is 4 ms
for 95% of the frames. In the same report, the fragment work of the scene with MSAA took 2.00 ms
(mean), and the final pass took 0.37 ms.

The bodies changed after that run, and the frame test is paused
([`2026-10-14-test-pause.md`](../decisions/2026-10-14-test-pause.md)). So no newer measure
exists.

## 3. Findings, in the order of their visual effect

### F1. The shadows have one hard edge width, and a high contrast

- The edge width is 7.8 cm at each distance from the caster on the high tier (section 2.3). The
  filter takes 12 samples of a Vogel disc with no turn (`SHADOW_SAMPLES` of
  `src/scene/shadow-chunk.ts`).
- The shadows of the stands and the chairs fan out toward the camera as crisp dark shapes. They
  are the strongest graphic element on the floor (`compare.webp`, row 1).
- In the reference, the shadows are soft and light. They are sharp only where a leg meets the
  floor. The floor contrast of the shadows is 2.6 to 4.7 against 5.2 to 5.3 in the app
  (section 2.2).
- This finding does most to make the frame look like a game engine.

### F2. The stage and the props have no contact occlusion

- Design 4.5: "The props and the stage get no occlusion." Only the parametric bodies get a baked
  occlusion in their vertex colors, and the studio bodies keep the occlusion of their files.
- The chairs, the stand feet, the podium, and the feet of the players do not touch the floor
  visually. In the reference, each chair leg has a dark contact point, and the podium has a soft
  dark border on the floor (`compare.webp`, row 2).

### F3. The fill light does not follow the pool of light

The shadow sides get light from three sources:

- The `HemisphereLight` of `FILL` in `src/scene/lights.ts` (`#302a26` and `#2c241e`, intensity 5).
- The diffuse part of the environment map. `show()` of `src/scene/stage-scene.ts` sets
  `scene.environment` with `environmentIntensity` 0.6 (`ENVIRONMENT.intensity`).
- The two side lights of `SIDE_LIGHT`, which cast no shadow.

None of these sources follows the bright pool on the floor. The pool should send warm light up
into the chins, the bellies, the undersides of the instruments, and the chair seats. In the
reference, the shadow sides of the animals are warm and lit. In the app, they are a flat dark
color, and the forms look flat.

### F4. Four brightness corrections stack up

| Correction | Where | Effect |
|---|---|---|
| Exposure 0.8 | `rendererSettings()` of `src/scene/renderer.ts` | Makes all values darker. |
| Highlight lift 1.0 after AgX | `POST_LOOK.highlights` of `src/scene/post.ts`, `GRADE_FUNCTION` of `src/scene/post-shaders.ts` | Makes the mid and high tones lighter again. The lift adds `smoothstep(0.45, 1, c) × (1 − c)`, so a display value of 0.70 becomes 0.83. This gives the milky mid tones. |
| Stage gloss × 2.0 | `STAGE_FINISH.specular` of `src/scene/stage.ts` | Adds more light than the surface gets. Its TSDoc gives the reason: the roughness 0.6 widens the pool to the falloff of the reference, and the factor brings the wood beside the podium back to the value of the reference. |
| Shadow saturation 0.45 | `POST_LOOK.shadowSaturation` of `src/scene/post.ts` | Makes the shadows gray. Film shadows keep their color. |

AgX compresses the light values and removes saturation on purpose. The grade then moves the image
back toward the mockup. The measures of section 2 show the result: mid tones 19 levels too light,
saturation 0.09 too low, and a lit floor that is too yellow and too pale.

The pool factor of `addLightPool()` (`src/scene/light-pool.ts`) multiplies each spotlight. It is
not physical, but it gives the pool of the reference at a low cost. Keep it.

### F5. The floor reads as streaks

- The grain is a `fract(sin())` value noise, stretched along x, with no band limit (`GRAIN_GLSL`
  of `src/scene/stage.ts`). It changes the color by up to 16% and the roughness by up to 0.12. At
  the distance of the default view, it shows as horizontal streaks. The plank seams and the steps
  of tone between the planks do not show (`compare.webp`, row 3). In a moving camera, the
  streaks shimmer.
- three.js already widens the roughness by the screen derivatives of the geometric normal
  (`geometryRoughness` in `lights_physical_fragment` of r186). The stage top is flat, so this
  correction is 0. The shimmer comes from the grain of the shader, so a band limit of the grain is
  the full fix.
- The reference shows short planks with clear seams and soft steps of tone, a broad sheen, and a
  glare behind the podium. It shows no sharp mirror image of a player.

### F6. The environment map is made of boxes

`buildEnvironmentScene()` of `src/scene/environment.ts` renders a dark sphere, 10 lamp boxes, and a
box above. The renderer makes it one time (`createEnvironment()` in the constructor of
`StageScene`). The piano lacquer, the brass, and the copper timpani reflect a pattern that matches
nothing in the frame. In `scene.png` (07, 08), the brass and the piano lid reflect the lit stage
and the lamps of the hall.

### F7. The air outside the beam cone is black

The haze exists only in the narrow cone of `BEAM_LOOK` (`src/scene/beam.ts`). The hall looks like
a void, and the back rows have no aerial depth. In the reference, a warm glow of haze fills the
room around the beam, and the back rows are a little lighter and softer.

The black point of the stage already matches (p5 27 in both frames, section 2.1). A room haze must
not lift it. So the haze must grow with distance, and stay very thin near the stage.

### F8. One light setup serves each shot

The automatic camera cuts between wide, conductor, section, and solo shots (design 5.6). The light
stays the same, except for the face light of the conductor (`CONDUCTOR_LIGHT`) and the solo light
(`soloAim()`). On a film set, the crew sets the light again for each setup. A close shot gets its
own soft key at 30° to 45° from the camera axis, a kicker, and its own exposure.

### F9. The lens and film effects are few

The bloom starts at a linear value of 1.8 (`POST_LOOK.bloomThreshold`), so only the lamps bloom.
The reference has a soft glow around each highlight, as a diffusion filter gives. The app has no
halation, and the vignette is the same in each shot.

### F10. Thin parts shimmer

- The app has no temporal anti-aliasing. The bows, the strings, the baton, and the stand legs
  shimmer under MSAA alone.
- The depth of field renders its own depth pass at half size (`#renderDepth()` of
  `src/scene/post.ts`), and `BeamDepth` renders a depth at full size. A shot with a shallow focus
  thus has one more geometry pass. `BeamDepth` hides the hall, and the depth of field needs the
  hall.

## 4. Options

### 4.1 Soft shadows (F1)

| Option | Edge | Noise | Cost in each frame | Notes |
|---|---|---|---|---|
| Wider fixed PCF | One width, wider | No | More taps | Does not get harder at contact. |
| PCSS (blocker search, then a filter) | Grows with the distance from the caster | Yes, at the needed widths | Two loops of taps for each lit pixel | Conflicts with SC5. |
| Bake the static props, PCF on the players | Physical for the props | No | None for the props | Needs a bake for each layout. Recommended. |
| Variance shadow map (`VSMShadowMap`) | One width, smooth | No | A blur of the map | Light leaks where casters overlap. |
| Screen-space contact shadows | Short rays near contact | Some | One pass | `SSSNode` exists only for `WebGPURenderer` (4.9). |

**The size of the light.** An area light of width `L` at the height `H` gives an edge of width
`L × h / (H − h)` at the end of the shadow of a caster of height `h`. With `H` = 14.03 m
(`stage_light.ts`):

| Caster (example height) | L 0.6 m | L 1.0 m | L 2.0 m | PCF today |
|---|---|---|---|---|
| Chair seat, 0.45 m | 2.0 cm | 3.3 cm | 6.6 cm | 7.8 cm |
| Stand desk, 1.1 m | 5.1 cm | 8.5 cm | 17.0 cm | 7.8 cm |
| Seated head, 1.3 m | 6.1 cm | 10.2 cm | 20.4 cm | 7.8 cm |

A real 2 kW Fresnel with its barn doors is about 0.6 m wide. At this height, it gives edges of 2.0
to 6.1 cm, which are harder than today's edge. The soft shadows of the reference need a light of
about 2 m. At 1.29 cm for each texel, an edge of 17 cm to 20 cm covers 13 to 16 texels. A filter of
16 samples with no turn then shows steps, and a filter with a turn by noise shows the dither of
SC5. This is the reason to prefer the bake for the props.

**The bake.** The props do not move during a song. The key light also keeps its place during a
solo: `aimKeyLight()` sets only the target, "as a spotlight that turns". So the light that reaches
each point of the stage from the static props does not change during a song. A bake can therefore
hold a true area light.

```text
 layout build (one time, and again after a restored WebGL context)
 +-----------------------+     +--------------------------------+
 | static props only:    |---->| N shadow maps, the light moved |
 | chairs, stands,       |     | at random over a disc of L     |
 | podium, risers, piano |     +--------------------------------+
 +-----------------------+                     | add up
                                               v
                             +------------------------------------+
                             | top-down texture over the stage:   |
                             | R = part of the key light that     |
                             |     reaches the floor              |
                             | G = part of the sky (occlusion)    |
                             +------------------------------------+
 each frame                                    |
 +----------------------+   +----------------------------------+
 | players only:        |-->| stage shader:                    |
 | dynamic shadow map   |   | key × min(R, dynamic)            |
 +----------------------+   | fill × G                         |
                            +----------------------------------+
```

```typescript
/** The baked light of the static props on the stage top. Each layout makes its own. */
interface StageBake {
  /** R: the part of the key light that reaches the stage. G: the part of the sky. Top-down. */
  readonly texture: Texture;
  /** The width of the area light of the bake, in meters. */
  readonly lightSize: number;
  /** The count of shadow maps that the bake adds up for each channel. */
  readonly samples: number;
}
```

- Each sample of R renders the depth of the static props from a light position on the disc. Then
  a top-down pass over the stage adds the visibility of each texel. G does the same with
  directions over the upper hemisphere, weighted by their cosine. A float target holds the sum,
  because 8 bits lose the small steps of 64 samples.
- At 1024 × 1024 texels, one texel is 1.14 cm on the default stage, and an RG8 texture takes
  2 MiB.
- `ProgressiveLightMap.js` of the three.js add-ons uses the same method: it adds up the shadow
  maps of a light that moves at random into a light map.
- The players keep the dynamic map. Set their blur radius so that their edge matches the mean
  edge of the bake, with fixed samples and no noise.
- Costs: the players lose the shadows of the props on their bodies, such as the chair on the
  shins, unless a second map keeps them. The bake time is not measured.
- A second step can add the seated players in their rest pose to G only. A seated body hardly
  moves, so its contact occlusion stays correct. Test it, because a standing soloist moves.

### 4.2 Contact occlusion (F2)

- **The G channel of the bake** gives the contact occlusion of the props on the floor at no cost
  in each frame. It does not darken the props or the bodies themselves.
- **GTAO** renders the occlusion at half size from a depth texture and needs a bilateral
  upsample. Apply it to the indirect light only: put the texture into `aomap_fragment` through
  screen coordinates, so that it multiplies the hemisphere and the environment terms. A multiply
  of the final color makes dirty halos in the direct light. three.js has `GTAOPass` for
  `EffectComposer`, but the post pipeline of the app is its own, so the pass needs a port. The
  depth of `BeamDepth` can feed it.
- **Blob decals** under the chair legs and the stand feet cost one instanced draw. They suit the
  low tier and the GPUs with no float target.

### 4.3 Tone and grade (F4)

| Option | Gain | Cost |
|---|---|---|
| `NeutralToneMapping` (Khronos PBR Neutral, in three.js r186) | Keeps the base colors | Each species color needs a new tune (design 7.1). |
| AgX with a look, such as "Punchy" | More contrast and saturation | The AgX of three.js has no looks, so `post-shaders.ts` needs its own copy of AgX. |
| AgX and a 3D LUT in place of the grade | Removes the lift and the gray shadows. Keeps the species colors. | One more texture read in the final pass. |

Recommended: AgX and a 33³ LUT that code makes.

1. Convert the current grade, with the lift, into a LUT. The frame must stay the same, pixel for
   pixel. This proves the LUT path.
2. Fit the LUT to the region targets of P0, with no lift, with shadow saturation 0.8 to 0.9, and
   with a small split tone: warm amber highlights, and neutral to slightly cool shadows. The
   rejected warm fill made the shadows red, and a split tone in the grade does not.
3. The user can edit the LUT file in Resolve or Photoshop later.

Remove the gloss factor × 2.0 together with the new floor finish of 4.5. The factor holds the
falloff of the pool, so the finish must keep that falloff.

### 4.4 The fill and the bounce light (F3, F6)

- **A captured environment.** At each layout build, and after a restored context, render the hall
  and the lit stage with no players, from above the podium, into a `CubeCamera`. Then make a
  PMREM from it. The brass, the lacquer, and the timpani reflect the real lamps and the real pool.
  The diffuse part of the map also gets the warm floor below, so the undersides of all players
  get a bounce. This costs one render for each layout and nothing in each frame.
- **A bounce term in `addLightPool()`.** Add
  `floorAlbedo × poolIrradiance(xz) × (0.5 − 0.5 × n.y) × heightFalloff`. It follows the pool: a
  player at the dark edge gets less bounce than a player in the pool. It costs a few ALU
  operations.
- **A grid of light probes** (`LightProbeGenerator` with a `CubeCamera`, 3 × 3 over the stage)
  follows the scene and costs 9 cube renders for each layout.

The captured environment and the bounce term both add the light of the floor. Tune them as one
change, or the floor light counts two times. `environmentIntensity` scales the diffuse and the
glossy parts together, so a different scale of each part needs a patch of a shader chunk.

### 4.5 The floor (F5)

- Band-limit the grain: fade each octave out by `fwidth()`, or bake the grain into a texture of
  1024 texels with mipmaps.
- Make the planks visible at the default distance: a seam line and one tone for each plank, with
  the hash of the planks that exists. The grain stays a small detail inside each plank.
- Give the walnut a broad base and a lacquer layer: a base roughness of about 0.6 and a clearcoat
  with a roughness of about 0.15, as `MeshPhysicalMaterial` does. This gives the broad sheen and
  the crisp glare of the reference, and it replaces the factor × 2.0. The stage is one mesh, so
  the extra lobe costs little.
- Do not add screen-space reflections. The reference shows no mirror image of a player.

### 4.6 Air (F7)

Add an exponential fog in the final pass from the depth at full size. Give it a warm in-scatter
that grows when the view ray points toward the key light (a Henyey-Greenstein phase with g about
0.6). The beam then sits inside air, and the back rows get aerial depth. Keep the rule of the beam
that no player is veiled: give the fog a low density that grows with distance. Check p5 of the
stage area after the change (section 2.1).

### 4.7 The lens (F9)

All of these go into the final pass:

- A diffusion: a second bloom tap with no threshold, at about 3%, from the mip levels 2 to 4.
- A halation: a red-orange tint of the bloom of bright edges.
- A chromatic aberration of less than 0.5 px at the edges.
- A vignette for each kind of shot.

The cost is a few texture reads and ALU operations in each pixel. It is not measured.

### 4.8 Light for each shot (F8)

Give each shot kind of the planner (5.6) a light preset, and let the cut change the light with the
camera:

- Close shot: a soft key 35° from the camera axis, a kicker from the side of the key light,
  +0.3 EV, and a wider vignette.
- Wide shot: the current setup.
- Solo: a second narrow follow-spot on the soloist, with `soloAim()`.

`CONDUCTOR_LIGHT` is the first case of this pattern. The preset must follow the rule of
`cameraAt()`: a pure function of the shot plan, the song time, the transport, and the view. A seek
then gives the correct light at once.

A light that follows the music is a product question. For example, the key light can change by
±5% with the loudness, and the brass can gleam on accents. Concert films often do this.

### 4.9 Thin parts and the renderer (F10)

**In `WebGLRenderer`.** `TAARenderPass` adds up frames only for a still camera, and the renderer
gives no motion vectors for skinned meshes. Two cheaper fixes exist:

- Widen the roughness of the thin glossy parts, such as the bows and the strings.
- Keep each thin cylinder at least one pixel wide, and fade its alpha by the ratio of its real
  width to that pixel. This is the "phone-wire AA" of Humus
  ([demo](https://geeks3d.com/?p=8334)), and the chapter "Wire Antialiasing" by Emil Persson in
  GPU Pro 5 (2014, pages 211 to 218,
  [entry](https://gameenginegems.com/gemsdb/article.php?id=1223)).

Let the depth of field read a smaller copy of the depth of `BeamDepth` in the shots that do not
show the hall. Or add the hall to `BeamDepth` with a mask bit. This removes one geometry pass in
each close shot.

**In `WebGPURenderer`.** The TSL add-ons of three.js r186 (`examples/jsm/tsl/display/`) hold:

- `GTAONode`, `SSGINode`, `SSRNode`, and `SSSNode` (screen-space contact shadows).
- `TRAANode` and `TAAUNode`. `Skinning.js` keeps the bone matrices of the previous frame, so the
  motion vectors cover the skinned players. The TRAA node needs MSAA off.
- `Lut3DNode`, `BloomNode`, `DepthOfFieldNode`, and `GodraysNode`.

TAAU renders at a lower size and adds up the frames. The app now renders 2880 × 1800 pixels on the
high tier, so TAAU could pay for the effects of this plan. Safari ships WebGPU since version 26
([web.dev](https://web.dev/blog/webgpu-supported-major-browsers)), and `WebGPURenderer` has a
WebGL 2 backend for the other browsers.

The cost is high. Each patch of a shader chunk must change to TSL: the shadow filter, the pool of
light, the grain of the stage, the vertex drop of the hall, and the materials of the players. The
post pipeline must change too. Make a measured test of this route in the performance sweep.

## 5. Plan

```text
 P0 look lab --> P1 cheap fixes --> P2 bake --> P3 environment and fill
   (measure)     (no conflict)      (D1)        (D3)
                                                   |
                                                   v
 P5 performance sweep <-- P4 shots, lens, and air (D4, D5)
   (WebGPU test, TRAA, GTAO, PCSS on the players, if P0 shows a gap)
```

### P0. Look lab. Do this before each change of the look

- Make the probes of this folder into a saved tool, such as an option of `pnpm snapshot`. It
  renders a fixed set of shots: default, conductor close, section close, side, and high. It also
  renders the default demo from a camera that frames the stage as `orchestra-latest.png` does
  (`pnpm close-views play --camera <dx>,<dy>,<wheel>`).
- For each shot, it writes the values of matched regions: the lit floor, the floor shadow, the lit
  fur, the shaded fur, and the hue and the saturation of each. It also writes the luma
  percentiles of the stage area.
- It stores the same values of the reference crops, so that each step of this plan gets a number.
  The repository uses this method for the models (`pnpm sheet-check`).
- When the frame test returns, `pnpm frame --keep` gives the GPU time of each encoder.

### P1. Cheap fixes with no conflict with the design

- The floor of 4.5: the band limit of the grain, the visible planks, and the clearcoat in place of
  the gloss factor × 2.0.
- The LUT of 4.3: first the same frame, then the fit with no lift.
- The exposure goes back toward 1.0 when the lift goes away.

### P2. The bake of the static props (4.1, 4.2)

The R channel for the soft shadows of the props, and the G channel for their contact occlusion on
the floor. Then match the edge of the players to the bake.

### P3. The environment and the fill (4.4)

The captured environment first. Add the bounce term only when the P0 values of the shaded fur
still miss.

### P4. The shots, the lens, and the air (4.6, 4.7, 4.8)

The light preset of each shot kind, the diffusion and the halation, the vignette of each shot, and
the room haze.

### P5. The performance sweep (4.9)

The measured test of `WebGPURenderer` with TRAA or TAAU, and the reuse of the depth of `BeamDepth`.
GTAO and PCSS on the players only when the values of P0 still show a gap.

## 6. Cost by tier

No value of this table is measured. P0 measures them, and the frame test of 9.7 checks them when
it returns. A GPU with no float target renders with no post effects (design 4.5), so the items of
the final pass do not apply to it.

| Item | High | Medium | Low | Cost in each frame |
|---|---|---|---|---|
| Bake of the static props | Yes | Yes | Yes | None (one time for each layout) |
| Captured environment | Yes | Yes | Yes | None (one time for each layout) |
| Floor band limit and clearcoat | Yes | Yes | Yes | ALU and one more lobe on the stage |
| LUT | Yes | Yes | Yes | One 3D texture read in each pixel |
| Diffusion, halation, vignette of each shot | Yes | Yes | LUT only | A few reads in each pixel |
| Room haze | Yes | Yes | Yes | ALU in each pixel, and a read of the depth |
| Bounce term | If P0 needs it | If P0 needs it | If P0 needs it | ALU only |
| GTAO at half size | If P0 needs it | Quarter size | Blob decals | One pass and an upsample |
| PCSS on the players | If P0 needs it | No | No | Two loops of taps in each lit pixel |

The bake also removes the props from the dynamic shadow pass, and P5 can remove the depth pass of
the depth of field. These two changes pay back part of the cost.

## 7. Conflicts with the design that need a decision of the user

AGENTS.md requires a decision of the user for each change that conflicts with the design. The
design file and a decision row change in the same commit.

| # | Design today | Proposal |
|---|---|---|
| D1 | 4.5: "The props and the stage get no occlusion." | The G channel of the bake on the stage (P2). GTAO on all surfaces, applied to the indirect light only, if P0 needs it. |
| D2 | 4.5: AgX, a grade, and a lift of the highlights | AgX and a LUT with no lift. A clearcoat in place of the gloss factor × 2.0 (P1). |
| D3 | 4.5: "A low, nearly neutral `HemisphereLight` is the fill" | Keep the neutral fill. Add the captured environment, and a bounce term that follows the pool if P0 needs it (P3). |
| D4 | 4.1 and 4.5: one light setup for each shot | A light preset for each shot kind (P4). |
| D5 | 4.5: haze only in the beam cone, so that no player is veiled | A thin room haze that grows with distance (P4). |
| D6 | 4.5: the shadow samples have no turn (SC5) | No change with the bake. A turn by noise only if PCSS on the players is chosen in P5. |
| D7 | 9.7: a GPU time of at most 4 ms for 95% of the frames | The last measure is 4.76 ms (section 2.4). Each item with a cost in each frame waits for the performance sweep, or the user accepts the cost. |

## 8. First three steps

1. P0, the look lab. Each later step needs its numbers.
2. P1: the floor and the LUT. They give a large visible change at almost no cost in each frame,
   and they change only `src/scene/stage.ts`, `src/scene/post.ts`, and
   `src/scene/post-shaders.ts`.
3. P2: the bake of the static props. It fixes F1 and F2 for the props, with no noise and no cost
   in each frame.

## Unverified

- The planks of the reference look shorter than the planks of the app, and their seams run at an
  angle in the image. Design 4.5 sets the planks from the left to the right, after `mockup.png`.
  To check: render the default demo from the camera of the reference in P0, and compare the
  direction of the seams.
- The shadows of the stands in the reference look shorter than in the app at the same camera
  height. That points to a key light more nearly above the orchestra. To check: measure the
  length of the shadow of one stand against its height in both frames in P0.
- Each cost in each frame of sections 4 and 6, and the time of the bake.
