# The cinematic camera: research, shot rules, API, and prototype

Date: 2026-10-05. Code: commit `32b3987`.

The user asked on 2026-10-05: "Add a feature where the user can toggle the camera position. By
default, we use a cinematic camera orchestration that automatically switches between different
camera positions with automatic panning / zooming."

This report gives the practice of concert films with sources, and it proposes the shot rules,
the API, and the design changes. A throwaway prototype in a scratch folder computed the shot list
of each demo and rendered frames of the real scene with Playwright. The prototype is not in the
repository. "Not measured" marks a value that no run confirms.

## 1. Result

- Two camera modes: **Cinematic** (the default) and **Free** (the orbit camera of design 2.5).
  A toggle button "Automatic camera" in the bar selects the mode. A drag, a wheel, or a pinch on
  the stage changes to Free at once, from the current camera. With `prefers-reduced-motion`, the
  default is Free.
- The camera is a pure function of the song time, like `poseAt()`. `prepareShots()` makes a shot
  plan once for each score. `cameraAt()` gives the position, the target, and the field of view.
  Seek, pause, and speed are thus always correct, and the same piece gives the same film.
- Five shot kinds: wide, high, conductor, section, and solo. Cuts fall on bar lines. A shot lasts
  4 to 14 s (wide shots up to 18 s). The music of the next shot selects its subject: an entry
  after a rest, an exposed seat, or a loud tutti.
- The prototype gave 34 shots for the Boulanger demo, with a median length of 8.6 s. The Berlin
  Philharmonic films have a median of 8.3 s (S1). Most frames look like broadcast shots. The
  prototype found five faults, and each one gives a rule of section 6.
- Cost: `cameraAt()` takes 0.12 µs for each call in Node. A close shot renders in the same time
  as the default view. The shadows, the far plane, and the beam need no change.
  `prepareShots()` took 30 to 94 ms in the prototype, so it needs a broad phase (section 9).

## 2. Sources

| Id | Source | What it gives |
|---|---|---|
| S1 | Tanja Noack, master thesis on the Digital Concert Hall of the Berlin Philharmonic, TU Berlin, about 2012: <https://www.static.tu.berlin/fileadmin/www/10002020/Dokumente/Abschlussarbeiten/NoackTanja_MagA.pdf> | Shot lengths, shot sizes, moves, and transitions in measured concert films, and a summary of a TV study of 20 symphony broadcasts (Nicolette Richter, 1973 to 1993) |
| S2 | EDIUS user story, "The Berliner Philharmoniker, the Digital Concert Hall and EDIUS": <https://www.edius.net/user-stories/948-the-berliner-philharmoniker,-the-digital-concert-hall-and-edius.html> | 8 remote cameras with presets, and the plan of the cuts from the score |
| S3 | Panasonic, the cameras of the Digital Concert Hall: <https://news.panasonic.com/global/stories/815> | "only static, remote controlled cameras" |
| S4 | SMPTE blog, "Camera automation for live orchestra performances" (BBC tests with CuePilot): <https://www.smpte.org/blog/camera-automation-live-orchestra-performances> | 7 to 8 cameras, PTZ presets, cuts on a timeline, gaps of 4 s at a tempo change |
| S5 | OperaWire, interview with the TV director Brian Large: <https://operawire.com/q-a-tv-director-brian-large-on-taping-the-mets-otto-schenk-ring-30-years-later/> | The cuts follow "key change, orchestration, phrasing". A zoom is timed to a count of bars |
| S6 | Creative COW forum, "Live music directing / shooting": <https://creativecow.net/forums/thread/live-music-directing-shooting/> | Cue lists by bar number |
| S7 | Li-wei He, Michael Cohen, David Salesin, "The Virtual Cinematographer", SIGGRAPH 1996: <https://grail.cs.washington.edu/wp-content/uploads/2015/08/he-1996-tvc.pdf> | Film idioms as state machines, the line of interest, no jump cuts, a minimum shot length |
| S8 | Wikipedia, "30-degree rule": <https://en.wikipedia.org/wiki/30-degree_rule> | A new shot changes the angle by 30° or more, or changes the shot size |
| S9 | Microsoft Research, MoVieUp, a concert video mashup system: <https://www.microsoft.com/en-us/research/wp-content/uploads/2016/08/csvt.mashup.double.column.pdf> | Faster music gives shorter shots. Other systems use 3 to 7 s for each shot |
| S10 | Tom Sykes, "Eurovision 2021 behind the scenes": <https://www.tsykes.co.uk/post/eurovision-2021-behind-the-scenes> | Pop shows: 24 cameras and shots of about 1.8 s |

A research agent read these sources on 2026-10-05. Page numbers refer to the PDF of S1.

## 3. Practice in concert films

### 3.1 Shot kinds

- The TV standard has three basic cameras: front right for the concertmaster, one behind the
  orchestra for the conductor ("Dirigentenkamera"), and a frontal wide shot (S1 p. 87).
- Only two shots occur in each production of the TV study: the conductor close, and a medium shot
  of the first violins (S1 p. 88).
- In a Berlin film of Brahms 1, medium sizes are the most frequent. Only 11% of the shots are wide,
  and there are 2 close-ups. A wide shot comes back at regular intervals. Each new movement starts
  with a medium-wide shot (S1 pp. 64 to 65).
- 15% of the shots show the conductor and the strings from the camera behind the orchestra
  (S1 p. 63).
- 61 different shots occur, but 9 of them make more than 50% of all shots (S1 p. 63).
- The Digital Concert Hall uses 8 static remote cameras with presets (S2, S3). The BBC tests used
  7 to 8 cameras, and each PTZ camera held up to 40 presets (S4). A pop show uses 24 cameras with
  cranes and Steadicams (S10).

### 3.2 Cut rate

- Brahms 1 in the Digital Concert Hall: 246 shots in 45:39, or 5.4 shots in each minute. The mean
  shot is 11.1 s, and the median is 8.3 s. Half of the shots are 4.7 to 14.6 s long. The range is
  1.3 to 53 s (S1 p. 62).
- The TV study: a mean shot length of 6 to 17 s for each work (S1 p. 89).
- Slow music gives longer shots. The slow second movement has 28 shots in about 10 minutes, and
  the third movement has 34 shots in about 5 minutes (S1 pp. 63, 68). MoVieUp makes the expected
  shot length a linear function of the tempo (S9).
- A pop show cuts about every 1.8 s (S10).

### 3.3 Cut points

- The directors study the score and mark the exact time of each cut (S2). An assistant calls the
  bar numbers during the concert (S6).
- In Brahms 1, a cut falls "directly on bar 9, beat 1", at a new section. The camera follows the
  instrument with the melody: the flute, then the oboe. The next cut comes when the melody moves to
  the cellos (S1 pp. 67 to 68).
- Brian Large: the cuts are "dictated by the music, by key change, by orchestration, by phrasing"
  (S5).
- No source gives a rule against a cut during a held note. Not verified.

### 3.4 Moves and transitions

- Moves are rare. Brahms 1 has 8 moves in 7 shots, about 4% of the time. The zoom-in is the most
  frequent move, and most moves are on the conductor. The third movement has no moves
  (S1 pp. 65, 69).
- A zoom often looks less natural than a dolly. Each move needs a clear start and a clear end
  (S1 p. 48). Brian Large times a zoom to a count of bars, for example 16 bars (S5).
- Hard cuts are 79 to 100% of the transitions, dissolves 7 to 13% (S1 p. 89). Brahms 1 has 9
  dissolves with a mean of 0.75 s, most of them in the slow movement (S1 p. 65).
- 60% of the broadcasts end on a wide shot and 40% on the conductor close (S1 p. 89).

### 3.5 Rules of virtual cinematography

- Do not cross the line of interest. Avoid jump cuts: a cut must change the size, the view, or
  the number of the subjects. Start with an establishing shot. Each idiom has a minimum length
  (S7).
- A new shot changes the angle by at least 30°, or it changes the shot size (S8).
- An orchestra has many lines of action, so the 180° rule is hard to keep. A shot with more
  detail, such as a wide shot, needs more time (S1 pp. 51 to 52).

## 4. Modes

The diagram shows the two modes and the events that change them.

```text
             page load
                 │
    prefers-reduced-motion? ──yes──────────────┐
                 │ no                          v
                 v                      +-------------+
          +-------------+   drag > 4 px,|    FREE     |
          |  CINEMATIC  |   wheel, pinch| orbit (2.5) |
          | cameraAt()  |──────────────>| from the    |
          |             |               | current     |
          |             |<──────────────| camera      |
          +-------------+  "Automatic   +-------------+
                 │          camera" on         ^
                 │                             │
                 └──── "Reset view" ───────────┘ (Free, default view)
```

- **Cinematic.** Each frame takes the camera from `cameraAt()`. Before the first play, the camera
  is the default view of 4.5, so the first screen does not change.
- **Free.** The orbit controls of 2.5 move the camera. A change from Cinematic keeps the position
  and the target of the last frame, so the view does not jump. The orbit then turns around the
  target of the last shot.
- **Drag rule.** A pointer motion of more than 4 CSS pixels between the press and the release is a
  drag (2.3, `app/pick.ts`). A drag changes to Free. A click of 4 px or less opens the seat row,
  and the mode stays.
- **Reset view.** It changes to Free and shows the default view. A user who wants the full stage
  with no cuts thus has one click.
- **Automatic camera.** The toggle button changes to Cinematic, and the next frame cuts to the
  shot of the current song time.
- **Reduced motion.** The default is Free. If the user turns on Cinematic, each shot holds its
  start camera (no move in a shot), and each transition is a hard cut.
- **New piece.** The mode stays. Cinematic uses the plan of the new score. Free shows the default
  view of the new stage, as now. A change of "Section size" builds a new plan, and Cinematic
  continues at the current song time.
- **Free mode limits.** The orbit limit of the distance is 0.5 to 2 times the default distance
  (4.5). That is 18.5 m for `S = 11.19`. A close shot is 4 to 5 m from its target, so the
  controls would pull the camera back at the first update. The near limit must thus change to an
  absolute 2.0 m. The far limit stays.

## 5. Shot kinds

### 5.1 The camera key

Each shot keeps its camera on a sphere around its target, as `defaultView()` does. The azimuth
counts from +z (the audience) to +x. The elevation counts from the stage plane.

```text
        side view                               top view (y up, out of the page)

           camera                                    +z (audience)
             *                                         ^      camera
            /│                                         │     *
       d   / │ d × sin(elevation)                      │    /
          /  │                                         │   / azimuth
         /   │                                         │  /
 target *────┘                             -x ─────────*────────── +x
          d × cos(elevation)                         target
```

`position = target + d × (sin az × cos el, sin el, cos az × cos el)`. The distance `d` is the fit
distance of the subject at the current aspect, times the zoom of the key (section 5.3).

### 5.2 The five kinds

The diagram shows the cameras of the five kinds over the Boulanger layout (`S = 11.19`, the
podium at z = 3.79). The values are the values of the prototype.

```text
                               back of the stage (-z)
 +--------------------------------------------------------------------------+
 | perc      basses     timp    trombones    tuba                           |
 |      horns     clar | bsn     trumpets           [H] high: 58° to 62° up,|
 |          harp    flutes | oboes                        0.6 × wide dist.  |
 |  vln1      vln2   [C]  | vla      vlc                                    |
 |                    │  conductor camera: above row 1, 18° up, looks back  |
 |                    v                                                     |
 |  piano          (bear)       [Se] section: front of the group, 18° to 42°|
 |      [So] solo: front of the player ± 20° to 40°, 14° to 40° up          |
 +--------------------------------------------------------------------------+
                  front of the stage (+z), audience
                                                     [W] wide: the default
                                                         view and 3 variants
```

| Kind | Target | Azimuth | Elevation | Distance | FOV | Move in the shot |
|---|---|---|---|---|---|---|
| wide | stage center `(0, 0, 0)` | 30°, -28°, 0°, or 38° (seeded) | 28°, 24°, 22°, or 34° | `3.3 × S × max(1, 1 / aspect)` times 1.0, 0.95, 0.8, or 1.0 | 30° | a push-in to 0.88, or an arc of 6° |
| high | `(0, 0, -0.05 × S)` | ±15° to ±40° | 58° to 62° | 0.6 × the wide distance | 30° | an arc of 12° and a rise of 4° |
| conductor | the head of the bear, 1.5 m above the podium top | 180° ± 10° to 22° (from the orchestra side) | 18° | the fit of a sphere of 0.95 m (about 4.2 m) | 26° | a push-in from 1.0 to 0.85 |
| section | the center of the active players of the group, 0.8 m above the stage | the front of the group, ± 8° to 22° | `18° + 24° × back` | the fit of the group sphere: the players plus 0.75 m, at most 2.6 m | 30° | an arc of 6° and a push-in to 0.92 |
| solo | the principal player of the seat, 0.9 m above the stage | the front of the player, ± 20° to 40° | `14° + 26° × back` | the fit of a sphere of 0.95 m (about 4.7 m) | 24° | a push-in to 0.9 and an arc of 4° |

- **Front.** The front of a player is the direction of its `facing`: `(-sin f, 0, -cos f)`. The
  front of a group is the mean of the fronts of its players.
- **Back.** `back` is 0 at the podium and 1 at the back edge of the stage:
  `clamp((podium.z - target.z) / (podium.z + S / 2), 0, 1)`. A back row thus gets a higher camera,
  which looks over the front rows.
- **Fit distance.** `d = radius / sin(min(v, h)) × 1.05`, where `v` is half the vertical field of
  view and `h = atan(tan(v) × aspect)`. A phone in portrait (aspect 0.46) thus gets a camera 2.1
  times farther away than a desktop.
- **Groups.** The section groups are the families of `SectionId`: violins, low strings (viola,
  cello, contrabass), woodwinds, brass, percussion (timpani and percussion), harp, piano, and
  choir. A group holds only its active seats. If its sphere is larger than 2.6 m, the group
  keeps the seat with the most activity, and the next seat if both still fit.
- **Wide variants.** 30° and 28° up is the default view of 4.5. The frontal variant (0°) needs the
  zoom 0.8, because the default distance comes from the fit of the corner view.

### 5.3 Moves in a shot

- Each shot has two keys, `from` and `to`. `cameraAt()` blends the azimuth, the elevation, the
  zoom, and the field of view with a smoothstep over the full shot: `u² × (3 - 2u)`. The move thus
  starts and ends at rest, as S1 asks.
- The move turns around the target, so it never cuts through the subject.
- The limits: an arc of at most 12°, a change of the zoom of at most 15%, and a change of the
  field of view of at most 4°. Over a shot of 8 s, the arc of 6° turns at most 1.1° in each
  second.
- The prototype uses only a dolly (a change of the distance) and an arc. A change of the field
  of view (a zoom) is part of the API, but S1 calls it less natural. Keep it at 0 for version 1.

## 6. Rules

### 6.1 Shot length and cut points

```text
song time ──>
bar      1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16
         |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
phrase   P               P               P               P
entry                            E (horns, after 2 bars of rest)
shot     [ conductor (count-in)  ][ horns solo        ][ wide ...
         -T  0                   5.0 s               13.8 s
```

- A cut falls on a downbeat (`Beat.indexInBar === 0`) of `Score.beats`.
- The planner scores each downbeat from `start + 4 s` to `start + 14 s` (18 s for a wide or a
  high shot):
  - `-|time - wanted| / 3`, where the wanted length is seeded: 6.5 to 9.5 s for a conductor,
    section, or solo shot, and 9 to 12 s for a wide or high shot.
  - +1.0 if the bar index is a multiple of 4 (a phrase line), +0.4 if it is a multiple of 2.
  - +1.5 if an entry (section 6.2) falls within a quarter of a bar of the downbeat.
- **Slow tempo.** If no downbeat falls in the window, the cut falls on the beat nearest to the
  wanted time. A bar of 4/4 at 40 BPM is 6 s, so this case is real.
- **Fast tempo.** The minimum of 4 s holds. At the pattern 1 of the Beethoven demo (96 bars in
  a minute), a shot thus holds at least 7 bars.
- **Speed.** The lengths are in song seconds. At 1.5x, a shot of 4 s lasts 2.7 s of wall time.
  At 0.5x, a shot of 14 s lasts 28 s. S1 measured shots of 1.3 to 53 s, so both stay in range.
- **First shot.** The conductor shot covers the count-in and the first phrase: it starts at
  `-Infinity` and ends at the first cut, at least 4 s after the downbeat. The click on play thus
  cuts from the first screen to the face of the bear, and the ready gesture and the preparatory
  beat of 5.4 are large in the frame.
- **Last shot.** A wide shot starts on the last downbeat that is at least 8 s before
  `Score.durationSec`. It pulls out from the zoom 0.85 to 1.0 and holds after the end (S1: 60%
  of the broadcasts end wide).

### 6.2 The choice of the next shot

The planner reads the music of the window `[cut, next cut]` from the `Score`:

- **Coverage** of a seat: the part of the window that the merged note spans of the seat cover.
- **Loudness** of a seat: the highest `noteLoudness()` of its notes in the window (5.3).
- **Active** seat: a seat with players and a coverage of 0.3 or more.
- **Activity** of a seat: `coverage × (0.3 + loudness)`. The **share** of a group is its activity
  divided by the activity of all seats.
- **Entry**: the first note of a seat after a rest of at least two bars. This is the cue rule of
  5.4. `findCues()` thins the cues for the left hand (1.5 s apart, one seat), so the camera needs
  the unthinned list. Move the rule into one function that both use.
- **Tutti**: 65% or more of the seats with players are active, and their mean loudness is 0.55 or
  more.

Each candidate gets a score. The prototype used these weights. Tune them in the review.

| Candidate | Score |
|---|---|
| wide | 0.8, plus 2.2 in a tutti |
| high | 0.3, plus 1.6 in a tutti, plus 0.4 with 6 or more active seats |
| conductor | 1.1, plus 0.5 with 5 or more active seats |
| section of a group | 0.6 + 3 × share, plus 1.5 if a seat of the group enters at the cut, minus 0.8 in a tutti |
| solo of a seat (its player 0) | 0.2 + 2.5 × activity share, plus 1.2 with 3 or fewer active seats or at an entry, plus 1.2 at its own entry, plus 0.4 for the piano and the harp, minus 1.0 in a tutti |

Then these rules apply, in this order:

1. **No repeat.** The kind and the subject of the previous shot get no score.
2. **No same group.** A section or solo shot of the group of the previous shot gets no score.
   Without this rule, the prototype gave four woodwind shots in a row.
3. **No two wide shots near.** A wide or high shot needs at least two other shots since the last
   wide or high shot. Without this rule, the Beethoven demo gave 16 wide or high shots of 34. S1
   measured 11% wide shots.
4. **Variety.** A subject seen in the last 4 shots loses 1.6. A section or solo subject loses 0.5
   for each earlier use. Without this penalty, the harp got 6 solo shots in the Boulanger demo.
5. **Seeded jitter.** Each score gets a seeded value from -0.25 to 0.25, so that two candidates
   with the same score do not always give the same choice.
6. **Clear camera.** The best candidate with a clear camera (section 6.3) wins. A candidate with
   no clear camera drops out.

Mute and solo do not change the plan in version 1. The plan is made once for each score, and a
solo would need a new plan (section 12, choice C).

### 6.3 Clearance

The camera must never stand inside a player, and the subject must not hide behind an item. The
planner tests each candidate key:

- **Obstacles.** The boxes of `layoutObstacles()` (`models/layout-scene.ts`): the podium with the
  conductor and its stand, each player with its instrument and its chair, each music stand, and
  the risers. These are the footprints of design 4.5.
- **Line of sight.** The segment from 0.3 m outside the target to the camera at the narrowest
  aspect (0.46) must cross no box. A narrower aspect only moves the camera back along the same
  ray, so one test covers each aspect.
- **Own boxes.** The test skips only the box of the subject that holds the target point: its body.
  The piano case, the harp frame, and the stand of the subject count. The first prototype skipped
  all boxes of the pianist and looked into the piano case.
- **Distance.** The camera keeps at least 0.6 m from each box, and 1.0 m from the box of the
  conductor. The arms and the baton of the bear reach out of its bind footprint. In the frame at
  46 s, the camera was 0.9 m from the bear, and its arm filled a fifth of the frame.
- **Height.** The camera stays at least 0.6 m above the stage top.
- **Search order.** The planner tries the wanted azimuth, then ±12°, ±24°, ±36°, ±48°, ±60°, and
  ±75°, then the same azimuths 8°, 16°, 24°, 32°, and 40° higher. The azimuth stays within 75° of
  the front, so the camera never shows the back of a player. Elevations stop at 60°. In an
  earlier run, a search over the full circle showed players from behind.
- **Wide shots.** They need no test, because the camera is far outside the stage. The 4 top
  corners of the stage stay in the frame (tested in the checklist).

### 6.4 Jump cuts and the line of action

- Two neighbor shots differ by at least 30° in the view direction, or by a factor of 1.5 in the
  subject radius (S8). The kinds of section 5 differ in size, and rule 1 of 6.2 stops a repeat. A
  test checks the rule.
- The conductor shot looks from the orchestra to the audience. The section and solo shots look
  from the audience side to the players. This is the shot and reverse shot of a dialog (S7). No
  other line rule applies, because an orchestra has many lines of action (S1).

### 6.5 Transitions

- **Hard cut.** The default. It falls on the downbeat.
- **Blend.** A short camera move from the end of the previous shot to the new shot, over one
  beat, from 0.5 to 1.2 s, after the downbeat. A blend applies only when all of these are true:
  - the beat is 0.75 s or longer (80 BPM or slower), or the mean loudness of the window is 0.35
    or less,
  - the two subjects share a group, or one holds the other (a section, then its soloist),
  - the two cameras are less than `0.35 × S` apart, and the straight path between them passes the
    clearance test.

  This copies the role of the dissolve, which S1 found in 7 to 13% of the cuts, most in slow
  music. A true image dissolve needs two renders for each frame, and the GPU budget of 9.7 does
  not allow it. The prototype has no blends. Not measured.
- **Reduced motion.** Hard cuts only.

## 7. API

The plan is pure data. A new pure module `shots/` holds it (section 11), with Vitest tests.

```typescript
import type { Vec3 } from '../models/tuples.ts';

/** The kinds of shot (design 5.6). */
export type ShotKind = 'wide' | 'high' | 'conductor' | 'section' | 'solo';

/** One camera on a sphere around the target of a shot. */
export interface ShotKey {
  /** Radians around y, from +z (the audience) to +x, as in `defaultView()`. */
  readonly azimuth: number;
  /** Radians above the stage plane, from 0.1 to 1.05 (6° to 60°). */
  readonly elevation: number;
  /** A factor of the fit distance of the shot. Less than 1 is closer. */
  readonly zoom: number;
  /** The vertical field of view, in degrees. */
  readonly fov: number;
}

/** One shot of the film of a score. */
export interface Shot {
  readonly kind: ShotKind;
  /** Song seconds. The first shot starts at `-Infinity`, so the count-in has a shot. */
  readonly startSec: number;
  /** Song seconds. The last shot ends at `Infinity`, so the song end holds its camera. */
  readonly endSec: number;
  /** The end of the move of the shot, in song seconds. It is `endSec`, except for the last shot. */
  readonly moveEndSec: number;
  /** The seats of the subject. Empty for a wide, a high, or a conductor shot. */
  readonly seats: readonly number[];
  /** The point that the camera looks at. */
  readonly target: Vec3;
  /**
   * The radius of the subject sphere, in meters. 0 for a wide or a high shot: these use the
   * default distance of design 4.5.
   */
  readonly radius: number;
  /** The camera at `startSec`. */
  readonly from: ShotKey;
  /** The camera at `moveEndSec`. */
  readonly to: ShotKey;
  /** The time of the blend from the previous shot, in song seconds. 0 is a hard cut. */
  readonly blendSec: number;
}

/** The shots of one score. `prepareShots()` makes it. */
export interface ShotPlan {
  /** The stage side `S`, in meters. */
  readonly stageSide: number;
  /** Sorted by `startSec`. Neighbor shots touch: each `endSec` is the next `startSec`. */
  readonly shots: readonly Shot[];
  /** The `startSec` of each shot, for the search by time. */
  readonly starts: Float64Array;
}

/** The camera of one frame. */
export interface CameraPose {
  readonly position: Vec3;
  readonly target: Vec3;
  /** The vertical field of view, in degrees. */
  readonly fov: number;
}

/** A `CameraPose` with writable values. `cameraAt()` writes each frame into it. */
export interface CameraPoseBuffer {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

/** The view of one frame. */
export interface CameraView {
  /** The width of the canvas divided by its height. */
  readonly aspect: number;
  /** True if the user prefers reduced motion: each shot holds its `from` key, with no blend. */
  readonly still: boolean;
}

/**
 * Pure. Calculates the shots of a score: the cut points, the subjects, and the clear cameras
 * (design 5.6). The same score, layout, and seed give the same plan.
 */
declare function prepareShots(
  score: Score,
  layout: SceneLayout,
  seed: number,
  models?: ModelCache,
): ShotPlan;

/** Pure. Calculates the camera of one frame from the song time. */
declare function cameraAt(
  plan: ShotPlan,
  songTime: number,
  transport: Transport,
  view: CameraView,
  out?: CameraPoseBuffer,
): CameraPose;
```

The diagram shows the data flow of one frame. The camera reads the same song time and transport
as the poses.

```text
 score ──> layoutScene() ──> layout ──┬──> preparePoses() ──> PosePlan ──> poseAt() ───┐
   │                                  │                                                │
   └──────────────────────────────────┴──> prepareShots() ──> ShotPlan ──> cameraAt() ─┤
                                       (one time for each score)          (each frame) │
                         songTime, transport (6.7, 5.1) ──────────────────────────────>│
                                                                                       v
                                         StageScene.pose() and StageCamera.follow(pose)
```

`cameraAt()` does these steps:

1. Before the first play (`transport.changedAtWall === null`), it returns the default view of 4.5.
2. It takes the time `t`. During play, `t = max(songTime, transport.startSec)`. Thus the count-in
   holds the camera of the start point. While paused, `t = songTime`. A seek while paused does
   not change `startSec` (`seekPlayState()`), so a clamp while paused would show the old point.
3. A binary search in `starts` finds the shot. The search is the same as the search of the beats
   in `poseAt()`.
4. It blends the keys with `smoothstep((t - startSec) / (moveEndSec - startSec))`. With `still`,
   it uses the `from` key.
5. It calculates the distance: the fit distance of `radius` at the aspect, or the wide distance
   for a radius of 0. Then it multiplies by the zoom.
6. Inside `blendSec` after the start, it blends from the end camera of the previous shot to the
   camera of step 5.

### 7.1 Pause, song end, count-in, seek, and speed

| Case | Camera |
|---|---|
| Before the first play | The default view of 4.5. The first screen does not change |
| Count-in from the song start | The first shot: the conductor, still. Its move starts at the downbeat |
| Count-in after a pause | The camera of the pause point holds, as the players hold their poses (5.2) |
| Pause | The camera of the pause point holds. There is no drift with the wall time: a paused video also holds, and the animals keep their idle layer (5.1) |
| Song end | The last wide shot holds at the end of its pull-out |
| Seek | The shot of the new song time shows at once. A seek is a cut |
| Speed | All times are song times, so the cuts and the moves follow the speed |

A pause in the one-beat count-in after a pause shows the song time, which is at most one beat
before the start point. If a cut falls in that beat, the previous shot shows during the pause.
This case is rare and harmless.

### 7.2 The scene side

- `StageCamera.follow(pose: CameraPose)` sets the position, `lookAt(target)`, the field of view,
  and the far plane `distance + 3 × S` of 4.5. Then it calls `updateProjectionMatrix()`. The view
  offset of 4.5 (34 px) stays, so each subject is in the middle of the area above the bar.
- In Cinematic mode, the orbit controls stay on, and `follow()` writes the camera and the target
  of the controls each frame. A drag of more than 4 px changes to Free. From then on, the frame
  stops the writes, and the controls continue the same drag from the current camera. A test in
  a browser must confirm this with damping on, because the controls keep their own deltas.
- The pick test of 2.3 uses the current camera, so a click on an animal works in both modes.

## 8. Prototype

### 8.1 Method

- A scratch planner (`shots.ts`, about 400 lines) implements the rules of sections 5 and 6, except
  the blends, the distance rule of 0.6 m, and the rule of two shots between wide shots.
- A scratch page imports the real `buildScore()`, `layoutScene()`, `preparePoses()`, `poseAt()`,
  and the scene builders of `scene/` through a Vite dev server in the scratch folder. It poses the
  animals at the song time of the frame, with the instruments up.
- Playwright Chromium with ANGLE on Metal took the frames at 1440 × 900 and at 390 × 844, at the
  high tier. One frame used the low tier.
- The machine is the development Mac of 9.7. Other agents worked on it at the same time, so the
  times have noise.

### 8.2 Shot lists

The Boulanger demo: 16 seats, 42 players, `S = 11.19` m, 207 bars of 3/4 (a bar is 1.25 to
2.67 s, median 1.29 s), 280.7 s. The final planner gave this list:

| Start (s) | Length (s) | Kind | Subject | Reason |
|---:|---:|---|---|---|
| -∞ | 5.0 | conductor | the bear, az 202° | opening: the count-in and the first phrase |
| 5.0 | 8.8 | solo | piano, az 159° | the piano has 18% of the activity |
| 13.8 | 10.3 | section | harp | entry |
| 24.0 | 12.6 | wide | az 30° (the default view) | variety |
| 36.6 | 7.5 | solo | horn 1 | entry |
| 44.1 | 5.0 | solo | violin 1, desk 1 (concertmaster) | entry |
| 49.1 | 7.7 | solo | oboe 1 | entry |
| 56.8 | 10.5 | high | az 33° | tutti |
| 67.3 | 8.7 | section | contrabasses | entry |
| ... | | | | 34 shots in total |
| 272.0 | to the end | wide | az 30°, pull-out | closing |

Five demos:

| Demo | Shots | Conductor | Section | Solo | Wide | High | Median length | Shortest | Prepare |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Boulanger | 34 | 6 | 8 | 13 | 4 | 3 | 8.6 s | 5.0 s | 74 to 282 ms |
| Beethoven | 34 | 6 | 6 | 6 | 10 | 6 | 9.4 s | 5.0 s | 94 ms |
| Grieg | 24 | 5 | 6 | 2 | 7 | 4 | 9.6 s | 4.8 s | 30 ms |
| Mozart K. 315 | 32 | 7 | 12 | 8 | 4 | 1 | 9.8 s | 5.2 s | 57 ms |
| Mozart K. 488 | 50 | 9 | 17 | 14 | 7 | 3 | 8.6 s | 4.3 s | 48 ms |

The rows other than Boulanger come from a run before the last two changes of the search. That
run has no rule against two wide shots near each other. The rule of 6.2 (3) fixes the share of
wide shots of the Beethoven demo.

- The conductor gets 18 to 22% of the shots. S1 measured 15%.
- The median shot length is 8.6 to 9.8 s. S1 measured a median of 8.3 s and 9.1 s.
- Over each demo, sampled every 50 ms, the nearest camera was 1.6 m or more from the center of a
  player at the aspects 1.6 and 2.4, and 2.5 m or more at 0.46. The lowest camera was 1.67 m
  above the stage top.

### 8.3 Frames

The final planner gave these frames of the Boulanger demo at 1440 × 900, unless the row says
otherwise.

| Time | Shot | Camera | What the frame shows | Judgment |
|---|---|---|---|---|
| 2.0 s | conductor | (-1.5, 3.0, 0.1), FOV 26° | The face of the bear and the baton above the desk of its stand. The desk hides the belly. The dark hall is behind. | Good. The count-in gesture is large. The face is dim, because the spotlight is 72° above it. |
| 9.0 s | solo, piano | az 159°, el 22° | The meerkat at the keyboard, with its face, its hands, and the keys, from the orchestra side. The concertmaster rabbit is in the right foreground. | Good. |
| 9.0 s, 390 × 844 | solo, piano | az 159°, el 22° | The pianist and two rabbits fill the narrow frame. | Good. The fit by width works. |
| 16.0 s | section, harp | az 119°, el 29° | The deer harpist and its harp fill the frame. Two horn pigs are at the right. | Good. |
| 30.0 s | wide | az 30°, el 28° | The default view with a slow push-in. | Good. |
| 46.0 s | solo, violin 1 | az 99°, el 14° | The concertmaster rabbit with its violin, sharp in the middle. The arm and the baton of the bear fill the left fifth of the frame. | Fault. The camera is 0.9 m from the bear. The distance rule of 6.3 removes it. |
| 60.0 s | high | az 33°, el 58° | The full stage from above, with the shadows of the players. | Good for a tutti. |
| 70.0 s | section, contrabasses | az 32°, el 40° | Two hippos with their basses, above the clarinets of row 3. | Good. The higher camera of the back rows works. |
| 155.0 s | solo, viola 1 | az -41°, el 23° | The cat with its viola. A fox of the second violins is in the left foreground. | Good. A foreground player is normal in a broadcast. |
| 200.0 s | solo, horn 1 | az 18°, el 28° | The horn pig left of the middle. The harp deer covers the right third of the foreground. | Acceptable. |

One frame at the low tier (512 shadow map): the solo of viola 1 at 35 s. The shadow edges are
soft, and no texel steps show (section 9).

### 8.4 Faults of the earlier versions

| Fault | Version | Rule that fixes it |
|---|---|---|
| A music stand hid the face of the viola soloist. | One sphere for each player as the obstacle. | The boxes of `layoutObstacles()` (6.3). |
| The solo of the pianist looked into the piano case and showed a violinist. | The test skipped all boxes of the subject. | Skip only the body box (6.3). |
| A "section" of the flutes and oboes was 7 m wide and looked like a high frontal wide shot. The horns and trumpets sit on both sides of the stage. | The full group of active seats. | At most 2.6 m, else the most active seat (5.2). |
| Shots from behind showed the backs of the players. | A search over the full circle. | At most 75° from the front (6.3). |
| The arm and the baton of the bear filled a fifth of a frame. | No distance rule. | 1.0 m from the conductor box (6.3). Not yet in the prototype. |

### 8.5 Judgment

The shot kinds look like the shots of a concert film. The subject is clear in each good frame,
and the higher camera of the back rows sees over the front rows. The rules of section 6 come from
these faults, so the implementation must test each one (section 11).

## 9. Cost, frustum, and shadows

| Item | Value | Change |
|---|---|---|
| `cameraAt()` | 0.12 µs for each call (200,000 calls in Node) | None. The frame budget of 9.7 is 4 ms |
| `prepareShots()` | 30 to 94 ms for each demo, and 282 ms in one loaded run | Too slow. Use the bounding circle of each `Obstacle` (`x`, `z`, `radius`) as a broad phase before the box test, and the merged spans of each seat for the windows. Target: at most 20 ms for the largest demo (9.7) |
| Render time | wide 2.7 ms, high 3.0 ms, close shots 2.6 to 2.7 ms, at 1440 × 900, device scale 2, high tier. Each value is the median of 120 warm frames of `render()` plus a read of one pixel | None. A close shot costs the same as the default view. This is not the method of 9.7 |
| Far plane | `distance + 3 × S` (4.5). A close shot at 4.2 m gets 37.8 m for `S = 11.19`. The farthest point of the floor plane is at most 2.12 × S + 0.6 × S = 30.4 m from a camera on the stage | None |
| Near plane | 0.1 m. The camera keeps 0.6 m from each box | None |
| Shadows | The shadow camera follows the spotlight, so a close shot does not change it. The map covers `2.4 × S` = 26.9 m: 1.3 cm for each texel at 2048 (high) and 5.2 cm at 512 (low). A solo frame at 1440 × 900 shows 1 cm as about 4 px | None. The low tier frame shows soft edges. Option: `spot.shadow.focus = 0.59` fits the stage corners (30.5°) and gives 1.7 times more texels on each axis |
| Beam | The cone uses `FrontSide`. A camera inside the cone sees no beam, and each close shot is inside it (the radius of the cone at the height 3.6 m is 6.1 m). The beam shows only in the wide shots. The high camera (19 m) is above the spotlight (13.4 m), and the frames show no fault | None |
| Hidden heads test (4.2) | It uses the default view, which does not change | None |

## 10. Design changes

| Section | Change |
|---|---|
| 2.3 | Add the "Automatic camera" toggle to the bar. A drag of the view (more than 4 px) also turns off the automatic camera. "Reset view" shows the default view in Free mode. |
| 2.4 | Option (choice B): the key C toggles the automatic camera. |
| 2.5 | Rewrite: the two modes, Cinematic as the default, the events of section 4, Free from the current camera, reduced motion (Free by default, still shots and hard cuts when the user turns Cinematic on), and the near orbit limit of 2.0 m. |
| 2.8 | The bar order: play or pause, the current time, the seek bar, the duration, the speed menu, mute, the volume slider, "Automatic camera", "Reset view", full screen, and the drawer button. On a phone, "Automatic camera" stays in the bar (choice A). The button is a toggle with `aria-pressed` and the label "Automatic camera". Its icon is a new icon "camera" (a movie camera, 20 × 20, stroke 1.75), in `--accent` while it is pressed. |
| 4.5, camera | The orbit limits apply in Free mode only. The near limit of the distance is 2.0 m. The far plane rule stays, and it applies to each frame of both modes. The view offset applies to both modes. |
| 5.6 (new) | "Camera shots": the shot kinds of 5.2, the moves of 5.3, the rules of 6, the API of 7, and the transport cases of 7.1. Cite this report. |
| 5.4 | The entry rule (a rest of at least two bars) is one function for the cues and the shots. |
| 7.1 | A new pure module `shots/`: it reads `score/`, `models/` (the layout and the obstacles), and `pose/` (the loudness), and `scene/` and `app/` read it. It is in the first download. Add it to the pure core of `AGENTS.md`. |
| 9.5 | A new step after step 6: the cinematic camera, with a review of screenshots of each shot kind for each demo at both sizes. |
| 9.7 | Two new targets: `cameraAt()` at most 0.01 ms for each call, and `prepareShots()` at most 20 ms for the largest demo, both as timed Vitest tests with the reference work of `pose/pose-speed.test.ts`. |
| 10 | New rows for the values that the agent chose: the five kinds and their values, the lengths of 4 to 14 s (18 s wide), the cut on a downbeat, the weights of 6.2, the clearance distances, the blend rule, the opening on the conductor, and the end on a wide shot. |

## 11. Implementation checklist

Each test must fail without its code (`AGENTS.md`, Tests). Build the inputs with the real `midi/`,
`score/`, and `models/` modules.

1. **Entries.** Move the entry rule of `findCues()` into one exported function. `findCues()` and
   `prepareShots()` call it. Test: the cues of each demo do not change.
2. **Types and module.** Add `shots/` with the types of section 7.
3. **Windows.** Merged spans for each seat, coverage, loudness, and activity. Test: a seat with one
   note of half the window has a coverage of 0.5.
4. **Cut points.** Test for each demo: each start except the first is a downbeat within 1 ms, or
   the beat nearest to the wanted time when no downbeat fits. Each shot is 4 to 14 s long (18 s
   for a wide or high shot), except the last. The first shot starts at `-Infinity`, and its kind
   is `conductor`. The last shot is `wide`, and it starts at least 8 s before the end.
5. **Choice rules.** Test for each demo: no two neighbor shots with the same kind and subject, no
   two neighbor section or solo shots of one group, at least two shots between two wide or high
   shots, and at most 25% wide and high shots. A synthetic score made with `buildScore()` from
   bytes: a horn entry after four bars of rest gives a horn shot at that bar. A loud tutti gives a
   wide or high shot.
6. **Jump cuts.** Test: two neighbor shots differ by 30° or more in the view direction, or by 1.5
   times or more in the radius.
7. **Clearance.** Test for each demo, at the aspects 0.46, 1.0, 1.6, and 2.4, every 50 ms of song
   time: the camera is at least 0.6 m from each box of `layoutObstacles()`, at least 1.0 m from
   the conductor box, and at least 0.6 m above the stage top. The segment from the camera to the
   target crosses no box except the body box of the subject.
8. **Subject in the frame.** Test: with a `PerspectiveCamera` and the view offset of 34 px, the
   head point of each subject player projects inside the frame at each aspect. For a wide shot,
   the 4 top corners of the stage project inside the frame.
9. **Determinism.** Test: two calls of `prepareShots()` with one seed give deep-equal plans.
   Another seed gives another plan. The module reads no clock and no `Math.random()` (the lint
   rules of the pure core).
10. **Seek.** Test: `cameraAt()` at 200 random times in a random order gives the same values as
    in the sorted order.
11. **Transport.** Test: before the first play, `cameraAt()` equals `defaultView()`. In a count-in
    during play, it equals the camera at `startSec`. While paused, it equals the camera at the
    song time. After the end, it holds.
12. **Reduced motion.** Test: with `still`, the camera is constant within a shot, and each cut is
    a jump with no blend frames.
13. **Blend.** Test: within a blend, the camera moves at most `distance / blendSec × 2` in each
    millisecond. A hard cut changes the camera only at a shot start.
14. **Speed.** Timed Vitest tests for the two targets of 9.7.
15. **Mode rules.** A pure function in `app/` for the mode: the start mode from the motion
    preference, a drag or a wheel or a pinch gives Free, a click of 4 px or less keeps the mode,
    the toggle switches, "Reset view" gives Free, and a new piece keeps the mode. Unit tests for
    each event.
16. **Handoff.** Test of `StageCamera`: after a change to Free, the camera keeps its position, and
    the target of the controls is the target of the last shot. The first update of the controls
    does not move the camera, also at a distance of 4 m.
17. **Bar.** The toggle button, its label, `aria-pressed`, the icon, and the phone layout.
    Screenshots at 1440 × 900 and 390 × 844.
18. **Smoke test.** `tools/smoke.ts` checks that the camera moves during play in Cinematic mode,
    and that a scripted drag changes the mode.
19. **Review.** Screenshots of each kind of shot of each demo at both sizes, for the review agent
    (9.8).
20. **Docs.** The design changes of section 10, and a grep for `resetView` and "Reset view".

## 12. Choices for the user

- **A. The phone bar.** "Automatic camera" stays in the bar on a phone (proposed), or it moves
  into the "Playback" group with "Reset view". In the bar, the seek bar gets about 44 px less.
- **B. A key.** The key C toggles the automatic camera (proposed), or there is no key. The button
  is in the focus order in both cases.
- **C. Solo follows the camera.** When the user solos one seat, the automatic camera shows only
  that seat (a section or solo shot at each cut). This needs a second plan for each solo. It is
  not in version 1 (proposed), or it is in version 1.
- **D. The opening.** The click on play cuts to the face of the conductor for the count-in and the
  first phrase (proposed, as in S1 and S7), or the default view holds for the first phrase.
- **E. Blends.** Short camera blends in slow or soft music (proposed, section 6.5), or hard cuts
  only.
- **F. The light on the conductor.** The face of the bear is dim in the conductor shot, because
  the spotlight is 72° above it. Keep it (proposed, as the stage light of 4.5), or add a weak
  front light for the conductor shot only.
