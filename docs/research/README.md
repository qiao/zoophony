# Research

These reports hold the facts behind the decisions in [`../design.md`](../design.md).
Research agents wrote them on 2026-10-04. Each fact has a source URL, a source file and line
range, or a local test. "Not verified" marks a fact that the agent could not confirm.

| Report | Topic | Decisions that use it |
|---|---|---|
| [`audio-engines.md`](audio-engines.md) | Browser audio engines, SoundFonts, licenses, sizes, Safari codecs | The audio engine and the SoundFont |
| [`midi-sources.md`](midi-sources.md) | Licensed demo MIDI files, GM1, GS, and GM2 drum maps, the default program | The demo list, the channel 10 map |
| [`audio-scheduling.md`](audio-scheduling.md) | spessasynth queue, ports, seek, decode, speed; timers in hidden tabs | The worklet design, the sample decode, the port rule |
| [`musescore-export.md`](musescore-export.md) | The MuseScore export of the Boulanger score | The Boulanger demo file |

## Scripts

The `scripts/` folder holds the scripts that the agents ran. They are research evidence, not
app code.

| Folder | Language | Used by |
|---|---|---|
| `scripts/spessasynth/` | Node 24 ES modules | `audio-engines.md`, `audio-scheduling.md` |
| `scripts/midi/` | Python 3, standard library only | `midi-sources.md` |
| `scripts/musescore/` | Python 3, standard library only | `musescore-export.md` |

The reports name the files of a temporary research folder. Use this map to find them here:

| Name in a report | Location in this repository |
|---|---|
| `ss/<file>`, `scratchpad/ss/<file>` | `scripts/spessasynth/<file>` |
| `scratchpad/midinfo.py`, `mscxinfo.py`, `pieceinfo.py`, `scrape_mutopia.py` | `scripts/midi/<file>` |
| `musescore/<file>.py`, `scratchpad/musescore/<file>.py` | `scripts/musescore/<file>.py` |

The repository does not hold these inputs and outputs of the scripts:

- `GeneralUserGS.sf3` (GeneralUser GS 2.0.3, from the SpessaSynth repository).
- The split preset files in `split/`.
- The downloaded Mutopia MIDI files and the OpenScore `.mscz` files.
- The MuseScore exports. The Boulanger demo file comes into `demos/src/` in step 7 of the work
  order.

To run the spessasynth scripts again:

1. Install `spessasynth_core@4.3.22` in the folder of the scripts.
2. Put `GeneralUserGS.sf3` in the parent folder.
3. Run a script with `node <file>.mjs`.

The size entries `entry-ss.js` and `entry-tone.js` also need `spessasynth_lib@4.3.14`,
`tone@15.1.22`, `vite`, and `esbuild`.
