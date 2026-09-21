import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_AR = path.join(ROOT, 'public', 'ar');

if (!fs.existsSync(PUBLIC_AR)) {
  fs.mkdirSync(PUBLIC_AR, { recursive: true });
}

// Target image source
const TARGET_SRC = path.join(ROOT, 'Data/RAW/SNVH-2022/anh-mau-vat-2022/12. Bộ xương Cá Voi lưng gù – Megaptera novaeangliae .jpg');
const TARGET_DEST = path.join(PUBLIC_AR, 'TB.012-target.jpg');
fs.copyFileSync(TARGET_SRC, TARGET_DEST);
console.log('✓ Đã chuẩn bị ảnh target:', TARGET_DEST);

const PORT = 4321;
let server;
let browserProc;

const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>MindAR Compiler</title>
  <script>
    window.onerror = function(msg, url, line) {
      fetch('/error?msg=' + encodeURIComponent(msg + ' at ' + url + ':' + line));
    };
    window.onunhandledrejection = function(e) {
      fetch('/error?msg=' + encodeURIComponent(e.reason ? (e.reason.stack || e.reason) : 'rejection'));
    };
  </script>
</head>
<body style="font-family:sans-serif;background:#111;color:#fff;padding:20px;">
  <h2>Đang trích xuất đặc trưng hình ảnh cho WebAR (MindAR)...</h2>
  <div id="status">Khởi tạo compiler...</div>
  <img id="targetImg" src="/target.jpg" style="max-width:300px;margin-top:20px;display:none;" />

  <script type="module">
    import { Compiler } from "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js";

    fetch('/log?msg=ModuleLoaded');

    async function run() {
      const status = document.getElementById('status');
      try {
        fetch('/log?msg=RunStarted');
        const img = document.getElementById('targetImg');
        img.style.display = 'block';
        await new Promise(r => {
          if (img.complete) r();
          else img.onload = r;
        });

        fetch('/log?msg=ImageLoaded_Size_' + img.naturalWidth + 'x' + img.naturalHeight);
        status.innerText = 'Bắt đầu biên dịch target...';
        const compiler = new Compiler();
        
        await compiler.compileImageTargets([img], (progress) => {
          const msg = 'Tiến trình: ' + Math.round(progress) + '%';
          status.innerText = msg;
          fetch('/log?msg=' + encodeURIComponent(msg));
        });

        status.innerText = 'Xuất dữ liệu .mind...';
        fetch('/log?msg=ExportingData');
        const exportedData = await compiler.exportData();
        status.innerText = 'Đang lưu file vào server...';
        fetch('/log?msg=Saving_' + exportedData.length + '_bytes');

        await fetch('/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: exportedData
        });

        status.innerText = '✅ HOÀN TẤT!';
        console.log('DONE');
      } catch (err) {
        status.innerText = '❌ Lỗi: ' + err.message;
        console.error(err);
        fetch('/error?msg=' + encodeURIComponent(err.stack || err.message));
      }
    }
    run();
  </script>
</body>
</html>`;

server = http.createServer((req, res) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlContent);
  } else if (req.url === '/target.jpg') {
    const data = fs.readFileSync(TARGET_DEST);
    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
    res.end(data);
  } else if (req.url.startsWith('/log')) {
    const msg = decodeURIComponent(req.url.replace('/log?msg=', ''));
    console.log('  [LOG]', msg);
    res.writeHead(200);
    res.end('OK');
  } else if (req.url === '/save' && req.method === 'POST') {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      const outPath = path.join(PUBLIC_AR, 'TB.012.mind');
      fs.writeFileSync(outPath, buf);
      console.log(`\n🎉 Thành công tạo ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
      cleanup(0);
    });
  } else if (req.url.startsWith('/error')) {
    console.error('Browser compile error:', req.url);
    res.writeHead(200);
    res.end();
    cleanup(1);
  } else {
    res.writeHead(404);
    res.end();
  }
});

const tempProfileDir = path.join(ROOT, '.temp_edge_profile');

function cleanup(code) {
  if (browserProc) {
    try { browserProc.kill(); } catch (e) {}
  }
  if (server) {
    server.close();
  }
  try {
    if (fs.existsSync(tempProfileDir)) {
      fs.rmSync(tempProfileDir, { recursive: true, force: true });
    }
  } catch (e) {}
  process.exit(code);
}

server.listen(PORT, () => {
  console.log(`HTTP server listening on http://localhost:${PORT}`);
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  console.log('Khởi chạy Edge headless để biên dịch MindAR target...');
  
  if (!fs.existsSync(tempProfileDir)) {
    fs.mkdirSync(tempProfileDir, { recursive: true });
  }

  browserProc = spawn(edgePath, [
    '--headless=new',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--use-gl=angle',
    `--user-data-dir=${tempProfileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    `http://localhost:${PORT}/`
  ]);

  browserProc.on('error', (err) => {
    console.error('Lỗi khởi chạy trình duyệt:', err.message);
    cleanup(1);
  });
});
