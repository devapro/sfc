import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: 'index.html',
                    dest: 'dist'
                }
            ]
        })
    ],
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
