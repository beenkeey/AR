import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  // Production GitHub Pages project site: https://beenkeey.github.io/AR/
  // Dev (`vite`) stays at `/` so local iPhone testing is unchanged.
  base: mode === 'production' ? '/AR/' : '/',
  plugins: [basicSsl()],
  server: {
    host: true,
    https: true,
    port: 5173,
  },
  preview: {
    host: true,
    https: true,
    port: 4173,
  },
  optimizeDeps: {
    exclude: ['mind-ar'],
  },
  build: {
    target: 'es2020',
    sourcemap: true,
  },
}));
