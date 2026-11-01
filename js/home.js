// home.js - Handles hero slider, stats, category navigation

let heroIndex = 0;
const heroSlides = document.querySelectorAll('.hero-slide');
const heroDots = document.querySelectorAll('.hero-dot');

function showHeroSlide(i) {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot');
  if (!slides.length) return;
  slides.forEach((slide, idx) => {
    slide.classList.toggle('active', idx === i);
    if (dots && dots[idx]) {
      dots[idx].classList.toggle('active', idx === i);
    }
  });
  heroIndex = i;
}

function nextHero() {
  const slides = document.querySelectorAll('.hero-slide');
  if (slides.length <= 1) return;
  showHeroSlide((heroIndex + 1) % slides.length);
}

function prevHero() {
  const slides = document.querySelectorAll('.hero-slide');
  if (slides.length <= 1) return;
  showHeroSlide((heroIndex - 1 + slides.length) % slides.length);
}

window.nextSlide = nextHero;
window.prevSlide = prevHero;
window.goToSlide = showHeroSlide;

function initHero() {
  const slides = document.querySelectorAll('.hero-slide');
  if (!slides.length) return;
  showHeroSlide(0);
  document.querySelector('.hero-next')?.addEventListener('click', nextHero);
  document.querySelector('.hero-prev')?.addEventListener('click', prevHero);
  const dots = document.querySelectorAll('.hero-dot');
  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => showHeroSlide(idx));
  });
  if (slides.length > 1) {
    setInterval(nextHero, 8000);
  }
}

// Stats counters (simple static values from app.js)
function initStats() {
  const stats = [
    { selector: '#stat-products', value: PRODUCTS.length },
    { selector: '#stat-users', value: 48 }, // demo
    { selector: '#stat-orders', value: 124 }, // demo
    { selector: '#stat-revenue', value: 1250000 }
  ];
  stats.forEach(s => {
    const el = document.querySelector(s.selector);
    if (el) el.textContent = typeof s.value === 'number' ? formatRupiah(s.value) : s.value;
  });
}

// Render Featured Products (3 Produk Unggulan)
function renderFeaturedProducts() {
  const container = document.getElementById('featured-products');
  if (!container || typeof PRODUCTS === 'undefined') return;

  // Filter 3 produk unggulan
  let featured = PRODUCTS.filter(p => 
    [2, 3, 4].includes(p.id) || 
    ['Sempol Jamur', 'Tahu Walik', 'Sate Jamur', 'Sate Jamur Tiram'].includes(p.name)
  );

  if (featured.length < 3) {
    featured = PRODUCTS.slice(0, 3);
  } else {
    featured = featured.slice(0, 3);
  }

  container.innerHTML = featured.map(p => `
    <div class="product-card" style="cursor:pointer;" onclick="window.location.href='marketplace.html?id=${p.id}'" title="Lihat ${p.name} di Marketplace">
      <div class="product-card-img-wrapper">
        <img src="${p.image}" alt="${p.name}" class="product-card-img" loading="lazy">
        <span class="product-card-badge">${p.categoryLabel || p.category}</span>
      </div>
      <div class="product-card-body">
        <div class="product-card-cat">${p.categoryLabel || p.category}</div>
        <h3 class="product-card-name">${p.name}</h3>
        <div class="product-card-price" style="margin-bottom:0;">${formatRupiah(p.price)}</div>
      </div>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  initHero();
  initStats();
  renderFeaturedProducts();
});
