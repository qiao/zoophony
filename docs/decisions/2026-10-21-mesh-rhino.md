# Decisions of the rhino mesh of the user

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-21, the user said: "use the following models: [...] 2. rhino: ...rhino...glb [...] make
the rhino and penguine stand. make sure the size of these models are similar to that of the
previous parametric model". The user slept, so the agent of the round `mesh-rhino` chose the rows
with no quote of the user by the measures and the user rules. The report
[`2026-10-21-mesh-rhino.md`](../research/2026-10-21-mesh-rhino.md) gives the measures, and its
folder keeps the variants. The user can reverse each decision. Then update its section, and
remove its row.

| Decision | Section |
|---|---|
| The user, quote above: the tuba rhino gets the mesh as a studio body (`tools/mesh-rigs/rhino.json`), with the pea eyes of the app (`SPECIES.rhino`). | 4.3, 4.4 |
| The user, quote above: the tuba player stands in each seat (`INSTRUMENT_SUPPORTS.tuba` `stand`), in the standing pose of the mesh, as a real tubist on a strap (`wind-technique.md` 3). | 4.4, 4.6, 5 |
| Each upper arm has a twist bone with the share 0.4, as the hippo. With no twist bone, the left upper arm rolled 63° to 82°, above the limit 55° (`upperTwist`). | 4.4, 4.7 |
| The tip of the nose is the front of the muzzle under the horn, so the mouthpiece is at the lips (`noseTop` of `ANIMALS`). | 4.4 |
| The lead pipe of the tuba is 0.25 m longer back and 0.1 m to the left, so the tuba stands under the long muzzle and the bell beside the horn (`SpeciesParams.tubaPipe`). | 4.6, 5.3 |
| Hold: the left shoulder turns 40° forward (the right shoulder: `2026-10-25-thick-arm-depth.md`), the lower end of the tuba 25° to the right, and the elbows point out and down (`RHINO_TUBA`, the left elbow: `2026-10-25-brass-grips.md`). | 5.3 |
| The left palm holds the main branch 0.17 m from its axis, so the thick paw closes on the tube (`tuba()`). Its fingers go 2.1 cm in, an accepted depth (`TUBIST_SWEEP`). | 4.6, 9.3 |
| At rest, the tuba moves off the mouth and its lower end turns 5° forward. No source gives the rest of a tubist (`RHINO_TUBA.rest`). | 5.2 |
| Colors: the mesh keeps its texture with no tone rule. Its gray is a little warmer and darker than `SPECIES_COLORS.rhino`, and no reference image shows a rhino. | 4.5 |
| Balance: the center of mass with an assumed tuba of 10 kg is 2.7 cm in front of the middle of the soles at a note, at 59% of the support depth (`balance.txt`). | 4.4 |
