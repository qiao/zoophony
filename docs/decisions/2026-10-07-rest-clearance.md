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
| A standing player hangs its arms out to the side by the smallest angle that clears the torso and the legs of its mesh. The line from the shoulder to the wrist leans 24° out on the bodies of `main`, and 30° to 32° on the plump bodies of option B, with no new value | 5.2 |
| The rested violin, viola, and bows keep 0.02 m from the torso of option B (1.25 times wider on a large animal), so that the trunk agent can make the bodies plump. The violin and the viola stand at 0.8 of the way to the knee, on the top of the thigh: at 0.65 of the way and 0.1 H to the inner side, they touched the plump torso. With the rest place of 2026-10-06, the bow of the contrabass touched the plump torso of the hippo | 5.3 |
| A violin or viola soloist who stands hangs both arms and holds the instrument at the left side, with the scroll up. A standing body has no lap | 5.2, 5.3 |
| The winds move the instrument off the mouth in the rest pose, with a shift of the instrument bone and a tilt, in place of a rest on the lap. On the lap, the arms fold more, and a random search found no clear place for the clarinet, the flute, the horn, and the bassoon. The playing pose does not change | 5.3 |
| The horn comes up 0.29 H in the rest pose. Its bell and the right grip are inside the right thigh in the bind pose, so the right hand went 0.07 H into the thigh at each smaller shift. The playing pose keeps the bell in the thigh: a fix of the place of the horn belongs to `models/instruments/` | 5.3 |
| With the plump bodies of option B (the torso 1.1 or 1.25 times wider and deeper, the shoulders 0.53 H wide, and the elbow and the wrist 0.17 and 0.15 H thick), each arm part keeps at least 0.022 H from the trunk and the legs at rest. The test checks it, so that the next stages of option B keep the room | 5.2 |
| The rest clearance test does not check the lift and the playing pose. While the players play the default demo, the bow arms of the violins are inside the torso 67% to 85% of the time, up to 0.37 H, and the arms of the winds are in the thighs during the whole play. The playing holds need their own task | 5.3 |
