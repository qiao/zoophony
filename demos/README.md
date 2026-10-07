# Demos

This folder holds the demo pieces of the app (design section 8).

- `src/` holds the input files of the build. The Mutopia files are unchanged downloads.
- `patches.json` holds the program changes that the build applies by track (design 8.3).
  `tools/patch-demos.ts` checks the checksums below, applies the changes, and writes each demo
  file into `public/demos/`. `pnpm dev` and `pnpm build` run it first.
- `boulanger/` holds the source score of the Boulanger file.
- `groups/` holds the group maps of the other OpenScore files.
- The Boulanger demo is the default demo: the first screen shows it, and it is part of the first
  download (design 2.2, 7.2). The user chose it on 2026-10-05.

## Sources and licenses

All compositions are in the public domain. Each file also has its own license.

| Hash id | File | Piece | Source | License | Typesetter (credit) |
|---|---|---|---|---|---|
| `mozart-k315` | `src/mozart-k315.mid` | Mozart, Andante in C for flute and orchestra, K. 315 | [Mutopia 344](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=344), file `k315-score.mid` in the MIDI zip | Public Domain | Maurizio Tomasi |
| `boulanger-matin` | `src/boulanger-matin.mid` | Lili Boulanger, D'un matin de printemps | [OpenScore Orchestra](https://github.com/MarkGotham/Hauptstimme/blob/d9a40bb1c4930a45495905d52f440f44b78ff818/data/Boulanger,_Lili/D'un_matin_de_printemps/D'un_matin_de_printemps.mscz), made by the pipeline below | CC0 1.0 (score) | OpenScore |
| `beethoven-9` | `src/beethoven-9.mid` | Beethoven, Symphony No. 9, Op. 125, mvt 4, bars 543 to 590 and 851 to 940 ("Ode to Joy") | [OpenScore Orchestra](https://github.com/MarkGotham/Hauptstimme/blob/8f677853c45b74ca0afcd79677e5379c06c82354/data/Beethoven,_Ludwig_van/Symphony_No.9,_Op.125/4/Beethoven_Op.125_4.mscz), made by the OpenScore pipeline below | CC0 1.0 (score) | OpenScore |
| `mozart-k525` | `src/mozart-k525.mid` | Mozart, Eine kleine Nachtmusik, K. 525, mvt 1 | [Mutopia 2230](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2230), file `MozartWA-KV525-mov-01.mid` in the MIDI zip | Public Domain | Mike Blackstock |
| `bach-bwv1048` | `src/bach-bwv1048.mid` | Bach, Brandenburg Concerto No. 3, BWV 1048, mvt 1 | [OpenScore Orchestra](https://github.com/MarkGotham/Hauptstimme/blob/8f677853c45b74ca0afcd79677e5379c06c82354/data/Bach,_Johann_Sebastian/Brandenburg_Concerto_No.3,_BWV.1048/1/Bach_BWV.1048_1.mscz), made by the OpenScore pipeline below | CC0 1.0 (score) | OpenScore |
| `beethoven-8` | `src/beethoven-8.mid` | Beethoven, Symphony No. 8, Op. 93, mvt 2 | [OpenScore Orchestra](https://github.com/MarkGotham/Hauptstimme/blob/8f677853c45b74ca0afcd79677e5379c06c82354/data/Beethoven,_Ludwig_van/Symphony_No.8,_Op.93/2/Beethoven_Op.93_2.mscz), made by the OpenScore pipeline below | CC0 1.0 (score) | OpenScore |

The licenses do not require a credit line. The credits panel of the app still lists each source
and each typesetter.

The Mutopia pages were read on 2026-10-04, and the page of piece 2230 on 2026-10-05. Each page
shows "Copyright: Public Domain". The LilyPond source of piece 2230 also holds
`license = "Public Domain"`.

The OpenScore Orchestra README gives "Scores: CC0 1.0 Universal; Annotations: CC-By-SA" (read
on 2026-10-05 at commit `8f677853`). Each score holds the same text in its `copyright` meta tag.

## Checksums (SHA-256)

| File | SHA-256 |
|---|---|
| `src/mozart-k315.mid` | `91b2ef1c3a91ff1631638df0059b44b3bd6940e90af235003922b414140a7c84` |
| `src/boulanger-matin.mid` | `0f50942dcaf0e656c45cc118e0cc49560c83c76ca5dab30cc3239730f568347e` |
| `src/beethoven-9.mid` | `0041f8991e1acb410ee88696e3e2681268fcca61a5c95a29a71bda1d3bad7552` |
| `src/mozart-k525.mid` | `7a6f71b2b7763524a56322723c774d584af006dd980289fce60ebd93a91a16d7` |
| `src/bach-bwv1048.mid` | `acf4428de234548e528185334283fe492e3cffe561f77b3dfdde74f212a4e41b` |
| `src/beethoven-8.mid` | `1482c086437e225e0849a31ba05e920011e1cac6b96490017f8799bc77c92b80` |
| `boulanger/matin-nolyrics.mscz` | `cbcca2cd6b43c0d58ba0c3f38b7e9bfbc438e1b1ec4720b6bea784e7fbcd013f` |

## Program changes

No demo file needs a program change, so `patches.json` is an empty list. The build keeps the
mechanism for a future file (design 8.3).

Until 2026-10-05, the Beethoven 5 demo (`beethoven-5.mid`, Mutopia 941) had two changes: track 5
(the horns) and track 6 (the trumpets) changed from program 69 (English Horn) to 60 (French
Horn) and 56 (Trumpet). In its LilyPond source, both staves had the instrument name "Corni in
Es.", but the short names and the file names (`cornies.ly`, `trombec.ly`) showed horns and
trumpets. The user removed the demo on 2026-10-05 (design 8.2), with the Grieg demo
(`grieg-ase.mid`, Mutopia 247) and the Mozart K. 488 demo (`mozart-k488.mid`, Mutopia 2229).

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

## The other OpenScore files

`src/beethoven-9.mid`, `src/bach-bwv1048.mid`, and `src/beethoven-8.mid` come from the
OpenScore scores at commit `8f677853` of the Hauptstimme repository. The repository does not hold
these scores. The pipeline downloads each score and removes all lyrics first, so the annotations
of the instrumental scores (CC BY-SA, stored as lyrics) do not enter it. The Beethoven 9 score
has the sung text as lyrics and its annotations as staff text. The MuseScore export writes no
staff text, and `remap_midi.py` drops the lyric events. Thus each result holds no text of the
score: only the group names, the tempo, and the time and key signatures.

`groups/` holds the group map of each score (`tools/musescore/README.md`). Each group gets one
MIDI channel:

- Beethoven 9: the four soloists form one group and the choir another. The excerpt has no note
  of the soloists, so the stage shows one choir seat. The piccolo plays with the flutes, and the
  contrabassoon with the bassoons.
- Bach: the three violin parts keep three groups. The three viola parts form one group, and so
  do the three cello parts. With nine string groups, the layout made a stage side of 20.71 m,
  against 10.43 m with seven.
- Beethoven 8: one group for each instrument.

The Beethoven 9 demo is an excerpt of two parts of the finale, both in D major:

- Bars 543 to 590: the full choir sings the theme "Freude, schöner Götterfunken" with the full
  orchestra, to the D major chords after the last word. Bars 591 to 594 turn to G major for the
  Andante maestoso, so the excerpt leaves them out.
- Bars 851 to 940: the Prestissimo coda to the end of the symphony.

The score counts the pickup bar as measure 1, and three more partial bars, so bar 543 starts at
tick 880,800, bar 591 at tick 949,920, and bar 851 at tick 1,610,880, with 480 ticks for each
quarter note. The finale ends at tick 1,781,760. Until 2026-10-06, the excerpt was bars 216 to
330 (ticks 364,800 to 575,520), from the baritone recitative "O Freunde, nicht diese Töne!" to
the end of "vor Gott!". The user asked for a more traditional and joyful version.
[`../docs/research/2026-10-06-joyful-ode.md`](../docs/research/2026-10-06-joyful-ode.md) gives
the candidates and the measures.

| Score file | SHA-256 |
|---|---|
| `Beethoven_Op.125_4.mscz` | `7055e0c60a1d819ec21e455676aaca0106f0d251a17e311714a0de62434dca55` |
| `Bach_BWV.1048_1.mscz` | `7ea8d2cf64a0aa54cdd4d7f5df8f7433fdf5f3169b27111e9c62be4e30d90a4c` |
| `Beethoven_Op.93_2.mscz` | `6e3437c0edd2729f49302fc2728595624f87ff4a4f1b38e71cd244583a522fb8` |

```bash
P=tools/musescore
T=$(mktemp -d)
MS="/Applications/MuseScore 4.app/Contents/MacOS/mscore"   # MuseScore 4.7.5
H=https://raw.githubusercontent.com/MarkGotham/Hauptstimme/8f677853c45b74ca0afcd79677e5379c06c82354/data
# ID, the score in the Hauptstimme repository, and the tick ranges of an excerpt
ID=beethoven-9 S='Beethoven,_Ludwig_van/Symphony_No.9,_Op.125/4/Beethoven_Op.125_4.mscz' CUT='880800 949920 1610880 1781760'
# ID=bach-bwv1048 S='Bach,_Johann_Sebastian/Brandenburg_Concerto_No.3,_BWV.1048/1/Bach_BWV.1048_1.mscz' CUT=
# ID=beethoven-8 S='Beethoven,_Ludwig_van/Symphony_No.8,_Op.93/2/Beethoven_Op.93_2.mscz' CUT=
G=demos/groups/$ID.json
curl -sfL -o $T/score.mscz "$H/$S"
shasum -a 256 $T/score.mscz                                # compare with the table above
python3 $P/strip_lyrics.py $T/score.mscz $T/nolyrics.mscz
python3 $P/remap_score.py unique $T/nolyrics.mscz $T/unique.mscz --groups $G
python3 $P/add_switches.py $T/unique.mscz $T/unique-sw.mscz
"$MS" -o $T/unique-sw.mid $T/unique-sw.mscz                # can exit with 134 after the write
test -s $T/unique-sw.mid
python3 $P/remap_midi.py $T/unique-sw.mid $T/unique-sw.mscz $T/full.mid --programs group --groups $G
python3 $P/validate.py $T/unique-sw.mid $T/unique-sw.mscz $T/full.mid --groups $G
if [ -n "$CUT" ]; then python3 $P/cut_midi.py $T/full.mid $T/$ID.mid $CUT; else cp $T/full.mid $T/$ID.mid; fi
cmp $T/$ID.mid demos/src/$ID.mid
```

The check prints 0 missed attacks, 0 extra attacks, 0 notes with a wrong program, and 0 s of lost
sound for each score: 46,224 attacks for the full Beethoven 9 finale, 9,301 for the Bach, and
5,694 for the Beethoven 8. Its count of keys on channel 10 that are not drum keys reads the keys
of the Boulanger kit. The finale uses other keys (234). On 2026-10-05, the pipeline gave files
that are byte-identical to the three files in `src/`. Two of the three MuseScore runs exited with
code 134 after the write. On 2026-10-06, the pipeline gave the same full finale again: its cut
of ticks 364,800 to 575,520 was byte-identical to the excerpt of that date. The cut of the
current ticks gave `src/beethoven-9.mid`.
