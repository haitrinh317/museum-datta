# Trạng thái hiện tại cho Codex

> Cập nhật: 2026-09-21

## Đã hoàn thành gần đây

- Triển khai tính năng WebAR Image Tracking cho mẫu vật Bộ xương cá voi lưng gù (`TB.012`): MindAR target compiler, Three.js 3D video plane, audio tiếng hát cá voi, chế độ mô phỏng trực tiếp khi không có camera, nút kích hoạt WebAR từ trang chi tiết mẫu vật.
- Sửa lỗi PWA Service Worker navigation fallback: loại trừ static assets (`/\.[a-zA-Z0-9]+$/`) khỏi `navigateFallbackDenylist` để tránh bị redirect nhầm sang `offline.html`; tạo trang xem target chuyên dụng `/ar/target/` tích hợp mã QR quét nhanh cho điện thoại.
- Sửa lỗi xin quyền Camera trên ứng dụng PWA & trình duyệt di động: bổ sung màn hình Start Screen với nút bấm "Bật Camera quét mẫu vật" kích hoạt trực tiếp qua User Gesture (bắt buộc trên iOS/Android PWA); cấu hình `camera=*` trong Permissions-Policy.
- Cấu hình Vercel CSP & Camera Permissions-Policy, deploy thành công lên production (`https://museum-datta.vercel.app/ar/?code=TB.012`).
- Security hardening frontend/RLS/Storage đã hoàn tất và deploy.
- Performance và UI/accessibility hardening đã hoàn tất trong source; migration hiệu năng được lưu cục bộ.
- Hotfix CSP map Esri đã deploy qua commit `42d3b4e`: local smoke test `/map/` tải 30 tile, `/specimen/?code=E.57392` tải 8 tile.

## Công việc mở

1. **High — blocked:** Baseline migration history production với `npx supabase migration repair --linked --status applied 001` khi Database password xác thực được. Không chạy `supabase db push` trước đó.
2. **High:** Cân nhắc đưa import CSV ba bước vào transaction/RPC sau khi migration history ổn định.
3. **Medium:** Dọn file ảnh Storage mồ côi có từ trước hardening.
4. **Medium:** Thêm CI/test gates, Lighthouse và PWA test trên thiết bị thật.
5. **Low:** Nếu một mạng/thiết bị vẫn thấy nền map xám, kiểm tra ISP/trình duyệt có chặn Esri tile; CSP production đã đúng.

## Backlog đã hoãn

- Upload ảnh no-match, analytics, custom domain, image lightbox, export CSV/PDF, bulk edit.

## Ghi chú an toàn

- Database password đã từng không xác thực qua pooler; không thử lại bằng password đoán và không lưu password vào file.
- Admin credential chỉ được giữ trong `.env.admin.local` bị Git ignore.
- Thay đổi production chỉ sau build + smoke test phù hợp và có chấp thuận của người dùng.
