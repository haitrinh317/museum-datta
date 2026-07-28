# TODO — CSDL Bảo tàng Hải dương học

> Cập nhật lần cuối: 2026-07-28

## ✅ PHASE 1 — Admin Panel + Database (HOÀN THÀNH)

- [x] Setup Supabase project + schema (4 bảng, RLS, indexes, storage)
- [x] Vite project structure (multi-page: admin + public)
- [x] Supabase client singleton (`src/lib/supabase.js`)
- [x] Admin login screen (Supabase Auth)
- [x] Dashboard: stats cards + biểu đồ phân bố + recent specimens
- [x] CRUD mẫu vật: form đầy đủ (taxonomy, thu mẫu, bảo tồn, mô tả, ảnh)
- [x] CRUD nhóm mẫu + địa điểm
- [x] Import CSV: parser multi-line, tách "Thông tin" → 6 trường, DMS→decimal, upsert
- [x] QR Code generator: generate per specimen, download PNG, print all
- [x] Tìm kiếm + lọc (theo nhóm, địa điểm, text search)
- [x] Import 16 mẫu Da gai từ CSV gốc → Supabase OK

## ✅ PHASE 2 — Public UX (HOÀN THÀNH)

### 2.1 Trang chủ
- [x] Hero section: ảnh đáy biển AI, tên bảo tàng, thống kê tổng quan
- [x] Showcase mẫu vật nổi bật (ảnh + tên + badge bảo tồn)
- [x] Thanh tìm kiếm nổi bật + redirect to browse
- [x] Bản đồ preview (Leaflet mini map)
- [x] Footer + Navigation

### 2.2 Trang tra cứu
- [x] Card grid: ảnh + tên loài + tên Việt + badge
- [x] Filter sidebar: nhóm mẫu, địa điểm, tình trạng bảo tồn
- [x] Search debounce 350ms (species, common_name_vi, family)
- [x] Sort select (mới nhất, tên A-Z, tên KH, số TT)

### 2.3 Trang chi tiết mẫu vật (`/specimen/?code=...`)
- [x] **QR landing page** — scan QR → xem chi tiết trên điện thoại
- [x] Hero với ảnh hoặc placeholder
- [x] Thông tin taxonomy: Họ → Loài → Tác giả
- [x] Thu mẫu: địa điểm + ngày + tọa độ
- [x] Badge bảo tồn: CITES, IUCN, Sách Đỏ VN, KT, TP
- [x] Sections: Hình thái | Sinh thái | Phân bố | Độc tố | Ứng dụng | Ghi chú
- [x] Mini map Leaflet pin vị trí thu mẫu
- [x] Share button (Web Share API / clipboard)

### 2.4 Bản đồ tương tác
- [x] Leaflet.js fullscreen map, Esri World Imagery (satellite)
- [x] Overlay: QĐ. Hoàng Sa + QĐ. Trường Sa (viền + nhãn)
- [x] Pulsing cyan markers cho tất cả collection sites
- [x] Panel danh sách sites + số mẫu vật
- [x] Click site → flyTo + hiện danh sách mẫu vật trong panel
- [x] Toggle panel + map.invalidateSize()

### 2.5 QR Mobile Experience
- [x] Responsive tối ưu (specimen page mobile-first)
- [x] Sticky bottom navbar (Danh sách + Chia sẻ)
- [x] Skeleton loading + scroll reveal animations

## 🔲 PHASE 3 — Polish & Deploy

- [ ] GitHub repo setup
- [ ] Vercel deployment
- [ ] Custom domain (nếu bảo tàng cung cấp)
- [ ] SEO: meta tags, structured data (Schema.org Dataset)
- [ ] PWA: offline support cho public site
- [ ] Analytics: page views, QR scan tracking
- [ ] Print view: in thẻ QR batch (A4, 3x4 grid)

## 🔲 BACKLOG — Tính năng mở rộng

- [ ] Import thêm nhóm mẫu khác (Thân mềm, San hô, Cá...)
- [ ] Bulk edit mẫu vật
- [ ] Export data (CSV, PDF report)
- [ ] Multi-language (VI/EN) cho public site
- [ ] Taxonomy tree browser (Ngành → Lớp → Bộ → Họ → Loài)
- [ ] So sánh mẫu vật (side-by-side)
- [ ] Admin activity log
- [ ] Image zoom/lightbox trong chi tiết
- [ ] Audio guide integration (text-to-speech mô tả loài)

## 📝 GHI CHÚ KỸ THUẬT

### Cần sửa/cải thiện
- Material Icons hoạt động trong browser thật nhưng headless browser (Playwright) không load Google Fonts
- CSV parser: test thêm với dữ liệu các nhóm mẫu khác (có thể format khác Da gai)
- RLS policy hiện dùng `auth.role() = 'authenticated'` — tất cả user đăng nhập đều là admin

### Đã sửa (2026-07-28)
- [x] Image upload: `uploadSpecimenImages` giờ update `specimens.primary_image_url` trực tiếp
- [x] Search tiếng Việt không dấu: computed column `search_text` + `unaccent()` + `removeAccents()` client-side
- [x] Map tiles: CartoDB → Esri World Imagery (CartoDB bị chặn ở VN)
- [x] Map layout: tách `map-header` ra khỏi `#main-map` Leaflet container
- [x] Tọa độ collection_sites: swap lat/lng bị đảo ngược trong DB

### Dữ liệu chờ import
- Bảo tàng có thể cung cấp thêm CSV cho nhóm: Thân mềm, San hô, Giáp xác, Cá...
- Ảnh mẫu vật: chưa có — cần bảo tàng cung cấp hoặc chụp bổ sung
