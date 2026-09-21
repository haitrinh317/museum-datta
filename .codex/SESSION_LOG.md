# Nhật ký Codex — CSDL Bảo tàng Hải dương học

## 2026-09-21 — Triển khai WebAR Image Tracking & Chuẩn hóa dữ liệu trưng bày
- Tạo pipeline tự động biên dịch MindAR Target (`scripts/compile_ar_target.mjs`) bằng Edge headless WebGL.
- Biên dịch target `TB.012` (Bộ xương cá voi lưng gù), tải asset video đại dương bơi lội + âm thanh tiếng hát.
- Xây dựng trang `/ar/` (MindAR + Three.js Image Tracking) với cơ chế fallback mô phỏng so sánh mẫu xương và cá voi sống khi không có camera.
- Tích hợp nút WebAR trên trang chi tiết mẫu vật `/specimen/?code=TB.012`.
- Cấu hình permissions-policy và CSP cho camera trên Vercel, build và deploy thành công lên production.

## 2026-09-21 — Audit và hardening WebAR

- Sửa QR target sinh tại trình duyệt, không còn phụ thuộc dịch vụ QR bên thứ ba hay bị CSP chặn.
- Chuyển cấu hình trải nghiệm `TB.012` vào registry, từ chối mã WebAR chưa công bố.
- Tách logic WebAR thành module; bundle Three.js/MindAR cục bộ, thêm timeout, retry, dừng camera/render khi vào Demo, ẩn trang hoặc rời trang.
- Cập nhật PWA cache-first cho asset AR và CSP/Permissions-Policy riêng cho `/ar/*`.
- Build và npm audit đạt; còn cần test camera/image tracking trên thiết bị thật.

## 2026-09-04 — Khởi tạo tích hợp Codex

- Thêm `AGENTS.md` gốc dự án để Codex tự nạp hướng dẫn bền vững.
- Chuyển context không nhạy cảm từ `Memory.md` và `.agents/memory/` thành `.codex/PROJECT_CONTEXT.md` và `.codex/SESSION_STATE.md`.
- Giữ `.agents/` nguyên trạng, vì đây là kho lịch sử cũ đang bị Git ignore; Codex dùng các tệp `.codex/` đã được theo dõi từ đây về sau.
- Không sao chép mật khẩu, token, secret hoặc nội dung `.env.admin.local`.
