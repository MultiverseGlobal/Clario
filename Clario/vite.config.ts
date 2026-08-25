import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Custom Vite middleware for local video downloading via yt-dlp
function localVideoDownloaderPlugin() {
  return {
    name: 'clario-local-video-downloader',
    configureServer(server: any) {
      server.middlewares.use('/api/download-video', async (req: any, res: any) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { url } = JSON.parse(body);
              if (!url) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'URL is required' }));
                return;
              }

              const tempDir = os.tmpdir();
              const uniquePrefix = `clario_${Date.now()}`;
              const outTemplate = path.join(tempDir, `${uniquePrefix}.%(ext)s`);

              // Execute python -m yt_dlp with android player client (bypasses 403 & ffmpeg requirement)
              execFile('python', [
                '-m', 'yt_dlp',
                '-f', 'best[ext=mp4]/best',
                '--extractor-args', 'youtube:player_client=android',
                '--no-playlist',
                '--max-filesize', '100M',
                '-o', outTemplate,
                url
              ], { timeout: 10000 }, (err, stdout, stderr) => {
                if (err) {
                  console.warn('yt-dlp error:', err.message, stderr);
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: stderr || err.message }));
                  return;
                }

                // Find the downloaded file in tempDir
                try {
                  const files = fs.readdirSync(tempDir);
                  const downloaded = files.find(f => f.startsWith(uniquePrefix));
                  
                  if (!downloaded) {
                    res.statusCode = 404;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Downloaded file not found' }));
                    return;
                  }

                  const filePath = path.join(tempDir, downloaded);
                  const fileBuffer = fs.readFileSync(filePath);
                  
                  // Clean up temp file
                  try { fs.unlinkSync(filePath); } catch {}

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'video/mp4');
                  res.setHeader('Content-Disposition', `attachment; filename="${downloaded}"`);
                  res.end(fileBuffer);
                } catch (readErr: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: readErr.message }));
                }
              });
            } catch (parseErr: any) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: parseErr.message }));
            }
          });
        } else {
          res.statusCode = 405;
          res.end('Method Not Allowed');
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localVideoDownloaderPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    cors: true,
    allowedHosts: true as any,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
    proxy: {
      '/cobalt-api': {
        target: 'https://cobalt.api.timelessnesses.me',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/cobalt-api/, ''),
      },
    },
  },
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"]
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    cors: true,
    allowedHosts: true as any,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  }
});
