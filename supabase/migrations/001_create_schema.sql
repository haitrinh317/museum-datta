-- ============================================================
-- Bảo tàng Hải dương học - CSDL Mẫu vật
-- Migration 001: Create core schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. Bảng nhóm mẫu vật (specimen_groups)
-- ============================================================
CREATE TABLE IF NOT EXISTS specimen_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,          -- "Da gai", "Thân mềm", "San hô"...
    name_en TEXT,                        -- English name
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. Bảng địa điểm thu mẫu (collection_sites)
-- ============================================================
CREATE TABLE IF NOT EXISTS collection_sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,                  -- "Đá Nam", "Thuyền Chài"...
    region TEXT,                         -- "Trường Sa", "Hoàng Sa"...
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, region)
);

-- ============================================================
-- 3. Bảng mẫu vật chính (specimens)
-- ============================================================
CREATE TABLE IF NOT EXISTS specimens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identification
    serial_number INTEGER,               -- TT (300, 301...)
    specimen_code TEXT NOT NULL UNIQUE,   -- Số hiệu "E.57259"
    
    -- Taxonomy
    group_id UUID REFERENCES specimen_groups(id),
    family TEXT,                          -- Họ: "Ophiocomidae"
    species TEXT,                         -- Loài: "Ophiocoma schoenleinii"
    author TEXT,                          -- "Müller & Troschel, 1842"
    common_name_vi TEXT,                  -- Tên Việt: "Đuôi rắn"
    
    -- Collection info
    site_id UUID REFERENCES collection_sites(id),
    collection_date DATE,
    
    -- Conservation status
    is_cites BOOLEAN DEFAULT FALSE,       -- CT - Công ước CITES
    iucn_status TEXT,                     -- IUCN status
    is_red_book_vn BOOLEAN DEFAULT FALSE, -- Sách Đỏ Việt Nam
    is_exploited BOOLEAN DEFAULT FALSE,   -- KT - Khai thác
    is_food_use BOOLEAN DEFAULT FALSE,    -- TP - Thực phẩm
    
    -- Detailed information (parsed from "Thông tin")
    morphology TEXT,                      -- Đặc điểm hình thái, màu sắc
    ecology TEXT,                         -- Sinh học, sinh thái
    distribution TEXT,                    -- Phân bố
    toxicity TEXT,                        -- Độc tố
    application TEXT,                     -- Ứng dụng
    notes TEXT,                           -- Ghi chú thêm
    
    -- Media
    primary_image_url TEXT,               -- Ảnh đại diện
    
    -- QR
    qr_data TEXT,                         -- QR code data/URL
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. Bảng ảnh mẫu vật (specimen_images)
-- ============================================================
CREATE TABLE IF NOT EXISTS specimen_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    specimen_id UUID NOT NULL REFERENCES specimens(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. Index cho tìm kiếm
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_specimens_code ON specimens(specimen_code);
CREATE INDEX IF NOT EXISTS idx_specimens_species ON specimens(species);
CREATE INDEX IF NOT EXISTS idx_specimens_family ON specimens(family);
CREATE INDEX IF NOT EXISTS idx_specimens_common_name ON specimens(common_name_vi);
CREATE INDEX IF NOT EXISTS idx_specimens_group ON specimens(group_id);
CREATE INDEX IF NOT EXISTS idx_specimens_site ON specimens(site_id);
CREATE INDEX IF NOT EXISTS idx_specimen_images_specimen ON specimen_images(specimen_id);

-- Full-text search index (Vietnamese + unaccented)
CREATE INDEX IF NOT EXISTS idx_specimens_fts ON specimens 
    USING GIN (to_tsvector('simple', 
        COALESCE(species, '') || ' ' || 
        COALESCE(common_name_vi, '') || ' ' || 
        COALESCE(family, '') || ' ' ||
        COALESCE(morphology, '') || ' ' ||
        COALESCE(distribution, '')
    ));

-- ============================================================
-- 6. Trigger auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_specimens_updated_at
    BEFORE UPDATE ON specimens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. Row Level Security (RLS)
-- ============================================================

-- Enable RLS
ALTER TABLE specimens ENABLE ROW LEVEL SECURITY;
ALTER TABLE specimen_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE specimen_images ENABLE ROW LEVEL SECURITY;

-- Public read access (for visitors)
CREATE POLICY "Public read specimens" ON specimens
    FOR SELECT USING (true);

CREATE POLICY "Public read groups" ON specimen_groups
    FOR SELECT USING (true);

CREATE POLICY "Public read sites" ON collection_sites
    FOR SELECT USING (true);

CREATE POLICY "Public read images" ON specimen_images
    FOR SELECT USING (true);

-- Admin write access (authenticated users)
CREATE POLICY "Admin insert specimens" ON specimens
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin update specimens" ON specimens
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admin delete specimens" ON specimens
    FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Admin manage groups" ON specimen_groups
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin manage sites" ON collection_sites
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin manage images" ON specimen_images
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- 8. Storage bucket cho ảnh mẫu vật
-- ============================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('specimen-images', 'specimen-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public read specimen images" ON storage.objects
    FOR SELECT USING (bucket_id = 'specimen-images');

CREATE POLICY "Admin upload specimen images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'specimen-images' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Admin delete specimen images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'specimen-images' 
        AND auth.role() = 'authenticated'
    );
