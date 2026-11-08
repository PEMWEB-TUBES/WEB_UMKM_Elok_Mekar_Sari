

let currentFilter = 'all';

function loadOrders() {
  const orders = getOrders();
  const user = getCurrentUser();
  if (!user || user.role === 'admin') return orders;
  const userOrders = orders.filter(o => !o.userId || o.userId === user.email || o.userId === 'demo@user.com');
  return userOrders.length > 0 ? userOrders : orders;
}

function renderOrders() {
  const orders = loadOrders();
  const listEl = document.getElementById('orders-list');
  const emptyEl = document.getElementById('empty-orders');
  if (!listEl) return;

  const filtered = orders.filter(o => {
    if (currentFilter === 'all') return true;
    return o.status === currentFilter;
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

  document.querySelectorAll('.order-tab').forEach(t => t.classList.toggle('active', t.dataset.status === status));
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
    <p><strong>Alamat:</strong> ${order.address.detail}, ${order.address.city} ${order.address.zip}<br>
    <strong>Nama:</strong> ${order.address.recipient}<br>
    <strong>HP:</strong> ${order.address.phone}</p>` : `
    <p><strong>Pickup:</strong> ${order.pickup.date} ${order.pickup.time}</p>`;

  const paymentHtml = order.paymentMethod === 'transfer' ? `
    <p><strong>Bank:</strong> ${order.paymentDetail}</p>` : `
    <p><strong>E‑Wallet:</strong> ${order.paymentDetail}</p>`;

  const proofImg = order.proofUrl ? `<img src="${order.proofUrl}" alt="Bukti" style="max-width:100%;margin-top:12px;"/>` : '<p>Tidak ada bukti pembayaran.</p>';

  content.innerHTML = `
    <h3>Detail ${order.id}</h3>
    <p><strong>Status:</strong> <span class="status-badge ${statusInfo.class}">${statusInfo.icon} ${statusInfo.label}</span></p>
    ${addressHtml}
    ${paymentHtml}
    <h4>Produk</h4>
    ${itemsHtml}
    <h4>Bukti Pembayaran</h4>
    ${proofImg}
  `;
  modal.classList.remove('hidden');
}

function closeOrderModal(event) {
  if (event && event.target.id !== 'order-modal') return;
  const modal = document.getElementById('order-modal');
  if (modal) modal.classList.add('hidden');
}

function openUploadProofModal(orderId) {
  document.getElementById('upload-order-id').textContent = orderId;
  document.getElementById('upload-modal').classList.remove('hidden');

  window.currentProofOrderId = orderId;
}

function closeUploadProofModal(event) {
  if (event && event.target.id !== 'upload-modal') return;
  document.getElementById('upload-modal').classList.add('hidden');

  const preview = document.getElementById('modal-proof-preview');
  const placeholder = document.getElementById('modal-upload-placeholder');
  if (preview) preview.classList.add('hidden');
  if (placeholder) placeholder.classList.remove('hidden');
  document.getElementById('modal-proof-file').value = '';
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

document.addEventListener('DOMContentLoaded', () => {
  renderOrders();

  document.getElementById('order-modal')?.addEventListener('click', closeOrderModal);
  document.getElementById('upload-modal')?.addEventListener('click', closeUploadProofModal);
  document.getElementById('modal-proof-file')?.addEventListener('change', handleModalProofUpload);
});
