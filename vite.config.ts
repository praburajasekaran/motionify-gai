import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/',
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/.netlify/functions': {
          target: 'http://localhost:8888',
          changeOrigin: true,
        },
        // Mirror Netlify's /api/* redirect for local development
        '/api': {
          target: 'http://localhost:8888',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/.netlify/functions'),
        }
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@/lib': path.resolve(__dirname, './lib'),
        '@/components': path.resolve(__dirname, './components'),
        '@/shared': path.resolve(__dirname, './shared'),
      }
    }
  };
});
