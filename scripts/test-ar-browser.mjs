import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const root = path.resolve('dist');
const csp = JSON.parse(fs.readFileSync('vercel.json')).headers.find(x => x.source === '/ar').headers.find(x => x.key === 'Content-Security-Policy').value.replace('upgrade-insecure-requests', '');
const server = http.createServer((req, res) => {
  let name = new URL(req.url, 'http://localhost').pathname;
  if (name.endsWith('/')) name += 'index.html';
  const file = path.resolve(root, '.' + name);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', ({ '.js': 'application/javascript', '.html': 'text/html', '.jpg': 'image/jpeg', '.css': 'text/css', '.webm': 'video/webm' })[path.extname(file)] || 'application/octet-stream');
  res.setHeader('Content-Security-Policy', csp);
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'museum-ar-test-'));
const browser = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profile, '--no-first-run', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--enable-unsafe-swiftshader', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let ws;
try {
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await new Promise(r => setTimeout(r, 100));
  const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
  const tabs = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
  ws = new WebSocket(tabs.find(x => x.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0; const pending = new Map(); const errors = [];
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) { const cb = pending.get(message.id); pending.delete(message.id); cb?.(message); }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text + ': ' + (message.params.exceptionDetails.exception?.description || ''));
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const number = ++id;
    const timeout = setTimeout(() => { pending.delete(number); reject(Error(method + ' timeout')); }, 20000);
    pending.set(number, message => { clearTimeout(timeout); message.error ? reject(Error(JSON.stringify(message.error))) : resolve(message.result); });
    ws.send(JSON.stringify({ id: number, method, params }));
  });
  const evaluate = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Network.setBypassServiceWorker', { bypass: true });
  await send('Page.navigate', { url: base + '/ar/?code=TB.012' });
  await new Promise(r => setTimeout(r, 2000));
  assert.ok(await evaluate("!!document.querySelector('#camera-preview')"), 'UI initialized');
  await evaluate("document.querySelector('#btn-start-camera').click()");
  for (let i = 0; i < 60; i++) {
    const state = await evaluate("document.querySelector('section p[role=status]')?.textContent || ''");
    if (/Hướng camera|gặp lỗi|Chưa mở/.test(state)) { console.log('START:', state); break; }
    await new Promise(r => setTimeout(r, 500));
  }
  console.log('PREVIEW:', await evaluate("JSON.stringify({w:document.querySelector('#camera-preview').videoWidth, h:document.querySelector('#camera-preview').videoHeight, active:document.querySelector('#camera-preview').srcObject?.active})"));
  await evaluate("Array.from(document.querySelectorAll('button')).find(x=>x.textContent==='Sao chép chẩn đoán').click()");
  console.log('DETAIL:', await evaluate("document.querySelector('section pre')?.textContent"));
  console.log('ERRORS:', errors);
  assert.equal(await evaluate("document.querySelector('#camera-preview').srcObject?.active"), true);
  await evaluate("Array.from(document.querySelectorAll('button')).find(x=>x.textContent==='Dừng camera').click()");
  assert.equal(await evaluate("document.querySelector('#camera-preview').srcObject"), null);
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('Browser camera preview + stop PASS');
  await send('Network.setBlockedURLs', { urls: ['*TB.012.mind*'] });
  await evaluate("document.querySelector('#btn-start-camera').click()");
  for (let i = 0; i < 40; i++) {
    if (await evaluate("document.querySelector('section p[role=status]').textContent.includes('gặp lỗi')")) break;
    await new Promise(r => setTimeout(r, 250));
  }
  assert.equal(await evaluate("document.querySelector('#camera-preview').srcObject?.active"), true);
  assert.equal(await evaluate("Array.from(document.querySelectorAll('button')).find(x=>x.textContent==='Thử lại nhận diện').hidden"), false);
  await send('Network.setBlockedURLs', { urls: [] });
  await evaluate("Array.from(document.querySelectorAll('button')).find(x=>x.textContent==='Thử lại nhận diện').click()");
  for (let i = 0; i < 60; i++) {
    if (await evaluate("document.querySelector('section p[role=status]').textContent.includes('Hướng camera')")) break;
    await new Promise(r => setTimeout(r, 250));
  }
  assert.equal(await evaluate("document.querySelector('section p[role=status]').textContent.includes('Hướng camera')"), true);
  await evaluate("Array.from(document.querySelectorAll('button')).find(x=>x.textContent==='Dừng camera').click()");
  assert.equal(await evaluate("document.querySelector('#camera-preview').srcObject"), null);
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('Target failure preserves preview; retry restores tracking PASS');
  for (let cycle = 0; cycle < 5; cycle++) {
    await evaluate("document.querySelector('#btn-start-camera').click()");
    for (let i = 0; i < 60; i++) {
      if (await evaluate("document.querySelector('section p[role=status]').textContent.includes('Hướng camera')")) break;
      await new Promise(r => setTimeout(r, 200));
    }
    assert.equal(await evaluate("document.querySelector('section p[role=status]').textContent.includes('Hướng camera')"), true);
    await evaluate("Array.from(document.querySelectorAll('button')).find(x=>x.textContent==='Dừng camera').click()");
    assert.equal(await evaluate("document.querySelector('#camera-preview').srcObject"), null);
  }
  console.log('Five browser tracking start/stop cycles PASS');
  await evaluate("navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Test denial','NotAllowedError')); document.querySelector('#btn-start-camera').click()");
  await new Promise(r => setTimeout(r, 100));
  assert.equal(await evaluate("document.querySelector('#error-banner').hidden"), false);
  await evaluate("navigator.mediaDevices.getUserMedia = () => new Promise(()=>{}); document.querySelector('#btn-start-camera').click()");
  await evaluate("Array.from(document.querySelectorAll('button')).find(x=>x.textContent==='Dừng camera').click()");
  assert.equal(await evaluate("document.querySelector('#start-actions').hidden"), false);
  assert.equal(await evaluate("document.querySelector('section p[role=status]').textContent.includes('Camera đã dừng')"), true);
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('Browser denied permission + cancel pending permission PASS');
  await send('Page.navigate', { url: base + '/camera-diagnostic.html' });
  await new Promise(r => setTimeout(r, 500));
  assert.equal(await evaluate("!!document.querySelector('script[src*=registerSW]')"), false);
  assert.equal(await evaluate("document.querySelector('#status').textContent.includes('JavaScript hoạt động')"), true);
  console.log('Independent diagnostic initializes without SW registration PASS');

} finally {
  ws?.close(); browser.kill(); server.close();
  console.log('Temporary browser profile:', profile);
}
