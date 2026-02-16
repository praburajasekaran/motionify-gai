import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/portal/',
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/.netlify/functions': {
          target: 'http://127.0.0.1:8888',
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
          }
        },
        // Mirror Netlify's /api/* redirect for local development
        '/api': {
          target: 'http://127.0.0.1:8888',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '/.netlify/functions'),
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
          }
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
