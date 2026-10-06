import { describe, expect, it } from 'vitest';

import { chromiumArgs } from './chromium-args.ts';

describe('chromiumArgs (design 9.2, 9.3)', () => {
  it('uses ANGLE on Metal on macOS', () => {
    expect(chromiumArgs('darwin')).toContain('--use-angle=metal');
    expect(chromiumArgs('darwin')).not.toContain('--use-angle=swiftshader');
  });

  it('uses a software WebGL2 on Linux, with no flag of the Mac', () => {
    const args = chromiumArgs('linux');
    expect(args).toContain('--use-angle=swiftshader');
    expect(args).not.toContain('--use-angle=metal');
  });

  it('turns off the autoplay policy on each platform', () => {
    for (const platform of ['darwin', 'linux', 'win32'] as const) {
      expect(chromiumArgs(platform)).toContain('--autoplay-policy=no-user-gesture-required');
    }
  });
});
