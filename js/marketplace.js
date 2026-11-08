

let currentCategory = 'all';
let currentSearch = '';
let currentMinPrice = 0;
let currentMaxPrice = Infinity;
let currentSort = 'default';
let activeModalProduct = null;

function renderProducts(productsToRender) {
  const grid = document.getElementById('products-grid');
  const emptyState = document.getElementById('empty-state');
  const resultCount = document.getElementById('result-count');

  if (!grid) return;

  const list = productsToRender || getFilteredProducts();

  if (resultCount) {
    resultCount.textContent = `${list.length} produk ditemukan`;
  }

  if (list.length === 0) {
    grid.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  grid.innerHTML = list.map(p => `
    <div class="product-card">
      <div class="product-card-img-wrapper">
        <img src="${p.image}" alt="${p.name}" class="product-card-img" loading="lazy">
        <span class="product-card-badge">${p.categoryLabel}</span>
        <div class="product-card-actions">
          <button type="button" class="product-card-action-btn" onclick="addToCart(${p.id})" title="Tambah ke Keranjang">
            <img src="Icon/keranjang.png" alt="Keranjang" class="card-action-icon">
          </button>
          <button type="button" class="product-card-action-btn" onclick="openProductModal(${p.id})" title="Lihat Detail">
            <img src="Icon/search.png" alt="Lihat" class="card-action-icon">
          </button>
        </div>
      </div>
      <div class="product-card-body">
        <div class="product-card-cat">${p.categoryLabel}</div>
        <h3 class="product-card-name">${p.name}</h3>
        <div class="product-card-price">${formatRupiah(p.price)}</div>
        <div class="product-card-footer">
          <button type="button" class="btn-add-cart" onclick="addToCart(${p.id})">Tambah</button>
        </div>
      </div>
    </div>
  `).join('');
}

function getFilteredProducts() {
  let list = PRODUCTS.filter(p => {

    const matchCategory = currentCategory === 'all' || p.category === currentCategory;

    const matchSearch = !currentSearch ||
      p.name.toLowerCase().includes(currentSearch.toLowerCase()) ||
      p.description.toLowerCase().includes(currentSearch.toLowerCase());

    const matchPrice = p.price >= currentMinPrice && p.price <= currentMaxPrice;

    return matchCategory && matchSearch && matchPrice;
  });

  if (currentSort === 'price-asc') {
    list.sort((a, b) => a.price - b.price);
  } else if (currentSort === 'price-desc') {
    list.sort((a, b) => b.price - a.price);
  } else if (currentSort === 'name-asc') {
    list.sort((a, b) => a.name.localeCompare(b.name));
  } else if (currentSort === 'name-desc') {
    list.sort((a, b) => b.name.localeCompare(a.name));
  }

  return list;
}

function filterProducts() {
  const searchInput = document.getElementById('search-input');
  const priceMin = document.getElementById('price-min');
  const priceMax = document.getElementById('price-max');
  const sortSelect = document.getElementById('sort-select');

  currentSearch = searchInput ? searchInput.value.trim() : '';
  currentMinPrice = (priceMin && priceMin.value) ? Number(priceMin.value) : 0;
  currentMaxPrice = (priceMax && priceMax.value) ? Number(priceMax.value) : Infinity;
  currentSort = sortSelect ? sortSelect.value : 'default';

  renderProducts();
}

const applyFilters = filterProducts;

function setCategory(category, buttonElement) {
  currentCategory = category;

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-cat') === category);
  });

  filterProducts();
}

const filterByCategory = (cat) => setCategory(cat, null);

function resetFilters() {
  currentCategory = 'all';
  currentSearch = '';
  currentMinPrice = 0;
  currentMaxPrice = Infinity;
  currentSort = 'default';

  const searchInput = document.getElementById('search-input');
  const priceMin = document.getElementById('price-min');
  const priceMax = document.getElementById('price-max');
  const sortSelect = document.getElementById('sort-select');
  const sortMobile = document.getElementById('sort-mobile');

  if (searchInput) searchInput.value = '';
  if (priceMin) priceMin.value = '';
  if (priceMax) priceMax.value = '';
  if (sortSelect) sortSelect.value = 'default';
  if (sortMobile) sortMobile.value = 'default';

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-cat') === 'all');
  });

  renderProducts();
}

function toggleMobileFilter() {
  const sidebar = document.getElementById('filter-sidebar');
  if (sidebar) sidebar.classList.toggle('open');
}
const toggleMobileFilters = toggleMobileFilter;

function openProductModal(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  activeModalProduct = product;

  const modal = document.getElementById('product-modal');
  const img = document.getElementById('modal-img');
  const cat = document.getElementById('modal-category');
  const name = document.getElementById('modal-name');
  const price = document.getElementById('modal-price');
  const desc = document.getElementById('modal-desc');
  const stock = document.getElementById('modal-stock');
  const qtyInput = document.getElementById('modal-qty');

  if (img) img.src = product.image;
  if (cat) cat.textContent = product.categoryLabel;
  if (name) name.textContent = product.name;
  if (price) price.textContent = formatRupiah(product.price);
  if (desc) desc.textContent = product.description;
  if (stock) stock.textContent = `Tersedia: ${product.stock} porsi`;
  if (qtyInput) qtyInput.value = 1;

  if (modal) modal.classList.remove('hidden');
}

function closeProductModal() {
  const modal = document.getElementById('product-modal');
  if (modal) modal.classList.add('hidden');
  activeModalProduct = null;
}

function closeModal(event) {
  if (event.target.id === 'product-modal') {
    closeProductModal();
  }
}

function changeQty(delta) {
  const qtyInput = document.getElementById('modal-qty');
  if (!qtyInput) return;
  let val = parseInt(qtyInput.value) || 1;
  val = Math.max(1, Math.min(val + delta, activeModalProduct ? activeModalProduct.stock : 99));
  qtyInput.value = val;
}

function addToCartFromModal() {
  if (!activeModalProduct) return;
  const qtyInput = document.getElementById('modal-qty');
  const qty = parseInt(qtyInput ? qtyInput.value : 1) || 1;
  addToCart(activeModalProduct.id, qty);
  closeProductModal();
}

function shareProduct() {
  if (!activeModalProduct) return;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(window.location.href);
    showToast('Link produk berhasil disalin! 📋', 'success');
  } else {
    showToast('Link produk: ' + activeModalProduct.name, 'default');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const catParam = urlParams.get('cat');
  const productParam = urlParams.get('id') || urlParams.get('product');

  if (catParam) {
    currentCategory = catParam;
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-cat') === catParam);
    });
  }

  renderProducts();

  if (productParam) {
    let targetProduct = null;
    if (!isNaN(productParam)) {
      targetProduct = PRODUCTS.find(p => p.id === Number(productParam));
    } else {
      targetProduct = PRODUCTS.find(p => p.name.toLowerCase().includes(productParam.toLowerCase()));
    }

    if (targetProduct) {
      setTimeout(() => {
        openProductModal(targetProduct.id);
        const cards = document.querySelectorAll('.product-card');
        cards.forEach(card => {
          if (card.textContent.includes(targetProduct.name)) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.style.outline = '2px solid var(--primary)';
            setTimeout(() => { card.style.outline = 'none'; }, 2500);
          }
        });
      }, 300);
    }
  }
});
