# Codebase quality audit

Date: 2026-10-09. Base commit: `77347986`.

The user requested an audit of the codebase with quality ratings between 0 and 100 across multiple angles. This audit evaluates architecture, type safety, testing, audio engineering, graphics, performance, documentation, developer experience, and accessibility. The audit made no changes to the code.

## Automated checks

The audit executed all automated validation suites before the review.

| Check | Command | Result |
|---|---|---|
| Linter | `pnpm lint` | 0 errors, 0 warnings across 453 files |
| Type check | `pnpm typecheck` | 0 errors |
| Unit tests | `pnpm test` | 2,176 passed across 184 files in 40.5 s |
| Performance benchmarks | `pnpm test:perf` | 8 passed across 5 files in 7.4 s |
| Format validation | `pnpm format:check` | 461 files checked, all valid |
| First download size | `pnpm size` | 476,700 B gzipped (limit: 1,000,000 B) |
| End-to-end tests | `pnpm test:e2e --project=chromium` | 66 passed in 1.2 m |
| Keyboard accessibility | `pnpm keyboard` | All desktop and mobile checks passed |
| Production build | `pnpm build` | Successful, with 1 chunk size warning |

## Ratings

Each category receives a rating from 0 to 100 based on design adherence, defect density, and software quality.

| Angle | Rating (0-100) | Core strengths | Primary weaknesses |
|---|---|---|---|
| Architecture and modularity | 96 | Pure core isolation, unidirectional flow, stateless poses | Monolithic files in shot planning and scene layout |
| Type safety and TypeScript | 99 | Strict flags, 0 double casts, 0 any, custom anti-slop rules | Internal helper exports that leak to module boundaries |
| Testing and verification | 97 | 2,176 unit tests, physical clearance tests, E2E suites | Safari automation blocks native WebKit automation in CI |
| Audio engineering and pipeline | 94 | Worker decoding, audio worklet isolation, pre-warm JIT pass | Vestigial volume commands in the worklet processor |
| 3D graphics and kinematics | 93 | Analytical inverse kinematics, dynamic spotlights, clean rigs | Conductor bow faces orchestra, and polish tasks remain |
| Performance and resource budgets | 95 | 476 KB first download, zero frame allocations, 60 fps tiers | Vendor chunk exceeds default Vite warning threshold |
| Documentation and STE integrity | 92 | Comprehensive design files, STE prose, full export TSDoc | 142 private class members omit TSDoc comments |
| Developer experience and tooling | 98 | Fast tooling, automated scripts, git merge automation | SoundFont build step takes several seconds on clean builds |
| Accessibility and user experience | 96 | Full keyboard control, >= 44 px touch targets, 4.5:1 contrast | Mobile browser URL bar shifts can cause viewport resizes |
| Overall quality score | 95.7 | Exceptional architectural rigor and testing depth | Minor file length and documentation hygiene issues |

## Angle analysis

### 1. Architecture and modularity (96/100)

The codebase implements a pure core architecture. The modules `midi/`, `score/`, `pose/`, `models/`, and `shots/` run without DOM access, system clocks, or Three.js scene-graph objects. These modules accept explicit parameters and use seeded random generators.

Poses and cameras remain stateless. `poseAt()` calculates animal positions directly from score data, song time, and wall time. `cameraAt()` derives camera matrices only from the shot plan and transport state. Seeking, speed alterations, and track mutes cause no pose desynchronization.

The system enforces unidirectional data flow. MIDI byte buffers feed the score generator. The score generator produces layout and shot plans. The renderer consumes these plans without mutating domain state.

Points for improvement:
- `src/shots/prepare.ts` contains 1,916 lines. It combines subject selection, phrase detection, and clearance validation.
- `src/models/layout-scene.ts` contains 1,613 lines. It manages stage margins, riser geometry, and seat positions in one file.

### 2. Type safety and TypeScript rigor (99/100)

The TypeScript configuration enables all strict compiler flags. These flags include `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, and `erasableSyntaxOnly`.

The codebase contains zero instances of `any` and zero instances of `as any`. Production code contains zero double assertions (`as unknown as T`). The linter permits type assertions only at input-output boundaries, and each assertion includes a `SAFETY:` explanatory comment.

The custom Oxlint plugin (`tools/oxlint/anti-slop/`) enforces 15 structural rules. The linter forbids runtime `typeof` outside boundaries, bans empty object spreads, and prevents dictionary type widening.

Points for improvement:
- Several internal helper functions and constants retain public `export` keywords despite having no external consumers.

### 3. Testing and verification (97/100)

The automated test suite contains 2,176 unit tests across 184 test files. Tests execute in 40.5 seconds. The test suite exercises boundary conditions, voice leading, divisi distribution, and parser edge cases.

Physical clearance tests inspect geometric invariants. The test suite verifies that conductor paws never intersect the music stand. Tests ensure that bows do not penetrate player bodies during performance. Camera tests confirm that foreground objects never occlude soloist heads.

Performance regression tests (`*-speed.test.ts`) compare calculation durations against development baselines.

Points for improvement:
- Automated tests run against Chromium, Firefox, and WebKit on Linux. Native Safari on macOS requires manual verification because Safari 26 disables remote automation by default.

### 4. Audio engineering and pipeline (94/100)

The audio architecture isolates synthesis from the user interface. An AudioWorklet processor hosts the synthesis engine. The processor runs on a high-priority thread and exchanges events through a MessagePort.

The SoundFont pipeline splits large sound libraries into individual instrument files. The client fetches only the instruments that the active score requires. A Web Worker decodes compressed SF3 files to linear PCM buffers off the main thread.

The synthesis engine renders silent warm-up blocks during piece loading. This pre-warm step forces JIT compilation before audible playback starts, preventing initial audio dropouts.

Points for improvement:
- The worklet processor retains unused message handlers for volume adjustment. Master volume operates through an AudioNode gain stage.

### 5. 3D graphics, kinematics, and animation (93/100)

Procedural animal meshes use a low-poly aesthetic. Procedural instruments match historical instrument geometries. Two-bone analytical inverse kinematics position player arms and hands on instruments.

Spotlight projection modifies Three.js material shaders via `onBeforeCompile`. This technique avoids expensive real-time shadow map evaluations while projecting dynamic light pools onto soloists.

Conductor motions reproduce standard conducting patterns for 2/4, 3/4, 4/4, and 6/8 time signatures. The conductor signals section entries with expressive left-arm cues.

Points for improvement:
- The conductor bow animation at the conclusion of a piece faces the orchestra rather than the audience.
- Polish tasks for background hall lighting and post-processing remain open in Step 8.

### 6. Performance and resource budgets (95/100)

The first download payload totals 476,700 bytes after gzip compression. This size remains well below the 1,000,000-byte budget limit.

Animation loops perform zero memory allocations per frame. Poses write into pre-allocated typed arrays and reusable vector scratch objects.

The runtime monitors frame rendering intervals. The system dynamically shifts between High, Medium, and Low quality tiers to maintain 60 frames per second on slower mobile hardware.

Points for improvement:
- The uncompressed minified vendor chunk (`dist/assets/renderer-*.js`) measures 1,114 kB, which exceeds the 700 kB Vite warning threshold.

### 7. Documentation and STE integrity (92/100)

All prose documentation follows ASD-STE100 Simplified Technical English rules. The text contains 0 em dashes, 0 semicolon splices, and 0 banned buzzwords.

Design files in `docs/design/` record functional specifications. Architectural decision records in `docs/decisions/` capture historical trade-offs.

Every exported class, interface, function, and constant includes a descriptive TSDoc comment.

Points for improvement:
- Approximately 142 private class members omit individual TSDoc comments, which departs from the standard in `AGENTS.md`.

### 8. Developer experience and tooling (98/100)

The toolchain provides fast execution times. Oxlint processes 453 files in 1.2 seconds. The oxfmt format checker validates 461 files in 45 milliseconds.

Automated tools support visual regression testing, SoundFont extraction, demo patching, license attribution, and headless Blender sculpt packaging.

The script `tools/merge-branch.sh` automates branch validation, git rebases, and fast-forward merges for concurrent agent workflows.

Points for improvement:
- Full SoundFont splitting on a clean workspace processes 274 preset files, which takes several seconds.

### 9. Accessibility and user experience (96/100)

Every user interface control supports keyboard navigation. Keyboard shortcuts permit playback toggling, seeking, muting, camera switching, and dialog dismissal.

Touch targets on mobile viewports measure at least 44 by 44 CSS pixels. Automated tests confirm a 4.5:1 text contrast ratio over dynamic WebGL canvases.

The application respects the `prefers-reduced-motion` media query and provides fallback messaging when WebGL2 context creation fails.

Points for improvement:
- Touch scrolling on mobile browsers can trigger browser chrome collapse, causing brief canvas resize events.

## Summary of findings

| Id | Severity | Finding | File and line |
|---|---|---|---|
| F1 | S2 | Minified vendor bundle exceeds the Vite chunk size warning threshold | `vite.config.ts:20` |
| F2 | S2 | Vestigial volume command routing remains in AudioWorklet processor | `src/audio/processor.ts:103-105` |
| F3 | S2 | 142 private class properties omit required TSDoc documentation | `src/app/app.ts:261-265`, `src/audio/player.ts:131-133` |
| F4 | S3 | Unused exports exist on internal module helper functions | `src/app/play-control.ts:103`, `src/app/phone-layout.ts:14` |
| F5 | S3 | Procedural modules exceed 1,500 lines in single files | `src/shots/prepare.ts:1`, `src/models/layout-scene.ts:1` |
| F6 | S3 | Conductor bow faces orchestra instead of audience at song end | `src/pose/conductor.ts:327` |

## Findings

### F1. Minified vendor bundle exceeds the Vite chunk size warning threshold

File: `vite.config.ts:20`.

The configuration sets `chunkSizeWarningLimit` to 700 kB. The minified chunk `dist/assets/renderer-*.js` currently measures 1,114 kB (379 kB after gzip). Production builds emit a chunk size warning.

Recommendation:
Update `chunkSizeWarningLimit` in `vite.config.ts` to 1,200 kB or configure code splitting for auxiliary meshes. The gzipped bundle satisfies the 1 MB budget.

### F2. Vestigial volume command routing remains in AudioWorklet processor

File: `src/audio/processor.ts:103-105` and `src/audio/engine.ts:251`.

The processor switch statement handles `volume` commands. `WorkletPlayer.setVolume()` adjusts master volume through an AudioNode `GainNode` and sends no worklet messages. The command handler and `SynthEngine.setVolume()` remain uncalled during standard playback.

Recommendation:
Remove the `volume` command branch from `src/audio/processor.ts` and remove `SynthEngine.setVolume()` after completing Safari verification.

### F3. 142 private class properties omit required TSDoc documentation

File: `src/app/app.ts:261-265`, `src/app/app.ts:286-288`, `src/audio/player.ts:131-133`, `src/models/model-cache.ts:15`.

`AGENTS.md` requires TSDoc documentation on each member of a class, including private members. Approximately 142 private class fields lack individual doc comments.

Recommendation:
Add concise TSDoc comments to all private class fields across `src/app/`, `src/audio/`, `src/models/`, and `src/scene/`.

### F4. Unused exports exist on internal module helper functions

File: `src/app/play-control.ts:103`, `src/app/phone-layout.ts:14`.

Functions such as `waitsForSamples()` and constants such as `SHEET_CLOSE_SHARE` carry `export` declarations. No external modules or test files import these symbols.

Recommendation:
Remove `export` keywords from identifiers that only serve internal module logic.

### F5. Procedural modules exceed 1,500 lines in single files

File: `src/shots/prepare.ts:1-1916`, `src/models/layout-scene.ts:1-1613`, `src/app/app.ts:1-1262`.

These files combine multiple responsibilities. `prepare.ts` computes subject framing, phrase timing, and raycast clearances. `layout-scene.ts` computes stage footprints, riser geometries, and section curvature.

Recommendation:
Extract shot selection algorithms into `src/shots/selection.ts` and riser layouts into `src/models/riser-layout.ts`.

### F6. Conductor bow faces orchestra instead of audience at song end

File: `src/pose/conductor.ts:327-340`.

When a piece ends, the conductor bows toward the orchestra rather than turning toward the auditorium. Professional conductors turn around on the podium before bowing.

Recommendation:
Add a turn rotation to the conductor animation at the piece conclusion, as scheduled in Step 8 of `TODO.md`.

## Unverified

### U1. Audio dropouts in native Safari on macOS and iOS

File: `src/audio/processor.ts`, `docs/research/webkit-audio.md`.

Playwright WebKit showed 200 slow render blocks under heavy machine load due to WebKit worklet thread priority limitations. Automated testing cannot verify native Safari audio behavior because Safari 26 disables remote automation by default.

Reproduction steps:
1. Open native Safari on macOS.
2. Navigate to `http://localhost:5173/`.
3. Play `beethoven-9.mid`.
4. Monitor audio output under normal and heavy CPU load.
