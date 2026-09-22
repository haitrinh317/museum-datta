import { getExperienceFromLocation } from './ar-config.js';

const START_TIMEOUT_MS = 15000;
const experience = getExperienceFromLocation();

const el = {
  container: document.querySelector('#ar-container'),
  arVideo: document.querySelector('#ar-video'),
  simVideo: document.querySelector('#sim-video'),
  loadingScreen: document.querySelector('#loading-screen'),
  loadingHint: document.querySelector('#loading-hint'),
  loadingProgress: document.querySelector('#loading-progress'),
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
  sessionVersion += 1;
  const currentMindar = mindarThree;
  const currentResources = arResources;
  mindarThree = null;
  arResources = null;
  arState = 'stopping';

  try {
    currentResources?.renderer?.setAnimationLoop(null);
    await Promise.race([
      Promise.resolve(currentMindar?.stop()),
      new Promise((resolve) => window.setTimeout(resolve, 1500)),
    ]);
  } catch (error) {
    console.warn('Không thể dừng MindAR sạch hoàn toàn:', error);
  }

  stopMediaTracks();
  currentResources?.texture?.dispose();
  currentResources?.geometry?.dispose();
  currentResources?.borderGeometry?.dispose();
  currentResources?.material?.dispose();
  currentResources?.borderMaterial?.dispose();
  currentResources?.renderer?.dispose();
  el.container.replaceChildren();
  resetTrackingUi();
  arState = 'idle';

  if (showStartScreen && !el.simBox.classList.contains('active')) {
    el.loadingScreen.style.display = 'flex';
    el.loadingScreen.style.opacity = '1';
    el.startActions.hidden = false;
    el.loadingProgress.hidden = true;
    el.loadingHint.textContent = 'Camera đã tạm dừng. Bấm nút bên dưới để quét lại.';
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
  });

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

function describeCameraError(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
    return 'Chưa được cấp quyền Camera. Hãy cho phép Camera trong cài đặt trang web rồi thử lại.';
  }
  if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
    return 'Thiết bị không tìm thấy camera phù hợp.';
  }
  if (error?.name === 'NotReadableError' || error?.name === 'TrackStartError') {
    return 'Camera đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng camera rồi thử lại.';
  }
  if (error?.name === 'OverconstrainedError') {
    return 'Camera không hỗ trợ cấu hình cần thiết.';
  }
  if (error?.message === 'AR_START_TIMEOUT') {
    return 'Khởi động camera quá thời gian. Hãy kiểm tra mạng hoặc thử lại.';
  }
  if (error?.message === 'AR_RUNTIME_TIMEOUT' || error?.message === 'AR_RUNTIME_UNAVAILABLE') {
    return 'Trình duyệt chưa nạp được bộ nhận diện AR. Hãy tải lại trang rồi thử lại.';
  }
  return `Không thể khởi động WebAR${error?.message ? `: ${error.message}` : '.'}`;
}

async function startAR() {
  if (!experience || arState === 'starting' || arState === 'running') return;
  if (!navigator.mediaDevices?.getUserMedia) {
    el.loadingHint.textContent = 'Trình duyệt này không hỗ trợ truy cập camera.';
    el.startActions.hidden = false;
    el.loadingProgress.hidden = true;
    return;
  }

  const version = ++sessionVersion;
  arState = 'starting';
  el.simBox.classList.remove('active');
  el.simVideo.pause();
  el.loadingScreen.style.display = 'flex';
  el.loadingScreen.style.opacity = '1';
  el.startActions.hidden = true;
  el.loadingProgress.hidden = false;
  el.loadingHint.textContent = 'Đang khởi động nhận diện mẫu vật…';
  ensureVideoSource(el.arVideo);

  try {
    // ponytail: runtime đã được preload ngầm khi vào trang, nên gọi này trả về ngầy lập tức.
    // MindAR tự gọi getUserMedia() bên trong instance.start() — gesture context vẫn còn hiệu lực.
    await loadArRuntime();

    if (version !== sessionVersion) return;

    const resources = createMindarSession();
    mindarThree = resources.instance;
    arResources = resources;

    await withTimeout(resources.instance.start(), START_TIMEOUT_MS, 'AR_START_TIMEOUT');

    if (version !== sessionVersion) {
      resources.renderer.setAnimationLoop(null);
      await Promise.resolve(resources.instance.stop()).catch(() => {});
      return;
    }

    resources.renderer.setAnimationLoop(() => {
      resources.renderer.render(resources.scene, resources.camera);
    });
    arState = 'running';
    el.loadingScreen.style.opacity = '0';
    window.setTimeout(() => {
      if (arState === 'running') el.loadingScreen.style.display = 'none';
    }, 400);
  } catch (error) {
    console.error('Lỗi khởi động WebAR:', error);
    await stopAR();
    el.loadingScreen.style.display = 'flex';
    el.loadingScreen.style.opacity = '1';
    el.loadingHint.textContent = describeCameraError(error);
    el.startActions.hidden = false;
    el.loadingProgress.hidden = true;
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
      if (arState === 'running') stopAR({ showStartScreen: false });
    }
  });
  window.addEventListener('pagehide', () => {
    el.simVideo.pause();
    stopAR({ showStartScreen: false });
  });
}

if (applyExperience()) {
  bindEvents();
  setAudio(false);
  loadArRuntime().catch(() => {}); // preload ngầm: khi người dùng bấm Camera thì runtime đã sẵn sàng
} else {
  showUnsupportedExperience();
}
