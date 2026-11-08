

function initProfile() {
  const user = requireAuth();
  if (!user) return;
  renderUserInfo(user);
  renderAddressForm(user);
  renderPasswordSection();
  renderOrderHistory(user);
}

function renderUserInfo(user) {
  const nameEl = document.getElementById('profile-name');
  const emailEl = document.getElementById('profile-email');
  if (nameEl) nameEl.value = user.name || '';
  if (emailEl) emailEl.value = user.email || '';
}

function saveProfile() {
  const name = document.getElementById('profile-name').value.trim();
  const email = document.getElementById('profile-email').value.trim();
  if (!name || !email) {
    showToast('Nama dan email wajib diisi.', 'error');
    return;
  }
  const user = { ...getCurrentUser(), name, email };
  localStorage.setItem('ems_user', JSON.stringify(user));
  showToast('Data profil berhasil disimpan.', 'success');
}

function renderAddressForm(user) {
  const addr = JSON.parse(localStorage.getItem('ems_address') || 'null') || {};
  const fields = {
    recipient: document.getElementById('addr-recipient'),
    phone: document.getElementById('addr-phone'),
    detail: document.getElementById('addr-detail'),
    city: document.getElementById('addr-city'),
    zip: document.getElementById('addr-zip')
  };
  Object.entries(fields).forEach(([key, el]) => {
    if (el) el.value = addr[key] || '';
  });
}

function saveAddress() {
  const recipient = document.getElementById('addr-recipient').value.trim();
  const phone = document.getElementById('addr-phone').value.trim();
  const detail = document.getElementById('addr-detail').value.trim();
  const city = document.getElementById('addr-city').value.trim();
  const zip = document.getElementById('addr-zip').value.trim();
  if (!recipient || !phone || !detail || !city || !zip) {
    showToast('Semua kolom alamat wajib diisi.', 'error');
    return;
  }
  const address = { recipient, phone, detail, city, zip };
  localStorage.setItem('ems_address', JSON.stringify(address));
  showToast('Alamat berhasil disimpan.', 'success');
}

function renderPasswordSection() {
  const toggleBtn = document.getElementById('toggle-password-btn');
  if (toggleBtn) toggleBtn.addEventListener('click', () => togglePassword('new-password'));
}

function changePassword() {
  const pwd = document.getElementById('new-password').value;
  if (!pwd) {
    showToast('Masukkan password baru.', 'error');
    return;
  }

  const user = getCurrentUser();
  user.passwordHash = btoa(pwd);
  localStorage.setItem('ems_user', JSON.stringify(user));
  showToast('Password berhasil diubah.', 'success');
  document.getElementById('new-password').value = '';
}

function renderOrderHistory(user) {
  const orders = getOrders().filter(o => o.userId === user.email);
  const container = document.getElementById('order-history');
  if (!container) return;
  if (!orders.length) {
    container.innerHTML = '<p class="empty-state">Belum ada pesanan.</p>';
    return;
  }
  container.innerHTML = '';
  orders.forEach(order => {
    const card = document.createElement('div');
    card.className = 'order-history-card';
    const statusInfo = getStatusInfo(order.status);
    const date = formatDateTime(order.date);
    const items = order.items.map(i => {
      const p = PRODUCTS.find(prod => prod.id === i.id);
      return p ? `${p.name} x${i.qty}` : '';
    }).join(', ');
    card.innerHTML = `
      <div class="order-history-header">
        <span class="order-id">${order.id}</span>
        <span class="order-date">${date}</span>
        <span class="status-badge ${statusInfo.class}">${statusInfo.icon} ${statusInfo.label}</span>
      </div>
      <div class="order-items">${items}</div>
      <div class="order-total"><strong>Total: ${formatRupiah(order.total)}</strong></div>
    `;
    container.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initProfile();
  const saveProfileBtn = document.getElementById('save-profile-btn');
  if (saveProfileBtn) saveProfileBtn.addEventListener('click', saveProfile);
  const saveAddrBtn = document.getElementById('save-address-btn');
  if (saveAddrBtn) saveAddrBtn.addEventListener('click', saveAddress);
  const changePwdBtn = document.getElementById('change-pwd-btn');
  if (changePwdBtn) changePwdBtn.addEventListener('click', changePassword);
});
