# MEMORY — CSDL Bảo tàng Hải dương học

> Cập nhật lần cuối: 2026-09-21 (WebAR Image Tracking Cá voi lưng gù + Sửa lỗi PWA Camera & Service Worker)

## 1. TỔNG QUAN DỰ ÁN

**Mục tiêu:** Xây dựng webapp quản lý cơ sở dữ liệu mẫu vật lưu trữ cho Bảo tàng Hải dương học Việt Nam. Gồm 2 phần:
- **Admin Panel** — quản trị viên nhập liệu, quản lý mẫu vật, generate QR code
- **Public UX** — khách tham quan tra cứu, quét QR xem thông tin mẫu vật
- **WebAR** — thực tế tăng cường quét ảnh/bảng tên mẫu vật hiển thị video sinh vật sống động 3D

**Bối cảnh:** Bảo tàng có bộ sưu tập mẫu vật sinh vật biển (Da gai, Thân mềm, San hô, Cá...) thu thập từ các chuyến khảo sát biển. Dữ liệu gốc lưu trong Excel/CSV theo chuẩn nội bộ với trường "Thông tin" dạng blob text lớn cần tách cấu trúc.

## 2. TECH STACK

| Layer | Công nghệ | Ghi chú |
|---|---|---|
| Frontend | Vite + Vanilla JS | Multi-page: `/admin/`, `/browse/`, `/map/`, `/specimen/`, `/ar/`, `/ar/target/` |
| CSS | Vanilla CSS | Dark ocean theme, glassmorphism |
| Backend | Supabase (BaaS) | PostgreSQL + Auth + Storage |
| Icons | Material Icons | `https://fonts.googleapis.com/icon?family=Material+Icons` |
| Font | Inter (Google Fonts) | |
| QR | qrcode npm package | Client-side generation |
| Map | Leaflet.js | Esri World Imagery tiles (CartoDB blocked ở VN) |
| PWA | vite-plugin-pwa (Workbox) | Auto-generate SW, precache, runtime cache |
| WebAR | MindAR.js + Three.js | Image tracking (marker-based), 3D video plane, audio loop |

## 3. CẤU TRÚC THƯ MỤC

```
CSDL-Museum/
├── .agents/                    # Agent config + memory
│   ├── memory/                 # Bộ nhớ dự án
│   ├── rules/                  # Quy tắc hành vi
│   └── skills/                 # Skills (kế thừa từ workspace)
├── admin/                      # Admin Panel
│   ├── index.html              # Layout + login + dashboard + CRUD
│   ├── admin.css               # Styles (dark ocean theme)
│   └── admin.js                # Logic: auth, CRUD, CSV import, QR
├── src/
│   └── lib/
│       └── supabase.js         # Supabase client singleton
├── supabase/
│   └── migrations/
│       └── 001_create_schema.sql  # Full schema + RLS + indexes
├── scripts/
│   └── read-password.mjs       # Prompt mật khẩu admin ẩn cho script one-off
├── Data/                       # CSV gốc + đã convert
│   ├── danh sach da gai - QR 2023.xlsx - Sheet1.csv
│   ├── giap-xac-QR2023.csv
│   ├── ran-bien-QR2023.csv       # Format B (12 cột)
│   ├── ran-bien-chuan.csv        # Đã convert → 18 cột chuẩn
│   └── ca bien.docx              # 109 loài cá (chưa convert)
├── index.html                  # Public site (Phase 2)
├── vite.config.js              # Multi-page config
├── package.json                # type: module, scripts: dev/build
├── .env                        # VITE_SUPABASE_ANON_KEY
├── .env.example
├── .gitignore
├── Memory.md                   ← FILE NÀY
├── todo.md                     ← Roadmap + task tracking
└── README.md
```

### PWA Files (mới thêm Session 8)
```
public/
├── manifest.webmanifest        # Auto-generated bởi vite-plugin-pwa
├── offline.html                # Fallback khi mất mạng
├── icons/
│   ├── icon-192x192.png
│   ├── icon-512x512.png
│   ├── icon-maskable-192x192.png
│   ├── icon-maskable-512x512.png
│   └── apple-touch-icon.png
src/
└── pwa-ui.js                   # Install prompt + online/offline toast
```

## 4. DATABASE SCHEMA (Supabase/PostgreSQL)

```
specimen_groups          # Nhóm mẫu: "Da gai", "Thân mềm"...
├── id (UUID, PK)
├── name (UNIQUE)
├── name_en, description

collection_sites         # Địa điểm: "Đá Nam", "Thuyền Chài"...
├── id (UUID, PK)
├── name, region
├── latitude, longitude
├── UNIQUE(name, region)

specimens                # Mẫu vật chính — PRIMARY TABLE
├── id (UUID, PK)
├── specimen_code (UNIQUE) — "E.57259"
├── serial_number          — TT (300, 301...)
├── group_id → specimen_groups
├── family, species, author, common_name_vi
├── site_id → collection_sites
├── collection_date
├── is_cites, iucn_status, is_red_book_vn, is_exploited, is_food_use
├── morphology             — Tách từ "Thông tin": hình thái
├── ecology                — Tách: sinh thái
├── distribution           — Tách: phân bố
├── toxicity               — Tách: độc tố
├── application            — Tách: ứng dụng
├── notes                  — Ghi chú
├── primary_image_url
├── qr_data
├── created_at, updated_at (auto trigger)

specimen_images          # Gallery ảnh
├── specimen_id → specimens (CASCADE)
├── image_url, caption, is_primary, sort_order
```

**RLS Policies:**
- Public SELECT vẫn được giữ cho các bảng tra cứu. Policy ghi cũ `auth.role() = 'authenticated'` đã được thay thế trên production bằng role `museum_admin` trong `app_metadata`.
- Migration `20260902072445_rbac_storage_rpc_hardening.sql` đã được áp dụng thủ công trên production ngày 2026-09-02 và xác minh: 1 admin role, 9 policy `Museum admins`, giới hạn upload ảnh 10 MB. Không chạy `supabase db push` cho đến khi baseline migration history.

**Storage:** Bucket `specimen-images` public read; production giới hạn JPEG/PNG/WebP, 10 MB và chỉ `museum_admin` được ghi.

**Computed Column:** `search_text(specimens)` — `unaccent()` concat species + common_name_vi + family + specimen_code. Dùng cho tìm kiếm không dấu.

## 5. SUPABASE PROJECT

- **URL:** `https://wwkrpbxtvkaxfbewhdor.supabase.co`
- **Dashboard:** `https://supabase.com/dashboard/project/wwkrpbxtvkaxfbewhdor`
- **Project ID:** `wwkrpbxtvkaxfbewhdor`
- **Thông tin admin:** lưu cục bộ trong `.env.admin.local` (Git bỏ qua). Không lưu mật khẩu trong tài liệu hoặc mã nguồn.

## 6. CSV IMPORT PARSER — LOGIC QUAN TRỌNG

File CSV gốc có trường `Thông tin` (cột 18) chứa blob text đa đoạn:
```
Màu sắc, đặc điểm: [mô tả hình thái]
Sinh học, sinh thái: [mô tả sinh thái]
Phân bố: [vùng phân bố]
Độc tố: [nếu có]
Ứng dụng: [nếu có]
Ghi chú: [nếu có]
```

Parser trong `admin.js` (`parseThongTin()`) tách bằng regex theo keyword headers → 6 trường riêng.

**Lưu ý CSV:**
- Multi-line fields trong quotes — parser xử lý được
- Tọa độ dạng DMS (`11°23'07.0`) → convert sang decimal
- Ngày dạng `DD.MM.YYYY` → convert sang `YYYY-MM-DD`
- Các cột boolean (`CT`, `IUCN`, `SĐVN`, `KT`, `TP`) dùng giá trị `1`

## 7. PATTERNS KỸ THUẬT

### Image Upload Flow
- Upload file → Supabase Storage bucket `specimen-images`
- Lấy `publicUrl` → update `specimens.primary_image_url` trực tiếp
- **KHÔNG** dùng bảng `specimen_images` (RLS policy lỗi, chưa cần gallery)
- Khi edit specimen, dùng `state.editingSpecimenId` thay vì `result.data[0].id`

### Material Icons (không phải Material Symbols)
- Dùng class `material-icons` — **KHÔNG** dùng `material-symbols-outlined`
- Import: `https://fonts.googleapis.com/icon?family=Material+Icons`
- Một số icon name khác biệt: `directions_boat` (thay `sailing`), `qr_code` (thay `qr_code_2`)

### Map Tiles
- **Esri World Imagery** (satellite) — CartoDB dark bị chặn ở mạng VN
- Leaflet CSS load bằng `<link>` CDN, **KHÔNG** import trong JS module
- `map-header` phải nằm **ngoài** `#main-map` container (tránh đè Leaflet)
- Overlay: vòng tròn + nhãn QĐ. Hoàng Sa (vàng) + QĐ. Trường Sa (xanh)
- CSP của mọi trang dùng tile phải cho phép chính xác `https://server.arcgisonline.com` (không được bỏ `.com`); nếu sai, Leaflet vẫn tạo marker nhưng nền tile bị chặn và hiện màu xám.

### Supabase Client
- Singleton trong `src/lib/supabase.js`
- Key đọc từ `import.meta.env.VITE_SUPABASE_ANON_KEY`
- Restart Vite khi thay đổi `.env`

### Vite Multi-page
- Root: `index.html` (public)
- Admin: `admin/index.html`
- Config: `vite.config.js` với `rollupOptions.input`

## 8. DỮ LIỆU HIỆN CÓ (cập nhật 2026-07-29)

**Tổng: 304 mẫu vật — 8 nhóm**

| Nhóm mẫu | Số mẫu | Ảnh | Ghi chú |
|---|---|---|---|
| Động vật Da gai | 16 | 0 | TS Trường Sa |
| Giáp xác | 7 | 0 | Trường Sa |
| Rắn biển | 21 | 18 | 6 địa điểm Biển Đông |
| Cá biển | 113 | 4 (cá mập) | 113 đã import, 4 ảnh cá mập, còn lại chưa có ảnh |
| Thực vật biển | 71 | 0 | Đã import |
| Thân mềm | 62 | 62 | ✅ Upload ảnh xong (WebP) |
| Giun nhiều tơ | 6 | 6 | ✅ Upload ảnh xong (WebP) |
| Cá dữ | 8 | 0 | Đã import |
| **Tổng** | **304** | **90** | 14 no-match chưa xử lý |

**display_area:** 233/304 mẫu có thông tin khu trưng bày (→ "Đa dạng sinh học biển")
**Bảo tồn:** CITES, IUCN, Sách Đỏ VN

### Script Upload Ảnh — `upload_images.mjs`

**Vị trí:** `E:\2026\_Antigravity\CSDL-Museum\upload_images.mjs` (root dự án)

**Cách dùng:**
```bash
node upload_images.mjs "E:\2026\_Antigravity\CSDL-Museum\Data\<ten-folder-anh>"
```

Script sẽ hỏi mật khẩu bằng prompt ẩn; khi chạy tự động có thể đặt
`MUSEUM_ADMIN_PASSWORD` trong phiên terminal rồi xóa biến sau khi xong.

**Logic matching (theo thứ tự):**
1. Tên file bắt đầu bằng số TT (`201. Cá mập...`) → match qua `serial_number`
2. Tên file match với `species` (tên khoa học)
3. Tên file match với `common_name_vi` (tên Việt)

**Đặc điểm kỹ thuật:**
- Convert sang WebP (quality 80, max width 1200px) bằng `sharp`
- Tiết kiệm 83–95% dung lượng so với PNG gốc
- **Fix RLS:** delete file cũ trước khi upload mới (bypass UPDATE policy Supabase Storage)
- Storage path: `{specimen_code}/{index}.webp` (ASCII-safe, tránh lỗi tiếng Việt)
- Cập nhật `specimens.primary_image_url` sau khi upload
- Báo cáo rõ: ✅ uploaded / ⚠️ no-match / ❌ error

## 9. QUYẾT ĐỊNH KIẾN TRÚC ĐÃ THỐNG NHẤT

| # | Quyết định | Lý do |
|---|---|---|
| 1 | Supabase thay vì backend riêng | Deploy nhanh, free tier đủ dùng, Auth + Storage có sẵn |
| 2 | Admin trước, Public sau | Cần có data trước khi demo |
| 3 | QR Code là core feature | Use case chính: khách quét QR tại bảo tàng |
| 4 | Bản đồ Leaflet | Data có tọa độ sẵn, hiển thị Biển Đông |
| 5 | Vanilla JS, không framework | YAGNI — app không cần SPA routing phức tạp |
| 6 | Deploy Vercel | Auto-deploy từ GitHub main branch |
| 7 | URL hash cho admin tab | F5 giữ nguyên tab thay vì về dashboard |
| 8 | PWA chỉ public (không admin) | Admin cần Supabase online để CRUD, offline vô dụng |
| 9 | vite-plugin-pwa (Workbox) | Auto SW generation, cache versioning, ít boilerplate hơn tự viết |
| 10 | Cache API + localStorage snapshot (không IndexedDB) | Public site chỉ đọc; app shell/ảnh dùng Workbox, dữ liệu cuối dùng snapshot TTL để fallback offline |
| 11 | Không tự tạo thủ công migration history trên production | Chỉ dùng `supabase migration repair` sau khi xác thực được Database password; tránh lịch sử migration sai lệch |
| 12 | CSP chặn inline script; UI dùng event delegation | Giảm bề mặt Stored XSS, giữ tương thích Vanilla JS |
| 13 | Chỉ một ảnh đại diện/mẫu vật cho đến khi có gallery table | Tránh upload nhiều file nhưng DB chỉ lưu một URL, gây ảnh mồ côi |
| 14 | Khai báo CSP tile provider theo đúng hostname đầy đủ | Tránh lỗi nền bản đồ xám do meta CSP ở từng trang chặn ảnh Esri |
| 15 | Exclude static assets khỏi navigateFallback của Service Worker | Tránh Workbox chặn các request tải file tĩnh (.jpg, .webm, .mind) và redirect nhầm sang offline.html |
| 16 | WebAR Camera kích hoạt bắt buộc qua User Gesture | Tránh bị hệ điều hành iOS/Android âm thầm chặn getUserMedia khi gọi tự động lúc tải trang |

## 10. PERFORMANCE + UI HARDENING (2026-09-04)

- Browse dùng phân trang server-side 24 bản ghi/trang, payload cột tối thiểu và loại bỏ response cũ khi search nhanh.
- Dashboard tách dữ liệu biểu đồ khỏi 8 mẫu gần đây; CSV import gom batch nhóm/địa điểm/mẫu vật.
- `push_to_db.mjs` cũng dùng batch resolve/upsert, tránh `select('*')` và N+1 request khi nạp lại dữ liệu.
- `specimen_images.image_url` có unique index trong schema/migration để khớp `upsert(onConflict: 'image_url')` của script upload.
- Homepage lazy-load Leaflet; map page chỉ lấy tên mẫu vật khi chọn địa điểm.
- Service Worker không cache Supabase REST để tránh dữ liệu CRUD cũ; chỉ giữ cache ảnh/tile/font.
- Browse/specimen lưu kết quả cuối ở localStorage với TTL 7 ngày, có nhãn cảnh báo khi dùng dữ liệu offline.
- Public/admin có focus-visible, reduced-motion, nhãn/ARIA, vùng chạm tối thiểu và modal khôi phục focus.
- Sửa CSP sai hostname Esri ở `map/index.html` và `specimen/index.html`; local smoke test xác nhận tile tải hợp lệ.
- Migration chờ apply: `supabase/migrations/20260904083659_search_text_and_perf.sql` (cần reconcile history + database password).

## 10.1 HALLMARK DESIGN SYSTEM (2026-09-21)

- `design.md` là nguồn quy ước thiết kế khóa cho các thay đổi UI sau: visitor-first, tone technical-scientific, atmospheric Midnight, macrostructure Map / Diagram.
- `tokens.css` là nguồn token canonical cho public/admin: dark ocean OKLCH, ocean cyan, Space Grotesk display, Be Vietnam Pro body, JetBrains Mono metadata; dùng named easing/duration và scale spacing semantic.
- `src/style.css` và `admin/admin.css` import token chung; không tạo palette hoặc font stack song song. Các trang public cần giữ overlay QĐ. Hoàng Sa/QĐ. Trường Sa.
- Build hiện bị chặn cục bộ do thiếu optional native dependency `@rolldown/binding-darwin-x64`; không coi design update đã được Vite build hoặc visual smoke test cho đến khi dependency được khôi phục.

## 11. DEPLOY

- **GitHub:** `haitrinh317/museum-datta` (main branch)
- **Vercel:** https://museum-datta.vercel.app/
- **Auto-deploy:** Push to main → Vercel auto build
- **Deploy 2026-09-03:** commit `db7ef06` đã có trên `main`; production trả HTTP 200 sau deploy.
- **Release 2026-09-04:** commit `ce5ade7` đã push lên `main`; Git Integration tự deploy production và smoke test các route public đạt HTTP 200.
- **Map CSP hotfix 2026-09-04:** commit `42d3b4e` đã push lên `main`; production HTML/header đã nhận hostname Esri đúng. Local smoke test `/map/` tải 30 tile và `/specimen/` tải 8 tile.
- **Release WebAR 2026-09-21:** commit `669b053` và `91db65a` đã deploy production thành công. Tuyến `/ar/`, `/ar/target/`, tài nguyên video/mind/jpg đều trả HTTP 200.

## 12. SKILLS

| Skill | Mục đích |
|---|---|
| `csv-converter` | Convert CSV bất kỳ format → chuẩn 18 cột |
| `session-end` | Tổng kết phiên, cập nhật memory/todo/log |
| `skill-creator-ultra` | Tạo skill mới từ quy trình |
| `skill-stocktake` | Audit skills định kỳ |


## WebAR bước 1–3 — 2026-09-22

- Bản chẩn đoán: AR-session-20260922-1. Một CameraSession sở hữu stream/video; preview hiện trước runtime, lỗi AR giữ camera và có thử lại.
- Bỏ toàn bộ giả lập thông số WebGL. Huỷ target fetch, worker, listener resize, tài nguyên renderer và tensor khi dừng. Quyền trả muộn được đóng.
- Chẩn đoán theo giai đoạn, nút sao chép chỉ chứa trạng thái/lỗi, không thu hình. /camera-diagnostic.html không đăng ký SW, không precache và dùng đường .html tránh navigation fallback.
- Kiểm chứng: 4 Node tests; Edge headless camera giả + CSP: khởi tạo đến tracking, chặn target vẫn giữ preview, retry, 5 chu kỳ start/stop, từ chối quyền, huỷ chờ quyền; không có unhandled JS errors. Build/audit đạt.
- Chưa nghiệm thu camera thật iPhone/Safari/PWA hoặc nhận diện target thật; không coi HTTP 200 là kiểm chứng camera. Bước 4–6 (media/icon/toàn bộ cập nhật PWA/ma trận thiết bị) còn mở.
