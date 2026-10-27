# Wind technique: how professional wind and brass players hold and move their instruments

This file is the target of the motion of the wind and brass players of the app: the flute, the
oboe, the clarinet, the bassoon, the horn, the trumpet, the trombone, and the tuba. It describes
the hold, the angles, the hands, the trombone slide, the breath, the rest pose, and the seated
posture of professional players, with a source for each fact. The trombone has the most detail,
because the panda plays it now.

**Upkeep.** This file is current. It is not a record of one date, as a research report is. A
round that changes the wind motion of the app updates this file in the same commit: section 4
"Use in the app", and each fact that the round finds wrong. Each new fact gets its source. The
decision file [`2026-10-18-wind-technique.md`](../decisions/2026-10-18-wind-technique.md) records
this rule. The research report
[`2026-10-18-wind-technique.md`](../research/2026-10-18-wind-technique.md) holds the measures of
the app and the motion spec of the fit round of the panda.

**Source marks.** Each fact names its source by a number of section 5. "(abstract)" marks a fact
from an abstract or a search summary, because the full text did not open. "(secondary)" marks a
fact that another source quotes. "(derived)" marks a value that this file calculates from the
values of its sources. The probe `docs/research/2026-10-18-wind-technique/probe.py` makes each
derived value of the trombone. A fact with no mark comes from the text of the source.

## Terms

- **Position.** The place of the trombone slide. The first position is the closed slide. Each
  position further out lowers the pitch by one semitone, to the seventh position [1] [8].
- **Partial.** One note of the harmonic series of the tube. A brass player moves from one partial
  to the next with the lips and the air, with no change of the slide or the valves [8].
- **Alternate position.** A second position for the same note, on a higher partial [8].
- **Slide brace.** The cross bar of the moving slide. The right hand holds it [1].
- **Slide lock.** The lock near the mouthpiece that holds the slide closed [1].
- **Legato tongue.** A light stroke of the tongue, as the syllable "lah" or "dah", that divides
  two slurred notes while the slide moves [1] [12].
- **Natural slur.** A slur where the slide moves against the direction of the pitch. It needs no
  tongue [12].
- **Rest pose.** The pose of a player while the instrument is off the mouth.
- **Ready pose.** The pose of a player just before the instrument goes to the mouth.

## 1. Trombone

### 1.1 The hold

- **Weight.** The left hand holds all the weight of the trombone. The right arm holds no weight
  and only moves the slide [1] [2] [3].
- **Left hand.** The thumb and the index finger make an "L" [1] [5], "a little bit like a finger
  gun" [2]. The thumb wraps around the bell brace, the index finger lies along the mouthpiece
  brace or the leadpipe and points to the mouthpiece, and the other three fingers wrap around the
  slide tubes between the mouthpiece brace and the slide brace [1] [2] [5].
- **Left arm.** "Keep the left forearm as a pillar of support: make it more vertical", with no
  "chicken wing" elbow [4]. The bell does not rest on the left shoulder, and the left arm holds
  the weight [1] [5]. One source disagrees: "The instrument is placed on the left shoulder and
  held with the left hand on the upper cross brace" [7].
- **Right hand.** The tips of the thumb, the index finger, and the middle finger hold the slide
  brace, and the other two fingers curl into the palm with no contact [1] [3]. The grip is light,
  and the fingers turn around the brace as the wrist makes small adjustments [1]. The thumb stays
  on the brace, with "NO throw and catch" [3]. The wrists stay "straight and in line with your
  arms" [2]. The right hand does not touch the bell [3].
- **Right thumb and fingers on the brace.** "Place your thumb on the top of the hand slide brace
  and your fingers on the bottom" [2], and "Let the slide weight rest on the fingers with the
  thumb easily on top" [4]. One teacher pinches the brace "at the bottom corner", and keeps "your
  other fingers below the slide" [64]. "Let ring and little go beneath bottom slide tube" [61].
  Thus the thumb points up the brace, on its side near the player (derived).
- **Right palm.** The sources disagree. "Palm faces floor. Wrist remains straight" [61]. "Palm
  facing the chest", with the thumb and the first two fingers "towards the bottom of the brace"
  [62]. Burtis gives a range: the common grip turns the wrist "sideways in relation to the face",
  and a rarer grip turns "the bottom of the wrist" to the player, with "many degrees of rotation
  between these two extremes" [63]. At the seventh position, the "palm faces slide tube", "as if
  you were reaching out a long way to shake someone's hand" [61]. No source of this file puts the
  palm toward the audience or the thumb under the brace.
- **The bell.** The angle between the slide and the bell section is a little less than 90° [1]
  [6].
- **The angle.** The trombone "must be pointed toward the audience", and "Do NOT point it down
  toward the ground" [4]. A bell-front brass instrument does not go "above a position parallel to
  the floor", because that posture adds tension [1]. No source of this file gives the angle of the
  slide below the level, or to the side, in degrees.
- **The head and the torso.** The back stays straight and the head up. Many trombonists slump to
  the left with the torso or the neck, and this posture limits the air and the slide [1]. Look
  straight forward [4].
- **The stand.** The slide and the bell stay at the left of the music stand and out from under
  it, so that the player sees the conductor [4].
- **The side.** Stand "next to" rather than "behind" the trombone, so that the joint of the
  collarbone and the breastbone can help the slide arm [3].

### 1.2 The slide positions

The tube of a B♭ tenor trombone is 9 ft (2.74 m) with the slide closed [8]. The slide is a U, so
a move of the slide by d adds 2d of tube. Thus position n is `2.74 m / 2 × (2^((n−1)/12) − 1)`
from the first position (derived).

| Position | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| Distance from position 1 (derived) | 0 | 8.2 cm | 16.8 cm | 26.0 cm | 35.7 cm | 45.9 cm | 56.8 cm |
| Step from the position before (derived) | | 8.2 cm | 8.6 cm | 9.2 cm | 9.7 cm | 10.3 cm | 10.9 cm |

- **Steps.** "The distance between positions gradually increases from 3″ for 1st to 2nd position
  to just over 4″ for 6th to 7th position" [1], that is 7.6 cm to more than 10.2 cm. Another
  source gives about 3¼ in (8 cm) for each step [8]. The derived steps grow from 8.2 cm to
  10.9 cm.
- **Landmarks.** The third position is about at the rim of the bell, and the fourth position is
  "about 10 cm lower" [7]. The derived step from the third to the fourth position is 9.2 cm.
- **Measures.** The fifth position extends the slide "by around 0.4 m" [11]. Three bass
  trombonists moved the arm "ca. 38 cm" from the first to the fifth position, and "ca. 20 cm"
  from the third to the first position [9]. The derived values are 35.7 cm and 16.8 cm.
- **Full travel.** The slide moves "approximately two feet" (61 cm) from the first to the seventh
  position [18]. The derived travel is 56.8 cm. The page of [7] gives no total length.
- **Tuning.** Each position moves a little with the partial. The fifth partial is flat on most
  trombones and needs a slide a little shorter. The seventh partial (A♭4 in the first position)
  is "nearly always 31 cents" flat, and the player corrects it with the slide or with an
  alternate position [8]. "There is some variance in the exact location of positions based upon
  partials" [1].

### 1.3 Alternate positions

- B♭3 plays in the first or the fifth position [8]. F4 plays in the first, the fourth, or the
  sixth position [8].
- Trombonists use alternate positions often, to move the slide less in fast passages, and for a
  glissando to or from a higher note on the same partial [8]. For high notes, the player needs
  only the first four positions [8].
- One teacher uses alternates "primarily to create or avoid slurs" [3]. He does not choose them
  for the direction or the distance of the slide [3]. A natural slur needs no tongue, so an
  alternate position that moves the slide against the pitch gives a natural slur [12].
- The F attachment, a valve that the left thumb works, gives alternate positions for the long
  positions [1] [8].
- **The seventh partial (derived).** A player who does not use the flat seventh partial plays
  A♭4 in the third position, G4 in the fourth position, and F♯4 in the fifth position, from the
  eighth partial (B♭4). The probe gives the positions of D4 to B♭4 (section 4 of `probe.txt`).

### 1.4 The arm for each position

- **The joints.** Four joints move the slide: the wrist, the elbow, the shoulder, and the joint
  of the collarbone and the breastbone [3].
- **The wrist and the elbow.** "The wrist leads the movement for the slide." "The larger the
  movement of the slide is, the more involvement is introduced from elbow." An exercise moves the
  slide from the first to the second position with the wrist only [1].
- **The shoulder.** "Very little movement should occur from the shoulder, which should be limited
  to 6th and 7th positions" [1]. Another teacher writes: "Most of the work happens in your elbow
  and shoulder, only a small amount in your wrist", and the wrist acts "like a hinge that snaps
  the slide into position" [3]. The two sources give the wrist and the shoulder different shares.
- **The far positions.** "Due to the length of the slide, students need to have long enough arms
  to reach the outer positions", and grip extenders exist for short arms [1]. The far positions
  "require a correspondingly long arm and some space" [7]. At the seventh position, the player
  can change the thumb for the ring finger on the brace [3]. Thus the arm is at its full reach
  at the seventh position.
- **The path.** The slide moves straight in and out, "with NO CURVES" [3].
- **Measured angles.** One trombonist (the author of [18]) played standing in a motion capture
  test, with the slide from the first to the sixth position. The right elbow flexion went from
  114° to 28°, and the right shoulder flexion from 16° to 45°. In a second test, the right elbow
  went from 125° to 17°, and the right shoulder from 35° to 70°. The left elbow stayed between
  120° and 131°, and the left shoulder flexion moved in a range of 27° in the first test and 4° in
  the second test. The largest range was the turn of the right wrist, 133°. 0° is the straight
  arm of the anatomical position [18].
- **The left side is still.** "The LUE is assumed to face primarily static loading, with the right
  facing dynamic loading" (LUE: the left upper extremity). The slide moves "approximately two
  feet from slide positions one through seven", with the fingers, the wrist, the elbow, the
  shoulder, and the shoulder blade [18].
- **The head and the trombone.** In seven players, the neck flexion varied with "the individual
  player tendency for degree of downward angulation of the overall instrument", and the players
  tend "to hold the instrument straight forward" [18].

### 1.5 The slide move

- **Fast.** The slide moves fast between the positions, so that no glissando sounds between the
  notes [1]. The right arm is "quick and precise, yet relaxed" [3]. "The slide has to move just
  as quickly going from 1st to 6th position as it does from 1st to 2nd position" [12].
- **Late.** "Strive to move the slide as late as possible!" [13]. "Move the slide in rhythm at
  the start of the next note" [3]. "Move the slide as you articulate the note so that you're there
  on time", and keep each position "for the longest possible time, even with staccato notes" [14].
- **The stop.** The slide stops in the position of each note. Only extremely fast staccato
  passages are an exception [3].
- **Legato.** When the slide and the pitch move in the same direction, the player tongues
  lightly, so that no smear sounds [12]. "The tongue merely interrupts the air flow as lightly as
  possible while the slide moves as quickly as possible" [1]. A natural slur needs no tongue [12].
  One trombonist warns against a fast "flick" of the slide for every slur: "move it
  whatever speed it takes to get the smoothest, most beautiful slur you can imagine", with the air
  "with (or preferably ahead) of" the slide [15].
- **The time of a legato change.** Three professional bass trombonists played legato changes from
  the first to the fifth position in two excerpts of Bruckner. The change of the sound, from the
  decay of the first note to the end of the attack of the next note, took 98 ms on the mean. With
  the second valve in place of the slide move, it took 60 ms [9].
- **Speed.** "Measurements of the motion of the slide in trombone playing suggest that speeds of
  around 2 m/s are sometimes exceeded", and "peak velocities tend to be roughly proportion to the
  total distance travelled" [10 (secondary)].
- **The two measures (derived).** A move of 35.7 cm in 98 ms needs a mean speed of 3.6 m/s. A
  full move of 56.8 cm at a mean of 2 m/s takes 0.28 s. The sources measure different things: [9]
  measures a change of the sound, and [10] quotes the speed of the slide.

### 1.6 The breath

- **The mouth.** Brass players breathe in through the mouth [1] [6].
- **What moves.** The rib cage expands across its width, and the expansion goes down into the
  lower torso. "The shoulders should not move when breathing deeply" [1]. A student who raises
  the shoulders breathes shallowly [1]. With the arms away from the body, "the arms should not
  need to move" in a deep breath [1].
- **The order.** Before a long note, "the thorax and abdomen expand in preparation for playing the
  long note. The abdomen reaches its maximum expansion first" [16].
- **Standing and sitting.** In 113 woodwind and brass players, the chest expanded more when they
  stood, and the abdomen less than in each seated posture [17].
- **The time.** A breathing exercise shortens the breath in from 4 counts to 2 counts, then to 1
  count [1]. In a medium 4/4 tempo, the player breathes in on beat four [24]. Reed players
  took breaths of "typically about 300 ms" [38]. A breath of one beat at 100 to 150 bpm takes
  0.4 s to 0.6 s (derived).

### 1.7 The rest and the ready pose

- **The slide lock.** "When not in use, the slide lock beneath the mouthpiece should always be
  locked" [1]. The set-up of a lesson starts with the slide lock engaged [5].
- **On the floor.** A trombone on the floor rests on three points, the bell, the mouthpiece or the
  leadpipe, and the tuning slide, and never on the slide [6].
- No source of this file gives where an orchestral trombonist holds the trombone between two
  entrances, or how long before an entrance the player lifts it.

### 1.8 The seated posture of a brass player

- Sit balanced and upright, "Do NOT lean against the back of the chair", and keep the feet flat on
  the floor [4].
- The torso stays symmetrical, with no twist. Once seated, the shoulders stay over the hips [1].
- Brass players are "often instructed to sit 'as if you are standing'". A player can also "sit on
  the front edge of a flat seat, holding the trunk erect and allowing the thighs to slope
  downward" [16].
- The abdominal muscles work less on a flat or a downward sloping seat than in standing [16]. In
  [17], the abdominal muscles worked at about 2/3 of the level of standing, and the
  players preferred to stand.
- The arms stay away from the rib cage, so that the rib cage can expand [1].

## 2. Trumpet, horn, oboe, and flute

### 2.1 Trumpet

- **The hold.** The left hand holds the weight [1] [21]. It holds the valve casing, with the ring
  finger (or the middle finger) in the ring of the third valve slide, and the thumb in the saddle
  of the first valve slide [1] [19] [20]. The valve casing stays vertical [21]. "With the right
  hand vertical and the left hand horizontal, this reflects the proper position for the
  instrument" [20].
- **The right hand.** The index, the middle, and the ring finger rest on the valves 1, 2, and 3,
  with the fingertips and arched fingers [1] [20]. The sources disagree on the right thumb: under
  the leadpipe between the first and the second valve casing [1] [19] [20], or "ON the first
  valve" [21]. The little finger stays on top of the finger hook or floats free. The hook is only
  for one-handed playing [1] [19] [20].
- **The angles.** "Keep the Trumpet angled slightly down" [19]. The angle of the trumpet to the
  plane of the face "generally should be slightly less than 90 degrees", and the elbows are at
  about 45° to the ground [22]. A bell above the level is a fault of an exaggerated posture, as in
  a marching band [1].
- **The fingering.** The written D4 and C♯4 use the valves 1-3 and 1-2-3, the written E♭4 uses
  2-3, and the written A5 uses 1-2 [1].
- **The breath.** The shoulders stay down [22] [39]. The player breathes in through one corner of
  the mouth, with the mouthpiece on the lips [23]. The breath relates to the tempo: "In a medium
  4/4 tempo, inhaling on beat four will feel natural and allow a full intake of air", over beats
  three and four in a fast tempo, and on the upbeat after beat four in a very slow tempo [24].
- **The rest.** No source of this file gives the rest of an orchestral trumpet player.

### 2.2 Horn

- **The left hand.** The left hand holds the weight and works the valves. It has the shape of a C,
  with the little finger in the finger hook, the index, the middle, and the ring finger on the
  valve levers, and the thumb on the B♭ valve of a double horn [1] [25]. The left hand is at the
  middle of the body and below the face, and the horn goes from the middle of the body to the
  right side [29]. Tuckwell keeps the elbows near the body [28 (secondary)].
- **The right hand.** The right hand goes into the bell, relaxed, with the fingers together, "as
  though it were to be used to cup water". It rests against the bell wall at about 2 o'clock
  [1] [29]. Farkas holds the hand vertical, with the backs of the fingers on the far side of the
  bell, and the thumb against the top of the throat, "so that the horn is partially supported by
  it" [26 (secondary)]. The weight of the bell rests on the knuckles of the thumb and the index
  finger [1] [25].
- **The angles.** The horn lies at about 45° across the body, with the bell at the right of the
  torso and in front of it [25]. The mouthpiece slopes down [29]. The bell points past the right
  side of the body, so that the stomach does not mute it [1]. Tuckwell turns the head to the left
  to meet the mouthpiece [28 (secondary)].
- **The bell on the leg.** The sources disagree. Farkas sat with the lower rim of the bell on the
  outer side of the thigh [27 (secondary)]. Tuckwell holds the horn free of the body, also when
  seated [28 (secondary)]. "The weight of the instrument should be on the hands, and not placed on
  the leg" [1]. "Ultimately, most horn players will support their bells with their right arms"
  [25].
- **The breath.** The sources disagree on the corners of the mouth. Farkas stretches the mouth
  into a wide smile with the lips on the mouthpiece, Wekre writes "No smiling when inhaling!", and
  other teachers drop the jaw off the mouthpiece [31 (secondary)].
- **The rest and the ready pose.** The horn rests on the lap, with the bell to the right [25],
  and the leadpipe and the mouthpiece up on the left side [30]. Then the players "raise their
  horns into playing position" [25]. No source gives the time of the lift.
- **The open notes.** The F horn is a tube of about 3.7 m (12 ft) [57]. Its fundamental is F1
  (MIDI 29), written C2 [1] [56] [57]. Freund and Cutler call it "unplayable" on the F side [56].
  Horn parts are written in F and sound a perfect fifth lower [56]. Thus the open notes are the
  written C3, G3, C4, E4, G4, and C5: the partials 2 to 6 and 8 [1] [57].
- **The fingering of the F horn.** The single F horn chart of Weidner lowers an open note by 1 to
  6 semitones with the valves 2, 1, 1-2, 2-3, 1-3, and 1-2-3 [55]. Up to the written C5, each note
  takes the nearest open note at or above it. Above the written C5, the chart takes only the 10th,
  12th, and 16th partials (written E5, G5, and C6). It plays C♯5 with 1-2, D5 with 1, E♭5 with 2,
  F5 with 1, F♯5 with 2, A♭5 with 2-3, A5 with 1-2, B♭5 with 1, and B5 with 2 [55].
- **The partials out of tune.** On the F horn, the 7th, 11th, 13th, and 14th partials (written
  B♭4, F♯5, between A♭5 and A5, and B♭5) are more than 30 cents out of tune. The 9th partial (D5)
  is within 5 cents, and the 15th (B5) is less than 16 cents flat [57]. Patterson writes that on
  the natural horn the written B♭4, F♯5, and A5, the 7th, 11th, and 13th partials, "sound quite
  flat" [56 (secondary)].
- **The double horn.** "All advanced players use the double horn" [56]. Its thumb valve changes
  the horn from F to B♭, and "pitches above g4 utilize the Bb trigger fingerings" [1].

### 2.3 Oboe

- **The hold.** The right thumb under the thumb rest carries the weight of the oboe [32] [34].
  The base of the thumbnail is under the thumb rest, and the left thumb touches the back of the
  oboe below the octave key [33]. One source shares the weight between the two thumbs and the
  embouchure [33].
- **The angle.** The oboe is at about 45° from the body [32] [34], or at about 40° [33]. Oboists
  outside the American school hold it "a few degrees closer to horizontal" [35]. The oboe comes to
  the mouth, and the head stays up [32] [34]. The oboe never rests on the knee in play [34].
- **The arms and the fingers.** The arms stay a little away from the sides, so that the rib cage
  can expand [33] [34]. The fingers curve in a C shape, and the pads of the fingers touch the keys
  [33]. Ray Still, former principal oboe of the Chicago Symphony, drops the wrists and keeps the
  arch of each finger the same when it opens and closes a key [37].
- **The elbows.** "Arms should hang loosely and comfortably from your shoulders. Your elbows do not
  need to stick out when you play the oboe nor do they need to be "held" close to the body" [65].
  "Keep the shoulders relaxed and low", and "Neither tuck the elbows in nor stick them out
  excessively" [66]. "The elbows and hands are free from the body" [33]. Thus the elbows hang
  below the shoulders, a little out from the sides (derived). No source gives the angle of the
  upper arm.
- **The breath.** The oboe needs little air, so an oboist breathes out the stale air before the
  next breath in [36] [39]. Reed players (oboe, bassoon, clarinet, and alto saxophone) took
  breaths "typically about 300 ms long" [38].
- **The rest.** In a long rest, the oboe lies across the legs with the tone holes up. In a short
  rest, the right hand holds it vertical on the right leg [33].

### 2.4 Flute

- **The hold.** Three points balance the flute: the lower lip and the chin, the base of the left
  index finger, and the right thumb [6] [44]. The left index finger is the fulcrum [41]. The
  sources disagree on the right thumb: Rockstro puts its tip on the inner side of the flute, to
  the right of the first finger [47 (secondary)], and Kincaid uses it to support the flute
  [46 (secondary)]. Only the fingers move [43] [46].
- **The right hand.** The right thumb is "directly under and in between the first and second
  fingers", the right hand "forms a C", and the right fingers do not "grab" the flute [46]. Thus
  the thumb lies under the flute or on its side toward the player, the fingers lie on the keys on
  the top, and the right hand comes to the flute from the side of the player, below and behind it
  (derived).
- **The angles.** "A flutist will have to turn his head laterally about 30 degrees", and the
  flute lies about square to the face [40]. The flute slopes down to the right by "approximately
  the width of the hand" from the level [45]. "The flute is angled down and the player's head is
  tilted toward the right ear" [6]. George names "The flute should be parallel to the floor with
  the elbows held high" as a thing that a teacher must not tell a student [43].
- **The body.** With the feet of George, "the body is facing 45 degrees to the right", the player
  turns the head to the left, and "The arms should be hung" [43]. A seated player turns the chair
  a little to the right [46]. Seated, the elbows and the shoulders stay low [40].
- **The breath.** In four standing professional flutists, the inspiratory muscles held the rib
  cage at a high lung volume while they played [48 (abstract)]. Debost keeps the rib cage expanded
  when the note starts [41]. Flutists use their air fast and hide large breaths at ties and gaps
  [39].
- **The rest.** The flute stands "vertically on the right leg with the right hand on the
  right-hand keys" [42].

## 3. Clarinet, bassoon, and tuba

- **Clarinet.** The clarinet is at the middle of the body, at about 45° from the body [49] [50]. It
  goes "from the mouth to between the knees" [6]. The right thumb under the thumb rest carries the
  weight, and the head does not tilt toward the clarinet [49] [50]. In a deep breath, the chest
  expands and the shoulders stay still [49]. In a rest, a seated player takes the weight off the
  right hand: "Put that right thumb on top of the thumbrest and the bell on your chair or knee",
  or "on your seat between legs or on your knee" [60]. The same teacher does not put the clarinet
  on the legs when he stands [60].
- **Bassoon.** The bassoon lies diagonal in front of the player and hangs on a seat strap, a neck
  strap, or a harness [52]. Most American bassoonists sit on a seat strap, with the bassoon on the
  right thigh [51]. The left hand is above the right hand, and the right hand rests against the
  crutch [52]. The bocal brings the reed to the mouth "at a nearly horizontal angle" [35], and the
  reed "enters straight into the mouth—not at an angle" [51]. The head and the torso stay
  "straight and upright", "not tilted to one side or the other", and the music stand stands so
  that the player reads "to the right side of the bassoon bell" [51]. Thus the boot rests at the
  right thigh, and the bell rises at the left of the line of sight, at the height of the eyes or
  above (derived). Three points carry the bassoon: "The seat strap The right thigh Base of the
  left index finger", and "the boot joint should fit in the palm of your right hand" [67]. A wet
  bassoon "is positioned vertically during play", and a horizontal place after the performance
  "can be a problem" for the wood [68]. No source of this file gives the rest between two
  entrances.
- **Tuba.** The tuba rests on the thigh, between the legs on the chair, or on a stand, and the
  player sits on the front of the chair with a stand [1] [53]. The right hand works the valves
  [54]. The left hand grips the tubing at the side of the tuba: on a rotary tuba "with her
  knuckles facing left", and on a piston tuba it wraps the valve tubing "with his knuckles facing
  out" (opened 2026-10-25) [53]. The bell is at the left of the head on a rotary tuba and at the right of the head on a
  piston tuba [53]. The player brings the tuba to the body, with no change of the back, the neck,
  or the head [1]. The tuba can be at a slight angle for the embouchure [1]. No source of this
  file gives the rest between two entrances.
- **Standing tuba.** A player who stands carries the tuba on a strap or a harness. A tuba strap is
  "Suitable for playing whilst standing and for playing whilst marching", and its weight "is
  evenly distributed across both shoulders" [58]. A tuba harness "was designed to meet the needs
  of tuba players who prefer to play standing or marching", for "a more stable and upright playing
  position" [59]. Thus the hands of a standing player carry no weight, as in the seat (derived).

## 4. Use in the app

Since 2026-10-18, this file is the target of the wind motion of the app. Each row gives the rule of the app and its code, the reference, and the
verdict: "matches", or the difference with a measure. The research report
[`2026-10-18-wind-technique.md`](../research/2026-10-18-wind-technique.md) gives the measures and
the motion spec T1 to T7 of the fit round of the panda. A round that changes the motion updates
the rows.

### 4.1 The trombone of the panda

| Rule | App | Reference | Verdict |
|---|---|---|---|
| Grips (`PANDA_TROMBONE`, `palmL`, `palmR`, `tubeL`, `tubeR` of `models/instruments/brass.ts`) | The left palm faces the inner slide tubes near the mouthpiece brace (`faceTube`, `gripShiftL`). The right paw holds the low part of the upright slide brace from the right side of the panda, the far right side of the brace, with the palm to the left and a little toward the player, and the thumb up the brace. The paw points 0.8 of the way along the slide (`gripShiftR`, `aimSide`), and the right elbow points down (`poleR`, `restPoleR`). Both paws keep this hold at rest (`restAim`) | The left hand holds the weight, and the right hand only moves the slide. The tips of the right thumb and the first two fingers hold the brace, the thumb on the top. The palm faces the floor, the chest, or the side (1.1) | Matches. The right palm faces the audience by -0.17 (toward the player) and the right thumb tip points 5.8 cm up the brace. The paw grasps in each sample of each set (`pnpm wind-grip trombonist`, `docs/research/2026-10-25-wind-elbows.md`). Before 2026-10-25, the right palm faced the audience (+0.93) and the right thumb pointed 6.5 cm down the brace |
| Fingers (`gripCurl` of `PANDA_TROMBONE`) | The paws have one finger bone. The left fingers curl 90° around the tubes, and the right fingers 110° around the brace | An "L" of the left thumb and index finger, and three fingertips on the slide brace (1.1) | Differs: the mittens show no "L" and no single fingertips |
| Left arm (`reachL`, `poleL` of `PANDA_TROMBONE`) | The left shoulder turns 15° forward, and the left elbow points down and forward | A vertical forearm as a pillar, with no "chicken wing" (1.1) | Matches |
| Slide angle (`PANDA_PLAY`, `play` of `PANDA_TROMBONE`) | 10° below the level and 45° to the right, 46° from the front. `WIND_HOLDS.trombone` has 15° below the level, straight ahead | Toward the audience, and never down to the floor. Straight forward (1.1, 1.4). No source gives degrees. The pandas of `orchestra-latest.png` hold it forward and about level | Matches the level. Differs: 45° to the side. Straight ahead, the panda arm reaches 0 to 3.5 cm of the slide travel (`docs/research/2026-10-25-grips.md`). Before 2026-10-25, the slide pointed 35° below the level, as the user chose in `2026-10-18-trombone-fit.md` |
| Bell (`trombone()` of `models/instruments/brass.ts`) | The bell section lies beside the slide, at its left (`side`) | The bell section at a little less than 90° to the slide (1.1) | Matches. This file gives no angle of the app |
| Head (`headTurn` 0) | The head stays square and upright at the mouthpiece | The head up, with no slump to the left (1.1) | Matches |
| Slide reach (`slideReachOf()`) | 0.105 m for positions 1 to 7, with the right arm straight at position 7 | 0.568 m (1.2, derived) | Differs: 18% of the real travel. The paw at the far side of the brace keeps the palm off the audience, and costs 0.065 m of the 0.17 m of the grip on the mouthpiece side (`docs/research/2026-10-25-wind-elbows.md`). On that grip, 60° to the right gave 0.26 m and 90° 0.455 m (`docs/research/2026-10-25-open-grips.md`) |
| Steps (`slideTravel()` of `pose/wind-notes.ts`, `poseWind()`) | Steps in the ratio of the real distances: from 1.52 cm to 2.02 cm on the reach of 0.105 m (derived) | Steps that grow from 8.2 cm to 10.9 cm (1.2) | Matches. The steps keep the real ratio on 18% of the travel |
| Positions (`slidePosition()`, `PARTIALS` of `pose/wind-notes.ts`) | The lowest position on the partials of B♭1, with no seventh partial. F♯4, G4, and A♭4 in positions 5, 4, and 3 | The seventh partial is 31 cents flat. From the eighth partial, positions 5, 4, and 3 (1.2, 1.3, derived) | Matches for D4 to B♭4 |
| Alternate positions | None | B♭3 in 5, F4 in 4 or 6, for fast passages and slurs (1.3) | Differs |
| Arm (`armRig()`, `reach` 45° of `WIND_HOLDS.trombone`) | The two-bone IK moves the elbow most. The right elbow flexion goes from 77° at position 1 to 30° at position 7, a range of 48°, and the arm is at its full reach at position 7 | The wrist leads, the elbow takes the larger moves, and the shoulder joins at 6 and 7. One player: the right elbow went from 114° or 125° at position 1 to 28° or 17° at position 6 (1.4) | Differs: the elbow range is about half of the real range, and the elbow is about 40° more open at position 1. These angles are of the slide of 2026-10-18, with a longer reach. No round measured them on the slide of 2026-10-25 |
| Slide time (`WIND_MOTION.slideSec`, `moveTo()`) | At most 0.1 s, with a smooth start and stop, and the end at the note start. The slide stops in each position | Late and fast, on time at the note start, a stop in each position. Legato changes from 1 to 5 took 98 ms (1.5) | Matches |
| Slide speed | Proportional to the distance. A full move peaks at 2.32 m/s | Around 2 m/s, sometimes more, and the peak grows with the distance (1.5) | Matches |
| Breath time (`inhaleSec`, `PHRASE_GAP_SEC`) | 0.4 s, which ends at the first note of a phrase after a gap of at least 0.5 s | One beat, 0.4 s to 0.6 s at 100 to 150 bpm (1.6, 2.1, derived) | Matches |
| Breath motion (`WIND_BODY.breath`, `writeBody()` of `pose/pose-at.ts`) | The spine leans back 3° at the top of the breath | The rib cage and the abdomen expand, and the shoulders and the arms stay still (1.6) | Differs: a lean of 3° in place of an expansion |
| Rest (`rest`, `restShift` of `WIND_HOLDS.trombone`, design 5.2) | Slide 73.9° below the level and 6.3° to the left. Mouthpiece 6.6 cm left, 2.4 cm up, and 13.2 cm forward of the mouth. Both paws on their grips, the slide closed, the head lifted 12° | The slide lock on when the slide is not in use (1.7). No source gives the place | The closed slide matches. The place has no source |
| Lift (`REST_MOTION` of `pose/rest.ts`, design 5.2) | The winds lift first, in the count-in | No source gives the time (1.7) | No source |
| Seated posture (design 5.2) | Upright, off the chair back, the hips above the knees, the thighs down, the soles flat | Upright, off the chair back, the feet flat, the shoulders over the hips. A seat with the thighs down is an option (1.8) | Matches |

### 4.2 The other winds

| Rule | App | Reference | Verdict |
|---|---|---|---|
| Flute head (`FOX_FLUTE`) | The head turns 30° to the left, and the shoulders stay square and low | A head turn of about 30°, low elbows and shoulders (2.4) | Matches |
| Flute angle (`FOX_FLUTE_BACK`, `play`) | 9° back from square to the face, 8° down to the right | About square to the face, about one hand width below the level, the head tilted to the right ear (2.4) | Matches. The head of the fox does not tilt to the right |
| Flute body | The chest faces the front | The body faces 45° to the right, and a seated player turns the chair a little to the right (2.4) | Differs: 45° |
| Flute rest (`rest`, `restShift`, `restPoleR`, `restGripShiftR`, `gripAround` of `FOX_FLUTE`, design 5.2) | Nearly upright (10° from the vertical), with the foot joint on the top of the right thigh near the knee. The closed right paw holds the upper body of the flute, about 0.2 m below the lip plate. The left arm hangs | Upright on the right leg with the right hand on the right-hand keys. Players also put it across the lap (2.4) | Matches, with the paw higher on the flute than the right-hand keys and a lean of 15°: upright on the thigh, the right arm went 5 cm into the body. Across the lap with both paws, the arms failed the arm gate (`docs/research/2026-10-24-wind-grips.md`, `docs/research/2026-10-25-fox-arms.md`) |
| Oboe angle (`hanging()` of `models/instruments/woodwinds.ts`, `MOUSE_OBOE`) | 30° from the vertical. The mouse, the only oboist, turns the lower end 10° forward, to 40° | About 45° from the body, or 40° (2.3) | Matches 40°. The small oboe keeps the grips near the chest, so the elbows bend near the body. On the oboe of 0.62, the arms reached forward straight at 35° and 40° (`docs/research/2026-10-25-wind-angle.md`) |
| Oboe size (`oboeScale` of `SPECIES.mouse`) | 0.45 of the oboe of the app, because the user called the arms 1.4 of the mouse too long (arms 1.25 now, `docs/decisions/2026-10-26-short-arms.md`), and prefers a smaller instrument to longer arms | This file gives no size of a smaller oboe (2.3) | No source |
| Oboe reed (`lipShift` of `MOUSE_OBOE`) | The reed is in the mouth under the long muzzle, 0.23 H behind and 0.04 H below the mouth of the bind pose under the tip of the nose, about half of the reed in the mouth | The oboe comes to the mouth, and the head stays up (2.3) | Matches |
| Oboe hands (`gripShiftL`, `gripShiftR` of `MOUSE_OBOE`) | The left paw holds the upper joint, its middle 9.7 cm from the reed, and the right paw holds the lower joint above the bell, 20.9 cm from the reed, with a gap of 6.0 cm between the paws. At rest, the paws keep these grips | The left thumb at the back of the oboe below the octave key, the right thumb under the thumb rest (2.3) | Matches the order and the joints. Before 2026-10-25, both paws lay together on the lower half, 17.4 cm and 22.3 cm from the reed (`docs/research/2026-10-25-wind-palms.md`). The thumbs of the mesh have no bone, so they do not reach the octave key or the thumb rest |
| Oboe rest (`rest`, `restShift`, `restPoleL`, `restPoleR`, `restAim` of `MOUSE_OBOE`) | Upright in front of the belly. Both paws stay on their grips of the play: the left paw on the upper joint and the right paw on the lower joint, with a gap of 5.7 cm between the paws, so that the lift and the lowering move the oboe with the paws | In a long rest across the legs with the tone holes up, in a short rest vertical on the right leg in the right hand (2.3) | Differs: the mouse stands, and its round belly covers the thighs, so the oboe stands in front of the belly with both paws on it. Before 2026-10-27, both paws closed on its middle and overlapped by 4.5 cm along the tube, and each paw slid about 5 cm along the tube in each move (`docs/research/2026-10-27-wolf-mouse-rests.md`) |
| Clarinet angle (`hanging()`, `WOLF_CLARINET`) | 25° from the vertical. The wolf, the only clarinetist, turns the lower end 5° forward, to 30° | About 45° from the body, from the mouth to between the knees (3) | Differs: 30°, the angle of the wolf of `orchestra-latest.png` and `orchestra-side.png`, which the images show at 28° and 24°, as a render of the app at 30° from their camera. The long muzzle puts the mouthpiece far in front of the chest, so at 45° the bell was far in front of the knees (`docs/research/2026-10-25-wind-angle.md`) |
| Clarinet mouthpiece and arms (`lipShift`, `reach`, `reachL`, `poleL`, `poleR` of `WOLF_CLARINET`) | The mouthpiece is in the mouth under the long muzzle, 0.4 H behind and 0.18 H below the mouth of the bind pose. The shoulders turn forward, and the elbows point down and a little out | The clarinet at the middle of the body, and the head does not tilt toward it (3) | Matches |
| Woodwind palms (`faceTube`, `gripCurl`, `aimAcross`, `aimSide`, `gripShiftL`, `gripShiftR`, `restAim` of `FOX_FLUTE`, `MOUSE_OBOE`, `WOLF_CLARINET`, `BEAVER_BASSOON`) | Each paw of the wolf, the mouse, and the beaver holds its tube from the side of its own shoulder, its palm faces the tube, its fingers curl 80° to 115° over the front, and its thumb points up the tube toward the mouthpiece, at rest and in the play (`2026-10-25-wind-palms` decisions). The left paw of the tan fox holds the flute near the lip plate from its front and a little below in the play, with the back of the paw to the audience, and points half up across it (`aimSide`), so that the fingers curl 115° over the top onto the keys. It leaves its grip at rest, and faces the flute in the play. The middle of the right paw lies behind the body of the flute and a little below it, the paw points up past the back of the flute (`aimSide` below 0), and the fingers curl 106° over the top, with the right elbow down and out | The fingers curve in a C over the keys, and the thumb is behind or under the tube (2.3, 2.4, 3) | Matches the palm, the C, and the thumb up (`pnpm wind-grip`, `docs/research/2026-10-25-wind-palms.md`, `docs/research/2026-10-25-fox-arms.md`). Before 2026-10-25, the woodwind paws lay behind the tube, so the palms faced the audience and the thumbs pointed down the tube. Differs: the thumb of a mesh has no bone, so on the left oboe paw and the right bassoon paw the thumb tip lies in front of the axis. The mittens close as one block, with no single fingers on the keys. The long paws of the tan fox need a large curl to put the finger tips on the thin flute. Before 2026-10-27, the left flute paw hung 5.5 cm below the flute with its tips 2.7 cm off it, and the right flute paw lay on the top of the flute from behind and above. In front of the flute, as a left hand, the right paw turned 180° on its forearm in the moves (`docs/research/2026-10-27-cat-fox.md`, `docs/research/2026-10-27-cat-fox2.md`) |
| Clarinet rest (`rest`, `restShift`, `restPoleL`, `restPoleR`, `restAim` of `WOLF_CLARINET`) | Upright (0° from the vertical from the front and from the side), in front of the belly between the knees, the bell at the height of the knee tops, 22 cm in front of the seat. Both paws stay on their grips of the play, so that the lift and the lowering move the clarinet with the paws. The left elbow points out and down, and the right elbow down, a little out, and a little forward | The bell on the chair or the knee, or on the seat between the legs, and the right thumb on the thumb rest carries it (3) | Matches the upright clarinet and the hands. Differs: the bell rests on nothing. The round belly reaches the seat front, so an upright clarinet has no room on the seat, and on the top of the right knee the left forearm went 7 cm to 12 cm into the belly (`docs/research/2026-10-27-wolf-mouse-rests.md`). Before, the bell rested against the inner side of the right knee with the clarinet leaned 30° forward (`docs/research/2026-10-27-wolf-knee.md`). The bind elbows bent forward and the supinated bind paws keep each paw within 45° of twist on its forearm (`docs/research/2026-10-27-wolf-bind.md`). The left wrist bends 45° at rest (p95 of the arm gate), against 54° at the knee |
| Bassoon (`BEAVER_BASSOON`, `BEAVER_PLAY`, `bassoonParts()` of `models/instruments/woodwinds.ts`) | Diagonal from the right hip up past the left shoulder, 30° from the vertical in the front view, with the bell above the head, the left paw high on the wing joint and the right paw low on the boot joint, and the end of the bocal 1.7° above the level at the reed (`bassoonParts()`). The beaver, the only bassoonist, has the reed under its front teeth (`lipShift`) | Diagonal in front of the player, on a strap at the right thigh, the left hand above the right hand, the bocal nearly level, the head upright, and the bell at the left of the line of sight (3) | Matches. The app has no strap. Before 2026-10-25, the bassoon lay 54° from the vertical with its top at the shoulder |
| Bassoon elbows (`poleL`, `poleR`, `restPoleL` of `BEAVER_BASSOON`) | The right elbow points down, out, and forward, and the left elbow down, out, and a little back, in the play and at rest | No source of this file gives the elbows of a bassoonist (3) | No source. Of 3 left elbows, this one gives the smallest twist of the left forearm, which has no arm segments: 55.4° for each link, against 64.6° with the left elbow forward (`docs/research/2026-10-25-wind-elbows.md`) |
| Bassoon size (`bassoonScale` of `SPECIES.beaver`) | 0.82 of the bassoon of the app, because the beaver keeps the arms that the user chose | This file gives no size of a smaller bassoon (3) | No source |
| Bassoon rest (`rest`, `restShift` of `BEAVER_BASSOON`, `BEAVER_REST`) | Off the mouth, 0.15 H forward and 0.05 H down, with the lower end 10° back toward the body and 5° to the right of the play, so that both paws close on their grips: the right paw on the boot joint | The boot at the right thigh and the boot joint in the right palm in the play, and the wet bassoon upright (3). No source of this file gives the rest between two entrances | No source for the rest. Before 2026-10-25, the diagonal of the play moved 0.2 H forward, and the right paw stood about 10 cm from the boot joint (`docs/research/2026-10-25-wind-elbows.md`) |
| Horn hands (`fingering` 'valves-left', `palmR` of `horn()`, `HORN_PALM_DEPTH`) | The left paw presses the valves at the middle of the body. The middle of the right palm lies on the axis of the bell, 2.5 cm inside its opening, and 92% of the paw is in the bell | The left hand works the valves and holds the weight at the middle of the body. The right hand goes into the bell at 2 o'clock (2.2) | Differs. The right paw stays on the axis of the bell, in place of against the bell wall at 2 o'clock. The paw points along the line from the shoulder, 86° from the axis, so it lies across the opening. At 6 cm, the wrist went 2.4 cm through the bell wall (`docs/research/2026-10-20-armpits.md`) |
| Horn bell in play (`HORN_TURN`, `PIG_TURNS` of `PIG_HORN`) | The pig turns the lower end of the horn 40° back toward the body and the right side 20° forward. From the front, the line from the mouthpiece to the bell lies 35.7° below the level, and the bell is at the right of the torso and in front of it, off the leg | About 45° across the body, the bell at the right of the torso and in front of it, the mouthpiece slopes down, off the leg or on the outer side of the thigh (2.2) | Matches. The line lies 9° nearer to the level than 45° |
| Horn elbows (`reachL`, `poleL`, `poleR` of `PIG_HORN`) | The left shoulder turns 26° forward. The left elbow points out, forward, and a little down, and the right elbow out and down | Tuckwell keeps the elbows near the body (2.2) | Differs: the long snout of the pig puts the valves far in front of the chest, and the left forearm went 6 cm into the chest with the elbow down and in (`docs/research/2026-10-19-pig-mesh.md`) |
| Horn rest (`rest`, `restShift` of `PIG_HORN`) | The horn moves off the mouth, 0.2 H down and 0.2 H forward onto the belly, with the bell at the right beside the haunch and the leadpipe up, and both paws keep their grips | On the lap, with the bell to the right and the leadpipe up on the left side (2.2) | Differs: the round belly of the pig covers its short thighs, so the horn rests on the belly over the lap. A lower horn put the right forearm into the belly |
| Horn valves (`BRASS_FUNDAMENTALS.horn`, `HORN_PARTIALS` of `pose/wind-notes.ts`) | A single F horn on the partials of F1 (MIDI 29): 2 to 6 and 8, then only 10, 12, and 16 | The fundamental F1. The single F horn chart takes the partials 2 to 6 and 8, then only 10, 12, and 16. Advanced players use the B♭ side above the written G4 (2.2) | Matches the chart for each demo note that the chart has. Differs: the app has no B♭ side |
| Trumpet hands (`fingering` 'valves-right', `faceTube`, `aimSide`, `gripCurl` of `MONKEY_TRUMPET`, `tubeL`, `tubeR` of `trumpet()`) | The right paw presses the valves, and the left paw holds the trumpet. The left palm faces the upright casings from the left, below the middle of their height, the left paw points up and forward with the thumb up and back, and its fingers curl 130° around the casings. The right palm lies above the valves at their right and faces down, the right paw points to the left across the valve tops, and its fingers curl 92° onto them | The left hand wraps the valve casing and holds the weight, the right fingertips arch on the valves, the right thumb under the lead pipe between the first and the second valve casing (2.1) | Matches the places: both paws grasp in each play sample, the right palm faces down (-0.99), and the right paw points left (-0.98) (`pnpm wind-grip`, `docs/research/2026-10-25-brass-grips.md`). Before 2026-10-25, both palms faced the valve block from its sides, and the paws pressed together in front of the mouth like praying hands. Differs: the right thumb of the mesh points back toward the mouthpiece at the height of the valve tops, above the lead pipe, and the mittens show no single arched fingertips |
| Trumpet elbows (`poleL`, `poleR` of `MONKEY_TRUMPET`) | Both elbows point down and out | The elbows at about 45° to the ground, and the shoulders down (2.1) | Differs: the big head of the monkey puts the mouthpiece 0.23 m above the shoulder joints, so the forearms rise steeply. With the elbows out and level, the right upper arm went flat, and the right wrist bent past the arm gate |
| Trumpet size (`trumpetScale` of `SPECIES.monkey`) | 0.65 of the trumpet of the app, with the arms 1.2: the user called the arms 1.5 too long (`docs/decisions/2026-10-26-short-arms.md`) | This file gives no size of a smaller trumpet (2.1) | No source |
| Trumpet angle (`trumpet()` of `models/instruments/brass.ts`, `play` of `MONKEY_TRUMPET`) | 15° below the level, straight ahead, with each shoulder 34° forward | "Angled slightly down", a little less than 90° to the face (2.1) | Matches. No source gives degrees. From the stage camera (elevation 40°), the mouth shows above the right paw, and from the front at elevation 20°, the right paw covers the mouth (`docs/research/2026-10-25-brass-grips.md`) |
| Trumpet rest (`WIND_HOLDS.trumpet.rest`, `restAim`, `restGripShiftL` of `MONKEY_TRUMPET`) | Off the mouth, turned down in front of the chest with the bell down. Both paws keep the hold of the play, and the left grip moves 0.04 H along the casings toward the bell | No source (2.1) | No source. Both paws grasp the trumpet at rest |
| Tuba stand (`INSTRUMENT_SUPPORTS.tuba`, `RHINO_TUBA`) | The rhino stands in each seat, in the standing pose of its mesh, and the tuba stands against its body. The paws carry no weight | A standing tubist carries the tuba on a strap or a harness (3) | Matches. The app draws no strap |
| Tuba hands (`RHINO_TUBA`, `palmL`, `palmR`, `tubeL`, `tubeR` of `tuba()`) | The left paw lies on the left side of the main branch, with the palm on the branch, the back of the paw out to the left, and the fingers forward and down around the front of the branch. The left fingers curl 92° and the right fingers 80°. The right palm faces the valve tops at the front right of the valve branch. Both paws keep the hold of the play at rest (`restAim`) | The right hand works the valves, and on a rotary tuba the left hand grips the tubing at the side with the knuckles to the left (3) | Matches. The left palm faces the branch (0.92 to the right), and both paws grasp in each sample of the play, the lift, the rest, and the lowering (`docs/research/2026-10-25-brass-grips.md`, `docs/research/2026-10-26-fifth-rhino.md`). Before 2026-10-25, the left paw lay at the back left of the branch and pointed at it, so its palm faced up |
| Tuba elbows (`reach`, `reachL`, `poleL`, `poleR`, `restPoleL`, `restPoleR` of `RHINO_TUBA`) | The right shoulder turns 45° forward and the left 40°. Both elbows point down and out, a little more down than out, in the play and at rest. The left forearm then turns 67° and the right forearm 15° from a neutral forearm, the palm along the elbow axis | The arms stay away from the rib cage, so that it can expand (1.8). No source of this file gives the turn of the forearm | Matches. The upper arms go at most 0.9 cm into the body. Before 2026-10-27, the elbows pointed out, and the left forearm turned 84° and the right 57° from neutral, so the skin of the forearms twisted (`docs/research/2026-10-26-fifth-rhino.md`). With the elbows straight down, the thick upper arms went into the round belly |
| Tuba bell and angle (`play` of `RHINO_TUBA`) | The lower end turns 25° to the right, so the bell stands at the left of the head and of the horn | The bell at the left of the head on a rotary tuba, the tuba at a slight angle (3) | Matches |
| Tuba lead pipe (`tubaPipe` of `SPECIES.rhino`) | 0.25 m longer back and 0.1 m to the left, because the long muzzle puts the mouthpiece 0.51 m in front of the shoulder joints | The player brings the tuba to the body (3). This file gives no length of a lead pipe | No source |
| Tuba rest (`rest` of `RHINO_TUBA`) | Off the mouth, the lower end 5° forward, both paws on their grips | No source (3) | No source |
| Valve combinations (`VALVES`, `semitonesBelowPartial()` of `pose/wind-notes.ts`) | One valve for 1 and 2 semitones below a partial, two valves for 3 to 5, three valves for 6. The seventh partial is not a partial, so the trumpet plays the written A♭5, A5, and B♭5 with 2, 2, and 1 valves from the eighth partial | The written D4, C♯4, E♭4, and A5 (1-2) (2.1) | Matches. This file gives no fingering of the written A♭5 and B♭5 of the trumpet, and of the tuba. The row "Horn valves" gives the horn |
| Fingers of the woodwinds (`holesClosed()`) | Both hands close for a low note, and the right hand opens first up the octave | Only the fingers move, with the pads on the keys (2.3, 2.4) | Matches. The paws curl as one block, by the grip curl and 20° more for all keys closed (`WindHold.gripCurl`, `WIND_BODY.keyCurl`) |
| Breath time (`WIND_MOTION`) | 0.4 s before each phrase | Reed players breathe in about 0.3 s. A breath in tempo takes one beat (2.1, 2.3, 1.6) | Matches |
| Breath of the oboe | A breath in only | A breath out of the stale air, then a breath in (2.3) | Differs: no breath out |
| Breath motion (`WIND_BODY.breath`) | The spine leans back 3° | The chest and the abdomen expand, and the shoulders stay still (1.6, 2.1, 3) | Differs: a lean in place of an expansion |
| Elbows (`POLE_L`, `POLE_R`, user decision of 2026-10-10) | The elbows point down and in, as far as the arms permit | The arms stay a little away from the rib cage (1.8, 2.3) | Differs: the elbows stay near the body, as the user chose |
| Elbows of the oboe (`poleL`, `poleR`, `restPoleL` of `MOUSE_OBOE`) | The right elbow points down, out, and forward, and the left elbow down and a little out. Both upper arms hang about 33° to 36° below the level, with the elbows about 2 cm out from the shoulder joints. At rest, the left elbow points out and a little down. The paws reach forward at the height of the shoulders, because the big head of the mouse puts the reed about 0.13 m above the shoulder joints | The arms hang loosely from low shoulders, and the elbows neither stick out nor stay close to the body. The wrists drop (2.3) | Matches the elbows. Before 2026-10-25, the left upper arm stood 3.5° below the level and read as a raised wing (`docs/research/2026-10-25-wind-elbows.md`). The paws are higher than the chest of a real oboist |

## 5. Sources

Each source opened on 2026-10-18, except where a fact has a mark of section "Source marks".

1. B. N. Weidner, *Brass Techniques and Pedagogy*, 2nd edition, PALNI Press (open textbook, CC
   BY-NC-SA 4.0), chapters 2 "Getting Started with Posture, Breathing, and Embouchure", 4 "Brass
   Acoustics" (the figure "Partials of brass instruments"), 11 "The Trumpet", 12 "The Horn", 13
   "The Trombone", and 15 "The Tuba".
   https://pressbooks.palni.org/brasstechniquesandpedagogy/
2. pBone, "How To Hold A Trombone: A Beginners' Guide".
   https://pbonemusic.com/blogs/learn/how-to-hold-a-trombone-a-beginners-guide
3. D. Cherry, "Trombone Slide Technique", Western Carolina University (handout, 2008).
   https://paws.wcu.edu/dcherry/files/Slide%20Technique.pdf
4. T. Smith, "Trombone Posture" (handout), Buffalo Philharmonic Orchestra.
   https://bpo.org/wp-content/uploads/2020/12/Smith-Posture.pdf
5. James Madison University, Brass Pedagogy, "Trombone Set-up".
   https://sites.lib.jmu.edu/brasspedagogy/?p=2664
6. L. Jackson, K. McCutcheon, A. Weak, R. Patterson, C. Pineda, "Non-negotiables", Oklahoma
   Bandmasters Association.
   https://www.okbandmasters.com/uploads/9/4/7/3/94730828/non-negotiables.pdf
7. Thomann, "Trombones: function and playing technique".
   https://www.thomann.co.uk/onlineexpert_page_trombones_function_and_playing_technique.html
8. Wikipedia, "Trombone", sections on the slide positions and on the partials.
   https://en.wikipedia.org/wiki/Trombone
9. R. Lisboa, G. Machado, T. Campolina, M. Loureiro, "The effect of actuating the bass trombone
   second valve on the quality of note transition in legato", Proc. SMC 2023, pp. 58 to 62.
   https://zenodo.org/records/8334783
10. J. Kemp, A. López-Carromero, A. Woolley, M. Campbell, "Experimental investigation of Doppler
    shift and infrasound generation during wave propagation within the bore of the trombone
    during slide movement", Proc. Third Vienna Talk on Music Acoustics (2015), pp. 9 to 14, with
    G. Ekdahl, "A simple model of the mechanics of trombone playing", KTH (2001).
    https://viennatalk2015.mdw.ac.at/proceedings/ViennaTalk2015_submission_105.pdf
11. D. M. Campbell, A. López-Carromero, J. A. Kemp, "The effect of fast trombone slide glissandi on
    the mechanics of artificial lips", Proc. ICA 2019, section 2.2.2.
    https://pub.dega-akustik.de/ICA2019/data/articles/001333.pdf
12. W. Barrett, "Playing Legato on the Trombone: A Primer", Online Trombone Journal.
    https://trombone.org/articles/view.php?id=106
13. S. Tanner, "Warm-Up & Fundamental Exercise Materials", Trombone Studio, University of Colorado
    Boulder (2025-26), section II.D. https://www.colorado.edu/music/media/10918
14. I. Bousfield, "Learn Legato", lesson 8 of "Unlocking the Trombone Code", MusicGurus.
    https://www.musicgurus.com/courses/ian-bousfield-unlocking-the-trombone-code-course/lessons/learn-legato-trombone-ian-bousfield-course
15. J. Friedman, "Legato and the Arms Race". https://www.jayfriedman.net/legato-and-the-arms-race/
16. K. Price, P. Schartz, A. H. D. Watson, "The effect of standing and sitting postures on
    breathing in brass players", SpringerPlus 3:210 (2014).
    https://pmc.ncbi.nlm.nih.gov/articles/PMC4167884/
17. B. J. Ackermann, N. O'Dwyer, M. Halaki, "The difference between standing and sitting in 3
    different seat inclinations on abdominal muscle activity and chest and abdominal expansion in
    woodwind and brass musicians", Frontiers in Psychology 5:913 (2014). https://pmc.ncbi.nlm.nih.gov/articles/PMC4142336/
18. R. T. Garnett, "The role of biomechanical parameters in upper-extremity musculoskeletal pain
    experienced by trombonists", MSc thesis, University of Lethbridge (2022), chapters 3 and 4,
    Tables 6 and 7. https://opus.uleth.ca/handle/10133/6328
19. A. Jokipii, "Beginner's Toolkit: Trumpet" (handout), Buffalo Philharmonic Orchestra.
    https://bpo.org/wp-content/uploads/2020/12/Jokipii-BTK.pdf
20. James Madison University, Brass Pedagogy, "Trumpet Set-up" (2016).
    https://sites.lib.jmu.edu/brasspedagogy/2016/10/01/trumpet-set-up/
21. J. Purtle, "Correct Hand Position for Trumpet and Brass".
    https://purtle.com/jeff-correct-hand-position
22. Wikibooks, "Trumpet/Playing". https://en.wikibooks.org/wiki/Trumpet/Playing
23. C. McLaughlin, "Breathing For Trumpet Playing". https://www.bbtrumpet.com/?p=1274
24. C. Sanborn, "Timed Breathing", Halftime Magazine.
    https://halftimemag.com/sectionals/timed-breathing.html
25. James Madison University, Brass Pedagogy, "Horn Set-up" (2016).
    https://sites.lib.jmu.edu/brasspedagogy/2016/10/01/horn-set-up/
26. J. Ericson, "Hornmasters: Farkas on Right Hand Position", Horn Matters, with quotes of P.
    Farkas, *The Art of French Horn Playing* (1956). https://hornmatters.com/?p=8608
27. J. Ericson, "Hornmasters: Farkas on Holding the Horn and the Left Hand", Horn Matters.
    https://hornmatters.com/?p=7907
28. J. Ericson, "Hornmasters: Tuckwell on Holding the Horn and Left Hand Position", Horn Matters,
    with quotes of B. Tuckwell (1978).
    https://hornmatters.com/2010/05/hornmasters-tuckwell-on-holding-the-horn-and-left-hand-position/
29. K. Coreil, "Transforming Trumpet Players Into Horn Players", Midwest Clinic (2010).
    https://www.midwestclinic.org/user_files_1/pdfs/clinicianmaterials/2010/kristine_coreil.pdf
30. L. Taylor, "How to Hold the French Horn", Hello Music Theory.
    https://hellomusictheory.com/learn/how-to-hold-the-french-horn/
31. J. Ericson, "Hornmasters on Opening the Corners to Breathe", Horn Matters, with quotes of P.
    Farkas and F. Wekre. https://www.hornmatters.com/?p=12065
32. S. Hamilton, "Body use", Oboehelp. https://oboehelp.com/body-use/
33. S. C. Cline, "Oboe for Starters", American Band College.
    https://www.bandworld.org/pdfs/OboeABC_Cline.pdf
34. J. Oelrich, "Four Keys to a Successful Start on the Oboe", The Instrumentalist (2026).
    https://theinstrumentalist.com/april-may-2026/four-keys-to-a-successful-start-on-the-oboe/
35. B. Pimentel, "The double reeds and 'uneven' embouchures".
    https://bretpimentel.com/the-double-reeds-and-uneven-embouchures/
36. B. Pimentel, "Stale air" (2018). https://bretpimentel.com/stale-air/
37. R. Still, "Playing the Oboe", part 2, chapter 6 "Fingers".
    https://raystill.com/playing-the-oboe-part-2/fingers
38. L. Fuks, doctoral thesis on the breathing of reed players, KTH (1998), abstract and
    conclusions. https://www.speech.kth.se/music/publications/leofuks/thesis/Abstract.html
39. N. Cox, "Woodwind playing tips", ConductIt.
    https://conductit.eu/wp-content/uploads/sites/41/2021/06/Woodwind-playing-tips.pdf
40. M. Debost, "Debost's Comments", Flute Talk, May/June 1996.
    https://www2.oberlin.edu/faculty/mdebost/may96.html
41. M. Debost, "Playing Long Phrases", Flute Talk, March 1994.
    https://www2.oberlin.edu/faculty/mdebost/march94.html
42. P. George, "Solving the Problem of Rests", The Instrumentalist, December 2018.
    https://theinstrumentalist.com/?p=5640
43. P. George, "Things You Never Want Your Students to Hear", The Instrumentalist, September 2017.
    https://theinstrumentalist.com/september-2017-flute-talk/things-you-never-want-your-students-to-hear/
44. M. Pollock, "How to teach flute technique: 2. Hand positions", Collins.
    https://collins.co.uk/blogs/collins-schools/how-to-teach-flute-technique-2-hand-positions
45. E. Kruth, "Flute Embouchure", Bandworld (1989). https://bandworld.org/pdfs/FluteEmbKruth.pdf
46. Flutecentric, "Notes: On Position", with quotes of J. Cuff and W. Kincaid.
    https://flutecentric.com/notes-flute-topics-playing/flute-position/
47. McGee Flutes, "Rockstro on holding the flute", with quotes of R. S. Rockstro, *A Treatise on
    the Flute* (1890). https://mcgee-flutes.com/Rocksto_on_holding_the_flute.html
48. I. Cossette, P. Monaco, A. Aliverti, P. T. Macklem, "Chest wall dynamics and muscle
    recruitment during professional flute playing", Respiratory Physiology and Neurobiology
    160:187 to 195 (2008), abstract (PMID 17977805).
49. C. K. Winkle, "Teaching Clarinet Fundamentals", The Instrumentalist.
    https://theinstrumentalist.com/articles/Teaching-Clarinet-Fundamentals
50. Hochschule Luzern, Cladid wiki, "Holding the Clarinet".
    https://wiki.hslu.ch/cladid/Holding_the_Clarinet
51. T. B. Ewell, "Teaching the Beginning Bassoonist", The Double Reed 23(2).
    https://www.2reed.net/EwellArticles/BeginningBassoonist_DR23_2.pdf
52. Wikipedia, "Bassoon". https://en.wikipedia.org/wiki/Bassoon
53. James Madison University, Brass Pedagogy, "Tuba Set-up" (2016).
    https://sites.lib.jmu.edu/brasspedagogy/?p=2668
54. Wikipedia, "Tuba". https://en.wikipedia.org/wiki/Tuba
55. B. N. Weidner, "Horn Fingering Chart", the single F horn and the double horn, *Brass
    Techniques and Pedagogy*, PALNI Press (CC BY-NC-SA 4.0).
    https://pressbooks.palni.org/brasstechniquesandpedagogy/wp-content/uploads/sites/4/2020/08/Horn-Fingering-Chart-Full-Score.pdf
56. D. Freund, D. Cutler, "Brass | The Horn Family", *Extreme Orchestration*, Timbre and
    Orchestration Resource, ACTOR Project (2024), with a quote of R. Patterson.
    https://timbreandorchestration.org/isfee/extreme-orchestration/brass/horn-family
57. S. Eddins, "Double Horn Fingerings, Harmonic Series, Intonation, Trills, and Horn Lengths"
    (2023), after a chart of T. Martin in R. Gardner, *Good Vibrations: Masterclasses for Brass
    Players*. https://horncamp.org/wp-content/uploads/2024/01/double-horn-fingering-chart-eddins.pdf
58. Thomann, "Rudolf Schwarz Tuba Känguru Bb Tuba", carrying strap for a B♭ tuba, product text
    (opened 2026-10-21).
    https://www.thomann.co.uk/rudolf_schwarz_tuba_kaenguru_bb_tuba.htm
59. Engadine Music, "Neotech Pad-It Tuba Harness", product text (opened 2026-10-21).
    https://engadinemusic.com.au/products/neotech-pad-it-tuba-harness
60. C. Jones, "Clarinet Thumb Pain", Clarinet Now (opened 2026-10-24).
    https://clarinet-now.com/clarinet-thumb-pain.html
61. "Slide Tips", Performance Clinic, Old Dominion University, faculty site of J. Hall (2015,
    opened 2026-10-25). https://fs.wp.odu.edu/jhall/performance-clinic/slide-tips/
62. M. Mumford, "Low Brass Basics", ASBOF (2019, opened 2026-10-25).
    https://asbof.org.au/wp-content/uploads/2019/07/Low-Brass-Basics.pdf
63. S. Burtis, "Out of the Case: Slide Technique", Online Trombone Journal (1997, opened
    2026-10-25). https://www.trombone.org/articles/view.php?id=56
64. D. Farrant, "How to Hold a Trombone", Hello Music Theory (2021, opened 2026-10-25).
    https://hellomusictheory.com/learn/how-to-hold-trombone/
65. C. Garvey, "Developing Good Physical Habits for Playing Oboe", Band Director (2013, opened
    2026-10-25).
    https://banddirector.com/woodwinds/double-reeds/developing-good-physical-habits-for-playing-oboe/
66. A. Rollins, "Posture", Fundamentals of Beginner Oboe (opened 2026-10-25).
    https://arollinsoboe.weebly.com/fundamentalsofbeginneroboeposture.html
67. C. Lowe, "Supporting the Bassoon", *A Modern Guide to Teaching and Playing the Bassoon* (2024,
    opened 2026-10-25).
    https://lowecc.pressbooks.sunycreate.cloud/chapter/supporting-the-bassoon-teaching-and-playing-the-bassoon-a-modern-guide/
68. Yamaha, Musical Instrument Guide, "Bassoon" trivia (opened 2026-10-25).
    https://www.yamaha.com/en/musical_instrument_guide/bassoon/trivia/trivia002.html
