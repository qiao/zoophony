import { describe, expect, it } from 'vitest';

import { ModelCache } from './model-cache.ts';
import { buildPlayer } from './player.ts';

describe('ModelCache', () => {
  it('builds each kind of player one time, and gives the same model for each later call', () => {
    const models = new ModelCache();
    const violin = models.get('rabbit', 'violin');
    expect(models.get('rabbit', 'violin', 4)).toBe(violin);
    expect(violin).toEqual(buildPlayer('rabbit', 'violin'));
  });

  it('keeps the species, the instrument, the kettle count, and the support apart', () => {
    const models = new ModelCache();
    const timpani = models.get('elephant', 'timpani', 4);
    expect(models.get('elephant', 'timpani', 2)).not.toBe(timpani);
    expect(models.get('elephant', 'cello')).not.toBe(timpani);
    expect(models.get('panda', 'timpani', 4)).not.toBe(timpani);
    // A soloist who stands has its own model (design 4.5).
    expect(models.get('fox-tan', 'flute', 4, 'stand')).not.toBe(models.get('fox-tan', 'flute'));
    expect(models.get('fox-tan', 'flute', 4, 'stand').support).toBe('stand');
    expect(models.get('fox-tan', 'flute', 4, 'chair')).toBe(models.get('fox-tan', 'flute'));
    // Two kettles have fewer vertices than four.
    expect(models.get('elephant', 'timpani', 2).mesh.bones.length).toBeLessThan(
      timpani.mesh.bones.length,
    );
  });
});
