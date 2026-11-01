// ========================================
// ADMIN.JS - Admin Panel Logic & Management
// Referensi: Flutter Admin_Page.dart & Services
// ========================================

const REPO_IMG_BASE = 'images/';

let currentOrderFilter = 'all';
let selectedProofOrderId = null;
let uploadedProductImageBase64 = null;

// Helper format rupiah with fallback
function formatRp(amount) {
  if (typeof formatRupiah === 'function') {
    return formatRupiah(amount);
  }
  return 'Rp ' + Number(amount || 0).toLocaleString('id-ID');
}

// Helper format date string
function formatOrderDate(dateInput) {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Generate standardized order ID format: EMS-YYYYMMDD-XXXX
function formatDisplayOrderId(rawId, dateInput) {
  if (!rawId) return 'EMS-ORD';
  if (String(rawId).startsWith('EMS-202')) return rawId;
  const d = dateInput ? new Date(dateInput) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const cleanId = String(rawId).replace(/[^a-zA-Z0-9]/g, '');
  const short = (cleanId.length >= 4 ? cleanId.slice(-4) : cleanId.padStart(4, '0')).toUpperCase();
  return `EMS-${year}${month}${day}-${short}`;
}

// ========================================
// 1. AUTHENTICATION & ACCESS CONTROL
// ========================================

function checkAdminAccess() {
  let user = null;
  try {
    user = typeof getCurrentUser === 'function' ? getCurrentUser() : JSON.parse(localStorage.getItem('ems_user') || 'null');
  } catch (e) {
    user = null;
  }

  if (!user || user.role !== 'admin') {
    // If not marked admin, check if credentials match default admin
    if (user && (user.email === 'Tes123@' || (user.email && user.email.toLowerCase().includes('admin')))) {
      user.role = 'admin';
      localStorage.setItem('ems_user', JSON.stringify(user));
    } else {
      if (typeof showToast === 'function') {
        showToast('Akses ditolak: Silakan masuk sebagai Admin.', 'error');
      } else {
        alert('Akses ditolak: Silakan masuk sebagai Admin.');
      }
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
      return false;
    }
  }

  // Update profile pill in topbar
  const nameEl = document.querySelector('.admin-pill-name');
  const emailEl = document.querySelector('.admin-pill-email');
  if (nameEl) nameEl.textContent = user.name || 'Admin Utama';
  if (emailEl) emailEl.textContent = user.email || 'admin123';

  return true;
}

// ========================================
// 2. SIDEBAR & SECTION NAVIGATION
// ========================================

function showAdminSection(sectionName, buttonEl) {
  // Hide all sections
  document.querySelectorAll('.admin-section').forEach(sec => sec.classList.add('hidden'));

  // Show target section
  const targetSec = document.getElementById(`sec-${sectionName}`);
  if (targetSec) targetSec.classList.remove('hidden');

  // Update sidebar active buttons
  document.querySelectorAll('.sidebar-item').forEach(btn => btn.classList.remove('active'));
  
  if (buttonEl) {
    buttonEl.classList.add('active');
  } else {
    const matchingBtn = document.querySelector(`.sidebar-item[data-section="${sectionName}"]`);
    if (matchingBtn) matchingBtn.classList.add('active');
  }

  // Update Topbar Title (aligned with Flutter AdminPage titles)
  const titles = {
    dashboard: 'Dashboard Admin',
    products: 'Manajemen Produk',
    orders: 'Manajemen Order',
    users: 'Pengguna',
    reports: 'Laporan & Statistik'
  };
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = titles[sectionName] || 'Admin Panel';

  // Trigger section data refreshes
  if (sectionName === 'dashboard') renderDashboardOverview();
  if (sectionName === 'products') renderAdminProductsTable();
  if (sectionName === 'orders') renderAdminOrdersTable();
  if (sectionName === 'users') renderAdminUsersTable();
  if (sectionName === 'reports') renderReportsSection();

  // Close mobile sidebar if open
  const sidebar = document.getElementById('admin-sidebar');
  if (sidebar && window.innerWidth <= 900) {
    sidebar.classList.remove('open');
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('admin-sidebar');
  if (!sidebar) return;
  if (window.innerWidth <= 900) {
    sidebar.classList.toggle('open');
  } else {
    sidebar.classList.toggle('collapsed');
    document.getElementById('admin-main')?.classList.toggle('expanded');
  }
}

// Logout Modal Handlers
function openLogoutModal() {
  const modal = document.getElementById('logout-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeLogoutModal() {
  const modal = document.getElementById('logout-modal');
  if (modal) modal.classList.add('hidden');
}

function closeLogoutModalOnBackdrop(event) {
  if (event.target.id === 'logout-modal') {
    closeLogoutModal();
  }
}

function confirmLogoutAdmin() {
  localStorage.removeItem('ems_user');
  window.location.href = 'index.html';
}

// ========================================
// 3. DASHBOARD OVERVIEW (Flutter DashboardTab)
// ========================================

function renderDashboardOverview() {
  const orders = getAdminOrders();
  const products = getAdminProducts();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 86400000;

  // 1. Total order hari ini
  const ordersTodayCount = orders.filter(o => {
    const t = new Date(o.date).getTime();
    return t >= startOfToday && t <= endOfToday;
  }).length;

  // 2. Total pendapatan (dari order yang tidak dibatalkan)
  const totalRev = orders.reduce((sum, o) => {
    const isCancelled = o.status === 'cancelled' || o.status === 'dibatalkan';
    return isCancelled ? sum : sum + (Number(o.total) || 0);
  }, 0);

  // 3. Pesanan Perlu Ditangani (status pending atau diproses)
  const needActionOrders = orders.filter(o => {
    const s = (o.status || '').toLowerCase();
    return s === 'pending' || s === 'diproses' || s === 'processing';
  });
  const needActionCount = needActionOrders.length;

  // 4. Produk Terlaris (akumulasi qty dari pesanan tidak dibatalkan)
  const prodQuantities = {};
  orders.forEach(o => {
    const isCancelled = o.status === 'cancelled' || o.status === 'dibatalkan';
    if (!isCancelled && Array.isArray(o.items)) {
      o.items.forEach(it => {
        const prodId = it.id || it.productId;
        const prod = products.find(p => p.id === prodId);
        const name = prod ? prod.name : (it.productName || it.name || 'Produk');
        const qty = Number(it.qty || it.quantity) || 1;
        prodQuantities[name] = (prodQuantities[name] || 0) + qty;
      });
    }
  });

  let topProductName = 'Belum ada';
  let topProductQty = 0;
  Object.keys(prodQuantities).forEach(name => {
    if (prodQuantities[name] > topProductQty) {
      topProductQty = prodQuantities[name];
      topProductName = name;
    }
  });

  // Jika belum ada order, tampilkan state kosong
  if (topProductQty === 0) {
    topProductName = 'Belum ada data';
  }

  // Update Summary DOM Cards
  const ordTodayEl = document.getElementById('dash-orders-today');
  const revEl = document.getElementById('dash-total-revenue');
  const pendOrdEl = document.getElementById('dash-pending-orders');
  const topProdEl = document.getElementById('dash-top-product');
  const topProdQtyEl = document.getElementById('dash-top-product-qty');

  if (ordTodayEl) ordTodayEl.textContent = ordersTodayCount;
  if (revEl) revEl.textContent = formatRp(totalRev);
  if (pendOrdEl) pendOrdEl.textContent = needActionCount;
  if (topProdEl) topProdEl.textContent = topProductName;
  if (topProdQtyEl) topProdQtyEl.textContent = topProductQty > 0 ? `${topProductQty} porsi terjual` : 'Belum ada transaksi';

  // Quick Table 1: Order Terbaru (Recent Orders - top 4)
  const recentOrdersTbody = document.getElementById('dash-recent-orders-tbody');
  if (recentOrdersTbody) {
    const sortedOrders = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = sortedOrders.slice(0, 4);

    if (recent.length === 0) {
      recentOrdersTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:16px;color:#9ca3af;">Tidak ada order saat ini.</td></tr>`;
    } else {
      recentOrdersTbody.innerHTML = recent.map(o => {
        const displayId = formatDisplayOrderId(o.id, o.date);
        const recipient = o.address?.recipient || o.recipientName || (o.userId ? o.userId.split('@')[0] : 'Pelanggan');
        const st = normalizeOrderStatus(o.status);
        return `
          <tr>
            <td><strong>${displayId}</strong></td>
            <td>${recipient}</td>
            <td><strong>${formatRp(o.total)}</strong></td>
            <td><span class="badge-status badge-${st.key}">${st.label}</span></td>
          </tr>
        `;
      }).join('');
    }
  }

  // Quick Table 2: Stok Produk Menipis (stok < 15)
  const dashLowStockTbody = document.getElementById('dash-low-stock-tbody');
  if (dashLowStockTbody) {
    const lowStock = [...products]
      .sort((a, b) => (a.stock || 0) - (b.stock || 0))
      .slice(0, 4);

    if (lowStock.length === 0) {
      dashLowStockTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:16px;color:#9ca3af;">Semua stok tersedia dengan baik.</td></tr>`;
    } else {
      dashLowStockTbody.innerHTML = lowStock.map(p => {
        const stockNum = Number(p.stock) || 0;
        const stockColor = stockNum < 10 ? '#dc2626' : stockNum < 20 ? '#d97706' : '#16a34a';
        const statusLabel = stockNum < 10 ? 'Kritis' : stockNum < 20 ? 'Menipis' : 'Aman';
        const statusKey = stockNum < 10 ? 'cancelled' : stockNum < 20 ? 'pending' : 'selesai';
        return `
          <tr>
            <td><strong>${p.name}</strong></td>
            <td><span class="badge-status badge-processing">${p.categoryLabel || p.category}</span></td>
            <td style="font-weight:700;color:${stockColor}">${stockNum} unit</td>
            <td><span class="badge-status badge-${statusKey}">${statusLabel}</span></td>
          </tr>
        `;
      }).join('');
    }
  }

}

// ========================================
// 4. PRODUCT MANAGEMENT (CRUD - ProductService)
// ========================================

function getAdminProducts() {
  // Ambil langsung dari ems_products yang sama dengan page customer
  let stored = JSON.parse(localStorage.getItem('ems_products') || 'null');
  if (stored && Array.isArray(stored) && stored.length > 0) {
    return stored;
  }
  // Sinkronkan dari PRODUCTS global (dari js/app.js)
  if (typeof PRODUCTS !== 'undefined' && PRODUCTS.length) {
    const synced = PRODUCTS.map(p => ({ ...p, active: p.active !== false }));
    localStorage.setItem('ems_products', JSON.stringify(synced));
    return synced;
  }
  return [];
}

function saveAdminProducts(products) {
  localStorage.setItem('ems_products', JSON.stringify(products));
  if (typeof PRODUCTS !== 'undefined') {
    PRODUCTS = products;
  }
}

function renderAdminProductsTable() {
  const tbody = document.getElementById('admin-products-table-tbody');
  if (!tbody) return;

  const searchInput = document.getElementById('filter-prod-search');
  const catSelect = document.getElementById('filter-prod-category');

  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const cat = catSelect ? catSelect.value : 'all';

  let list = getAdminProducts();

  if (cat !== 'all') {
    list = list.filter(p => (p.category || '').toLowerCase() === cat.toLowerCase());
  }
  if (query) {
    list = list.filter(p => 
      (p.name || '').toLowerCase().includes(query) || 
      (p.description || '').toLowerCase().includes(query)
    );
  }

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:28px;color:#9ca3af;">Tidak ada produk yang cocok dengan pencarian.</td></tr>`;
    return;
  }

  const orders = getAdminOrders();
  const validOrders = orders.filter(o => o.status !== 'cancelled' && o.status !== 'dibatalkan');

  tbody.innerHTML = list.map(p => {
    let realSoldCount = 0;
    validOrders.forEach(o => {
      if (Array.isArray(o.items)) {
        o.items.forEach(it => {
          if ((it.id || it.productId) === p.id) {
            realSoldCount += Number(it.qty || it.quantity) || 1;
          }
        });
      }
    });

    return `
    <tr>
      <td>
        <img src="${p.image}" alt="${p.name}" class="table-prod-img" onerror="this.src='${REPO_IMG_BASE}Nugget_Lele.jpeg'">
      </td>
      <td><strong>${p.name}</strong></td>
      <td><span class="badge-status badge-processing">${p.categoryLabel || p.category}</span></td>
      <td>${formatRp(p.price)}</td>
      <td><span style="font-weight:700;color:${p.stock < 10 ? '#dc2626' : '#16a34a'}">${p.stock} unit</span></td>
      <td>${realSoldCount} porsi</td>
      <td>
        <div class="action-btns-group">
          <button type="button" class="btn-action btn-action-edit" onclick="openEditProductModal(${p.id})">
            <img src="Icon/pensil.png" alt="Ubah" style="width:14px;height:14px;object-fit:contain;"> Ubah
          </button>
          <button type="button" class="btn-action btn-action-delete" onclick="deleteProduct(${p.id})">
            <img src="Icon/tempat_sampah.png" alt="Hapus" style="width:14px;height:14px;object-fit:contain;"> Hapus
          </button>
        </div>
      </td>
    </tr>
  `;
  }).join('');
}

function openAddProductModal() {
  const modal = document.getElementById('product-modal');
  const title = document.getElementById('product-modal-title');
  const form = document.getElementById('product-form');

  if (title) title.textContent = 'Tambah Produk Baru';
  if (form) form.reset();

  document.getElementById('pf-id').value = '';
  document.getElementById('pf-image-select').value = 'Nugget_Lele.jpeg';
  document.getElementById('upload-image-group').style.display = 'none';
  document.getElementById('custom-image-group').style.display = 'none';
  uploadedProductImageBase64 = null;

  updateImagePreviewFromSelect();

  if (modal) modal.classList.remove('hidden');
}

function openEditProductModal(productId) {
  const products = getAdminProducts();
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const modal = document.getElementById('product-modal');
  const title = document.getElementById('product-modal-title');

  if (title) title.textContent = 'Ubah Data Produk';

  document.getElementById('pf-id').value = product.id;
  document.getElementById('pf-name').value = product.name;
  document.getElementById('pf-category').value = product.category || 'makanan';
  document.getElementById('pf-price').value = product.price;
  document.getElementById('pf-stock').value = product.stock;
  document.getElementById('pf-desc').value = product.description;

  const select = document.getElementById('pf-image-select');
  const uploadGroup = document.getElementById('upload-image-group');
  const customGroup = document.getElementById('custom-image-group');
  const customInput = document.getElementById('pf-custom-image');
  const previewImg = document.getElementById('pf-preview-img');

  const filename = (product.image || '').replace(REPO_IMG_BASE, '');
  let found = false;
  for (let opt of select.options) {
    if (opt.value === filename) {
      select.value = filename;
      found = true;
      break;
    }
  }

  if (!found) {
    if (product.image && product.image.startsWith('data:image')) {
      select.value = 'upload';
      uploadGroup.style.display = 'block';
      customGroup.style.display = 'none';
      uploadedProductImageBase64 = product.image;
      previewImg.src = product.image;
    } else {
      select.value = 'custom';
      uploadGroup.style.display = 'none';
      customGroup.style.display = 'block';
      customInput.value = product.image;
      previewImg.src = product.image;
    }
  } else {
    uploadGroup.style.display = 'none';
    customGroup.style.display = 'none';
    previewImg.src = product.image;
  }

  if (modal) modal.classList.remove('hidden');
}

function closeProductModal() {
  const modal = document.getElementById('product-modal');
  if (modal) modal.classList.add('hidden');
  uploadedProductImageBase64 = null;
}

function updateImagePreviewFromSelect() {
  const select = document.getElementById('pf-image-select');
  const uploadGroup = document.getElementById('upload-image-group');
  const customGroup = document.getElementById('custom-image-group');
  const previewImg = document.getElementById('pf-preview-img');

  if (select.value === 'upload') {
    uploadGroup.style.display = 'block';
    customGroup.style.display = 'none';
    previewImg.src = uploadedProductImageBase64 || (REPO_IMG_BASE + 'Nugget_Lele.jpeg');
  } else if (select.value === 'custom') {
    uploadGroup.style.display = 'none';
    customGroup.style.display = 'block';
    updateCustomImagePreview();
  } else {
    uploadGroup.style.display = 'none';
    customGroup.style.display = 'none';
    previewImg.src = REPO_IMG_BASE + select.value;
  }
}

function updateCustomImagePreview() {
  const customInput = document.getElementById('pf-custom-image');
  const previewImg = document.getElementById('pf-preview-img');
  if (customInput && previewImg) {
    previewImg.src = customInput.value || (REPO_IMG_BASE + 'Nugget_Lele.jpeg');
  }
}

function handleImageFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    uploadedProductImageBase64 = e.target.result;
    const previewImg = document.getElementById('pf-preview-img');
    if (previewImg) previewImg.src = uploadedProductImageBase64;
  };
  reader.readAsDataURL(file);
}

function handleProductFormSubmit(event) {
  event.preventDefault();

  const idVal = document.getElementById('pf-id').value;
  const name = document.getElementById('pf-name').value.trim();
  const category = document.getElementById('pf-category').value;
  const price = parseInt(document.getElementById('pf-price').value) || 0;
  const stock = parseInt(document.getElementById('pf-stock').value) || 0;
  const desc = document.getElementById('pf-desc').value.trim();
  const selectImg = document.getElementById('pf-image-select').value;
  const customImg = document.getElementById('pf-custom-image').value.trim();

  let finalImageUrl = REPO_IMG_BASE + 'Nugget_Lele.jpeg';
  if (selectImg === 'upload') {
    finalImageUrl = uploadedProductImageBase64 || (REPO_IMG_BASE + 'Nugget_Lele.jpeg');
  } else if (selectImg === 'custom') {
    finalImageUrl = customImg || (REPO_IMG_BASE + 'Nugget_Lele.jpeg');
  } else {
    finalImageUrl = REPO_IMG_BASE + selectImg;
  }

  const categoryLabels = {
    makanan: 'Makanan',
    jamur: 'Olahan Jamur',
    lele: 'Olahan Lele',
    snack: 'Snack',
    minuman: 'Minuman',
    lainnya: 'Lainnya'
  };

  let products = getAdminProducts();

  if (idVal) {
    // Edit existing product
    const idx = products.findIndex(p => p.id === parseInt(idVal));
    if (idx !== -1) {
      products[idx] = {
        ...products[idx],
        name,
        category,
        categoryLabel: categoryLabels[category] || category,
        price,
        stock,
        description: desc,
        image: finalImageUrl
      };
      if (typeof showToast === 'function') showToast('Produk berhasil diperbarui! ✨', 'success');
    }
  } else {
    // Add new product
    const newId = products.length ? Math.max(...products.map(p => p.id)) + 1 : 1;
    const newProduct = {
      id: newId,
      name,
      category,
      categoryLabel: categoryLabels[category] || category,
      price,
      stock,
      description: desc,
      image: finalImageUrl,
      soldCount: 0,
      active: true
    };
    products.push(newProduct);
    if (typeof showToast === 'function') showToast('Produk baru berhasil ditambahkan! 🎉', 'success');
  }

  saveAdminProducts(products);
  closeProductModal();
  renderAdminProductsTable();
  renderDashboardOverview();
}

function deleteProduct(productId) {
  if (confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
    let products = getAdminProducts();
    products = products.filter(p => p.id !== productId);
    saveAdminProducts(products);
    if (typeof showToast === 'function') showToast('Produk berhasil dihapus.', 'default');
    renderAdminProductsTable();
    renderDashboardOverview();
  }
}

// ========================================
// 5. ORDER MANAGEMENT (Flutter OrderManagementTab)
// ========================================

function normalizeOrderStatus(status) {
  const s = (status || 'pending').toLowerCase();
  switch (s) {
    case 'pending':
      return { key: 'pending', label: 'Menunggu Pembayaran' };
    case 'diproses':
    case 'processing':
      return { key: 'diproses', label: 'Sedang Diproses' };
    case 'ready':
      return { key: 'ready', label: 'Siap Diambil (Pick Up)' };
    case 'dikirim':
    case 'shipped':
      return { key: 'dikirim', label: 'Dalam Pengiriman' };
    case 'selesai':
    case 'done':
      return { key: 'selesai', label: 'Selesai' };
    case 'dibatalkan':
    case 'cancelled':
      return { key: 'dibatalkan', label: 'Dibatalkan' };
    default:
      return { key: s, label: status };
  }
}

function getAdminOrders() {
  if (typeof getOrders === 'function') {
    return getOrders();
  }
  return JSON.parse(localStorage.getItem('ems_orders') || '[]');
}

function filterOrdersByStatus(status, btn) {
  currentOrderFilter = status;
  document.querySelectorAll('.order-tabs-admin .tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderAdminOrdersTable();
}

function renderAdminOrdersTable() {
  const tbody = document.getElementById('admin-orders-table-tbody');
  if (!tbody) return;

  const searchInput = document.getElementById('filter-order-search');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const orders = getAdminOrders();
  let list = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Filter status tab
  if (currentOrderFilter !== 'all') {
    list = list.filter(o => {
      const st = normalizeOrderStatus(o.status).key;
      return st === currentOrderFilter;
    });
  }

  // Filter search query
  if (query) {
    list = list.filter(o => {
      const idStr = String(o.id).toLowerCase();
      const rec = (o.address?.recipient || o.recipientName || o.userId || '').toLowerCase();
      return idStr.includes(query) || rec.includes(query);
    });
  }

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:36px;color:#9ca3af;">
      <div style="font-size:2rem;margin-bottom:8px;">📦</div>
      ${query || currentOrderFilter !== 'all' ? 'Tidak ada pesanan dengan kriteria ini.' : 'Belum ada pesanan. Pesanan akan muncul di sini setelah customer melakukan checkout.'}
    </td></tr>`;
    return;
  }

  const products = getAdminProducts();

  tbody.innerHTML = list.map(o => {
    const displayId = formatDisplayOrderId(o.id, o.date);
    const isPickup = o.deliveryMethod === 'pickup';
    const deliveryBadge = isPickup 
      ? `<span class="badge-pickup">🏪 Pick Up</span><br><small style="color:#6b7280;">${o.pickupDate || o.pickup?.date || 'Hari ini'} ${o.pickupTime || o.pickup?.time || '10:00'}</small>`
      : `<span class="badge-delivery">🚚 Kurir</span><br><small style="color:#6b7280;">${o.address?.city || o.address?.detail || 'Surabaya'}</small>`;

    const st = normalizeOrderStatus(o.status);

    // Items list
    const itemsText = (o.items || []).map(it => {
      const prodId = it.id || it.productId;
      const p = products.find(prod => prod.id === prodId);
      const name = p ? p.name : (it.productName || it.name || 'Produk');
      return `${name} (x${it.qty || it.quantity || 1})`;
    }).join(', ') || '-';

    // Proof cell
    const proofImgUrl = o.proofUrl || o.strukBase64;
    let proofCell = '';
    if (proofImgUrl) {
      proofCell = `
        <div style="display:flex;flex-direction:column;gap:4px;">
          <button type="button" class="btn-action btn-action-proof" onclick="viewProofModal('${o.id}')">
            📷 Lihat Struk
          </button>
          <small style="color:#6b7280;font-size:0.7rem;">Ketuk perbesar</small>
        </div>
      `;
    } else if (o.paymentMethod === 'cod') {
      proofCell = '<span style="color:#059669;font-size:0.75rem;font-weight:600;">💵 Bayar di Tempat (COD)</span>';
    } else {
      proofCell = '<span style="color:#d97706;font-size:0.75rem;font-weight:600;">⏳ Menunggu Bukti</span>';
    }

    return `
      <tr>
        <td><strong>${displayId}</strong></td>
        <td><small style="color:#6b7280;">${formatOrderDate(o.date)}</small></td>
        <td>
          <strong>${o.address?.recipient || o.recipientName || (o.userId ? o.userId.split('@')[0] : 'Pelanggan')}</strong><br>
          <small style="color:#9ca3af;">${o.userId || o.address?.phone || '-'}</small>
        </td>
        <td style="max-width: 180px;font-size:0.85rem;">${itemsText}</td>
        <td>${deliveryBadge}</td>
        <td>
          <strong>${o.paymentMethod === 'transfer' ? 'Transfer Bank' : (o.paymentMethod === 'cod' ? 'COD' : 'E-Wallet')}</strong><br>
          <small style="color:#6b7280;">${o.paymentDetail || '-'}</small>
        </td>
        <td>${proofCell}</td>
        <td><strong>${formatRp(o.total || o.totalPrice)}</strong></td>
        <td><span class="badge-status badge-${st.key}">${st.label}</span></td>
        <td>
          <div class="status-actions-cell">
            ${st.key !== 'pending' ? `<button type="button" class="btn-status-pill pill-pending" onclick="changeOrderStatus('${o.id}', 'pending')">Pending</button>` : ''}
            ${st.key !== 'diproses' ? `<button type="button" class="btn-status-pill pill-diproses" onclick="changeOrderStatus('${o.id}', 'diproses')">Proses</button>` : ''}
            ${st.key !== 'ready' ? `<button type="button" class="btn-status-pill pill-ready" onclick="changeOrderStatus('${o.id}', 'ready')">Siap</button>` : ''}
            ${st.key !== 'dikirim' ? `<button type="button" class="btn-status-pill pill-dikirim" onclick="changeOrderStatus('${o.id}', 'dikirim')">Kirim</button>` : ''}
            ${st.key !== 'selesai' ? `<button type="button" class="btn-status-pill pill-selesai" onclick="changeOrderStatus('${o.id}', 'selesai')">Selesai</button>` : ''}
            ${st.key !== 'dibatalkan' ? `<button type="button" class="btn-status-pill pill-dibatalkan" onclick="changeOrderStatus('${o.id}', 'dibatalkan')">Batal</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function changeOrderStatus(orderId, newStatus) {
  const orders = getAdminOrders();
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  order.status = newStatus;
  order.updatedAt = new Date().toISOString();

  if (typeof saveOrders === 'function') {
    saveOrders(orders);
  } else {
    localStorage.setItem('ems_orders', JSON.stringify(orders));
  }

  const st = normalizeOrderStatus(newStatus);
  if (typeof showToast === 'function') {
    showToast(`Status pesanan ${formatDisplayOrderId(orderId, order.date)} diubah: "${st.label}" ✅`, 'success');
  }

  renderAdminOrdersTable();
  renderDashboardOverview();
}

function viewProofModal(orderId) {
  const orders = getAdminOrders();
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  selectedProofOrderId = orderId;
  const modal = document.getElementById('proof-modal');
  const img = document.getElementById('proof-img');
  const details = document.getElementById('proof-details-text');

  const proofUrl = order.proofUrl || order.strukBase64 || (REPO_IMG_BASE + 'PKM_BIMA.jpg');
  if (img) img.src = proofUrl;

  const displayId = formatDisplayOrderId(order.id, order.date);
  const st = normalizeOrderStatus(order.status);

  if (details) {
    details.innerHTML = `
      <strong>ID Pesanan:</strong> ${displayId}<br>
      <strong>Pelanggan:</strong> ${order.address?.recipient || order.recipientName || order.userId}<br>
      <strong>Metode:</strong> ${order.paymentMethod === 'transfer' ? 'Transfer Bank' : 'E-Wallet'} (${order.paymentDetail || '-' })<br>
      <strong>Total Bayar:</strong> ${formatRp(order.total || order.totalPrice)}<br>
      <strong>Status Saat Ini:</strong> ${st.label}
    `;
  }

  if (modal) modal.classList.remove('hidden');
}

function closeProofModal() {
  const modal = document.getElementById('proof-modal');
  if (modal) modal.classList.add('hidden');
  selectedProofOrderId = null;
}

function closeProofModalOnBackdrop(event) {
  if (event.target.id === 'proof-modal') {
    closeProofModal();
  }
}

function approveProofFromModal() {
  if (!selectedProofOrderId) return;
  changeOrderStatus(selectedProofOrderId, 'diproses');
  closeProofModal();
  if (typeof showToast === 'function') showToast('Bukti pembayaran disetujui! Pesanan sedang diproses. ✅', 'success');
}

// ========================================
// 6. USER MANAGEMENT (Flutter UserManagementTab)
// ========================================

function getAdminUsers() {
  // Akun Admin bawaan (tidak perlu registrasi lagi)
  const defaultAdmin = {
    id: 'admin-1',
    name: 'Admin Utama',
    email: 'admin123',
    phone: '-',
    role: 'admin',
    active: true
  };

  let stored = JSON.parse(localStorage.getItem('ems_users') || '[]');

  // Hapus akun dummy/template lama jika ada
  const dummyEmails = ['budi.santoso@gmail.com', 'siti.aminah@gmail.com', 'rudi.h@yahoo.com', 'jane@example.com', 'bob@example.com', 'Tes123@'];
  stored = stored.filter(u => !dummyEmails.includes(u.email));

  // Hanya ada 2 role: 'admin' dan 'customer' (pengguna)
  stored = stored.map(u => ({
    ...u,
    role: (u.role === 'admin' || u.email === 'admin123') ? 'admin' : 'customer'
  }));

  // Pastikan akun Admin Utama selalu ada di posisi teratas
  const hasAdmin = stored.some(u => u.role === 'admin' || u.email === 'admin123');
  const result = hasAdmin ? stored : [defaultAdmin, ...stored];

  return result;
}

function saveAdminUsers(users) {
  localStorage.setItem('ems_users', JSON.stringify(users));
}

function renderAdminUsersTable() {
  const tbody = document.getElementById('admin-users-table-tbody');
  if (!tbody) return;

  const searchInput = document.getElementById('filter-user-search');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const users = getAdminUsers();
  const orders = getAdminOrders();

  let list = users;
  if (query) {
    list = users.filter(u =>
      (u.name || '').toLowerCase().includes(query) ||
      (u.email || '').toLowerCase().includes(query) ||
      (u.role === 'admin' ? 'admin' : 'pengguna').includes(query)
    );
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:36px;color:#9ca3af;">
          <div style="font-size:2rem;margin-bottom:8px;">👤</div>
          ${query ? 'Tidak ada pengguna yang cocok dengan pencarian.' : 'Belum ada pengguna yang mendaftar. Pengguna akan muncul di sini setelah mendaftar dari halaman customer.'}
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = list.map((u, idx) => {
    const userOrdersCount = orders.filter(o => o.userId === u.email).length;
    const isAct = u.active !== false;
    const isAdmin = u.role === 'admin';

    // Hanya 2 Role: Admin dan Pengguna
    const roleBadge = isAdmin 
      ? '<span class="badge-status badge-ready">🛡️ Admin</span>'
      : '<span class="badge-status badge-processing">👤 Pengguna</span>';

    // Cari index asli di array users
    const realIdx = users.findIndex(us => us.email === u.email);

    // Status toggle (Admin selalu aktif dan tidak dapat diblokir)
    const statusCol = isAdmin 
      ? '<span class="user-status-text user-status-active">Aktif</span>'
      : `
        <div class="user-toggle-wrapper">
          <span class="user-status-text ${isAct ? 'user-status-active' : 'user-status-blocked'}">
            ${isAct ? 'Aktif' : 'Blokir'}
          </span>
          <label class="switch">
            <input type="checkbox" ${isAct ? 'checked' : ''} onchange="toggleUserStatus(${realIdx})">
            <span class="slider-round"></span>
          </label>
        </div>
      `;

    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;border-radius:50%;background:#eaf2e6;color:#2d5a27;display:flex;align-items:center;justify-content:center;font-weight:700;">
              ${(u.name || 'U')[0].toUpperCase()}
            </div>
            <strong>${u.name || '-'}</strong>
          </div>
        </td>
        <td>${u.email || '-'}</td>
        <td>${u.phone || '-'}</td>
        <td>${roleBadge}</td>
        <td><strong>${isAdmin ? '-' : `${userOrdersCount} pesanan`}</strong></td>
        <td>${statusCol}</td>
      </tr>
    `;
  }).join('');
}

function toggleUserStatus(index) {
  const users = getAdminUsers();
  if (!users[index] || users[index].role === 'admin') return;

  users[index].active = !users[index].active;
  saveAdminUsers(users);

  const statusLabel = users[index].active ? 'diaktifkan' : 'diblokir';
  if (typeof showToast === 'function') {
    showToast(`Akun ${users[index].name} berhasil ${statusLabel}!`, 'default');
  }

  renderAdminUsersTable();
}

// ========================================
// 7. REPORTS & CHART (Flutter ReportsTab & FlChart)
// ========================================

function renderReportsSection() {
  const orders = getAdminOrders();
  const products = getAdminProducts();

  // Completed / valid orders
  const validOrders = orders.filter(o => o.status !== 'cancelled' && o.status !== 'dibatalkan');
  const completedOrders = orders.filter(o => {
    const s = (o.status || '').toLowerCase();
    return s === 'selesai' || s === 'done' || s === 'diproses' || s === 'processing' || s === 'ready' || s === 'dikirim' || s === 'shipped';
  });

  const totalRevenue = validOrders.reduce((sum, o) => sum + (Number(o.total || o.totalPrice) || 0), 0);
  const doneOrdersCount = completedOrders.length;

  document.getElementById('rep-total-revenue').textContent = formatRp(totalRevenue);
  document.getElementById('rep-done-orders').textContent = `${doneOrdersCount} Transaksi`;

  // Top Product
  const prodQuantities = {};
  validOrders.forEach(o => {
    if (Array.isArray(o.items)) {
      o.items.forEach(it => {
        const prodId = it.id || it.productId;
        const p = products.find(prod => prod.id === prodId);
        const name = p ? p.name : (it.productName || it.name || 'Produk');
        const qty = Number(it.qty || it.quantity) || 1;
        prodQuantities[name] = (prodQuantities[name] || 0) + qty;
      });
    }
  });

  let topProdName = '-';
  let maxQty = 0;
  Object.keys(prodQuantities).forEach(name => {
    if (prodQuantities[name] > maxQty) {
      maxQty = prodQuantities[name];
      topProdName = name;
    }
  });

  const repTopProdEl = document.getElementById('rep-top-product');
  const repTopProdSubEl = document.getElementById('rep-top-product-sub');
  if (repTopProdEl) repTopProdEl.textContent = topProdName !== '-' ? topProdName : 'Belum ada data';
  if (repTopProdSubEl) repTopProdSubEl.textContent = maxQty > 0 ? `${maxQty} porsi terjual` : 'Belum ada transaksi';

  // Render Interactive Weekly Sales Chart (LineChart)
  renderWeeklySalesChart(validOrders);

  // Render Table Ringkasan Penjualan Tiap Produk
  const repTbody = document.getElementById('rep-products-tbody');
  if (repTbody) {
    repTbody.innerHTML = products.map(p => {
      let totalQty = 0;
      validOrders.forEach(o => {
        if (Array.isArray(o.items)) {
          o.items.forEach(it => {
            if ((it.id || it.productId) === p.id) {
              totalQty += Number(it.qty || it.quantity) || 1;
            }
          });
        }
      });

      // Hanya tampilkan jumlah terjual dari order real customer
      const displaySold = totalQty;
      const subtotal = displaySold * p.price;

      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px;">
              <img src="${p.image}" class="table-prod-img" onerror="this.src='${REPO_IMG_BASE}Nugget_Lele.jpeg'">
              <strong>${p.name}</strong>
            </div>
          </td>
          <td><span class="badge-status badge-processing">${p.categoryLabel || p.category}</span></td>
          <td>${formatRp(p.price)}</td>
          <td><strong>${displaySold}</strong> porsi</td>
          <td><strong>${formatRp(subtotal)}</strong></td>
        </tr>
      `;
    }).join('');
  }
}

// Draw dynamic weekly SVG line chart matching Flutter FlChart
function renderWeeklySalesChart(validOrders) {
  const chartWrapper = document.getElementById('sales-chart-wrapper');
  if (!chartWrapper) return;

  const now = new Date();
  const daysData = [];
  const daysLabels = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayStart = d.getTime();
    const dayEnd = dayStart + 86400000;

    const daySum = validOrders.reduce((sum, o) => {
      const oTime = new Date(o.date).getTime();
      if (oTime >= dayStart && oTime < dayEnd) {
        return sum + (Number(o.total || o.totalPrice) || 0);
      }
      return sum;
    }, 0);

    const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    daysData.push(daySum);
    daysLabels.push(label);
  }

  // Gunakan data penjualan real 7 hari terakhir dari orderan customer
  const chartValues = daysData;

  const maxVal = Math.max(...chartValues, 50000);
  const minVal = 0;
  const range = maxVal - minVal || 1;

  const svgWidth = 800;
  const svgHeight = 220;
  const paddingLeft = 40;
  const paddingRight = 40;
  const paddingTop = 35;
  const paddingBottom = 40;

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  const points = chartValues.map((val, idx) => {
    const x = paddingLeft + (idx / (chartValues.length - 1)) * plotWidth;
    const y = paddingTop + plotHeight - ((val - minVal) / range) * plotHeight;
    return { x, y, val, label: daysLabels[idx] };
  });

  // Build smooth bezier path
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = (p0.x + p1.x) / 2;
    pathD += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  // Area path for gradient fill
  const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + plotHeight} L ${points[0].x} ${paddingTop + plotHeight} Z`;

  // Draw grid lines
  const gridLines = [0, 0.5, 1].map(pct => {
    const y = paddingTop + plotHeight * (1 - pct);
    const valText = formatRp(minVal + range * pct);
    return `
      <line x1="${paddingLeft}" y1="${y}" x2="${svgWidth - paddingRight}" y2="${y}" stroke="#e5e7eb" stroke-dasharray="4 4" stroke-width="1" />
      <text x="${paddingLeft - 8}" y="${y + 4}" fill="#9ca3af" font-size="10" text-anchor="end">${valText}</text>
    `;
  }).join('');

  // Draw data dots & labels
  const dotsAndLabels = points.map(pt => `
    <circle cx="${pt.x}" cy="${pt.y}" r="5" fill="#2d5a27" stroke="#ffffff" stroke-width="2.5" class="chart-point" />
    <text x="${pt.x}" y="${pt.y - 10}" fill="#2d5a27" font-size="11" font-weight="700" text-anchor="middle">${formatRp(pt.val)}</text>
    <text x="${pt.x}" y="${svgHeight - 12}" fill="#6b7280" font-size="11" font-weight="600" text-anchor="middle">${pt.label}</text>
  `).join('');

  chartWrapper.innerHTML = `
    <svg viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="salesGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#2d5a27" stop-opacity="0.32"/>
          <stop offset="100%" stop-color="#2d5a27" stop-opacity="0.0"/>
        </linearGradient>
      </defs>

      ${gridLines}
      <path d="${areaD}" fill="url(#salesGrad)" />
      <path d="${pathD}" fill="none" stroke="#2d5a27" stroke-width="3.5" stroke-linecap="round" />
      ${dotsAndLabels}
    </svg>
  `;
}

// Export CSV report (matching Flutter ReportsTab _exportLaporan)
function exportAdminSalesReport() {
  const orders = getAdminOrders();
  const rows = [
    ['ID Order', 'Tanggal', 'Nama Penerima', 'Total Harga', 'Status', 'Metode Pembayaran', 'Alamat']
  ];

  orders.forEach(o => {
    const rawId = formatDisplayOrderId(o.id, o.date);
    const dateStr = formatOrderDate(o.date);
    const recipient = (o.address?.recipient || o.recipientName || o.userId || '-').replace(/,/g, ' ').trim();
    const total = o.total || o.totalPrice || 0;
    const statusLabel = normalizeOrderStatus(o.status).label;
    const payment = (o.paymentMethod === 'transfer' ? 'Transfer Bank' : (o.paymentMethod === 'cod' ? 'COD' : 'E-Wallet'));
    const address = (o.deliveryMethod === 'pickup' ? 'Pick Up di Tempat' : (o.address?.detail || o.address?.city || '-')).replace(/,/g, ' ').trim();

    rows.push([rawId, dateStr, recipient, total, statusLabel, payment, address]);
  });

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.map(item => `"${item}"`).join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `laporan_penjualan_elok_mekar_sari_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (typeof showToast === 'function') {
    showToast('Laporan penjualan (CSV) berhasil diunduh! 📥', 'success');
  }
}

// ========================================
// 8. INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  if (checkAdminAccess()) {
    renderDashboardOverview();
  }
});
