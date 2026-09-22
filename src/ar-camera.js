// Owns exactly one camera request and stream. Late permission results are closed.
export class CameraSession {
  constructor(video, mediaDevices = navigator.mediaDevices) {
    this.video = video;
    this.mediaDevices = mediaDevices;
    this.version = 0;
    this.stream = null;
  }

  async open(signal) {
    const version = ++this.version;
    if (!this.mediaDevices?.getUserMedia) throw new Error('CAMERA_UNSUPPORTED');
    const request = this.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' } } });
    const stream = await request;
    if (signal.aborted || version !== this.version) {
      stream.getTracks().forEach(track => track.stop());
      throw new DOMException('Đã huỷ', 'AbortError');
    }
    this.stream = stream;
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.srcObject = stream;
    return stream;
  }

  async frames(signal) {
    await this.video.play();
    await new Promise((resolve, reject) => {
      const cleanup = () => { clearInterval(timer); signal.removeEventListener('abort', abort); };
      const abort = () => { cleanup(); reject(new DOMException('Đã huỷ', 'AbortError')); };
      const timer = setInterval(() => {
        if (this.video.readyState >= 2 && this.video.videoWidth > 0 && this.video.videoHeight > 0) {
          cleanup(); resolve();
        }
      }, 50);
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) abort();
    });
  }

  stop() {
    ++this.version;
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
    this.video.pause();
    this.video.srcObject = null;
  }
}

export function bounded(promise, signal, milliseconds, code) {
  return new Promise((resolve, reject) => {
    const finish = (fn, value) => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      fn(value);
    };
    const abort = () => finish(reject, new DOMException('Đã huỷ', 'AbortError'));
    const timer = setTimeout(() => finish(reject, new Error(code)), milliseconds);
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(promise).then(value => finish(resolve, value), error => finish(reject, error));
    if (signal.aborted) abort();
  });
}
