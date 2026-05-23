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

  // Try the exact path, then index.html (SPA fallback)
  const tryFile = (fp, fallback) => {
    fs.stat(fp, (err, stat) => {
      if (!err && stat.isFile()) {
        const ext = path.extname(fp);
        const type = MIME[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': type });
        fs.createReadStream(fp).pipe(res);
      } else if (fallback) {
        tryFile(fallback, null);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
  };

  tryFile(filePath, path.join(DIST, 'index.html'));
}).listen(PORT, () => {
  console.log(`LifeStage frontend running on port ${PORT}`);
});
