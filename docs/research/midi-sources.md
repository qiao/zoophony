# MIDI research for a General MIDI orchestral player

Date of research: 2026-10-04.

This report has two parts:

1. Demo MIDI files that have a clear license.
2. General MIDI (GM1, GM2) and Roland GS facts for drums and default programs.

Each fact has a source URL. "Not verified" means that I could not confirm the
fact in a primary source.

Scratch files from this research:

- MIDI files: `/private/tmp/claude-501/-Users-xueqiaoxu-proj-orchestra/8f5d6b3a-d5e3-4e28-bb0b-02e93303b98e/scratchpad/midi/`
- MIDI analysis script: `.../scratchpad/midinfo.py` (Python 3, no dependencies)
- MuseScore file analysis script: `.../scratchpad/mscxinfo.py`
- OpenScore `.mscz` samples: `.../scratchpad/mscz/`
- Spec PDFs and text: `.../scratchpad/specs/`

---

## Key findings

- **Mutopia Project is the best source for direct MIDI downloads.** Each
  piece has one license. Many orchestral pieces are "Public Domain" (a
  dedication by the typesetter). The MIDI file comes from the same LilyPond
  source as the score.
- **OpenScore Orchestra is CC0, but it has no MIDI files.** You must export
  MIDI from the `.mscz` files with MuseScore. The `.mscz` files also hold
  Hauptstimme annotations as lyrics. The annotations are CC BY-SA.
- **IMSLP does not accept MIDI of standard repertoire.** Wikimedia Commons
  has few full orchestral MIDI files, and some have an unclear sequence
  license. Musopen does not offer MIDI (not verified, site blocked).
- **LilyPond MIDI files have traps.** Some Mutopia files give horns and
  trumpets the English Horn program (69). One file puts a pitched "c" drum
  part on channel 10. One file shares channel 1 between two instruments.
- **GM2 and GS put timpani on keys 41 to 53 of the Orchestra set.** Key 49
  is "Timpani c#" there, not a crash cymbal. A GM1 crash on key 49 changes
  to a timpani note if the player selects the Orchestra set.
- **Program 0 is the default.** The GM2 spec makes program 1 (data 00H) the
  initial value. The GM1 Developer Guidelines reset program change to "0" on
  GM System On.

---

## Part 1: Demo MIDI files with a clear license

### 1.1 Two layers of rights

A public domain composition does not make a MIDI sequence public domain.
The person who made the sequence or the typeset edition can hold rights in
that work. Thus you must check the license of the file, or of the source
score that you export the file from.

```text
+----------------------------+
| Composition (Beethoven)    |  public domain (old work)
+-------------+--------------+
              |
              v
+----------------------------+
| Edition / typeset score    |  license set by the typesetter
| (LilyPond .ly, MuseScore)  |  (Mutopia: PD or CC; OpenScore: CC0)
+-------------+--------------+
              | generate or export
              v
+----------------------------+
| MIDI sequence (.mid)       |  must have a clear license of its own,
|                            |  or inherit the license of its source
+----------------------------+
```

### 1.2 Source by source

#### Mutopia Project

- Mutopia uses three license types: CC BY-SA (4.0, 3.0, 2.5, 2.0, 1.0),
  CC BY (4.0, 3.0, 2.5), and Public Domain. Source:
  https://www.mutopiaproject.org/legal.html
- Text for Public Domain: "The contributor of this music has dedicated their
  contribution into the public domain. You can do what you like with this
  music - print it out, sell it, change it, distribute it, record it, and
  perform it, etc." Source: https://www.mutopiaproject.org/legal.html
- Text for CC BY: "You must, however, give the original author credit."
  Source: https://www.mutopiaproject.org/legal.html
- Each piece page shows one "Copyright" field and the download links (MIDI,
  PDF, LilyPond). The legal page does not say that MIDI has a different
  license. Example: https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=547
- The LilyPond sources of the PD pieces that I checked hold
  `license = "Public Domain"` and the footer text "Placed in the public domain
  by the typesetter, free to distribute, modify, and perform". I checked
  Egmont, Dies irae, Åse's Death, K. 488, K. 315, Symphony 5 mvt 1, and
  the Midsummer Night's Dream No. 5 sources (`-lys.zip` files on each piece
  page).
- The orchestra listing has 67 pieces. Source:
  https://www.mutopiaproject.org/cgibin/make-table.cgi?Instrument=Orchestra
- **Do not use (CC BY-SA):** Bach Air BWV 1068 (id 242), Bach BWV 1055 (id
  2050), Bach BWV 36b (id 2145), Beethoven Eroica (id 1655), Dvořák
  Symphony 9 (id 1793), Mozart Horn Concertos 1, 3, 4 (ids 918, 1735, 1736),
  Vivaldi Four Seasons (ids 301, 336, 350), Porpora Semiramide (id 1365).
  Source: the two listings above and
  https://www.mutopiaproject.org/cgibin/make-table.cgi?Instrument=String
- **CC BY options (credit line needed):** Handel Messiah complete (id 1732,
  CC BY 3.0), Lully and Rameau stage works (for example ids 765, 935, 1363,
  CC BY 2.5 or 3.0). Source: same orchestra listing.
- **Trap:** the Mutopia Clarinet Concerto K. 622 (id 1635) has "Orchestral
  parts only". It has no solo clarinet. Source:
  https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1635
- **Trap:** the K. 488 third movement MIDI file is a 526-byte stub with no
  notes (my analysis of `MozartWA-KV488-midi-3-presto.mid`).

#### OpenScore

- OpenScore editions use CC0: "We have decided to license OpenScore editions
  under CC0." Source:
  https://musescore.org/en/user/57401/blog/2017/01/11/introducing-openscore
- There are three corpora: Lieder (c. 1,500 songs), String Quartets
  (c. 700 movements), Orchestral works (c. 100 movements). The orchestral
  corpus is on GitHub only (Hauptstimme repo). Source:
  https://fourscoreandmore.org/openscore/
- OpenScore Orchestra license: "Scores: CC0 1.0 Universal; Annotations:
  CC-By-SA; Code: MIT". Source:
  https://github.com/MarkGotham/Hauptstimme (README) and
  https://zenodo.org/records/15425749
- The corpus contents: Bach (B minor Mass, Brandenburg 3 and 4), Amy Beach
  (Gaelic Symphony), Beethoven (Symphonies 1 to 9), Lili Boulanger (D'un
  matin de printemps), Brahms (Symphonies 1 to 4, Requiem mvt 1), Bruckner 5,
  Haydn 104 mvt 1, Schubert 5 mvt 1. Source:
  https://github.com/MarkGotham/Hauptstimme
- The repo holds `.mscz`, `.mxl`, and `.csv` files. It holds no `.mid` files
  (my listing of the full Git tree through the GitHub API).
- Each `.mscz` file has the meta tag
  `copyright = "Score: CC0 1.0 Universal; Annotations: CC-By-SA"` (my
  analysis of 9 files).
- **Trap:** the annotations are stored as lyrics (or as staff text when lyrics
  exist). Source:
  https://github.com/MarkGotham/Hauptstimme/blob/main/docs/annotation.md
  If MuseScore writes lyrics into the MIDI file, the export can carry CC BY-SA
  text. Whether MuseScore exports lyrics to MIDI: not verified. Safe action:
  delete the lyrics before export, or export from the clean source score.
- MuseScore CLI export: `mscore -o 'My Score.mid' 'My Score.mscz'`. Source:
  https://handbook.musescore.org/appendix/command-line-usage
- MuseScore is not installed on this machine, so I did not export or analyze
  OpenScore MIDI. Channel and program data for OpenScore exports: not verified.
- MuseScore instrument data in the `.mscz` files (my analysis): horns use
  program 60, trumpets 56, timpani 47, strings 40 to 43, choir 52. The
  Boulanger cymbal, tambourine, and triangle are drumset instruments
  (`useDrumset=1`).

#### IMSLP

- IMSLP recommends CC0, CC BY, and CC BY-SA. Non-Commercial licenses are
  deprecated and need special approval. "No Derivatives" licenses are not
  allowed for new uploads. Source:
  https://imslp.org/wiki/IMSLP:Licensing_Policy_and_Guidelines
- "MIDI (.MID) file versions of works are acceptable, provided they are of
  new compositions or arrangements uploaded with the corresponding scores."
  "MIDI files of standard-repertoire items like Beethoven symphonies are not
  allowed." Source: https://imslp.org/wiki/IMSLP:Performers_Portal
- IMSLP shows a bot check to scripts (curl), so batch download is not
  practical (my test).
- A third-party dataset lists 1,113 IMSLP MIDI files filtered to public
  domain and CC0. It is a lead only, not a primary source. Each file license
  must be checked on IMSLP. Source:
  https://huggingface.co/datasets/TiMauzi/imslp-midi-cc0-1.0

#### Musopen

- musopen.org returned HTTP 403 to my requests. I found no MIDI downloads.
  Musopen MIDI: not verified.
- Wikipedia says Musopen offers recordings and sheet music, with a limit of
  5 free downloads each day. It does not mention MIDI. Source:
  https://en.wikipedia.org/wiki/Musopen

#### Wikimedia Commons

- MIDI files of classical music are in
  https://commons.wikimedia.org/wiki/Category:MIDI_files_of_classical_music
  Most files are short examples (under 5 KB).
- **Trap:** `File:Sym 9 First Movement.mid` (and its 3 siblings) uses the
  `{{PD-old}}` tag with Author = Beethoven and no source. PD-old covers the
  composition, not the sequence. The sequence license is unclear. Do not use.
  Source: https://commons.wikimedia.org/wiki/File:Sym_9_First_Movement.mid
- `File:Grieg, Holberg Suite, No. 1.mid` is CC0 ("own work"), but it is a
  piano capture, not strings. Source:
  https://commons.wikimedia.org/wiki/File:Grieg,_Holberg_Suite,_No._1.mid
- I found no full orchestral MIDI on Commons with a clear PD, CC0, or CC BY
  sequence license.

### 1.3 Candidate list

All 12 candidates are public domain (Mutopia PD dedication) or CC0
(OpenScore). No credit line is required by these licenses.

Each candidate record has this shape:

```typescript
export interface DemoPiece {
  title: string;
  composer: string;
  /** Piece page (Mutopia) or .mscz file (OpenScore) */
  sourceUrl: string;
  /** Exact license of the score or file */
  license: 'Public Domain (Mutopia dedication)' | 'CC0 1.0';
  /** 'direct' = .mid link; 'zip' = .mid in a zip; 'export' = MuseScore */
  midi: 'direct' | 'zip' | 'export';
  instrumentation: string;
  /** From the MIDI tempo map, or an estimate for 'export' rows */
  durationApprox: string;
}
```

| # | Piece | Source | License | MIDI | Instrumentation | Duration |
|---|-------|--------|---------|------|-----------------|----------|
| 1 | Beethoven: Symphony No. 5, Op. 67, mvt 1 | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=941 | Public Domain | direct `.mid` | Fl, ob, cl, bn, 2 hn, 2 tpt, timp, strings | 5:16 |
| 2 | Rossini: Eduardo e Cristina, overture | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1634 | Public Domain | direct `.mid` | Picc, fl, ob, cl, bn, hn, tpt, 3 tbn, timp, snare, bass drum, strings | 10:21 (long) |
| 3 | Mozart: Requiem K. 626, Dies irae | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=364 | Public Domain | direct `.mid` | SATB choir, basset horns, bn, tpt, timp, strings, organ | 1:29 |
| 4 | Handel: Messiah, Hallelujah chorus | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=459 | Public Domain | zip | SATB choir, ob, bn, tpt, timp, strings | 3:06 |
| 5 | Grieg: Peer Gynt Suite 1, Åse's Death | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=247 | Public Domain | zip | Strings (vn 1, vn 2, va, vc, db) | 3:31 |
| 6 | Mozart: Eine kleine Nachtmusik K. 525, mvt 1 | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2230 | Public Domain | zip | Strings (vn 1, vn 2, va, vc) | 4:08 |
| 7 | Bach: Brandenburg Concerto No. 3, mvt 1 | https://github.com/MarkGotham/Hauptstimme/blob/main/data/Bach,_Johann_Sebastian/Brandenburg_Concerto_No.3,_BWV.1048/1/Bach_BWV.1048_1.mscz | CC0 1.0 (scores) | export | 3 vn, 3 va, 3 vc, violone, harpsichord | about 5:30 (estimate) |
| 8 | Mozart: Piano Concerto No. 23 K. 488, mvt 2 | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2229 | Public Domain | zip | Piano, fl, cl, bn, hn, strings | 7:00 |
| 9 | Mozart: Andante in C K. 315 (flute and orchestra) | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=344 | Public Domain | zip | Solo flute, 2 ob, 2 hn, strings | 4:14 |
| 10 | Mendelssohn: A Midsummer Night's Dream Op. 61, No. 5 (Allegro appassionato) | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=80 | Public Domain | zip | Fl, ob, cl, bn, hn, strings | 2:28 |
| 11 | Bach: Mass in B minor, No. 4 Gloria in excelsis / Et in terra pax | https://github.com/MarkGotham/Hauptstimme/blob/main/data/Bach,_Johann_Sebastian/B_Minor_Mass,_BWV.232/04/Bach_BWV.232_04.mscz | CC0 1.0 (scores) | export | 5-part choir, 3 tpt, timp, 2 fl, 2 ob, bn, strings, continuo | about 5 min (estimate) |
| 12 | Boulanger: D'un matin de printemps | https://github.com/MarkGotham/Hauptstimme/blob/main/data/Boulanger,_Lili/D'un_matin_de_printemps/D'un_matin_de_printemps.mscz | CC0 1.0 (scores) | export | Picc, 2 fl, 2 ob, Eng hn, 2 cl, bass cl, 2 bn, sarrusophone, 4 hn, 2 tpt, 3 tbn, tuba, cymbal, tambourine, triangle, celesta, harp, strings | about 4:40 (estimate) |

Coverage of the requested needs:

| Need | Candidates |
|------|-----------|
| Full orchestra with brass and timpani | 1, 2, 12 (also 3, 4, 11) |
| String orchestra | 5, 6, 7 |
| Piano with orchestra | 8 |
| Woodwind feature | 9, 10, 12 |
| Choir | 3, 4, 11 |

Notes on the table:

- Instrumentation for Mutopia rows comes from each piece page and from the
  MIDI track instrument names. Instrumentation for OpenScore rows comes from
  the `.mscz` part list (my analysis).
- Durations for Mutopia rows come from the MIDI tempo map (my script).
  LilyPond does not unfold repeats unless the source asks for it.
- Durations for OpenScore rows are estimates from bar count, time signature,
  and the last tempo mark. Repeats are not counted. Not verified by export.
- Row 1 caveat: the horns and trumpets use program 69 (English Horn). See 1.6.
- Row 4 caveat: the four choir tracks use programs 73, 68, 71, 70 (Flute,
  Oboe, Clarinet, Bassoon), not Choir Aahs. See 1.5.
- Row 8: the Mutopia set has movements 1 (10:26) and 2 (7:00). The movement 3
  file has no notes.
- Row 12: Lili Boulanger died on 15 March 1918. Source:
  https://en.wikipedia.org/wiki/Lili_Boulanger (secondary). OpenScore states:
  "All scores have been copied from clearly identified and unequivocally
  public source editions on IMSLP." Source:
  https://github.com/MarkGotham/Hauptstimme

### 1.4 Alternates

| Piece | Source | License | MIDI | Duration | Note |
|-------|--------|---------|------|----------|------|
| Mozart: Magic Flute, No. 9 March of the Priests | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=260 | Public Domain | zip | 1:41 | Fl, basset horns, bn, hn, 3 tbn, strings. No timpani. |
| Schubert: Tantum ergo D. 962 | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1553 | Public Domain | direct | 2:43 | Choir, ob, cl, bn, hn, tpt, timp, tbn, strings |
| Beethoven: Egmont Overture | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=547 | Public Domain | direct | 7:58 | Brass uses program 69 |
| Beethoven: Symphony No. 7, mvt 2 | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=595 | Public Domain | direct | 7:14 | Brass uses program 69 |
| Beethoven: Piano Concerto No. 3, mvt 1 | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=899 | Public Domain | direct | 13:23 | Too long |
| Beethoven: Symphony No. 5, mvt 1 (OpenScore) | https://github.com/MarkGotham/Hauptstimme/blob/main/data/Beethoven,_Ludwig_van/Symphony_No.5,_Op.67/1/Beethoven_Op.67_1.mscz | CC0 1.0 | export | about 4:46 without repeat | Brass has correct programs (60, 56) in the `.mscz` |
| Mozart: Magic Flute Overture | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=248 | Public Domain | zip | 4 section files | Full brass and timpani, but split into sections |

### 1.5 Analysis of the downloaded MIDI files

I downloaded 15 Mutopia files or zips into
`/private/tmp/claude-501/-Users-xueqiaoxu-proj-orchestra/8f5d6b3a-d5e3-4e28-bb0b-02e93303b98e/scratchpad/midi/`.
I analyzed them with `scratchpad/midinfo.py`. Program numbers below are
0-based data values (GM PC# minus 1). Channels are 1-based.

All files are SMF format 1 with 384 ticks per quarter note. Track 1 is a
"control track" with tempo and time signature only. LilyPond sends each
program change twice at tick 0, and writes an Instrument Name meta event
(`FF 04`) with the LilyPond instrument name.

#### Detailed analysis: three files

**`dies_irae.mid`** (Mozart, Dies irae; candidate 3)

| Item | Value |
|------|-------|
| SMF format | 1 |
| Tracks | 17 (1 control, 11 with notes, 4 empty lyric tracks, 1 organ) |
| Channels with notes | 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12 |
| Channel 10 used | No |
| Duration | 1:29 |

| Channel | Track (instrument name) | Program |
|---------|-------------------------|---------|
| 1 | corniDiBassetto (clarinet) | 71 Clarinet |
| 1 | organo (church organ) | 19 Church Organ |
| 2 | fagotti (bassoon) | 70 Bassoon |
| 3 | trombe (trumpet) | 56 Trumpet |
| 4 | timpani | 47 Timpani |
| 5, 6 | violinoA, violinoB | 40 Violin |
| 7 | viola | 41 Viola |
| 8, 9, 11, 12 | soprano, alto, tenore, basso | 52 Choir Aahs |

Channel 1 holds two instruments. Both tracks send a program change on
channel 1 at tick 0. The cause is the LilyPond 16-channel limit: lyric
contexts count toward the limit, and the channel number wraps to 0. Source:
https://lilypond.org/doc/v2.24/Documentation/notation/midi-channel-mapping

**`02-lamortdase-strings/aasesdeath.mid`** (Grieg, Åse's Death; candidate 5)

| Item | Value |
|------|-------|
| SMF format | 1 |
| Tracks | 6 (1 control, 5 strings) |
| Channels with notes | 1, 2, 3, 4, 5 |
| Channel 10 used | No |
| Duration | 3:31 |

| Channel | Track | Program |
|---------|-------|---------|
| 1 | violiniI | 40 Violin |
| 2 | violiniII | 40 Violin |
| 3 | viole | 41 Viola |
| 4 | violoncelli | 42 Cello |
| 5 | contrabassi | 43 Contrabass |

**`Eduardo_e_Cristina.mid`** (Rossini overture; candidate 2)

| Item | Value |
|------|-------|
| SMF format | 1 |
| Tracks | 15 (1 control, 14 instruments) |
| Channels with notes | 2 to 15 (channel 1 is not used) |
| Channel 10 used | Yes: 168 notes, all on key 48, with program 0 |
| Duration | 10:21 |

| Channel | Instrument name | Program |
|---------|-----------------|---------|
| 2 | piccolo | 72 Piccolo |
| 3 | flute | 73 Flute |
| 4 | oboe | 68 Oboe |
| 5 | clarinet | 71 Clarinet |
| 6 | bassoon | 70 Bassoon |
| 7 | french horn | 60 French Horn |
| 8 | trumpet | 56 Trumpet |
| 9, 11 | trombone | 57 Trombone |
| 10 | drums | 0 (drum channel) |
| 12 | timpani | 47 Timpani |
| 13 | violin | 40 Violin |
| 14 | viola | 41 Viola |
| 15 | cello | 42 Cello |

The snare ("Tambour") and bass drum ("Grosse caisse") parts are written as
the pitch `c` in a LilyPond `DrumStaff`. Thus all drum notes are key 48. In
the GM1 map, key 48 is "Hi-Mid Tom", not a snare or a bass drum. (My reading
of `MidiScore.ly`, `Mus/Tamb.lyp`, and `Mus/GC.lyp` in the `-lys.zip`.)

#### Short analysis: other files

| File | Tracks | Channels with notes | Programs (0-based) | Ch 10 | Duration |
|------|--------|---------------------|--------------------|-------|----------|
| `Symphony5_1.mid` | 13 | 1-9, 11-13 | 73, 68, 71, 70, 69, 69, 47, 40, 40, 41, 42, 43 | No | 5:16 |
| `Egmont.mid` | 15 | 1-9, 11-15 | 73, 73, 68, 71, 70, 69, 69, 69, 47, 40, 40, 41, 42, 43 | No | 7:58 |
| `Symphony7_2.mid` | 13 | 1-9, 11-13 | 73, 68, 71, 70, 69, 69, 47, 40, 40, 41, 42, 43 | No | 7:14 |
| `Concerto_No3.mid` | 14 | 1-9, 11-14 | 73, 68, 71, 70, 69, 69, 47, 0, 0, 40, 40, 41, 43 | No | 13:23 |
| `hallelujah/combined-score.mid` | 21 | 1-9, 11-13 | 68, 70, 56, 47, 40, 40, 41, 42; choir: 73, 68, 71, 70 | No | 3:06 |
| `hallelujah/Clarinet.mid` | 2 | 1 | none (no program change) | No | 6:12 |
| `MozartWA-KV525-mov-01.mid` | 5 | 1-4 | 40, 40, 41, 42 | No | 4:08 |
| `MozartWA-KV488-midi-2-andante.mid` | 11 | 1-9, 11 | 73, 71, 70, 60, 0, 0, 40/45, 40/45, 41/45, 42/45 | No | 7:00 |
| `k315-score.mid` | 8 | 1-7 | 68, 60, 73, 40, 40, 41, 42 | No | 4:14 |
| `Sommernachtstraum.mid` | 11 | 1-9, 11 | 73, 68, 71, 70, 60, 40, 40, 41, 42, 43 | No | 2:28 |
| `MF9-MarschScore.mid` | 12 | 1-9, 11, 12 | 73, 60, 70, 60, 57, 57, 40, 40, 41, 42, 43 | No | 1:41 |
| `SchubertF-D962-TantumErgo.mid` | 15 | 2-9, 11-16 | 41/45, 68, 71, 70, 60, 56, 47, 57, 57, 52 x4, 43/45 | No | 2:43 |

"40/45" means the channel switches between Violin (40) and Pizzicato
Strings (45) during the piece.

### 1.6 Facts that affect the player

- **LilyPond skips channel 10 for normal staves.** The source code comment
  says "MIDI players tend to ignore instrument settings on channel 10, the
  percussion channel." A percussion staff is forced to channel index 9.
  Sources:
  https://gitlab.com/lilypond/lilypond/-/blob/master/lily/staff-performer.cc
  and https://gitlab.com/lilypond/lilypond/-/blob/master/lily/midi-walker.cc
- **LilyPond wraps channels after 16.** "if more MIDI channels than the limit
  are required, the allocated channel numbers wrap around back to 0, possibly
  causing the incorrect assignment of instruments to some notes." Source:
  https://lilypond.org/doc/v2.24/Documentation/notation/midi-channel-mapping
- **Wrong brass programs in several Mutopia files.** In Egmont, Symphony 5
  mvt 1, Symphony 7 mvt 2, and Piano Concerto 3 mvt 1, the horn and trumpet
  staves set `midiInstrument = "english horn"`. A GM player plays them with
  program 69 (English Horn). Evidence: `cornif.ly`, `cornies.ly`, `trombe.ly`
  in https://www.mutopiaproject.org/ftp/BeethovenLv/O84/Egmont/Egmont-lys.zip
  and `cornies.ly`, `trombec.ly` in
  https://www.mutopiaproject.org/ftp/BeethovenLv/O67/Symphony5_1/Symphony5_1-lys.zip
  The Instrument Name meta event says "english horn", so a name-based fix
  cannot recover "horn" from the file alone.
- **A file with no program change.** `hallelujah/Clarinet.mid` has notes on
  channel 1 and no program change. A GM player plays it with program 0
  (see 2.5). It is a good test file.

---

## Part 2: General MIDI facts

### 2.1 GM Level 1 percussion key map (keys for an orchestra)

The MIDI Association page: "These sounds are the same for all MIDI Channels
except Channel 10, which has only 'percussion' sounds." "On MIDI Channel 10,
each MIDI Note number ('Key#') corresponds to a different drum sound." The
map covers keys 35 to 81. Source (archived MIDI Association page):
http://web.archive.org/web/20210517164542/https://www.midi.org/specifications-old/item/gm-level-1-sound-set

| Key | GM1 sound | Orchestral use |
|-----|-----------|----------------|
| 35 | Acoustic Bass Drum | Concert bass drum substitute |
| 36 | Bass Drum 1 | Bass drum |
| 37 | Side Stick | Rim click |
| 38 | Acoustic Snare | Snare drum |
| 39 | Hand Clap | |
| 40 | Electric Snare | Snare alternative |
| 41 | Low Floor Tom | Tom |
| 42 | Closed Hi Hat | |
| 43 | High Floor Tom | Tom |
| 44 | Pedal Hi-Hat | |
| 45 | Low Tom | Tom |
| 46 | Open Hi-Hat | |
| 47 | Low-Mid Tom | Tom |
| 48 | Hi-Mid Tom | Tom |
| 49 | Crash Cymbal 1 | Clash cymbals substitute |
| 50 | High Tom | Tom |
| 51 | Ride Cymbal 1 | Suspended cymbal substitute |
| 52 | Chinese Cymbal | |
| 53 | Ride Bell | |
| 54 | Tambourine | Tambourine |
| 55 | Splash Cymbal | |
| 56 | Cowbell | |
| 57 | Crash Cymbal 2 | Clash cymbals substitute |
| 58 | Vibraslap | |
| 59 | Ride Cymbal 2 | |
| 75 | Claves | |
| 76 | Hi Wood Block | Wood block |
| 77 | Low Wood Block | Wood block |
| 80 | Mute Triangle | Triangle |
| 81 | Open Triangle | Triangle |

The "Orchestral use" column is my mapping, not part of the spec.

GM1 has no timpani in the percussion map. Timpani is melodic program PC# 48
(data 47). Source: the same archived page.

The GM1 program list counts PC# from 1 to 128. The Program Change data byte
is 00H to 7FH. The Roland SC-55mkII manual says "00H - 7FH (prog.1 -
prog.128)". Source:
https://archive.org/details/roland-sound-canvas-sc-55mk-ii-owners-manual

### 2.2 Roland GS "ORCHESTRA" drum set (PC 49, data 48)

Source: Roland SC-88Pro Owner's Manual, drum set list (p. 163) and chart
"Native Drum set (4)" (p. 167). The ORCHESTRA set is marked "#: Same Drum
Set as SC-88 map". The SC-55 map also has ORCHESTRA at PC 49.
https://cdn.roland.com/assets/media/pdf/SC-88PRO_OM.pdf

| Key | GS ORCHESTRA sound |
|-----|--------------------|
| 26 | Finger Snap |
| 27 | Closed Hi-Hat 2 [EXC1] |
| 28 | Pedal Hi-Hat [EXC1] |
| 29 | Open Hi-Hat 2 [EXC1] |
| 30 | Ride Cymbal 1 |
| 35 | Jazz Kick 1 |
| 36 | Concert BD 1 |
| 38 | Concert SD |
| 39 | Castanets |
| 40 | Concert SD |
| 41 to 53 | Timpani F, F#, G, G#, A, A#, B, c, c#, d, d#, e, f |
| 57 | Concert Cymbal 2 |
| 59 | Concert Cymbal 1 |
| 88 | Applause |
| other keys up to 87 | same as STANDARD 1 (for example 54 Tambourine, 80/81 Triangle) |
| 89 and up | no sound |

The chart legend says "←: Same as the percussion sound of 'STANDARD1'(PC1)".
I read the key numbers from the row positions in the PDF text layer. The
SC-D70 manual (SC-8820 map, p. 69) shows the same ORCHESTRA column:
https://cdn.roland.com/assets/media/pdf/SC-D70_OM.pdf

### 2.3 GM2 "ORCHESTRA Set" (PC#49, data 48)

Source: General MIDI Level 2 Recommended Practice (RP024), Japanese edition
by AMEI, Appendix B, "General MIDI 2 Percussion Sound Set -- 3 of 4".
The document says that the English version is the original text.
https://amei.or.jp/midistandardcommittee/Recommended_Practice/GM2_japanese.pdf

| Key | GM2 ORCHESTRA Set sound | Pan |
|-----|-------------------------|-----|
| 27 | Closed Hi-hat 2 [EXC1] | 84 |
| 28 | Pedal Hi-hat [EXC1] | 84 |
| 29 | Open Hi-hat 2 [EXC1] | 84 |
| 30 | Ride Cymbal 1 | 44 |
| 35 | Concert BD 2 | 24 |
| 36 | Concert BD 1 | 24 |
| 38 | Concert SD | 44 |
| 39 | Castanets | 34 |
| 40 | Concert SD | 44 |
| 41 to 53 | Timpani F, F#, G, G#, A, A#, B, c, c#, d, d#, e, f | 34 |
| 57 | Concert Cymbal 2 | 34 |
| 59 | Concert Cymbal 1 | 34 |
| 88 | Applause | 64 |
| other keys 27 to 87 marked "@" | Standard Set sound (for example 54 Tambourine, 80/81 Triangle) | |

Legend from the same page: "--" = no sound; "@" = uses the Standard Set
sound; "[EXC]" = instruments with the same EXC number do not sound at the
same time. Section 2.8.1 says that the Orchestra Set note 88 responds to
note-off.

### 2.4 Comparison of important keys

```text
Key   GM1 (ch 10, any program)   GS ORCHESTRA (PC 49)   GM2 ORCHESTRA (PC#49)
----  -------------------------  ---------------------  ---------------------
 35   Acoustic Bass Drum         Jazz Kick 1            Concert BD 2
 36   Bass Drum 1                Concert BD 1           Concert BD 1
 38   Acoustic Snare             Concert SD             Concert SD
 40   Electric Snare             Concert SD             Concert SD
 41   Low Floor Tom              Timpani F              Timpani F
 47   Low-Mid Tom                Timpani B              Timpani B
 48   Hi-Mid Tom                 Timpani c              Timpani c
 49   Crash Cymbal 1             Timpani c#             Timpani c#
 53   Ride Bell                  Timpani f              Timpani f
 54   Tambourine                 Tambourine (STD)       Tambourine (STD)
 57   Crash Cymbal 2             Concert Cymbal 2       Concert Cymbal 2
 59   Ride Cymbal 2              Concert Cymbal 1       Concert Cymbal 1
 80   Mute Triangle              Mute Triangle (STD)    Mute Triangle (STD)
 81   Open Triangle              Open Triangle (STD)    Open Triangle (STD)
 88   (not in GM1)               Applause               Applause
```

Consequence: a GM1 file that plays crash (49) or toms (41 to 50) gives
timpani notes if the player loads an Orchestra set on channel 10.

### 2.5 Default program when a channel has no program change

| Standard | Fact | Source |
|----------|------|--------|
| GM1 | On "GM System On", a device should do "Any other actions needed to restore the device to GM-compatible settings, such as reset Bank Select and Program Change to '0'." | GM Level 1 Developer Guidelines, 2nd revision 1998 (MMA), p. 4. Copy: http://www.jososoft.dk/YAMAHA/pdf/gmlev1.pdf |
| GM1 | PC# 1 is "Acoustic Grand Piano". | http://web.archive.org/web/20210517164542/https://www.midi.org/specifications-old/item/gm-level-1-sound-set |
| GM1 | Text of the GM1 spec itself (RP-003) on the power-up program. | Not verified. The spec download needs a MIDI Association login: https://midi.org/general-midi-level-1 |
| GM2 | Program Change, required: initial value "1 (00H)". The note says that user documents count programs from 1, so 00H is written as 1. | AMEI RP024 Japanese edition, section 3.2: https://amei.or.jp/midistandardcommittee/Recommended_Practice/GM2_japanese.pdf |
| GS | Part parameter TONE NUMBER (40 1x 00) default value "00 / 00" (OCR text, so confidence is medium). | SC-55mkII manual OCR: https://archive.org/details/roland-sound-canvas-sc-55mk-ii-owners-manual |

Result: confirmed for GM2 (required initial value) and for GM1 after GM System
On (Developer Guidelines). Program 0 = Acoustic Grand Piano.

### 2.6 Channel 10 and drum set selection

#### GM1

- Channel 10 has only percussion sounds. Source (archived MIDI Association
  page):
  http://web.archive.org/web/20210517164542/https://www.midi.org/specifications-old/item/gm-level-1-sound-set
- "Extra drum sounds (additions or variations to the GM Percussion Map)
  should not be accessible while the device is in GM mode." Source: GM1
  Developer Guidelines p. 15, http://www.jososoft.dk/YAMAHA/pdf/gmlev1.pdf
- "Bank Select (CC #0/32) should be completely ignored in GM Mode." Source:
  same document, p. 11.
- "Composers of GM music files should not use variation kits (via program
  changes, etc.)". Source: same document, p. 15.
- Result: in strict GM1, channel 10 (index 9) is the drum channel whatever
  its program. A program change there does not select another kit.

#### GM2

Source for all items: AMEI RP024 Japanese edition,
https://amei.or.jp/midistandardcommittee/Recommended_Practice/GM2_japanese.pdf

- Section 2.4: channels 10 and 11 can be rhythm channels. Channel 10 is a
  rhythm channel at start. Channel 11 is a melody channel at start. Any
  channel, channel 10 included, can be a melody channel.
- Section 2.4: melody sounds use bank 79H/xxH (121). Rhythm sounds use bank
  78H/xxH (120).
- Section 3.3.1: Bank Select initial value is 79H/00H on all channels other
  than 10, and 78H/00H on channel 10.
- Section 3.3.1: a new bank is used only after the next Program Change.
- Section 3.3.1: on channels 10 and 11, bank 78H/00H then a Program Change
  makes the channel a rhythm channel. Bank 79H/xxH then a Program Change makes
  it a melody channel.
- Section 3.2: on a rhythm channel, the Program Change selects the drum set.
- Optional (section 2.4): a device may let any channel become a rhythm
  channel with bank 78H/xxH and a Program Change. GM2 files that use this can
  be incompatible with other GM2 devices.
- Drum set program numbers (Appendix B): STANDARD PC#1, ROOM 9, POWER 17,
  ELECTRONIC 25, ANALOG 26, JAZZ 33, BRUSH 41, ORCHESTRA 49, SFX 57.
- MMA summary: "Simultaneous Percussion Kits = up to 2 (Channel 10/11)".
  Source (copy of the MMA page, 2000):
  http://www.jososoft.dk/yamaha//pdf/gmlev2.pdf

#### Roland GS

Source: Roland SC-55mkII Owner's Manual (OCR text),
https://archive.org/details/roland-sound-canvas-sc-55mk-ii-owners-manual

- "In a GM/GS sound module, channel 10 is reserved for the Drum Part."
- "Part number 10 is preset for the drum part."
- "You can change the Drum Set, as well as the instruments, with Program
  Change messages ... The Drum Set numbers corresponds with the MIDI program
  numbers."
- "In Drum Parts, Bank Select messages will be ignored."
- "in the drum part, Program change messages are ignored when the Bank is set
  at 129 - 16384 (ie. the value of the control change number 0 is not 00H)."
- SysEx parameter "USE FOR RHYTHM PART" (address 40 1x 15) sets a part to
  normal (0), drum MAP1 (1), or drum MAP2 (2). "The default is MAP1 (1) for
  Part10 ... and all other parts are set to normal parts."
- "Multiple parts can be set as Drum Parts, but only Drum 1 and Drum 2 can be
  used simultaneously."
- GS reset: `F0 41 10 42 12 40 00 7F 00 41 F7`. GM System On:
  `F0 7E 7F 09 01 F7`.
- Drum set list with ORCHESTRA at PC 49: SC-88Pro manual p. 163,
  https://cdn.roland.com/assets/media/pdf/SC-88PRO_OM.pdf

#### Selection flow

```text
                 Program Change on channel C
                            |
          +-----------------+------------------+
          |                 |                  |
         GM1               GM2                 GS
          |                 |                  |
   C == 10 ?          rhythm channel?     drum part? (part 10 by
   yes: drum kit      (ch 10 default,     default; SysEx 40 1x 15
   stays GM kit,      ch 11 by bank       can add parts)
   PC is ignored      78H/00H + PC)            |
   for kit select           |             CC0 == 0 ?
   no: melodic PC     yes: PC selects       yes: PC selects drum
                      drum set (PC#49 =      set (PC 49 = ORCHESTRA)
                      ORCHESTRA)             no: PC is ignored
                      no: bank 79H/xx +
                      PC selects melody
```

---

## Not verified

- The text of the GM1 specification (RP-003) on power-up program and on
  channel 10 program changes. The download needs a MIDI Association login.
- The English GM2 specification. I used the official AMEI Japanese edition.
- Musopen MIDI downloads (site returned HTTP 403).
- MIDI channel and program data of MuseScore exports of the OpenScore
  files (MuseScore is not installed here).
- Whether MuseScore writes lyrics (OpenScore CC BY-SA annotations) into an
  exported MIDI file.
- Whether musescore.com needs a login or a subscription for MIDI download of
  OpenScore scores.
- The GS TONE NUMBER default "00" comes from an OCR text layer.
- Exact performance durations. Table values come from MIDI tempo maps or
  from bar-count estimates.

---

## Sources

Primary or official:

- Mutopia license page: https://www.mutopiaproject.org/legal.html
- Mutopia orchestra listing: https://www.mutopiaproject.org/cgibin/make-table.cgi?Instrument=Orchestra
- Mutopia string listing: https://www.mutopiaproject.org/cgibin/make-table.cgi?Instrument=String
- Mutopia piece pages: `https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=N`
  with N = 80, 247, 248, 260, 344, 364, 459, 547, 595, 899, 941, 1553, 1634,
  1635, 2229, 2230
- OpenScore announcement: https://musescore.org/en/user/57401/blog/2017/01/11/introducing-openscore
- OpenScore corpora: https://fourscoreandmore.org/openscore/
- OpenScore Orchestra repo: https://github.com/MarkGotham/Hauptstimme
- OpenScore Orchestra record: https://zenodo.org/records/15425749
- Hauptstimme annotation method: https://github.com/MarkGotham/Hauptstimme/blob/main/docs/annotation.md
- MuseScore CLI: https://handbook.musescore.org/appendix/command-line-usage
- IMSLP licensing policy: https://imslp.org/wiki/IMSLP:Licensing_Policy_and_Guidelines
- IMSLP Performers Portal (MIDI rule): https://imslp.org/wiki/IMSLP:Performers_Portal
- Wikimedia Commons MIDI category: https://commons.wikimedia.org/wiki/Category:MIDI_files_of_classical_music
- LilyPond MIDI channel mapping: https://lilypond.org/doc/v2.24/Documentation/notation/midi-channel-mapping
- LilyPond source: https://gitlab.com/lilypond/lilypond/-/blob/master/lily/staff-performer.cc
- LilyPond source: https://gitlab.com/lilypond/lilypond/-/blob/master/lily/midi-walker.cc
- MIDI Association GM1 sound set (archived 2021): http://web.archive.org/web/20210517164542/https://www.midi.org/specifications-old/item/gm-level-1-sound-set
- MIDI Association GM1 page: https://midi.org/general-midi-level-1
- GM1 Developer Guidelines, MMA 1998 (third-party copy): http://www.jososoft.dk/YAMAHA/pdf/gmlev1.pdf
- GM2 RP024, AMEI Japanese edition: https://amei.or.jp/midistandardcommittee/Recommended_Practice/GM2_japanese.pdf
- GM2 MMA summary page, 2000 (third-party copy): http://www.jososoft.dk/yamaha//pdf/gmlev2.pdf
- Roland SC-88Pro Owner's Manual: https://cdn.roland.com/assets/media/pdf/SC-88PRO_OM.pdf
- Roland SC-D70 Owner's Manual: https://cdn.roland.com/assets/media/pdf/SC-D70_OM.pdf
- Roland SC-55mkII Owner's Manual (scan): https://archive.org/details/roland-sound-canvas-sc-55mk-ii-owners-manual

Secondary (leads only):

- https://huggingface.co/datasets/TiMauzi/imslp-midi-cc0-1.0
- https://en.wikipedia.org/wiki/Musopen
- https://en.wikipedia.org/wiki/General_MIDI
- https://en.wikipedia.org/wiki/Lili_Boulanger
