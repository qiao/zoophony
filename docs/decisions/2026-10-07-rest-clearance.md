# Decisions of the rest clearance

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-07, the user sent a side view of the violin sections before play: "the arms are
clipping in rest mode". The forearms and the upper arms of the rabbits, the foxes, and the polar
bear were inside the torso and the belly. A measure with the signed distance of the posed parts
found the same fault in each family: the right forearm of the violins 0.37 H in the torso, the
hanging arms of the standing players 0.25 H in the hips, and the winds up to 0.29 H in the
thighs. The agent of the rest clearance decided the details below. The user can reverse each
one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| In the rest pose, the forearm, the hand, and the lower half of the upper arm keep at least 0.01 H from the torso and the head, and they do not enter the thighs. The upper half of the upper arm does not count, because the shoulder ball sinks into the torso by design | 5.2 |
| The arms of the animals are long for their low laps: the shoulder is 0.38 H above the top of the thigh, and the arm is 1.35 H long. A hand on the lap folds the arm, so the elbow goes out to the side, about 0.95 H from the middle of the body. An elbow down beside the hip goes into the hip, and an elbow forward puts the hand past the knee | 5.2, 5.3 |
| The rest poles of the elbows have their own directions, and the direction turns from the rest to the hold at an even speed. A normalized linear mix moved a rotation part of the violin arm by 0.08 in 2 ms in the lift (limit 0.06) | 5.2 |
| The right hand of the harp player rests on the string of C4, 0.02 m off the strings. This reverses the right hand of the row "The pianist and the harp player rest the palms on the thighs" of `2026-10-06-rest-arms-and-bow.md`: on the right thigh, the hand went into the harp or the forearm into the belly | 5.3 |
| A violin or viola soloist who stands hangs both arms and holds the instrument at the left side, with the scroll up. A standing body has no lap | 5.2, 5.3 |
| The winds move the instrument off the mouth in the rest pose, with a shift of the instrument bone and a tilt, in place of a rest on the lap. On the lap, the arms fold more, and a random search found no clear place for the clarinet, the flute, the horn, and the bassoon. The playing pose does not change | 5.3 |
| The horn comes up 0.29 H in the rest pose. Its bell and the right grip are inside the right thigh in the bind pose, so the right hand went 0.07 H into the thigh at each smaller shift. The playing pose keeps the bell in the thigh: a fix of the place of the horn belongs to `models/instruments/` | 5.3 |
| The rest clearance test does not check the lift and the playing pose. While the players play the default demo, the bow arms of the violins are inside the torso 67% to 85% of the time, up to 0.37 H, and the arms of the winds are in the thighs during the whole play. The playing holds need their own task | 5.3 |
