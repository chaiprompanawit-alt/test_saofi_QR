// เซิร์ฟเวอร์ทดลองในเครื่อง: node dev.js  → http://localhost:3000
// เสิร์ฟ public/ + รัน api/*.js เหมือน Vercel (พอสำหรับทดสอบ ไม่ต้องติดตั้ง Vercel CLI)
const http = require('http'), fs = require('fs'), path = require('path'), url = require('url');
process.env.ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin1234';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret';
const PORT = process.env.PORT || 3000;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
const REWRITES = { '/': '/index.html', '/r': '/index.html', '/admin': '/admin.html', '/tech': '/tech.html' };

http.createServer(async (req, res) => {
  const u = url.parse(req.url, true);
  res.status = c => { res.statusCode = c; return res; };
  res.json = o => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); };
  if (u.pathname.startsWith('/api/')) {
    const name = u.pathname.slice(5).replace(/[^a-z_-]/g, ''), file = path.join(__dirname, 'api', name + '.js');
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'not found' });
    let raw = ''; for await (const c of req) raw += c;
    req.query = u.query; req.body = raw ? JSON.parse(raw) : {};
    delete require.cache[require.resolve(file)];  // แก้โค้ดแล้วรีเฟรชได้เลย
    try { await require(file)(req, res); } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
    return;
  }
  const p = REWRITES[u.pathname] || u.pathname, f = path.join(__dirname, 'public', path.normalize(p));
  if (!f.startsWith(path.join(__dirname, 'public')) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end('not found'); }
  res.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log(`dev server → http://localhost:${PORT}  (admin / ${process.env.ADMIN_TOKEN})`));
