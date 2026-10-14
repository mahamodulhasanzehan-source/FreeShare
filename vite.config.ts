import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { apiRouter } from './server/router.ts';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'api-server',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            try {
              const handled = await apiRouter(req, res);
              if (handled) return;

              if (req.method === 'GET' && req.url) {
                const pathname = req.url.split('?')[0];
                if (
                  !pathname.startsWith('/api/') &&
                  !pathname.startsWith('/@') &&
                  !pathname.startsWith('/src/') &&
                  !pathname.startsWith('/node_modules/') &&
                  !pathname.startsWith('/favicon.') &&
                  pathname !== '/index.html' &&
                  pathname !== '/'
                ) {
                  req.url = '/index.html';
                }
              }

              next();
            } catch (err) {
              next(err);
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
