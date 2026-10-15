import { describe, expect, it } from 'vitest';

import { patchedDemo } from './patch-demos.ts';
import { STUDIO_BONES } from '../src/models/studio-format.ts';
import {
  FOLD_ROLES,
  FOLD_ROLE_TABLE,
  SAMPLE_SETS,
  faceCompareLines,
  faceFacts,
  faceLines,
  foldAngle,
  foldJson,
  foldLines,
  foldedFaces,
  mainBone,
  probeFolds,
  readFaceJson,
  readFoldJson,
  roleAnimal,
  sameFaces,
  turnBone,
  worstFold,
} from './fold-probe.ts';
import type { FaceJson, FaceRecord, FaceWorst, FoldCount, FoldReport } from './fold-probe.ts';
import { ROOT, refRoleKeys } from './ref-tree.ts';
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

describe('foldAngle', () => {
  it('gives 0° in the bind pose and 180° for a face whose corner crosses the opposite edge', () => {
    const mesh = triangle();
    expect(foldAngle(mesh, [...IDENTITY, ...IDENTITY], mesh.positions, 0)).toBeCloseTo(0, 6);
    const moved = [...IDENTITY.slice(0, 12), 0, -2, 0, 1];
    const posed = new Float32Array([0, 0, 0, 1, 0, 0, 0, -1, 0]);
    expect(foldAngle(mesh, [...IDENTITY, ...moved], posed, 0)).toBeCloseTo(180, 6);
  });
});

describe('turnBone', () => {
  /** The triangle of the folded pose, with bone 2 (spine, a child of hips) on the third corner. */
  const mesh = {
    ...triangle(),
    joints: new Uint8Array([1, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0]),
    colors: new Float32Array(),
    finishes: new Uint8Array(),
    correctives: [],
  };

  it('names the bone whose turn from its parent folds the face', () => {
    // Bones 0 (root) and 1 (hips) stay. Bone 2 (spine) moves the third corner 2 m down.
    const moved = [...IDENTITY.slice(0, 12), 0, -2, 0, 1];
    const matrices = new Float32Array([...IDENTITY, ...IDENTITY, ...moved]);
    const turn = turnBone(mesh, { matrices, correctives: new Float32Array() }, 0);
    expect(turn.bone).toBe(STUDIO_BONES[2]);
    expect(turn.turn).toBeCloseTo(180, 6);
  });

  it('names no bone in the bind pose', () => {
    const matrices = new Float32Array([...IDENTITY, ...IDENTITY, ...IDENTITY]);
    expect(turnBone(mesh, { matrices, correctives: new Float32Array() }, 0)).toEqual({
      bone: '',
      turn: 0,
    });
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
  return {
    samples,
    withFold: 0,
    most: 0,
    worst: '',
    bones: new Map(),
    byFace: new Map(byFace),
    faceWorst: new Map(),
  };
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

/**
 * Makes a worst fold.
 *
 * @param angle The angle of the fold, in degrees.
 * @param label The sample.
 * @returns The worst fold.
 */
function fold(angle: number, label = 'a.mid 1.00 s'): FaceWorst {
  return { label, angle, bone: 'neck', turn: 40 };
}

describe('worstFold', () => {
  it('gives the fold with the largest angle over all sets', () => {
    const report: FoldReport = {
      demos: [],
      faces: 2,
      mesh: null,
      sets: { rest: countOf(1, []), play: countOf(1, []), lift: countOf(1, []) },
    };
    report.sets.play.faceWorst.set(1, fold(150, 'play'));
    report.sets.lift.faceWorst.set(1, fold(120, 'lift'));
    report.sets.rest.faceWorst.set(1, fold(100, 'rest'));
    expect(worstFold(report, 1)?.label).toBe('play');
    expect(worstFold(report, 0)).toBeNull();
  });
});

/**
 * Makes a folded face of the JSON text.
 *
 * @param face The index of the face.
 * @param play The play samples with a fold.
 * @param middle The middle of the face.
 * @returns The face.
 */
function record(face: number, play: number, middle: FaceRecord['middle'] = [0, 0, 0]): FaceRecord {
  return { face, folds: { rest: 0, play, lift: 0 }, bone: 'neck', middle, worst: fold(120) };
}

/**
 * Makes the folds of a tree.
 *
 * @param topology The hash of the corners.
 * @param faces The folded faces.
 * @returns The folds, with 100 play samples.
 */
function folds(topology: string, faces: FaceRecord[]): FaceJson {
  const set = { samples: 100, withFold: 0 };
  return { sets: { rest: set, play: set, lift: set }, topology, faces };
}

describe('sameFaces', () => {
  it('takes the same index when the corners are the same, else the nearest middle within 1 cm', () => {
    const other = folds('b', [record(7, 1, [0.005, 0, 0]), record(4, 1, [0.3, 0, 0])]);
    expect(sameFaces(folds('b', [record(4, 1)]), other).get(4)?.face).toBe(4);
    expect(sameFaces(folds('a', [record(4, 1)]), other).get(4)?.face).toBe(7);
    expect(sameFaces(folds('a', [record(4, 1, [0.1, 0, 0])]), other).size).toBe(0);
  });

  it('pairs each face of the other corners one time at most, the nearest pair first', () => {
    const tree = folds('a', [record(1, 1, [0, 0, 0]), record(2, 1, [0.004, 0, 0])]);
    const base = folds('b', [record(11, 1, [0.002, 0, 0]), record(12, 1, [0.009, 0, 0])]);
    const pairs = sameFaces(tree, base);
    expect([...pairs].map(([face, other]) => [face, other.face])).toEqual([
      [1, 11],
      [2, 12],
    ]);

    const rows = faceCompareLines('main', base, tree, 5).filter((line) => /^\| [\d-]/.test(line));
    expect(
      rows.map((row) =>
        row
          .split('|')
          .slice(1, 3)
          .map((cell) => cell.trim()),
      ),
    ).toEqual([
      ['1', '11'],
      ['2', '12'],
    ]);
  });
});

describe('faceCompareLines', () => {
  it('gives the shares of both trees, and marks the new and the gone faces', () => {
    const base = folds('t', [record(1, 10), record(2, 5)]);
    const tree = folds('t', [record(1, 20), record(3, 8)]);
    const rows = faceCompareLines('main', base, tree, 5).filter((line) => /^\| [\d-]/.test(line));
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatch(
      /^\| 1 \| 1 \| 0\.0% \/ 10\.0% \/ 0\.0% \| 0\.0% \/ 20\.0% \/ 0\.0% \|  \|/,
    );
    expect(rows[1]).toMatch(/^\| 3 \| - \| .* \| new \|/);
    expect(rows[2]).toMatch(/^\| - \| 2 \| .* \| gone \|/);
  });
});

describe('foldJson and readFaceJson', () => {
  it('write and read each folded face with its worst fold and the hash of the corners', () => {
    const report: FoldReport = {
      demos: ['a.mid'],
      faces: 2,
      mesh: {
        ...twoTriangles(),
        colors: new Float32Array(),
        finishes: new Uint8Array(),
        correctives: [],
      },
      sets: { rest: countOf(1, []), play: countOf(10, [[1, 3]]), lift: countOf(5, [[1, 1]]) },
    };
    report.sets.play.faceWorst.set(1, fold(130));
    const read = readFaceJson(foldJson(report));
    expect(read.topology).toMatch(/^[0-9a-f]{64}$/);
    expect(read.faces).toEqual([
      {
        face: 1,
        folds: { rest: 0, play: 3, lift: 1 },
        bone: mainBone(twoTriangles(), 1),
        middle: faceFacts(twoTriangles(), 1).middle,
        worst: fold(130),
      },
    ]);
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
      expect(
        [...count.faceWorst.keys()].toSorted((a, b) => a - b),
        set,
      ).toEqual([...count.byFace.keys()].toSorted((a, b) => a - b));
      for (const worst of count.faceWorst.values()) {
        expect(worst.angle, set).toBeGreaterThan(90);
        expect(STUDIO_BONES, set).toContain(worst.bone);
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

describe('FOLD_ROLE_TABLE', () => {
  it('names the module and the table of the roles, for the role check of --base', () => {
    const keys = refRoleKeys(ROOT, { ...FOLD_ROLE_TABLE, name: 'flutist' });
    expect(keys).toEqual([...FOLD_ROLES.keys()]);
  });
});
