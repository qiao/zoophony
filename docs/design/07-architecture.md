# 7. Architecture

## 7.1 Modules

The stack is Three.js, TypeScript, and Vite, with pnpm. There is no UI framework, because the UI
is small. The audio module is behind the small `Player` interface (6.8), so a change inside it
does not change the other modules.

```text
first download                                lazy, after the first frame
┌────────┐    ┌─────────┐    ┌────────┐       ┌─────────────────────────────┐
│ midi/  │───>│ score/  │───>│ pose/  │       │ audio/: Player              │
│ (pure) │    │ (pure)  │    │ (pure) │       │ Worker: SF3 to PCM SF2      │
└────────┘    └────┬────┘    └───┬────┘       │ worklet: spessasynth_core   │
                   │             │            │ and the block scheduler     │
                   │             v            └──────────────┬──────────────┘
                   │         ┌────────┐                      │
                   │         │ scene/ │<── models/ (pure)    │ Player
                   │         └───┬────┘                      │
                   │             │                           │
                   v             v                           v
              ┌──────────────────────────────────────────────────────┐
              │ app/ and ui/: load flow, transport, seat list, hash  │
              └──────────────────────────────────────────────────────┘
```

| Module | Job | Pure | Loads |
|---|---|---|---|
| `midi/` | Parse the bytes of a Standard MIDI File into tracks of events in ticks. | yes | first download |
| `score/` | Apply the rules of section 3, and build the `Score` with `buildScore()` (3.2). | yes | first download |
| `pose/` | `poseAt()` (5.1). | yes | first download |
| `models/` | Species parameters, the mesh generator, and `layoutScene()`. It gives geometry data and positions. | yes | first download |
| `shots/` | The camera shots of 5.6: `prepareShots()` and `cameraAt()`, the factor of the beam opacity, and the default view of 4.5. It reads `score/`, `models/` (the layout and the obstacles), and `pose/` (the loudness and the entries). `scene/` and `app/` read it. | yes | first download |
| `scene/` | Three.js: stage, lights, camera, quality tiers, poses applied to bones. | no | first download |
| `audio/` | The `Player`, the Worker, and the worklet processor. | no (the block scheduler is pure) | lazy |
| `app/`, `ui/` | Load flow, transport, seat list, URL hash, settings. | no | first download |
| `tools/` | Build scripts: SF3 split, demo changes, size check, license file, the Blender build of the sculpts (`tools/blender/`, `pnpm sculpt`), and the packer of the rigged bodies of route B (`pnpm pack-rigged`). The app reads no output of these two (4.4). | no | build only |

A pure module gets all inputs as arguments, reads no clock, uses only seeded randomness, and
touches no DOM. It can use the math classes of Three.js: `Vector3`, `Quaternion`, `Matrix4`, and
the other classes of `three/src/math/`. These classes are plain JavaScript with no DOM. They run
in Node, and Three.js is already in the first download. A pure module uses no scene-graph object
of Three.js: no `Object3D`, `Mesh`, `Bone`, `SkinnedMesh`, geometry, material, or renderer. The
data that a pure module returns stays plain: typed arrays, tuples, or plain objects. Thus a test
can compare it, and `poseAt()` stays stateless (5.1). The user made this decision on 2026-10-05.

The data format at a module boundary is a readonly tuple: `Vec3` (x, y, z) for a point and `Quat`
(x, y, z, w) for a rotation, from `models/tuples.ts`. A function converts a tuple with
`new Vector3(...p)`, calculates with the math classes, and gives back a tuple with `toVec3()` or
`toQuat()`. The frame path of `poseAt()` writes module scratch objects in place, so that a frame
allocates few objects. Each call writes a scratch object before it reads it, so the scratch holds
no state from one player or one frame to the next.

A second entry, `gallery.html`, shows each species with the instrument of its section, and each
instrument alone. It has a time slider and
a test note list, so that a person can examine the models and the motion with no MIDI file. The
gallery is deployed. It is a separate entry, so it does not add to the first download of the
player.

- The query `?page=species` shows each species with each instrument of its section, on its
  seat, and then the bear with the baton. The query `?page=instruments` shows each instrument
  alone. Its pieces keep their places in the hands of the first species of the section, and the
  instrument rests on the floor.
- The query `only` keeps the models of a list of species and instruments, so that the camera
  comes close to them. For example, `?page=species&only=dog,piano` shows the dog with the cello
  and the polar bear with the piano. The queries `zoom` and `target` move the camera closer: the
  distance that shows all models is divided by `zoom`, and the camera looks at the height
  `target` (0.6 m by default). For example, `?page=species&only=dog&zoom=2.5&target=1.1` shows
  the head of the dog.
- The query `rest` shows the players in the rest pose of 5.2, before the first play. With no
  `rest`, the players play. For example, `?page=species&only=rabbit&zoom=2.5&target=1.1&rest`
  shows a close view of the rest pose of the rabbit.
- The models stand in rows, and the camera looks down at them at 35°. A model hides the floor
  behind it for its height / tan 35°, so the gap in front of a row is at least the height of the
  tallest model of the next row / tan 35°, and at least 0.8 m. With a fixed gap of 0.8 m, the
  bear hid the badger and the timpani hid the bases of the oboe and the clarinet. The pianist
  faces +x, as on the stage, so that the camera sees it beside the piano. Facing the camera, the
  piano lid hid it (review of step 4, F2).
- A label under each model of the species page has two lines: the species and the instrument.
  The gap in front of a row also holds 0.5 m of floor for the labels of the row behind it. With
  labels of one line and no such floor, two labels of the last row touched (review of step 4,
  P4).
- Each line of the test note list holds a start and a length in seconds, and a key, for example
  `1.5 0.5 C5`. Each player of the species page plays the test notes with `poseAt()` (5.1), in a
  seat of its own, with the velocity 100. The bear conducts them in 4/4 at 120 BPM, with the beats
  up to the end of the last note. The time slider gives the song time, the transport plays, and
  the idle layer follows the wall clock. The players look straight ahead, in place of at the
  bear. `galleryPlan()` in `src/gallery/plan.ts` makes the plan with `preparePlayer()` and
  `prepareConductor()`, because the gallery has no `Score`.
- The gallery renders at the high tier with the shadow radius 1. In a close view, the radius 3
  shows the noise of `PCFShadowMap` as a fine grid on each lit face, and the radius 1 halves it
  (review of step 3, F11). At the default distance of the stage, the grid is smaller than a
  pixel.

A third entry, `views.html`, shows the animals as `docs/reference/animals.webp` does, so that a
person can put the two images side by side. It is 1024 × 1024 px, with the three rows, the
places, and the labels of the reference: the rabbit with a violin and with a clarinet, the red
fox with a violin and with a clarinet and a music stand, then the wolf with a clarinet, the bear
on the podium with the conductor stand, and the dog with a cello. Each model shows its
front, its right side, and its back. The camera is orthographic and looks down at 8°. Each model
fills the height of its row, as in the reference. The page takes the playing poses from the
first notes of the Beethoven 9 demo.

`views.html?page=bears` shows the bear family in the same way: the polar bear at the piano, as
`docs/reference/polar-bear-views.png` does, then the bear on the podium and the panda with the
trombone, as `orchestra-latest.png` shows them. It takes the playing poses from the Boulanger
demo, which has a piano and trombones. The open lid of the piano hides the head of the polar bear
in the front view, so the review of the front of the head uses the sheet page
`?sheet=polar-bear` (below), which hides the piano in the front view.

- The page has its own studio light, like the light of the model sheets: a warm key light
  `#ffd0a0` of 2.6 from the left, above, and the front (the direction (-1100, 1300, 1000)), a warm
  fill light of 1.6 (sky `#fff4e8`, ground `#6a5a4a`), and a rim light of 1.5 from behind. The
  page has the tone mapping of the stage, AgX, with the exposure 1.15, and each material adds the
  grade of the final pass of the stage after the tone mapping (`GRADE_FUNCTION`, 4.5). The species
  colors of 2026-10-08 were tuned for the warm stage, so the neutral tone mapping with a neutral
  light showed the fox fur with a value of 119 against 156 in `fox-views.png`, the rabbit lavender
  (hue 280), and the dog pale. A cool fill (`#c8d4ff`) made the shaded white fur blue-gray. The
  stage keeps its own light. The report
  [`2026-10-08-views-page.md`](../research/2026-10-08-views-page.md) gives the measures of the
  light with the bodies and the colors of 2026-10-08.
- A species and an instrument that play in the Beethoven 9 demo show the pose of `poseAt()` (5.1)
  at 0.4 of their first note, with the head to the front: the bowed strings and the wolf with
  the clarinet. The rabbit and the red fox play no wind instrument on the stage, so their hands
  hold the grips of the clarinet with bent elbows, as in `animals.webp`. The bear raises the
  baton beside its head (review of step 5, F10).
- The music stand of the fox with a clarinet stands 0.7 m in front of the seat at 0.6 of its
  height, under the instrument and in front of the belly, as in the reference. At 0.45, the desk
  was at the knees. The podium of the bear turns, so that the
  conductor stand is at the left side of the bear. The stage keeps the stand of 4.5 in front of
  the bear.

The query `sheet` shows one species as its model sheet in `docs/reference/` does:
`?sheet=fox` (`fox-views.png`), `?sheet=rabbit`, `?sheet=dog`, and `?sheet=polar-bear`
(`VIEW_SHEETS` of `src/gallery/sheets.ts`). A model agent compares the species with its sheet
on this page, by eye and by pixels.

- The page has the size of the sheet (the fox page is half of 2494 × 1354 px, so a capture with
  2 device pixels for each CSS pixel has the size of the sheet), the background of the sheet, and
  no labels.
- The scale comes from the sheet: 737 px for each meter on `fox-views.png` (its chair seat of
  0.35 m is 258 px high), 314 px on `rabbit-views.png` (seat 110 px), 311 px on
  `dog-views.png` (its line of 1.8 m), and 185 px on `polar-bear-views.png` (its height mark of
  1.8 m). The middle of the seat of each view stands on the floor of the sheet at the middle of
  its chair or bench.
- The camera is orthographic and looks down at the angle of the sheet: 8° (fox), 10° (rabbit),
  5° (dog), and 2° (polar bear). The front view of the rabbit turns 20° to its right side, and
  the side views of the fox, the rabbit, and the dog turn 65°, 70°, and 80° from the front, as
  their chairs show. The front view of the polar bear hides the piano, because its open lid hides
  the head. The sheet shows the head above the lid.
- Each sheet page shows the pose of its sheet (`SHEET_MOMENTS` of `src/gallery/sheet-poses.ts`):
  `poseAt()` (5.1) at a moment of test notes, in a seat of its own, with the head to the front.
  The violin of the fox and the rabbit lies on the left shoulder under the chin. Its hold moves
  the violin 0.25 H to the left and 0.05 H up from the hold of the stage, turns it 25° toward the
  front (45° to the left of the front), and tilts the scroll up 15° (`BowedHold.playTurn`, 5.3).
  The left hand holds the neck at the height of the mouth. The bow plays an open A in the middle
  of the hair, so that the bow paw is at the chest, as in the sheets. Near the frog, the bow paw
  of the red fox came up to its muzzle. The right elbow keeps the direction of the frog over the
  whole stroke, so that it hangs at the side, as in the sheets. The head looks to the front. With
  the hold of the stage, the violin was in front of the chest and the left wrist 0.77 H below the
  head center. The violin goes at most 0.03 H into the chin, and the bow and
  the forearms stay out of the body. The dog plays a long G3 on the cello with the bow square
  across the strings, and the polar bear plays C3 and C5 with its palms on the keys.

`pnpm screenshots` saves the page as `animals-views.webp`, and each sheet page as
`<id>-sheet-views.webp`, for example `fox-sheet-views.webp`.

The entry `spike.html` is the audio spike of step 1 (9.5). It builds the `Score` of the
Beethoven 9 demo with `buildScore()`. Until 2026-10-05, it built the changed Beethoven 5 demo
(8.3). The page plays the score with the `Player`, and shows the values of the
step 1 checks as text with stable element ids. The query `?demo=<id>` selects another demo, for
example the default demo for the load target (9.7). `window.spike` holds
the same values and the functions `play()`, `pause()`, and `seek()`, for automation. It is a
separate entry, so it does not add to the first download.

The site also holds `spike.html`, `gallery.html`, and `views.html`, because the screenshot
script (`tools/screenshots.ts`) and the review checks open them on the built site. No page links
them, and each one has `<meta name="robots" content="noindex" />`, so that search engines leave
them out (audit 2026-10-05-ux-design, CP4).

## 7.2 First download

The size check sums the gzip sizes of these files:

- `index.html`.
- The CSS.
- The entry JS chunk, with all its static imports.
- The MIDI file of the default demo (8.2): the Boulanger demo, 30 KB after gzip.

The check does not count the audio chunk, the Worker, the worklet, the SF3 files, `gallery.html`
and its chunks, and the other demo files. The app loads the other demos when the user selects
them.

- The limit is 1 MB (1,000,000 bytes). CI fails above the limit and prints the size on each run.
- `pnpm size` runs `tools/size.ts` after the build. The script finds the static imports of the
  entry chunk in the Vite manifest, and gzips each file with the default level of Node zlib.
  It also counts each script and stylesheet that `index.html` loads. With several entries,
  Vite puts its module preload polyfill into a shared chunk that the manifest entry does not
  import.
- The site holds the default demo at `demos/boulanger-matin.mid`. The build writes it to
  `dist/demos/boulanger-matin.mid` (8.3), and the check counts that file. With no such file, the
  check counts `demos/src/boulanger-matin.mid`. `defaultDemoFile()` of `tools/size.ts` follows
  `DEFAULT_DEMO`.
- On 2026-10-06 (`0cc4b2b`), the check gives 259,355 B. The default demo file is 30,097 B of
  it. A change that moves the size by more than 5 KB states the reason in its commit message.
- On 2026-10-07, the check gives 302,738 B on `main`. The sculpt of the red fox (4.4) adds
  19,405 B: 322,143 B in all. A sculpt is about 17 KB after gzip.
- With the sculpts of the red fox, the tan fox, and the wolf (stage S1), the check gives
  357,000 B. The modules are 17,396 B, 16,739 B, and 17,185 B after gzip.
- On 2026-10-08, the check gives 476,700 B on `main`. The rigged red fox of route B (4.4) gives
  478,645 B: the skin of four bones, the decoder, and the rigged body add 1,661 B, and the rigged
  module (17,834 B after gzip) takes the place of the sculpt of the red fox (+284 B).
- On 2026-10-09, the revert of the bodies (4.4) gives 299,044 B: the rigged red fox (about
  18 KB) and the 9 sculpts (about 17 KB each) left the first download.

## 7.3 Third-party licenses

The build writes a third-party license file for Three.js (MIT), spessasynth_core (Apache-2.0),
stb-vorbis (Apache-2.0), the three sources of the SoundFont (6.2): GeneralUser GS (GeneralUser
GS License v2.0), VSCO 2 CE (CC0 1.0), and VCSL (CC0 1.0), and the hall impulse response (CC BY
4.0), and the GitHub mark of the link to the repository (MIT, from Primer Octicons, 2.8). The
credits dialog links to it, and also lists the source of each demo (8.1).

`pnpm build` runs `tools/licenses.ts` after the Vite build. The script writes
`dist/third-party-licenses.txt` from the license file of each installed package of this list,
and from `assets/soundfont/LICENSE.txt` and `assets/soundfont/CC0-1.0.txt`. It fails when a
package in `dependencies` is not in the list, and when a package of the list is not installed.

- CC0 1.0 has no condition. The entries of VSCO 2 CE and VCSL still give the credit that the
  VSCO 2 CE readme asks for, and they say that the SoundFont holds changed samples.
- The site does not ship the dev dependency `wasm-media-encoders` (MIT), which only encodes the
  samples of `tools/build-soundfont.ts`. Thus the file does not list it.

The file also holds the hall impulse response of 6.2. `hallEntry()` of `tools/licenses.ts`
makes its entry: the title "Hall impulse response, St Paul's Hall (360° BRIR and FOA
database)", the license "CC BY 4.0", the source <https://doi.org/10.5281/zenodo.2641166>, and a
text that starts with the credit line `HALL_CREDIT.text` of `audio/hall-credit.ts` (with the
note of the changes), the source link, and the license link, before the text of
`assets/hall/LICENSE.txt`. CC BY 4.0 asks for the credit, a link to the license, and a note of
the changes (section 3(a)).

`githubMarkEntry()` adds the entry of the GitHub mark, with the MIT license of
`assets/github-mark/LICENSE.txt`. The mark is also a trademark of GitHub, Inc., so its use
follows the logo rules of GitHub (`assets/github-mark/README.md`).
