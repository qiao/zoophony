/** The flag that lets a script start the audio with no user gesture (design 9.3). */
const AUTOPLAY = '--autoplay-policy=no-user-gesture-required';

/**
 * Gives the launch flags of headless Chromium for the browser checks: the smoke test, the
 * keyboard check, and the Playwright test (design 9.2, 9.3). On macOS, ANGLE on Metal gives the
 * GPU of the Mac. The Linux runners of CI have no GPU, so ANGLE on SwiftShader gives a software
 * WebGL2 there.
 *
 * @param platform The platform of Node, `process.platform`.
 * @returns The flags, with the autoplay policy turned off.
 */
export function chromiumArgs(platform: NodeJS.Platform): string[] {
  if (platform === 'darwin') {
    return [AUTOPLAY, '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'];
  }
  return [AUTOPLAY, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
}
