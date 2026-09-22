(function () {
  var timer = setTimeout(function () {
    if (document.getElementById('camera-preview')) return;
    var message = document.createElement('p');
    message.setAttribute('role', 'alert');
    message.style.cssText = 'position:fixed;bottom:12px;left:12px;right:12px;z-index:120;background:#10223a;color:white;padding:16px;font:14px system-ui';
    message.textContent = 'Chưa khởi tạo được WebAR. Hãy tải lại trang hoặc mở Kiểm tra Camera bên dưới. Mã: MODULE_INIT.';
    var link = document.createElement('a');
    link.href = '/camera-diagnostic.html';
    link.textContent = ' Kiểm tra Camera';
    link.style.color = '#67e8f9';
    message.appendChild(link);
    document.body.appendChild(message);
  }, 12000);
  window.addEventListener('pagehide', function () { clearTimeout(timer); });
})();
