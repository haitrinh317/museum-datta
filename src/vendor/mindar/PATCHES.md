# MindAR browser runtime

Baseline: vendored MindAR 1.2.5 browser bundle; application Three.js pinned to 0.160.0.
Keep LICENSE with the vendored files. Do not restore global WebGL capability overrides.

Local integration contract (2026-09-22):

- The application owns one video/stream. MindAR uses that video through its instance
  `_startVideo` adapter; it must not request another camera or stop the owned stream.
- `cancelSession()` aborts target fetch, stops rendering, disposes the controller,
  terminates its worker, removes its resize listener and its own canvas/DOM only.
- Target loading propagates HTTP/network errors and accepts AbortSignal. Cancellation
  checks prevent target loading/warmup from starting processing after teardown.
- Controller disposal settles pending worker callbacks so the video loop can exit,
  releases detector/tracker tensors and the input texture after the loop finishes.
- Processing failures are sent to `instance.onError` and leave camera preview available.
- The existing stage events and `_startAR` error propagation are preserved.

Checks: `node --test scripts/test-ar-camera.mjs`, `npm run build`,
`node scripts/test-ar-browser.mjs` (installed Windows Edge, synthetic camera only).
The browser test serves the production build with the AR CSP, blocks target requests,
tests retry, five start/stop cycles, denied permission and cancellation.

These checks do not certify Safari/PWA hardware capture, real target detection, or
the current WebM asset on iPhone. Those remain real-device acceptance requirements.


### WebGL startup — 2026-09-22 (AR-session-20260922-3)
- Kiểm tra context/precision thật trước renderer; WebGL2 lỗi thì release và thử canvas WebGL1 mới. Không spoof capability. Tắt antialias, cap DPR 2 và forceContextLoss khi dừng.
- Scanner chỉ hiện khi tracking sẵn sàng; lỗi WebGL giữ preview và báo chưa khả dụng.
- Unit tests bổ sung null precision, cả hai backend lỗi, renderer constructor lỗi. Chưa nghiệm thu trên iPhone thật.
