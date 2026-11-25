import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import { defineConfig } from 'vite';

const processedAssetsRoot = path.resolve(__dirname, '../../processed-assets');

function serveProcessedAssetsPlugin(): Plugin {
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.json': 'application/json; charset=utf-8',
  };

  const attachMiddleware = (server: { middlewares: ViteDevServer['middlewares'] }) => {
    server.middlewares.use('/processed-assets', (req, res, next) => {
      const cleanPath = (req.url ?? '/').split('?')[0].replace(/^\/+/, '');
      const resolved = path.resolve(processedAssetsRoot, cleanPath);
      if (!resolved.startsWith(processedAssetsRoot) || !fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
        next();
        return;
      }
      const ext = path.extname(resolved).toLowerCase();
      res.setHeader('Content-Type', mimeTypes[ext] ?? 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-store');
      fs.createReadStream(resolved).pipe(res);
    });
  };

  return {
    name: 'serve-processed-assets-readonly',
    configureServer(server) {
      attachMiddleware(server);
    },
    configurePreviewServer(server) {
      attachMiddleware(server);
    },
  };
}

export default defineConfig({
  plugins: [serveProcessedAssetsPlugin()],
  server: {
    port: 4173,
    strictPort: true,
    fs: {
      allow: ['../..'],
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});
