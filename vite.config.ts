import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/favicon.svg',
];

/**
 * Erzeugt den Service Worker mit der tatsächlichen Dateiliste des Builds.
 * So ist die App bereits nach dem ersten Laden vollständig offline nutzbar –
 * ohne Workbox oder andere Fremdabhängigkeit.
 */
function serviceWorkerPlugin(): Plugin {
  return {
    name: 'lexiscene-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle).map((fileName) => `./${fileName}`);
      const precache = Array.from(new Set([...SHELL_FILES, ...assets]));
      const source = readFileSync(new URL('./src/sw.js', import.meta.url), 'utf8').replace(
        '__PRECACHE_ASSETS__',
        JSON.stringify(precache, null, 2),
      );
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

// Relative Basis, damit die App sowohl unter einer Domain-Wurzel als auch in
// einem Unterverzeichnis (z. B. lokal ausgelieferter Ordner) funktioniert.
export default defineConfig({
  base: './',
  plugins: [react(), serviceWorkerPlugin()],
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5173,
  },
});
