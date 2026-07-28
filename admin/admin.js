// ============================================================
// Admin Panel — Main Application Logic
// Bảo tàng Hải dương học — CSDL Mẫu vật
// ============================================================
import { supabase, SUPABASE_URL } from '../src/lib/supabase.js';
import QRCode from 'qrcode';

// ============================================================
// STATE
// ============================================================
const state = {
  user: null,
  specimens: [],
  groups: [],
  sites: [],
  currentPage: 'dashboard',
  pagination: { page: 1, perPage: 20, total: 0 },
  searchQuery: '',
  filterGroup: '',
  filterSite: '',
  editingSpecimenId: null,
  pendingImages: [], // Files waiting to upload
};

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Check auth state
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    state.user = session.user;
    showAdminApp();
  } else {
    showLoginScreen();
  }

  // Auth state listener
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      state.user = session.user;
      showAdminApp();
    } else if (event === 'SIGNED_OUT') {
      state.user = null;
      showLoginScreen();
    }
  });

  bindEvents();
});

// ============================================================
// AUTH
// ============================================================
function showLoginScreen() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('admin-app').style.display = 'none';
}

function showAdminApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-app').style.display = 'flex';
  document.getElementById('user-email').textContent = state.user?.email || 'admin';
  loadDashboard();
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Đang đăng nhập...';
  errorEl.style.display = 'none';

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    errorEl.textContent = error.message === 'Invalid login credentials'
      ? 'Email hoặc mật khẩu không đúng'
      : error.message;
    errorEl.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons">login</span> Đăng nhập';
  }
}

async function handleLogout() {
  await supabase.auth.signOut();
}

// ============================================================
// NAVIGATION
// ============================================================
function navigateTo(page) {
  state.currentPage = page;

  // Update nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Update pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');

  // Update title
  const titles = {
    dashboard: 'Tổng quan',
    specimens: 'Quản lý mẫu vật',
    groups: 'Nhóm mẫu',
    sites: 'Địa điểm thu mẫu',
    import: 'Import CSV',
    qrcodes: 'QR Codes',
  };
  document.getElementById('page-title').textContent = titles[page] || page;

  // Show/hide add button
  const addBtn = document.getElementById('add-specimen-btn');
  addBtn.style.display = page === 'specimens' ? 'inline-flex' : 'none';

  // Load page data
  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'specimens': loadSpecimens(); break;
    case 'groups': loadGroups(); break;
    case 'sites': loadSites(); break;
    case 'qrcodes': loadQRCodes(); break;
  }
}

// ============================================================
// DASHBOARD
// ============================================================
async function loadDashboard() {
  const [specimensRes, groupsRes, sitesRes] = await Promise.all([
    supabase.from('specimens').select('*, specimen_groups(name), collection_sites(name)', { count: 'exact' }),
    supabase.from('specimen_groups').select('*'),
    supabase.from('collection_sites').select('*'),
  ]);

  const specimens = specimensRes.data || [];
  const groups = groupsRes.data || [];
  const sites = sitesRes.data || [];

  state.specimens = specimens;
  state.groups = groups;
  state.sites = sites;

  // Stats
  document.getElementById('stat-total').textContent = specimens.length;
  document.getElementById('stat-groups').textContent = groups.length;
  document.getElementById('stat-sites').textContent = sites.length;

  const conservation = specimens.filter(s => s.is_cites || s.iucn_status || s.is_red_book_vn).length;
  document.getElementById('stat-conservation').textContent = conservation;

  // Chart: specimens by group
  renderGroupChart(specimens, groups);

  // Recent specimens
  renderRecentSpecimens(specimens);
}

function renderGroupChart(specimens, groups) {
  const container = document.getElementById('chart-groups');
  if (!groups.length) {
    container.innerHTML = '<div class="empty-state"><p>Chưa có nhóm mẫu nào</p></div>';
    return;
  }

  const counts = {};
  groups.forEach(g => { counts[g.id] = { name: g.name, count: 0 }; });
  specimens.forEach(s => {
    if (s.group_id && counts[s.group_id]) counts[s.group_id].count++;
  });

  const maxCount = Math.max(...Object.values(counts).map(c => c.count), 1);

  container.innerHTML = `
    <div class="chart-bar">
      ${Object.values(counts).map(c => `
        <div class="chart-bar-item">
          <div class="chart-bar-fill" style="height: ${(c.count / maxCount) * 100}%" data-value="${c.count}"></div>
          <span class="chart-bar-label" title="${c.name}">${c.name}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderRecentSpecimens(specimens) {
  const container = document.getElementById('recent-specimens');
  const recent = [...specimens]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8);

  if (!recent.length) {
    container.innerHTML = '<div class="empty-state"><p>Chưa có mẫu vật nào</p></div>';
    return;
  }

  container.innerHTML = recent.map(s => `
    <div class="recent-item">
      <div class="recent-item-icon">
        <span class="material-icons">pets</span>
      </div>
      <div class="recent-item-info">
        <div class="recent-item-name">${s.common_name_vi || s.species || 'N/A'}</div>
        <div class="recent-item-meta">${s.specimen_code} · ${s.specimen_groups?.name || ''}</div>
      </div>
    </div>
  `).join('');
}

// ============================================================
// SPECIMENS CRUD
// ============================================================
async function loadSpecimens() {
  await loadGroupsAndSites();

  let query = supabase
    .from('specimens')
    .select('*, specimen_groups(name), collection_sites(name)', { count: 'exact' })
    .order('serial_number', { ascending: true });

  if (state.searchQuery) {
    query = query.or(
      `species.ilike.%${state.searchQuery}%,` +
      `common_name_vi.ilike.%${state.searchQuery}%,` +
      `specimen_code.ilike.%${state.searchQuery}%,` +
      `family.ilike.%${state.searchQuery}%`
    );
  }
  if (state.filterGroup) {
    query = query.eq('group_id', state.filterGroup);
  }
  if (state.filterSite) {
    query = query.eq('site_id', state.filterSite);
  }

  const { data, error, count } = await query
    .range(
      (state.pagination.page - 1) * state.pagination.perPage,
      state.pagination.page * state.pagination.perPage - 1
    );

  if (error) {
    showToast('Lỗi tải dữ liệu: ' + error.message, 'error');
    return;
  }

  state.specimens = data || [];
  state.pagination.total = count || 0;
  renderSpecimensTable();
  renderPagination();
  populateFilters();
}

function renderSpecimensTable() {
  const tbody = document.getElementById('specimens-tbody');

  if (!state.specimens.length) {
    tbody.innerHTML = `
      <tr><td colspan="10">
        <div class="empty-state">
          <span class="material-icons">pets</span>
          <p>Chưa có mẫu vật nào. Thêm mới hoặc import từ CSV.</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = state.specimens.map(s => {
    const badges = [];
    if (s.is_cites) badges.push('<span class="badge badge-conservation">CITES</span>');
    if (s.iucn_status) badges.push('<span class="badge badge-iucn">IUCN</span>');
    if (s.is_red_book_vn) badges.push('<span class="badge badge-conservation">SĐ VN</span>');

    return `
      <tr data-id="${s.id}">
        <td>${s.serial_number || ''}</td>
        <td><span class="code-badge">${s.specimen_code}</span></td>
        <td>${s.specimen_groups?.name || ''}</td>
        <td>${s.family || ''}</td>
        <td><span class="species-name">${s.species || ''}</span></td>
        <td>${s.common_name_vi || ''}</td>
        <td>${s.collection_sites?.name || ''}</td>
        <td>${s.collection_date ? formatDate(s.collection_date) : ''}</td>
        <td>${badges.join(' ') || '—'}</td>
        <td>
          <div class="table-actions">
            <button class="btn-icon" onclick="editSpecimen('${s.id}')" title="Sửa">
              <span class="material-icons">edit</span>
            </button>
            <button class="btn-icon" onclick="deleteSpecimen('${s.id}', '${s.specimen_code}')" title="Xóa">
              <span class="material-icons">delete</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderPagination() {
  const container = document.getElementById('specimens-pagination');
  const totalPages = Math.ceil(state.pagination.total / state.pagination.perPage);

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="${i === state.pagination.page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }
  container.innerHTML = html;
}

function populateFilters() {
  const groupSelect = document.getElementById('filter-group');
  const siteSelect = document.getElementById('filter-site');

  // Keep current values
  const currentGroup = groupSelect.value;
  const currentSite = siteSelect.value;

  // Populate groups
  groupSelect.innerHTML = '<option value="">Tất cả nhóm</option>' +
    state.groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');

  // Populate sites
  siteSelect.innerHTML = '<option value="">Tất cả địa điểm</option>' +
    state.sites.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

  groupSelect.value = currentGroup;
  siteSelect.value = currentSite;
}

// Open specimen form modal
function openSpecimenModal(specimen = null) {
  const modal = document.getElementById('specimen-modal');
  const title = document.getElementById('modal-title');
  const form = document.getElementById('specimen-form');

  // Populate group/site dropdowns in form
  const formGroup = document.getElementById('form-group');
  const formSite = document.getElementById('form-site');

  formGroup.innerHTML = '<option value="">-- Chọn nhóm --</option>' +
    state.groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');

  formSite.innerHTML = '<option value="">-- Chọn địa điểm --</option>' +
    state.sites.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

  if (specimen) {
    // Edit mode
    title.textContent = `Sửa: ${specimen.specimen_code}`;
    state.editingSpecimenId = specimen.id;

    document.getElementById('form-id').value = specimen.id;
    document.getElementById('form-serial').value = specimen.serial_number || '';
    document.getElementById('form-code').value = specimen.specimen_code || '';
    document.getElementById('form-group').value = specimen.group_id || '';
    document.getElementById('form-family').value = specimen.family || '';
    document.getElementById('form-species').value = specimen.species || '';
    document.getElementById('form-author').value = specimen.author || '';
    document.getElementById('form-common-name').value = specimen.common_name_vi || '';
    document.getElementById('form-site').value = specimen.site_id || '';
    document.getElementById('form-date').value = specimen.collection_date || '';
    document.getElementById('form-cites').checked = specimen.is_cites || false;
    document.getElementById('form-iucn').checked = !!specimen.iucn_status;
    document.getElementById('form-redbook').checked = specimen.is_red_book_vn || false;
    document.getElementById('form-exploited').checked = specimen.is_exploited || false;
    document.getElementById('form-food').checked = specimen.is_food_use || false;
    document.getElementById('form-morphology').value = specimen.morphology || '';
    document.getElementById('form-ecology').value = specimen.ecology || '';
    document.getElementById('form-distribution').value = specimen.distribution || '';
    document.getElementById('form-toxicity').value = specimen.toxicity || '';
    document.getElementById('form-application').value = specimen.application || '';
    document.getElementById('form-notes').value = specimen.notes || '';
  } else {
    // Add mode
    title.textContent = 'Thêm mẫu vật mới';
    state.editingSpecimenId = null;
    form.reset();
    document.getElementById('form-id').value = '';
  }

  state.pendingImages = [];
  document.getElementById('image-preview-grid').innerHTML = '';

  modal.style.display = 'flex';
}

async function handleSpecimenSubmit(e) {
  e.preventDefault();

  const specimenData = {
    serial_number: parseInt(document.getElementById('form-serial').value) || null,
    specimen_code: document.getElementById('form-code').value.trim(),
    group_id: document.getElementById('form-group').value || null,
    family: document.getElementById('form-family').value.trim() || null,
    species: document.getElementById('form-species').value.trim(),
    author: document.getElementById('form-author').value.trim() || null,
    common_name_vi: document.getElementById('form-common-name').value.trim() || null,
    site_id: document.getElementById('form-site').value || null,
    collection_date: document.getElementById('form-date').value || null,
    is_cites: document.getElementById('form-cites').checked,
    iucn_status: document.getElementById('form-iucn').checked ? 'listed' : null,
    is_red_book_vn: document.getElementById('form-redbook').checked,
    is_exploited: document.getElementById('form-exploited').checked,
    is_food_use: document.getElementById('form-food').checked,
    morphology: document.getElementById('form-morphology').value.trim() || null,
    ecology: document.getElementById('form-ecology').value.trim() || null,
    distribution: document.getElementById('form-distribution').value.trim() || null,
    toxicity: document.getElementById('form-toxicity').value.trim() || null,
    application: document.getElementById('form-application').value.trim() || null,
    notes: document.getElementById('form-notes').value.trim() || null,
  };

  const submitBtn = document.getElementById('form-submit');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Đang lưu...';

  let result;
  if (state.editingSpecimenId) {
    result = await supabase
      .from('specimens')
      .update(specimenData)
      .eq('id', state.editingSpecimenId)
      .select();
  } else {
    result = await supabase
      .from('specimens')
      .insert(specimenData)
      .select();
  }

  submitBtn.disabled = false;
  submitBtn.innerHTML = '<span class="material-icons">save</span> Lưu mẫu vật';

  if (result.error) {
    if (result.error.code === '23505') {
      showToast('Mã mẫu vật đã tồn tại!', 'error');
    } else {
      showToast('Lỗi: ' + result.error.message, 'error');
    }
    return;
  }

  // Upload images if any
  // Resolve ID: for edit mode use editingSpecimenId, for insert use result data
  const specimenId = state.editingSpecimenId || result.data?.[0]?.id;
  if (state.pendingImages.length && specimenId) {
    await uploadSpecimenImages(specimenId);
  }

  closeAllModals();
  showToast(
    state.editingSpecimenId ? 'Đã cập nhật mẫu vật' : 'Đã thêm mẫu vật mới',
    'success'
  );
  loadSpecimens();
}

// Compress image to WebP before upload — Canvas API, no deps
// ponytail: max 2048px long edge, 85% quality. Upgrade path: lower quality for >2MB originals.
async function compressImage(file, maxPx = 2048, quality = 0.85) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        const ratio = Math.min(maxPx / width, maxPx / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob ?? file), 'image/webp', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

async function uploadSpecimenImages(specimenId) {
  let firstPublicUrl = null;

  for (const file of state.pendingImages) {
    const compressed = await compressImage(file);
    const fileName = `${specimenId}/${Date.now()}_${Math.random().toString(36).slice(2)}.webp`;

    const { error: uploadError } = await supabase.storage
      .from('specimen-images')
      .upload(fileName, compressed, { upsert: false, contentType: 'image/webp' });

    if (uploadError) {
      console.error('Upload error:', uploadError.message);
      showToast('Lỗi upload ảnh: ' + uploadError.message, 'error');
      continue;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('specimen-images')
      .getPublicUrl(fileName);

    if (!firstPublicUrl) firstPublicUrl = publicUrl;
  }

  // ponytail: only update primary_image_url — specimen_images gallery table skipped until needed
  if (firstPublicUrl) {
    const { error: updateErr } = await supabase
      .from('specimens')
      .update({ primary_image_url: firstPublicUrl })
      .eq('id', specimenId);

    if (updateErr) {
      console.error('Update primary_image_url error:', updateErr.message);
      showToast('Lỗi lưu ảnh vào DB: ' + updateErr.message, 'error');
    }
  }
}

// Make functions global for onclick handlers
window.editSpecimen = async function(id) {
  const { data } = await supabase.from('specimens').select('*').eq('id', id).single();
  if (data) openSpecimenModal(data);
};

window.deleteSpecimen = async function(id, code) {
  if (!confirm(`Xóa mẫu vật ${code}?`)) return;

  const { error } = await supabase.from('specimens').delete().eq('id', id);
  if (error) {
    showToast('Lỗi xóa: ' + error.message, 'error');
  } else {
    showToast(`Đã xóa ${code}`, 'success');
    loadSpecimens();
  }
};

window.goToPage = function(page) {
  state.pagination.page = page;
  loadSpecimens();
};

// ============================================================
// GROUPS CRUD
// ============================================================
async function loadGroups() {
  const { data } = await supabase
    .from('specimen_groups')
    .select('*, specimens(count)')
    .order('name');

  state.groups = data || [];
  renderGroupCards();
}

function renderGroupCards() {
  const grid = document.getElementById('groups-grid');

  if (!state.groups.length) {
    grid.innerHTML = '<div class="empty-state"><span class="material-icons">category</span><p>Chưa có nhóm mẫu nào</p></div>';
    return;
  }

  grid.innerHTML = state.groups.map(g => {
    const count = g.specimens?.[0]?.count || 0;
    return `
      <div class="group-card">
        <div class="group-card-header">
          <span class="group-card-name">${g.name}</span>
        </div>
        <div class="group-card-count">${count} mẫu vật</div>
        ${g.description ? `<p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 8px;">${g.description}</p>` : ''}
        <div class="group-card-actions">
          <button class="btn btn-sm btn-secondary" onclick="editGroup('${g.id}')">
            <span class="material-icons" style="font-size:14px;">edit</span> Sửa
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteGroup('${g.id}', '${g.name}')">
            <span class="material-icons" style="font-size:14px;">delete</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function openGroupModal(group = null) {
  const modal = document.getElementById('inline-modal');
  const title = document.getElementById('inline-modal-title');
  const body = document.getElementById('inline-modal-body');

  title.textContent = group ? 'Sửa nhóm mẫu' : 'Thêm nhóm mẫu';

  body.innerHTML = `
    <div class="form-group" style="margin-bottom:12px;">
      <label for="inline-name">Tên nhóm *</label>
      <input type="text" id="inline-name" required value="${group?.name || ''}" placeholder="VD: Da gai">
    </div>
    <div class="form-group" style="margin-bottom:12px;">
      <label for="inline-name-en">Tên tiếng Anh</label>
      <input type="text" id="inline-name-en" value="${group?.name_en || ''}" placeholder="Echinodermata">
    </div>
    <div class="form-group">
      <label for="inline-desc">Mô tả</label>
      <textarea id="inline-desc" rows="3">${group?.description || ''}</textarea>
    </div>
    <input type="hidden" id="inline-edit-id" value="${group?.id || ''}">
  `;

  modal.dataset.type = 'group';
  modal.style.display = 'flex';
}

async function handleGroupSubmit() {
  const name = document.getElementById('inline-name').value.trim();
  const name_en = document.getElementById('inline-name-en').value.trim() || null;
  const description = document.getElementById('inline-desc').value.trim() || null;
  const editId = document.getElementById('inline-edit-id').value;

  if (!name) return;

  let result;
  if (editId) {
    result = await supabase.from('specimen_groups').update({ name, name_en, description }).eq('id', editId);
  } else {
    result = await supabase.from('specimen_groups').insert({ name, name_en, description });
  }

  if (result.error) {
    showToast('Lỗi: ' + result.error.message, 'error');
    return;
  }

  closeAllModals();
  showToast(editId ? 'Đã cập nhật nhóm' : 'Đã thêm nhóm mới', 'success');
  loadGroups();
}

window.editGroup = async function(id) {
  const g = state.groups.find(g => g.id === id);
  if (g) openGroupModal(g);
};

window.deleteGroup = async function(id, name) {
  if (!confirm(`Xóa nhóm "${name}"?`)) return;
  const { error } = await supabase.from('specimen_groups').delete().eq('id', id);
  if (error) {
    showToast('Lỗi: ' + error.message, 'error');
  } else {
    showToast('Đã xóa nhóm', 'success');
    loadGroups();
  }
};

// ============================================================
// SITES CRUD
// ============================================================
async function loadSites() {
  const { data } = await supabase
    .from('collection_sites')
    .select('*, specimens(count)')
    .order('name');

  state.sites = data || [];
  renderSitesTable();
}

function renderSitesTable() {
  const tbody = document.getElementById('sites-tbody');

  if (!state.sites.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><span class="material-icons">pin_drop</span><p>Chưa có địa điểm nào</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = state.sites.map(s => `
    <tr>
      <td><strong>${s.name}</strong></td>
      <td>${s.region || '—'}</td>
      <td>${s.latitude != null ? s.latitude.toFixed(4) : '—'}</td>
      <td>${s.longitude != null ? s.longitude.toFixed(4) : '—'}</td>
      <td>${s.specimens?.[0]?.count || 0}</td>
      <td>
        <div class="table-actions">
          <button class="btn-icon" onclick="editSite('${s.id}')" title="Sửa">
            <span class="material-icons">edit</span>
          </button>
          <button class="btn-icon" onclick="deleteSite('${s.id}', '${s.name}')" title="Xóa">
            <span class="material-icons">delete</span>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openSiteModal(site = null) {
  const modal = document.getElementById('inline-modal');
  const title = document.getElementById('inline-modal-title');
  const body = document.getElementById('inline-modal-body');

  title.textContent = site ? 'Sửa địa điểm' : 'Thêm địa điểm';

  body.innerHTML = `
    <div class="form-group" style="margin-bottom:12px;">
      <label for="inline-name">Tên địa điểm *</label>
      <input type="text" id="inline-name" required value="${site?.name || ''}" placeholder="VD: Đá Nam">
    </div>
    <div class="form-group" style="margin-bottom:12px;">
      <label for="inline-region">Khu vực</label>
      <input type="text" id="inline-region" value="${site?.region || ''}" placeholder="VD: Trường Sa">
    </div>
    <div class="form-row" style="margin-bottom:12px;">
      <div class="form-group">
        <label for="inline-lat">Vĩ độ</label>
        <input type="number" step="any" id="inline-lat" value="${site?.latitude || ''}" placeholder="10.1234">
      </div>
      <div class="form-group">
        <label for="inline-lng">Kinh độ</label>
        <input type="number" step="any" id="inline-lng" value="${site?.longitude || ''}" placeholder="114.5678">
      </div>
    </div>
    <input type="hidden" id="inline-edit-id" value="${site?.id || ''}">
  `;

  modal.dataset.type = 'site';
  modal.style.display = 'flex';
}

async function handleSiteSubmit() {
  const name = document.getElementById('inline-name').value.trim();
  const region = document.getElementById('inline-region').value.trim() || null;
  const latitude = parseFloat(document.getElementById('inline-lat').value) || null;
  const longitude = parseFloat(document.getElementById('inline-lng').value) || null;
  const editId = document.getElementById('inline-edit-id').value;

  if (!name) return;

  let result;
  if (editId) {
    result = await supabase.from('collection_sites').update({ name, region, latitude, longitude }).eq('id', editId);
  } else {
    result = await supabase.from('collection_sites').insert({ name, region, latitude, longitude });
  }

  if (result.error) {
    showToast('Lỗi: ' + result.error.message, 'error');
    return;
  }

  closeAllModals();
  showToast(editId ? 'Đã cập nhật' : 'Đã thêm địa điểm mới', 'success');
  loadSites();
}

window.editSite = async function(id) {
  const s = state.sites.find(s => s.id === id);
  if (s) openSiteModal(s);
};

window.deleteSite = async function(id, name) {
  if (!confirm(`Xóa địa điểm "${name}"?`)) return;
  const { error } = await supabase.from('collection_sites').delete().eq('id', id);
  if (error) {
    showToast('Lỗi: ' + error.message, 'error');
  } else {
    showToast('Đã xóa', 'success');
    loadSites();
  }
};

// ============================================================
// CSV IMPORT
// ============================================================
let parsedCSVData = [];

function handleCSVFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    parsedCSVData = parseMuseumCSV(text);
    renderImportPreview();
  };
  reader.readAsText(file, 'UTF-8');
}

function parseMuseumCSV(text) {
  // This CSV has multi-line fields in quotes
  const records = [];
  const lines = text.split('\n');

  let currentRecord = null;
  let inQuote = false;
  let currentField = '';
  let fields = [];
  let headerParsed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!headerParsed) {
      headerParsed = true;
      continue; // skip header
    }

    for (let j = 0; j < line.length; j++) {
      const ch = line[j];

      if (ch === '"') {
        if (inQuote && j + 1 < line.length && line[j + 1] === '"') {
          currentField += '"';
          j++; // skip escaped quote
        } else {
          inQuote = !inQuote;
        }
      } else if (ch === ',' && !inQuote) {
        fields.push(currentField.trim());
        currentField = '';
      } else if (ch === '\r') {
        // skip CR
      } else {
        currentField += ch;
      }
    }

    if (!inQuote) {
      // End of record
      fields.push(currentField.trim());
      currentField = '';

      if (fields.length >= 18 && fields[0]) {
        const info = fields[17] || '';

        // Parse the "Thông tin" field
        const parsed = parseThongTin(info);

        records.push({
          serial_number: parseInt(fields[0]) || null,
          group_name: fields[1] || '',
          specimen_code: fields[2] || '',
          family: fields[3] || '',
          species: fields[4] || '',
          author: fields[5] || '',
          common_name_vi: fields[6] || '',
          site_name: fields[7] || '',
          collection_date: parseViDate(fields[8]),
          longitude_raw: fields[9] || '',
          latitude_raw: fields[10] || '',
          is_cites: fields[11] === '1',
          iucn_status: fields[12] === '1' ? 'listed' : null,
          is_red_book_vn: fields[13] === '1',
          is_exploited: fields[14] === '1',
          is_food_use: fields[15] === '1',
          ...parsed,
        });
      }

      fields = [];
    } else {
      // Multi-line field, add newline
      currentField += '\n';
    }
  }

  return records;
}

function parseThongTin(text) {
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const result = {
    morphology: '',
    ecology: '',
    distribution: '',
    toxicity: '',
    application: '',
    notes: '',
  };

  if (!text) return result;

  // Split by known section headers
  const sections = text.split(/(?=Sinh học|Sinh thái|Phân bố|Độc tố|Ứng dụng|Ghi chú)/gi);

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    if (/^(Sinh học|Sinh thái)/i.test(trimmed)) {
      result.ecology = trimmed.replace(/^Sinh học,?\s*[Ss]inh thái:\s*/i, '').replace(/^Sinh thái:\s*/i, '').trim();
    } else if (/^Phân bố/i.test(trimmed)) {
      result.distribution = trimmed.replace(/^Phân bố:\s*/i, '').trim();
    } else if (/^Độc tố/i.test(trimmed)) {
      result.toxicity = trimmed.replace(/^Độc tố:\s*/i, '').trim();
    } else if (/^Ứng dụng/i.test(trimmed)) {
      result.application = trimmed.replace(/^Ứng dụng:\s*/i, '').trim();
    } else if (/^Ghi chú/i.test(trimmed)) {
      result.notes = trimmed.replace(/^Ghi chú:\s*/i, '').trim();
    } else {
      // First section is usually morphology
      if (!result.morphology) {
        result.morphology = trimmed.replace(/^Màu sắc,?\s*đặc điểm:\s*/i, '').trim();
      }
    }
  }

  // Capitalize first letter of each field
  for (const k of Object.keys(result)) result[k] = cap(result[k]);

  return result;
}

function parseViDate(dateStr) {
  if (!dateStr) return null;
  // Format: DD.MM.YYYY
  const parts = dateStr.split('.');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return null;
}

function parseDMS(dms) {
  if (!dms) return null;
  // Format: 11°23'07.0 or similar
  const match = dms.match(/(\d+)[°](\d+)['](\d+\.?\d*)/);
  if (match) {
    return parseFloat(match[1]) + parseFloat(match[2]) / 60 + parseFloat(match[3]) / 3600;
  }
  return null;
}

function renderImportPreview() {
  const preview = document.getElementById('import-preview');
  const tbody = document.getElementById('import-tbody');
  const count = document.getElementById('import-count');

  preview.style.display = 'block';
  count.textContent = `${parsedCSVData.length} bản ghi`;

  tbody.innerHTML = parsedCSVData.map(r => `
    <tr>
      <td>${r.serial_number || ''}</td>
      <td><span class="code-badge">${r.specimen_code}</span></td>
      <td>${r.group_name}</td>
      <td>${r.family}</td>
      <td><span class="species-name">${r.species}</span></td>
      <td>${r.common_name_vi}</td>
      <td>${r.site_name}</td>
    </tr>
  `).join('');
}

async function executeImport() {
  const logEl = document.getElementById('import-log');
  const statusEl = document.getElementById('import-status');
  const executeBtn = document.getElementById('import-execute');

  logEl.style.display = 'block';
  logEl.innerHTML = '';
  executeBtn.disabled = true;
  statusEl.textContent = 'Đang import...';
  statusEl.className = 'badge badge-info';

  const log = (msg, type = 'info') => {
    logEl.innerHTML += `<div class="log-${type}">${msg}</div>`;
    logEl.scrollTop = logEl.scrollHeight;
  };

  log('Bắt đầu import...');

  // Step 1: Create groups
  const uniqueGroups = [...new Set(parsedCSVData.map(r => r.group_name).filter(Boolean))];
  log(`Tìm thấy ${uniqueGroups.length} nhóm mẫu`);

  const groupMap = {};
  for (const name of uniqueGroups) {
    const { data, error } = await supabase
      .from('specimen_groups')
      .upsert({ name }, { onConflict: 'name' })
      .select()
      .single();

    if (data) {
      groupMap[name] = data.id;
      log(`✓ Nhóm: ${name}`, 'success');
    } else {
      log(`✗ Lỗi tạo nhóm ${name}: ${error?.message}`, 'error');
    }
  }

  // Step 2: Create sites
  const uniqueSites = [...new Map(
    parsedCSVData.map(r => [r.site_name, r])
  ).values()].filter(r => r.site_name);

  log(`Tìm thấy ${uniqueSites.length} địa điểm`);

  const siteMap = {};
  for (const r of uniqueSites) {
    const lat = parseDMS(r.latitude_raw);
    const lng = parseDMS(r.longitude_raw);

    const { data, error } = await supabase
      .from('collection_sites')
      .upsert(
        { name: r.site_name, latitude: lat, longitude: lng },
        { onConflict: 'name,region' }
      )
      .select()
      .single();

    if (data) {
      siteMap[r.site_name] = data.id;
      log(`✓ Địa điểm: ${r.site_name} (${lat?.toFixed(4) || '?'}, ${lng?.toFixed(4) || '?'})`, 'success');
    } else {
      log(`✗ Lỗi địa điểm ${r.site_name}: ${error?.message}`, 'error');
    }
  }

  // Step 3: Insert specimens
  let success = 0;
  let errors = 0;

  for (const r of parsedCSVData) {
    const specimen = {
      serial_number: r.serial_number,
      specimen_code: r.specimen_code,
      group_id: groupMap[r.group_name] || null,
      family: r.family || null,
      species: r.species || null,
      author: r.author || null,
      common_name_vi: r.common_name_vi || null,
      site_id: siteMap[r.site_name] || null,
      collection_date: r.collection_date,
      is_cites: r.is_cites,
      iucn_status: r.iucn_status,
      is_red_book_vn: r.is_red_book_vn,
      is_exploited: r.is_exploited,
      is_food_use: r.is_food_use,
      morphology: r.morphology || null,
      ecology: r.ecology || null,
      distribution: r.distribution || null,
      toxicity: r.toxicity || null,
      application: r.application || null,
      notes: r.notes || null,
    };

    const { error } = await supabase
      .from('specimens')
      .upsert(specimen, { onConflict: 'specimen_code' });

    if (error) {
      log(`✗ ${r.specimen_code}: ${error.message}`, 'error');
      errors++;
    } else {
      log(`✓ ${r.specimen_code} — ${r.species}`, 'success');
      success++;
    }
  }

  log(`\nHoàn tất: ${success} thành công, ${errors} lỗi`);
  statusEl.textContent = `Xong: ${success}/${parsedCSVData.length}`;
  statusEl.className = errors ? 'badge badge-conservation' : 'badge badge-success';
  executeBtn.disabled = false;
}

// ============================================================
// QR CODES
// ============================================================
async function loadQRCodes() {
  const { data } = await supabase
    .from('specimens')
    .select('id, specimen_code, species, common_name_vi')
    .order('serial_number');

  const grid = document.getElementById('qr-grid');

  if (!data?.length) {
    grid.innerHTML = '<div class="empty-state"><span class="material-icons">qr_code</span><p>Import mẫu vật trước để tạo QR</p></div>';
    return;
  }

  grid.innerHTML = data.map(s => `
    <div class="qr-card" data-id="${s.id}" data-code="${s.specimen_code}">
      <canvas id="qr-${s.id}"></canvas>
      <div class="qr-card-info">
        <div class="qr-card-code">${s.specimen_code}</div>
        <div class="qr-card-name">${s.species || s.common_name_vi || ''}</div>
      </div>
      <div class="qr-card-actions">
        <button class="btn btn-sm btn-secondary" onclick="downloadQR('${s.id}', '${s.specimen_code}')">
          <span class="material-icons" style="font-size:14px;">download</span>
        </button>
      </div>
    </div>
  `).join('');

  // Generate QR codes
  for (const s of data) {
    const canvas = document.getElementById(`qr-${s.id}`);
    if (canvas) {
      // QR points to public specimen page
      const url = `${window.location.origin}/specimen/${s.specimen_code}`;
      try {
        await QRCode.toCanvas(canvas, url, {
          width: 160,
          margin: 2,
          color: { dark: '#1a1f35', light: '#ffffff' },
        });
      } catch (err) {
        console.error('QR error:', err);
      }
    }
  }
}

window.downloadQR = function(id, code) {
  const canvas = document.getElementById(`qr-${id}`);
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = `QR_${code}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};

function generateAllQR() {
  loadQRCodes();
  showToast('Đang tạo QR codes...', 'info');
}

function printAllQR() {
  window.print();
}

// ============================================================
// HELPERS
// ============================================================
async function loadGroupsAndSites() {
  if (!state.groups.length) {
    const { data } = await supabase.from('specimen_groups').select('*').order('name');
    state.groups = data || [];
  }
  if (!state.sites.length) {
    const { data } = await supabase.from('collection_sites').select('*').order('name');
    state.sites = data || [];
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="material-icons" style="font-size:18px;">
      ${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}
    </span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function closeAllModals() {
  document.getElementById('specimen-modal').style.display = 'none';
  document.getElementById('inline-modal').style.display = 'none';
}

// ============================================================
// EVENT BINDINGS
// ============================================================
function bindEvents() {
  // Login
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });

  // Sidebar toggle (mobile)
  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('open');
  });

  // Add specimen
  document.getElementById('add-specimen-btn').addEventListener('click', () => {
    openSpecimenModal();
  });

  // Specimen form submit
  document.getElementById('specimen-form').addEventListener('submit', handleSpecimenSubmit);

  // Search & Filters
  let searchTimeout;
  document.getElementById('search-specimens').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.searchQuery = e.target.value;
      state.pagination.page = 1;
      loadSpecimens();
    }, 300);
  });

  document.getElementById('filter-group').addEventListener('change', (e) => {
    state.filterGroup = e.target.value;
    state.pagination.page = 1;
    loadSpecimens();
  });

  document.getElementById('filter-site').addEventListener('change', (e) => {
    state.filterSite = e.target.value;
    state.pagination.page = 1;
    loadSpecimens();
  });

  // Modal close handlers
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', closeAllModals);
  });

  // Groups
  document.getElementById('add-group-btn').addEventListener('click', () => openGroupModal());

  // Sites
  document.getElementById('add-site-btn').addEventListener('click', () => openSiteModal());

  // Inline modal form
  document.getElementById('inline-modal-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const modal = document.getElementById('inline-modal');
    if (modal.dataset.type === 'group') handleGroupSubmit();
    else if (modal.dataset.type === 'site') handleSiteSubmit();
  });

  // CSV Import
  const csvInput = document.getElementById('csv-input');
  const csvDropzone = document.getElementById('csv-dropzone');

  csvInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleCSVFile(e.target.files[0]);
  });

  csvDropzone.addEventListener('click', () => csvInput.click());
  csvDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    csvDropzone.classList.add('dragover');
  });
  csvDropzone.addEventListener('dragleave', () => csvDropzone.classList.remove('dragover'));
  csvDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    csvDropzone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleCSVFile(e.dataTransfer.files[0]);
  });

  document.getElementById('import-execute').addEventListener('click', executeImport);
  document.getElementById('import-cancel').addEventListener('click', () => {
    parsedCSVData = [];
    document.getElementById('import-preview').style.display = 'none';
  });

  // Image upload
  const imageInput = document.getElementById('image-input');
  const imageArea = document.getElementById('image-upload-area');

  imageInput.addEventListener('change', (e) => handleImageFiles(e.target.files));
  imageArea.addEventListener('click', () => imageInput.click());
  imageArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageArea.classList.add('dragover');
  });
  imageArea.addEventListener('dragleave', () => imageArea.classList.remove('dragover'));
  imageArea.addEventListener('drop', (e) => {
    e.preventDefault();
    imageArea.classList.remove('dragover');
    handleImageFiles(e.dataTransfer.files);
  });

  // QR
  document.getElementById('generate-all-qr').addEventListener('click', generateAllQR);
  document.getElementById('print-all-qr').addEventListener('click', printAllQR);
}

function handleImageFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    state.pendingImages.push(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const grid = document.getElementById('image-preview-grid');
      const item = document.createElement('div');
      item.className = `image-preview-item ${state.pendingImages.length === 1 ? 'primary' : ''}`;
      item.innerHTML = `
        <img src="${e.target.result}" alt="preview">
        <button class="remove-image" type="button">×</button>
      `;
      item.querySelector('.remove-image').addEventListener('click', () => {
        const idx = state.pendingImages.indexOf(file);
        if (idx > -1) state.pendingImages.splice(idx, 1);
        item.remove();
      });
      grid.appendChild(item);
    };
    reader.readAsDataURL(file);
  }
}
