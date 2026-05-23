const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const DIST = path.join(__dirname, 'dist');

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
};

http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  let filePath = path.join(DIST, urlPath);

  const tryFile = (fp, fallback) => {
    fs.stat(fp, (err, stat) => {
      if (!err && stat.isFile()) {
        const ext = path.extname(fp);
        const type = MIME[ext] || 'application/octet-stream';
        // Hash-named assets (JS/CSS) are immutable — cache 1 year.
        // Everything else (including index.html) must revalidate every request.
        const isHashed = /\.[a-f0-9]{8,}\.(js|css)$/.test(fp);
        const cacheControl = isHashed
          ? 'public, max-age=31536000, immutable'
          : 'no-cache, no-store, must-revalidate';
        res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cacheControl });
        fs.createReadStream(fp).pipe(res);
      } else if (fallback) {
        tryFile(fallback, null);
      } else {
        // SPA fallback — always serve index.html fresh
        const idx = path.join(DIST, 'index.html');
        res.writeHead(200, {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        });
        fs.createReadStream(idx).pipe(res);
      }
    });
  };

  tryFile(filePath, null);
}).listen(PORT, () => {
  console.log(`LifeStage frontend running on port ${PORT}`);
});
