/* ── PWA: Install prompt + Online/Offline toast ── */
(function() {
  // ── Offline/Online Toast ──
  const toast = document.createElement('div');
  toast.id = 'pwa-toast';
  Object.assign(toast.style, {
    position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%) translateY(20px)',
    padding: '12px 24px', borderRadius: '8px', fontFamily: 'Inter, sans-serif',
    fontSize: '14px', fontWeight: '500', zIndex: '9999', opacity: '0',
    transition: 'opacity .3s, transform .3s', pointerEvents: 'none',
    backdropFilter: 'blur(12px)', boxShadow: '0 4px 20px rgba(0,0,0,.4)'
  });
  document.body.appendChild(toast);

  function showToast(msg, color) {
    toast.textContent = msg;
    toast.style.background = color;
    toast.style.color = '#fff';
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, 3000);
  }

  window.addEventListener('online', () => showToast('✓ Đã kết nối mạng', 'rgba(16,185,129,.9)'));
  window.addEventListener('offline', () => showToast('⚡ Mất kết nối — dùng dữ liệu offline', 'rgba(239,68,68,.85)'));

  // ── Install Prompt (chỉ trên trang chủ) ──
  if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      // Đã cài hoặc đã từ chối → không hiện
      if (localStorage.getItem('pwa-dismissed') || window.matchMedia('(display-mode: standalone)').matches) return;
      showInstallBanner();
    });

    function showInstallBanner() {
      const banner = document.createElement('div');
      banner.id = 'pwa-install-banner';
      banner.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
          <img src="/icons/icon-192x192.png" width="40" height="40" alt="App" style="border-radius:8px">
          <div style="min-width:0">
            <div style="font-weight:600;color:#f5f6fa;font-size:14px">Cài ứng dụng Bảo tàng</div>
            <div style="font-size:12px;color:#8395a7;margin-top:2px">Truy cập nhanh, xem offline</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0">
          <button id="pwa-dismiss" style="padding:8px 14px;border:1px solid rgba(255,255,255,.15);background:transparent;color:#8395a7;border-radius:6px;cursor:pointer;font-size:13px">Để sau</button>
          <button id="pwa-install" style="padding:8px 14px;border:none;background:linear-gradient(135deg,#0abde3,#00d2d3);color:#0a1628;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px">Cài đặt</button>
        </div>
      `;
      Object.assign(banner.style, {
        position: 'fixed', bottom: '16px', left: '16px', right: '16px', maxWidth: '480px',
        margin: '0 auto', padding: '14px 18px', display: 'flex', alignItems: 'center',
        gap: '12px', background: 'rgba(15,23,42,.95)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,.08)', borderRadius: '12px', zIndex: '9998',
        boxShadow: '0 8px 32px rgba(0,0,0,.5)', fontFamily: 'Inter, sans-serif',
        animation: 'pwa-slide-up .4s ease-out'
      });

      // Inject animation
      if (!document.getElementById('pwa-keyframes')) {
        const style = document.createElement('style');
        style.id = 'pwa-keyframes';
        style.textContent = `
          @keyframes pwa-slide-up { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        `;
        document.head.appendChild(style);
      }

      document.body.appendChild(banner);

      document.getElementById('pwa-install').onclick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') banner.remove();
        deferredPrompt = null;
      };
      document.getElementById('pwa-dismiss').onclick = () => {
        localStorage.setItem('pwa-dismissed', '1');
        banner.remove();
      };
    }
  }
})();
