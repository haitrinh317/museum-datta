# TODO — CSDL Bảo tàng Hải dương học

> Cập nhật lần cuối: 2026-07-30 (Session 9 — taste-skill UI Audit, Skills install, PWA guide fix)

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

- [x] GitHub repo setup (`haitrinh317/museum-datta`)
- [x] Vercel deployment (https://museum-datta.vercel.app/)
- [ ] Custom domain (nếu bảo tàng cung cấp)
- [x] SEO: OG meta tags + Twitter Card + og-image.png
- [ ] SEO: Schema.org structured data (Dataset)
- [x] PWA: offline support cho public site
- [ ] Analytics: page views, QR scan tracking
- [ ] Print view: in thẻ QR batch (A4, 3x4 grid)

## 🔲 PHASE 4 — PWA (Progressive Web App)

> **Mục tiêu:** Khách tham quan scan QR → cài app lên điện thoại → xem offline không cần mạng.
> Ưu tiên trang `/specimen/` (QR landing) và `/browse/` (tra cứu).

### 4.1 Web App Manifest
- [x] Tạo `public/manifest.json` — name, short_name, icons, theme_color, display: standalone
- [x] Icon set: 192×192, 512×512 từ logo.png (dùng sharp để resize)
- [x] Thêm `<link rel="manifest">` vào tất cả trang public
- [x] Thêm `<meta name="theme-color">` + Apple touch icon

### 4.2 Service Worker
- [x] Tạo `public/sw.js` — đăng ký trong `index.html`, `browse/`, `specimen/`
- [x] **Cache strategy:**
  - App Shell (HTML/CSS/JS): Cache First
  - Ảnh mẫu vật (Supabase Storage): Cache First, stale-while-revalidate
  - API calls Supabase: Network First, fallback cache
- [x] Cache tên: `museum-v1` — version bump khi deploy lớn
- [x] Offline fallback page (`/offline.html`) khi mất mạng hoàn toàn

### 4.3 Install Prompt
- [x] Bắt sự kiện `beforeinstallprompt` → hiện banner "Cài ứng dụng" trên trang chủ
- [x] Nút "Cài đặt" + "Để sau" — lưu choice vào localStorage
- [x] Không hiện lại nếu đã cài hoặc đã từ chối

### 4.4 Offline UX
- [x] Specimen page: nếu offline, show dữ liệu từ cache (Cache API)
- [x] Browse page: hiện kết quả cache lần browse cuối + badge "Dữ liệu offline"
- [x] Toast thông báo khi mất/có lại kết nối mạng

### 4.5 Test & Validate
- [ ] Lighthouse PWA audit ≥ 90 điểm
- [ ] Test install trên Android Chrome + iOS Safari (Add to Home Screen)
- [ ] Test offline: tắt mạng → mở app → xem specimen page

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

### Đã sửa (2026-07-28 Session 2+3)
- [x] Image upload: `uploadSpecimenImages` giờ update `specimens.primary_image_url` trực tiếp
- [x] Search tiếng Việt không dấu: computed column `search_text` + `unaccent()` + `removeAccents()` client-side
- [x] Map tiles: CartoDB → Esri World Imagery (CartoDB bị chặn ở VN)
- [x] Map layout: tách `map-header` ra khỏi `#main-map` Leaflet container
- [x] Tọa độ collection_sites: swap lat/lng bị đảo ngược trong DB
- [x] Fix tọa độ 7 loài Giáp xác + gom duplicate sites
- [x] Filter browse: sort regex, onchange handlers CITES/IUCN/SĐVN, module scope
- [x] QR Code URL: `/specimen/CODE` → `/specimen/?code=CODE`
- [x] Admin tab persistence: URL hash (#specimens, #import...)
- [x] Logo Viện Hải dương học tích hợp navbar
- [x] Thumbnail ảnh mẫu vật + no-photo.png placeholder
- [x] Tạo skill `csv-converter` (convert CSV bất kỳ format → chuẩn 18 cột)
- [x] Convert thành công `ran-bien-QR2023.csv` → `ran-bien-chuan.csv` (21 records)

### Đã sửa (2026-07-29 Session 5 — UI Polish)
- [x] Specimen page: redesign layout 2 hàng (ảnh+taxonomy | thu mẫu+bản đồ)
- [x] Fix padding cards: `--sp-5` undefined → thêm vào spacing scale
- [x] Trang chủ: bản đồ Esri + overlay Hoàng Sa/Trường Sa
- [x] Admin edit modal: hiển thị ảnh hiện tại + nút xóa ảnh
- [x] Trang chủ: mẫu tiêu biểu random (Fisher-Yates shuffle)
- [x] Mobile: hamburger Material Icons, stat cards 2 cột, sidebar auto-hide
- [x] Admin: ẩn link Admin từ public navbar

### Next Session Starting Point
- [ ] Upload 14 ảnh no-match thủ công qua Admin (filter "Chưa có ảnh")
- [ ] Upload ảnh folders còn lại (kiểm tra folder nào chưa xử lý)
- [ ] Schema.org Dataset structured data
- [ ] Lighthouse PWA audit ≥ 90
- [ ] Custom domain setup (nếu bảo tàng cung cấp)
- [ ] Analytics: page views, QR scan tracking

### Đã hoàn thành Session 8 (2026-07-30)
- [x] PWA: manifest + icons (192, 512, maskable, apple-touch)
- [x] PWA: Service Worker (vite-plugin-pwa/Workbox) — 29 precache entries
- [x] PWA: Runtime cache (Supabase images CacheFirst, API NetworkFirst, fonts, tiles)
- [x] PWA: Offline fallback page (`/offline.html`)
- [x] PWA: Install prompt banner (beforeinstallprompt + localStorage dismiss)
- [x] PWA: Online/Offline toast (tất cả trang public)
- [x] PWA: Install guide section trang chủ (auto-detect iOS/Android)
- [x] Fix: Workbox query param matching (`ignoreURLParametersMatching: [/./]`)
- [x] Gitignore cleanup: exclude raw images, scratch scripts

### Đã hoàn thành Session 7 (2026-07-29)
- [x] Auto upload script `upload_images.mjs` — 72 ảnh WebP upload thành công
- [x] Filter hình ảnh: trang chủ, browse, admin
- [x] SEO: OG + Twitter Card meta tags + og-image.png
- [x] Fix RLS upsert: delete-before-upload

### Dữ liệu chờ import
- `Data/ran-bien-chuan.csv` — 21 mẫu Rắn biển, đã convert, chờ import thủ công
- `Data/ca-bien-chuan.csv` — 113 mẫu cá biển ✅ đã import, đang upload ảnh
- Tất cả 147 mẫu đợt 2 (Thực vật, Cá dữ, Thân mềm, Giun nhiều tơ) ✅ đã push xong
- Ảnh mẫu vật cá biển: đang bổ sung — cần upload đủ cho 113 loài

### Đã hoàn thành Session 9 (2026-07-30 chiều)
- [x] Cài redesign-skill + output-skill từ Leonxlnx/taste-skill (GitHub)
- [x] Update taste-skill v1 → v2.0.0-adapted
- [x] taste-skill audit 7 fixes: 100dvh, badge-exploit amber, navy shadows, eyebrow density, @media print, footer CSS classes, asymmetric featured grid
- [x] Specimen info-row: align-items center + icon nhất quán 5 rows (pin_drop, waves, my_location, calendar_today, museum)
- [x] Fix featured-grid bug: inline display:block vs CSS display:grid → dùng aspect-ratio:16/9 thay vì internal grid
- [x] Featured count: 6 → 5 (clean asymmetric layout: row1=wide+1, row2=3)
- [x] PWA guide: ẩn trên desktop (pointer:fine media query check)
