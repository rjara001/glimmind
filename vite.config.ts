/// <reference types="vitest" />
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      root: 'src',
      server: {
        port: 3001,
        host: '0.0.0.0',
        proxy: {
          '/functions/': {
            target: 'http://localhost:5001/fladycard-22a3e/us-central1',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/functions\//, '/')
          }
        }
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
        }
      },
      test: {
        root: '.',
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/vitest.setup.ts'],
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts', 'tests/**/*.test.tsx'],
      }
    };
  });
