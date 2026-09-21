import sys
import os
import re
import csv
import openpyxl
import docx

sys.stdout.reconfigure(encoding='utf-8')

EXCEL_PATH = r'e:\2026\_Antigravity\CSDL-Museum\Data\RAW\SNVH-2022\ds thông tin mẫu vật mã QR (1).xlsx'
DOCX_PATH = r'e:\2026\_Antigravity\CSDL-Museum\Data\RAW\SNVH-2022\THÔNG-TIN-MẪU-VẬT-TRƯNG-BÀY (FINAL).docx'
OUTPUT_CSV = r'e:\2026\_Antigravity\CSDL-Museum\Data\mau-vat-trung-bay-chuan.csv'

# 1. Read Excel
wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
ws = wb['Sheet1']

excel_items = []
for r in range(4, ws.max_row + 1):
    vals = [ws.cell(r, c).value for c in range(1, 45)]
    if any(v is not None for v in vals):
        stt = int(vals[1])
        excel_items.append({
            'stt': stt,
            'vals': vals
        })

print(f"Loaded {len(excel_items)} items from Excel (STT 1 to {len(excel_items)}).")

# 2. Read DOCX
doc = docx.Document(DOCX_PATH)

def is_subheading_or_body(text):
    t = text.strip()
    if not t:
        return True
    if re.match(r'^Hình\s*\d+', t, re.IGNORECASE):
        return True
    if re.match(r'^(Kích thước|Sinh thái|Phân bố|Giá trị|Màu sắc|Đặc điểm|Công dụng|Ý nghĩa|Tập tính|Thức ăn|Sinh sản|Tình trạng|Bảo tồn|Nơi trưng bày|Nơi sống|Chế độ ăn|Vùng phân bố|Hiện nay|Thông tin thêm|Mẫu vật được thu|Mẫu được thu|Vào ngày|Ngày \d|Năm 19|Tháng \d|Bề mặt của răng|Trong lịch sử|Ở Việt Nam|Cá có kích thước|Thức ăn chủ yếu|Vì tỷ lệ chết|Do kích thước)', t, re.IGNORECASE):
        return True
    if t.startswith('- Thế giới') or t.startswith('- Việt Nam'):
        return True
    return False

sections = []
current = None

for i, p in enumerate(doc.paragraphs):
    t = p.text.strip().replace('\xa0', ' ')
    if not t or t == "THÔNG TIN MẪU VẬT TRƯNG BÀY":
        continue
    is_bold = any(r.bold for r in p.runs if r.text.strip())
    if is_bold and not is_subheading_or_body(t) and len(t) < 130:
        if current:
            sections.append(current)
        current = {'title_idx': i, 'title': t, 'paras': []}
    else:
        if current:
            current['paras'].append((i, t))

if current:
    sections.append(current)

print(f"Loaded {len(sections)} sections from DOCX.")

# Match each excel item to docx sections
matched_sections = {}
for ex_idx, ex in enumerate(excel_items):
    stt = ex['stt']
    sp = str(ex['vals'][9] or '').lower().strip()
    vn = str(ex['vals'][10] or '').lower().strip()
    
    best_sec = None
    best_score = 0
    for s_idx, sec in enumerate(sections):
        title = sec['title'].lower()
        score = 0
        if sp and len(sp) > 4 and sp in title:
            score += 20
        if vn and len(vn) > 3 and vn in title:
            score += 15
        vn_words = [w for w in vn.split() if len(w) > 2]
        matching_words = sum(1 for w in vn_words if w in title)
        score += matching_words * 2
        idx_diff = abs(s_idx - ex_idx)
        if idx_diff <= 3:
            score += (4 - idx_diff)
        if score > best_score:
            best_score = score
            best_sec = sec
    if best_sec and best_score >= 3:
        matched_sections[stt] = best_sec
    else:
        matched_sections[stt] = sections[ex_idx] if ex_idx < len(sections) else None

def extract_author(title):
    m = re.search(r'\(([^()]+)\)\s*\)\s*$', title)
    if m:
        val = m.group(1).strip()
        if re.search(r'\d{4}', val) or re.search(r'^[A-Z]', val):
            return f"({val})" if not val.startswith('(') else val
            
    m = re.search(r'\(([A-Z][^(),\d]+,?\s*\d{4}[a-z]?)\)\s*$', title)
    if m:
        return f"({m.group(1).strip()})"
        
    m = re.search(r'\([A-Z][a-z]+(?:\s+[a-z]+)?\s+([A-Z][^(),\d]+,?\s*\d{4}[a-z]?)\)\s*$', title)
    if m:
        return m.group(1).strip()
        
    return ""

def is_english_para(text):
    t = text.strip()
    has_vn_accent = bool(re.search(r'[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]', t))
    if not has_vn_accent:
        words = t.split()
        eng_words = {'the', 'and', 'is', 'in', 'of', 'to', 'with', 'from', 'species', 'are', 'was', 'were', 'at', 'on', 'this', 'that', 'for', 'about', 'living', 'meters', 'marine'}
        matching = sum(1 for w in words if w.lower() in eng_words)
        if matching >= 2 or (len(words) > 5 and matching >= 1):
            return True
    return False

def clean_vietnamese_name(name):
    n = name.strip()
    if n.isupper():
        return n.capitalize()
    return n

def determine_group(ex_vals):
    nganh = str(ex_vals[4] or '').strip().lower()
    lop = str(ex_vals[5] or '').strip().lower()
    stt = int(ex_vals[1])
    
    if stt == 5:
        return "Cá dữ"
        
    if 'mollusca' in nganh or lop in ['gastropoda', 'bivalvia', 'cephalopoda']:
        return "Thân mềm"
    if 'mammalia' in lop:
        return "Thú biển"
    if 'reptilia' in lop:
        return "Bò sát"
    if 'aves' in lop:
        return "Chim biển"
    if 'cnidaria' in nganh or lop in ['anthozoa', 'hexacorallia']:
        return "San hô"
    if lop in ['actinopteri', 'actinopterygii', 'chondrichthyes', 'elasmobranchii']:
        return "Cá biển"
        
    return "Mẫu vật trưng bày"

def format_date(d, m, y, docx_text=""):
    m_date = re.search(r'(?:ngày|vào ngày)\s*(\d{1,2})[/-](\d{1,2})[/-](\d{4})', docx_text, re.IGNORECASE)
    if m_date:
        day = int(m_date.group(1))
        month = int(m_date.group(2))
        year = int(m_date.group(3))
        # fix docx typo 2055 -> 2005 if any
        if year > 2026:
            year = 2005
        return f"{day:02d}.{month:02d}.{year}"
        
    m_month_year = re.search(r'tháng\s*(\d{1,2})[/.](\d{4})', docx_text, re.IGNORECASE)
    if m_month_year:
        month = int(m_month_year.group(1))
        year = int(m_month_year.group(2))
        return f"01.{month:02d}.{year}"

    if y:
        try:
            year = int(y)
            day = int(d) if d else 1
            month = int(m) if m else 1
            return f"{day:02d}.{month:02d}.{year}"
        except:
            pass
            
    m_year = re.search(r'năm\s*(\d{4})', docx_text, re.IGNORECASE)
    if m_year:
        return f"01.01.{m_year.group(1)}"
        
    return ""

def clean_noi_thu(stt, vals, sec, raw_text):
    noi_excel = str(vals[31] or '').strip()
    tinh_excel = str(vals[33] or '').strip()
    qg_excel = str(vals[32] or '').strip()
    
    parts = []
    if noi_excel:
        parts.append(noi_excel)
    if tinh_excel and tinh_excel not in noi_excel:
        parts.append(tinh_excel)
    if qg_excel and qg_excel not in ['Việt Nam'] and qg_excel not in noi_excel:
        parts.append(qg_excel)
    if parts:
        return ' - '.join(parts)
        
    # Check specific narrative patterns
    m_spec = re.search(r'(?:mẫu được thu tại|mẫu vật được thu tại|được bắt bởi ngư dân ở|đánh bắt tại)\s+([^\.,;\n()]+)', raw_text, re.IGNORECASE)
    if m_spec:
        loc = m_spec.group(1).strip()
        if len(loc) < 50 and not any(k in loc.lower() for k in ['loài', 'năm', 'tháng', 'ngư dân', 'thuộc', 'chiều']):
            return loc
            
    m_vn = re.search(r'-\s*Việt Nam:\s*([^.,;\n()]+)', raw_text, re.IGNORECASE)
    if m_vn:
        loc = m_vn.group(1).strip().replace('vv…', '').replace('vv...', '').replace('vv.', '').strip()
        if len(loc) < 50 and not any(k in loc.lower() for k in ['loài', 'thuộc', 'giá trị']):
            return loc
            
    # Exhibition location
    noi_luu = str(vals[41] or '')
    if 'Hoàng Sa' in noi_luu:
        return "Quần đảo Hoàng Sa - Trường Sa"
    elif 'Việt Nam' in str(vals[32] or ''):
        return "Vùng biển Việt Nam"
        
    return ""

def determine_conservation(sp, vn, all_text):
    text_low = (sp + " " + vn + " " + all_text).lower()
    
    ct = ""
    iucn = ""
    sdvn = ""
    kt = ""
    tp = ""
    
    cites_species = [
        'dugong dugon', 'megaptera', 'lagenodelphis', 'pseudorca', 'manta', 'rhincodon',
        'tridacna', 'hippopus', 'anthipathes', 'turbinaria', 'hippocampus', 'dermochelys',
        'careta', 'lepidochelys', 'chelonia', 'eretmochelys', 'charonia tritonis', 'cassis cornuta',
        'turbo marmoratus', 'acipenser'
    ]
    if any(k in text_low for k in cites_species) or 'cites' in text_low:
        ct = "1"
        
    iucn_species = [
        'dugong dugon', 'acipenser', 'rhincodon', 'manta', 'megaptera', 'dermochelys',
        'careta', 'lepidochelys', 'chelonia', 'eretmochelys', 'hippocampus', 'tridacna gigas'
    ]
    if any(k in text_low for k in iucn_species) or 'iucn' in text_low or 'nguy cấp' in text_low or 'tuyệt chủng' in text_low:
        iucn = "1"
        
    sd_species = [
        'dugong dugon', 'acipenser', 'rhincodon', 'manta', 'megaptera', 'dermochelys',
        'careta', 'lepidochelys', 'chelonia', 'eretmochelys', 'hippocampus', 'tridacna',
        'charonia tritonis', 'cassis cornuta', 'turbo marmoratus', 'bò biển', 'rùa da', 'vích', 'đồi mồi'
    ]
    if any(k in text_low for k in sd_species) or 'sách đỏ' in text_low:
        sdvn = "1"
        
    if any(k in text_low for k in ['mỹ nghệ', 'trang sức', 'khai thác', 'kinh tế', 'thương phẩm', 'quý hiếm']):
        kt = "1"
        
    food_species = [
        'scomberomorus', 'thunnus', 'meretrix', 'tapes', 'periglypta', 'lutraria', 'magallana',
        'sepia', 'sepioteuthis', 'uroteuthis', 'haliotis', 'alepes', 'cá thu', 'cá ngừ', 'nghêu',
        'hàu', 'sò', 'mực', 'tu hài', 'bào ngư'
    ]
    if any(k in text_low for k in food_species) or any(k in text_low for k in ['thực phẩm', 'ăn được', 'thịt ngon', 'món ăn']):
        tp = "1"
        
    return ct, iucn, sdvn, kt, tp

def build_thong_tin(stt, ex_vals, sec):
    morphology = []
    ecology = []
    distribution = []
    toxicity = []
    application = []
    notes = []
    
    dai = ex_vals[18]
    dai_u = ex_vals[19] or ''
    tl = ex_vals[20]
    tl_u = ex_vals[21] or ''
    size_str = []
    if dai:
        size_str.append(f"Dài {dai} {dai_u}".strip())
    if tl:
        size_str.append(f"Trọng lượng {tl} {tl_u}".strip())
    if size_str:
        morphology.append(f"Kích thước mẫu vật: {', '.join(size_str)}.")
        
    current_cat = None
    all_raw_text = []
    
    if sec and sec.get('paras'):
        for p_idx, text in sec['paras']:
            t = text.strip()
            if not t:
                continue
            if re.match(r'^Hình\s*\d+', t, re.IGNORECASE):
                continue
            if is_english_para(t):
                continue
                
            all_raw_text.append(t)
            
            if re.match(r'^(Kích thước|Màu sắc|Đặc điểm|Đặc điểm nổi bật)[:\s]', t, re.IGNORECASE):
                val = re.sub(r'^(Kích thước|Màu sắc|Đặc điểm|Đặc điểm nổi bật)[:\s]+', '', t, flags=re.IGNORECASE).strip()
                if val:
                    morphology.append(val)
                current_cat = 'morphology'
            elif re.match(r'^(Sinh thái học|Sinh thái|Sinh học, sinh thái|Nơi sống|Tập tính|Thức ăn|Sinh sản|Chế độ ăn)[:\s]', t, re.IGNORECASE):
                val = re.sub(r'^(Sinh thái học|Sinh thái|Sinh học, sinh thái|Nơi sống|Tập tính|Thức ăn|Sinh sản|Chế độ ăn)[:\s]+', '', t, flags=re.IGNORECASE).strip()
                if val:
                    ecology.append(val)
                current_cat = 'ecology'
            elif re.match(r'^(Phân bố|Vùng phân bố)[:\s]', t, re.IGNORECASE):
                val = re.sub(r'^(Phân bố|Vùng phân bố)[:\s]+', '', t, flags=re.IGNORECASE).strip()
                if val:
                    distribution.append(val)
                current_cat = 'distribution'
            elif t.startswith('- Thế giới') or t.startswith('- Việt Nam'):
                distribution.append(t)
                current_cat = 'distribution'
            elif re.match(r'^(Giá trị sử dụng|Giá trị kinh tế|Giá trị|Công dụng|Ứng dụng)[:\s]', t, re.IGNORECASE):
                val = re.sub(r'^(Giá trị sử dụng|Giá trị kinh tế|Giá trị|Công dụng|Ứng dụng)[:\s]+', '', t, flags=re.IGNORECASE).strip()
                if 'độc' in val.lower():
                    toxicity.append(val)
                elif val:
                    application.append(val)
                current_cat = 'application'
            elif re.match(r'^(Độc tố)[:\s]', t, re.IGNORECASE):
                val = re.sub(r'^(Độc tố)[:\s]+', '', t, flags=re.IGNORECASE).strip()
                if val:
                    toxicity.append(val)
                current_cat = 'toxicity'
            elif re.match(r'^(Nơi trưng bày|Nơi lưu giữ)[:\s]', t, re.IGNORECASE):
                val = re.sub(r'^(Nơi trưng bày|Nơi lưu giữ)[:\s]+', '', t, flags=re.IGNORECASE).strip()
                if val:
                    notes.append(f"Nơi trưng bày: {val}")
                current_cat = 'notes'
            elif re.match(r'^(Mẫu vật được thu|Mẫu được thu|Vào ngày|Ngày \d|Năm 19|Tháng \d|Mẫu cá|Mẫu vật)', t, re.IGNORECASE):
                notes.append(t)
                current_cat = 'notes'
            else:
                t_low = t.lower()
                if any(k in t_low for k in ['thu tại', 'ngư dân', 'tặng', 'bắt bởi', 'chuyển giao', 'bảo tàng lưu trữ']):
                    notes.append(t)
                elif any(k in t_low for k in ['độc tố', 'chết người', 'nọc độc', 'tetrodotoxin']):
                    toxicity.append(t)
                elif any(k in t_low for k in ['thức ăn', 'sinh sản', 'tập tính', 'sống ở', 'độ sâu', 'tuổi thọ', 'ăn cỏ']):
                    ecology.append(t)
                elif any(k in t_low for k in ['phân bố', 'vùng biển', 'đại dương', 'khánh hòa', 'bình thuận', 'nam định']):
                    distribution.append(t)
                elif any(k in t_low for k in ['thân hình', 'vây', 'răng', 'màu sắc', 'bộ lông', 'chiều dài', 'vỏ', 'mép']):
                    morphology.append(t)
                else:
                    if current_cat == 'morphology':
                        morphology.append(t)
                    elif current_cat == 'ecology':
                        ecology.append(t)
                    elif current_cat == 'distribution':
                        distribution.append(t)
                    elif current_cat == 'application':
                        application.append(t)
                    else:
                        notes.append(t)
                        
    ex_noi_luu = str(ex_vals[41] or '').strip()
    if ex_noi_luu and not any('trưng bày' in n.lower() for n in notes):
        notes.append(f"Nơi trưng bày: {ex_noi_luu}.")
        
    lines = []
    if morphology:
        lines.append(f"Màu sắc, đặc điểm: {' '.join(morphology)}")
    if ecology:
        lines.append(f"Sinh học, sinh thái: {' '.join(ecology)}")
    if distribution:
        lines.append(f"Phân bố: {' '.join(distribution)}")
    if toxicity:
        lines.append(f"Độc tố: {' '.join(toxicity)}")
    if application:
        lines.append(f"Ứng dụng: {' '.join(application)}")
    if notes:
        lines.append(f"Ghi chú: {' '.join(notes)}")
        
    return '\n'.join(lines), ' '.join(all_raw_text)

# Build rows
output_rows = []

for ex in excel_items:
    stt = ex['stt']
    vals = ex['vals']
    sec = matched_sections.get(stt)
    
    col_tt = str(stt)
    col_group = determine_group(vals)
    col_so_hieu = f"TB.{stt:03d}"
    col_ho = str(vals[7] or '').strip()
    col_loai = str(vals[9] or '').strip().replace('\xa0', ' ')
    if stt == 10 and not col_loai:
        col_loai = "Pristiformes"
        
    doc_title = sec['title'] if sec else ""
    col_tac_gia = extract_author(doc_title)
    col_ten_vn = clean_vietnamese_name(str(vals[10] or ''))
    
    info_text, raw_text = build_thong_tin(stt, vals, sec)
    
    col_noi_thu = clean_noi_thu(stt, vals, sec, raw_text)
    col_ngay_thu = format_date(vals[25], vals[26], vals[27], raw_text)
    
    col_long = ""
    col_lat = ""
    
    col_ct, col_iucn, col_sdvn, col_kt, col_tp = determine_conservation(col_loai, col_ten_vn, raw_text)
    col_lc_mn = ""
    
    row = [
        col_tt,
        col_group,
        col_so_hieu,
        col_ho,
        col_loai,
        col_tac_gia,
        col_ten_vn,
        col_noi_thu,
        col_ngay_thu,
        col_long,
        col_lat,
        col_ct,
        col_iucn,
        col_sdvn,
        col_kt,
        col_tp,
        col_lc_mn,
        info_text
    ]
    output_rows.append(row)

# 3. Write CSV with UTF-8 BOM
HEADER = [
    "TT", "Nhóm mẫu", "Số hiệu", "Họ", "Loài", "Tác giả", "Tên việt",
    "Nơi thu", "Ngày thu", "Long", "Lat", "CT", "IUCN", "SĐVN",
    "KT", "TP", "LC/MN", "Thông tin"
]

with open(OUTPUT_CSV, 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
    writer.writerow(HEADER)
    for r in output_rows:
        writer.writerow(r)

print(f"\nSUCCESS: Written {len(output_rows)} rows to {OUTPUT_CSV}")

from collections import Counter
print("\n--- Summary Statistics ---")
print("Groups breakdown:")
for g, count in Counter(r[1] for r in output_rows).items():
    print(f" - {g}: {count} loài")

print(f"\nSpecimen codes: {output_rows[0][2]} -> {output_rows[-1][2]}")
print(f"Authors filled: {sum(1 for r in output_rows if r[5])} / {len(output_rows)}")
print(f"Collection sites filled: {sum(1 for r in output_rows if r[7])} / {len(output_rows)}")
print(f"Collection dates filled: {sum(1 for r in output_rows if r[8])} / {len(output_rows)}")
print(f"CITES marked (CT=1): {sum(1 for r in output_rows if r[11] == '1')}")
print(f"IUCN marked (IUCN=1): {sum(1 for r in output_rows if r[12] == '1')}")
print(f"Sách Đỏ VN marked (SĐVN=1): {sum(1 for r in output_rows if r[13] == '1')}")
print(f"Khai thác marked (KT=1): {sum(1 for r in output_rows if r[14] == '1')}")
print(f"Thực phẩm marked (TP=1): {sum(1 for r in output_rows if r[15] == '1')}")
