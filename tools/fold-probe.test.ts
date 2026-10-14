import { describe, expect, it } from 'vitest';

import { patchedDemo } from './patch-demos.ts';
import { STUDIO_BONES } from '../src/models/studio-format.ts';
import {
  FOLD_ROLES,
  SAMPLE_SETS,
  faceFacts,
  faceLines,
  foldJson,
  foldLines,
  foldedFaces,
  mainBone,
  probeFolds,
  readFoldJson,
  roleAnimal,
} from './fold-probe.ts';
import type { FoldCount, FoldReport } from './fold-probe.ts';
import { ANIMALS } from './studio-body.ts';

/** The identity matrix, column by column. */
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/**
 * Makes a mesh of one triangle: the first two corners on bone 0, the third corner on bone 1.
 *
 * @returns The mesh.
 */
function triangle(): Parameters<typeof foldedFaces>[0] {
  return {
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    joints: new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]),
    weights: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]),
    corners: new Uint32Array([0, 1, 2]),
  };
}

describe('foldedFaces', () => {
  it('finds no fold in the bind pose', () => {
    const mesh = triangle();
    expect(foldedFaces(mesh, [...IDENTITY, ...IDENTITY], mesh.positions)).toEqual([]);
  });

  it('finds a face whose corner moves across the opposite edge', () => {
    const mesh = triangle();
    // Bone 1 moves the third corner 2 m down: from (0, 1, 0) to (0, -1, 0).
    const moved = [...IDENTITY.slice(0, 12), 0, -2, 0, 1];
    const posed = new Float32Array([0, 0, 0, 1, 0, 0, 0, -1, 0]);
    expect(foldedFaces(mesh, [...IDENTITY, ...moved], posed)).toEqual([0]);
  });
});

describe('mainBone', () => {
  it('gives the studio bone with the largest weight over the corners', () => {
    expect(mainBone(triangle(), 0)).toBe(STUDIO_BONES[0]);
  });
});

/**
 * Makes a mesh of two triangles that share an edge. The first vertex has three bones, and the
 * other vertices have one bone each.
 *
 * @returns The mesh.
 */
function twoTriangles(): Parameters<typeof faceFacts>[0] {
  return {
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]),
    joints: new Uint8Array([3, 5, 6, 0, 1, 0, 0, 0, 2, 0, 0, 0, 4, 0, 0, 0]),
    weights: new Float32Array([0.2, 0.7, 0.1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]),
    corners: new Uint32Array([0, 1, 2, 1, 3, 2]),
  };
}

/**
 * Makes a count of one sample set with the samples in which each face folds.
 *
 * @param samples The number of samples.
 * @param byFace The samples of each face, by the index of the face.
 * @returns The count.
 */
function countOf(samples: number, byFace: readonly [number, number][]): FoldCount {
  return { samples, withFold: 0, most: 0, worst: '', bones: new Map(), byFace: new Map(byFace) };
}

describe('faceFacts', () => {
  it('gives the middle, the corner angles, and the weights of each corner, the largest first', () => {
    const facts = faceFacts(twoTriangles(), 0);
    expect(facts.face).toBe(0);
    expect(facts.middle.map((x) => Number(x.toFixed(6)))).toEqual([0.333333, 0.333333, 0]);
    expect(facts.angles.map((a) => Number(a.toFixed(6)))).toEqual([90, 45, 45]);
    expect(facts.weights[0]).toEqual([
      { bone: STUDIO_BONES[5], weight: expect.closeTo(0.7, 6) },
      { bone: STUDIO_BONES[3], weight: expect.closeTo(0.2, 6) },
      { bone: STUDIO_BONES[6], weight: expect.closeTo(0.1, 6) },
    ]);
    expect(facts.weights[1]).toEqual([{ bone: STUDIO_BONES[1], weight: 1 }]);
  });
});

describe('faceLines', () => {
  it('lists the faces that fold in the most samples of all sets, with the share of each set', () => {
    const report: FoldReport = {
      demos: ['a.mid'],
      faces: 2,
      mesh: {
        ...twoTriangles(),
        colors: new Float32Array(),
        finishes: new Uint8Array(),
        correctives: [],
      },
      sets: {
        rest: countOf(4, [[0, 4]]),
        play: countOf(100, [
          [0, 1],
          [1, 30],
        ]),
        lift: countOf(10, [[1, 5]]),
      },
    };
    const rows = faceLines(report, 5).filter((line) => /^\| \d/.test(line));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatch(/^\| 1 \| 0\.0% \| 30\.0% \| 50\.0% \| /);
    expect(rows[1]).toMatch(/^\| 0 \| 100\.0% \| 1\.0% \| 0\.0% \| /);
    expect(faceLines(report, 1).filter((line) => /^\| \d/.test(line))).toHaveLength(1);
  });

  it('names no face when no face folds', () => {
    const empty: FoldReport = {
      demos: [],
      faces: 0,
      mesh: null,
      sets: { rest: countOf(1, []), play: countOf(1, []), lift: countOf(1, []) },
    };
    expect(faceLines(empty, 3)).toEqual(['No face folds.']);
  });
});

describe('foldJson and readFoldJson', () => {
  it('write and read the samples and the samples with a fold of each set', () => {
    const report: FoldReport = {
      demos: ['a.mid'],
      faces: 2,
      mesh: null,
      sets: { rest: countOf(1, [[0, 1]]), play: countOf(200, []), lift: countOf(30, []) },
    };
    report.sets.rest.withFold = 1;
    report.sets.play.withFold = 7;
    expect(readFoldJson(foldJson(report))).toEqual({
      rest: { samples: 1, withFold: 1 },
      play: { samples: 200, withFold: 7 },
      lift: { samples: 30, withFold: 0 },
    });
  });

  it('stops on a set with no whole counts', () => {
    expect(() => readFoldJson('{"sets":{"rest":{"samples":1,"withFold":0}}}')).toThrow(/play/);
    expect(() => readFoldJson('{}')).toThrow(/rest/);
  });
});

describe('probeFolds', async () => {
  const boulanger = await patchedDemo('boulanger-matin.mid');
  const beethoven = await patchedDemo('beethoven-9.mid');
  const pianist = FOLD_ROLES.get('pianist');
  if (!pianist) {
    throw new Error('The pianist has no role.');
  }

  it('counts each sample set of the demos with the role, and skips the other demos', () => {
    const report = probeFolds(pianist, [boulanger, beethoven], 8);
    expect(report.demos).toEqual(['boulanger-matin.mid']);
    expect(report.faces).toBeGreaterThan(1000);
    expect(report.sets.rest.samples).toBe(1);
    expect(report.mesh?.corners.length).toBe(report.faces * 3);
    for (const set of SAMPLE_SETS) {
      const count = report.sets[set];
      expect(count.samples, set).toBeGreaterThan(0);
      expect(count.withFold, set).toBeLessThanOrEqual(count.samples);
      expect(Math.max(0, ...count.byFace.values()), set).toBeLessThanOrEqual(count.withFold);
      for (const bone of count.bones.keys()) {
        expect(STUDIO_BONES, bone).toContain(bone);
      }
    }

    const lines = foldLines('pianist', report, 8);
    for (const set of [...SAMPLE_SETS, 'all']) {
      expect(
        lines.some((line) => line.startsWith(`| ${set} |`)),
        set,
      ).toBe(true);
    }
  }, 30_000);
});

describe('roleAnimal', () => {
  it('gives each role one animal of ANIMALS, for the body of --glb', () => {
    for (const [name, role] of FOLD_ROLES) {
      expect(ANIMALS.has(roleAnimal(role)), name).toBe(true);
    }
  });
});
