# Decisions of the piano keys

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-28, the user said: "make the piano's keys press state match the midi track". Before
this round, the keys did not move. The sources of the values are in sections 7 and 10 of
[`piano-technique.md`](../reference/piano-technique.md). The user can reverse each decision. Then
update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "make the piano's keys press state match the midi track". The 88 keys are separate parts in MIDI order, and each key goes down with its notes (`addKeys()` of `models/instruments/piano.ts`, `pose/piano-keys.ts`). | 4.6, 5.3 |
| The key dip is 10 mm before `PIANO_SCALE`, as on real grand pianos (9.5 mm to 11 mm in the sources) (`PIANO.keyDip`). | 4.6 |
| A key turns around a line under the keys, 0.25 m behind the front of the white keys, at the height of the bottom of the white keys. A real balance pin is 0.22 m to 0.30 m behind the key front. The turn is 2.3° (`PIANO.balanceRail`, `PIANO_KEY_TURN`). | 4.6 |
| A black key turns by the same angle around the same line, so its front goes down 7.6 mm before the scale. No source of the round gives the dip of a black key (`PIANO_KEY_TURN`). | 4.6 |
| A key goes down in 0.03 s with a rising speed, and reaches the bottom at its note start. A real press takes 25 ms (forte) to 160 ms (piano). The paw strikes at full speed, so the press fits its last two frames (`KEY_MOTION.pressSec`). | 5.3 |
| A key comes up in 0.06 s after its note end. A free key of a grand comes up in about 35 ms, two frames at 60 frames per second, so the longer time shows the rise (`KEY_MOTION.releaseSec`). | 5.3 |
| Before a repeat of one key, the press and the release each take at most half of the time between the starts, and the key comes up the whole way. For a fast repeat, a real key comes up a third to a half (`KEY_MOTION.repeatShare`). | 5.3 |
| Two notes of one key that start within `CHORD_SEC` are one press, as one finger plays a unison of two voices (`pressesOf()` of `pose/piano-keys.ts`). | 5.3 |
| The white keys stand 1 mm apart, and the key bed under them shows through the gap. The front of the white keys stands 5 mm in front of the key bed, so the front face of a pressed key does not lie on it (`PIANO.whiteKeyGap`, `PIANO.keyOverhang`). | 4.6 |
| Each pianist mesh has a position attribute of its own, because two pianists of one model play different notes. It shares the other attributes and the morph attributes, so it adds no draw call and no material variant (`keyGeometry()` of `scene/player.ts`). | 4.6 |
| Each frame turns only the keys whose level changed, from their bind places, and uploads one range from the first changed key to the last. The normals keep their bind directions, because the turn is at most 2.3° (`applyKeys()` of `scene/player.ts`). | 4.6 |
