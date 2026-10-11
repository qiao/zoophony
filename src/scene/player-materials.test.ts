import { describe, expect, it } from 'vitest';

import { buildPlayer } from '../models/player.ts';
import { createMaterials } from './geometry.ts';
import { PlayerMaterials } from './player-materials.ts';
import { NO_LOAD } from './test-skins.ts';

describe('PlayerMaterials', () => {
  it('gives a body with a skin its own material, and the other bodies the shared material', () => {
    const base = createMaterials();
    const materials = new PlayerMaterials(base, [], NO_LOAD);
    const rabbit = buildPlayer('rabbit', 'violin');
    const cat = buildPlayer('cat', 'viola');

    const [skin] = materials.of(rabbit);
    expect(rabbit.skin).not.toBeNull();
    expect(skin?.map?.channel).toBe(1);
    expect(materials.of(buildPlayer('rabbit', 'violin'))).toEqual([skin]);
    expect(materials.of(cat)).toBe(base);
    expect(materials.all).toEqual([...base, skin]);
  });

  it('hides a skin material until its texture loads', async () => {
    const materials = new PlayerMaterials(createMaterials(), [], NO_LOAD);
    const [skin] = materials.of(buildPlayer('bear', 'baton'));
    expect(skin?.visible).toBe(false);
    await materials.ready;
    expect(skin?.visible).toBe(true);
    expect(skin?.map?.image).toEqual({ width: 1, height: 1 });
  });

  it('shows the body with no map when its texture does not load', async () => {
    const failed = (): Promise<never> => Promise.reject(new Error('offline'));
    const materials = new PlayerMaterials(createMaterials(), [], failed);
    const [skin] = materials.of(buildPlayer('bear', 'baton'));
    await materials.ready;
    expect(skin?.visible).toBe(true);
    expect(skin?.map).toBeNull();
  });
});
