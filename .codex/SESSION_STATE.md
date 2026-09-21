# Trạng thái hiện tại cho Codex

> Cập nhật: 2026-09-04

## Đã hoàn thành gần đây

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
