// Vite config of the bear studio: the root is this folder, so the viewer can fetch /out/*.glb
// and /reference/*.png.
import { defineConfig } from 'vite';

export default defineConfig({
  root: import.meta.dirname,
  server: { port: 5190, strictPort: false },
  build: { target: 'es2022' },
});
