// ========================================
// CART.JS - Cart Management & Summary
// ========================================

function renderCart() {
  const cart = getCart();
  const itemsContainer = document.getElementById('cart-items');
  const emptyState = document.getElementById('empty-cart');
  const cartCountEl = document.getElementById('cart-count');
  const subtotalEl = document.getElementById('subtotal');
  const totalPriceEl = document.getElementById('total-price');
  const orderSummaryEl = document.getElementById('order-summary');
  const checkoutBtn = document.getElementById('checkout-btn');

  if (!itemsContainer) return;

  // Calculate total item quantity & total amount
  let totalQty = 0;
  let totalAmount = 0;

  if (!cart || cart.length === 0) {
    itemsContainer.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    if (cartCountEl) cartCountEl.textContent = '0';
    if (subtotalEl) subtotalEl.textContent = formatRupiah(0);
    if (totalPriceEl) totalPriceEl.textContent = formatRupiah(0);
    if (checkoutBtn) {
      checkoutBtn.disabled = true;
      checkoutBtn.style.opacity = '0.5';
      checkoutBtn.style.cursor = 'not-allowed';
    }
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  if (checkoutBtn) {
    checkoutBtn.disabled = false;
    checkoutBtn.style.opacity = '1';
    checkoutBtn.style.cursor = 'pointer';
  }

  itemsContainer.innerHTML = '';

  cart.forEach(item => {
    const product = PRODUCTS.find(p => p.id === item.id);
    if (!product) return;

    const itemSubtotal = product.price * item.qty;
    totalAmount += itemSubtotal;
    totalQty += item.qty;

    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <img src="${product.image}" alt="${product.name}" class="cart-item-img" loading="lazy" />
      <div class="cart-item-info">
        <div class="cart-item-cat">${product.categoryLabel}</div>
        <div class="cart-item-name">${product.name}</div>
        <div class="cart-item-price">${formatRupiah(product.price)}</div>
      </div>
      <div class="cart-item-actions">
        <div class="cart-item-qty-control">
          <button type="button" class="cart-qty-btn" onclick="changeCartQty(${product.id}, -1)">-</button>
          <span class="cart-qty-num">${item.qty}</span>
          <button type="button" class="cart-qty-btn" onclick="changeCartQty(${product.id}, 1)">+</button>
        </div>
        <div class="cart-item-subtotal">${formatRupiah(itemSubtotal)}</div>
        <button type="button" class="cart-remove-btn" onclick="removeCartItem(${product.id})">Hapus</button>
      </div>`;
    itemsContainer.appendChild(row);
  });

  // Update Summary and Count
  if (cartCountEl) cartCountEl.textContent = totalQty;
  if (subtotalEl) subtotalEl.textContent = formatRupiah(totalAmount);
  if (totalPriceEl) totalPriceEl.textContent = formatRupiah(totalAmount);
}

function changeCartQty(productId, delta) {
  const cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (!item) return;

  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  const newQty = item.qty + delta;
  if (newQty <= 0) {
    removeCartItem(productId);
    return;
  }

  item.qty = Math.min(newQty, product.stock || 999);
  saveCart(cart);
  renderCart();
}

function removeCartItem(productId) {
  let cart = getCart();
  cart = cart.filter(i => i.id !== productId);
  saveCart(cart);
  renderCart();
  showToast('Produk dihapus dari keranjang.', 'default');
}

function clearCart() {
  const cart = getCart();
  if (!cart.length) return;

  if (confirm('Kosongkan semua produk di keranjang?')) {
    saveCart([]);
    renderCart();
    showToast('Keranjang telah dikosongkan.', 'default');
  }
}

function proceedToCheckout() {
  const cart = getCart();
  if (!cart || !cart.length) {
    showToast('Keranjang belanja Anda masih kosong.', 'error');
    return;
  }
  window.location.href = 'checkout.html';
}

document.addEventListener('DOMContentLoaded', () => {
  renderCart();
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      proceedToCheckout();
    });
  }
});
