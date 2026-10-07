# Similar Products and Prior Art

Date: 2026-10-07. Focus: Market research of similar products, projects, and prior art for Zoophony.

The user asked on 2026-10-07: "do a research to see if there's similar products". This report examines existing products, open-source projects, browser experiments, games, and academic prototypes. It compares their features to Zoophony and identifies what makes Zoophony unique.

This report is research. It changes no application code.

## 1. Summary

- **No identical product exists.** No existing product combines all core elements of Zoophony:
  1. A client-side static WebGL site that requires no installation.
  2. Playback of arbitrary standard MIDI files (`.mid`) through drag-and-drop.
  3. Automatic score parsing and mapping to a symphonic orchestra seating layout.
  4. Real-time procedural 3D animation of low-poly animal musicians (bowing, blowing, striking, and conducting).
  5. Built-in SoundFont synthesis with per-seat isolation (solo and mute) and cinematic camera modes.
- **Nearest technical relative: midis2jam2 (and MIDIJam).** The desktop application `midis2jam2` animates 3D instruments from arbitrary MIDI files. It renders only standalone instruments without musician characters. It runs as a native Kotlin and jMonkeyEngine program. It does not run in a web browser.
- **Nearest conceptual relative: The Orchestra (Touch Press).** The iPad application `The Orchestra` introduced the interactive symphonic layout, section isolation, and synchronized score. It uses pre-recorded audio and video of human musicians. It does not use 3D simulation or user MIDI files.
- **Nearest browser character relative: Blob Opera (Google Arts & Culture).** David Li's WebGL experiment features charming 3D characters. They sing with real-time audio synthesis. It features four vocal blobs controlled by mouse dragging. It does not load MIDI files or model an instrumental orchestra.
- **Nearest conducting games: Maestro VR and Wii Music.** `Maestro VR` lets users conduct a 3D orchestra with custom MIDI support in virtual reality. `Wii Music` features stylized Mii characters playing orchestral instruments on a concert stage. Both are closed native games. Neither runs on the web.
- **Opportunity.** Zoophony occupies a unique position. It turns any standard MIDI file into a playful, visual symphonic performance in seconds inside a standard web browser.

## 2. Product Comparison Categories

### 2.1 3D Real-Time MIDI Visualizers and Virtual Bands

These products convert MIDI data into 3D animations in real time.

#### midis2jam2 and MIDIJam
- **Source:** Jacob Wysko (`https://midis2jam2.xyz/`, `https://github.com/PolishLucario/midis2jam2`); Scott Mansell (Games by Scott, 2003).
- **Platform:** Native desktop (Windows, macOS, Linux) and Android. Written in Kotlin with jMonkeyEngine 3.
- **Input:** Standard MIDI files (`.mid`).
- **Mechanism:** Parses MIDI channels and tracks. Maps them to 3D instrument models: grand piano, acoustic and electric guitars, drum kit, brass, woodwinds, and violins. Keys press down, drumsticks strike, and strings vibrate in real time. Supports custom SoundFonts and free-roam camera motion.
- **Comparison to Zoophony:** `midis2jam2` animates instruments alone without characters or animal musicians. Its instrument set focuses on rock, pop, and general MIDI bands rather than a traditional seated symphony orchestra. It requires local installation and does not run in a web browser.

#### Euphony
- **Source:** Xueqiao Xu (`https://github.com/qiao/euphony`, 2012).
- **Platform:** Browser (WebGL and Three.js).
- **Input:** Standard MIDI files through drag-and-drop.
- **Mechanism:** Renders MIDI notes as 3D colored blocks that fall toward a piano keyboard, inspired by MIDITrail. Features free orbit camera controls and Web Audio playback.
- **Comparison to Zoophony:** Euphony provides abstract piano-roll visualization. It has no physical stage, no instrument models, and no performing characters.

#### MIDITrail, MIDIVisualizer, and SeeMusic
- **Source:** WNNW (`MIDITrail`), kosua20 (`https://github.com/kosua20/MIDIVisualizer`), Visual Music Design (`https://www.seemusicapp.com/`).
- **Platform:** Native desktop (Windows, macOS).
- **Input:** Standard MIDI files or live MIDI controllers.
- **Mechanism:** Renders 2D and 3D falling bars, particle clouds, or light ribbons above piano keyboards.
- **Comparison to Zoophony:** These tools target music analysis, education, and piano performance videos. They feature abstract geometric representations with no character models or orchestral staging.

#### Animusic
- **Source:** Wayne Lytle, Animusic LLC (2001, 2005; `https://www.animusic.com/`).
- **Platform:** Pre-rendered CGI video.
- **Input:** MIDI files driving proprietary animation software (*MIDImotion*).
- **Mechanism:** Generates intricate procedural animations of fantastical self-playing mechanical instruments.
- **Comparison to Zoophony:** Animusic represents the aesthetic inspiration for procedural instrument animation. It consists of pre-rendered offline videos and does not offer real-time playback or user file interaction.

### 2.2 Interactive Classical Orchestra Applications

These platforms teach symphonic structure through interactive orchestra layouts.

#### The Orchestra
- **Source:** Touch Press, Philharmonia Orchestra, Esa-Pekka Salonen (2012; `https://philharmonia.co.uk/the-orchestra-app/`).
- **Platform:** Native iPad application.
- **Content:** Eight curated symphonic works (Beethoven, Berlioz, Debussy, Mahler, Stravinsky, Salonen).
- **Mechanism:** Provides the interactive "BeatMap", a synchronized top-down diagram of the orchestra seating. Users tap sections to isolate (solo or mute) specific instruments in real time. Offers multi-camera video angles, synchronized scores, and instrument demonstrations.
- **Comparison to Zoophony:** `The Orchestra` validated the user experience of symphonic seating layouts and per-section audio isolation. It uses pre-recorded multi-track audio and video of human musicians. It cannot load user MIDI files and does not run in standard web browsers.

#### Semi-Conductor
- **Source:** Google Creative Lab (2018; `https://experiments.withgoogle.com/semi-conductor`, `https://github.com/googlecreativelab/semiconductor`).
- **Platform:** Browser (Tone.js, PoseNet machine learning).
- **Input:** Webcam motion.
- **Mechanism:** Tracks user arm movements through the camera. Arm speed controls playback tempo, and vertical position controls volume and section emphasis.
- **Comparison to Zoophony:** Semi-Conductor focuses on gesture-based conducting interaction over fixed orchestral audio recordings. It features no 3D animated musicians, no physical stage, and no MIDI file import.

#### LSO Play
- **Source:** London Symphony Orchestra (`https://lso.co.uk/`).
- **Platform:** Browser video player.
- **Content:** Curated live orchestral performances.
- **Mechanism:** Allows users to switch between multiple high-definition camera angles during a performance, focusing on specific instrument sections or the conductor.
- **Comparison to Zoophony:** LSO Play is a multi-angle video streaming player for live human concerts. It has no 3D graphics, no MIDI support, and no synthesis engine.

### 2.3 Virtual Reality and Console Conducting Games

These titles simulate conducting or performing with an orchestra.

#### Maestro VR
- **Source:** Symphonic Games (2022-present; Steam Early Access).
- **Platform:** PC Virtual Reality (SteamVR).
- **Input:** VR motion controllers, hand tracking, or custom MIDI files.
- **Mechanism:** Places the player on a conductor podium in a 3D concert hall facing a full seated orchestra. Players conduct beats, dynamics, and cues. Supports loading user MIDI files and customizing orchestra seating.
- **Comparison to Zoophony:** `Maestro VR` shares custom MIDI playback and customizable orchestra seating with Zoophony. It requires a dedicated VR headset and a gaming computer. It focuses on conducting rhythm mechanics and uses realistic human musician models instead of stylized animals.

#### Maestro (Maestro: The Masterclass)
- **Source:** DoubleJack (2024; Meta Quest and SteamVR).
- **Platform:** VR with hand tracking.
- **Content:** Curated classical and modern soundtrack.
- **Mechanism:** Players conduct an orchestra in an ornate opera house using natural hand gestures. Stylized human musicians react to beat patterns, volume gestures, and cue prompts.
- **Comparison to Zoophony:** It is a closed rhythm game for VR headsets. It does not accept arbitrary MIDI files or run in a web browser.

#### Wii Music (Mii Maestro)
- **Source:** Nintendo (2008; Nintendo Wii).
- **Platform:** Console with Wii Remote motion controls.
- **Content:** Five classical pieces (including *Ode to Joy* and *Carmen*).
- **Mechanism:** Players wave the remote as a baton to conduct an orchestra of Mii characters on a 3D concert stage. Musicians sit in orchestra sections on chairs and play instruments in sync with player tempo.
- **Comparison to Zoophony:** `Wii Music` shares the charm of stylized, expressive characters performing orchestral music on stage. It is a closed console game with a fixed tracklist, no MIDI file import, and no web accessibility.

### 2.4 Character Ensembles and Interactive Sound Toys

These products use playful characters to represent musical voices or loops.

#### Blob Opera
- **Source:** David Li and Google Arts & Culture (2020; `https://artsandculture.google.com/experiment/blob-opera/`).
- **Platform:** Browser (WebGL and Web Audio, with machine learning).
- **Mechanism:** Four colorful cartoon blobs represent four vocal parts: soprano, mezzo-soprano, tenor, and bass. Users drag blobs vertically to change pitch and horizontally to alter vowels. A neural network harmonizes the remaining blobs in real time. Blobs stretch, blink, and sing with expressive procedural facial animations.
- **Comparison to Zoophony:** `Blob Opera` shares the browser-first WebGL presentation and cute character appeal. It is a vocal toy driven by direct mouse manipulation. It plays no multi-track MIDI scores.

#### Toca Band and Bandimal
- **Source:** Toca Boca (2012; iOS); YATATOY (2017; iOS).
- **Platform:** Mobile devices.
- **Mechanism:** Children place quirky animated animal or monster characters on a stage. Each character loops a specific rhythm or instrument stem. A central solo spot brings a character to the front.
- **Comparison to Zoophony:** These apps demonstrate the charm of animal musicians and stage staging. They are loop-based sound toys for young children, with fixed pre-rendered audio clips and no MIDI support.

#### Incredibox
- **Source:** So Far So Good (2011-present; `https://www.incredibox.com/`).
- **Platform:** Browser and mobile apps.
- **Mechanism:** Users drag musical icons onto animated beatboxer characters to construct looping arrangements. Characters animate in sync with their loops.
- **Comparison to Zoophony:** Incredibox uses synchronized character animations to represent audio layers. It is a 2D beatbox loop mixer with curated sound packs. It does not render 3D scenes or parse standard MIDI files.

#### Songs of Diridum
- **Source:** Goo Technologies (2013; WebGL and Web Audio showcase for Firefox 25).
- **Platform:** Browser.
- **Mechanism:** An interactive 3D voxel world with a live jazz band performing on a square. Users navigate the space with 3D audio spatialization and adjust individual instrument stems via a mixing panel.
- **Comparison to Zoophony:** It demonstrated browser-based 3D band visualization and stem mixing. It was a single promotional demo track without MIDI loading or character animation pipelines.

## 3. Feature Matrix

The table below compares Zoophony with the most relevant existing products and projects.

| Product | Platform | Input Source | Visual Performers | Music Domain | Seat Isolation (Solo / Mute) | Zero Install (Static Web) |
|---|---|---|---|---|---|---|
| **Zoophony** | Browser (WebGL, Three.js) | Arbitrary `.mid` files and demos | 3D low-poly animal orchestra (19 species) | Classical symphony orchestra | Yes (per-seat and section) | Yes (< 1 MB initial load) |
| **midis2jam2** | Native desktop (Kotlin, jMonkeyEngine) | Arbitrary `.mid` files | 3D animated standalone instruments | General MIDI band (rock, pop, jazz) | Partial (via mixer) | No (native installer / APK) |
| **Euphony** | Browser (WebGL, Three.js) | Arbitrary `.mid` files | 3D falling bars and piano keyboard | Any MIDI music | No | Yes |
| **The Orchestra** | Native iPad | Curated repertoire (8 works) | Real video of human Philharmonia musicians | Classical symphony orchestra | Yes (BeatMap section isolation) | No (iOS app store) |
| **Blob Opera** | Browser (WebGL, Web Audio) | Mouse dragging gestures | 4 animated singing blobs | Operatic 4-part choir | Yes (mute per blob) | Yes |
| **Semi-Conductor** | Browser (Tone.js, PoseNet) | Webcam arm gestures | No performers (abstract UI) | Classical orchestral excerpts | No | Yes |
| **Maestro VR** | PC VR (SteamVR) | Custom `.mid` files and curated tracks | 3D seated human orchestra | Classical symphony orchestra | No (conducting focus) | No (Steam download) |
| **Wii Music** | Nintendo Wii console | Wii Remote gestures | 3D Mii characters playing instruments | Classical and popular pieces | No | No (Wii optical disc) |
| **Toca Band** | Mobile (iOS, Android) | Interactive touch | 16 stylized cartoon characters | Loop-based toy music | Yes (solo podium) | No (app store) |
| **Incredibox** | Browser and mobile | Icon drag-and-drop | 2D animated beatboxers | Loop-based hip-hop / pop | Yes (solo and mute per singer) | Partial (web demo, app store) |
| **Songs of Diridum** | Browser (WebGL, Web Audio) | Fixed demo track | 3D voxel jazz musicians | 1 jazz track | Yes (stem sliders) | Yes |

## 4. Key Takeaways for Zoophony

1. **A clear, unoccupied niche.** No other product offers a web-based, zero-installation 3D stage where arbitrary user MIDI files drive an animated animal orchestra. Zoophony combines the arbitrary MIDI flexibility of `midis2jam2` with the aesthetic charm of `Blob Opera` and the educational layout of `The Orchestra`.
2. **Validation of core design choices:**
   - **Per-seat isolation:** *The Orchestra*'s BeatMap proved that users enjoy isolating individual orchestral voices from the ensemble. Zoophony's seat list and per-seat solo and mute controls replicate this feature for any MIDI file.
   - **Procedural character animation:** The longevity of *MIDIJam* and *midis2jam2* proves that deterministic, event-driven mechanical animation provides lasting visual fascination. Adding animal musicians elevates this mechanic into an emotional, joyful experience.
   - **Accessible browser delivery:** *Blob Opera* gained tens of millions of views because it loaded instantly in a web browser without logins or downloads. Zoophony's strict budget of less than 1 MB after gzip enables the same frictionless viral sharing.
3. **Differentiation from visualizers:** Traditional MIDI visualizers (*Euphony*, *MIDITrail*, *SeeMusic*) rely on abstract falling bars. While informative, they lack physical presence. Zoophony provides narrative presence: animals sit on wooden chairs in a concert hall under a warm spotlight, holding instruments and watching the conductor.
