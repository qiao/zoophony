import { describeShotFrames } from './test-shot-frames.ts';
import { demoShotScene } from './test-shots.ts';

describeShotFrames([await demoShotScene('beethoven-9.mid')]);
