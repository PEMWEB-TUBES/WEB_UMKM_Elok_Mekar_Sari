

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
  const dots = document.querySelectorAll('.hero-dot');
  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => showHeroSlide(idx));
  });
  if (slides.length > 1) {
    setInterval(nextHero, 8000);
  }
}

function initStats() {
  const statsConfig = [
    { id: 'stat-0', target: 2500, suffix: '+' },
    { id: 'stat-1', target: 1200, suffix: '+' },
    { id: 'stat-2', target: 15, suffix: '+' },
    { id: 'stat-3', target: 2011, suffix: '', isYear: true }
  ];

  statsConfig.forEach(item => {
    const el = document.getElementById(item.id);
    if (!el) return;

    if (item.isYear) {
      el.textContent = '2011';
      return;
    }

    const duration = 1200;
    const startVal = 0;
    const endVal = item.target;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.floor(startVal + (endVal - startVal) * easeProgress);

      el.textContent = currentVal.toLocaleString('id-ID') + (progress >= 1 ? item.suffix : '');

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  });
}

function renderFeaturedProducts() {
  const container = document.getElementById('featured-products');
  if (!container || typeof PRODUCTS === 'undefined') return;

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
