// Vite config of the low-poly studio: the root is this folder, so the viewer can fetch
// /animals/<id>/out/*.glb, viewer.json, and /animals/<id>/reference/*.png. The CLI and the shot
// tool pass a free port; 5290 is only the default of a bare `vite` call.
import { defineConfig } from 'vite';

export default defineConfig({
  root: import.meta.dirname,
  server: { port: 5290, strictPort: false },
  build: { target: 'es2022' },
});
