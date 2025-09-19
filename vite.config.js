import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: '.',
    rollupOptions: {
      input: 'app.js',
      output: {
        entryFileNames: 'dist/bundle.js',
        format: 'es',
      },
    },
    emptyOutDir: false,
  },
});
