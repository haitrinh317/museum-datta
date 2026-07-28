# 🌊 CSDL Bảo tàng Hải dương học

Hệ thống quản trị cơ sở dữ liệu mẫu vật sinh vật biển.

## Cấu trúc dự án

```
CSDL-Museum/
├── admin/                  # Admin Panel
│   ├── index.html
│   ├── admin.css
│   └── admin.js
├── src/
│   └── lib/
│       └── supabase.js     # Supabase client
├── supabase/
│   └── migrations/
│       └── 001_create_schema.sql
├── Data/                   # CSV gốc
├── index.html              # Public site (Phase 2)
├── vite.config.js
└── package.json
```

## Setup nhanh

### 1. Cấu hình Supabase

Vào [Supabase Dashboard](https://supabase.com/dashboard/project/wwkrpbxtvkaxfbewhdor):

- **Settings → API** → Copy `anon public` key
- Tạo file `.env`:
  ```
  VITE_SUPABASE_ANON_KEY=eyJhbGci...your_key_here
  ```

### 2. Tạo Database Schema

Vào **SQL Editor** trên Supabase Dashboard, paste nội dung file `supabase/migrations/001_create_schema.sql` và chạy.

### 3. Tạo tài khoản Admin

Vào **Authentication → Users → Add User**:
- Email: admin@museum.vn (hoặc email thật)
- Password: đặt mật khẩu mạnh

### 4. Chạy local

```bash
npm install
npm run dev
```

Truy cập: http://localhost:3000/admin/

## Tính năng

- ✅ Đăng nhập quản trị viên (Supabase Auth)
- ✅ CRUD mẫu vật + nhóm mẫu + địa điểm
- ✅ Import CSV (hỗ trợ định dạng bảo tàng)
- ✅ Tìm kiếm và lọc
- ✅ QR Code generator + in hàng loạt
- ✅ Upload ảnh mẫu vật
- 🔲 Trang public tra cứu (Phase 2)
- 🔲 Bản đồ tương tác (Phase 2)
- 🔲 QR scanning mobile (Phase 2)
