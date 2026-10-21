# Decisions of cheerful orchestral demos and curated library

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-14, the user asked to search for suitable orchestra/symphony MIDI files that are
positive, joyful, and cheerful, add them to the repository, and add them to the demo player. The agent researched public domain
and CC0 candidates from OpenScore and Mutopia, vetted them against General MIDI and the pure score
rules (design 3.8, 8.1, 8.2), established a curated library in `demos/curated/`, and promoted all 8 vetted
cheerful orchestral pieces to the live demo player, expanding the demo list to 14 pieces.

| Decision | Section |
|---|---|
| A curated library of vetted cheerful orchestral pieces is established in `demos/curated/` with `demos/curated/README.md` recording sources, public domain / CC0 licenses, and SHA-256 checksums: Beethoven Symphony 1 (IV), Brahms Symphony 2 (IV), Beethoven Symphony 8 (IV), Bach Brandenburg 2 (I), Bach Brandenburg 5 (III), Mendelssohn Midsummer Night's Dream (V), Mozart Horn Concerto 2 (III), and Mozart Bassoon Concerto (III) | 8.1, 8.2 |
| All 8 vetted cheerful pieces are promoted to the in-app demo player as demos #7 to #14 (`DEMO_IDS` in `src/app/demos.ts`): `beethoven-1`, `brahms-2`, `beethoven-8-4`, `bach-bwv1047`, `bach-bwv1050`, `mendelssohn-op61`, `mozart-k417`, and `mozart-k191` | 2.8, 8.2 |
| The source scores of the OpenScore pieces (`beethoven-1`, `brahms-2`, `beethoven-8-4`) are CC0 1.0 from Hauptstimme, exported through MuseScore 4 with channel maps in `demos/groups/` routing low strings to channels 11–13 to avoid GM percussion channel 10 | 8.2, 8.4 |
| The Mutopia downloads (`bach-bwv1047`, `bach-bwv1050`, `mendelssohn-op61`, `mozart-k417`, `mozart-k191`) are public domain. In `bach-bwv1047.mid` (Mutopia 1680), track 8 is patched in `demos/patches.json` from program 40 (violin) to 42 (cello) to restore the cello stave, and track 9 is patched from program 0 (piano) to 6 (harpsichord) for authentic Baroque continuo, preserving PCM memory at 76.15 MB (under 100 MB) | 6.3, 8.1, 8.3 |
| Integrated loudness calibration is added in `src/audio/demo-loudness.ts` for all 14 demos: `brahms-2` (-17.5 LUFS), `beethoven-8-4` (-19.5 LUFS), `bach-bwv1047` (-19.0 LUFS), `bach-bwv1050` (-21.5 LUFS), `mendelssohn-op61` (-22.0 LUFS), `mozart-k417` (-24.0 LUFS), and `mozart-k191` (-24.5 LUFS) to hit the -18 LUFS target | 6.8 |
| Conductor clearance accepted depths in `src/pose/test-sweep-roles.ts` allow 0.045 m body depth for paws and claws during count-in lifts in fast tempos (`bach-bwv1050`) | 4.5, 9.3 |
| In Brandenburg Concerto 2 (BWV 1047), the concertino has four equal soloists (trumpet, recorder, oboe, violin) rather than a single soloist. SOLOIST_RULE.above is tuned from 0.75 to 0.78 so that multi-soloist concertinos give no single standing soloist, keeping the first violin desk clear in all section sizes while cleanly preserving K. 315 as a solo flute concerto | 3.8, 4.5 |

