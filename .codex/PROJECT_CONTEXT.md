# Project context — CSDL Bảo tàng Hải dương học

> Context đã được chọn lọc để Codex dùng trong mọi phiên. Không chứa mật khẩu, token hay service-role key.

## Mục tiêu và stack

Webapp quản lý và tra cứu mẫu vật sinh vật biển cho Bảo tàng Hải dương học Việt Nam:

- `admin/`: đăng nhập Supabase Auth, CRUD, import CSV, upload ảnh và QR.
- Public MPA: `/`, `/browse/`, `/specimen/?code=...`, `/map/`.
- Vite + Vanilla JS/CSS; Supabase (Postgres, Auth, Storage); Leaflet; `vite-plugin-pwa`/Workbox.
- Production: `https://museum-datta.vercel.app/`; GitHub `haitrinh317/museum-datta`; push `main` tự deploy Vercel.
- Supabase project ID: `wwkrpbxtvkaxfbewhdor`. Public URL/key chỉ lấy từ `.env`, không hard-code secret.

## Cấu trúc cần biết

| Vị trí | Vai trò |
|---|---|
| `src/lib/supabase.js` | Supabase client singleton duy nhất |
| `admin/admin.js` | Auth, CRUD, import CSV, upload và QR |
| `browse/index.html` | Tra cứu/phân trang public |
| `specimen/index.html` | Chi tiết mẫu vật và mini map |
| `map/index.html` | Bản đồ Leaflet toàn trang |
| `index.html` | Trang chủ, thống kê và mini map |
| `supabase/migrations/` | Schema và migration theo phiên bản |
| `vercel.json` | Security headers/CSP production |
| `vite.config.js` | MPA input và PWA runtime caching |

## Dữ liệu và quyền

Các bảng chính: `specimens`, `specimen_groups`, `collection_sites`, `specimen_images`.

- Public chỉ đọc dữ liệu tra cứu và ảnh Storage public.
- Ghi dữ liệu/Storage yêu cầu `app_metadata.museum_role = 'museum_admin'`.
- Upload chỉ JPEG/PNG/WebP, tối đa 10 MB. Tránh tạo ảnh mồ côi khi thay/xóa mẫu.
- Tìm kiếm tiếng Việt không dấu dùng `search_text` + `unaccent`; không ghép chuỗi input vào `.or()`.
- Migration RBAC/Storage hardening đã được áp dụng thủ công trên production ngày 2026-09-02. History CLI chưa baseline: **không chạy `supabase db push`** trước khi xác thực Database password và reconcile.

## Quy ước UX và map

- UI hiển thị tiếng Việt, dark-ocean theme; ưu tiên accessibility, focus-visible, vùng chạm đủ lớn và reduced motion.
- Không đổi Vanilla JS sang framework nếu không được yêu cầu.
- Bản đồ biển Việt Nam luôn giữ overlay QĐ. Hoàng Sa (vàng) và QĐ. Trường Sa (xanh).
- Tile provider là Esri World Imagery: `https://server.arcgisonline.com/...`.
- CSP tại mọi trang có tile phải cho phép chính xác `https://server.arcgisonline.com` trong `img-src`; sai hostname làm Leaflet/marker chạy nhưng nền map xám.
- Kiểm tra map bằng số tile có `naturalWidth > 0`, không chỉ kiểm tra `.leaflet-container`.

## PWA và hiệu năng

- Workbox precache app shell; Supabase REST là network-only để tránh dữ liệu CRUD cũ.
- Ảnh Supabase, font và Esri tiles dùng runtime cache. Query param mẫu vật phải tương thích precache (`ignoreURLParametersMatching: [/./]`).
- Browse phân trang server-side (24 bản ghi/trang); tránh `select('*')` và N+1 query.
- Leaflet lazy-load khi map thực sự cần; map chính chỉ tải tên mẫu vật khi chọn địa điểm.

## Kiểm chứng tối thiểu

```powershell
npm run build
npm audit --offline --audit-level=high
git diff --check
```

Thay đổi API/UI cần smoke test route bị ảnh hưởng. Thay đổi Supabase cần migration, RLS review và rollback plan.

## Nguồn lịch sử

- `Memory.md`: lịch sử kiến trúc, dữ liệu và quyết định đầy đủ.
- `todo.md`: roadmap và backlog.
- `.codex/SESSION_STATE.md`: trạng thái gọn cho phiên hiện tại.
- `.codex/SESSION_LOG.md`: nhật ký Codex gần đây.
