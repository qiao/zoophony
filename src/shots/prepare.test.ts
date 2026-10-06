import { describe, expect, it } from 'vitest';

import {
  noteOff,
  noteOn,
  programChange,
  tempo,
  timeSignature,
  track,
  writeSmf,
} from '../midi/test-smf.ts';
import type { TestEvent, TestFile } from '../midi/test-smf.ts';
import type { Score } from '../score/types.ts';
import { angleDifference, viewAngle } from './camera-keys.ts';
import { layoutScene } from '../models/layout-scene.ts';
import { ModelCache } from '../models/model-cache.ts';
import { stringQuartetFile } from '../models/test-chamber.ts';
import { scoreOf } from '../score/test-score.ts';
import { JUMP_CUT, SHOT_TIMES, SMALL_GROUP_SEATS, prepareShots } from './prepare.ts';
import { SECTION_GROUPS, prepareSubjects, sectionSubject, soloSubject } from './subjects.ts';
import type { SectionGroup } from './subjects.ts';
import { TEST_SEED, chamberShotScenes, shotDemos, shotSceneOf } from './test-shots.ts';
import type { Shot } from './types.ts';
import { DEFAULT_AZIMUTH, DEFAULT_ELEVATION, FIELD_OF_VIEW } from './view.ts';

const DEMOS = await shotDemos();

const SCENES = DEMOS.map((demo) => shotSceneOf(demo.file, demo.bytes));

/** The chamber test files: a piano solo, a duo, a string quartet, and a wind quintet. */
const CHAMBER = chamberShotScenes();

/**
 * Gives the group of a section or solo shot.
 *
 * @param score The score.
 * @param shot The shot.
 * @returns The group, or `null` for a wide, a high, or a conductor shot.
 */
function groupOf(score: Score, shot: Shot): SectionGroup | null {
  if (shot.kind !== 'section' && shot.kind !== 'solo') {
    return null;
  }
  const section = score.seats[shot.seats[0] ?? -1]?.section;
  return section && section !== 'sound-only' ? SECTION_GROUPS[section] : null;
}

/**
 * Tells if a shot is a wide or a high shot.
 *
 * @param shot The shot.
 * @returns True for a wide or a high shot.
 */
function isWide(shot: Shot): boolean {
  return shot.kind === 'wide' || shot.kind === 'high';
}

describe('the cut points of prepareShots() (design 5.6)', () => {
  it.each(SCENES)(
    'cuts $file on downbeats or middle beats, or on a beat when none fits',
    (scene) => {
      const { plan, score } = scene;
      const downbeats = score.beats.filter((b) => b.indexInBar === 0).map((b) => b.timeSec);
      const beats = score.beats.map((b) => b.timeSec);
      // The middle beat of a bar with an even number of beats (N5).
      const middles = downbeats.flatMap((time, i) => {
        const next = downbeats[i + 1];
        if (next === undefined) {
          return [];
        }
        const middle = (time + next) / 2;
        return beats.some((t) => Math.abs(t - middle) <= 0.001) ? [middle] : [];
      });
      const near = (list: readonly number[], time: number): boolean =>
        list.some((t) => Math.abs(t - time) <= 0.001);
      let onBeat = 0;
      for (const shot of plan.shots.slice(1)) {
        expect(near(beats, shot.startSec), `${shot.startSec}`).toBe(true);
        if (!near(downbeats, shot.startSec) && !near(middles, shot.startSec)) {
          onBeat++;
        }
      }
      // Nearly all cuts fall on a downbeat or on the middle beat of a bar.
      expect(onBeat).toBeLessThanOrEqual(Math.ceil(plan.shots.length * 0.1));
    },
  );

  it.each(SCENES)('varies the shot lengths of $file (N5)', (scene) => {
    // In Bach, 30 of 34 shots lasted 9.6 s, and K. 525 had three lengths (UX audit 2026-10-06).
    // With cuts on downbeats and middle beats, the bars of K. 525 (3.6 s) allow 5 lengths from 4 s
    // to 14 s.
    const lengths = scene.plan.shots
      .slice(1, -1)
      .map((shot) => (shot.endSec - shot.startSec).toFixed(1));
    const counts = new Map<string, number>();
    for (const length of lengths) {
      counts.set(length, (counts.get(length) ?? 0) + 1);
    }
    expect(counts.size).toBeGreaterThanOrEqual(5);
    expect(Math.max(...counts.values()) / lengths.length).toBeLessThanOrEqual(0.5);
  });

  it.each(SCENES)(
    'gives each shot of $file 4 to 14 s, and 18 s for a wide or high shot',
    (scene) => {
      const { plan } = scene;
      for (const [i, shot] of plan.shots.entries()) {
        if (i > 0) {
          expect(shot.startSec).toBe(plan.shots[i - 1]?.endSec);
        }
        if (i === 0 || i === plan.shots.length - 1) {
          continue;
        }
        const length = shot.endSec - shot.startSec;
        expect(length, `shot ${i}`).toBeGreaterThanOrEqual(SHOT_TIMES.minSec - 1e-9);
        expect(length, `shot ${i}`).toBeLessThanOrEqual(
          (isWide(shot) ? SHOT_TIMES.maxWideSec : SHOT_TIMES.maxSec) + 1e-9,
        );
      }
      expect(Array.from(plan.starts)).toEqual(plan.shots.map((s) => s.startSec));
    },
  );

  it.each([...SCENES, ...CHAMBER])(
    'opens $file on the default view and ends on a wide shot',
    (scene) => {
      const { plan, score } = scene;
      const first = plan.shots[0];
      const last = plan.shots.at(-1);
      expect(first?.startSec).toBe(-Infinity);
      // The first screen shows the default view of design 4.5, so the click on play makes no cut
      // (audit 2026-10-05, FI1). The view pushes in over the first phrase.
      expect(first?.kind).toBe('wide');
      expect(first?.from.azimuth).toBeCloseTo(DEFAULT_AZIMUTH, 9);
      expect(first?.from.elevation).toBeCloseTo(DEFAULT_ELEVATION, 9);
      expect(first?.from.zoom).toBe(1);
      expect(first?.from.fov).toBe(FIELD_OF_VIEW);
      expect(first?.to).toEqual({ ...first?.from, zoom: 0.88 });
      expect(first?.endSec).toBeGreaterThanOrEqual(SHOT_TIMES.minSec);
      expect(last?.kind).toBe('wide');
      expect(last?.endSec).toBe(Infinity);
      expect(last?.startSec).toBeLessThanOrEqual(score.durationSec - SHOT_TIMES.lastLeadSec);
      expect(last?.moveEndSec).toBe(score.durationSec);
      expect(last?.from.zoom).toBeLessThan(last?.to.zoom ?? 0);
    },
  );
});

describe('the choice of the shots of prepareShots() (design 5.6)', () => {
  it.each(SCENES)('repeats no subject and no group in neighbor shots of $file', (scene) => {
    const { plan, score } = scene;
    for (let i = 1; i < plan.shots.length; i++) {
      const a = plan.shots[i - 1];
      const b = plan.shots[i];
      if (!a || !b) {
        continue;
      }
      const sameSubject = a.kind === b.kind && a.seats.join() === b.seats.join();
      expect(sameSubject && b.kind !== 'wide', `shots ${i - 1} and ${i}`).toBe(false);
      const group = groupOf(score, b);
      if (group) {
        expect(groupOf(score, a), `shots ${i - 1} and ${i}`).not.toBe(group);
      }
    }
  });

  it.each(SCENES)('keeps three shots between wide or high shots of $file, at most 25%', (scene) => {
    const { plan } = scene;
    // The opening is a wide shot. The rule counts the shots after it.
    let last = 0;
    let count = 0;
    for (const [i, shot] of plan.shots.entries()) {
      if (i > 0 && isWide(shot)) {
        expect(i - last, `shot ${i}`).toBeGreaterThan(SHOT_TIMES.wideSpacing);
        last = i;
        count++;
      }
    }
    expect(count / (plan.shots.length - 1)).toBeLessThanOrEqual(0.25);
  });

  it.each(SCENES)(
    'shows the conductor of $file in at most 20% of the shots, first over its shoulder',
    (scene) => {
      // Bach had 12 conductor shots of 35, all from one angle (UX audit 2026-10-05, SC3).
      const { plan } = scene;
      const conductor = plan.shots.flatMap((shot, i) => (shot.kind === 'conductor' ? [i] : []));
      expect(conductor.length / plan.shots.length).toBeLessThanOrEqual(0.2);
      // The first conductor shot comes after five other shots. Its camera stands on the audience
      // side, so the players fill the frame behind the bear.
      const first = conductor[0] ?? -1;
      expect(first).toBeGreaterThanOrEqual(SHOT_TIMES.conductorSpacing);
      const fromAudience = (i: number): boolean =>
        Math.abs(angleDifference(plan.shots[i]?.from.azimuth ?? Math.PI, 0)) < Math.PI / 2;
      expect(fromAudience(first)).toBe(true);
      // The next conductor shot shows the face of the bear from the orchestra side.
      if (conductor.length > 1) {
        expect(fromAudience(conductor[1] ?? -1)).toBe(false);
      }
    },
  );

  it.each(SCENES)(
    'puts each section and solo camera of $file on the 6° grid of its front',
    (scene) => {
      // The planner keeps the test result of each camera of a subject on the grid (design 5.6).
      const { score, layout, models, plan } = scene;
      const subjects = prepareSubjects(score, layout, models);
      let checked = 0;
      for (const shot of plan.shots) {
        const subject =
          shot.kind === 'solo'
            ? soloSubject(subjects, shot.seats[0] ?? -1)
            : shot.kind === 'section'
              ? sectionSubject(subjects, shot.seats)
              : null;
        if (!subject) {
          continue;
        }
        const steps = angleDifference(shot.from.azimuth, subject.front) / ((6 * Math.PI) / 180);
        expect(
          Math.abs(steps - Math.round(steps)),
          `${shot.kind} at ${shot.startSec}`,
        ).toBeLessThan(1e-6);
        checked++;
      }
      expect(checked).toBeGreaterThan(5);
    },
  );

  it('keeps the section and solo cameras of the demos low (N4)', () => {
    // The close shots of the back rows looked down at 40° to 60° (UX audit 2026-10-06, N4).
    // A piano shot is 20° higher, so that it looks down on the keys.
    const deg = 180 / Math.PI;
    const elevations = SCENES.flatMap(({ plan, score }) =>
      plan.shots
        .filter(
          (shot) =>
            (shot.kind === 'section' || shot.kind === 'solo') &&
            !shot.seats.every((seat) => score.seats[seat]?.section === 'piano'),
        )
        .map((shot) => shot.from.elevation * deg),
    );
    expect(Math.max(...elevations)).toBeLessThanOrEqual(50 + 1e-9);
    const low = elevations.filter((e) => e <= 30 + 1e-9).length;
    const high = elevations.filter((e) => e > 40 + 1e-9).length;
    expect(low / elevations.length).toBeGreaterThanOrEqual(0.6);
    expect(high / elevations.length).toBeLessThanOrEqual(0.15);
  });

  it.each(SCENES)('shows a wide or high shot of $file at least every 60 s (N6)', (scene) => {
    // K. 315 showed no wide view from 10 s to 183 s (UX audit 2026-10-06, N6).
    const { plan } = scene;
    let lastEnd = 0;
    for (const shot of plan.shots) {
      if (!isWide(shot)) {
        continue;
      }
      const start = Math.max(0, shot.startSec);
      expect(start - lastEnd, `wide view at ${start.toFixed(1)} s`).toBeLessThanOrEqual(60 + 1e-9);
      lastEnd = shot.endSec;
    }
  });

  it.each(SCENES)(
    'turns the camera of the next shot of a subject of $file by 20° (N7)',
    (scene) => {
      // K. 315 showed the solo flute six times from almost the same angle (UX audit 2026-10-06).
      const { plan, score } = scene;
      const last = new Map<string, number>();
      let checked = 0;
      for (const shot of plan.shots) {
        if (shot.kind !== 'section' && shot.kind !== 'solo') {
          continue;
        }
        const section = score.seats[shot.seats[0] ?? -1]?.section;
        const group = section && section !== 'sound-only' ? SECTION_GROUPS[section] : 'none';
        const id = shot.kind === 'solo' ? `solo ${shot.seats[0]}` : `section ${group}`;
        const before = last.get(id);
        if (before !== undefined) {
          const turn = Math.abs(angleDifference(shot.from.azimuth, before)) * (180 / Math.PI);
          expect(turn, `${id} at ${shot.startSec.toFixed(1)} s`).toBeGreaterThanOrEqual(20 - 1e-6);
          checked++;
        }
        last.set(id, shot.from.azimuth);
      }
      expect(checked).toBeGreaterThan(3);
    },
  );

  it.each(SCENES)('makes no jump cut in $file', (scene) => {
    const { plan } = scene;
    const size = (shot: Shot): number => (isWide(shot) ? 0.7 * plan.stageSide : shot.radius);
    for (let i = 1; i < plan.shots.length; i++) {
      const a = plan.shots[i - 1];
      const b = plan.shots[i];
      if (!a || !b) {
        continue;
      }
      const ratio = Math.max(size(a), size(b)) / Math.min(size(a), size(b));
      const angle = viewAngle(a.to, b.from);
      expect(angle >= JUMP_CUT.angle || ratio >= JUMP_CUT.sizeRatio, `shots ${i - 1}, ${i}`).toBe(
        true,
      );
    }
  });

  it('holds the previous shot when no subject fits, with no wide shot before the last', () => {
    // Four seats play 20 bars (40 s), rest 16 bars, and play one more bar. The windows after the
    // cuts in the rest have no active seat, so no subject fits. The previous shot holds on, and
    // then the conductor fills the time. In the Beethoven 8 demo, a wide shot there came just
    // before the last wide shot, against rule 3, and made a jump cut.
    const file: TestFile = {
      tracks: [
        [tempo(0, 120), timeSignature(0, 4, 4)],
        ...[40, 41, 42, 43].map((program, channel) =>
          track(
            [programChange(0, channel, program)],
            [...bars(channel, 60 + channel, 0, 20, 64), ...bars(channel, 60 + channel, 36, 37, 64)],
          ),
        ),
      ],
    };
    const { plan } = shotSceneOf('rest', writeSmf(file));
    const last = plan.shots.at(-1);
    expect(last?.kind).toBe('wide');
    expect(plan.shots.slice(-1 - SHOT_TIMES.wideSpacing, -1).some(isWide)).toBe(false);
    // The shot at the start of the rest holds into it, or the conductor fills it.
    const inRest = plan.shots.filter((shot) => shot.endSec > 44 && shot.startSec < 66);
    expect(inRest.every((shot) => !isWide(shot) || shot === last)).toBe(true);
    for (const shot of plan.shots.slice(1, -1)) {
      expect(shot.endSec - shot.startSec).toBeLessThanOrEqual(SHOT_TIMES.maxSec + 1e-9);
    }
  });

  it('gives the same plan for the same seed, and another plan for another seed', () => {
    const demo = DEMOS[0];
    const scene = SCENES[0];
    if (!demo || !scene) {
      throw new Error('No demo.');
    }
    expect(shotSceneOf(demo.file, demo.bytes, TEST_SEED).plan).toEqual(scene.plan);
    expect(shotSceneOf(demo.file, demo.bytes, TEST_SEED + 1).plan).not.toEqual(scene.plan);
  });
});

/** A quarter note in ticks. At 120 BPM, it is 0.5 s, and a bar of 4/4 is 2 s. */
const QUARTER = 480;

/** A bar of 4/4 in ticks. */
const BAR = QUARTER * 4;

/**
 * Makes a held note on a channel for a range of bars.
 *
 * @param channel The channel.
 * @param key The key.
 * @param from The first bar.
 * @param to The bar after the last bar.
 * @param velocity The velocity.
 * @returns The events, one note for each bar.
 */
function bars(
  channel: number,
  key: number,
  from: number,
  to: number,
  velocity: number,
): TestEvent[] {
  const events: TestEvent[] = [];
  for (let bar = from; bar < to; bar++) {
    events.push(
      noteOn(bar * BAR, channel, key, velocity),
      noteOff(bar * BAR + BAR - 10, channel, key),
    );
  }
  return events;
}

describe('the soloist and the first voice (design 5.6, UX audit 2026-10-05, SC4)', () => {
  it('gives the solo flute of the K. 315 concerto an early solo shot', () => {
    // The first rule gave the flute its first solo shot at 94 s.
    const scene = SCENES.find((s) => s.file === 'mozart-k315.mid');
    if (!scene) {
      throw new Error('No K. 315 demo.');
    }
    const flute = scene.score.seats.findIndex((s) => s.section === 'flute');
    const first = scene.plan.shots.find((s) => s.kind === 'solo' && s.seats[0] === flute);
    expect(first?.startSec).toBeLessThan(20);
  });

  it('films the soloist of K. 315 at its place at the front left (design 4.5, AM3)', () => {
    const scene = SCENES.find((s) => s.file === 'mozart-k315.mid');
    if (!scene) {
      throw new Error('No K. 315 demo.');
    }
    const { soloist } = scene.score;
    const place = scene.layout.players.find((p) => p.cast.seatIndex === soloist);
    const shots = scene.plan.shots.filter((s) => s.kind === 'solo' && s.seats[0] === soloist);
    expect(shots.length).toBeGreaterThanOrEqual(3);
    for (const shot of shots) {
      // The target is above the soloist, and the camera looks at its front from the audience.
      expect(shot.target[0]).toBeCloseTo(place?.position[0] ?? NaN, 6);
      expect(shot.target[2]).toBeCloseTo(place?.position[2] ?? NaN, 6);
      const front = Math.atan2(-Math.sin(place?.facing ?? 0), -Math.cos(place?.facing ?? 0));
      expect(Math.abs(angleDifference(shot.from.azimuth, front))).toBeLessThanOrEqual(
        (75 * Math.PI) / 180 + 1e-9,
      );
    }
  });

  it('shows the first voice of the Ode to Joy at the first cut', () => {
    // The baritone sings alone from 1.5 s. The first rule gave the first singer shot at 18 s.
    const scene = SCENES.find((s) => s.file === 'beethoven-9.mid');
    if (!scene) {
      throw new Error('No Ode to Joy demo.');
    }
    const firstNote = scene.score.notes[0];
    const shot = scene.plan.shots[1];
    expect(shot?.kind).toBe('solo');
    expect(shot?.seats).toEqual([firstNote?.seatIndex]);
    expect(scene.score.seats[firstNote?.seatIndex ?? -1]?.section).toBe('choir');
  });
});

describe('the music of the shots of prepareShots() (design 5.6)', () => {
  it('cuts to the horns at their entry after four bars of rest', () => {
    // Soft strings play 40 bars. The horns rest from the start and enter at bar 12 (24 s), on a
    // phrase line.
    const file: TestFile = {
      tracks: [
        [tempo(0, 120), timeSignature(0, 4, 4)],
        track([programChange(0, 0, 40)], bars(0, 67, 0, 40, 40)),
        track([programChange(0, 1, 41)], bars(1, 60, 0, 40, 40)),
        track([programChange(0, 2, 42)], bars(2, 48, 0, 40, 40)),
        track([programChange(0, 3, 60)], bars(3, 67, 12, 24, 110)),
      ],
    };
    const bytes = writeSmf(file);
    for (const seed of [1, 2, 3, 4, 5]) {
      const { plan, score } = shotSceneOf('horns', bytes, seed);
      const horn = score.seats.findIndex((s) => s.section === 'horn');
      const shot = plan.shots.find((s) => Math.abs(s.startSec - 24) < 1e-6);
      expect(shot, `seed ${seed}`).toBeDefined();
      expect(shot?.seats, `seed ${seed}`).toContain(horn);
    }
  });

  it('shows a loud tutti in a wide or high shot', () => {
    // Twelve seats play loud chords for 100 s. The opening and the last shot are wide shots, and
    // rule 3 needs three other shots after the opening and before the last shot.
    const programs = [40, 41, 42, 43, 73, 68, 71, 70, 60, 56, 57, 58];
    const channels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12];
    const file: TestFile = {
      tracks: [
        [tempo(0, 120), timeSignature(0, 4, 4)],
        ...channels.map((channel, i) =>
          track([programChange(0, channel, programs[i] ?? 0)], bars(channel, 55 + i, 0, 50, 120)),
        ),
      ],
    };
    const { plan } = shotSceneOf('tutti', writeSmf(file));
    expect(plan.shots.slice(1, -1).some(isWide)).toBe(true);
  });
});

describe('the shots of a chamber group (design 4.2, 5.6)', () => {
  /** Gives the kinds of the shots of a plan after the opening, with the seats. */
  const kindsOf = (file: string): string[] => {
    const scene = CHAMBER.find((c) => c.file === file);
    if (!scene) {
      throw new Error(`No chamber scene ${file}.`);
    }
    return scene.plan.shots
      .slice(1)
      .map((s) =>
        s.seats.length > 0 ? `${s.kind} ${s.seats.toSorted((a, b) => a - b).join('+')}` : s.kind,
      );
  };

  it.each(CHAMBER)('gives $file no conductor shot', (scene) => {
    expect(scene.layout.conductor).toBeNull();
    expect(scene.plan.shots.filter((s) => s.kind === 'conductor')).toEqual([]);
    expect(scene.plan.shots.length).toBeGreaterThan(4);
  });

  it('films a duo with the close-ups of its players, a two-shot, and the wide view', () => {
    expect(SMALL_GROUP_SEATS).toBe(3);
    const kinds = kindsOf('violin-piano.mid');
    expect(new Set(kinds)).toEqual(new Set(['solo 0', 'solo 1', 'section 0+1', 'wide']));
    expect(kindsOf('piano-solo.mid').every((k) => k === 'solo 0' || k === 'wide')).toBe(true);
  });

  it('films a player alone from cameras at least 20° apart in a row of solo shots', () => {
    const scene = CHAMBER.find((c) => c.file === 'piano-solo.mid');
    const shots = scene?.plan.shots ?? [];
    let pairs = 0;
    shots.slice(1).forEach((shot, i) => {
      const previous = shots[i];
      if (shot.kind === 'solo' && previous?.kind === 'solo') {
        pairs++;
        const turn = Math.abs(angleDifference(shot.from.azimuth, previous.to.azimuth));
        expect(turn, `shot ${i + 1}`).toBeGreaterThanOrEqual((20 * Math.PI) / 180 - 1e-9);
      }
    });
    expect(pairs).toBeGreaterThan(1);
  });

  it('shows no conductor and no high shot to an orchestra of two seats', () => {
    // A violin seat and a cello seat with full sections: 7 players with a conductor.
    const [meta = [], violins = [], , , cellos = []] = stringQuartetFile().tracks;
    const score = scoreOf({ tracks: [meta, violins, cellos] }, 'full');
    const models = new ModelCache();
    const layout = layoutScene(score, models);
    expect(layout.conductor).not.toBeNull();
    expect(layout.players).toHaveLength(7);
    const plan = prepareShots(score, layout, TEST_SEED, models);
    const kinds = new Set(plan.shots.map((s) => s.kind));
    expect(kinds.has('conductor')).toBe(false);
    expect(kinds.has('high')).toBe(false);
    expect(kinds.has('solo')).toBe(true);
  });
});
