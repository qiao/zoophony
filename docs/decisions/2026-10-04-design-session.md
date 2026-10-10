# Decisions of the design session

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

No open detail remains. On 2026-10-04, after the design session, the agent decided the details
below, so that a fresh agent can build with no guess. The user did not review them one by one.
The user can change any of them. Then update the section that holds it.

| Decision | Section |
|---|---|
| The pitch bands of "divided by pitch" | 3.5 |
| Programs 32 to 39 give the pizzicato technique | 3.5 |
| A channel that starts with pizzicato takes its next later section | 3.5 |
| A sound-only seat, "Other sounds", for notes with no animal | 3.5, 2.8 |
| The conductor is not counted in the cap of 60 | 3.8 |
| The order in which players go when a file needs more than 60 | 3.8 |
| The species of a third or later seat of a section | 4.3 |
| The shape parameters of each species, with the new types `large-round`, `floppy`, and `puff` | 4.3 |
| All colors, proportions, budgets, prop sizes, and the model inventory | 4.5, 4.6 |
| The camera: elevation 28°, azimuth 30°, distance `3.3 × S` (fit to the reference) | 4.5 |
| The stage origin, the stage size, the row radius rule, and the choir risers | 4.5 |
| The light scales with the stage size | 4.5 |
| The steps 0.4 m to the left of the podium, the floor, and the conductor stand | 4.5 |
| The bone list and the IK rule | 4.7 |
| The pose types and the audibility input of `poseAt()` | 5.1 |
| The conductor pattern for each time signature, with its tempo thresholds | 5.4 |
| A silent seat uses the seeded lowering and lift of each player, with no hold and no scale | 5.5 |
| The UI tokens, the control sizes, the seat texts, and the message texts | 2.8 |
| The "small screen" signal and the start tier of each device | 2.6 |
| The demo titles, composers, credit lines, and expected sections | 8.2 |
| The targets and their numbers (for example the clock within 20 ms, the first sound within 300 ms) | 9.7 |
| Right-handed axes: +z points to the audience | 4.5 |
| A shadow-only floor and no fog, so that the CSS gradient shows | 4.5 |
| The pianist faces +x, toward the conductor, who is ahead and a little to the left | 4.5 |
| The accent color and the accent parts of each species | 4.5 |
| The seat order: `SectionId` order, then the first (port, channel) | 3.2 |
| The percussion players: order, cap, and instruments | 3.8, 4.6 |
| Generic sequence names that a dropped file ignores | 8.2 |
| A selected demo or a dropped file starts when its samples are ready | 2.2 |
| The 60 seats of `perf-60.mid` | 9.5 |
| `oxlint-tsgolint`, the type-aware lint, and the explicit oxfmt paths | 9.5 |
| The size limit of 1,000,000 bytes, and the default demo at `demos/<hash id>.mid` in the site | 7.2 |
| The license file `third-party-licenses.txt`, and the build failure for an unlisted dependency | 7.3 |
| The SF3 split output in `public/sf/`, the GS variation banks, and no file for the bank 120 drum kits | 6.2 |
| Drum kit 0 as the fallback of a drum kit with no file | 6.2 |
| The `SynthEventTable` layout, and the port count from the highest synth channel | 6.4 |
| The chase of a seek, and the GM programs that start held notes again | 6.5 |
| The `PlayerScore` type of `load()`, and the spike values of `WorkletPlayer` | 6.8 |
| The rule that finds a timestamp with no output latency: later than the second method by more than half of the output latency | 6.7 |
| The `latencyHint: 'interactive'` of the `AudioContext` | 6.4 |
| An event sounds from the start of the block that holds its time: up to one block early | 6.4 |
| A render error makes the processor silent for good, and it reports the error | 6.4 |
| A play at the song end starts the song again from 0 | 6.5 |
| The anchor window of 1 s, in place of a count of anchors | 6.7 |
| The `Player` keeps the last rate for the next score. Play, pause, and seek before a load resolves have no effect | 6.8 |
| A failure ends the engine, and the next load starts a new one. The `onError` function of the `WorkletPlayer` gets a failure that no pending load reports | 6.8 |
| A rejected `resume()` goes to `onError` | 6.8 |
| A later `load()` replaces a pending one, which rejects with a `LoadReplacedError` | 6.8 |
| A file with SMPTE time division is not valid | 3.3 |
| The text encoding of a name event: UTF-8, else Latin-1 read as windows-1252 (WHATWG) | 3.3 |
| The first port event of a track sets the port of the full track | 3.4 |
| 4 MB is 4,000,000 bytes, as in the size limit of 7.2 | 3.3 |
| A time signature in any track applies to all tracks, and the later track wins at the same tick | 3.3 |
| The note off at the end of a track ends the oldest open note on its key, and `score/` drops a note off with no open note | 3.3 |
| Only tracks with channel events give ports, and a seat names the port index | 3.4 |
| A bank select takes effect at the next program change, and `score/` ignores the bank LSB | 3.5 |
| The section of a note of 44 or 45 comes from the nearest note of another program on its channel. After an ensemble program, the string bands divide it | 3.5 |
| The merge rule for articulation channels does not merge a rhythm channel with a mallet channel | 3.7 |
| Notes that overlap by at most 50 ms are not simultaneous, so one player plays a legato or a grace note | 3.8 |
| A new note takes the player of its pitch rank, or the nearest free player, the higher one at the same distance. The rule of divisi with an uneven division | 3.8 |
| A program counts for the orchestral rule only on a melodic channel, and `Score.orchestral` ignores the setting | 3.8 |
| Above 60 players: "the largest other seat" excludes the strings and the choir, a tie removes from the later seat, and a smaller percussion seat gives the remaining key groups to its last player | 3.8 |
| The tempo at the downbeat selects the pattern of a bar, a time signature starts a new bar, and the beats end before the last note-off | 5.4 |
| Step 3 starts before the Safari check of step 1 with its audio-free tasks only. The bow sync and the clock target wait for the Safari check (manager, 2026-10-05) | 9.5 |
| Three step treads of rise 0.10 below the stage top, as in the reference image, in place of three rises of 0.133 | 4.5 |
| The conductor stand: its post 0.35 m in front of the podium center, the desk height above the podium top, and a tilt of 30°. The plank lines are 0.012 m wide | 4.5 |
| The soft shadows of the high tier: `PCFShadowMap` with radius 3, because three.js r186 has no `PCFSoftShadowMap`. The pixel ratio of a tier is never more than `devicePixelRatio` | 2.6 |
| A shared music stand stands 0.65 m in front of the row, between two seats, 0.1 m from the chair back of the row in front, and the `facing` of a stand is the facing of its players | 4.5, 5.1 |
| Each skeleton has all bones of 4.7. The bind pose is seated, with the arms down and no bone rotation | 4.7 |
| The sizes of the violin and the bow, and the hold of the violin under the chin | 4.6 |
| The step treads have the color of the stage top, as in the reference image | 4.5 |
| The light of the step 3 tune: 2.2 lux at the stage center, fill intensity 12, and beam opacity 1.0 with soft edges | 4.5 |
| The touch signal of the start tier is `(pointer: coarse)`, so a laptop with a touch screen starts at the high tier (review of step 3, F9) | 2.6 |
| The pixel ratio follows each change of `devicePixelRatio`, from a media query on the resolution (review of step 3, F8) | 2.6 |
| The violin strings are one strip of 0.008 m in `#9a9080` (review of step 3, F5) | 4.5 |
| The torso splits at the `chest` bone: the lower part follows `spine`, and the upper part follows `chest` (review of step 3, F6) | 4.7 |
| The seated shin reaches from the knee to the floor (seat height plus 0.12 H), so that the feet rest on the floor (review of step 3, F2) | 4.5 |
| The inside of an ear has the belly color, unless the accent parts include the inner ears or the ears | 4.5 |
| The trunk has no nose ball, the flat nose has two nostrils, and the beak has a lower half on `jaw` | 4.5 |
| The flat nose is 0.4 H wide and 0.3 H tall, in place of 0.2 H wide | 4.5 |
| The path of a tail of two bones under the chair back | 4.5 |
| The face pattern `forehead-stripes` of the cat, so that `stripe` names only the stripe of the badger | 4.3 |
| The seated body of step 4: the head top 2.4 H above the seat (in place of 2.6), a torso 1.45 H tall, and a neck that the torso and the head hide. The agent of the animal views changed the widths and the legs (below) | 4.5 |
| The ear types `antlered` (the deer) and `side-round` (the monkey), and the face pattern `face-disc` (the monkey) | 4.3 |
| The trunk starts 0.3 H below the head center and curls up. The horn is 0.26 H wide at its base | 4.5 |
| The ids of the two fox colors: `fox-red` (second violins) and `fox-tan` (flutes). `SPECIES` holds 19 entries for the 18 species | 4.3 |
| The mouse has a pointed snout of 0.3 H and large round ears of 0.7 H, set high and out to the sides (review of step 4, the weak species) | 4.3, 4.5 |
| The beaver has the snout `buck-teeth`: two front teeth in `#f1ead9` below the muzzle. Its flat tail is 0.45 H wide (review of step 4, the weak species) | 4.3, 4.5 |
| The dog has a cream coat `#e6dfd1` with belly `#f3eee4`, and its floppy ears and the new face pattern `eye-patch` (one patch around the left eye) are `#8a5a36` (review of step 4, the weak species) | 4.3, 4.5 |
| The cat has two forehead stripes of 0.03 H in place of three of 0.05 H (review of step 4, the weak species) | 4.3 |
| A wind player shows one note: the last note that started, and the highest note of a chord (notes within 50 ms) (second re-review of step 2, P1) | 5.3 |
