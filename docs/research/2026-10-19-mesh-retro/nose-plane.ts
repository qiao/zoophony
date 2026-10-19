// Prints the nose warning of each studio body of the app.
import { STUDIO_BODIES } from '../../../src/models/studio-body.ts';
import { noseWarning } from '../../../tools/rig-mesh-check.ts';
for (const [name, body] of Object.entries(STUDIO_BODIES)) {
  console.log(name, (Math.abs(body.nose[0]) * 100).toFixed(2), 'cm', noseWarning(body) ?? 'no warning');
}
