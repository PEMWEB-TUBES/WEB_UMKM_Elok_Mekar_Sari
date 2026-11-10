

let currentFilter = 'all';

function loadOrders() {
  const orders = getOrders();
  const user = getCurrentUser();
  if (!user || user.role === 'admin') return orders;
  return orders.filter(o => o.userId && o.userId === user.email);
}

function renderOrders() {
  const orders = loadOrders();
  const listEl = document.getElementById('orders-list');
  const emptyEl = document.getElementById('empty-orders');
  if (!listEl) return;

  const filtered = orders.filter(o => {
    if (currentFilter === 'all') return true;
    const s = (o.status || '').toLowerCase();
    if (currentFilter === 'pending') return s === 'pending';
    if (currentFilter === 'processing') return s === 'processing' || s === 'diproses';
    if (currentFilter === 'shipped') return s === 'shipped' || s === 'dikirim';
    if (currentFilter === 'ready') return s === 'ready';
    if (currentFilter === 'done') return s === 'done' || s === 'selesai';
    if (currentFilter === 'cancelled') return s === 'cancelled' || s === 'dibatalkan';
    return s === currentFilter;
  });

  if (!filtered.length) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');
  listEl.innerHTML = '';
  filtered.forEach(order => {
    const card = document.createElement('div');
    card.className = 'order-card';
    const statusInfo = getStatusInfo(order.status);
    const itemsSummary = order.items.map(i => {
      const prod = PRODUCTS.find(p => p.id === i.id);
      return prod ? `${prod.name} x${i.qty}` : '';
    }).join(', ');
    const total = formatRupiah(order.total);
    const date = formatDateTime(order.date);

    let shippedMapBlock = '';
    if (order.status === 'shipped') {
      const destName = (order.address && order.address.detail) ? (order.address.detail + ', ' + (order.address.city || 'Surabaya')) : 'Alamat Pengantaran';
      const queryLoc = encodeURIComponent(destName);
      const embedUrl = `https://maps.google.com/maps?q=${queryLoc}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
      const directRoute = `https://www.google.com/maps/dir/?api=1&origin=-7.3005,112.7766&destination=${queryLoc}`;

      shippedMapBlock = `
        <div style="margin:12px 0;background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
            <span style="font-weight:700;font-size:0.86rem;color:#166534;display:inline-flex;align-items:center;gap:6px;">
              <span>🚚</span> <span>Pesanan Sedang Dikirimkan ke Alamat Anda</span>
            </span>
            <a href="${directRoute}" target="_blank" rel="noopener noreferrer" style="font-size:0.8rem;color:#15803d;font-weight:700;text-decoration:none;">Lacak Rute Kurir ↗</a>
          </div>
          <div style="width:100%;height:180px;border-radius:8px;overflow:hidden;border:1px solid #bbf7d0;background:#e2e8f0;">
            <iframe width="100%" height="180" style="border:0;" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade" src="${embedUrl}"></iframe>
          </div>
          <div style="font-size:0.76rem;color:#15803d;margin-top:6px;line-height:1.4;">
            <strong>Titik Koordinat Tujuan:</strong> ${destName}
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="order-card-header">
        <div>
          <div class="order-id">${order.id}</div>
          <div class="order-date">${date}</div>
        </div>
        <div class="order-status-section">
          <span class="status-badge ${statusInfo.class}">${statusInfo.icon} ${statusInfo.label}</span>
        </div>
      </div>
      <div class="order-card-items">
        ${order.items.map(i => {
      const prod = PRODUCTS.find(p => p.id === i.id);
      if (!prod) return '';
      return `<div class="order-item-row">
            <img src="${prod.image}" alt="${prod.name}" class="order-item-img" loading="lazy" />
            <div class="order-item-name">${prod.name}</div>
            <div class="order-item-qty">x${i.qty}</div>
            <div class="order-item-price">${formatRupiah(prod.price * i.qty)}</div>
          </div>`;
    }).join('')}
      </div>
      ${shippedMapBlock}
      <div class="order-card-footer">
        <div class="order-total"><strong>Total: ${total}</strong></div>
        <div class="order-actions">
          <button class="btn-order-detail" onclick="openOrderModal('${order.id}')">Detail</button>
          ${order.status === 'pending' && order.paymentMethod === 'transfer' && !order.proofUrl ? `<button class="btn-upload-proof" onclick="openUploadProofModal('${order.id}')">Upload Bukti</button>` : ''}
        </div>
      </div>`;
    listEl.appendChild(card);
  });
}

function filterOrders(status, btn) {
  currentFilter = status;
  document.querySelectorAll('.order-tab').forEach(t => {
    const fnStr = t.getAttribute('onclick') || '';
    t.classList.toggle('active', fnStr.includes(`'${status}'`));
  });
  renderOrders();
}

function openOrderModal(orderId) {
  const order = getOrders().find(o => o.id === orderId);
  if (!order) return;
  const modal = document.getElementById('order-modal');
  const content = document.getElementById('order-detail-content');
  if (!modal || !content) return;

  const statusInfo = getStatusInfo(order.status);
  const itemsHtml = order.items.map(i => {
    const prod = PRODUCTS.find(p => p.id === i.id);
    if (!prod) return '';
    return `<div class="order-item-row">
      <img src="${prod.image}" class="order-item-img" />
      <div class="order-item-name">${prod.name}</div>
      <div class="order-item-qty">x${i.qty}</div>
      <div class="order-item-price">${formatRupiah(prod.price * i.qty)}</div>
    </div>`;
  }).join('');

  const addressHtml = order.deliveryMethod === 'delivery' ? `
    <p><strong>Metode:</strong> Pengiriman ke Alamat</p>
    <p><strong>Alamat:</strong> ${order.address?.detail || '-'}, ${order.address?.city || ''} ${order.address?.zip || ''}<br>
    <strong>Nama Penerima:</strong> ${order.address?.recipient || '-'}<br>
    <strong>No. HP:</strong> ${order.address?.phone || '-'}</p>` : `
    <p><strong>Metode:</strong> Pick Up di Tempat</p>
    <p><strong>Lokasi Gerai UMKM:</strong> Balai RW 08, Kelurahan Semolowaru, Kec. Sukolilo, Surabaya</p>
    <p><strong>Jadwal Ambil:</strong> ${order.pickup?.date || '-'} pukul ${order.pickup?.time || '-'} WIB</p>`;

  const paymentHtml = order.paymentMethod === 'transfer' ? `
    <p><strong>Bank:</strong> ${order.paymentDetail || 'Transfer Bank'}</p>` : `
    <p><strong>E‑Wallet:</strong> ${order.paymentDetail || 'E-Wallet'}</p>`;

  const proofImg = order.proofUrl ? `<img src="${order.proofUrl}" alt="Bukti" style="max-width:100%;margin-top:12px;border-radius:8px;border:1px solid #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,0.06);"/>` : '<p>Tidak ada bukti pembayaran.</p>';

  const isDelivery = order.deliveryMethod === 'delivery';
  const destName = isDelivery
    ? ((order.address && order.address.detail) ? (order.address.detail + ', ' + (order.address.city || 'Surabaya') + (order.address.zip ? ' ' + order.address.zip : '')) : 'Surabaya')
    : 'Balai RW 08 Semolowaru, Kec. Sukolilo, Surabaya';
  const queryLoc = isDelivery ? encodeURIComponent(destName) : '-7.3005,112.7766';
  const directMapsUrl = isDelivery
    ? `https://www.google.com/maps/dir/?api=1&origin=-7.3005,112.7766&destination=${queryLoc}`
    : 'https://www.google.com/maps?q=-7.3005,112.7766';
  const embedMapsUrl = isDelivery
    ? `https://maps.google.com/maps?q=${queryLoc}&t=&z=15&ie=UTF8&iwloc=&output=embed`
    : `https://maps.google.com/maps?q=-7.3005,112.7766&t=&z=16&ie=UTF8&iwloc=&output=embed`;

  const s = (order.status || '').toLowerCase();
  const isFinished = s === 'done' || s === 'selesai' || s === 'cancelled' || s === 'dibatalkan';

  const mapHtml = isFinished ? '' : `
    <div class="order-map-box" style="margin:14px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-weight:700;font-size:0.88rem;color:#2d5a27;">📍 ${isDelivery ? 'Peta Titik Koordinat Pengantaran' : 'Peta Titik Koordinat Pick Up UMKM'}</span>
        <a href="${directMapsUrl}" target="_blank" rel="noopener noreferrer" style="font-size:0.8rem;color:#2d5a27;font-weight:700;text-decoration:none;">Buka Rute Maps ↗</a>
      </div>
      <div style="width:100%;height:190px;border-radius:8px;overflow:hidden;border:1px solid #cbd5e1;background:#e2e8f0;">
        <iframe width="100%" height="190" style="border:0;" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade" src="${embedMapsUrl}"></iframe>
      </div>
      <div style="font-size:0.75rem;color:#64748b;margin-top:6px;display:flex;justify-content:space-between;align-items:center;">
        <span>${destName}</span>
        <span style="color:#059669;font-weight:600;">Maps Terintegrasi</span>
      </div>
    </div>
  `;

  content.innerHTML = `
    <div style="margin-bottom:14px;">
      <div style="font-size:1.1rem;font-weight:800;color:#1e293b;">Detail Pesanan #${order.id}</div>
      <div style="font-size:0.82rem;color:#64748b;">Dipesan pada ${formatDateTime(order.date)}</div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
      <strong>Status:</strong>
      <span class="status-badge ${statusInfo.class}">${statusInfo.icon} ${statusInfo.label}</span>
    </div>
    <div style="background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:12px;font-size:0.88rem;line-height:1.5;">
      ${addressHtml}
      ${paymentHtml}
    </div>
    ${mapHtml}
    <h4 style="margin:16px 0 8px;font-size:0.95rem;font-weight:700;">Produk yang Dipesan</h4>
    <div style="border:1px solid #e2e8f0;border-radius:8px;padding:8px;margin-bottom:12px;">
      ${itemsHtml}
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;font-size:1rem;margin-bottom:14px;padding:8px 12px;background:#f1f5f9;border-radius:6px;">
      <strong>Total Pembayaran</strong>
      <strong style="color:#2d5a27;font-size:1.1rem;">${formatRupiah(order.total)}</strong>
    </div>
    <h4 style="margin:16px 0 8px;font-size:0.95rem;font-weight:700;">Bukti Pembayaran</h4>
    ${proofImg}
  `;
  modal.classList.remove('hidden');
}

function closeOrderDetailModal() {
  const modal = document.getElementById('order-modal');
  if (modal) modal.classList.add('hidden');
}

function closeOrderModal(event) {
  if (!event || event.target.id === 'order-modal') {
    closeOrderDetailModal();
  }
}

function openUploadProofModal(orderId) {
  document.getElementById('upload-order-id').textContent = orderId;
  document.getElementById('upload-modal').classList.remove('hidden');
  window.currentProofOrderId = orderId;
}

function closeUploadProofModal(event) {
  if (event && event.target && event.target.id && event.target.id !== 'upload-modal') return;
  const modal = document.getElementById('upload-modal');
  if (modal) modal.classList.add('hidden');

  const preview = document.getElementById('modal-proof-preview');
  const placeholder = document.getElementById('modal-upload-placeholder');
  if (preview) preview.classList.add('hidden');
  if (placeholder) placeholder.classList.remove('hidden');
  const fileInput = document.getElementById('modal-proof-file');
  if (fileInput) fileInput.value = '';
}

function handleModalProofUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const url = e.target.result;
    document.getElementById('modal-proof-preview').src = url;
    document.getElementById('modal-proof-preview').classList.remove('hidden');
    document.getElementById('modal-upload-placeholder').classList.add('hidden');

    const orders = getOrders();
    const order = orders.find(o => o.id === window.currentProofOrderId);
    if (order) {
      order.proofUrl = url;
      order.status = 'processing';
      saveOrders(orders);
      renderOrders();
    }
  };
  reader.readAsDataURL(file);
}

function submitProof() {

  closeUploadProofModal();
  showToast('Bukti pembayaran berhasil diupload.', 'success');
}

let cachedCustomerOrdersStr = '';

function refreshCustomerOrders() {
  renderOrders();
}

window.addEventListener('storage', (e) => {
  if (e.key === 'ems_orders') {
    refreshCustomerOrders();
  }
});

window.addEventListener('ems_orders_updated', () => {
  refreshCustomerOrders();
});

setInterval(() => {
  const currentStr = localStorage.getItem('ems_orders') || '';
  if (currentStr !== cachedCustomerOrdersStr) {
    cachedCustomerOrdersStr = currentStr;
    refreshCustomerOrders();
  }
}, 1500);

document.addEventListener('DOMContentLoaded', () => {
  cachedCustomerOrdersStr = localStorage.getItem('ems_orders') || '';
  renderOrders();

  document.getElementById('order-modal')?.addEventListener('click', closeOrderModal);
  document.getElementById('upload-modal')?.addEventListener('click', closeUploadProofModal);
  document.getElementById('modal-proof-file')?.addEventListener('change', handleModalProofUpload);
});
