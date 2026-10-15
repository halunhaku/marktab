import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

/**
 * MarkTab 3 build.
 *
 * Three entries are emitted:
 *  - `newtab.html`  — the override page for every new tab;
 *  - `popup.html`   — the toolbar action popup;
 *  - `background.js`— the MV3 service worker (module, never hashed).
 *
 * Output goes to `dist/extension`, which is both the folder loaded by Playwright
 * and the payload that `scripts/package-release.mjs` zips for the stores.
 *
 * MV3 forbids inline and remote scripts, so Vite's module-preload polyfill (an
 * inline script) is disabled and no asset is inlined.
 */
export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: { '@': resolve(import.meta.dirname, 'src') },
  },
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
      generateScopedName: '[name]__[local]__[hash:base64:5]',
    },
  },
  build: {
    outDir: 'dist/extension',
    emptyOutDir: true,
    target: 'chrome114',
    cssCodeSplit: true,
    cssMinify: 'lightningcss',
    modulePreload: { polyfill: false },
    assetsInlineLimit: 0,
    sourcemap: false,
    reportCompressedSize: false,
    rollupOptions: {
      input: {
        newtab: resolve(import.meta.dirname, 'newtab.html'),
        popup: resolve(import.meta.dirname, 'popup.html'),
        background: resolve(import.meta.dirname, 'src/entries/background/index.ts'),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
