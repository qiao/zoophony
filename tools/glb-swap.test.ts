import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { STUDIO_BODIES } from '../src/models/studio-body.ts';
import type { StudioBodyName } from '../src/models/studio-body.ts';
import {
  animalSpecies,
  runTool,
  speciesAnimal,
  studioAnimal,
  takeGlb,
  withGlbBody,
} from './glb-swap.ts';
import { ANIMALS, studioGlbPath } from './studio-body.ts';

/** The repository root. */
const ROOT = join(import.meta.dirname, '..');

describe('takeGlb', () => {
  it('gives no file and the same arguments with no option', () => {
    expect(takeGlb(['rabbit', '--set', 'x=1'], '/w')).toEqual({
      glb: null,
      rest: ['rabbit', '--set', 'x=1'],
    });
  });

  it('takes the option out, and resolves the file from the folder of the caller', () => {
    expect(takeGlb(['rabbit', '--glb', 'out/a.glb', '--support', 'stand'], '/w')).toEqual({
      glb: '/w/out/a.glb',
      rest: ['rabbit', '--support', 'stand'],
    });
  });

  it('stops on an option with no file and on a second option', () => {
    expect(() => takeGlb(['rabbit', '--glb'])).toThrow('takes a GLB file');
    expect(() => takeGlb(['rabbit', '--glb', '--set'])).toThrow('takes a GLB file');
    expect(() => takeGlb(['--glb', 'a.glb', '--glb', 'b.glb'])).toThrow('more than one time');
  });
});

describe('the animal of a studio body', () => {
  it('names the entry of ANIMALS whose module exports the body', () => {
    const names = Object.keys(STUDIO_BODIES).filter(
      (name): name is StudioBodyName => name in STUDIO_BODIES,
    );
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      const animal = studioAnimal(name);
      const settings = ANIMALS.get(animal);
      const module = readFileSync(join(ROOT, 'src', 'models', 'studio', `${animal}.ts`), 'utf8');
      expect(settings, name).toBeDefined();
      expect(module, name).toContain(`export const ${settings?.constant ?? '-'} = `);
    }
  });

  it('gives the species of each animal, and no animal for a species with no studio body', () => {
    for (const animal of ANIMALS.keys()) {
      for (const species of animalSpecies(animal)) {
        expect(speciesAnimal(species)).toBe(animal);
      }
    }
    expect(animalSpecies('rabbit')).toContain('rabbit');
    expect(speciesAnimal('fox-red')).toBeNull();
  });
});

describe('withGlbBody', () => {
  const parent = mkdtempSync(join(tmpdir(), 'glb-swap-test-'));
  afterAll(() => rmSync(parent, { recursive: true, force: true }));

  it('runs a child on the body of another file, and removes the copy at the end', async () => {
    const file = join(parent, 'other.glb');
    copyFileSync(studioGlbPath('rabbit', ANIMALS.get('rabbit')), file);
    const out = join(parent, 'source.txt');
    let copy = '';

    const code = await withGlbBody(
      'rabbit',
      file,
      async (dir) => {
        copy = dir;
        writeFileSync(
          join(dir, 'tools', 'print-source.ts'),
          [
            "import { writeFileSync } from 'node:fs';",
            "import { STUDIO_BODIES } from '../src/models/studio-body.ts';",
            `writeFileSync(${JSON.stringify(out)}, STUDIO_BODIES['studio-rabbit'].source);`,
          ].join('\n'),
        );
        return runTool(dir, 'print-source.ts', []);
      },
      parent,
    );

    expect(code).toBe(0);
    expect(readFileSync(out, 'utf8')).toBe(relative(ROOT, file));
    expect(STUDIO_BODIES['studio-rabbit'].source).not.toBe(relative(ROOT, file));
    expect(copy).not.toBe('');
    expect(existsSync(copy)).toBe(false);
  });
});
