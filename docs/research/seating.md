# Professional seating and the cast

Date: 2026-10-05. Code: commit `7bd2463`.

The user asked on 2026-10-05: "Do we have hippo / rhino now? Large animals should be moved to the
back. It's OK to change their instrument. Make sure the arrangement of instruments is
professional."

This report gives the professional seating of a symphony orchestra with sources. It compares our
layout with it, and it proposes a new species map and new rows. A scratch copy of the code
measured each number of sections 5 to 8. "Not measured" marks a value that no run confirms.

## 1. Answer to the first question

Yes. The cast has both species since step 4 (design 4.3):

- The hippo (size 1.35) plays the contrabass. It plays in demo 1 (Beethoven), Grieg, and
  Boulanger.
- The rhino (size 1.35) plays the tuba. Only the Boulanger demo has a tuba.

The hippos look as if they sit in front. Row 2 ends at +90°, and the default camera stands 30° to
the right of the audience axis. Thus the right end of each row is near the camera. In demo 1, the
hippos hide 34% of the head of a trumpet monkey. In Boulanger, they hide 90% of the head of a
bassoon beaver (section 7).

## 2. Sources

| Id | Source | What it gives |
|---|---|---|
| S1 | Philharmonia Orchestra, seating plans of the 2001/2 season, in Andrew Hugill, *The Orchestra: A User's Manual*: <https://andrewhugill.com/manuals/seating.html> (plans `060602Ashkenazy.jpg`, `090202Salonen.jpg`, `110902CVD.jpg`, photo `overhead.gif`) | Stage plans of a professional orchestra, drawn for its stage crew. The typical layout, the place of the orchestral piano, the celesta, and the harp, and a concerto layout of Christoph von Dohnányi |
| S2 | ConductIT (University of Stavanger, RNCM, University of Aveiro, The Open University), "5.5 Considerations of layout and size": <https://conductit.eu/study-room/rehearsal/rehearsal-5/5-5-considerations-of-layout-and-size/> | The common string orders, the basses, the woodwind block, and the horns |
| S3 | Elbphilharmonie Mediatheque, "Europe in the genes, America in the heart" (conductor Manfred Honeck): <https://www.elbphilharmonie.de/en/mediatheque/europe-in-the-genes-america-in-the-heart/749> | American and German string seating, and the reasons |
| S4 | Singapore Symphony Orchestra, *Bravissimo*, "Seats and sounds": <https://www.sso.org.sg/bravissimo/seats-and-sounds-orchestral-seating-and-the-symphony-of-sounds> | German seating, American seating since the 1920s, the Furtwängler variant |
| S5 | Wikipedia (de), "Deutsche Aufstellung": <https://de.wikipedia.org/wiki/Deutsche_Aufstellung> | German seating, and the orchestras that use it |
| S6 | The Idiomatic Orchestra, "14. Orchestra size and setting": <https://theidiomaticorchestra.net/14-orchestra-size-and-setting/> | The modern standard layout, row by row |
| S7 | Classic FM, "Why are orchestras arranged the way they are?": <https://www.classicfm.com/discover-music/why-orchestras-arranged/> | Loud instruments at the back, the "Stokowski shift" |
| S8 | Courtney Lewis (conductor), "Musical chairs": <https://www.courtneylewis.com/blog/2017/04/musical-chairs-why-orchestras-sit-the-way-they-do/> | The violin choice of a conductor |
| S9 | John Ericson, *Horn Matters*, "Horn section placement on the stage": <https://www.hornmatters.com/2009/09/horn-section-placement-on-the-stage/> | Horns in a row behind the woodwinds |

Quotes that set the proposal:

- S2: "Most common (if you are standing on the podium looking at the orchestra) is from left to
  right, 1st violins, 2nd violins, violas, cellos."
- S2: "Double basses will usually be behind the cellos, but having them in a line behind the
  woodwinds is sometimes done, this is favoured by the Vienna Philharmonic."
- S2: "You will almost always see woodwinds laid out with, from left to right, flutes and oboes
  in the front and clarinets and bassoons behind."
- S2: "Horns will usually be to the left of the woodwind as the conductor sees it."
- S6: "percussion in the back to the left, trombones/tuba to the right, and kettledrums between
  these two groups." "Piano, celesta and harp are placed to the left, behind the violins."
- S7: "violins are usually positioned on the frontline of an orchestra so they can be heard",
  because the brass is much louder.

## 3. Professional seating

### 3.1 American seating

Most orchestras use this seating today (S2, S3, S7). Leopold Stokowski made it common in the
1920s (S4, S7). The diagram follows the typical Philharmonia plan (S1, Ashkenazy, Geneva 2002)
and its photo from above. The audience is at the bottom.

```text
                            back of the stage
+------------------------------------------------------------------------+
|  percussion            timpani            trombones            tuba     |
|                                                                         |
|       horns                                     trumpets                |
|                    clarinets  |  bassoons                               |
|  harp, piano,        flutes   |  oboes                    basses        |
|  celesta                      |                     (behind the cellos) |
|        2nd violins            |       violas                            |
|  1st violins                  |                    cellos               |
|                         [conductor]                                     |
+------------------------------------------------------------------------+
                      front of the stage (audience)
```

| Section | Place | Source |
|---|---|---|
| First violins | Front left, the outer wedge. The concertmaster sits at the front, next to the conductor | S1, S2, S6 |
| Second violins | Left, the inner wedge, beside the first violins | S1, S2, S6 |
| Violas | Right of center, the inner wedge. A variant puts them at the outer right, and the cellos inside | S1, S2, S6 |
| Cellos | Front right, the outer wedge | S1, S2, S6 |
| Contrabasses | Right, behind the cellos. The Vienna Philharmonic puts them in a line behind the woodwinds | S1, S2 |
| Harp | Left, behind the violins | S1 (photo, Salonen plan), S6 |
| Piano in an orchestra, celesta | Left, behind the violins, near the harp | S1 (Salonen plan), S6 |
| Piano in a concerto | In front of the strings, near the conductor, with the keyboard and the bench at the left end | S1 (Dohnányi concerto plan) |
| Flutes, oboes | Center, the front woodwind row: flutes left, oboes right | S1, S2, S6 |
| Clarinets, bassoons | Center, the second woodwind row: clarinets behind the flutes, bassoons behind the oboes | S1, S2, S6 |
| Horns | Left of the woodwinds, in the row of the clarinets or behind it | S1, S2, S6, S9 |
| Trumpets | Right, in the row of the horns | S1, S6 |
| Trombones, tuba | Back right, the last row. The tuba is at the right end | S1, S6 |
| Timpani | Back center, between the percussion and the trombones | S1, S6 |
| Percussion | Back left | S1, S6 |
| Choir | On risers behind the orchestra | S1 (risers), general practice |

### 3.2 German seating

The German seating was usual up to the start of the 20th century (S3, S4, S5). The Vienna
Philharmonic, the Vienna Symphony, the Bamberg Symphony, and the Gewandhaus Orchestra use it,
mainly for the Viennese classics (S5). The diagram follows the Dohnányi plan of S1 (Lucerne 2002).

```text
                            back of the stage
+------------------------------------------------------------------------+
|  tuba  trombones           timpani                                      |
|        trumpets                                   horns                 |
|                    clarinets  |  bassoons                               |
|  basses              flutes   |  oboes                                  |
|            cellos             |       violas                            |
|  1st violins                  |                    2nd violins          |
|                         [conductor]                                     |
+------------------------------------------------------------------------+
```

- The first and the second violins sit opposite each other (S3, S4, S5).
- The cellos sit beside the first violins, and the basses sit behind them, at the left (S4, S5).
- The violas sit beside the second violins (S5).

### 3.3 Choice for Zoophony

The proposal uses the American seating:

- The reference image `orchestra.webp` has both violin sections at the left and the cello at the
  right, as the American seating does.
- S2 calls it the most common order.
- The German seating splits the rabbits and the red foxes to the two sides of the conductor.

The proposal takes one documented variant: the basses sit in a line at the back (S2, the Vienna
Philharmonic). The user asked for the large animals at the back, and the hippo plays the bass.
Section 7 shows that this place hides no smaller animal. Question 1 of section 9 gives the other
choice.

## 4. Our layout against the professional seating

Our layout comes from design 4.2 and 4.5 (rows table), and the screenshots of
`docs/reviews/step-5/`.

| Section | Our layout now | Professional (American) | Difference |
|---|---|---|---|
| First violins | Row 0, left of 0° | Front left, outer | None |
| Second violins | Row 1, left, behind the first violins | Left, inner, beside the first violins. Their first desk is at the front | Yes: behind in place of beside |
| Violas | Row 0, right of 0°, to the outer right | Right of center, inner | Yes: our violas fill the outer right of the front row |
| Cellos | Row 1, right, behind the violas | Front right, outer | Yes: behind the violas in place of outside them |
| Contrabasses | Row 2, right end, at +90° | Right, behind the cellos | None by the seating. The camera sees them in front (section 7) |
| Harp | Row 3, left end | Left, behind the violins, at the level of the front woodwinds | Yes: one row too far back |
| Piano in a concerto (K. 488) | Front left, keyboard at the left end, the pianist faces the conductor, the lid opens to the audience | The same (S1) | None |
| Celesta (Boulanger, program 8) | The place of the concerto piano, front left | Left, behind the violins, near the harp | Yes: a soloist place for an orchestral keyboard |
| Flutes, oboes | Row 2, left of center, in one line with the clarinets and the bassoons | The front woodwind row, center | Partly: one line in place of a block of two rows |
| Clarinets, bassoons | Row 2, right of the oboes, beside the hippos | The second woodwind row, behind the flutes and the oboes | Yes |
| Horns | Row 3, right of the timpani | Left of the woodwinds | Yes: right in place of left |
| Trumpets | Row 3, right of the horns | Right, in the row of the horns | None |
| Trombones, tuba | Row 3, right end | The last row, right | Partly: one back row for all brass |
| Timpani | Row 3, left of center | The last row, center | Partly |
| Percussion | Row 3, left of the timpani | The last row, left | None |
| Choir | Risers behind the last row | Risers behind the orchestra | None |
| Conductor | Podium, front center | The same | None |

## 5. Proposed species map

The large species (size 1.2 or more) play only sections of the last row: the contrabass, the
timpani, the trombone, and the tuba. The front string rows have species of the size 1.05 or less.
The user decisions stay: the wolf plays the clarinet, and the white rabbits and the red foxes
play the violins. The elephant stays on the timpani, because the cellos stay in front.

Three sections change their species: the cello, the horn, and the trombone.

| Section | Species | Size | Row (section 6) | Change |
|---|---|---|---|---|
| Violin, first seat | rabbit | 1.0 | 0 and 1, left, outer | none |
| Violin, second seat | red fox | 1.0 | 0 and 1, left, inner | none |
| Viola | cat | 0.95 | 0 and 1, right, inner | none |
| Cello | dog | 1.05 | 0 and 1, right, outer | was the panda |
| Contrabass | hippo | 1.35 | 4, left of center | new place |
| Harp | deer | 1.1 | 2, left end | new place |
| Piano in a concerto | meerkat | 0.85 | front left, outside the arcs | none |
| Celesta (program 8) | meerkat | 0.85 | 2, left of the harp | new place (optional, section 6.4) |
| Flute | tan fox | 1.0 | 2, left of center | none |
| Oboe | mouse | 0.75 | 2, right of center | none |
| Clarinet | wolf | 0.95 | 3, left of center | none |
| Bassoon | beaver | 0.95 | 3, right of center | none |
| Horn | pig | 1.05 | 3, left end | was the dog |
| Trumpet | monkey | 0.95 | 3, right end | none |
| Trombone | panda | 1.2 | 4, right of center | was the pig |
| Tuba | rhino | 1.35 | 4, right end | none |
| Timpani | elephant | 1.35 | 4, center | none |
| Percussion | badger | 0.95 | 4, left end | none |
| Choir | penguin | 0.9 | risers | none |
| Conductor | bear | 1.35 | podium | none |

```typescript
/** The proposed species of each section (design 4.3). Only the three marked rows change. */
const SECTION_SPECIES = {
  violin: ['rabbit', 'fox-red'],
  viola: ['cat'],
  cello: ['dog'], // was 'panda'
  contrabass: ['hippo'],
  harp: ['deer'],
  piano: ['meerkat'],
  flute: ['fox-tan'],
  oboe: ['mouse'],
  clarinet: ['wolf'],
  bassoon: ['beaver'],
  horn: ['pig'], // was 'dog'
  trumpet: ['monkey'],
  trombone: ['panda'], // was 'pig'
  tuba: ['rhino'],
  timpani: ['elephant'],
  percussion: ['badger'],
  choir: ['penguin'],
} as const satisfies Readonly<Record<PlayingSection, readonly SpeciesId[]>>;
```

### 5.1 The cello and the reach of the bow arm

The arm reaches 1.43 H from the shoulder to the palm, with H = 0.38 m × size (design 4.5). Thus
the dog (1.05) reaches 0.570 m, the panda (1.2) 0.652 m, and the rabbit (1.0) 0.543 m.

`bowRangeOf()` of `pose/bowed.ts` gives the part of the bow hair that the arm reaches on all four
strings. The table gives this part for the cello at commit `7bd2463`. The current hold has a
lean of 15° and a shoulder turn of 10°.

| Hold of the cello | rabbit, foxes (1.0) | cat, wolf, beaver, monkey, badger (0.95) | dog, pig (1.05) | deer (1.1) | panda (1.2) |
|---|---|---|---|---|---|
| Now: lean 15°, shoulder turn 10° | 60% | 29% | 82% | 97% | 100% |
| Shoulder turn 30° | 87% | 75% | 99% | 100% | 100% |
| Lean 20°, shoulder turn 30° (the values of the contrabass) | 91% | 80% | 100% | 100% | 100% |
| Lean 25°, shoulder turn 30° | 95% | 83% | 100% | 100% | 100% |
| Bow slant 30°, shoulder turn 30° | 100% | 89% | 100% | 100% | 100% |

The proposal gives the cello a lean of 20° and a shoulder turn of 30°, the values of the
contrabass. Then the dog reaches the full hair. The scratch run of `pnpm test` with the new map
and this hold failed only the tests that pin the old values (section 8). The reach tests of the
bow, the horn (pig), and the trombone (panda) passed.

At the time of this report, another agent had uncommitted changes to the cello and contrabass
holds in `models/instruments/strings.ts` and `pose/bowed.ts`. The cello leans 25° to the left,
with a shoulder turn of 30° and a lean of 10°. With these changes, the dog reaches 95% of the
hair, and 100% with a lean of 20°. With a lean of 25°, each species of the size 0.95 also reaches
100%. Thus the lean of 20° works with both holds. Measure the reach again on the final hold.

The contrabass keeps a large species. The medium species reach at most 89% of its hair (dog and
pig, lean 25°). The hippo reaches 100%.

## 6. Proposed layout

### 6.1 Rows

The strings sit in wedges, as in S1: the first desk of each string section sits in the front
row, and the other desks sit behind it. The woodwinds form a block of two rows. The brass and the
percussion sit behind them.

| Row | Sections, from left to right | Arrangement |
|---|---|---|
| 0 | first violins, second violins, violas, cellos: the first desk (players 0 and 1) of each seat | Split at 0° between the violins and the violas. Each side spans at most 80° |
| 1 | the same sections: the other desks (players 2 and higher) | Split as row 0. The wedge pass (6.2) moves each desk behind the first desk of its seat |
| 2 | (celesta), harp, flutes, oboes | Centered on 0° |
| 3 | horns, clarinets, bassoons, trumpets | Centered on 0° |
| 4 | percussion, contrabasses, timpani, trombones, tuba | Centered on 0° |
| 5 | choir, on the risers | As now |

A string seat with one or two players has only a first desk, so it sits only in row 0. A row with
no players drops out, as now. The Grieg demo thus has three rows: the first desks, the other
desks, and the basses.

The diagram shows the proposed rows from above, for a full orchestra.

```text
                           back of the stage
            row 4:  perc.  basses  timpani  trombones  tuba
          row 3:  horns   clarinets | bassoons   trumpets
            row 2:  harp      flutes | oboes
       row 1:  1st vln  2nd vln     |     violas      cellos
     row 0:  1st vln    2nd vln     |      violas       cellos
                              [conductor]
       [piano of a concerto, front left]
                      front of the stage (audience)
```

```typescript
/** The proposed rows (design 4.5). `-b` is the group of the desks after the first desk. */
const ROWS: readonly (readonly RowGroup[])[] = [
  ['violin-1', 'violin-2', 'viola', 'cello'],
  ['violin-1-b', 'violin-2-b', 'viola-b', 'cello-b'],
  ['harp', 'flute', 'oboe'],
  ['horn', 'clarinet', 'bassoon', 'trumpet'],
  ['percussion', 'contrabass', 'timpani', 'trombone', 'tuba'],
];

/** Rows 0 and 1 put the violins left of 0° and the other strings right of it. */
const SPLIT_ROWS = 2;
```

`groupOf()` takes the player index. A violin, viola, or cello player with an index of 2 or more
goes to the group with the suffix `-b`.

### 6.2 The wedge pass of row 1

Row 1 packs and spreads as now. Then each back desk moves toward its wedge:

1. The target angle of a back-desk player is the middle angle of the first desk of its seat in
   row 0. The players of one seat keep their packed spacing around this angle.
2. A left-to-right pass keeps each packed arc between neighbors as a minimum.
3. For each side, the row takes the largest blend `λ` between the spread angles (`λ = 0`) and
   the target angles (`λ = 1`), in steps of 0.1. The blend must keep each seat within ±90°, each
   footprint 0.3 m from the stage edges, and each footprint 0.05 m from the items of other rows.

The scratch run gave these values:

| Demo | Left side λ | Right side λ | Cello of the back desk |
|---|---|---|---|
| Beethoven | 1.0 | 1.0 | 75°, behind the cellos at 60° and 90° |
| Boulanger | 0 (the harp blocks it) | 1.0 | 75° |
| Grieg | 0 | 0.3 | 46° |
| Handel | 1.0 | 1.0 | 75° |
| K. 315 | 0 | 0.6 | 58° |
| K. 488 | 0.1 | 0.9 | 71° |

Without the pass, the back-desk cello sits at 33°, behind the violas.

### 6.3 Interaction with the layout rules of design 4.5

- **Row radius.** The rule `r(n) = max(r(n − 1) + 1.2, width(n) / 2.79)` stays. The split rule
  of row 0 (2 × the wider side, each side at most 80°) now applies to rows 0 and 1. Row 0 holds
  at most eight players (two in each first desk). Its radius is 2.95 m in each of the six demos.
  It was 2.72 m.
- **Spread.** The spread toward ±90° stays for each row. The wedge pass of row 1 comes after it.
  The pass makes arcs longer than 1.6 m in row 1, for example 3.7 m from a viola at 24° to a cello
  at 75°. The limit of 1.6 m (design 4.5, `SpreadLimits.maxArc`) applies only to the spread. The
  test "keeps two neighbors of a row at most 1.6 m apart" needs an exception for row 1.
- **Stage size.** For the demos and `perf-60.mid`, `S` changes by −1.26 m to +0.69 m. The table
  gives `S` in meters with the section size "Auto".

  | Demo | Now | Proposed |
  |---|---|---|
  | Beethoven | 9.82 | 9.55 |
  | Boulanger | 11.68 | 11.00 |
  | Grieg | 7.00 | 7.56 |
  | Handel | 10.94 | 11.63 |
  | K. 315 | 8.10 | 8.33 |
  | K. 488 | 8.91 | 9.14 |
  | `perf-60.mid` ("One per part") | 14.67 | 13.41 |
  | Reference composition (design 4.5) | 6.60 | 8.12 |

- **Reference composition.** Its 2 flutes and 3 clarinets now fill two woodwind rows, and its
  four second violins fill two desks. Thus `S` grows from 6.6 m to 8.12 m. The reference image
  puts the flutes at the front right, which is not a professional place. The test that pins
  6.6 m must take the new value, and design 4.5 must say why.
- **Near corner.** The distance from the near corner of the stage to the nearest seat changes
  from 0.147 to 0.224 S for `perf-60.mid`. The test bound of 0.16 must become 0.23. The demos stay
  within the bound of 0.31: 0.173 to 0.285 S (0.171 to 0.305 S now).
- **Choir.** The Handel choir stands on two riser levels (radii 9.03 m and 9.83 m), because two
  levels now give the smallest stage. The test of review F13 expects three levels.
- **Overlap.** The overlap test of `models/` passed for all demo layouts, all section sizes, and
  `perf-60.mid`.

### 6.4 The celesta (optional)

The Boulanger demo plays the celesta (program 8) on its piano seat. Design 4.5 puts each piano at
the place of a concerto soloist. A professional orchestra puts the celesta at the left, behind
the violins, near the harp (S1, S6).

A grand piano model in a row would push the row back by about 2 m, because its case points to
the podium. A real celesta is a small upright keyboard. The proposal:

1. `castScore()` gives a piano seat whose programs are all 8 the new instrument `celesta`.
2. The celesta model is an upright case of about 1.0 × 0.5 × 1.0 m, with the key line of the
   piano model, so that step 5 can use the key targets. The player sits on the piano bench.
3. The celesta player joins row 2 as its leftmost group, beside the harp.

Not measured: the stage size and the camera check with the celesta in row 2.

## 7. Check of the default camera

The scratch tool drew the silhouettes of all players and the conductor with a depth buffer at
1440 × 900 px. It used the default view of design 4.5 (elevation 28°, azimuth 30°, distance
3.3 × S, field of view 30°). Each player is its bind pose mesh at its layout place. The chairs and
the stands were not drawn. The head is the triangles of the bones `head`, `jaw`, `eyeL`, `eyeR`,
`earL`, `earR`, and `trunk1` to `trunk3`. The tables list each pair in which one player hides at
least 10% of the head of another player.

Now (commit `7bd2463`, section size "Auto"):

| Demo | Large animal | Hidden animal | Part of the head hidden |
|---|---|---|---|
| Beethoven | hippo (contrabass, row 2, +90°) | monkey (trumpet) | 34% |
| Boulanger | hippo (contrabass, row 2, +90°) | beaver (bassoon) | 90% |
| Handel | elephant (timpani) | penguin (choir) | 23% |

Other pairs: a rabbit hides 11% to 30% of the head of a red fox behind it (Boulanger, Grieg,
K. 315, K. 488).

Proposed (sections 5 and 6, with the wedge pass):

| Demo | Large animal | Hidden animal | Part of the head hidden |
|---|---|---|---|
| Handel | elephant (timpani) | penguin (choir) | 16% |

No other large animal hides 10% or more of the head of any animal. The bear on the podium hides
less than 10% of each head in both layouts. Other pairs: a rabbit hides 13% of the head of the
deer (Boulanger), and a rabbit hides 13% to 16% of the head of a rabbit behind it.

The camera sees the right end of each row near the image bottom. A large animal there hides the
row in front of it. The proposal keeps the large species in row 4, from 13° left of center to 36°
right of it. In Boulanger, the rhino at +36° is the large animal nearest the camera, and it hides
no head.

With the basses behind the cellos (question 1, at the right end of row 1), the hippos hide 10% to
12% of the head of a dog cellist (Beethoven, Boulanger). That run had no wedge pass.

## 8. Implementation checklist

Make one commit for each item. Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` before each
commit.

1. **Species map.** In `models/cast.ts`, set the cello to `dog`, the horn to `pig`, and the
   trombone to `panda`. Rewrite the rule test of `cast.test.ts`: a species of the size 1.2 or more
   plays only the contrabass, the timpani, the trombone, or the tuba. The violin, the viola, and
   the cello have species of the size 1.05 or less, and the piano 1.0 or less. Update
   `gallery/items.test.ts` (cello: `dog`) and `gallery/view-poses.test.ts` (`dog cello`).
   Update design 4.2 (the bullet on larger species), 4.3 (the table and its bullet), and the
   reference text of section 1.
2. **Cello hold.** In `pose/bowed.ts`, give the cello a lean of 20° and a shoulder turn of 30°.
   Rebase on the work of the other agent on the floor holds first. Confirm that the test "reaches
   the full bow hair" passes with the dog. Update design 5.3.
3. **Trombone slide.** Measure the slide travel that the arm of the panda reaches (design 5.3
   gives 0.13 m of 0.55 m for the pig). Update design 5.3.
4. **Desk split and rows.** In `models/layout-scene.ts`, give `groupOf()` the player index, use
   the rows of section 6.1, and set `SPLIT_ROWS` to 2. Update the stage sides of
   `layout-scene.test.ts`, the reference composition (8.12 m), the riser levels of Handel, and
   the near corner bound of `perf-60.mid`.
5. **Wedge pass.** Add the pass of section 6.2 after the spread. Add a test: in Beethoven, the
   back-desk cello sits within 5° of the middle of the front cello desk. Give the 1.6 m test an
   exception for row 1. Check the near-corner and overlap tests.
6. **Design.** Update the diagram and the bullets of 4.2, the rows table and the seat geometry of
   4.5 (desks, split rows, the wedge pass, the stage sides, the reference composition, the
   risers), and section 10. Remove the row "Row 0 holds the first violins to the left of 0° and
   the violas to the right" of the step 4 layout agent, and add the new decisions.
7. **Celesta (optional).** Add the `celesta` instrument, its cast rule, and its place in row 2
   (section 6.4). Check its triangle budget (500), the gallery, and the overlap test.
8. **Screenshots.** Run `pnpm screenshots` and compare demo 1 and Boulanger with
   `docs/reviews/step-5/`.
9. **Camera guard (optional).** A Vitest test in `models/` can draw the silhouettes as in
   section 7, and check that no species of the size 1.2 or more hides 10% of the head of a
   smaller species in the six demos.

The scratch scripts of this report are not in the repository. The method of section 7 needs
`layoutScene()`, `ModelCache`, `defaultView()`, and about 100 lines for the depth buffer.

## 9. Open questions for the user

1. **The place of the basses.** The proposal puts the basses in a line at the back, as the Vienna
   Philharmonic does (S2). Thus the hippos sit at the back, as the user asked, and hide no
   smaller animal. The most common place is behind the cellos, at the right (S1, S2). There, the
   hippos sit near the camera and hide 10% to 12% of the head of a cellist, and the Grieg stage is
   8.96 m in place of 7.56 m. The default is the line at the back.
