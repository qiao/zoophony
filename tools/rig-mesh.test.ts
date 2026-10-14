import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { Vec3 } from '../src/models/tuples.ts';
import {
  CONFIG_JOINTS,
  REACH_TOLERANCE,
  animalRoles,
  armReach,
  blenderArgs,
  checkReach,
  jointHead,
  parseArgs,
  parseConfig,
  reachLine,
  rigSettings,
  setConfig,
  targetFactor,
} from './rig-mesh.ts';
import { FOLD_ROLES, roleAnimal } from './fold-probe.ts';
import { ANIMALS } from './studio-body.ts';
import type { MeshRigConfig, MeshRigJoint } from './rig-mesh.ts';

/**
 * Makes the config of a figure with straight arms in the plane z = 0. The shoulder joints are 0.5
 * units high, and the app puts them 0.5 m high, so each unit is 1 m. Each arm has an upper arm and
 * a forearm of 0.1 × √2 units, and 0.02 × √2 units from the wrist to the middle of the palm.
 *
 * @param armFactor The arm factor.
 * @returns The config.
 */
function figure(armFactor: number): MeshRigConfig {
  const joint = (head: Vec3): MeshRigJoint => ({ head, tail: [head[0], head[1] + 0.1, head[2]] });
  const joints: Record<string, MeshRigJoint> = Object.fromEntries(
    CONFIG_JOINTS.map((name) => [name, joint([0, 0.3, 0])]),
  );
  joints['upper_arm_L'] = joint([0.1, 0.5, 0]);
  joints['forearm_L'] = joint([0.2, 0.4, 0]);
  joints['hand_L'] = joint([0.3, 0.3, 0]);
  joints['fingers_L'] = joint([0.34, 0.26, 0]);
  return {
    source: 'in.glb',
    output: 'out.glb',
    app: { shoulders: 0.5, reach: 0.3 * Math.SQRT2 },
    armFactor,
    joints,
  };
}

describe('pnpm rig-mesh (route 3 of AGENTS.md)', () => {
  it('measures the reach in the app, with the factor on the upper arm and the forearm only', () => {
    expect(armReach(figure(1), 'L')).toBeCloseTo(0.22 * Math.SQRT2, 9);
    expect(armReach(figure(1.4), 'L')).toBeCloseTo(0.3 * Math.SQRT2, 9);
    expect(armReach(figure(1.4), 'R')).toBeCloseTo(0.3 * Math.SQRT2, 9);
    expect(armReach({ ...figure(1), app: { shoulders: 1, reach: 1 } }, 'L')).toBeCloseTo(
      0.44 * Math.SQRT2,
      9,
    );
  });

  it('refuses an arm factor that misses the reach, and names the factor of the target', () => {
    expect(checkReach(figure(1.4))).toBeCloseTo(0.3 * Math.SQRT2, 9);
    expect(checkReach(figure(1.4 * (1 + REACH_TOLERANCE / 2)))).toBeGreaterThan(0);
    expect(() => checkReach(figure(1.25))).toThrow(/The factor 1\.4000 gives the target/);
  });

  it('mirrors a joint of the right side from the left side', () => {
    expect(jointHead(figure(1), 'hand_R')).toEqual([-0.3, 0.3, 0]);
    expect(jointHead(figure(1), 'hips')).toEqual([0, 0.3, 0]);
    expect(() => jointHead(figure(1), 'wing_R')).toThrow(/no joint/);
  });

  it('refuses a config with no joint of a body bone, or with no arm factor', () => {
    const config = figure(1.4);
    expect(parseConfig(JSON.stringify(config))).toEqual(config);
    const { tail: _, ...joints } = config.joints;
    expect(() => parseConfig(JSON.stringify({ ...config, joints }))).toThrow(
      /lacks the joints tail/,
    );
    expect(() => parseConfig(JSON.stringify({ ...config, armFactor: 0 }))).toThrow(/positive/);
  });
});

describe('the arguments of pnpm rig-mesh', () => {
  it('reads the animal and the preview folder', () => {
    expect(parseArgs(['rabbit'])).toEqual({ animal: 'rabbit', preview: null, check: false });
    expect(parseArgs(['rabbit', '--preview', '/tmp/x'])).toEqual({
      animal: 'rabbit',
      preview: '/tmp/x',
      check: false,
    });
    expect(parseArgs(['--preview', '/tmp/x', 'rabbit'])).toEqual({
      animal: 'rabbit',
      preview: '/tmp/x',
      check: false,
    });
  });

  it('reads --check before or after the animal', () => {
    expect(parseArgs(['rabbit', '--check']).check).toBe(true);
    expect(parseArgs(['--check', 'rabbit', '--preview', 'p'])).toEqual({
      animal: 'rabbit',
      preview: 'p',
      check: true,
    });
  });

  it('gives the usage for other arguments', () => {
    expect(() => parseArgs([])).toThrow(/Usage/);
    expect(() => parseArgs(['rabbit', '--preview'])).toThrow(/Usage/);
    expect(() => parseArgs(['rabbit', 'bear'])).toThrow(/Usage/);
  });

  it('runs the Blender script headless, fails on a Python error, and puts the preview folder last', () => {
    const args = blenderArgs('c.json', 'o.glb', 'p');
    expect(args.slice(0, 5)).toEqual([
      '-b',
      '--factory-startup',
      '--python-exit-code',
      '1',
      '--python',
    ]);
    expect(args[5]).toMatch(/tools\/blender\/rig_mesh\.py$/);
    expect(args.slice(6)).toEqual(['--', 'c.json', 'o.glb', '--preview', 'p']);
    expect(blenderArgs('c.json', 'o.glb', null).slice(6)).toEqual(['--', 'c.json', 'o.glb']);
  });

  it('asks the Blender script for the long-armed source of the check', () => {
    expect(blenderArgs('c.json', 'o.glb', null, 's.obj').slice(6)).toEqual([
      '--',
      'c.json',
      'o.glb',
      '--obj',
      's.obj',
    ]);
  });
});

describe('the check of pnpm rig-mesh', () => {
  it('gives the arm factor of the target reach, also when the factor of the config misses it', () => {
    const config = { ...figure(1.1), app: { shoulders: 0.5, reach: 0.35 } };
    const factor = targetFactor(config, 'L');
    expect(armReach(config, 'L', factor)).toBeCloseTo(0.35, 9);
    expect(targetFactor(figure(1.4), 'R')).toBeCloseTo(1.4, 9);
    expect(reachLine(config)).toContain(`the factor ${factor.toFixed(4)} gives 0.35 m`);
    expect(reachLine(config)).toContain('Shoulder joint at 0.5 u');
  });

  it('takes the settings of ANIMALS, or a seated role that also stands at the shoulders of the config', () => {
    expect(rigSettings('rabbit', figure(1.4))).toEqual({
      settings: ANIMALS.get('rabbit'),
      known: true,
    });
    expect(rigSettings('red-panda', figure(1.4))).toEqual({
      settings: {
        landmark: 'shoulders',
        height: 0.5,
        seated: true,
        soloist: true,
        constant: 'STUDIO_RED_PANDA',
        crease: 0,
      },
      known: false,
    });
  });

  it('runs the app checks of each role with the body of the animal', () => {
    for (const [role, source] of FOLD_ROLES) {
      expect(animalRoles(roleAnimal(source)).map((r) => r.role)).toContain(role);
    }
    expect(animalRoles('red-panda')).toEqual([]);
  });
});

describe('the mesh rig of the rabbit', async () => {
  const path = join(import.meta.dirname, 'mesh-rigs', 'rabbit.json');
  const config = parseConfig(await readFile(path, 'utf8'));

  it('gives both arms the reach of the app with the arm factor of the config', () => {
    expect(checkReach(config)).toBeCloseTo(config.app.reach, 2);
    expect(armReach(config, 'R')).toBeCloseTo(armReach(config, 'L'), 9);
  });

  it('makes the arms longer than the arms of the source', () => {
    expect(config.armFactor).toBeGreaterThan(1);
    expect(armReach(config, 'L', 1)).toBeLessThan(config.app.reach);
  });
});

describe('setConfig', () => {
  const text = JSON.stringify({
    armFactor: 1,
    weights: { haunch: { height: [0.16, 0.27] }, line: { angle: 150, head: true } },
    refine: { rings: [], flip: { note: 'a' } },
    joints: { tail: { head: [0, 0.4, -0.1] } },
    list: [{ radius: 0.1 }],
  });

  it('changes numbers, lists of numbers, flags, texts, and items of a list', () => {
    const changed = JSON.parse(
      setConfig(
        text,
        'armFactor=1.08; weights.haunch.height=0.2,0.3;weights.line.head=false;refine.flip.note=b;list.0.radius=0.12;joints.tail.head=[0,0.5,-0.2]',
      ),
    );
    expect(changed.armFactor).toBe(1.08);
    expect(changed.weights.haunch.height).toEqual([0.2, 0.3]);
    expect(changed.weights.line).toEqual({ angle: 150, head: false });
    expect(changed.refine.flip.note).toBe('b');
    expect(changed.list).toEqual([{ radius: 0.12 }]);
    expect(changed.joints.tail.head).toEqual([0, 0.5, -0.2]);
  });

  it('takes JSON text for a list that is not a list of numbers', () => {
    const changed = JSON.parse(setConfig(text, 'refine.rings=[{"joint":"forearm","radius":0.1}]'));
    expect(changed.refine.rings).toEqual([{ joint: 'forearm', radius: 0.1 }]);
  });

  it('keeps the other values', () => {
    expect(JSON.parse(setConfig(text, ''))).toEqual(JSON.parse(text));
  });

  it('stops on an unknown path or a value of another kind', () => {
    expect(() => setConfig(text, 'weights.clavicleFrom=0.58,0.63')).toThrow(
      /"clavicleFrom" of weights.clavicleFrom is not known/,
    );
    expect(() => setConfig(text, 'list.1.radius=0.1')).toThrow(/"1" of list.1.radius/);
    expect(() => setConfig(text, 'armFactor.x=1')).toThrow(/"x" of armFactor.x/);
    expect(() => setConfig(text, 'weights.haunch.height=0.2')).toThrow(/2 numbers/);
    expect(() => setConfig(text, 'armFactor=long')).toThrow(/not a number/);
    expect(() => setConfig(text, 'weights.line.head=1')).toThrow(/not a boolean/);
    expect(() => setConfig(text, 'refine.rings={}')).toThrow(/not a list/);
    expect(() => setConfig(text, 'armFactor')).toThrow(/<path>=<value>/);
  });
});
