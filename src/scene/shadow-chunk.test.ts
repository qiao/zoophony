import { describe, expect, it } from 'vitest';
import { ShaderChunk } from 'three';

import { SHADOW_SAMPLES, smoothShadowEdges } from './shadow-chunk.ts';

describe('smoothShadowEdges (design 4.5, UX audit SC5)', () => {
  it('replaces the noisy samples of the soft shadow edge with samples of a fixed disc', () => {
    const before = ShaderChunk.shadowmap_pars_fragment;
    smoothShadowEdges();
    const after = ShaderChunk.shadowmap_pars_fragment;
    expect(after).not.toBe(before);
    expect(after).toContain(`vogelDiskSample( i, ${SHADOW_SAMPLES}, 0.0 )`);
    // The spotlight shadow takes no noise. The point lights keep their code, and cast no shadow.
    expect(after).not.toContain('* radius, shadowCoord.z ) ) +');
    // A second call changes nothing.
    smoothShadowEdges();
    expect(ShaderChunk.shadowmap_pars_fragment).toBe(after);
  });
});
