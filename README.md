# Zoophony

Zoophony is a WebGL MIDI player. Low-poly animals play orchestral music on a small stage.

Live site: <https://www.zoophony.com/>

![Zoophony](zoophony.png)

## Features

- **3D animal orchestra.** Low-poly animals play the strings, the woodwinds, the brass, the
  percussion, the piano, and the harp, and a choir of animals sings. The poses follow each note:
  the fingers, the bow strokes, the breaths, the mallet strokes, and the keys.
- **Your own MIDI files.** Drop a `.mid` file onto the window, or select one of the built-in
  public domain pieces.
- **SoundFont synth.** An AudioWorklet plays the instruments from a SoundFont, with the reverb of
  a real concert hall.
- **Camera.** Select the cinematic camera, which follows the sections that play, or the free
  orbit camera.
- **Section controls.** Solo or mute each section. The stage beam follows the soloists.
- **Small static app.** The app runs in the browser with WebGL and Web Audio. The first download
  is less than 1 MB after gzip.

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) version 24 or newer
- [pnpm](https://pnpm.io/) package manager

### Run locally

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start the local development server:
   ```bash
   pnpm dev
   ```

3. Open `http://localhost:5173` in your browser.

### Build for production

Create a static build in `dist/`:
```bash
pnpm build
```

## Controls

| Key or gesture | Action |
|---|---|
| `Space` | Play or pause |
| `Left` / `Right` | Seek 5 seconds backward or forward |
| `Home` | Return to start |
| `C` | Toggle automatic cinematic camera |
| `M` | Toggle mute |
| `F` | Toggle full screen |
| `Escape` | Close drawer or dialog |
| Drag (> 4 px) | Orbit 3D camera |
| Scroll / Pinch | Zoom in or out |

## Architecture

- `src/score/`: Parses MIDI events into timed notes, sections, and player seat assignments.
- `src/pose/`: Calculates animal poses, bow angles, and finger placements from score time.
- `src/models/`: Builds low-poly animal geometries, rigs, and instrument meshes.
- `src/scene/`: Manages Three.js rendering, lighting, spotlight beams, and camera transitions.
- `src/audio/`: Coordinates the SoundFont synthesizer inside a Web Audio worklet.

## Contributing

[`CONTRIBUTING.md`](CONTRIBUTING.md) gives the setup, the checks, and the rules of a change. The
design is in [`docs/design.md`](docs/design.md). All unit tests are paused now: `pnpm test` runs
no test, and `pnpm test:paused <path>` runs one paused file.

## Credits

The app includes the third-party files below. The build writes all their licenses into
`third-party-licenses.txt`, and the credits dialog of the app links it.

- **Demo pieces:** [`demos/README.md`](demos/README.md) gives the source, the license, and the
  checksum of each piece.
- **SoundFont:** [`assets/soundfont/README.md`](assets/soundfont/README.md) (GeneralUser GS and
  the Versilian Studios libraries).
- **Hall reverb:** [`assets/hall/README.md`](assets/hall/README.md) (St Paul's Hall, University
  of Huddersfield).
- **Font:** [`assets/fraunces/README.md`](assets/fraunces/README.md) (Fraunces, SIL Open Font
  License).
- **GitHub mark:** [`assets/github-mark/README.md`](assets/github-mark/README.md) (MIT license).
- **Animal models:** each folder of [`assets/models/`](assets/models/) has a README with the
  origin and the checksums of its files.

## License

- **Code:** the [Apache License 2.0](LICENSE).
- **Animal models:** the files in `assets/models/` and `src/models/studio/` are under
  [CC BY-NC 4.0](assets/models/LICENSE). You can use, change, and share
  them, but not for commercial purposes.
- **Your output:** you own the videos, images, and audio that you make with Zoophony. You can use
  them for any purpose, including commercial use. This grant covers the animals as they appear in
  your output. It does not cover the model files.
- **Name and logo:** the licenses do not cover the name "Zoophony" or the paw logo. Give a fork a
  different name. It can say that it is "based on Zoophony".
- **Third-party files:** the demo files, the SoundFont, and the hall reverb keep their own
  licenses. The credits dialog of the app and the README file of each folder list them.
