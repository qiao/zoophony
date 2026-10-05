import { describe, expect, it } from 'vitest';

import { scoreOf } from '../score/test-score.ts';
import { CONDUCTOR, SECTION_INSTRUMENTS, SECTION_SPECIES } from './cast.ts';
import type { SceneLayout } from './layout.ts';
import { layoutScene } from './layout-scene.ts';
import type { PlayingSection } from './cast.ts';
import type { MeshData } from './mesh.ts';
import { buildPlayer } from './player.ts';
import { buildMusicStand, buildRisers, buildSupport } from './props.ts';
import type { Support } from './props.ts';
import { BONE_NAMES, boneIndex } from './rig.ts';
import { INSTRUMENT_BUDGETS } from './instruments/catalog.ts';
import type { InstrumentId } from './instruments/types.ts';
import type { SpeciesId } from './species.ts';
import { buildStage } from './stage.ts';
import { perf60File } from './test-perf-60.ts';

/** The most triangles of a body (design 4.5, facets and triangle budgets). */
const BODY_BUDGET = 1800;

/** The most triangles of the scene with 60 players (design 4.5). */
const SCENE_BUDGET = 150_000;

/** The most triangles of a chair, a stool, or the piano bench, and of a music stand (4.5). */
const SEAT_BUDGET = 120;
const STAND_BUDGET = 80;

/** The bones that carry the instrument pieces (design 4.7). */
const INSTRUMENT_BONES: ReadonlySet<number> = new Set(
  (['instrument', 'slide', 'bow', 'malletL', 'malletR', 'baton'] as const).map((bone) =>
    boneIndex(bone),
  ),
);

/** Counts the triangles of the body and of the instrument of a player mesh. */
function countParts(mesh: MeshData) {
  let instrument = 0;
  for (let t = 0; t < mesh.bones.length / 3; t++) {
    if (INSTRUMENT_BONES.has(mesh.bones[t * 3] ?? 0)) {
      instrument++;
    }
  }
  return { body: mesh.bones.length / 3 - instrument, instrument };
}

/** Each species with each instrument of its section, and the conductor (design 4.3, 4.6). */
const CAST: readonly (readonly [SpeciesId, InstrumentId])[] = [
  ...Object.keys(SECTION_SPECIES)
    .filter((section): section is PlayingSection => section in SECTION_SPECIES)
    .flatMap((section) =>
      SECTION_SPECIES[section].flatMap((species) =>
        SECTION_INSTRUMENTS[section].map((id): readonly [SpeciesId, InstrumentId] => [species, id]),
      ),
    ),
  [CONDUCTOR.species, CONDUCTOR.instrument],
];

describe('triangle budgets (design 4.5)', () => {
  it('casts all 19 species and all 22 instruments', () => {
    expect(new Set(CAST.map(([species]) => species)).size).toBe(19);
    expect(new Set(CAST.map(([, id]) => id)).size).toBe(22);
  });

  it('keeps each body within 1,800 triangles and each instrument within its budget', () => {
    for (const [species, id] of CAST) {
      for (const kettles of id === 'timpani' ? ([2, 3, 4] as const) : ([4] as const)) {
        const { mesh } = buildPlayer(species, id, kettles);
        const { body, instrument } = countParts(mesh);
        expect(body, `${species} with the ${id}`).toBeLessThanOrEqual(BODY_BUDGET);
        expect(instrument, `${species} with the ${id}`).toBeLessThanOrEqual(INSTRUMENT_BUDGETS[id]);
        expect(instrument, `${species} with the ${id}`).toBeGreaterThan(0);
        // The skeleton has all bones, so the mesh fits a pose of 5.1.
        expect(Math.max(...mesh.bones)).toBeLessThan(BONE_NAMES.length);
      }
    }
  });

  it('keeps each seat within 120 triangles and the music stand within 80', () => {
    const seats: readonly Support[] = ['chair', 'stool', 'high-stool', 'bench'];
    for (const support of seats) {
      const seat = buildSupport(support);
      expect(seat, support).not.toBeNull();
      expect((seat?.positions.length ?? Infinity) / 9, support).toBeLessThanOrEqual(SEAT_BUDGET);
    }
    expect(buildMusicStand().positions.length / 9).toBeLessThanOrEqual(STAND_BUDGET);
  });
});

/**
 * Counts the triangles of the scene of a layout: the stage, the risers, each player with its seat,
 * each music stand, and the conductor.
 */
function sceneTriangles(layout: SceneLayout): number {
  const count = (mesh: MeshData | null): number => (mesh ? mesh.positions.length / 9 : 0);
  let total = count(buildStage(layout.stageSide, layout.podium));
  total += count(buildRisers(layout.risers, layout.podium));
  for (const { cast, support } of layout.players) {
    total += count(buildPlayer(cast.species, cast.instrument, cast.kettles).mesh);
    total += count(buildSupport(support));
  }
  total += layout.stands.length * count(buildMusicStand());
  return total + count(buildPlayer(CONDUCTOR.species, CONDUCTOR.instrument).mesh);
}

describe('scene triangle budget (design 4.5)', () => {
  it('keeps the scene of perf-60.mid with 60 players within 150,000 triangles', () => {
    const layout = layoutScene(scoreOf(perf60File(), 'one-per-part'));
    expect(layout.players).toHaveLength(60);
    expect(sceneTriangles(layout)).toBeLessThanOrEqual(SCENE_BUDGET);
  });
});
