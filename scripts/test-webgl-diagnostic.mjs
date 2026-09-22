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
  const click = async expression => {
    await evaluate("window.__tapEvents=[]; if(!window.__tapHook){window.__tapHook=true; for(const type of ['touchstart','touchend','click']) document.addEventListener(type,e=>window.__tapEvents.push({type,id:e.target.id,text:e.target.textContent.slice(0,60)}),true)}");
    const point = await evaluate(`(() => { const button = ${expression}; const r = button.getBoundingClientRect(); const x = r.x+r.width/2, y=r.y+r.height/2; const hit=document.elementFromPoint(x,y); return {x,y,scale:visualViewport?.scale || 1,offsetX:visualViewport?.offsetLeft || 0,offsetY:visualViewport?.offsetTop || 0,ok:button===hit||button.contains(hit),hit:hit?.outerHTML.slice(0,400)}; })()`);
    assert.ok(point.ok, 'Pointer blocked: '+JSON.stringify(point));
    if (process.env.AR_MOBILE) {
      await evaluate(`window.__testTapped = false; (${expression}).addEventListener('click',()=>{window.__testTapped=true},{once:true})`);
      await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:(point.x-point.offsetX)*point.scale,y:(point.y-point.offsetY)*point.scale}]});
      await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      for(let i=0;i<20 && !await evaluate('window.__testTapped');i++) await new Promise(r=>setTimeout(r,50));
      assert.equal(await evaluate('window.__testTapped'),true,'Touch must deliver click: '+JSON.stringify({expression,point,events:await evaluate('window.__tapEvents')}));
      return;
    }
    await send('Input.dispatchMouseEvent', {type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent', {type:'mouseReleased',x:point.x,y:point.y,button:'left',clickCount:1});
  };
  if (process.env.AR_MOBILE) { await send('Emulation.setDeviceMetricsOverride', {width:375,height:667,deviceScaleFactor:2,mobile:true}); await send('Emulation.setTouchEmulationEnabled', {enabled:true}); }
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Network.setBypassServiceWorker', { bypass: true });

  await send('Page.navigate', { url: base + '/webgl-diagnostic.html' });
  await new Promise(r=>setTimeout(r,1000));
  assert.equal(await evaluate("!!document.querySelector('script[src*=registerSW]')"),false);
  await click("document.querySelector('#run')");
  for(let i=0;i<50 && await evaluate("document.querySelector('#run').disabled");i++) await new Promise(r=>setTimeout(r,100));
  const report = JSON.parse(await evaluate("document.querySelector('#result').value"));
  assert.equal(report.tests.length,2); assert.ok(report.tests.every(x=>x.draw),JSON.stringify(report));
  assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"),true);
  console.log('WebGL1/WebGL2 compile + draw + readPixels PASS');
  await evaluate("HTMLCanvasElement.prototype.getContext = () => null");
  await click("document.querySelector('#run')");
  for(let i=0;i<50 && await evaluate("document.querySelector('#run').disabled");i++) await new Promise(r=>setTimeout(r,100));
  const failed = JSON.parse(await evaluate("document.querySelector('#result').value"));
  assert.ok(failed.tests.every(x=>!x.context && !x.draw));
  assert.equal(await evaluate("document.querySelector('#copy').disabled"),false);
  await evaluate("navigator.clipboard.writeText=async()=>{throw Error('denied')}");
  await click("document.querySelector('#copy')");
  assert.ok(await evaluate("document.querySelector('#status').textContent.includes('thủ công')"));
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('No context + repeat + manual copy fallback PASS');
} finally {
  ws?.close(); browser.kill(); server.close();
  console.log('Temporary browser profile:', profile);
}
