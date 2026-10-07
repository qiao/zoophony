# Decisions of the play clearance

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-07, the user reported clipping arms several times ("the arms are clipping in rest
mode", "there's clipping between the hand and the bow"). The agent of the rest clearance fixed
the rest pose and found that the playing poses still clipped. A measure of each demo every
0.05 s, with the signed distance of the posed parts, found the forearm, the hand, or the lower
half of the upper arm in the body in 93% to 100% of the samples of each instrument but the
trumpet: up to 0.53 H in the torso for the bow arms, and up to 0.30 H in the thighs for the
winds. The agent of the play clearance decided the details below. The user can reverse each
one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| While the players play, the forearm, the hand, and the lower half of the upper arm keep at least 0.01 H from the torso and the head, and do not enter the thighs, as in the rest pose. `pose/play-clearance.test.ts` checks each second of the default demo with the bodies of `main`, each second from 0.5 s with the forearms of option B (0.17 H at the elbow and 0.15 H at the wrist), and the lift every 0.05 s. The test takes about 25 s. A full check of the six demos every 0.05 s takes 10 minutes on a loaded machine, so the test samples one demo | 5.2, 5.3 |
| The right elbow of a bowed string keeps the directions of its hold while the player plays, and the hand rolls to the elbow. The elbow of 2026-10-06 turned to the back of the hand, and the roll range of the hand then pulled it into the torso. The roll also snapped near the line of the stick: the hand of a violin turned 103,000° a second in the lift | 5.3 |
| On the violin and the viola, the right elbow points forward and down at the frog, (0.5, -1, -1), and out and up at the tip, (0.5, 1, -1), with an even turn over the bow range. In pizzicato, it points to (1, -0.5, -1). An elbow out to the side cannot reach: the arm is 1.35 H long, and the frog is only 0.88 H from the shoulder, so the elbow comes forward | 5.3 |
| The violin moves 0.08 H to the left, 0.05 H down, and 0.1 H forward while the player plays, and its right shoulder turns 20° (10° before). The viola moves 0.04 H forward. With no move, the bow hand at the frog on the lowest string went into the chin of the fox. A move of 0.16 H forward put the tip of the bow out of reach of the arm, and the nut of the viola out of reach of the left hand | 5.3 |
| On the cello and the contrabass, the right elbow points out and up, (1, 1.4, -0.3) and (0.5, 1, 0.5), and to the side in pizzicato, (1, 0, 0). The bow tip points up and to the left in pizzicato (up and to the right before). In the middle of a change between the bow and pizzicato, the elbow turns 0.3 of the way to the back of the hand, with `sin(π × change)`, so that the frog end of the stick stays out of the forearm | 5.3 |
| The cello moves 0.05 H forward while the player plays, so that the bow hand at the tip of a down-bow on the C string stays off the right thigh. A turn of 8° around the end pin also cleared the thigh, but it put the frog of the bow out of reach. A lift of the instrument floats the end pin, so the moves are flat | 5.3 |
| The contrabass is still open: at the tip of a down-bow on its low strings, the bow hand of the hippo goes up to 0.25 H into its belly, in 26% of the samples of the six demos (100% before, up to 0.54 H). A move forward put the nut out of reach of the left hand, a move to the right put the neck 0.028 m from the head, and a turn put the frog out of reach. It needs a new hold of the contrabass or a shorter bow stroke on the low strings | 5.3 |
| The winds hold their elbows out and forward, (±1, 0, -1), level with the line of the arm. The bassoon turns its lower end 20° forward and 20° to the right around the mouthpiece while the player plays. The mouthpiece stays at the mouth, so no wind instrument moves | 5.3 |
| The horn turns around the mouthpiece in its hold, with its lower end 10° forward and 10° to the right, and its coil moves 0.02 m to the left. Its coil and bell went 0.17 H into the right thigh of the pig. A larger forward turn put the left palm on the valves past 97% of the reach of the arm, so the horn keeps only 0.008 H from the thigh | 4.6 |
| The left hand of the conductor points 5° inward in the ready gesture of a count-in (10° before). With the forearms of option B, the left forearm came 0.8 cm from the head in the count-in of K. 525. It keeps 2.9 cm now | 5.4 |
| A turn of the bow in the hand does not take the frog end of the stick out of the forearms of option B on the cello and the contrabass: with turns of up to 15° around two axes, the frog end stays 0.013 to 0.03 H in the forearm. The violin and the viola stay within 0.0003 to 0.0018 H. The contact is in steady bowing on the A string near the frog, so it needs a new elbow or a new roll range on the floor strings before the forearms grow | 4.6, 5.3 |
| The test of the left hand of `pose/bowed.test.ts` poses the instrument offset of `poseBowed()`. It dropped the offset, so the instrument stayed in its bind place while the hand followed the play shift | 9.3 |
