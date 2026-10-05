# Demos

This folder holds the demo pieces of the app (design section 8).

- `src/` holds the input files of the build. The five Mutopia files are unchanged downloads.
- `patches.json` holds the program changes that the build applies by track (design 8.3).
- `boulanger/` holds the source score of the Boulanger file.

## Sources and licenses

All compositions are in the public domain. Each file also has its own license.

| Hash id | File | Piece | Source | License | Typesetter (credit) |
|---|---|---|---|---|---|
| `beethoven-5` | `src/beethoven-5.mid` | Beethoven, Symphony No. 5, Op. 67, mvt 1 | [Mutopia 941](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=941), file `Symphony5_1.mid` | Public Domain | Stelios Samelis (adapted by Johannes Heinecke) |
| `grieg-ase` | `src/grieg-ase.mid` | Grieg, Peer Gynt Suite No. 1, Åse's Death | [Mutopia 247](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=247), file `aasesdeath.mid` in the MIDI zip | Public Domain | Deborah Lowrey |
| `mozart-k488` | `src/mozart-k488.mid` | Mozart, Piano Concerto No. 23, K. 488, mvt 2 | [Mutopia 2229](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2229), file `MozartWA-KV488-midi-2-andante.mid` in the MIDI zip | Public Domain | William Chargin |
| `mozart-k315` | `src/mozart-k315.mid` | Mozart, Andante in C for flute and orchestra, K. 315 | [Mutopia 344](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=344), file `k315-score.mid` in the MIDI zip | Public Domain | Maurizio Tomasi |
| `handel-hallelujah` | `src/handel-hallelujah.mid` | Handel, Messiah, HWV 56, Hallelujah | [Mutopia 459](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=459), file `combined-score.mid` in the MIDI zip | Public Domain | Joshua Koo |
| `boulanger-matin` | `src/boulanger-matin.mid` | Lili Boulanger, D'un matin de printemps | [OpenScore Orchestra](https://github.com/MarkGotham/Hauptstimme/blob/d9a40bb1c4930a45495905d52f440f44b78ff818/data/Boulanger,_Lili/D'un_matin_de_printemps/D'un_matin_de_printemps.mscz), made by the pipeline below | CC0 1.0 (score) | OpenScore |

The licenses do not require a credit line. The credits panel of the app still lists each source
and each typesetter.

The Mutopia pages were read on 2026-10-04. Each page shows "Copyright: Public Domain".

## Checksums (SHA-256)

| File | SHA-256 |
|---|---|
| `src/beethoven-5.mid` | `0ce1bca911ba8e6234fd2e474a9b6da4c968c5cfe85b0cccfe7e56505df52046` |
| `src/grieg-ase.mid` | `9caaeae181c0eab7155cfdd994a2ddb11dbc2dfd80e315d31509a0979ae70960` |
| `src/mozart-k488.mid` | `59789a1ad57c5cd8459b1946192c77f50615e6ea9706d40e1b25e8939060f0b7` |
| `src/mozart-k315.mid` | `91b2ef1c3a91ff1631638df0059b44b3bd6940e90af235003922b414140a7c84` |
| `src/handel-hallelujah.mid` | `d7a59451ba87bf138d0a6d5be589db9f07c0a9268361d91c9033a136d181c1a5` |
| `src/boulanger-matin.mid` | `0f50942dcaf0e656c45cc118e0cc49560c83c76ca5dab30cc3239730f568347e` |
| `boulanger/matin-nolyrics.mscz` | `cbcca2cd6b43c0d58ba0c3f38b7e9bfbc438e1b1ec4720b6bea784e7fbcd013f` |

## Program changes

| File | Track | Part | Program in the file | New program |
|---|---|---|---|---|
| `beethoven-5.mid` | 5 | Horns (LilyPond staff "five", short name "Co") | 69 English Horn | 60 French Horn |
| `beethoven-5.mid` | 6 | Trumpets (LilyPond staff "six", short name "Tb") | 69 English Horn | 56 Trumpet |
| `handel-hallelujah.mid` | 9 | Soprano | 73 Flute | 52 Choir Aahs |
| `handel-hallelujah.mid` | 10 | Alto | 68 Oboe | 52 Choir Aahs |
| `handel-hallelujah.mid` | 11 | Tenor | 71 Clarinet | 52 Choir Aahs |
| `handel-hallelujah.mid` | 12 | Bass | 70 Bassoon | 52 Choir Aahs |

Track indices start at 0. Track 0 of each file is the control track. In the LilyPond source of
the Beethoven file, both staves have the instrument name "Corni in Es.", but the short names
and the file names (`cornies.ly`, `trombec.ly`) show horns and trumpets.

## The Boulanger file

`boulanger/matin-nolyrics.mscz` is the OpenScore score with all 170 Lyrics elements removed
(87 in the main score, 83 in the part scores). These lyrics held the CC BY-SA annotations, so the
remaining score is CC0 only. Its `copyright` meta tag still names the annotations.

`src/boulanger-matin.mid` comes from this pipeline. The scripts are in `tools/musescore/`. The
research report [`../docs/research/musescore-export.md`](../docs/research/musescore-export.md)
explains each step. CI does not run the pipeline, because it needs MuseScore 4.

The scripts in `tools/musescore/` differ from the research copies in one fix. When two parts on
one channel overlap on the same key, `remap_midi.py` now ends the sounding note just before the
later note-on. Without the fix, 110 notes had no note off and sounded to the end of the piece.

```bash
P=tools/musescore
T=$(mktemp -d)
MS="/Applications/MuseScore 4.app/Contents/MacOS/mscore"   # MuseScore 4.7.5
python3 $P/remap_score.py unique demos/boulanger/matin-nolyrics.mscz $T/matin-unique.mscz
python3 $P/add_switches.py $T/matin-unique.mscz $T/matin-unique-sw.mscz
"$MS" -o $T/matin-unique-sw.mid $T/matin-unique-sw.mscz    # exits with 134 after the write
test -s $T/matin-unique-sw.mid
python3 $P/remap_midi.py $T/matin-unique-sw.mid $T/matin-unique-sw.mscz $T/boulanger-matin.mid --programs group
cmp $T/boulanger-matin.mid demos/src/boulanger-matin.mid
(cd $P && python3 validate.py $T/matin-unique-sw.mid $T/matin-unique-sw.mscz $T/boulanger-matin.mid)
```

The check prints 12,139 attacks, 0 missed, 0 extra, 15 with a wrong program, and 0 s of lost
sound. The 15 notes are pizzicato and arco notes of two parts that start on the same key at the
same tick, so only one note-on remains.

CAUTION: The MuseScore CLI crashes after it writes the file in most runs. Check the output file,
and ignore the exit code. Each crash writes a dump file to
`~/Library/Application Support/MuseScore/MuseScore4/logs/dumps/`.

On 2026-10-04, this pipeline gave a file that is byte-identical to `src/boulanger-matin.mid`. In
that run, MuseScore exited with code 0.
