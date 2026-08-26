import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig } from 'vite';

export default defineConfig({
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
});
