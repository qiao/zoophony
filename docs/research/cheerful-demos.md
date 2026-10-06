# Cheerful demos: candidates, licenses, and measures

Date of research: 2026-10-05.

The user decided on 2026-10-05: "Add Ode to Joy to the list. Also replace all music that is
dark, negative or depressive with positive and cheerful pieces." Three demos were dark or sad:
Beethoven, Symphony No. 5, mvt 1, Grieg, "Åse's Death", and Mozart, Piano Concerto No. 23,
mvt 2. The Boulanger demo (bright) and the Mozart K. 315 demo (calm) stay.

This report gives the sources that design 8.1 permits, the candidates, the measures of each
candidate with the real pipeline of the app, and the reasons for the choice.

## Result

| Hash id | Piece | Source | License | Length | Players | Preset files | PCM |
|---|---|---|---|---|---|---|---|
| `beethoven-9` | Beethoven, Symphony No. 9, finale, bars 216 to 330 ("Ode to Joy") | OpenScore Orchestra | CC0 1.0 (score) | 3:13 | 48 | 14, 7.02 MB | 46.5 MB |
| `mozart-k525` | Mozart, Eine kleine Nachtmusik, K. 525, mvt 1 | Mutopia 2230 | Public Domain | 4:08 | 9 | 3, 2.33 MB | 13.8 MB |
| `bach-bwv1048` | Bach, Brandenburg Concerto No. 3, BWV 1048, mvt 1 | OpenScore Orchestra | CC0 1.0 (score) | 5:27 | 21 | 5, 3.73 MB | 25.1 MB |
| `beethoven-8` | Beethoven, Symphony No. 8, Op. 93, mvt 2 | OpenScore Orchestra | CC0 1.0 (score) | 3:40 | 26 | 9, 5.13 MB | 31.5 MB |

The four demos give four different stages:

```text
Boulanger      full orchestra, harp, celesta, percussion, trombones, tuba   (stays, default)
Beethoven 9    full orchestra, timpani, soloists and choir on the risers    (new)
Nachtmusik     four string parts, one player for each note                  (new)
Bach           three violin seats, string orchestra, harpsichord            (new)
Beethoven 8    woodwinds and horns with the strings                         (new)
Mozart K. 315  solo flute, oboes, horns, strings                            (stays)
```

## Sources and licenses

Design 8.1 permits a public domain composition with a file or a score that is public domain,
CC0, or CC BY with a credit line. These sources were checked on 2026-10-05.

- **Mutopia Project.** Each piece page shows one license. The listings of the instruments
  "Orchestra" (67 pieces) and "String" (94 pieces) and the composer listings of Handel, Haydn,
  Rossini, J. Strauss I and II, Tchaikovsky, Grieg, Bizet, Offenbach, Mendelssohn, Brahms,
  Schubert, Elgar, Boccherini, Telemann, Purcell, and Mozart were read with
  `scripts/midi/scrape_mutopia.py` and `scripts/cheerful-demos/composer.py`.
  The piece page of 2230 shows "Copyright: Public Domain", and its LilyPond source holds
  `license = "Public Domain"` and the maintainer "Mike Blackstock".
  Source: <https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2230>
- **OpenScore Orchestra** (the Hauptstimme repository). The README gives "Scores: CC0 1.0
  Universal; Annotations: CC-By-SA; Code: MIT", and "All scores have been copied from clearly
  identified and unequivocally public source editions on IMSLP." Each score holds
  "Score: CC0 1.0 Universal; Annotations: CC-By-SA" in its `copyright` meta tag. The
  repository has no MIDI files, so the MuseScore pipeline of `tools/musescore/` makes them.
  Source: <https://github.com/MarkGotham/Hauptstimme/blob/8f677853c45b74ca0afcd79677e5379c06c82354/README.md>
- **Annotations.** The annotations are lyrics, or staff text in a score that has lyrics.
  Source: <https://github.com/MarkGotham/Hauptstimme/blob/main/docs/annotation.md>. The
  Beethoven 9 score has 3,557 lyrics (the sung text of Schiller) and 369 staff texts, of which
  the single letters `a` to `o` are the annotations. The pipeline removes all lyrics first, the
  MuseScore export writes no staff text, and `remap_midi.py` drops the lyric events. The result
  files hold only the group names, the tempo, and the time and key signatures.
- **Wikimedia Commons.** A search of the MIDI files for Radetzky, William Tell, Morning Mood,
  Nutcracker, Hornpipe, Queen of Sheba, Ode to Joy, Symphony 9 Beethoven, Eine kleine, Spring
  Vivaldi, Haydn, Blue Danube, Can-can, Carmen, Water Music, and Hungarian Dance
  (`scripts/cheerful-demos/commons.py`) found no orchestral file with a clear license of the
  sequence. `File:Sym 9 Fourth Movement.mid` has the tag `PD-old`, which covers the
  composition only (as `midi-sources.md` found for the first movement).
- **IMSLP** does not accept MIDI files of standard repertoire, and musescore.com needs a login
  for a download (`midi-sources.md`). Neither was used.

## Method

`scripts/cheerful-demos/analyze.ts` reads each file with the modules of the app: `parseMidi()`,
`buildScore()` with the section size "Auto", `layoutScene()`, `resolvePresetFiles()` with
`sf/index.json` of the split SoundFont of design 6.2, and `testBanks()` for the PCM size, as the
decode Worker converts it. For each seat it prints the section, the players, the programs, the
channels, and the tracks that feed it. Thus a part on a wrong section (design 3.5) shows.

The loudness comes from the method of `room-and-mix.md`: `scripts/room-and-mix/render.ts`
renders the full demo with the stage mix, and `scripts/room-and-mix/final.py` applies the output
chain with the headroom of the SoundFont (6.5 dB), the trim of -1.14 dB, and a piece gain of
0 dB. The same run gave -18.5 LUFS for the Boulanger demo and -22.3 LUFS for the K. 315 demo,
the values of `DEMO_LOUDNESS`.

## The Ode to Joy excerpt

The finale has 940 bars and takes 24:05 in the export. The excerpt must be 3 to 6 minutes, must
have the famous theme, and must have the choir. `scripts/cheerful-demos/measures.py` gives the
tick of each bar. The score counts the pickup bar as measure 1, so printed bar `n` is measure
`n + 1`.

| Bars | Length | Players | Content | Verdict |
|---|---|---|---|---|
| 92 to 207 | 2:56 | 28 | The theme in the cellos and basses, then the full orchestra. No voices. | No choir |
| 92 to 330 | 6:16 | 48 | The above, then the Presto fanfare, the recitative, and the choir | Has the dissonant fanfare of bar 208, and is longer than 6 minutes |
| 237 to 330 | 2:22 | 48 | The theme with the baritone, the quartet, and the choir, to "vor Gott!" | Shorter than 3 minutes |
| **216 to 330** | **3:13** | **48** | **The recitative "O Freunde, nicht diese Töne!", then the above** | **Chosen** |
| 331 to 594 | 6:16 | 51 | The Turkish march, the fugato, and the full choir with the theme | Longer than 6 minutes, and the theme with the choir comes after 5 minutes |

The chosen excerpt starts after the fanfare, with the words "O friends, not these sounds! Let us
sing more pleasant and more joyful ones." It ends with the fermata of "vor Gott!". The first
note sounds at 1.5 s, because the baritone enters on beat 3.

The group map puts the four soloists in one group and the choir in another, so the stage shows
two choir seats of 8 singers. The excerpt has no trombones and no percussion.

## Candidates

### Chosen

| Piece | Sections ("Auto") | Stage | Length | Loudness at 0 dB | Reason |
|---|---|---|---|---|---|
| Beethoven 9, bars 216 to 330 | flute, oboe, clarinet, bassoon, horn, trumpet, timpani, choir (2), violin (2), viola, cello, contrabass | 11.18 m, one riser level | 193.119 s | -14.1 LUFS | The user asked for it |
| Mozart K. 525, mvt 1 | violin (2), viola, cello | 6.71 m | 248.636 s | -29.1 LUFS | The best-known cheerful piece for strings, an unchanged Mutopia download |
| Bach BWV 1048, mvt 1 | piano (the harpsichord), violin (3), viola, cello, contrabass | 10.43 m | 327.297 s | -19.3 LUFS | Bright and well known, a keyboard on the stage, a composer that the list did not have |
| Beethoven 8, mvt 2 | flute, oboe, clarinet, bassoon, horn, violin (2), viola, cello, contrabass | 9.91 m | 220.225 s | -21.1 LUFS | Light and humorous, a woodwind texture that no other demo has |

- No part lands on a wrong section, and no file has a sound-only seat. Each first track has a
  generic name, so the title comes from the demo list.
- Eine kleine Nachtmusik has no contrabass part and no ensemble program, so it is not an
  orchestral file (design 3.8). "Auto" gives one player for each simultaneous note: 3, 3, 2,
  and 1 (9 players). The setting "Full" gives the full sections.
- The Bach score has three parts each of violins, violas, and cellos. With nine string groups,
  the stage side was 20.71 m, because the layout makes a large stage for a third seat of the
  violas and the cellos. With one group for the violas and one for the cellos, it is 10.43 m.
  The three violin parts keep three seats.
- The MuseScore pipeline gave 0 missed attacks, 0 extra attacks, 0 notes with a wrong program,
  and 0 s of lost sound for each OpenScore file. Two runs gave byte-identical files.
- The Bach demo has the shortest count-in of the demos: 1.5 s (a beat of 0.3 s). The slowest
  lift is 1.55 s, so its lifts scale by 0.935 at the speed 1 (design 5.2). The count-in of the
  Boulanger demo (1.617 s) still holds the slowest lift.
- The conductor cues: Beethoven 9 30 (9.3 each minute), Beethoven 8 34 (9.3), Eine kleine
  Nachtmusik 23 (5.6), and Bach 2 (0.4). The Bach texture has no rests, so most moments get no
  cue.

### Rejected

| Piece | Source | License | Measure | Reason |
|---|---|---|---|---|
| Vivaldi, Spring, mvt 1 | Mutopia 301 | CC BY-SA 3.0 | not measured | 8.1 forbids CC BY-SA |
| Mozart, Horn Concertos 1, 3, 4 | Mutopia 918, 1735, 1736 | CC BY-SA | not measured | 8.1 forbids CC BY-SA |
| Strauss, Radetzky March; Rossini, William Tell; Grieg, Morning Mood; Tchaikovsky, Nutcracker; Handel, Arrival of the Queen of Sheba, Hornpipe | none found | none | not measured | No file or score with a permitted license in Mutopia, OpenScore Orchestra, or Wikimedia Commons. Mutopia 1864 (Royal Fireworks) is for trumpet and organ |
| Mozart, Horn Concerto No. 2, mvt 3 | Mutopia 901 | Public Domain | 3:23, 19 players, clean programs | Good alternate. The same look as K. 315 (oboes, horns, strings), and a third Mozart piece |
| Mozart, Bassoon Concerto, mvt 3 | Mutopia 686 | Public Domain | 3:44, 20 players | The same look as K. 315, and a third Mozart piece |
| Mozart, Symphony No. 18, K. 130, mvt 1 | Mutopia 346 | Public Domain | 4:16, 20 players | Less known, the same look as K. 315 |
| Mozart, A Musical Joke, mvt 1 | Mutopia 553 | Public Domain | 2:58, 15 players | The horn track has program 61 and divides into horn and trumpet seats, and the violin tracks have the viola program (3.5). The piece plays wrong notes on purpose |
| Mozart, Haffner Serenade, K. 250 | Mutopia 1952 | Public Domain | movements of 1:04 to 11:11 | The horn tracks have program 69 (the LilyPond trap of `midi-sources.md`), and the cheerful Rondo takes 8:14 |
| Beethoven, Fidelio Overture | Mutopia 377 | Public Domain | 5:35, 44 players | The strings use program 48, so the viola and cello tracks divide into violin seats (3.5). A patch of the track would also remove the pizzicato |
| Grieg, Anitra's Dance | Mutopia 281 | Public Domain | 1:43, 51 players, stage 26.19 m | Too short. Each pizzicato track divides into seats of several sections |
| Mozart, Eine kleine Nachtmusik, mvt 1 (quartet edition) | Mutopia 900 | Public Domain | 5:19 with the repeats | The same parts as 2230, which is shorter and newer (2018) |
| Beethoven, Symphony No. 1, mvt 4 | OpenScore | CC0 | 4:54, 29 players, trumpets, timpani | Good alternate. A third Beethoven piece, and the same look as the Ode to Joy |
| Beethoven, Symphony No. 2, mvt 3 | OpenScore | CC0 | 3:34, 29 players | The same reasons as Symphony No. 1 |
| Beethoven, Symphony No. 6, mvt 3 | OpenScore | CC0 | 4:49, 28 players | It goes on into the storm of mvt 4 with no close |
| Beethoven, Symphony No. 7, mvt 4 | OpenScore | CC0 | 8:54 with the repeat | Too long |
| Schubert, Symphony No. 5, mvt 1 | OpenScore | CC0 | the export gave 13:14 | Not examined further |
| Bach, Brandenburg Concerto No. 4, mvt 3 | OpenScore | CC0 | not exported | Its parts had no MIDI mapping before the fix of `remap_score.py`, and Brandenburg No. 3 was chosen |

## Findings for the app

- **Hidden heads.** In the Beethoven 9 demo, the two hippos of the contrabasses sit in the back
  row in front of the risers. With the lowest riser level at 0.25 m, they hid 100.0%, 91.2%,
  37.8%, and 20.3% of the heads of four penguins (`scene/hidden-heads.test.ts`). A level of
  0.5 m still gave 45.2%, and 0.75 m 16.6%. At 1.0 m, no large species hides 5% of a head,
  in this file or in the choir test file, and the stage sides do not change. Risers 1.2 m
  farther back also passed, but the stage grew by 1.2 m. Design 4.5 now raises the lowest level
  to 1.0 m.
- **Loudness.** The gains to -18 LUFS are Beethoven 9 -3.9 dB, Eine kleine Nachtmusik +11.1 dB,
  Bach +1.3 dB, and Beethoven 8 +3.1 dB. With these gains, the limiter model gives the peaks
  after the trim:

  | Demo | Peak before the limiter | Gain reduction at most | Peak after the trim | Loudness |
  |---|---|---|---|---|
  | Beethoven 9 | -1.17 dBFS | 0.75 dB | -1.89 dBFS | -17.6 LUFS |
  | Eine kleine Nachtmusik | -0.52 dBFS | 1.36 dB | -1.84 dBFS | -18.0 LUFS |
  | Bach | -1.38 dBFS | 0.58 dB | -1.93 dBFS | -18.0 LUFS |
  | Beethoven 8 | -0.97 dBFS | 0.97 dB | -1.88 dBFS | -18.0 LUFS |

  The limiter acts on the Beethoven 9 demo at 0 dB (4.43 dB at most), so the measured loudness
  at 0 dB is lower than the loudness without it. With the gain -3.9 dB, the demo thus plays at
  -17.6 LUFS. The method of `DEMO_LOUDNESS` is the same as for the Boulanger demo.
- **Memory.** The six demos and the choir test file hold 22 presets in 76,151,826 B of PCM in one
  session, against 93.8 MB before (design 6.3). The largest demo is still the Boulanger demo
  (62,174,356 B, 17 files, 9,358,224 B).
- **First download.** The default demo did not change, so the first download does not change.

## Files

The scratch folder of this session holds the downloads, the exports, and the renders. The
repository does not hold them:

```text
/private/tmp/claude-501/-Users-xueqiaoxu-proj-zoophony/efc958e3-10bb-44bb-9904-333a6adbb4d7/scratchpad/cheerful/
  mut/<piece id>/       the Mutopia MIDI files
  os/<key>.mscz         the OpenScore scores of commit 8f677853
  out/                  the exports and the excerpts
  wav/                  the full renders, at 0 dB and with the gain of each piece
```
