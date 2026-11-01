// ========================================
// CHECKOUT.JS - Full Step-by-Step Checkout
// ========================================

let currentDeliveryMethod = 'delivery';
let currentPaymentMethod = 'transfer';
let selectedBankName = 'BNI';
let selectedEwalletName = 'GoPay';
let uploadedProofBase64 = null;

const BANK_ACCOUNTS = {
  'BNI': '0987-6543-21'
};

// 1. Initialize checkout on load
function initCheckout() {
  const cart = getCart();

  if (!cart || cart.length === 0) {
    showToast('Keranjang Anda kosong! Silakan pilih produk terlebih dahulu.', 'error');
    setTimeout(() => {
      window.location.href = 'marketplace.html';
    }, 1500);
    return;
  }

  // Pre-fill user data if available
  const user = getCurrentUser();
  if (user) {
    const nameInput = document.getElementById('recipient-name');
    const phoneInput = document.getElementById('recipient-phone');
    if (nameInput && !nameInput.value) nameInput.value = user.name || '';
    if (phoneInput && !phoneInput.value) phoneInput.value = user.phone || '';
  }

  // Set minimum date for pickup to today
  const pickupDateInput = document.getElementById('pickup-date');
  if (pickupDateInput) {
    const today = new Date().toISOString().split('T')[0];
    pickupDateInput.min = today;
    pickupDateInput.value = today;
  }

  renderCheckoutSummary();
  selectDelivery('delivery');
  selectPayment('transfer');
}

// 2. Render right side order summary
function renderCheckoutSummary() {
  const cart = getCart();
  const summaryContainer = document.getElementById('checkout-items-summary');
  const subtotalEl = document.getElementById('checkout-subtotal');
  const shippingEl = document.getElementById('checkout-shipping');
  const totalEl = document.getElementById('checkout-total');

  if (!summaryContainer) return;

  summaryContainer.innerHTML = '';
  let subtotal = 0;

  cart.forEach(item => {
    const product = PRODUCTS.find(p => p.id === item.id);
    if (!product) return;

    const itemSubtotal = product.price * item.qty;
    subtotal += itemSubtotal;

    const row = document.createElement('div');
    row.className = 'summary-item';
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.justifyContent = 'space-between';
    row.style.marginBottom = '10px';
    row.style.fontSize = '0.9rem';

    row.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <img src="${product.image}" alt="${product.name}" style="width:40px; height:40px; object-fit:cover; border-radius:6px;">
        <div>
          <div style="font-weight:600; color:#1a1a2e;">${product.name}</div>
          <div style="font-size:0.8rem; color:#6a6a8a;">${item.qty} × ${formatRupiah(product.price)}</div>
        </div>
      </div>
      <div style="font-weight:600; color:#1a1a2e;">${formatRupiah(itemSubtotal)}</div>
    `;
    summaryContainer.appendChild(row);
  });

  const shippingCost = (currentDeliveryMethod === 'delivery') ? 10000 : 0;
  const grandTotal = subtotal + shippingCost;

  if (subtotalEl) subtotalEl.textContent = formatRupiah(subtotal);
  if (shippingEl) shippingEl.textContent = (shippingCost === 0) ? 'Gratis' : formatRupiah(shippingCost);
  if (totalEl) totalEl.textContent = formatRupiah(grandTotal);
}

// 3. Delivery Method Toggle
function selectDelivery(method) {
  currentDeliveryMethod = method;

  const deliveryRadio = document.getElementById('delivery-radio');
  const pickupRadio = document.getElementById('pickup-radio');
  const cardDelivery = document.getElementById('delivery-card-delivery');
  const cardPickup = document.getElementById('delivery-card-pickup');
  const addressForm = document.getElementById('address-form');
  const pickupInfo = document.getElementById('pickup-info');

  if (method === 'delivery') {
    if (deliveryRadio) deliveryRadio.checked = true;
    if (cardDelivery) cardDelivery.classList.add('selected');
    if (cardPickup) cardPickup.classList.remove('selected');
    if (addressForm) addressForm.classList.remove('hidden');
    if (pickupInfo) pickupInfo.classList.add('hidden');
  } else {
    if (pickupRadio) pickupRadio.checked = true;
    if (cardPickup) cardPickup.classList.add('selected');
    if (cardDelivery) cardDelivery.classList.remove('selected');
    if (addressForm) addressForm.classList.add('hidden');
    if (pickupInfo) pickupInfo.classList.remove('hidden');
  }

  renderCheckoutSummary();
}

// 4. Payment Method Toggle
function selectPayment(method) {
  currentPaymentMethod = method;

  const transferRadio = document.getElementById('transfer-radio');
  const ewalletRadio = document.getElementById('ewallet-radio');
  const cardTransfer = document.getElementById('payment-card-transfer');
  const cardEwallet = document.getElementById('payment-card-ewallet');
  const bankDetails = document.getElementById('bank-details');
  const ewalletDetails = document.getElementById('ewallet-details');

  if (method === 'transfer') {
    if (transferRadio) transferRadio.checked = true;
    if (cardTransfer) cardTransfer.classList.add('selected');
    if (cardEwallet) cardEwallet.classList.remove('selected');
    if (bankDetails) bankDetails.classList.remove('hidden');
    if (ewalletDetails) ewalletDetails.classList.add('hidden');
  } else {
    if (ewalletRadio) ewalletRadio.checked = true;
    if (cardEwallet) cardEwallet.classList.add('selected');
    if (cardTransfer) cardTransfer.classList.remove('selected');
    if (bankDetails) bankDetails.classList.add('hidden');
    if (ewalletDetails) ewalletDetails.classList.remove('hidden');
  }
}

// 5. Bank selection
function selectBank(bank, btn) {
  selectedBankName = bank;
  document.querySelectorAll('.bank-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const bankNameEl = document.getElementById('selected-bank');
  const accountNumEl = document.getElementById('account-number');
  if (bankNameEl) bankNameEl.textContent = bank;
  if (accountNumEl) accountNumEl.textContent = BANK_ACCOUNTS[bank] || '1234-5678-9012-3456';
}

// 6. E-Wallet selection
function selectEwallet(wallet, btn) {
  selectedEwalletName = wallet;
  document.querySelectorAll('.ewallet-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const walletNameEl = document.getElementById('selected-ewallet');
  if (walletNameEl) walletNameEl.textContent = wallet;
}

// Copy Bank Account
function copyAccount() {
  const accountNum = document.getElementById('account-number')?.textContent || '';
  if (navigator.clipboard) {
    navigator.clipboard.writeText(accountNum).then(() => {
      showToast('Nomor rekening berhasil disalin!', 'success');
    });
  } else {
    showToast('Nomor rekening: ' + accountNum, 'default');
  }
}

// 7. Step Navigation & Validation
function goToStep1() {
  showStep(1);
}

function goToStep2() {
  // Validate Step 1
  if (currentDeliveryMethod === 'delivery') {
    const name = document.getElementById('recipient-name')?.value.trim();
    const phone = document.getElementById('recipient-phone')?.value.trim();
    const address = document.getElementById('address')?.value.trim();
    const city = document.getElementById('city')?.value.trim();

    if (!name || !phone || !address || !city) {
      showToast('Harap lengkapi semua kolom alamat pengiriman.', 'error');
      return;
    }
  } else {
    const pickupDate = document.getElementById('pickup-date')?.value;
    const pickupTime = document.getElementById('pickup-time')?.value;

    if (!pickupDate || !pickupTime) {
      showToast('Harap pilih tanggal dan jam pick up.', 'error');
      return;
    }
  }

  showStep(2);
}

function goToStep3() {
  // Prepare Step 3 confirmation screen
  renderConfirmationStep();
  showStep(3);
}

function showStep(stepNum) {
  document.querySelectorAll('.checkout-step').forEach(el => el.classList.add('hidden'));
  const currentStepEl = document.getElementById('step-' + stepNum);
  if (currentStepEl) currentStepEl.classList.remove('hidden');

  // Update step circles & line
  for (let i = 1; i <= 3; i++) {
    const stepEl = document.getElementById('step-' + i + '-indicator');
    if (!stepEl) continue;

    stepEl.classList.remove('active', 'done');
    if (i < stepNum) {
      stepEl.classList.add('done');
    } else if (i === stepNum) {
      stepEl.classList.add('active');
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 8. Render Confirmation Details
function renderConfirmationStep() {
  const cart = getCart();
  const itemsContainer = document.getElementById('confirm-items');
  const shippingContainer = document.getElementById('confirm-shipping');
  const paymentContainer = document.getElementById('confirm-payment');
  const totalContainer = document.getElementById('confirm-total');

  // Items
  if (itemsContainer) {
    itemsContainer.innerHTML = '';
    let subtotal = 0;
    cart.forEach(item => {
      const product = PRODUCTS.find(p => p.id === item.id);
      if (!product) return;
      const itemSubtotal = product.price * item.qty;
      subtotal += itemSubtotal;

      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.justifyContent = 'space-between';
      div.style.alignItems = 'center';
      div.style.padding = '8px 0';
      div.style.borderBottom = '1px solid #f0f0f0';
      div.innerHTML = `
        <div>
          <strong>${product.name}</strong> <span style="color:#666;">× ${item.qty}</span>
        </div>
        <div>${formatRupiah(itemSubtotal)}</div>
      `;
      itemsContainer.appendChild(div);
    });
  }

  // Shipping
  if (shippingContainer) {
    if (currentDeliveryMethod === 'delivery') {
      const name = document.getElementById('recipient-name')?.value.trim();
      const phone = document.getElementById('recipient-phone')?.value.trim();
      const addr = document.getElementById('address')?.value.trim();
      const city = document.getElementById('city')?.value.trim();
      const zip = document.getElementById('zip')?.value.trim();

      shippingContainer.innerHTML = `
        <p><strong>Metode:</strong> Pengiriman ke Alamat (Ongkir: Rp 10.000)</p>
        <p><strong>Penerima:</strong> ${name} (${phone})</p>
        <p><strong>Alamat:</strong> ${addr}, ${city} ${zip}</p>
      `;
    } else {
      const date = document.getElementById('pickup-date')?.value;
      const time = document.getElementById('pickup-time')?.value;

      shippingContainer.innerHTML = `
        <p><strong>Metode:</strong> Pick Up di Tempat (Gratis Ongkir)</p>
        <p><strong>Lokasi:</strong> RW 08, Kelurahan Semolowaru, Kecamatan Sukolilo, Kota Surabaya</p>
        <p><strong>Jadwal Ambil:</strong> ${formatDate(date)} pukul ${time} WIB</p>
      `;
    }
  }

  // Payment
  if (paymentContainer) {
    if (currentPaymentMethod === 'transfer') {
      const acc = BANK_ACCOUNTS[selectedBankName] || '1234-5678-9012-3456';
      paymentContainer.innerHTML = `
        <p><strong>Metode:</strong> Transfer Bank (${selectedBankName})</p>
        <p><strong>No. Rekening:</strong> ${acc} (a.n. Kelompok Tani Elok Mekar Sari)</p>
      `;
    } else {
      paymentContainer.innerHTML = `
        <p><strong>Metode:</strong> E-Wallet (${selectedEwalletName})</p>
        <p><strong>No. E-Wallet:</strong> +62 812-3166-6161 (a.n. Elok Mekar Sari)</p>
      `;
    }
  }

  // Total
  const subtotal = getCartTotal();
  const shippingCost = (currentDeliveryMethod === 'delivery') ? 10000 : 0;
  const grandTotal = subtotal + shippingCost;
  if (totalContainer) totalContainer.textContent = formatRupiah(grandTotal);
}

// 9. Payment proof upload preview
function previewProof(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    uploadedProofBase64 = e.target.result;
    const preview = document.getElementById('proof-preview');
    const placeholder = document.getElementById('upload-placeholder');
    if (preview) {
      preview.src = uploadedProofBase64;
      preview.classList.remove('hidden');
      preview.style.maxWidth = '100%';
      preview.style.maxHeight = '220px';
      preview.style.objectFit = 'contain';
      preview.style.borderRadius = '8px';
    }
    if (placeholder) placeholder.classList.add('hidden');
    showToast('Foto bukti transfer berhasil diunggah! ✅', 'success');
  };
  reader.readAsDataURL(file);
}

function handleDrop(event) {
  event.preventDefault();
  if (event.dataTransfer.files && event.dataTransfer.files[0]) {
    const file = event.dataTransfer.files[0];
    const fileInput = document.getElementById('proof-file');
    if (fileInput) {
      // Simulate file input
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      previewProof({ target: fileInput });
    }
  }
}

// 10. Place Order & Redirect to orders.html
function placeOrder() {
  const cart = getCart();
  if (!cart || cart.length === 0) {
    showToast('Keranjang belanja kosong!', 'error');
    return;
  }

  const subtotal = getCartTotal();
  const shippingCost = (currentDeliveryMethod === 'delivery') ? 10000 : 0;
  const grandTotal = subtotal + shippingCost;

  const orderId = 'EMS-' + Date.now().toString().slice(-6);

  let deliveryDetails = {};
  if (currentDeliveryMethod === 'delivery') {
    deliveryDetails = {
      type: 'delivery',
      recipient: document.getElementById('recipient-name')?.value.trim() || 'Pelanggan',
      phone: document.getElementById('recipient-phone')?.value.trim() || '',
      address: document.getElementById('address')?.value.trim() || '',
      city: document.getElementById('city')?.value.trim() || '',
      zip: document.getElementById('zip')?.value.trim() || ''
    };
  } else {
    deliveryDetails = {
      type: 'pickup',
      date: document.getElementById('pickup-date')?.value || '',
      time: document.getElementById('pickup-time')?.value || ''
    };
  }

  const user = getCurrentUser();
  const userEmail = user ? user.email : 'demo@user.com';

  const newOrder = {
    id: orderId,
    userId: userEmail,
    date: new Date().toISOString(),
    status: uploadedProofBase64 ? 'processing' : 'pending',
    items: cart.map(item => ({
      id: item.id,
      qty: item.qty
    })),
    subtotal: subtotal,
    shippingCost: shippingCost,
    total: grandTotal,
    deliveryMethod: currentDeliveryMethod,
    deliveryDetails: deliveryDetails,
    address: {
      recipient: document.getElementById('recipient-name')?.value.trim() || (user ? user.name : 'Pelanggan'),
      phone: document.getElementById('recipient-phone')?.value.trim() || '',
      detail: document.getElementById('address')?.value.trim() || '',
      city: document.getElementById('city')?.value.trim() || '',
      zip: document.getElementById('zip')?.value.trim() || ''
    },
    pickup: {
      date: document.getElementById('pickup-date')?.value || '',
      time: document.getElementById('pickup-time')?.value || ''
    },
    paymentMethod: currentPaymentMethod,
    paymentDetail: currentPaymentMethod === 'transfer' ? selectedBankName : selectedEwalletName,
    proofUrl: uploadedProofBase64 || null
  };

  // Save order to localStorage
  const orders = getOrders();
  orders.unshift(newOrder);
  saveOrders(orders);

  // Clear cart
  saveCart([]);

  showToast('Pesanan berhasil dibuat! Mengalihkan ke riwayat pesanan...', 'success');

  setTimeout(() => {
    window.location.href = 'orders.html';
  }, 1200);
}

// 11. Event Listener initialization
document.addEventListener('DOMContentLoaded', () => {
  initCheckout();
});
