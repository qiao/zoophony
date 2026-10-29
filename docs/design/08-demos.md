# 8. Demos

## 8.1 License rules

- The composition must be in the public domain.
- The MIDI file or the score must also have its own clear license: public domain, CC0, or CC BY
  with a credit line in the app. A MIDI sequence of a public domain composition can still belong
  to the person who made the sequence.
- A score on musescore.com is "all rights reserved" unless its page shows a different license.
- The Mutopia Project has pieces with public domain, CC BY, and CC BY-SA licenses. Use only the
  public domain and CC BY pieces.
- OpenScore scores are CC0, but their annotations are CC BY-SA and are stored as lyrics. Remove
  the lyrics before the repository gets the file.
- The credits dialog lists the source of each demo, also when the license does not require a
  credit.
- A MIDI file whose music is under copyright stays out of the repository, also as a test input.
- The demo list holds only positive and cheerful pieces. The list has no dark, negative, or
  depressive piece.

The candidates and their licenses are in [`research/midi-sources.md`](../research/midi-sources.md)
and, for the demos of the user decision of 2026-10-05 (8.2), in
[`research/cheerful-demos.md`](../research/cheerful-demos.md). The candidates of the Ode to Joy
excerpt of 2026-10-06 are in
[`research/2026-10-06-joyful-ode.md`](../research/2026-10-06-joyful-ode.md).

## 8.2 List

| # | Hash id | Piece | Source | License | Length | What it shows |
|---|---|---|---|---|---|---|
| 1 | `boulanger-matin` | Boulanger, D'un matin de printemps | OpenScore | CC0 | 4:40 | Percussion, harp, celesta, trombones, tuba |
| 2 | `beethoven-9` | Beethoven, Symphony 9, finale, bars 543 to 590 and 851 to 940 ("Ode to Joy") | OpenScore | CC0 | 2:38 | Choir on the risers, full orchestra, trumpets, trombones, timpani, percussion |
| 3 | `mozart-k525` | Mozart, Eine kleine Nachtmusik, mvt 1 | Mutopia 2230 | public domain | 4:08 | Four string parts with one player for each note (9 players) |
| 4 | `bach-bwv1048` | Bach, Brandenburg Concerto 3, mvt 1 | OpenScore | CC0 | 5:27 | Three violin seats, string orchestra, harpsichord |
| 5 | `beethoven-8` | Beethoven, Symphony 8, mvt 2 | OpenScore | CC0 | 3:40 | Woodwinds and horns with the strings |
| 6 | `mozart-k315` | Mozart, Andante K. 315 | Mutopia 344 | public domain | 4:15 | Solo flute |
| 7 | `beethoven-1` | Beethoven, Symphony 1, mvt 4 | OpenScore | CC0 | 4:54 | Classical symphony finale with cheerful allegro molto, full classical woodwinds, brass, and timpani |
| 8 | `brahms-2` | Brahms, Symphony 2, mvt 4 | OpenScore | CC0 | 12:32 | Exuberant sunny finale with full romantic brass, woodwinds, and strings |
| 9 | `beethoven-8-4` | Beethoven, Symphony 8, mvt 4 | OpenScore | CC0 | 11:58 | Energetic vivace finale, full orchestra |
| 10 | `bach-bwv1047` | Bach, Brandenburg Concerto 2, mvt 1 | Mutopia 1680 | public domain | 4:37 | Solo trumpet, recorder (flute), oboe, violin, strings, harpsichord |
| 11 | `bach-bwv1050` | Bach, Brandenburg Concerto 5, mvt 3 | Mutopia 548 | public domain | 5:10 | Buoyant Italian gigue, solo flute, violin, harpsichord |
| 12 | `mendelssohn-op61` | Mendelssohn, A Midsummer Night's Dream, Op. 61: V | Mutopia 80 | public domain | 2:28 | Fairy dance, enchanted woodwinds and strings |
| 13 | `mozart-k417` | Mozart, Horn Concerto 2, mvt 3 | Mutopia 901 | public domain | 3:23 | Joyful hunting rondo for horns, oboes, and strings |
| 14 | `mozart-k191` | Mozart, Bassoon Concerto, mvt 3 | Mutopia 686 | public domain | 3:44 | Charming playful rondo, solo bassoon, oboes, horns, strings |

- The length is `durationSec` (the last note-off), shown as `Math.floor(durationSec + 0.001)`
  seconds. For example, K. 315 ends at 254.9998 s, because the file rounds a tempo of 46 to
  1,304,347 µs for each quarter note. It shows as 4:15.
- The rule for the length was 2 to 5 minutes. Row 4 is an accepted exception. Until 2026-10-05,
  the exceptions were the Beethoven 5 demo (5:16) and the Mozart K. 488 demo (7:01).
- Demo 1 is the default demo (`DEFAULT_DEMO` in `app/demos.ts`). The first screen shows it
  (2.2), and it is part of the first download (7.2). Until 2026-10-05, the Beethoven demo was
  demo 1 (user decision, 2.2). All demos use the section size "Auto".
- Until 2026-10-05, the list had a sixth demo: Handel, Messiah, Hallelujah (`handel-hallelujah`,
  Mutopia 459, 3:08), with a choir, trumpets, and timpani. The user removed it from the app
  (user decision of 2026-10-05). The app keeps the choir, because a file of the user can have
  one. `choirFile()` of `models/test-choir.ts` is the test input of the choir and its risers.
- **User decision of 2026-10-05:** "Add Ode to Joy to the list. Also replace all music that is
  dark, negative or depressive with positive and cheerful pieces." Three demos left the list:
  Beethoven, Symphony 5, mvt 1 (`beethoven-5`, Mutopia 941, 5:16), Grieg, Åse's Death
  (`grieg-ase`, Mutopia 247, 3:36), and Mozart, Piano Concerto 23, mvt 2 (`mozart-k488`,
  Mutopia 2229, 7:01). Rows 2 to 5 replaced them. The Boulanger and K. 315 demos stay, because
  they are bright and calm. [`research/cheerful-demos.md`](../research/cheerful-demos.md) gives
  the candidates, the measures, and the reasons for the choice.
- The Beethoven 9 demo is an excerpt of two parts of the finale (8.4): the full choir sings the
  theme "Freude, schöner Götterfunken" with the full orchestra from the first note (bars 543 to
  590), then the Prestissimo coda plays to the end of the symphony (bars 851 to 940). Both
  parts are in D major.
- **User request of 2026-10-06:** "find another version of ode to joy that's more traditional
  and joyful". Until then, the excerpt was bars 216 to 330 (3:13): the baritone recitative
  "O Freunde, nicht diese Töne!", the theme with the baritone at 56.6 s, the soloists and the
  choir, and the end of "vor Gott!" on F major. Its loudness range was 21.7 LU, and the choir
  sang in 30% of the time. The new excerpt has a loudness range of 3.1 LU, and the choir sings
  in 82% of the time. It has no vocal soloists (3.8). An excerpt with the four soloists starts
  with a quiet baritone solo and is longer than 4 minutes, so the excerpt has no soloists. No
  Mutopia or Wikimedia Commons file with a permitted license has the full orchestra and the choir.
  The first part ends after bar 590 with the D major chords, because bars 591 to 594 turn to
  G major.
  [`research/2026-10-06-joyful-ode.md`](../research/2026-10-06-joyful-ode.md) gives the
  candidates, the measures, and the reasons for the choice.
- Some measures of the Beethoven 9 demo in 5.4 (the count-in and the cues) and 9.7 (the
  preset files) are for the excerpt until 2026-10-06. With the new excerpt, the preset files
  are 14 files of 7.55 MB. 3.8, 5.6 (the shot statistics and the choir shots), and 6.8 give the values
  of the new excerpt.
- Eine kleine Nachtmusik has no contrabass part and no ensemble program, so it is not an
  orchestral file (3.8), and "Auto" gives one player for each note. The setting "Full" gives
  the full sections.

**Texts**

| Hash id | Title | Composer | Credit line |
|---|---|---|---|
| `boulanger-matin` | D'un matin de printemps | Lili Boulanger | Score: OpenScore Orchestra, CC0. MIDI file made with MuseScore 4. |
| `beethoven-9` | Symphony No. 9, Op. 125: Ode to Joy | Ludwig van Beethoven | Score: OpenScore Orchestra, CC0. Bars 543 to 590 and 851 to 940 of the finale. MIDI file made with MuseScore 4. |
| `mozart-k525` | Eine kleine Nachtmusik, K. 525: I | Wolfgang Amadeus Mozart | Score: Mutopia Project, piece 2230, public domain. Typeset by Mike Blackstock. |
| `bach-bwv1048` | Brandenburg Concerto No. 3, BWV 1048: I | Johann Sebastian Bach | Score: OpenScore Orchestra, CC0. MIDI file made with MuseScore 4. |
| `beethoven-8` | Symphony No. 8, Op. 93: II | Ludwig van Beethoven | Score: OpenScore Orchestra, CC0. MIDI file made with MuseScore 4. |
| `mozart-k315` | Andante in C, K. 315 | Wolfgang Amadeus Mozart | Score: Mutopia Project, piece 344, public domain. Typeset by Maurizio Tomasi. |
| `beethoven-1` | Symphony No. 1, Op. 21: IV | Ludwig van Beethoven | Score: OpenScore Orchestra, CC0. MIDI file made with MuseScore 4. |
| `brahms-2` | Symphony No. 2, Op. 73: IV | Johannes Brahms | Score: OpenScore Orchestra, CC0. MIDI file made with MuseScore 4. |
| `beethoven-8-4` | Symphony No. 8, Op. 93: IV | Ludwig van Beethoven | Score: OpenScore Orchestra, CC0. MIDI file made with MuseScore 4. |
| `bach-bwv1047` | Brandenburg Concerto No. 2, BWV 1047: I | Johann Sebastian Bach | Score: Mutopia Project, piece 1680, public domain. Typeset by Allen Garvin. |
| `bach-bwv1050` | Brandenburg Concerto No. 5, BWV 1050: III | Johann Sebastian Bach | Score: Mutopia Project, piece 548, public domain. Typeset by Eric van der Velden. |
| `mendelssohn-op61` | A Midsummer Night's Dream, Op. 61: V | Felix Mendelssohn | Score: Mutopia Project, piece 80, public domain. Typeset by Aaron Gage. |
| `mozart-k417` | Horn Concerto No. 2, K. 417: III | Wolfgang Amadeus Mozart | Score: Mutopia Project, piece 901, public domain. Typeset by Maurizio Tomasi. |
| `mozart-k191` | Bassoon Concerto, K. 191: III | Wolfgang Amadeus Mozart | Score: Mutopia Project, piece 686, public domain. Typeset by Maurizio Tomasi. |

- Each title has one pattern: "{work}, {catalogue number}: {movement}", with the movement as a
  Roman number or the name of the excerpt. The title at the top left and the row of the demo
  list show the same text (audit 2026-10-05-ux-design, CP2). Until 2026-10-06, the list had
  shorter titles, and the titles mixed "mvt 1" and "first movement".

For a dropped file, the title is `Score.sequenceName` if it is not ''. Else the title is the
file name with no extension. `score/` gives '' for a name with no letter and for a generic name
(`titleSequenceName()` in `score/sequence-name.ts`). The generic names, in any case, are
"control track" (LilyPond writes it), "conductor" (MuseScore writes it), "untitled",
"sequence", and "track" with a number, with or without one space before the number. The first
track of each demo has a generic name. With a sequence name, the second line shows the file
name. With no usable sequence name, the second line is empty, so that the page does not show the
name two times, as "drums-only" above "drums-only.mid" (audit 2026-10-05-ux-design, LE3). A
dropped file has no credit line.

**Expected sections**

| Hash id | Sections (the number of seats, if more than one) |
|---|---|
| `boulanger-matin` | flute, oboe, clarinet, bassoon, horn, trumpet, trombone, tuba, piano (the celesta), percussion, harp, violin (2), viola, cello, contrabass |
| `beethoven-9` | flute, oboe, clarinet, bassoon, horn, trumpet, trombone, timpani, percussion (the triangle, the cymbals, and the bass drum), choir, violin (2), viola, cello, contrabass |
| `mozart-k525` | violin (2), viola, cello |
| `bach-bwv1048` | piano (the harpsichord), violin (3), viola, cello, contrabass |
| `beethoven-8` | flute, oboe, clarinet, bassoon, horn, violin (2), viola, cello, contrabass |
| `mozart-k315` | flute, oboe, horn, violin (2), viola, cello |
| `beethoven-1` | flute, oboe, clarinet, bassoon, horn, trumpet, timpani, violin (2), viola, cello, contrabass |
| `brahms-2` | flute, oboe, clarinet, bassoon, horn, trumpet, trombone, tuba, timpani, violin (2), viola, cello, contrabass |
| `beethoven-8-4` | flute, oboe, clarinet, bassoon, horn, trumpet, timpani, violin (2), viola, cello, contrabass |
| `bach-bwv1047` | flute, oboe, trumpet, piano (the harpsichord), violin (3), viola, cello |
| `bach-bwv1050` | flute, piano (the harpsichord), violin (2), viola, cello, contrabass |
| `mendelssohn-op61` | flute, oboe, clarinet, bassoon, horn, violin (2), viola, cello, contrabass |
| `mozart-k417` | oboe, horn (2), violin (2), viola, cello |
| `mozart-k191` | oboe, bassoon, horn, violin (2), viola, cello |

## 8.3 Changes to the files

A demo file with wrong programs gets a repair at build time. `demos/patches.json` holds the
program changes: in `src/bach-bwv1047.mid` (Mutopia 1680), track 8 (cello / violone) has program 40
(violin), changed to 42 (cello), and track 9 (continuo) has program 0 (piano), changed to 6
(harpsichord) for Baroque continuo.

Until the user decision of 2026-10-05 (8.2), the Beethoven 5 demo had one: its horn track (5)
and its trumpet track (6) used program 69 (English horn), and they changed to 60 and 56. Each
change names a track by its index. A change by program could not work there: the horn track and
the trumpet track had the same program 69, and they needed different programs. The MuseScore
pipeline of the OpenScore files (8.4) gives each group its program, so these files need no
change.

- `demos/src/` holds the input files. The two Mutopia files are unchanged downloads.
- `demos/patches.json` holds the changes. `demos/README.md` gives the reason for each one, the
  sources, the licenses, the typesetters, and the SHA-256 of each file.
- A build script writes the changed files. A Vitest test checks the programs in each result.
- `tools/patch-demos.ts` checks the SHA-256 of each file in `demos/src/` against
  `demos/README.md`. Then it applies the changes, and writes each file into `public/demos/`,
  which Git ignores. `pnpm dev` and `pnpm build` run it first. Thus the site holds each demo at
  `demos/<file>`, as 7.2 gives for the default demo.
- The build then gzips each demo file of `dist/demos/` in place, with the same name, because
  GitHub Pages sends a MIDI file with no gzip (7.2). The app, the animal views, and the spike
  page fetch a demo with `fetchPlainBytes()` of `audio/plain-bytes.ts`, which removes the gzip
  layer. `public/demos/` and the dev server keep the plain files.
- The demo tests (8.5) apply the same changes in memory, so they do not need a build.

```typescript
interface DemoPatch {
  /** File name in demos/src/. */
  file: string;
  /** Sets the program of all program changes in one track. The index starts at 0. */
  setProgram: { track: number; program: number }[];
}
```

## 8.4 The OpenScore files

The default MuseScore export of this score is not usable:

- It ignores the "pizz." and "arco" marks. Only 92 of about 499 pizzicato notes play pizzicato.
- One viola part plays 1471 of its 1473 notes as Tremolo Strings.
- Each solo and divisi staff is a separate part. With the port rule, each becomes a seat with a
  base section size, which gives about 72 players. The cap is 60.
- It writes the CC BY-SA annotations as lyric events.

A pipeline makes a 16-channel file instead
([`research/musescore-export.md`](../research/musescore-export.md)):

```text
score with the lyrics removed (CC0 only)
   │ remap_score.py unique    each part on its own port, articulation k on channel k
   v
   │ add_switches.py          channel switches at the "pizz." and "arco" marks
   v
   │ mscore -o out.mid        MuseScore 4 CLI (the pipeline checks the output file)
   v
   │ remap_midi.py            one channel for each section group, program changes at switches
   v
the 16-channel demo file
```

- One channel for each section group: Violin 1 with its divisi and solo parts, Violin 2 with its
  parts, and so on. The divisi staves thus become one seat with divisi (3.8), as a real section
  does. There are 15 melodic channels, and channel 10 has the Orchestral kit (kit 48).
- Each part uses the program of its group. For example, the piccolo plays as a flute and the
  English horn plays as an oboe.
- The check of the result: 12,139 note attacks, 0 missed, and 0 s of lost sound. 15 notes have
  the wrong program. Unisons between parts become one note. CC 2 is removed, and the velocity
  keeps the dynamics.
- The MuseScore CLI crashes after it writes the file in most runs (exit code 134). Thus the
  pipeline checks the output file and ignores the exit code.

The repository holds these files:

- `demos/boulanger/matin-nolyrics.mscz`: the score with all lyrics removed (CC0 only).
- `tools/musescore/`: the pipeline scripts (Python, standard library only), with the fix of
  `remap_midi.py` that `demos/README.md` describes. The copies in
  `docs/research/scripts/musescore/` are the record of the first version.
- `demos/src/boulanger-matin.mid`: the result.

`demos/README.md` gives the pipeline as commands. A run from the committed score gives a
byte-identical file. CI does not run MuseScore.

The Beethoven 9, Bach, and Beethoven 8 demos (8.2) come from the same pipeline:

- Each score has a group map in `demos/groups/`, which the scripts read with `--groups`. The
  pipeline removes all lyrics first, so the annotations of the instrumental scores do not enter
  it. The result files hold no text of the scores. A group map can put the low strings on the
  channels 11 to 13, so that no melodic group falls on the percussion channel 10.
- The repository does not hold these scores. `demos/README.md` gives the commit of the
  Hauptstimme repository, the SHA-256 of each score, and the commands.
- The Beethoven 9 demo is an excerpt. `tools/musescore/cut_midi.py` keeps bars 543 to 590 and
  851 to 940 of the finale (ticks 880,800 to 949,920 and 1,610,880 to 1,781,760), one after the
  other. Each part starts with the tempo, the programs, and the controllers that apply at its
  start. The four soloists have one channel and the choir another. The excerpt has no note of
  the soloists, so the stage has one choir seat. Until 2026-10-06, the excerpt was bars 216 to
  330 (ticks 364,800 to 575,520), with two choir seats.
- The three viola parts and the three cello parts of the Bach score each form one group. Nine
  string groups gave a stage side of 20.71 m, and seven give 10.43 m.

## 8.5 Demo tests

A Vitest test builds the `Score` of each demo, after the changes of 8.3, and checks three
things:

- The demo has no more than 60 players.
- The sections and the seat counts are exactly those of the table "Expected sections" (8.2).
- No seat comes from a wrong program: there is no seat in another section, and no sound-only
  seat.
