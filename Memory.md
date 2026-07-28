# MEMORY — CSDL Bảo tàng Hải dương học

> Cập nhật lần cuối: 2026-07-28 (Session 2 — Bugfix & Polish)

## 1. TỔNG QUAN DỰ ÁN

**Mục tiêu:** Xây dựng webapp quản lý cơ sở dữ liệu mẫu vật lưu trữ cho Bảo tàng Hải dương học Việt Nam. Gồm 2 phần:
- **Admin Panel** — quản trị viên nhập liệu, quản lý mẫu vật, generate QR code
- **Public UX** — khách tham quan tra cứu, quét QR xem thông tin mẫu vật

**Bối cảnh:** Bảo tàng có bộ sưu tập mẫu vật sinh vật biển (Da gai, Thân mềm, San hô, Cá...) thu thập từ các chuyến khảo sát biển. Dữ liệu gốc lưu trong Excel/CSV theo chuẩn nội bộ với trường "Thông tin" dạng blob text lớn cần tách cấu trúc.

## 2. TECH STACK

| Layer | Công nghệ | Ghi chú |
|---|---|---|
| Frontend | Vite + Vanilla JS | Multi-page: `/admin/` + `/` |
| CSS | Vanilla CSS | Dark ocean theme, glassmorphism |
| Backend | Supabase (BaaS) | PostgreSQL + Auth + Storage |
| Icons | Material Icons | `https://fonts.googleapis.com/icon?family=Material+Icons` |
| Font | Inter (Google Fonts) | |
| QR | qrcode npm package | Client-side generation |
| Map | Leaflet.js | Esri World Imagery tiles (CartoDB blocked ở VN) |

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
├── Data/                       # CSV gốc từ bảo tàng
│   └── danh sach da gai - QR 2023.xlsx - Sheet1.csv
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
- Public: SELECT tất cả bảng (khách đọc)
- Admin: INSERT/UPDATE/DELETE khi `auth.role() = 'authenticated'`

**Storage:** Bucket `specimen-images` (public read, auth write)

**Computed Column:** `search_text(specimens)` — `unaccent()` concat species + common_name_vi + family + specimen_code. Dùng cho tìm kiếm không dấu.

## 5. SUPABASE PROJECT

- **URL:** `https://wwkrpbxtvkaxfbewhdor.supabase.co`
- **Dashboard:** `https://supabase.com/dashboard/project/wwkrpbxtvkaxfbewhdor`
- **Project ID:** `wwkrpbxtvkaxfbewhdor`
- **Admin email:** `haitrinhnt@gmail.com`

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

### Supabase Client
- Singleton trong `src/lib/supabase.js`
- Key đọc từ `import.meta.env.VITE_SUPABASE_ANON_KEY`
- Restart Vite khi thay đổi `.env`

### Vite Multi-page
- Root: `index.html` (public)
- Admin: `admin/index.html`
- Config: `vite.config.js` với `rollupOptions.input`

## 8. DỮ LIỆU HIỆN CÓ

| Nhóm mẫu | Số mẫu vật | Địa điểm | Ghi chú |
|---|---|---|---|
| Da gai (Echinodermata) | 16 | 5 (Đá Nam, Tốc Tan, Thuyền Chài, Đá Lớn, Nam Yết) | Import từ CSV, 2020-2021, Trường Sa |

**Mẫu vật cần bảo tồn:** 4/16 (có CITES hoặc IUCN hoặc Sách Đỏ VN)

## 9. QUYẾT ĐỊNH KIẾN TRÚC ĐÃ THỐNG NHẤT

| # | Quyết định | Lý do |
|---|---|---|
| 1 | Supabase thay vì backend riêng | Deploy nhanh, free tier đủ dùng, Auth + Storage có sẵn |
| 2 | Admin trước, Public sau | Cần có data trước khi demo |
| 3 | QR Code là core feature | Use case chính: khách quét QR tại bảo tàng |
| 4 | Bản đồ Leaflet | Data có tọa độ sẵn, hiển thị Biển Đông |
| 5 | Vanilla JS, không framework | YAGNI — app không cần SPA routing phức tạp |
| 6 | Chưa cần GitHub/Vercel | Build local trước, deploy Phase 2 |
