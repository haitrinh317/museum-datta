(() => {
  const button = document.querySelector('#btn-start-camera');
  const loadingScreen = document.querySelector('#loading-screen');
  const startActions = document.querySelector('#start-actions');
  const progress = document.querySelector('#loading-progress');
  const hint = document.querySelector('#loading-hint');
  const container = document.querySelector('#ar-container');
  const startTracking = document.querySelector('#btn-start-tracking');

  if (!button || !loadingScreen || !startActions || !progress || !hint || !container || !startTracking) return;

  function showError(message) {
    hint.textContent = message;
    startActions.hidden = false;
    progress.hidden = true;
    startTracking.hidden = true;
    loadingScreen.style.opacity = '1';
    loadingScreen.style.background = '#060e1a';
  }

  function describeError(error) {
    if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
      return 'Camera chưa được cho phép. Hãy chọn Cho phép Camera trong cài đặt Safari rồi thử lại.';
    }
    if (error?.name === 'NotFoundError') return 'Không tìm thấy camera trên thiết bị.';
    if (error?.name === 'NotReadableError') return 'Camera đang được ứng dụng khác sử dụng.';
    return 'Không thể mở Camera. Hãy tải lại trang rồi thử lại.';
  }

  async function requestCamera(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (!navigator.mediaDevices?.getUserMedia) {
      showError('Trình duyệt này không hỗ trợ truy cập Camera. Hãy mở bằng Safari phiên bản mới.');
      return;
    }

    startActions.hidden = true;
    progress.hidden = false;
    hint.textContent = 'Đang yêu cầu quyền Camera…';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      });

      window.__museumArBootstrapStream = stream;
      const preview = document.createElement('video');
      preview.id = 'ar-bootstrap-preview';
      preview.autoplay = true;
      preview.muted = true;
      preview.playsInline = true;
      preview.setAttribute('playsinline', '');
      preview.srcObject = stream;
      preview.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;object-fit:cover;background:#020b16;z-index:1;';
      container.replaceChildren(preview);
      await preview.play().catch(() => {});

      hint.textContent = 'Camera đã mở. Hướng camera vào mẫu vật, rồi bấm nút để bắt đầu nhận diện.';
      loadingScreen.style.background = 'rgba(6, 14, 26, 0.35)';
      loadingScreen.style.opacity = '1';
      startTracking.hidden = false;
    } catch (error) {
      console.error('Camera bootstrap error:', error);
      showError(describeError(error));
      document.dispatchEvent(new CustomEvent('museum:ar-camera-error', { detail: error }));
    }
  }

  button.addEventListener('click', requestCamera, true);
  startTracking.addEventListener('click', () => {
    if (!window.__museumArBootstrapStream) return;
    startTracking.hidden = true;
    hint.textContent = 'Đang khởi động nhận diện mẫu vật…';
    document.dispatchEvent(new CustomEvent('museum:ar-camera-ready'));
  });
})();
