import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // tools/size.ts reads the manifest to find the static imports of the entry chunk.
    manifest: true,
  },
});
