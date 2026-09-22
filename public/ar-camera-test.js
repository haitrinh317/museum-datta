(() => {
  const button = document.querySelector('#camera-test');
  const status = document.querySelector('#status');
  const preview = document.querySelector('#preview');
  let stream = null;

  if (!button || !status || !preview) return;
  status.textContent = 'JavaScript hoạt động. Bấm nút để xin quyền Camera.';

  function messageFor(error) {
    if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
      return 'Safari chưa được cấp Camera. Vào Cài đặt iPhone → Safari → Camera → Cho phép, rồi tải lại trang.';
    }
    if (error?.name === 'NotFoundError') return 'iPhone không tìm thấy camera.';
    if (error?.name === 'NotReadableError') return 'Camera đang được ứng dụng khác sử dụng. Hãy đóng Camera/Zalo rồi thử lại.';
    return `Không thể mở Camera: ${error?.name || 'lỗi không xác định'}.`;
  }

  button.addEventListener('click', async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      status.textContent = 'Safari này không hỗ trợ getUserMedia. Hãy cập nhật iOS/Safari.';
      return;
    }
    status.textContent = 'Đang yêu cầu quyền Camera…';
    button.disabled = true;
    try {
      stream?.getTracks().forEach((track) => track.stop());
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' } } });
      preview.srcObject = stream;
      preview.classList.add('visible');
      await preview.play();
      status.textContent = 'Camera hoạt động. Quay lại WebAR để thử nhận diện mẫu vật.';
    } catch (error) {
      console.error('Camera test error:', error);
      status.textContent = messageFor(error);
    } finally {
      button.disabled = false;
    }
  });

  window.addEventListener('pagehide', () => stream?.getTracks().forEach((track) => track.stop()));
})();
