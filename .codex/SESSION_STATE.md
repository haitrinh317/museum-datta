# Trạng thái hiện tại cho Codex

> Cập nhật: 2026-09-21

## Đã hoàn thành gần đây

- Khóa và deploy hệ thiết kế Hallmark visitor-first qua commit `abc59df`: thêm `design.md` và `tokens.css`; public/admin cùng dark-ocean OKLCH token, typography Space Grotesk + Be Vietnam Pro + JetBrains Mono, focus/motion/responsive guardrails. Trang chủ chuyển hero lệch trái, nhấn hành trình khám phá bộ sưu tập và footer statement. Production HTTP smoke: `/`, `/browse/`, `/specimen/?code=TB.012`, `/map/` đều trả `200`; CSS bundle production có token mới.

- Thiết kế lại `/browse/` theo Workbench: tìm kiếm dẫn đầu, bộ lọc dạng bảng điều khiển với chip bảo tồn, tóm tắt tiêu chí đang áp dụng và drawer mobile đóng bằng nút/Escape; giữ nguyên Supabase query, phân trang 24 kết quả và route hồ sơ mẫu vật.

- Triển khai tính năng WebAR Image Tracking cho mẫu vật Bộ xương cá voi lưng gù (`TB.012`): MindAR target compiler, Three.js 3D video plane, audio tiếng hát cá voi, chế độ mô phỏng trực tiếp khi không có camera, nút kích hoạt WebAR từ trang chi tiết mẫu vật.
- Sửa lỗi PWA Service Worker navigation fallback: loại trừ static assets (`/\.[a-zA-Z0-9]+$/`) khỏi `navigateFallbackDenylist` để tránh bị redirect nhầm sang `offline.html`; tạo trang xem target chuyên dụng `/ar/target/` tích hợp mã QR quét nhanh cho điện thoại.
- Sửa lỗi xin quyền Camera trên ứng dụng PWA & trình duyệt di động: bổ sung màn hình Start Screen với nút bấm "Bật Camera quét mẫu vật" kích hoạt trực tiếp qua User Gesture (bắt buộc trên iOS/Android PWA); cấu hình `camera=*` trong Permissions-Policy.
- Cấu hình Vercel CSP & Camera Permissions-Policy, deploy thành công lên production (`https://museum-datta.vercel.app/ar/?code=TB.012`).
- Security hardening frontend/RLS/Storage đã hoàn tất và deploy.
- Performance và UI/accessibility hardening đã hoàn tất trong source; migration hiệu năng được lưu cục bộ.
- Hotfix CSP map Esri đã deploy qua commit `42d3b4e`: local smoke test `/map/` tải 30 tile, `/specimen/?code=E.57392` tải 8 tile.

- Refactor WebAR `TB.012`: QR sinh cục bộ, registry cấu hình theo mã mẫu, MindAR/Three bundle nội bộ, camera có timeout/retry/cleanup, asset AR cache-first và CSP/Permissions-Policy riêng cho `/ar/*`.
- Hotfix iPhone WebAR: hoãn tải runtime Three.js/MindAR đến khi khách bấm nút Camera; lỗi nạp runtime được bắt và hiển thị thay vì làm nút không phản hồi.
- Hotfix camera iPhone bổ sung: bootstrap camera dạng classic script, gọi getUserMedia ngay trong thao tác chạm; route /ar/v2 tránh cache PWA cũ.

## Công việc mở

1. **High — blocked:** Baseline migration history production với `npx supabase migration repair --linked --status applied 001` khi Database password xác thực được. Không chạy `supabase db push` trước đó.
2. **High:** Cân nhắc đưa import CSV ba bước vào transaction/RPC sau khi migration history ổn định.
3. **Medium:** Dọn file ảnh Storage mồ côi có từ trước hardening.
4. **Medium:** Thêm CI/test gates, Lighthouse và PWA test trên thiết bị thật.
5. **Medium:** Chạy visual smoke test tại 320 / 375 / 414 / 768px cho redesign `/browse/` trên thiết bị hoặc browser automation; build và HTTP smoke production đã đạt.
5. **Low:** Nếu một mạng/thiết bị vẫn thấy nền map xám, kiểm tra ISP/trình duyệt có chặn Esri tile; CSP production đã đúng.

## Backlog đã hoãn

- Upload ảnh no-match, analytics, custom domain, image lightbox, export CSV/PDF, bulk edit.

## Ghi chú an toàn

- Database password đã từng không xác thực qua pooler; không thử lại bằng password đoán và không lưu password vào file.
- Admin credential chỉ được giữ trong `.env.admin.local` bị Git ignore.
- Thay đổi production chỉ sau build + smoke test phù hợp và có chấp thuận của người dùng.


## WebAR bước 1–3 — 2026-09-22

- Bản chẩn đoán: AR-session-20260922-1. Một CameraSession sở hữu stream/video; preview hiện trước runtime, lỗi AR giữ camera và có thử lại.
- Bỏ toàn bộ giả lập thông số WebGL. Huỷ target fetch, worker, listener resize, tài nguyên renderer và tensor khi dừng. Quyền trả muộn được đóng.
- Chẩn đoán theo giai đoạn, nút sao chép chỉ chứa trạng thái/lỗi, không thu hình. /camera-diagnostic.html không đăng ký SW, không precache và dùng đường .html tránh navigation fallback.
- Kiểm chứng: 4 Node tests; Edge headless camera giả + CSP: khởi tạo đến tracking, chặn target vẫn giữ preview, retry, 5 chu kỳ start/stop, từ chối quyền, huỷ chờ quyền; không có unhandled JS errors. Build/audit đạt.
- Chưa nghiệm thu camera thật iPhone/Safari/PWA hoặc nhận diện target thật; không coi HTTP 200 là kiểm chứng camera. Bước 4–6 (media/icon/toàn bộ cập nhật PWA/ma trận thiết bị) còn mở.
