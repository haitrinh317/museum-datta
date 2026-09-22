import { getExperienceFromLocation } from './ar-config.js';
import { CameraSession, bounded } from './ar-camera.js';

const START_TIMEOUT_MS = 35000;
const experience = getExperienceFromLocation();

const el = {
  container: document.querySelector('#ar-container'),
  arVideo: document.querySelector('#ar-video'),
  simVideo: document.querySelector('#sim-video'),
  loadingScreen: document.querySelector('#loading-screen'),
  loadingHint: document.querySelector('#loading-hint'),
  loadingProgress: document.querySelector('#loading-progress'),
  errorBanner: document.querySelector('#error-banner'),
  errorTitle: document.querySelector('#error-title'),
  errorMessage: document.querySelector('#error-message'),
  errorDetail: document.querySelector('#error-detail'),
  startActions: document.querySelector('#start-actions'),
  unsupported: document.querySelector('#unsupported-experience'),
  statusText: document.querySelector('#status-text'),
  statusDot: document.querySelector('#status-dot'),
  recognizedCard: document.querySelector('#recognized-card'),
  helpStrip: document.querySelector('#help-strip'),
  targetModal: document.querySelector('#target-modal'),
  simBox: document.querySelector('#sim-box'),
  soundIcon: document.querySelector('#sound-icon'),
  cardSoundIcon: document.querySelector('#card-sound-icon'),
  simSoundIcon: document.querySelector('#sim-sound-icon'),
  cardSoundLabel: document.querySelector('#card-sound-label'),
};

let mindarThree = null;
let arResources = null;
let arState = 'idle';
let sessionVersion = 0;
let isAudioEnabled = false;
let modalReturnFocus = null;
let THREE = null;
let MindARThree = null;


const preview = document.createElement('video');
preview.id = 'camera-preview';
preview.setAttribute('playsinline', '');
preview.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0';
el.container.appendChild(preview);
const cameraSession = new CameraSession(preview);
let sessionAbort = null;
let stage = 'ready';
const diagnostics = [];
const panel = document.createElement('section');
panel.style.cssText = 'position:fixed;bottom:12px;left:12px;right:12px;z-index:110;background:#10223a;color:#e2e8f0;padding:12px;border-radius:12px;font:13px system-ui;max-height:32vh;overflow:auto';
const status = document.createElement('p');
status.setAttribute('role', 'status');
const cancel = document.createElement('button');
cancel.textContent = 'Dừng camera';
const resume = document.createElement('button');
resume.textContent = 'Bật lại camera';
resume.hidden = true;
const retry = document.createElement('button');
retry.textContent = 'Thử lại nhận diện';
retry.hidden = true;
const copy = document.createElement('button');
copy.textContent = 'Sao chép chẩn đoán';
for (const button of [cancel, resume, retry, copy]) button.style.cssText = 'min-height:44px;margin:4px;padding:8px;border-radius:8px';
const detail = document.createElement('pre');
detail.hidden = true;
detail.style.whiteSpace = 'pre-wrap';
panel.append(status, cancel, resume, retry, copy, detail);
document.body.append(panel);
const BUILD = 'AR-session-20260922-2';
function report(next, message, error) {
  stage = next;
  const entry = { stage: next, time: new Date().toISOString(), message, error: error ? String(error.name || '') + ': ' + String(error.message || error) : undefined };
  diagnostics.push(entry);
  if (diagnostics.length > 30) diagnostics.shift();
  status.textContent = BUILD + ' · ' + message;
  el.loadingHint.textContent = message;
}
copy.addEventListener('click', async () => {
  const text = JSON.stringify({ build: BUILD, secure: isSecureContext, standalone: matchMedia('(display-mode: standalone)').matches, stage, frames: [preview.videoWidth, preview.videoHeight], track: cameraSession.stream?.getVideoTracks()[0]?.readyState, diagnostics }, null, 2);
  try { await navigator.clipboard.writeText(text); copy.textContent = 'Đã sao chép'; }
  catch { detail.textContent = text; detail.hidden = false; }
});
cancel.addEventListener('click', () => stopAR({ showStartScreen: true }));
retry.addEventListener('click', startAR);
resume.addEventListener('click', startAR);
report('ready', 'Sẵn sàng mở camera.');
function disposeTracking() {
  const resources = arResources;
  arResources = null;
  mindarThree = null;
  if (!resources) return;
  resources.instance.cancelSession();
  for (const key of ['texture', 'geometry', 'borderGeometry', 'material', 'borderMaterial']) resources[key]?.dispose();
}

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = value;
  });
}

function setHref(selector, value) {
  document.querySelectorAll(selector).forEach((node) => {
    node.setAttribute('href', value);
  });
}

function applyExperience() {
  if (!experience) return false;
  setText('[data-ar-code]', experience.code);
  setText('[data-ar-title]', experience.specimenTitle);
  setText('[data-ar-common-name]', experience.commonName);
  setText('[data-ar-scientific-name]', experience.scientificName);
  setHref('[data-ar-specimen-link]', experience.specimenUrl);
  setHref('[data-ar-target-link]', experience.targetPageUrl);

  document.querySelectorAll('[data-ar-target-image]').forEach((image) => {
    image.src = experience.targetImageUrl;
    image.alt = `Ảnh mẫu ${experience.specimenTitle}`;
  });
  return true;
}

function showUnsupportedExperience() {
  el.startActions.hidden = true;
  el.loadingProgress.hidden = true;
  el.unsupported.hidden = false;
  el.loadingScreen.style.display = 'flex';
  el.loadingScreen.style.opacity = '1';
}

function withTimeout(promise, timeoutMs, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}

function ensureVideoSource(video) {
  if (!video.src) {
    video.src = experience.videoUrl;
    video.load();
  }
}

function setAudio(enabled) {
  isAudioEnabled = Boolean(enabled);
  el.arVideo.muted = !isAudioEnabled;
  el.simVideo.muted = !isAudioEnabled;

  const icon = isAudioEnabled ? 'volume_up' : 'volume_off';
  el.soundIcon.textContent = icon;
  el.cardSoundIcon.textContent = icon;
  el.simSoundIcon.textContent = icon;
  el.cardSoundLabel.textContent = isAudioEnabled ? 'Tắt tiếng cá voi' : 'Bật tiếng hát cá voi';

  if (isAudioEnabled) {
    const activeVideo = el.simBox.classList.contains('active') ? el.simVideo : el.arVideo;
    if (activeVideo.src && !activeVideo.paused) activeVideo.play().catch(() => {});
  }
}

function resetTrackingUi() {
  el.statusText.textContent = 'Đang quét tìm bảng tên / mẫu vật...';
  el.statusDot.style.background = '#00f2fe';
  el.statusDot.style.boxShadow = '0 0 8px #00f2fe';
  el.recognizedCard.classList.remove('active');
  el.helpStrip.style.opacity = '1';
  el.helpStrip.style.pointerEvents = 'auto';
  el.arVideo.pause();
}

function stopMediaTracks() {
  document.querySelectorAll('video').forEach((video) => {
    if (!video.srcObject) return;
    video.srcObject.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  });
}

async function loadArRuntime() {
  if (THREE && MindARThree) return;

  const [threeModule, mindarModule] = await withTimeout(
    Promise.all([
      import('three'),
      import('./vendor/mindar/mindar-image-three.prod.js'),
    ]),
    START_TIMEOUT_MS,
    'AR_RUNTIME_TIMEOUT',
  );

  if (!mindarModule.MindARThree) {
    throw new Error('AR_RUNTIME_UNAVAILABLE');
  }

  THREE = threeModule;
  MindARThree = mindarModule.MindARThree;

}

async function stopAR({ showStartScreen = false } = {}) {
  ++sessionVersion;
  sessionAbort?.abort();
  sessionAbort = null;
  disposeTracking();
  cameraSession.stop();
  resetTrackingUi();
  arState = 'idle';
  retry.hidden = true;
  resume.hidden = !showStartScreen || !experience;
  cancel.hidden = true;
  el.targetModal.classList.remove('open');
  el.targetModal.hidden = true;
  detail.hidden = true;
  if (showStartScreen) {
    el.loadingScreen.style.display = 'flex';
    el.loadingScreen.style.opacity = '1';
    el.startActions.hidden = false;
    el.loadingProgress.hidden = true;
    report('paused', 'Camera đã dừng. Bấm Bật Camera để tiếp tục.');
  }
}

function createMindarSession() {
  const instance = new MindARThree({
    container: el.container,
    imageTargetSrc: experience.targetUrl,
    filterMinCF: 0.0001,
    filterBeta: 0.001,
    warmupTolerance: 5,
    missTolerance: 5,
    uiLoading: 'no',
    uiScanning: 'no',
    uiError: 'no',
  });

  mindarThree = instance;
  arResources = { instance };
  instance.onError = error => {
    sessionAbort?.abort();
    disposeTracking();
    arState = 'idle';
    retry.hidden = false;
    report('tracking-error', 'Nhận diện bị gián đoạn. Camera vẫn mở, có thể thử lại.', error);
  };
  instance.video = preview;
  instance._startVideo = async () => {};
  instance.renderer.domElement.style.zIndex = '1';
  instance.cssRenderer.domElement.style.zIndex = '2';
  const { renderer, scene, camera } = instance;
  const anchor = instance.addAnchor(0);
  const geometry = new THREE.PlaneGeometry(1.2, 0.528);
  const texture = new THREE.VideoTexture(el.arVideo);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
  });
  anchor.group.add(new THREE.Mesh(geometry, material));

  const borderGeometry = new THREE.EdgesGeometry(geometry);
  const borderMaterial = new THREE.LineBasicMaterial({ color: 0x00f2fe });
  anchor.group.add(new THREE.LineSegments(borderGeometry, borderMaterial));

  anchor.onTargetFound = () => {
    el.statusText.textContent = `Đã nhận diện: ${experience.commonName}`;
    el.statusDot.style.background = '#10b981';
    el.statusDot.style.boxShadow = '0 0 10px #10b981';
    el.recognizedCard.classList.add('active');
    el.helpStrip.style.opacity = '0';
    el.helpStrip.style.pointerEvents = 'none';
    el.arVideo.play().catch((error) => console.warn('Không thể phát video AR:', error));
  };

  anchor.onTargetLost = resetTrackingUi;

  return {
    instance,
    renderer,
    scene,
    camera,
    texture,
    geometry,
    borderGeometry,
    material,
    borderMaterial,
  };
}

function showError(title, message, detail = '') {
  el.loadingProgress.hidden = true;
  if (el.errorTitle) el.errorTitle.textContent = title;
  if (el.errorMessage) el.errorMessage.textContent = message;
  if (el.errorDetail) {
    if (detail) {
      el.errorDetail.textContent = detail;
      el.errorDetail.style.display = 'block';
    } else {
      el.errorDetail.style.display = 'none';
    }
  }
  if (el.errorBanner) el.errorBanner.hidden = false;
  el.startActions.hidden = false;
  el.loadingScreen.style.display = 'flex';
  el.loadingScreen.style.opacity = '1';
}

function hideError() {
  if (el.errorBanner) el.errorBanner.hidden = true;
  if (el.errorDetail) el.errorDetail.style.display = 'none';
}

function describeCameraError(error) {
  const msg = error?.message || '';
  if (msg === 'CAMERA_PERMISSION_TIMEOUT') return 'Chưa nhận được phản hồi quyền camera. Bấm thử lại khi sẵn sàng.';
  if (msg === 'CAMERA_FRAME_TIMEOUT') return 'Đã có quyền camera nhưng chưa nhận được khung hình.';
  if (msg === 'CAMERA_UNSUPPORTED') return 'Trình duyệt không cung cấp API camera trong trang này.';
  if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
    return 'Chưa được cấp quyền Camera. Hãy vào Cài đặt iPhone → Safari → Camera → Cho phép, rồi tải lại trang.';
  }
  if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
    return 'Thiết bị không tìm thấy camera sau phù hợp.';
  }
  if (error?.name === 'NotReadableError' || error?.name === 'TrackStartError') {
    return 'Camera đang bị ứng dụng khác sử dụng (Camera, Zalo, v.v.). Hãy đóng hẳn ứng dụng đó rồi thử lại.';
  }
  if (error?.name === 'OverconstrainedError') {
    return 'Camera không hỗ trợ cấu hình độ phân giải yêu cầu.';
  }
  if (msg.includes('VIDEO_METADATA_TIMEOUT')) {
    return 'Camera đã bật nhưng Safari không đọc được khung hình. Hãy đóng tab Safari này rồi mở lại.';
  }
  if (msg === 'AR_START_TIMEOUT') {
    return 'Bộ nhận diện khởi động quá thời gian. Camera vẫn có thể hoạt động.';
  }
  if (msg === 'AR_RUNTIME_TIMEOUT' || msg === 'AR_RUNTIME_UNAVAILABLE') {
    return 'Trình duyệt chưa nạp được bộ nhận diện AR. Hãy kiểm tra kết nối mạng và thử lại.';
  }
  return `Không thể khởi động WebAR: ${msg || error?.name || 'Lỗi không xác định'}.`;
}

async function startAR() {
  if (!experience || arState === 'starting' || arState === 'running') return;
  sessionAbort?.abort();
  disposeTracking();
  const version = ++sessionVersion;
  const abort = sessionAbort = new AbortController();
  const active = () => version === sessionVersion && !abort.signal.aborted;
  arState = 'starting';
  hideError();
  resume.hidden = true;
  cancel.hidden = false;
  detail.hidden = true;
  retry.hidden = true;
  el.simBox.classList.remove('active');
  el.simVideo.pause();
  el.startActions.hidden = true;
  el.loadingProgress.hidden = false;
  try {
    if (!cameraSession.stream?.active) {
      cameraSession.stop();
      report('permission', 'Đang chờ quyền camera. Có thể bấm Dừng để huỷ.');
      await bounded(cameraSession.open(abort.signal), abort.signal, 60000, 'CAMERA_PERMISSION_TIMEOUT');
    }
    report('frames', 'Đang chờ hình ảnh camera…');
    await bounded(cameraSession.frames(abort.signal), abort.signal, 12000, 'CAMERA_FRAME_TIMEOUT');
    if (!active()) return;
    el.loadingScreen.style.display = 'none';
    report('runtime', 'Camera đã có hình. Đang tải bộ nhận diện…');
    await bounded(loadArRuntime(), abort.signal, 35000, 'AR_RUNTIME_TIMEOUT');
    if (!active()) return;
    report('webgl', 'Đang khởi tạo đồ hoạ nhận diện…');
    ensureVideoSource(el.arVideo);
    const resources = createMindarSession();
    arResources = resources;
    report('target', 'Đang tải ảnh nhận diện…');
    await bounded(resources.instance.start(), abort.signal, 35000, 'AR_START_TIMEOUT');
    if (!active()) return;
    resources.renderer.setAnimationLoop(() => resources.renderer.render(resources.scene, resources.camera));
    arState = 'running';
    report('tracking', 'Hướng camera vào ảnh mẫu để nhận diện.');
  } catch (error) {
    if (!active()) return;
    const failedStage = stage;
    abort.abort();
    disposeTracking();
    arState = 'idle';
    const hasFrames = cameraSession.stream?.active && preview.readyState >= 2;
    if (hasFrames) {
      retry.hidden = false;
      report(failedStage + '-error', 'Camera vẫn mở. Nhận diện gặp lỗi; có thể thử lại.', error);
    } else {
      cameraSession.stop();
      report(failedStage + '-error', 'Chưa mở được camera. Xem thông báo bên dưới.', error);
      showError('Không thể mở camera', describeCameraError(error), error.message || error.name);
    }
  }
}

async function openSimulation(reason = '') {
  await stopAR();
  if (reason) el.loadingHint.textContent = reason;
  ensureVideoSource(el.simVideo);
  el.simVideo.muted = !isAudioEnabled;
  el.loadingScreen.style.opacity = '0';
  el.loadingScreen.style.display = 'none';
  el.simBox.classList.add('active');
  el.simVideo.play().catch(() => {
    el.simVideo.muted = true;
    setAudio(false);
    el.simVideo.play().catch(() => {});
  });
}

function openTargetModal(trigger) {
  modalReturnFocus = trigger;
  el.targetModal.hidden = false;
  el.targetModal.classList.add('open');
  document.querySelector('#btn-close-modal')?.focus();
}

function closeTargetModal() {
  el.targetModal.classList.remove('open');
  el.targetModal.hidden = true;
  modalReturnFocus?.focus();
}

function bindEvents() {
  document.querySelector('#btn-start-camera')?.addEventListener('click', startAR);
  document.querySelector('#btn-reopen-camera')?.addEventListener('click', startAR);
  document.querySelector('#btn-quick-demo')?.addEventListener('click', () => openSimulation('Mở chế độ mô phỏng theo yêu cầu'));
  document.querySelector('#btn-launch-demo')?.addEventListener('click', () => openSimulation('Mở chế độ mô phỏng theo yêu cầu'));
  document.querySelector('#btn-exit-sim')?.addEventListener('click', () => {
    el.simBox.classList.remove('active');
    el.simVideo.pause();
    el.loadingScreen.style.display = 'flex';
    el.loadingScreen.style.opacity = '1';
    el.startActions.hidden = false;
    el.loadingProgress.hidden = true;
  });

  [document.querySelector('#btn-toggle-sound'), document.querySelector('#btn-card-sound'), document.querySelector('#btn-sim-sound')]
    .filter(Boolean)
    .forEach((button) => button.addEventListener('click', () => setAudio(!isAudioEnabled)));

  [document.querySelector('#btn-show-target'), document.querySelector('#btn-show-target-help')]
    .filter(Boolean)
    .forEach((button) => button.addEventListener('click', () => openTargetModal(button)));
  document.querySelector('#btn-close-modal')?.addEventListener('click', closeTargetModal);
  document.querySelector('#btn-close-modal-2')?.addEventListener('click', closeTargetModal);
  el.targetModal?.addEventListener('click', (event) => {
    if (event.target === el.targetModal) closeTargetModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !el.targetModal.hidden) closeTargetModal();
  });

  document.querySelector('#sim-opacity-slider')?.addEventListener('input', (event) => {
    el.simVideo.style.opacity = String(Number(event.target.value) / 100);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      el.simVideo.pause();
      // ponytail: không stop khi đang 'starting' — iOS hiển thị dialog xin quyền camera
      // sẽ kích hoạt visibilitychange tạm thời, gây ra false-positive stop làm hỏng luồng khởi động
      if (arState === 'running' || cameraSession.stream) stopAR({ showStartScreen: true });
    }
  });
  window.addEventListener('pagehide', () => {
    el.simVideo.pause();
    stopAR({ showStartScreen: true });
  });

  window.addEventListener('ar-step', (event) => {
    if (arState === 'starting' && event.detail) {
      report(event.detail.includes('4b') ? 'warmup' : 'target', event.detail);
    }
  });
}

if (applyExperience()) {
  bindEvents();
  setAudio(false);

} else {
  showUnsupportedExperience();
}
