import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CameraSession, bounded } from '../src/ar-camera.js';
const video = () => ({ pause() {}, play: async () => {}, readyState: 2, videoWidth: 640, videoHeight: 480 });
const stream = () => { const track = { stopped: false, stop() { this.stopped = true; } }; return { track, getTracks: () => [track] }; };
test('permission arriving after cancel stops its stream', async () => {
  let resolve;
  const camera = new CameraSession(video(), { getUserMedia: () => new Promise(r => { resolve = r; }) });
  const abort = new AbortController();
  const pending = camera.open(abort.signal);
  abort.abort(); camera.stop();
  const result = stream(); resolve(result);
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(result.track.stopped, true);
  assert.equal(camera.video.srcObject, null);
});
test('permission denial requests once and preserves error', async () => {
  let calls = 0;
  const camera = new CameraSession(video(), { getUserMedia: async () => { ++calls; throw new DOMException('Denied', 'NotAllowedError'); } });
  await assert.rejects(camera.open(new AbortController().signal), { name: 'NotAllowedError' });
  assert.equal(calls, 1);
});
test('five open/frames/stop cycles close all tracks', async () => {
  const streams = [];
  const camera = new CameraSession(video(), { getUserMedia: async () => { const s = stream(); streams.push(s); return s; } });
  for (let i = 0; i < 5; i++) {
    const signal = new AbortController().signal;
    await camera.open(signal); await camera.frames(signal); camera.stop();
  }
  assert.ok(streams.every(s => s.track.stopped));
});
test('bounded wait times out, accepts abort and handles late rejection', async () => {
  const abort = new AbortController();
  await assert.rejects(bounded(new Promise(() => {}), abort.signal, 5, 'TIMEOUT'), /TIMEOUT/);
  let reject;
  const pending = bounded(new Promise((_, r) => { reject = r; }), abort.signal, 100, 'TIMEOUT');
  abort.abort(); await assert.rejects(pending, { name: 'AbortError' });
  reject(new Error('late failure'));
});
