# Percussion technique: how professional timpanists hold and move the mallets

This file is the target of the motion of the timpani player of the app. It describes the grip of
the mallets, the direction of the mallets between strikes and at a strike, the stroke, and the
playing spot of professional timpanists, with a source for each fact.

**Upkeep.** This file is current. It is not a record of one date, as a research report is. A
round that changes the timpani motion of the app updates this file in the same commit: section 5
"Use in the app", and each fact that the round finds wrong. Each new fact gets its source. The
decision file [`2026-10-19-elephant-grip.md`](../decisions/2026-10-19-elephant-grip.md) records
this rule. The research report
[`2026-10-19-elephant-grip.md`](../research/2026-10-19-elephant-grip.md) holds the measures of the
app.

**Source marks.** Each fact names its source by a number of section 6. "(abstract)" marks a fact
from an abstract or a search summary, because the full text did not open. "(secondary)" marks a
fact that another source quotes. "(derived)" marks a value that this file calculates from the
values of its sources. A fact with no mark comes from the text of the source.

## Terms

- **Fulcrum.** The point where the hand pinches the shaft, between the thumb and a finger. The
  mallet turns around it.
- **Butt end.** The end of the shaft opposite to the head.
- **Playing spot.** The place on the head where the mallet strikes.
- **V.** The angle between the two mallets, seen from above.

## 1. The grip

- The fulcrum is between the thumb and the index finger. The back fingers wrap the shaft
  loosely [1]. Wikipedia puts the fulcrum between the thumb and the middle finger [8
  (secondary)].
- The thumb lies flat along the shaft, and its nail points to the head [1]. In the French grip,
  the thumb points down the shaft toward the head [3]. Thus the head leaves the front of the fist,
  at the side of the thumb and the index finger, and the shaft lies along the thumb side of the
  hand (derived).
- The butt end sticks out about 0.5 to 1 inch (13 to 25 mm) behind the hand [1]. It stays loose
  in the palm, with some play between the butt and the hand [6].
- The fulcrum is about one third of the way up the shaft [12 (abstract)].

## 2. The three grips

| Grip | The hands | The stroke | The V between the mallets |
|---|---|---|---|
| German | The backs of the hands up, the thumbs in, toward each other [1] | From the wrist [1] | About 90° in front of the player [1] |
| French | The thumbs up [1] [3] | Mostly a turn of the forearm, as a turn of a door knob [1] [3] | About 20° to 30° [1]. The mallets are almost parallel [4] |
| American | Between the two: the thumbs and the palms at about 45° [1] [2] | A mix | Between 20° and 90° [1] |

Thus each mallet points forward and in, 10° to 45° from the straight forward direction (derived
from the V).

## 3. The mallet between strikes and at a strike

- The shaft is 10° to 25° from the drum head [3]. Peters gives about 10° above the head [2].
- The mallets do not go below the level [5].
- No source gives the height of the head between strikes. The heights of 12 inches [5] and 18
  inches [7] are drills.
- The upper arm hangs beside the body, and the elbow bends so that the mallet reaches the head
  [3]. The shoulders do not lift [1].
- The wrist has a small bend, which lets it turn [4].
- A timpanist can stand to play [11], or sit on a stool [4]. A stool can also be only a support to
  lean against [3].

## 4. The stroke and the playing spot

- The mallet lifts out of the head at once, because a long contact damps the tone [1]. The
  upstroke starts before the strike, as if the player pulls the sound out of the drum [3]. The
  stroke is a toss with a natural rebound [5].
- The stroke turns the wrist, and the arm moves little [4] [10]. The arm moves more in loud
  play [10].
- The playing spot is about 2 to 4 inches (5 to 10 cm) in from the rim [2] [5], or one third of
  the way from the rim to the middle, about 4 inches [3] [9]. A spot 6 inches or more in gives a
  dead tone [5].
- The spot is directly in front of the player [7]. The smallest drum plays nearer the rim, at
  about 2 inches [7].
- The two mallets strike about 6 inches (15 cm) apart [4], in the same area of the head [7].

## 5. Use in the app

The elephant plays the timpani of the app (`PERCUSSION_HOLDS.timpani` of
`src/pose/percussion-rig.ts`, `TIMPANI` of `src/models/instruments/percussion.ts`). Each item
gives the rule of the app, or where the app differs from sections 1 to 4. A round that changes the
motion updates the items.

- **The grip.** The app differs. The head of each mallet leaves the back side of the fist, at the
  side of the little finger (`TIMPANI.malletBack`), so that the paw does not twist on the
  forearm. A real player holds the head out of the front of the fist (section 1).
- **The direction between strikes.** The app differs. Each mallet points 27° to 30° up and 52°
  to 55° out to the side of its hand (`PercussionHold.across`). A real mallet points forward and
  in, and does not go far above the level (sections 2 and 3).
- **The stroke.** The head lifts before the note, comes down at its full speed at the note
  start, and rebounds (`STRIKE_MOTION` of `src/pose/strikes.ts`), as section 4 gives.
- **The playing spot.** The app differs. Each mallet strikes 0.25 m in from the near rim
  (`PercussionHold.rim`), because the short arms of the elephant hold the paws above the near
  rims, as the user chose (`docs/decisions/2026-10-19-elephant-pose.md`). A real player strikes
  5 to 10 cm in (section 4). Each hand plays only the front kettle on its side of the trunk
  (`PercussionHold.pair`), so the two mallets never strike one head together.

## 6. Sources

Each source opened on 2026-10-19, except where a fact has a mark of section "Source marks".

1. "3 Timpani Grips", The Instrumentalist, December 2014.
   https://theinstrumentalist.com/december-2014/3-timpani-grips/
2. R. Peters, "Timpani", Bandworld Magazine, vol. 9, no. 5, 1994.
   https://bandworld.org/pdfs/TimpPeters.pdf
3. "The Timpani Companion", Monocacy Middle School, Bandworld.
   https://bandworld.org/pdfs/TimpCompanion.pdf
4. J. Lawless, "KSU Masterclass: Timpani Techniques", Kennesaw State University, 2020.
   https://kennesaw.edu/arts/academics/music/docs/ksu-masterclass-timpani-techniques.pdf
5. D. Collier, "Timpani Teaching Tips", Yamaha, 2021.
   https://hub.yamaha.com/music-educators/instruments/perc/timpani-pedagogy
6. J. McCarthy, "Some Notes on Timpani Technique", Percussion Clinic Adelaide.
   https://www.percussionclinic.com/art_timptech.htm
7. A. Proctor, "Where is the Best Playing Spot on Timpani?" and "How to Develop Your Timpani
   Stroke", Free Percussion Lessons.
   https://freepercussionlessons.com/where-is-the-best-playing-spot-on-timpani
8. Wikipedia, "Timpani". https://en.wikipedia.org/wiki/Timpani
9. A. Graham, "Proper Playing Areas", The Instrumentalist, September 2017.
   https://music.ubc.ca/wp-content/uploads/sites/47/2022/05/2017-09-01ProperPlayingAreas-AaronGraham-TheInstrumentalist.pdf
10. A. Proctor, "Timpani Grip and a Simple Exercise", Free Percussion Lessons.
    https://freepercussionlessons.com/timpani-grip-and-a-simple-exercise/
11. K. Dustman, "Exploring the Mystery of Playing Timpani", SBO+, 2020.
    https://sboplus.net/?p=9243
12. J. Huling, "Timpani FUNdamentals", Maryland/Delaware Percussive Arts Society, 2012 (a search
    summary only).
