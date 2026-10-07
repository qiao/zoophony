# A traditional and joyful Ode to Joy: candidates and measures

Date of research: 2026-10-06.

The user asked on 2026-10-06: "find another version of ode to joy that's more traditional and
joyful". The demo `beethoven-9` was bars 216 to 330 of the finale of Beethoven's Symphony
No. 9 (design 8.2). This report measures why that excerpt is not joyful, compares the
candidates that design 8.1 permits, and gives the reasons for the choice.

## Result

The best candidate is a cut of the same OpenScore score: printed bars 543 to 590 (the full
choir sings the theme "Freude, schöner Götterfunken" with the full orchestra) and printed bars
851 to 940 (the Prestissimo coda to the end of the symphony).

| Item | Bars 216 to 330 (until 2026-10-06) | Bars 543 to 590 and 851 to 940 |
|---|---|---|
| Length | 3:13 (193.119 s) | 2:38 (158.298 s) |
| First note | 1.5 s, the baritone alone | 0.0 s, the choir and the orchestra |
| The theme | the baritone at 56.6 s, quiet | the full choir at 0.0 s, fortissimo |
| Time with the choir | 57.0 s (30%) | about 131 s (82%) |
| Time in loud bars (mean velocity 90 or more) | 62.2 s (32%) | about 157 s (98%) |
| 10 s windows at -21 LUFS or louder | 7 of 19 | 16 of 16 |
| Loudness range | 21.7 LU | 3.1 LU |
| Last chord | F major (the notes A and F), a fermata | D major (the note D in all parts) |
| Seats | 14, with two choir seats (4 soloists, 8 singers) | 15, with one choir seat (8 singers), trombones, percussion |
| Players ("Auto") | 44 | 45 |
| Stage side | 11.98 m, two riser levels | 11.58 m, one riser level |
| Preset files, PCM | 14 files, 7.02 MB, 46.5 MB | 14 files, 7.55 MB, 50.7 MB |
| Piece gain to -18 LUFS | -4.4 dB | -6.5 dB |
| True peak at that gain | -1.79 dBTP | -4.98 dBTP |

The loudness values come from the output chain of the app at the piece gain to -18 LUFS
(section "Method"). The score source and the license do not change: OpenScore Orchestra,
CC0 1.0, the same score file at the same commit.

## Why bars 216 to 330 are not joyful

The excerpt follows the order of the finale. The joyful parts come late, and the end is open.

```text
 0 s     50 s        57 s                            166 s         193 s
 │ recit. │ "Freude!" │ theme: baritone, quartet;     │ "vor Gott!" │
 │ 1 voice│ answers   │ the choir sings only the last │ tutti with  │
 │ alone  │           │ 8 bars of each stanza         │ the choir   │
 -37 LUFS              -18 to -34 LUFS                 -15 to -19 LUFS
```

- **The start is a recitative.** The baritone sings "O Freunde, nicht diese Töne!" alone at a
  recitative tempo (80 quarter notes each minute, 3/4). In 14 of the first 21 bars, the
  baritone is the only part. The first three 10 s windows measure -37, -37, and -35 LUFS at the
  piece gain. The UX audit 2026-10-06 (U3) measured the same opening at -37 dB RMS.
- **The theme comes late.** The oboes and the bassoons play the head of the theme at 50.6 s.
  The baritone sings the theme at 56.6 s, with a quiet accompaniment (mean velocity 49 to 55).
- **The choir sings little.** The choir sings in 30% of the time. It sings only the last 8 bars
  of each stanza ("Alle Menschen werden Brüder"), and the full tutti of "vor Gott!" from
  about 166 s. The soloists sing in 63% of the time.
- **The loudness changes much.** The loudness range is 21.7 LU. Only 7 of the 19 windows of
  10 s are at -21 LUFS or louder. `demo-loudness.md` measured the same range.
- **The end is open.** The last chord is the fermata of "vor Gott!" on F major (the notes A and
  F), in a piece in D major. In the symphony, the Turkish march in B-flat follows it.
- **No trombones and no percussion.** Beethoven keeps them for later parts of the finale.

## Sources and licenses

Design 8.1 permits a public domain composition with a file or a score that is public domain,
CC0, or CC BY with a credit line. The requests used the User-Agent `zoophony-build/1.0` and sent
no personal data.

- **OpenScore Orchestra** (the Hauptstimme repository) at commit `8f677853`: the score of the
  finale, SHA-256 `7055e0c60a1d819ec21e455676aaca0106f0d251a17e311714a0de62434dca55`, the same
  file as the demo until 2026-10-06. The README gives "Scores: CC0 1.0 Universal;
  Annotations: CC-By-SA" (read on 2026-10-05, `cheerful-demos.md`). The pipeline removes all
  lyrics, so no annotation enters the result.
  Source: <https://github.com/MarkGotham/Hauptstimme/blob/8f677853c45b74ca0afcd79677e5379c06c82354/data/Beethoven,_Ludwig_van/Symphony_No.9,_Op.125/4/Beethoven_Op.125_4.mscz>
- **Mutopia Project.** The searches "ode to joy", "hymn to joy", "freude", "an die freude", and
  "beethoven symphony 9" found one setting of the theme: piece 528, "Ode to Joy", for SATB
  voices, style "Hymn", "Copyright: Public Domain", maintainer Peter Chubb. The LilyPond source
  holds `copyright = "Public Domain"`. Mutopia has no score of the Symphony No. 9. "Die Freude
  reget sich" (2145) is CC BY-SA 4.0, and 8.1 refuses it.
  Source: <https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=528>
- **Wikimedia Commons.** The searches "Ode to Joy", "Freude", and "Beethoven Symphony 9" for
  MIDI files gave two files of the theme with a license of the file:
  - `File:Freude, schöner Götterfunken.mid`: "setting & sound file: Rabanus Flavus (Peter
    Gerloff)", `{{self|Cc-zero}}` (CC0).
    Source: <https://commons.wikimedia.org/wiki/File:Freude,_sch%C3%B6ner_G%C3%B6tterfunken.mid>
  - `File:Sym 9 Fourth Movement.mid`: `{{PD-old}}`, with the author "Ludwig van Beethoven" and
    no source. This tag covers the composition only. The page names no person who made the
    sequence, so the sequence has no clear license (8.1, as `cheerful-demos.md` found).
    Source: <https://commons.wikimedia.org/wiki/File:Sym_9_Fourth_Movement.mid>
  - The other files are other pieces, or CC BY-SA (Schubert, "An die Freude"; a guitar
    arrangement).
- **IMSLP and musescore.com** were not used, for the reasons of `midi-sources.md`.

## Method

The scripts are in [`scripts/joyful-ode/`](scripts/joyful-ode/).

```text
OpenScore score (SHA-256 checked)
   │ the pipeline of demos/README.md: strip_lyrics, remap_score, add_switches,
   │ MuseScore 4.7.5, remap_midi, validate (0 missed, 0 extra, 0 wrong program)
   v
full.mid: the full finale. Its cut 364800 to 575520 gives the old demo file, byte-identical.
   │ cut_midi.py with one or more tick ranges (candidates.sh)
   v
candidate files
   ├─ structure.py, themeat.py, lastchord.py, shares.py: bars, theme, last chord, shares
   ├─ ../cheerful-demos/analyze.ts: seats, players, stage, presets, PCM (the app modules)
   ├─ loud.ts: the synth render and the output chain of demo-loudness.md, gain to -18 LUFS
   └─ shots.ts: the shot plan of prepareShots() for each demo
```

- `measures.py` of `cheerful-demos` gives the tick of each bar. The score counts the pickup
  bar as measure 1, and three more partial bars, so printed bar 543 is measure 544, and printed
  bar 851 is measure 854.
- `themeat.py` finds the first time of the head of the theme (the steps 0, +1, +2, 0, -2, -1,
  -2) in the top line of each channel.
- `loud.ts` repeats `loudness.ts` of `demo-loudness.md` for any file. For the old demo file, it
  gives the same gain (-4.4 dB) and loudness (-18.05 LUFS) as that report.

## Candidates

The printed bar numbers follow the score of Beethoven. "Loud windows" counts the 10 s windows
at -21 LUFS or louder at the gain to -18 LUFS.

| | Candidate | Source, license | Length | The theme | Loud windows, range | Seats ("Auto") | Choir | Verdict |
|---|---|---|---|---|---|---|---|---|
| A | Bars 216 to 330 | OpenScore, CC0 | 3:13 | baritone at 56.6 s | 7 of 19, 21.7 LU | 14, 44 players | soloists 4, choir 8 | The demo until 2026-10-06 |
| **B** | **Bars 543 to 590 and 851 to 940** | **OpenScore, CC0** | **2:38** | **full choir at 0.0 s** | **16 of 16, 3.1 LU** | **15, 45 players, trombones, percussion** | **choir 8** | **Chosen** |
| C | Bars 763 to 940 | OpenScore, CC0 | 3:53 | only a head at 192 s | 12 of 23, 19.0 LU | 16, 53 players | soloists 8, choir 8 | Not the famous theme, slow quiet cadenza |
| D | Bars 241 to 296, 543 to 594, and 851 to 940 | OpenScore, CC0 | 4:07 | baritone at 0.0 s, quiet | 20 of 25, 19.0 LU | 16, 49 players | soloists 4, choir 8 | Runner-up. Keeps the soloists, but starts at -35 LUFS for 20 s, and is longer than 4 minutes |
| E | Bars 92 to 207 | OpenScore, CC0 | 2:56 | cellos and basses at 0.0 s, very quiet | 6 of 17, 24.1 LU | 11, 28 players | none | No voices. The first 100 s are at -35 to -45 LUFS, and it ends before the fanfare of bar 208 |
| F | Bars 237 to 330 | OpenScore, CC0 | 2:22 | baritone at 6.0 s | not measured | 14, 44 players | soloists 4, choir 8 | The same open end on F major as A |
| G | Bars 543 to 594 | OpenScore, CC0 | 1:13 | full choir at 0.0 s | not measured | 12, 35 players | choir 8 | Shorter than 2 minutes |
| H | "Ode to Joy" hymn | Mutopia 528, public domain | 0:38 | at 0.0 s | not measured | 1 piano seat | none | The four voices play as piano (program 0) on two staves. Too short |
| I | "Freude, schöner Götterfunken" | Commons, CC0 (Peter Gerloff) | 1:40 | at 0.3 s | not measured | 7: three violin, two viola, one cello, one trombone seat | none | String ensemble program 48 divides into wrong seats (design 3.5). Too short |
| J | "Sym 9 Fourth Movement.mid" | Commons, `PD-old` only | not measured | not measured | not measured | not measured | not measured | No license of the sequence (8.1) |

### The chosen excerpt

B joins two parts of the finale in D major:

```text
 0 s                         68.6 s                                  158.3 s
 │ bars 543 to 590            │ bars 851 to 940                          │
 │ "Freude, schöner           │ Prestissimo "Seid umschlungen,           │
 │  Götterfunken": full choir │  Millionen!", Maestoso, Prestissimo      │
 │  ff, the full orchestra,   │  to the end, with trombones, triangle,   │
 │  6/8, dotted quarter = 84  │  cymbals, bass drum, half note = 132     │
 │ ends on D major chords     │ ends on D in all parts                   │
 -19 LUFS                      -16 to -19 LUFS
```

- **Ticks.** 880,800 to 949,920 (measures 544 to 591) and 1,610,880 to 1,781,760 (measures
  854 to the end), with 480 ticks for each quarter note.
- **The join.** The choir sings its last chord, D major, on the first beat of bar 590, and the
  full orchestra plays a second D major chord on the second beat. The Prestissimo of bar 851
  starts with a D in all parts. Bars 591 to 594 turn to G major for the Andante maestoso, so
  the cut leaves them out. A first cut to the end of bar 594 ended on a G major fermata and a
  short G of the trombones, the cellos, and the basses.
- **Left out.** The Andante maestoso, the Adagio, the double fugue, the Allegro ma non tanto,
  and the cadenza of the soloists (printed bars 591 to 850, about 7:57).
- **The theme.** The choir sings the theme from the first note to about 67 s. The flutes, the
  oboes, and the horns double it.
- **The seats.** violin (2), viola, cello, contrabass, flute, oboe, clarinet, bassoon, horn,
  trumpet, trombone, timpani, percussion, choir. The percussion seat has the triangle, the
  cymbals, and the bass drum (kit 48). The choir seat has 8 singers on one riser level.
- **Memory.** The new presets are the trombone (57) and the orchestral kit (128:48). The
  Boulanger demo already loads both, so a session with all demos needs no new preset.
- **Loudness.** At the gain 0 dB, the chain gives -11.57 LUFS, and the limiter acts. The gain
  -6.5 dB gives -18.03 LUFS, a true peak of -4.98 dBTP, and a loudness range of 3.1 LU. The
  windows of 10 s measure -16 to -19 LUFS.

## Findings for the app

- **No vocal soloists in a demo.** B has no soloists, so no demo has a choir seat of vocal
  soloists (design 3.8). The rule stays for a file of the user. Three tests used the old
  file for this rule: `score/vocal-soloists.test.ts`, the test "puts the vocal soloists on the
  lowest level" of `models/layout-scene.test.ts`, and the comment of the first-60-s choir test
  of `pose/pose-timing.test.ts`. They need another input with soloists.
- **Camera.** With seed 1, the shot plan of B has 19 shots: 3 wide, 3 solo, 5 section, 3 side,
  2 high, and 3 conductor. The choir sings the theme from 0 s to about 67 s, and it sings in
  82% of the time. No solo shot and no section shot shows the choir. Only the side shot at
  22.9 s and the wide and high shots show it. The first close shot is the horns at 8.6 s. Not
  verified: the cause in `prepareShots()`.
- **Stage.** The stage side changes from 11.98 m to 11.58 m, and one riser level replaces two.
- **First download.** The default demo does not change, so the first download does not change.

## Files

The scratch folder of this session holds the downloads, the exports, and the candidates. The
repository does not hold them.

```text
/private/tmp/claude-501/-Users-xueqiaoxu-proj-zoophony/bbc72698-2ea8-4111-b511-ab4feb30dd03/scratchpad/demo-ode/
  dl-os/        the OpenScore score
  dl-web/       the Mutopia and Commons search pages
  dl-mut528/    Mutopia 528 (ode.mid, ode.ly)
  dl-commons/   the CC0 Commons file
  out/          the pipeline output (full.mid)
  cand/         the candidates A to G
```
