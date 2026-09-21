# TODO — CSDL Bảo tàng Hải dương học

> Cập nhật lần cuối: 2026-09-21 (Triển khai WebAR Cá voi lưng gù + Sửa lỗi PWA Camera & Service Worker)

## ✅ Hệ thiết kế Hallmark (2026-09-21)

- [x] Khóa hệ design visitor-first trong `design.md`: atmospheric Midnight, ocean cyan, Map / Diagram cho tra cứu và khám phá bộ sưu tập.
- [x] Tạo `tokens.css` dùng chung public/admin; thêm display font Space Grotesk, giữ Be Vietnam Pro và JetBrains Mono.
- [x] Sửa responsive guards nền tảng: `overflow-x: clip`, grid `minmax(0, 1fr)`, heading wrap và named easing.
- [ ] Chạy visual smoke test tại 320 / 375 / 414 / 768px sau khi khôi phục native binding của Vite/Rolldown.

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
- [x] SEO: Schema.org structured data (Dataset)
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
  - Ảnh mẫu vật (Supabase Storage): Cache First (URL upload có tên mới, TTL 30 ngày)
  - API calls Supabase: network-only để tránh dữ liệu admin cũ; app shell vẫn có offline fallback
- [x] Cache tên: `museum-v1` — version bump khi deploy lớn
- [x] Offline fallback page (`/offline.html`) khi mất mạng hoàn toàn

### 4.3 Install Prompt
- [x] Bắt sự kiện `beforeinstallprompt` → hiện banner "Cài ứng dụng" trên trang chủ
- [x] Nút "Cài đặt" + "Để sau" — lưu choice vào localStorage
- [x] Không hiện lại nếu đã cài hoặc đã từ chối

### 4.4 Offline UX
- [x] Specimen page: nếu offline, show bản ghi cuối từ localStorage snapshot (TTL 7 ngày)
- [x] Browse page: hiện kết quả lần browse cuối từ localStorage + badge "Dữ liệu offline"
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
- [ ] Baseline migration history production trước khi dùng `supabase db push`; RBAC hardening đã được áp dụng thủ công ngày 2026-09-02, vì vậy không chạy lại migration qua CLI khi history chưa được reconcile.
- [ ] Supabase Auth leaked-password protection chỉ có từ gói Pro; dự án Free chưa thể bật. Cân nhắc khi nâng gói.

### Đã sửa (2026-09-04 — Security hardening frontend)
- [x] Loại bỏ toàn bộ inline event handlers; `script-src` không còn `unsafe-inline`
- [x] Escape dữ liệu DB/CSV tại các HTML sink và giới hạn URL ảnh về local/Supabase HTTPS
- [x] Admin search dùng computed column `search_text`, không ghép chuỗi `.or()` từ input
- [x] Thêm security headers trên Vercel: CSP, nosniff, deny framing, referrer và permissions policy
- [x] Upload admin chỉ nhận JPEG/PNG/WebP, tối đa 10 MB và một ảnh đại diện
- [x] Xóa ảnh/mẫu vật sẽ dọn file ảnh đại diện trong Supabase Storage nếu URL thuộc bucket
- [x] Nâng các dependency gián tiếp có advisory; `npm audit --offline` = 0 lỗ hổng
- [x] Script import/upload không còn nhận mật khẩu qua argv; dùng prompt ẩn hoặc `MUSEUM_ADMIN_PASSWORD`
- [ ] CSV import đã gom batch (nhóm/địa điểm/mẫu vật) nhưng chưa atomic xuyên suốt 3 bước; cân nhắc RPC/Edge Function sau khi migration history được reconcile
- [ ] Kiểm tra và dọn các file ảnh mồ côi đã tồn tại trước bản vá

### Đã sửa (2026-09-04 — Performance + UI/accessibility)
- [x] Browse phân trang server-side 24 bản ghi/trang, chỉ chọn các cột card cần dùng và loại bỏ request cũ khi gõ tìm kiếm nhanh
- [x] Dashboard tách payload chart khỏi 8 mẫu gần đây; import CSV gom batch nhóm/địa điểm/mẫu vật
- [x] Script `push_to_db.mjs` gom batch resolve nhóm/địa điểm và upsert mẫu vật; loại bỏ `select('*')`/N+1
- [x] Đồng bộ unique index `specimen_images.image_url` với API upsert gallery; migration sẽ báo duplicate legacy rõ ràng
- [x] Map preview lazy-load Leaflet; bản đồ chính chỉ tải tên mẫu vật khi chọn một địa điểm
- [x] Loại bỏ runtime cache Supabase REST để không phục vụ dữ liệu CRUD cũ từ Service Worker
- [x] Thêm focus-visible, reduced-motion, nhãn form/ARIA, vùng chạm 40–44px và thao tác modal khôi phục focus
- [x] Giảm pattern side-stripe trên card, chuyển sang đường nhấn phía trên theo audit Hallmark
- [ ] Chạy migration `20260904083659_search_text_and_perf.sql` sau khi reconcile migration history và có database password

### Đã sửa (2026-09-04 — Map tile CSP)
- [x] Sửa CSP tại `/map/` và `/specimen/`: cho phép đúng hostname `https://server.arcgisonline.com` để tile Esri không bị trình duyệt chặn
- [x] Build production và smoke test local: `/map/` tải 30 tile, `/specimen/` tải 8 tile
- [x] Commit `42d3b4e` đã push lên `main`; Vercel nhận build mới và trả CSP đúng trên production

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
- [ ] Baseline migration history trên production bằng `npx supabase migration repair --linked --status applied 001` sau khi Database password hoạt động; không chạy `supabase db push` trước đó.
- [ ] Chỉ bật Supabase Auth leaked-password protection sau khi nâng project từ Free lên Pro.
- [ ] Upload 14 ảnh no-match thủ công qua Admin (filter "Chưa có ảnh").
- [ ] Nếu nền bản đồ vẫn xám trên một mạng/thiết bị cụ thể, kiểm tra thêm khả năng Esri tile bị ISP hoặc trình duyệt chặn; CSP production đã đúng.
- [ ] Tiếp tục backlog: image lightbox, bulk edit, export và analytics.

### Đã hoàn thành Session 10 (2026-08-03)
- [x] SEO: Schema.org Dataset structured data (trang chủ)
- [x] SEO: Schema.org Taxon structured data (trang chi tiết mẫu vật)
- [x] Push code & Deploy Vercel thành công
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

## ✅ PHASE 5 — WebAR Image Tracking (Thử nghiệm mẫu TB.012 Cá voi lưng gù)
- [x] Tạo pipeline tự động biên dịch MindAR Target (`scripts/compile_ar_target.mjs`) bằng Edge headless WebGL
- [x] Compile target image `TB.012` (Bộ xương cá voi lưng gù) → `public/ar/TB.012.mind`
- [x] Tải video đại dương thực tế sống động `public/ar/TB.012.webm` (Cá voi lưng gù bơi và hát dưới nước)
- [x] Xây dựng trang WebAR `/ar/` (Three.js + MindAR.js Image Tracking, HUD quét, video overlay 3D, âm thanh tiếng hát)
- [x] Tích hợp chế độ Demo mô phỏng trực tiếp (dành cho PC/laptop hoặc khách không có ảnh in sẵn)
- [x] Tạo trang xem ảnh Target chuyên dụng `/ar/target/` có mã QR quét nhanh bằng điện thoại
- [x] Gắn nút kích hoạt WebAR vào trang chi tiết mẫu vật (`/specimen/?code=TB.012`)
- [x] Fix lỗi Service Worker Navigation Fallback làm chặn file ảnh tĩnh `.jpg`
- [x] Fix lỗi PWA Camera: thêm Start Screen và gọi `getUserMedia` thông qua User Gesture chuẩn mobile
- [x] Cấu hình CSP & Permissions-Policy camera trên Vercel (`vercel.json`), thêm route vào `vite.config.js`
- [x] Deploy Vercel Production thành công và kiểm thử trực tiếp
- [x] Audit + hardening WebAR: QR nội bộ, registry mã mẫu, retry/timeout/cleanup camera, bundle thư viện, CSP/PWA cache riêng
- [ ] Kiểm thử thiết bị thật: iPhone Safari, Android Chrome, ánh sáng/tủ kính tại khu trưng bày
- [ ] Ghi nguồn, quyền sử dụng và metadata cho video WebAR trước khi công bố rộng
