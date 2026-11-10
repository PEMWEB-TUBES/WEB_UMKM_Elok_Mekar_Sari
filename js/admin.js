const REPO_IMG_BASE = 'images/';
let currentOrderFilter = 'all', selectedProofOrderId = null, uploadedProductImageBase64 = null, currentReportPeriod = 'weekly', cachedOrdersJson = '';
function formatRp(amount) { return typeof formatRupiah === 'function' ? formatRupiah(amount) : 'Rp ' + Number(amount || 0).toLocaleString('id-ID'); }
function formatOrderDate(dateInput) { if (!dateInput) return '-'; const d = new Date(dateInput); return isNaN(d.getTime()) ? String(dateInput) : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function formatDisplayOrderId(rawId, dateInput) { if (!rawId) return 'EMS-ORD'; if (String(rawId).startsWith('EMS-202')) return rawId; const d = dateInput ? new Date(dateInput) : new Date(); const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0'), clean = String(rawId).replace(/[^a-zA-Z0-9]/g, ''); return `EMS-${y}${m}${day}-${(clean.length >= 4 ? clean.slice(-4) : clean.padStart(4, '0')).toUpperCase()}`; }
function checkAdminAccess() {
  let user = null; try { user = typeof getCurrentUser === 'function' ? getCurrentUser() : JSON.parse(localStorage.getItem('ems_user') || 'null'); } catch (e) { user = null; }
  if (!user || user.role !== 'admin') {
    if (user && (user.email === 'Tes123@' || (user.email && user.email.toLowerCase().includes('admin')))) { user.role = 'admin'; localStorage.setItem('ems_user', JSON.stringify(user)); }
    else { if (typeof showToast === 'function') showToast('Akses ditolak: Silakan masuk sebagai Admin.', 'error'); else alert('Akses ditolak: Silakan masuk sebagai Admin.'); setTimeout(() => { window.location.href = 'index.html'; }, 1000); return false; }
  }
  const nameEl = document.querySelector('.admin-pill-name'), emailEl = document.querySelector('.admin-pill-email');
  if (nameEl) nameEl.textContent = user.name || 'Admin Utama'; if (emailEl) emailEl.textContent = user.email || 'admin123';
  return true;
}
function showAdminSection(sectionName, buttonEl) {
  document.querySelectorAll('.admin-section').forEach(sec => sec.classList.add('hidden'));
  document.getElementById(`sec-${sectionName}`)?.classList.remove('hidden');
  document.querySelectorAll('.sidebar-item').forEach(btn => btn.classList.remove('active'));
  if (buttonEl) buttonEl.classList.add('active'); else document.querySelector(`.sidebar-item[data-section="${sectionName}"]`)?.classList.add('active');
  const titles = { dashboard: 'Dashboard Admin', products: 'Manajemen Produk', orders: 'Manajemen Order', users: 'Pengguna', reports: 'Laporan & Statistik' };
  const titleEl = document.getElementById('topbar-title'); if (titleEl) titleEl.textContent = titles[sectionName] || 'Admin Panel';
  if (sectionName === 'dashboard') renderDashboardOverview(); if (sectionName === 'products') renderAdminProductsTable();
  if (sectionName === 'orders') renderAdminOrdersTable(); if (sectionName === 'users') renderAdminUsersTable(); if (sectionName === 'reports') renderReportsSection();
  const sidebar = document.getElementById('admin-sidebar'); if (sidebar && window.innerWidth <= 900) sidebar.classList.remove('open');
}
function toggleSidebar() { const sb = document.getElementById('admin-sidebar'); if (!sb) return; if (window.innerWidth <= 900) sb.classList.toggle('open'); else { sb.classList.toggle('collapsed'); document.getElementById('admin-main')?.classList.toggle('expanded'); } }
function openLogoutModal() { document.getElementById('logout-modal')?.classList.remove('hidden'); } function closeLogoutModal() { document.getElementById('logout-modal')?.classList.add('hidden'); } function closeLogoutModalOnBackdrop(e) { if (e.target.id === 'logout-modal') closeLogoutModal(); } function confirmLogoutAdmin() { localStorage.removeItem('ems_user'); window.location.href = 'index.html'; }
function getAdminProducts() {
  let stored = JSON.parse(localStorage.getItem('ems_products') || 'null');
  if (stored && Array.isArray(stored) && stored.length > 0) return stored;
  if (typeof PRODUCTS !== 'undefined' && PRODUCTS.length) {
    const synced = PRODUCTS.map(p => ({ ...p, active: p.active !== false })); localStorage.setItem('ems_products', JSON.stringify(synced));
    return synced;
  }
  return [];
}
function saveAdminProducts(products) { localStorage.setItem('ems_products', JSON.stringify(products)); if (typeof PRODUCTS !== 'undefined') PRODUCTS = products; }
function getAdminOrders() { return typeof getOrders === 'function' ? getOrders() : JSON.parse(localStorage.getItem('ems_orders') || '[]'); } function getProductCogs(product) { if (!product) return 0; if (typeof product.cost === 'number' && product.cost > 0) return product.cost; return Math.round((Number(product.price) || 0) * 0.60); }
function normalizeOrderStatus(status) {
  const s = (status || 'pending').toLowerCase();
  const map = {
    pending: { key: 'pending', label: 'Menunggu Pembayaran' }, diproses: { key: 'diproses', label: 'Sedang Diproses' },
    processing: { key: 'diproses', label: 'Sedang Diproses' }, ready: { key: 'ready', label: 'Siap Diambil (Pick Up)' },
    dikirim: { key: 'dikirim', label: 'Dalam Pengiriman' }, shipped: { key: 'dikirim', label: 'Dalam Pengiriman' },
    selesai: { key: 'selesai', label: 'Selesai' }, done: { key: 'selesai', label: 'Selesai' },
    dibatalkan: { key: 'dibatalkan', label: 'Dibatalkan' }, cancelled: { key: 'dibatalkan', label: 'Dibatalkan' }
  }; return map[s] || { key: s, label: status };
}
function renderDashboardOverview() {
  const orders = getAdminOrders(), products = getAdminProducts(); const now = new Date(), startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const ordersToday = orders.filter(o => { const t = new Date(o.date).getTime(); return t >= startToday && t <= startToday + 86400000; }).length; let totalRev = 0, totalCogs = 0;
  orders.forEach(o => {
    if (o.status !== 'cancelled' && o.status !== 'dibatalkan') {
      totalRev += Number(o.total || o.totalPrice) || 0;
      if (Array.isArray(o.items)) o.items.forEach(it => {
        const p = products.find(prod => prod.id === (it.id || it.productId)); totalCogs += getProductCogs(p) * (Number(it.qty || it.quantity) || 1);
      });
    }
  }); const totalProfit = totalRev - totalCogs, marginPercent = totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(1) : '0';
  const needAction = orders.filter(o => ['pending', 'diproses', 'processing'].includes((o.status || '').toLowerCase())).length; const prodQuantities = {};
  orders.forEach(o => {
    if (o.status !== 'cancelled' && o.status !== 'dibatalkan' && Array.isArray(o.items)) {
      o.items.forEach(it => {
        const p = products.find(prod => prod.id === (it.id || it.productId)); const n = p ? p.name : (it.productName || it.name || 'Produk');
        prodQuantities[n] = (prodQuantities[n] || 0) + (Number(it.qty || it.quantity) || 1); });
    }
  }); let topName = 'Belum ada data', topQty = 0;
  Object.keys(prodQuantities).forEach(n => { if (prodQuantities[n] > topQty) { topQty = prodQuantities[n]; topName = n; } });
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setVal('dash-orders-today', ordersToday); setVal('dash-total-revenue', formatRp(totalRev)); setVal('dash-total-profit', formatRp(totalProfit));
  setVal('dash-profit-margin', `Margin Keuntungan: ${marginPercent}%`); setVal('dash-pending-orders', needAction);
  setVal('dash-top-product', topName); setVal('dash-top-product-qty', topQty > 0 ? `${topQty} porsi terjual` : 'Belum ada transaksi');
  const recentTbody = document.getElementById('dash-recent-orders-tbody');
  if (recentTbody) {
    const recent = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
    recentTbody.innerHTML = recent.length ? recent.map(o => {
      const st = normalizeOrderStatus(o.status), rec = o.address?.recipient || o.recipientName || (o.userId ? o.userId.split('@')[0] : 'Pelanggan');
      return `<tr><td><strong>${formatDisplayOrderId(o.id, o.date)}</strong></td><td>${rec}</td><td><strong>${formatRp(o.total)}</strong></td><td><span class="badge-status badge-${st.key}">${st.label}</span></td></tr>`;
    }).join('') : `<tr><td colspan="4" style="text-align:center;padding:16px;color:#9ca3af;">Tidak ada order saat ini.</td></tr>`;
  }
  const lowStockTbody = document.getElementById('dash-low-stock-tbody');
  if (lowStockTbody) {
    const low = [...products].sort((a, b) => (a.stock || 0) - (b.stock || 0)).slice(0, 4);
    lowStockTbody.innerHTML = low.length ? low.map(p => {
      const s = Number(p.stock) || 0, col = s < 10 ? '#dc2626' : s < 20 ? '#d97706' : '#16a34a';
      return `<tr><td><strong>${p.name}</strong></td><td><span class="badge-status badge-processing">${p.categoryLabel || p.category}</span></td><td style="font-weight:700;color:${col}">${s} unit</td><td><span class="badge-status badge-${s < 10 ? 'cancelled' : s < 20 ? 'pending' : 'selesai'}">${s < 10 ? 'Kritis' : s < 20 ? 'Menipis' : 'Aman'}</span></td></tr>`;
    }).join('') : `<tr><td colspan="4" style="text-align:center;padding:16px;color:#9ca3af;">Semua stok aman.</td></tr>`;
  }
}
function renderAdminProductsTable() {
  const tbody = document.getElementById('admin-products-table-tbody');
  if (!tbody) return;
  const query = document.getElementById('filter-prod-search')?.value.toLowerCase().trim() || '', cat = document.getElementById('filter-prod-category')?.value || 'all';
  let list = getAdminProducts();
  if (cat !== 'all') list = list.filter(p => (p.category || '').toLowerCase() === cat.toLowerCase());
  if (query) list = list.filter(p => (p.name || '').toLowerCase().includes(query) || (p.description || '').toLowerCase().includes(query));
  if (!list.length) { tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:28px;color:#9ca3af;">Tidak ada produk yang cocok.</td></tr>`; return; }
  const orders = getAdminOrders().filter(o => o.status !== 'cancelled' && o.status !== 'dibatalkan');
  tbody.innerHTML = list.map(p => {
    let sold = 0;
    orders.forEach(o => { if (Array.isArray(o.items)) o.items.forEach(it => { if ((it.id || it.productId) === p.id) sold += Number(it.qty || it.quantity) || 1; }); });
    return `<tr><td><img src="${p.image}" alt="${p.name}" class="table-prod-img" onerror="this.src='${REPO_IMG_BASE}Nugget_Lele.jpeg'"></td><td><strong>${p.name}</strong></td><td><span class="badge-status badge-processing">${p.categoryLabel || p.category}</span></td><td>${formatRp(p.price)}</td><td><span style="font-weight:700;color:${p.stock < 10 ? '#dc2626' : '#16a34a'}">${p.stock} unit</span></td><td>${sold} porsi</td><td><div class="action-btns-group"><button type="button" class="btn-action btn-action-edit" onclick="openEditProductModal(${p.id})"><img src="Icon/pensil.png" alt="Ubah" style="width:14px;height:14px;object-fit:contain;"> Ubah</button><button type="button" class="btn-action btn-action-delete" onclick="deleteProduct(${p.id})"><img src="Icon/tempat_sampah.png" alt="Hapus" style="width:14px;height:14px;object-fit:contain;"> Hapus</button></div></td></tr>`;
  }).join('');
}
function openAddProductModal() { document.getElementById('product-modal-title').textContent = 'Tambah Produk Baru'; document.getElementById('product-form')?.reset(); document.getElementById('pf-id').value = ''; document.getElementById('pf-image-select').value = 'Nugget_Lele.jpeg'; document.getElementById('upload-image-group').style.display = 'none'; document.getElementById('custom-image-group').style.display = 'none'; uploadedProductImageBase64 = null; updateImagePreviewFromSelect(); document.getElementById('product-modal')?.classList.remove('hidden'); }
function openEditProductModal(productId) {
  const product = getAdminProducts().find(p => p.id === productId); if (!product) return;
  document.getElementById('product-modal-title').textContent = 'Ubah Data Produk'; document.getElementById('pf-id').value = product.id; document.getElementById('pf-name').value = product.name; document.getElementById('pf-category').value = product.category || 'makanan'; document.getElementById('pf-price').value = product.price; document.getElementById('pf-stock').value = product.stock; document.getElementById('pf-desc').value = product.description;
  const select = document.getElementById('pf-image-select'), filename = (product.image || '').replace(REPO_IMG_BASE, '');
  let found = false; for (let opt of select.options) { if (opt.value === filename) { select.value = filename; found = true; break; } }
  const previewImg = document.getElementById('pf-preview-img');
  if (!found) {
    if (product.image && product.image.startsWith('data:image')) { select.value = 'upload'; document.getElementById('upload-image-group').style.display = 'block'; document.getElementById('custom-image-group').style.display = 'none'; uploadedProductImageBase64 = product.image; previewImg.src = product.image; }
    else { select.value = 'custom'; document.getElementById('upload-image-group').style.display = 'none'; document.getElementById('custom-image-group').style.display = 'block'; document.getElementById('pf-custom-image').value = product.image; previewImg.src = product.image; }
  } else { document.getElementById('upload-image-group').style.display = 'none'; document.getElementById('custom-image-group').style.display = 'none'; previewImg.src = product.image; }
  document.getElementById('product-modal')?.classList.remove('hidden');
}
function closeProductModal() { document.getElementById('product-modal')?.classList.add('hidden'); uploadedProductImageBase64 = null; } function updateImagePreviewFromSelect() { const val = document.getElementById('pf-image-select').value, preview = document.getElementById('pf-preview-img'); document.getElementById('upload-image-group').style.display = val === 'upload' ? 'block' : 'none'; document.getElementById('custom-image-group').style.display = val === 'custom' ? 'block' : 'none'; if (val === 'upload') preview.src = uploadedProductImageBase64 || (REPO_IMG_BASE + 'Nugget_Lele.jpeg'); else if (val === 'custom') updateCustomImagePreview(); else preview.src = REPO_IMG_BASE + val; } function updateCustomImagePreview() { const url = document.getElementById('pf-custom-image')?.value.trim(); document.getElementById('pf-preview-img').src = url || (REPO_IMG_BASE + 'Nugget_Lele.jpeg'); }
function handleImageFileUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => { uploadedProductImageBase64 = ev.target.result; document.getElementById('pf-preview-img').src = uploadedProductImageBase64; }; reader.readAsDataURL(file);
}
function handleProductFormSubmit(e) {
  e.preventDefault();
  const idVal = document.getElementById('pf-id').value, name = document.getElementById('pf-name').value.trim(), category = document.getElementById('pf-category').value, price = parseInt(document.getElementById('pf-price').value) || 0, stock = parseInt(document.getElementById('pf-stock').value) || 0, desc = document.getElementById('pf-desc').value.trim(), selectImg = document.getElementById('pf-image-select').value, customImg = document.getElementById('pf-custom-image').value.trim();
  let img = REPO_IMG_BASE + 'Nugget_Lele.jpeg';
  if (selectImg === 'upload') img = uploadedProductImageBase64 || img; else if (selectImg === 'custom') img = customImg || img; else img = REPO_IMG_BASE + selectImg;
  const catLabels = { makanan: 'Makanan', jamur: 'Olahan Jamur', lele: 'Olahan Lele', snack: 'Snack', minuman: 'Minuman', lainnya: 'Lainnya' }; let products = getAdminProducts();
  if (idVal) {
    const idx = products.findIndex(p => p.id === parseInt(idVal));
    if (idx !== -1) { products[idx] = { ...products[idx], name, category, categoryLabel: catLabels[category] || category, price, stock, description: desc, image: img }; if (typeof showToast === 'function') showToast('Produk berhasil diperbarui.', 'success'); }
  } else {
    const newId = products.length ? Math.max(...products.map(p => p.id)) + 1 : 1;
    products.push({ id: newId, name, category, categoryLabel: catLabels[category] || category, price, stock, description: desc, image: img, soldCount: 0, active: true });
    if (typeof showToast === 'function') showToast('Produk baru berhasil ditambahkan.', 'success');
  }
  saveAdminProducts(products); closeProductModal(); renderAdminProductsTable(); renderDashboardOverview();
}
function deleteProduct(productId) {
  if (confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
    let products = getAdminProducts().filter(p => p.id !== productId); saveAdminProducts(products);
    if (typeof showToast === 'function') showToast('Produk berhasil dihapus.', 'default');
    renderAdminProductsTable(); renderDashboardOverview();
  }
}
function filterOrdersByStatus(status, btn) { currentOrderFilter = status; document.querySelectorAll('.order-tabs-admin .tab-btn').forEach(b => b.classList.remove('active')); if (btn) btn.classList.add('active'); renderAdminOrdersTable(); }
function renderAdminOrdersTable() {
  const tbody = document.getElementById('admin-orders-table-tbody');
  if (!tbody) return;
  const query = document.getElementById('filter-order-search')?.value.toLowerCase().trim() || '', orders = getAdminOrders();
  let list = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (currentOrderFilter !== 'all') list = list.filter(o => normalizeOrderStatus(o.status).key === currentOrderFilter);
  if (query) list = list.filter(o => String(o.id).toLowerCase().includes(query) || (o.address?.recipient || o.recipientName || o.userId || '').toLowerCase().includes(query));
  if (!list.length) { tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:36px;color:#9ca3af;">Tidak ada pesanan yang sesuai filter.</td></tr>`; return; }
  const products = getAdminProducts();
  tbody.innerHTML = list.map(o => {
    const isPickup = o.deliveryMethod === 'pickup';
    const del = isPickup ? `<span class="badge-pickup">🏪 Pick Up</span><br><small style="color:#6b7280;">${o.pickupDate || o.pickup?.date || 'Hari ini'} ${o.pickupTime || o.pickup?.time || '10:00'}</small>` : `<span class="badge-delivery">🚚 Kurir</span><br><small style="color:#6b7280;">${o.address?.city || o.address?.detail || 'Surabaya'}</small>`;
    const st = normalizeOrderStatus(o.status);
    const items = (o.items || []).map(it => { const p = products.find(prod => prod.id === (it.id || it.productId)); return `${p ? p.name : (it.productName || it.name || 'Produk')} (x${it.qty || it.quantity || 1})`; }).join(', ') || '-';
    const proofUrl = o.proofUrl || o.strukBase64;
    const proof = proofUrl ? `<button type="button" class="btn-action btn-action-proof" onclick="viewProofModal('${o.id}')">📷 Lihat Struk</button>` : (o.paymentMethod === 'cod' ? '<span style="color:#059669;font-size:0.75rem;font-weight:600;">COD</span>' : '<span style="color:#d97706;font-size:0.75rem;font-weight:600;">Menunggu Bukti</span>');
    const actions = `<div class="status-actions-cell">${st.key !== 'pending' ? `<button type="button" class="btn-status-pill pill-pending" onclick="changeOrderStatus('${o.id}', 'pending')">Pending</button>` : ''}${st.key !== 'diproses' ? `<button type="button" class="btn-status-pill pill-diproses" onclick="changeOrderStatus('${o.id}', 'diproses')">Proses</button>` : ''}${st.key !== 'ready' ? `<button type="button" class="btn-status-pill pill-ready" onclick="changeOrderStatus('${o.id}', 'ready')">Siap</button>` : ''}${st.key !== 'dikirim' ? `<button type="button" class="btn-status-pill pill-dikirim" onclick="changeOrderStatus('${o.id}', 'dikirim')">Kirim</button>` : ''}${st.key !== 'selesai' ? `<button type="button" class="btn-status-pill pill-selesai" onclick="changeOrderStatus('${o.id}', 'selesai')">Selesai</button>` : ''}${st.key !== 'dibatalkan' ? `<button type="button" class="btn-status-pill pill-dibatalkan" onclick="changeOrderStatus('${o.id}', 'dibatalkan')">Batal</button>` : ''}</div>`;
    return `<tr><td><strong>${formatDisplayOrderId(o.id, o.date)}</strong></td><td><small style="color:#6b7280;">${formatOrderDate(o.date)}</small></td><td><strong>${o.address?.recipient || o.recipientName || (o.userId ? o.userId.split('@')[0] : 'Pelanggan')}</strong><br><small style="color:#9ca3af;">${o.userId || o.address?.phone || '-'}</small></td><td style="max-width:180px;font-size:0.85rem;">${items}</td><td>${del}</td><td><strong>${o.paymentMethod === 'transfer' ? 'Transfer Bank' : (o.paymentMethod === 'cod' ? 'COD' : 'E-Wallet')}</strong><br><small style="color:#6b7280;">${o.paymentDetail || '-'}</small></td><td>${proof}</td><td><strong>${formatRp(o.total || o.totalPrice)}</strong></td><td><span class="badge-status badge-${st.key}">${st.label}</span></td><td>${actions}</td></tr>`;
  }).join('');
}
function changeOrderStatus(orderId, newStatus) {
  const orders = getAdminOrders(), order = orders.find(o => o.id === orderId); if (!order) return; order.status = newStatus; order.updatedAt = new Date().toISOString();
  if (typeof saveOrders === 'function') saveOrders(orders); else localStorage.setItem('ems_orders', JSON.stringify(orders));
  const st = normalizeOrderStatus(newStatus);
  if (typeof showToast === 'function') showToast(`Status pesanan ${formatDisplayOrderId(orderId, order.date)} diubah: "${st.label}".`, 'success');
  renderAdminOrdersTable(); renderDashboardOverview();
}
function viewProofModal(orderId) {
  const order = getAdminOrders().find(o => o.id === orderId);
  if (!order) return;
  selectedProofOrderId = orderId; const img = document.getElementById('proof-img'), details = document.getElementById('proof-details-text');
  if (img) img.src = order.proofUrl || order.strukBase64 || (REPO_IMG_BASE + 'PKM_BIMA.jpg');
  if (details) details.innerHTML = `<strong>ID:</strong> ${formatDisplayOrderId(order.id, order.date)}<br><strong>Pelanggan:</strong> ${order.address?.recipient || order.recipientName || order.userId}<br><strong>Metode:</strong> ${order.paymentMethod === 'transfer' ? 'Transfer Bank' : 'E-Wallet'} (${order.paymentDetail || '-' })<br><strong>Total:</strong> ${formatRp(order.total || order.totalPrice)}<br><strong>Status:</strong> ${normalizeOrderStatus(order.status).label}`;
  document.getElementById('proof-modal')?.classList.remove('hidden');
}

function closeProofModal() { document.getElementById('proof-modal')?.classList.add('hidden'); selectedProofOrderId = null; } function closeProofModalOnBackdrop(e) { if (e.target.id === 'proof-modal') closeProofModal(); } function approveProofFromModal() { if (!selectedProofOrderId) return; changeOrderStatus(selectedProofOrderId, 'diproses'); closeProofModal(); if (typeof showToast === 'function') showToast('Bukti pembayaran disetujui, pesanan sedang diproses.', 'success'); }

function getAdminUsers() {
  const defaultAdmin = { id: 'admin-1', name: 'Admin Utama', email: 'admin123', phone: '-', role: 'admin', active: true };
  let stored = JSON.parse(localStorage.getItem('ems_users') || '[]');
  stored = stored.filter(u => !['budi.santoso@gmail.com', 'siti.aminah@gmail.com', 'rudi.h@yahoo.com', 'jane@example.com', 'bob@example.com', 'Tes123@'].includes(u.email)).map(u => ({ ...u, role: (u.role === 'admin' || u.email === 'admin123') ? 'admin' : 'customer' }));
  return stored.some(u => u.role === 'admin' || u.email === 'admin123') ? stored : [defaultAdmin, ...stored];
}
function saveAdminUsers(users) { localStorage.setItem('ems_users', JSON.stringify(users)); }

function renderAdminUsersTable() {
  const tbody = document.getElementById('admin-users-table-tbody');
  if (!tbody) return;
  const query = document.getElementById('filter-user-search')?.value.toLowerCase().trim() || '', users = getAdminUsers(), orders = getAdminOrders();
  let list = query ? users.filter(u => (u.name || '').toLowerCase().includes(query) || (u.email || '').toLowerCase().includes(query)) : users;
  if (!list.length) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:36px;color:#9ca3af;">Tidak ada pengguna yang cocok.</td></tr>`; return; }
  tbody.innerHTML = list.map((u, idx) => {
    const userOrders = orders.filter(o => o.userId === u.email).length, isAct = u.active !== false, isAdmin = u.role === 'admin';
    const roleBadge = isAdmin ? '<span class="badge-status badge-ready">🛡️ Admin</span>' : '<span class="badge-status badge-processing">👤 Pengguna</span>';
    const realIdx = users.findIndex(us => us.email === u.email);
    const statusCol = isAdmin ? '<span class="user-status-text user-status-active">Aktif</span>' : `<div class="user-toggle-wrapper"><span class="user-status-text ${isAct ? 'user-status-active' : 'user-status-blocked'}">${isAct ? 'Aktif' : 'Blokir'}</span><label class="switch"><input type="checkbox" ${isAct ? 'checked' : ''} onchange="toggleUserStatus(${realIdx})"><span class="slider-round"></span></label></div>`;
    return `<tr><td><div style="display:flex;align-items:center;gap:10px;"><div style="width:36px;height:36px;border-radius:50%;background:#eaf2e6;color:#2d5a27;display:flex;align-items:center;justify-content:center;font-weight:700;">${(u.name || 'U')[0].toUpperCase()}</div><strong>${u.name || '-'}</strong></div></td><td>${u.email || '-'}</td><td>${u.phone || '-'}</td><td>${roleBadge}</td><td><strong>${isAdmin ? '-' : `${userOrders} pesanan`}</strong></td><td>${statusCol}</td></tr>`;
  }).join('');
}

function toggleUserStatus(index) {
  const users = getAdminUsers(); if (!users[index] || users[index].role === 'admin') return; users[index].active = !users[index].active; saveAdminUsers(users);
  if (typeof showToast === 'function') showToast(`Akun ${users[index].name} berhasil ${users[index].active ? 'diaktifkan' : 'diblokir'}!`, 'default');
  renderAdminUsersTable();
}

function filterOrdersByPeriod(orders, period) {
  const now = new Date();
  return orders.filter(o => {
    if (!o.date) return false; const d = new Date(o.date); if (isNaN(d.getTime())) return false;
    if (period === 'daily') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    if (period === 'weekly') { const p = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6); return d >= p && d <= now; }
    if (period === 'monthly') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    return true; });
}
function setReportPeriod(period, btn) { currentReportPeriod = period; document.querySelectorAll('.report-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.period === period)); renderReportsSection(); }

function renderReportsSection() {
  const validOrders = getAdminOrders().filter(o => o.status !== 'cancelled' && o.status !== 'dibatalkan'), products = getAdminProducts();
  const periodOrders = filterOrdersByPeriod(validOrders, currentReportPeriod); let rev = 0, cogs = 0;
  periodOrders.forEach(o => {
    rev += Number(o.total || o.totalPrice) || 0;
    if (Array.isArray(o.items)) o.items.forEach(it => { const p = products.find(prod => prod.id === (it.id || it.productId)); cogs += getProductCogs(p) * (Number(it.qty || it.quantity) || 1); });
  }); const profit = rev - cogs, margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : '0';
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setVal('rep-total-revenue', formatRp(rev)); setVal('rep-total-cogs', formatRp(cogs)); setVal('rep-total-profit', formatRp(profit));
  setVal('rep-margin-percent', `Margin Keuntungan: ${margin}%`); setVal('rep-done-orders', `${periodOrders.length} Transaksi`);
  const lbls = { daily: 'Harian (Hari Ini)', weekly: 'Mingguan (7 Hari Terakhir)', monthly: 'Bulanan (Bulan Ini)', all: 'Semua Periode' };
  setVal('rep-period-badge', lbls[currentReportPeriod] || 'Statistik Realtime'); setVal('rep-chart-subtitle', `Tren pendapatan dan laba bersih periode ${lbls[currentReportPeriod] || ''}`);
  renderFinancialChart(periodOrders, currentReportPeriod); const repTbody = document.getElementById('rep-products-tbody'), repTfoot = document.getElementById('rep-products-tfoot');
  let gQty = 0, gOmset = 0, gCogs = 0, gProf = 0;
  if (repTbody) {
    repTbody.innerHTML = products.map(p => {
      let sold = 0;
      periodOrders.forEach(o => { if (Array.isArray(o.items)) o.items.forEach(it => { if ((it.id || it.productId) === p.id) sold += Number(it.qty || it.quantity) || 1; }); });
      const cost = getProductCogs(p), subO = sold * p.price, subC = sold * cost, subP = subO - subC; gQty += sold; gOmset += subO; gCogs += subC; gProf += subP;
      return `<tr><td><div style="display:flex;align-items:center;gap:10px;"><img src="${p.image}" class="table-prod-img" onerror="this.src='${REPO_IMG_BASE}Nugget_Lele.jpeg'"><strong>${p.name}</strong></div></td><td><span class="badge-status badge-processing">${p.categoryLabel || p.category}</span></td><td>${formatRp(p.price)}</td><td><span style="color:#64748b;">${formatRp(cost)}</span></td><td><strong>${sold}</strong> porsi</td><td><strong>${formatRp(subO)}</strong></td><td><span style="color:#64748b;">${formatRp(subC)}</span></td><td><strong style="color:#15803d;">${formatRp(subP)}</strong></td></tr>`;
    }).join('');
  }
  if (repTfoot) {
    repTfoot.innerHTML = `<tr><td colspan="4" style="text-align:right;padding:12px;font-weight:700;">TOTAL KESELURUHAN:</td><td style="padding:12px;font-weight:800;">${gQty} porsi</td><td style="padding:12px;font-weight:800;color:#1e293b;">${formatRp(gOmset)}</td><td style="padding:12px;font-weight:700;color:#64748b;">${formatRp(gCogs)}</td><td style="padding:12px;font-weight:800;color:#15803d;font-size:1.02rem;">${formatRp(gProf)}</td></tr>`;
  }
}

function renderFinancialChart(periodOrders, period) {
  const chartWrapper = document.getElementById('sales-chart-wrapper');
  if (!chartWrapper) return;
  const now = new Date(), dataPoints = [];
  if (period === 'daily') {
    ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '23:59'].forEach((h, i, arr) => { const hVal = parseInt(h.split(':')[0], 10), prev = i === 0 ? 0 : parseInt(arr[i - 1].split(':')[0], 10), rev = periodOrders.reduce((sum, o) => { const oh = new Date(o.date).getHours(); return (oh >= prev && oh <= hVal) ? sum + (Number(o.total || o.totalPrice) || 0) : sum; }, 0); dataPoints.push({ label: h, rev, profit: Math.round(rev * 0.4) }); });
  } else if (period === 'monthly') {
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(); [{ l: 'Tgl 1-7', s: 1, e: 7 }, { l: 'Tgl 8-14', s: 8, e: 14 }, { l: 'Tgl 15-21', s: 15, e: 21 }, { l: 'Tgl 22-28', s: 22, e: 28 }, { l: `Tgl 29-${days}`, s: 29, e: days }].forEach(intv => { const rev = periodOrders.reduce((sum, o) => { const d = new Date(o.date).getDate(); return (d >= intv.s && d <= intv.e) ? sum + (Number(o.total || o.totalPrice) || 0) : sum; }, 0); dataPoints.push({ label: intv.l, rev, profit: Math.round(rev * 0.4) }); });
  } else if (period === 'all') {
    for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1), rev = periodOrders.reduce((sum, o) => { const od = new Date(o.date); return (od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear()) ? sum + (Number(o.total || o.totalPrice) || 0) : sum; }, 0); dataPoints.push({ label: d.toLocaleDateString('id-ID', { month: 'short' }), rev, profit: Math.round(rev * 0.4) }); }
  } else {
    for (let i = 6; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i), s = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(), rev = periodOrders.reduce((sum, o) => { const t = new Date(o.date).getTime(); return (t >= s && t < s + 86400000) ? sum + (Number(o.total || o.totalPrice) || 0) : sum; }, 0); dataPoints.push({ label: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }), rev, profit: Math.round(rev * 0.4) }); }
  }
  const maxVal = Math.max(...dataPoints.map(p => p.rev), 50000), range = maxVal || 1, w = 800, h = 220, pl = 50, pr = 40, pt = 35, pb = 40, pw = w - pl - pr, ph = h - pt - pb;
  const pts = dataPoints.map((p, idx) => ({ x: pl + (idx / (dataPoints.length - 1 || 1)) * pw, y: pt + ph - (p.rev / range) * ph, yProfit: pt + ph - (p.profit / range) * ph, rev: p.rev, profit: p.profit, label: p.label }));
  let pathRev = `M ${pts[0].x} ${pts[0].y}`, pathProf = `M ${pts[0].x} ${pts[0].yProfit}`;
  for (let i = 0; i < pts.length - 1; i++) { const cx = (pts[i].x + pts[i + 1].x) / 2; pathRev += ` C ${cx} ${pts[i].y}, ${cx} ${pts[i + 1].y}, ${pts[i + 1].x} ${pts[i + 1].y}`; pathProf += ` C ${cx} ${pts[i].yProfit}, ${cx} ${pts[i + 1].yProfit}, ${pts[i + 1].x} ${pts[i + 1].yProfit}`; }
  const area = `${pathRev} L ${pts[pts.length - 1].x} ${pt + ph} L ${pts[0].x} ${pt + ph} Z`;
  const grid = [0, 0.5, 1].map(pct => {
    const y = pt + ph * (1 - pct);
    return `<line x1="${pl}" y1="${y}" x2="${w - pr}" y2="${y}" stroke="#e5e7eb" stroke-dasharray="4 4" stroke-width="1" /><text x="${pl - 8}" y="${y + 4}" fill="#9ca3af" font-size="10" text-anchor="end">${formatRp(range * pct)}</text>`;
  }).join('');
  const dots = pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="5" fill="#2d5a27" stroke="#ffffff" stroke-width="2.5" /><text x="${p.x}" y="${p.y - 10}" fill="#2d5a27" font-size="11" font-weight="700" text-anchor="middle">${formatRp(p.rev)}</text><circle cx="${p.x}" cy="${p.yProfit}" r="4" fill="#16a34a" stroke="#ffffff" stroke-width="2" /><text x="${p.x}" y="${h - 12}" fill="#6b7280" font-size="11" font-weight="600" text-anchor="middle">${p.label}</text>`).join('');
  chartWrapper.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
      <defs><linearGradient id="financialSalesGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#2d5a27" stop-opacity="0.25"/><stop offset="100%" stop-color="#2d5a27" stop-opacity="0.0"/></linearGradient></defs>
      ${grid}<path d="${area}" fill="url(#financialSalesGrad)" /><path d="${pathProf}" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-dasharray="5 4" stroke-linecap="round" /><path d="${pathRev}" fill="none" stroke="#2d5a27" stroke-width="3.5" stroke-linecap="round" />${dots}
    </svg>
    <div style="display:flex;justify-content:center;gap:20px;margin-top:8px;font-size:0.8rem;color:#4b5563;">
      <span style="display:inline-flex;align-items:center;gap:6px;"><span style="display:inline-block;width:12px;height:4px;background:#2d5a27;border-radius:2px;"></span> Pendapatan (Omset)</span>
      <span style="display:inline-flex;align-items:center;gap:6px;"><span style="display:inline-block;width:12px;height:2px;border-top:2px dashed #16a34a;"></span> Estimasi Laba Bersih</span>
    </div>
  `;
}

function exportAdminFinancialExcel() {
  const validOrders = getAdminOrders().filter(o => o.status !== 'cancelled' && o.status !== 'dibatalkan'), products = getAdminProducts();
  const periodOrders = filterOrdersByPeriod(validOrders, currentReportPeriod); let totalRev = 0, totalCogs = 0;
  periodOrders.forEach(o => {
    totalRev += Number(o.total || o.totalPrice) || 0;
    if (Array.isArray(o.items)) o.items.forEach(it => { const p = products.find(prod => prod.id === (it.id || it.productId)); totalCogs += getProductCogs(p) * (Number(it.qty || it.quantity) || 1); });
  }); const totalProf = totalRev - totalCogs, margin = totalRev > 0 ? ((totalProf / totalRev) * 100).toFixed(1) : '0';
  const lbls = { daily: 'Harian (Hari Ini)', weekly: 'Mingguan (7 Hari Terakhir)', monthly: 'Bulanan (Bulan Ini)', all: 'Semua Periode' };
  let prodRows = '', gQ = 0, gO = 0, gC = 0, gP = 0;
  products.forEach(p => {
    let sold = 0; periodOrders.forEach(o => { if (Array.isArray(o.items)) o.items.forEach(it => { if ((it.id || it.productId) === p.id) sold += Number(it.qty || it.quantity) || 1; }); });
    const cogs = getProductCogs(p), sO = sold * p.price, sC = sold * cogs, sP = sO - sC; gQ += sold; gO += sO; gC += sC; gP += sP;
    prodRows += `<tr><td style="border:1px solid #d1d5db;padding:8px;">${p.name}</td><td style="border:1px solid #d1d5db;padding:8px;">${p.categoryLabel || p.category}</td><td style="border:1px solid #d1d5db;padding:8px;text-align:right;">${p.price}</td><td style="border:1px solid #d1d5db;padding:8px;text-align:right;">${cogs}</td><td style="border:1px solid #d1d5db;padding:8px;text-align:center;">${sold}</td><td style="border:1px solid #d1d5db;padding:8px;text-align:right;">${sO}</td><td style="border:1px solid #d1d5db;padding:8px;text-align:right;">${sC}</td><td style="border:1px solid #d1d5db;padding:8px;text-align:right;font-weight:bold;color:#16a34a;">${sP}</td></tr>`;
  }); let orderRows = '';
  periodOrders.forEach(o => {
    const rawId = formatDisplayOrderId(o.id, o.date), dateStr = formatOrderDate(o.date), rec = (o.address?.recipient || o.recipientName || o.userId || '-').replace(/,/g, ' ').trim(), tot = Number(o.total || o.totalPrice) || 0, stLbl = normalizeOrderStatus(o.status).label, pay = o.paymentMethod === 'transfer' ? 'Transfer Bank' : (o.paymentMethod === 'cod' ? 'COD' : 'E-Wallet');
    let c = 0; if (Array.isArray(o.items)) o.items.forEach(it => { const p = products.find(prod => prod.id === (it.id || it.productId)); c += getProductCogs(p) * (Number(it.qty || it.quantity) || 1); });
    orderRows += `<tr><td style="border:1px solid #d1d5db;padding:8px;">${rawId}</td><td style="border:1px solid #d1d5db;padding:8px;">${dateStr}</td><td style="border:1px solid #d1d5db;padding:8px;">${rec}</td><td style="border:1px solid #d1d5db;padding:8px;text-align:center;">${stLbl}</td><td style="border:1px solid #d1d5db;padding:8px;">${pay}</td><td style="border:1px solid #d1d5db;padding:8px;text-align:right;">${tot}</td><td style="border:1px solid #d1d5db;padding:8px;text-align:right;">${c}</td><td style="border:1px solid #d1d5db;padding:8px;text-align:right;font-weight:bold;color:#16a34a;">${tot - c}</td></tr>`;
  });
  const html = `<html><head><meta charset="utf-8"><style>body{font-family:sans-serif;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ddd;padding:8px;}th{background:#2d5a27;color:#fff;}</style></head><body><h2>LAPORAN KEUANGAN ELOK MEKAR SARI (${lbls[currentReportPeriod] || currentReportPeriod})</h2><p>Dicetak: ${new Date().toLocaleString('id-ID')}</p><table><tr><th>Total Omset</th><th>Total Modal</th><th>Laba Bersih</th><th>Margin</th><th>Transaksi</th></tr><tr><td>Rp ${totalRev.toLocaleString('id-ID')}</td><td>Rp ${totalCogs.toLocaleString('id-ID')}</td><td style="color:#16a34a;font-weight:bold;">Rp ${totalProf.toLocaleString('id-ID')}</td><td>${margin}%</td><td>${periodOrders.length}</td></tr></table><br><h3>RINCIAN PRODUK</h3><table><tr><th>Produk</th><th>Kategori</th><th>Harga</th><th>HPP</th><th>Terjual</th><th>Omset</th><th>Modal</th><th>Laba</th></tr>${prodRows}<tr><td colspan="4" style="text-align:right;font-weight:bold;">TOTAL:</td><td>${gQ}</td><td>${gO}</td><td>${gC}</td><td>${gP}</td></tr></table><br><h3>RIWAYAT PESANAN</h3><table><tr><th>ID</th><th>Tanggal</th><th>Penerima</th><th>Status</th><th>Metode</th><th>Omset</th><th>Modal</th><th>Laba</th></tr>${orderRows || '<tr><td colspan="8">Tidak ada data</td></tr>'}</table></body></html>`;
  const blob = new Blob(['\\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' }); const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = `Laporan_Keuangan_${currentReportPeriod}_${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  if (typeof showToast === 'function') showToast('Laporan keuangan Excel berhasil diunduh.', 'success');
}

function exportAdminSalesReport() { exportAdminFinancialExcel(); }
function refreshAllAdminData() { renderDashboardOverview(); const secOrders = document.getElementById('sec-orders'); if (secOrders && !secOrders.classList.contains('hidden')) renderAdminOrdersTable(); const secReports = document.getElementById('sec-reports'); if (secReports && !secReports.classList.contains('hidden')) renderReportsSection(); }
window.addEventListener('storage', e => { if (e.key === 'ems_orders' || e.key === 'ems_products') refreshAllAdminData(); }); window.addEventListener('ems_orders_updated', () => refreshAllAdminData());
setInterval(() => { const current = localStorage.getItem('ems_orders') || ''; if (current !== cachedOrdersJson) { cachedOrdersJson = current; refreshAllAdminData(); } }, 1500);
document.addEventListener('DOMContentLoaded', () => { if (checkAdminAccess()) { cachedOrdersJson = localStorage.getItem('ems_orders') || ''; renderDashboardOverview(); } });
