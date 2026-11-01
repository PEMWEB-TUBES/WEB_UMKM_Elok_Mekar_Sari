// ========================================
// APP.JS - Global shared utilities
// ========================================

const BASE_IMG = 'images/';

// ---- PRODUCT DATA ----
let PRODUCTS = [
  {
    id: 1,
    name: 'Bakso Jamur',
    category: 'jamur',
    categoryLabel: 'Olahan Jamur',
    price: 15000,
    stock: 50,
    image: BASE_IMG + 'Bakso_Jamur.jpg',
    description: 'Bakso jamur tiram segar yang lezat dan bergizi. Dibuat dari jamur tiram pilihan dengan bumbu rempah khas. Cocok untuk santapan keluarga sehari-hari.',
    soldCount: 230
  },
  {
    id: 2,
    name: 'Sate Jamur Tiram',
    category: 'jamur',
    categoryLabel: 'Olahan Jamur',
    price: 18000,
    stock: 35,
    image: BASE_IMG + 'Sate_Jamur_Tiram.jpg',
    description: 'Sate jamur tiram dengan bumbu kacang khas yang gurih. Alternatif sehat pengganti daging yang tidak kalah lezat.',
    soldCount: 185
  },
  {
    id: 3,
    name: 'Sate Jamur',
    category: 'jamur',
    categoryLabel: 'Olahan Jamur',
    price: 15000,
    stock: 40,
    image: BASE_IMG + 'Sate_Jamur.jpeg',
    description: 'Sate jamur pilihan dengan cita rasa autentik. Dibakar sempurna dengan bumbu kecap dan rempah tradisional.',
    soldCount: 160
  },
  {
    id: 4,
    name: 'Sempol Jamur',
    category: 'jamur',
    categoryLabel: 'Olahan Jamur',
    price: 10000,
    stock: 60,
    image: BASE_IMG + 'Sempol_Jamur.jpeg',
    description: 'Sempol jamur yang renyah dan gurih, cocok sebagai camilan sehat. Dibuat dari jamur tiram segar pilihan.',
    soldCount: 320
  },
  {
    id: 6,
    name: 'Abon Lele',
    category: 'lele',
    categoryLabel: 'Olahan Lele',
    price: 22000,
    stock: 45,
    image: BASE_IMG + 'Abon_Lele.jpeg',
    description: 'Abon lele renyah dengan cita rasa gurih manis. Cocok sebagai lauk praktis atau topping nasi. Kaya protein ikan lele pilihan.',
    soldCount: 210
  },
  {
    id: 7,
    name: 'Nugget Lele',
    category: 'lele',
    categoryLabel: 'Olahan Lele',
    price: 20000,
    stock: 30,
    image: BASE_IMG + 'nugget_lele.jpeg',
    description: 'Nugget lele crispy yang disukai anak-anak dan orang dewasa. Kandungan protein tinggi, bebas pengawet, dan lezat.',
    soldCount: 145
  },
  {
    id: 8,
    name: 'Jangkrik Crispy',
    category: 'lainnya',
    categoryLabel: 'Lainnya',
    price: 30000,
    stock: 25,
    image: BASE_IMG + 'Jangkrik_Crispi.jpeg',
    description: 'Camilan inovatif jangkrik crispy. Sumber protein alternatif yang kaya nutrisi, renyah dan gurih dengan berbagai pilihan rasa.',
    soldCount: 88
  },
  {
    id: 9,
    name: 'Tahu Walik',
    category: 'lainnya',
    categoryLabel: 'Lainnya',
    price: 12000,
    stock: 55,
    image: BASE_IMG + 'tahu_walik.jpeg',
    description: 'Tahu walik isi ayam berbumbu rempah yang gurih dan renyah. Camilan tradisional Jawa yang lezat untuk keluarga.',
    soldCount: 275
  },
  {
    id: 10,
    name: 'Sinom',
    category: 'minuman',
    categoryLabel: 'Minuman',
    price: 8000,
    stock: 80,
    image: BASE_IMG + 'Sinom.jpeg',
    description: 'Minuman tradisional sinom (jamu asam muda) yang menyegarkan. Terbuat dari bahan-bahan alami yang baik untuk kesehatan pencernaan.',
    soldCount: 410
  }
];

// Sync with localStorage ems_products if available
try {
  let cached = JSON.parse(localStorage.getItem('ems_products') || 'null');
  if (cached && Array.isArray(cached) && cached.length > 0) {
    cached = cached.filter(p => p.name !== 'Budidaya Jamur' && p.id !== 5);
    PRODUCTS = cached;
  } else {
    localStorage.setItem('ems_products', JSON.stringify(PRODUCTS));
  }
} catch (e) {}

// ---- AUTH UTILITIES ----
function getCurrentUser() {
  return JSON.parse(localStorage.getItem('ems_user') || 'null');
}

function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'index.html';
    return null;
  }
  return user;
}

function logout() {
  if (confirm('Apakah Anda yakin ingin keluar?')) {
    localStorage.removeItem('ems_user');
    window.location.href = 'index.html';
  }
}

// ---- CART UTILITIES ----
function getCart() {
  return JSON.parse(localStorage.getItem('ems_cart') || '[]');
}

function saveCart(cart) {
  localStorage.setItem('ems_cart', JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(productId, qty = 1) {
  const cart = getCart();
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.qty = Math.min(existing.qty + qty, product.stock);
  } else {
    cart.push({ id: productId, qty });
  }
  saveCart(cart);
  showToast(`${product.name} berhasil ditambahkan ke keranjang!`, 'success');
}

function updateCartBadge() {
  const cart = getCart();
  const total = cart.reduce((sum, item) => sum + item.qty, 0);
  const badges = document.querySelectorAll('#cart-badge');
  badges.forEach(b => {
    b.textContent = total;
    b.style.display = total > 0 ? 'flex' : 'none';
  });
}

function getCartTotal() {
  const cart = getCart();
  return cart.reduce((sum, item) => {
    const p = PRODUCTS.find(pr => pr.id === item.id);
    return sum + (p ? p.price * item.qty : 0);
  }, 0);
}

// ---- FORMAT UTILITIES ----
function formatRupiah(amount) {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

// ---- TOAST ----
function showToast(message, type = 'default') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast show';
  if (type !== 'default') toast.classList.add(type);
  setTimeout(() => { toast.className = 'toast'; }, 3000);
}

// ---- NAVBAR ----
function initNavbar() {
  const user = getCurrentUser();
  if (!user) return;

  const navAvatar = document.getElementById('nav-avatar');
  const dropdownAvatar = document.getElementById('dropdown-avatar');
  const dropdownName = document.getElementById('dropdown-name');
  const dropdownEmail = document.getElementById('dropdown-email');

  const initial = (user.name || 'U')[0].toUpperCase();
  if (navAvatar) navAvatar.textContent = initial;
  if (dropdownAvatar) dropdownAvatar.textContent = initial;
  if (dropdownName) dropdownName.textContent = user.name || 'Pengguna';
  if (dropdownEmail) dropdownEmail.textContent = user.email || '';

  // Admin badge
  if (user.role === 'admin') {
    const badge = document.createElement('span');
    badge.style.cssText = 'background:#2d7a2d;color:white;font-size:0.7rem;padding:2px 8px;border-radius:999px;font-weight:700;margin-left:6px;';
    badge.textContent = 'ADMIN';
    if (navAvatar) navAvatar.parentElement.appendChild(badge);
  }

  updateCartBadge();

  // Navbar scroll effect
  window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 20);
  });
}

function toggleUserMenu() {
  const dropdown = document.getElementById('user-dropdown');
  if (dropdown) dropdown.classList.toggle('open');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const navUser = document.querySelector('.nav-user');
  if (navUser && !navUser.contains(e.target)) {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.classList.remove('open');
  }
});

// ---- PASSWORD TOGGLE ----
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isCurrentlyPassword = (input.type === 'password');
  input.type = isCurrentlyPassword ? 'text' : 'password';

  const button = btn || (typeof event !== 'undefined' && event ? event.currentTarget : null) || (input.parentElement ? input.parentElement.querySelector('.password-toggle') : null);
  if (button) {
    const img = button.querySelector('img') || (button.tagName === 'IMG' ? button : null);
    if (img) {
      img.src = isCurrentlyPassword ? 'Icon/show.png' : 'Icon/invisible.png';
      img.alt = isCurrentlyPassword ? 'Sembunyikan password' : 'Lihat password';
    }
  }
}

// ---- ORDERS STORAGE ----
function getOrders() {
  const defaultOrders = [
    {
      id: 'EMS-001',
      userId: 'demo@user.com',
      date: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
      items: [
        { id: 1, qty: 2 },
        { id: 10, qty: 3 }
      ],
      deliveryMethod: 'delivery',
      address: { recipient: 'Budi Santoso', phone: '081234567890', detail: 'Jl. Merdeka No. 5, Surabaya', city: 'Surabaya', zip: '60111' },
      paymentMethod: 'transfer',
      paymentDetail: 'BRI',
      status: 'processing',
      proofUrl: null,
      total: 2 * 15000 + 3 * 8000
    },
    {
      id: 'EMS-002',
      userId: 'demo@user.com',
      date: new Date(Date.now() - 10 * 24 * 3600000).toISOString(),
      items: [{ id: 6, qty: 1 }],
      deliveryMethod: 'pickup',
      pickupDate: '2024-01-20',
      pickupTime: '10:00',
      paymentMethod: 'ewallet',
      paymentDetail: 'GoPay',
      status: 'done',
      proofUrl: null,
      total: 22000
    }
  ];
  const stored = JSON.parse(localStorage.getItem('ems_orders') || 'null');
  if (!stored) {
    localStorage.setItem('ems_orders', JSON.stringify(defaultOrders));
    return defaultOrders;
  }
  return stored;
}

function saveOrders(orders) {
  localStorage.setItem('ems_orders', JSON.stringify(orders));
}

function getStatusInfo(status) {
  const map = {
    pending: { label: 'Menunggu Pembayaran', icon: '⏳', class: 'status-pending' },
    processing: { label: 'Sedang Diproses', icon: '⚙️', class: 'status-processing' },
    shipped: { label: 'Dikirim', icon: '🚚', class: 'status-shipped' },
    ready: { label: 'Siap Diambil', icon: '🏪', class: 'status-ready' },
    done: { label: 'Selesai', icon: '✅', class: 'status-done' },
    cancelled: { label: 'Dibatalkan', icon: '❌', class: 'status-cancelled' }
  };
  return map[status] || { label: status, icon: '📦', class: 'status-pending' };
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
});
