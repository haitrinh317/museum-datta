# Hướng dẫn Codex — CSDL Bảo tàng Hải dương học

## Đọc trước khi thực hiện tác vụ

1. Đọc `.codex/PROJECT_CONTEXT.md` để nắm kiến trúc, quy ước và các ràng buộc an toàn.
2. Đọc `.codex/SESSION_STATE.md` và `todo.md` để biết công việc đang mở.
3. Chỉ đọc `Memory.md` khi tác vụ cần lịch sử chi tiết, dữ liệu mẫu vật hoặc quyết định cũ.

Không đọc, in ra, commit hoặc ghi bất kỳ secret nào từ `.env`, `.env.local`, `.env.admin.local`, credential GitHub hay mật khẩu database. Khi cần thao tác Supabase production, yêu cầu quyền rõ ràng và dùng biến môi trường của phiên terminal, không ghi vào file theo dõi.

## Cách làm việc

- Giao tiếp và UI bằng tiếng Việt. Giọng điệu ngắn gọn, nghiêm túc, dễ kiểm tra.
- Stack mặc định: Vite multi-page + Vanilla JavaScript/CSS, Supabase, Leaflet, Workbox qua `vite-plugin-pwa`. Không thêm framework hay backend riêng nếu chưa có lý do rõ ràng.
- Luôn import Supabase client từ `src/lib/supabase.js`. Chỉ expose biến môi trường có tiền tố `VITE_`.
- Trước khi sửa, kiểm tra `git status`; giữ nguyên thay đổi không liên quan của người dùng. Không tự ý reset, xóa hàng loạt hoặc sửa file secrets.
- Với thay đổi schema/RLS/Storage: tạo migration có rollback, kiểm tra policy/GRANT, và không chạy `supabase db push` khi migration history production chưa được reconcile.
- Với thay đổi giao diện công khai: giữ tiếng Việt, dark-ocean theme, responsive và accessibility. Mọi bản đồ vùng biển Việt Nam phải có overlay QĐ. Hoàng Sa và QĐ. Trường Sa.

## Kiểm chứng và bàn giao

- Thay đổi mã nguồn: chạy kiểm tra phù hợp, tối thiểu `npm run build`; thêm smoke test nếu luồng UI/API bị ảnh hưởng.
- Thay đổi SQL: kiểm tra migration tĩnh, RLS, rollback và chỉ áp dụng production khi người dùng cho phép.
- Không đánh dấu hoàn thành hoặc deploy khi kiểm tra quan trọng còn lỗi.
- Sau thay đổi đáng kể: cập nhật `todo.md`, `Memory.md` khi kiến trúc thay đổi, và `.codex/SESSION_STATE.md` khi trạng thái công việc thay đổi.
- Khi kết thúc phiên, ghi log ngắn vào `.codex/SESSION_LOG.md`; không đưa log, token hoặc password nhạy cảm vào Git.

## Lệnh thường dùng

```powershell
npm run dev
npm run build
npm run preview
npm audit --offline --audit-level=high
```

Production: push lên `main` sẽ kích hoạt Vercel Git Integration. Chỉ commit các file liên quan; kiểm tra staged diff trước khi push.
