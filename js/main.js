/*
 * main.js (Parte 1)
 *
 * Home/Catálogo:
 * - Carrega catálogo (manifest + DLCs)
 * - Busca por texto
 * - Filtros de plataforma
 * - Cards levam para página de produto
 */

let CATALOG = [];
let SITE = { support: { whatsapp: '', message: '' } };
let ACTIVE_FILTER = 'all';
let ACTIVE_CATEGORY = 'all';

document.addEventListener('DOMContentLoaded', () => {
  boot();
});

async function boot() {
  wireUI();
  CATALOG = await loadCatalog();
  hydrateCategoryDropdown(CATALOG);
  hydrateWhatsAppFab();
  renderRails();
  render();
}

function renderRails() {
  const bestEl = document.getElementById('rail-best');
  const newEl = document.getElementById('rail-new');
  if (!bestEl || !newEl) return;

  const orders = safeJson(localStorage.getItem('orders'), []);
  const counts = new Map();
  for (const o of orders) {
    const slug = o?.slug;
    if (!slug) continue;
    counts.set(slug, (counts.get(slug) || 0) + 1);
  }

  const best = [...CATALOG]
    .map((p) => ({ p, c: counts.get(p.slug) || 0 }))
    .sort((a, b) => b.c - a.c)
    .slice(0, 8)
    .map((x) => x.p);

  const newest = [...CATALOG]
    .sort((a, b) => (new Date(b.updatedAt || 0).getTime() || 0) - (new Date(a.updatedAt || 0).getTime() || 0))
    .slice(0, 8);

  bestEl.innerHTML = '';
  newEl.innerHTML = '';
  best.forEach((p) => bestEl.appendChild(buildRailCard(p, counts.get(p.slug) || 0)));
  newest.forEach((p) => newEl.appendChild(buildRailCard(p, counts.get(p.slug) || 0)));
}

function buildRailCard(p, soldCount) {
  const card = document.createElement('a');
  card.className = 'card';
  card.href = `product.html?slug=${encodeURIComponent(p.slug)}`;
  card.innerHTML = `
    <div class="card-media"><img src="${p.image}" alt="${escapeHtml(p.name)}" /></div>
    <div class="card-body">
      <div class="card-title">${escapeHtml(p.name)}</div>
      <div class="card-sub">${escapeHtml(p.category || 'Geral')}</div>
      <div class="card-meta">
        <span>${p.price > 0 ? `R$ ${p.price.toFixed(2)}` : 'Grátis'}</span>
        <span class="dot"></span>
        <span>${p.rating ? `${p.rating.toFixed(1)}★` : '—'}</span>
        ${soldCount ? `<span class="dot"></span><span>${soldCount} venda(s)</span>` : ''}
      </div>
    </div>
  `;
  return card;
}

function safeJson(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function wireUI() {
  const q = document.getElementById('q');
  if (q) q.addEventListener('input', () => render());

  document.querySelectorAll('.chip[data-filter]').forEach((chip) => {
    chip.addEventListener('click', () => {
      ACTIVE_FILTER = chip.getAttribute('data-filter') || 'all';
      document.querySelectorAll('.chip[data-filter]').forEach((c) => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      render();
    });
  });

  const cat = document.getElementById('category');
  if (cat) {
    cat.addEventListener('change', () => {
      ACTIVE_CATEGORY = cat.value || 'all';
      render();
    });
  }
}

async function loadCatalog() {
  try {
    const response = await fetch('content/manifest.json');
    const data = await response.json();

    // Config do site (suporte)
    SITE = {
      support: {
        whatsapp: (data.support?.whatsapp || '').toString(),
        message: (data.support?.message || '').toString(),
      },
    };

    let allProducts = Array.isArray(data.products) ? data.products : [];

    if (Array.isArray(data.dlcs)) {
      for (const dlcPath of data.dlcs) {
        try {
          const dlcResponse = await fetch('content/' + dlcPath);
          const dlcData = await dlcResponse.json();
          if (Array.isArray(dlcData.products)) {
            allProducts = allProducts.concat(dlcData.products);
          }
        } catch (err) {
          console.warn('Erro ao carregar DLC:', dlcPath, err);
        }
      }
    }

    // Normalização (para não quebrar com dados incompletos)
    allProducts = allProducts
      .map((p) => normalizeProduct(p))
      .filter((p) => !!p.id && !!p.name);

    hydrateCategoryDropdown(allProducts);
    hydrateWhatsAppFab();

    return allProducts;
  } catch (error) {
    console.error('Erro ao carregar manifest.json:', error);
    const container = document.getElementById('app-list');
    if (container) {
      container.innerHTML =
        '<p style="color: #ff7a7a;">Erro ao carregar produtos. Rode o site via servidor (GitHub Pages/Vercel ou Live Server).</p>';
    }
    return [];
  }
}

function normalizeProduct(p) {
  const slug = (p.slug || p.id || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');

  return {
    id: p.id,
    slug,
    name: p.name || 'Produto',
    description: p.description || '',
    longDescription: p.longDescription || p.description || '',
    image: p.image || 'assets/default-app.png',
    screenshots: Array.isArray(p.screenshots) ? p.screenshots : [],
    features: Array.isArray(p.features) ? p.features : [],
    tags: Array.isArray(p.tags) ? p.tags : [],
    category: p.category || 'Geral',
    rating: typeof p.rating === 'number' ? p.rating : Number(p.rating || 0),
    reviewsCount: typeof p.reviewsCount === 'number' ? p.reviewsCount : Number(p.reviewsCount || 0),
    faq: Array.isArray(p.faq) ? p.faq : [],
    changelog: Array.isArray(p.changelog) ? p.changelog : [],
    price: typeof p.price === 'number' ? p.price : Number(p.price || 0),
    payLink: p.payLink || '',
    android_url: p.android_url || '',
    ios_link: p.ios_link || '',
    web_link: p.web_link || '',
    version: p.version || '1.0.0',
    updatedAt: p.updatedAt || '',
  };
}

function getFilteredCatalog() {
  const q = (document.getElementById('q')?.value || '').trim().toLowerCase();

  return CATALOG.filter((p) => {
    // filtro categoria
    if (ACTIVE_CATEGORY !== 'all' && (p.category || '') !== ACTIVE_CATEGORY) return false;

    // filtro plataforma
    if (ACTIVE_FILTER === 'android' && !p.android_url) return false;
    if (ACTIVE_FILTER === 'ios' && !p.ios_link) return false;
    if (ACTIVE_FILTER === 'web' && !p.web_link) return false;

    // busca
    if (!q) return true;
    const hay = [p.name, p.description, p.category, ...(p.tags || [])].join(' ').toLowerCase();
    return hay.includes(q);
  });
}

function hydrateCategoryDropdown(products) {
  const el = document.getElementById('category');
  if (!el) return;
  const categories = Array.from(new Set((products || []).map((p) => p.category || 'Geral'))).sort((a, b) =>
    a.localeCompare(b)
  );

  // manter "all" e reconstruir
  el.innerHTML = '<option value="all">Todas as categorias</option>';
  for (const c of categories) {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    el.appendChild(opt);
  }
}

function hydrateWhatsAppFab() {
  const fab = document.getElementById('wa-fab');
  if (!fab) return;
  const rawInput = (SITE.support?.whatsapp || '').toString().trim();
  if (!rawInput) {
    fab.style.display = 'none';
    return;
  }

  // Aceita:
  // 1) URL completa (ex.: https://wa.me/qr/XXXX)
  // 2) Número (ex.: 5511999999999) -> https://wa.me/<num>?text=...
  if (/^https?:\/\//i.test(rawInput) || rawInput.includes('wa.me/')) {
    fab.href = rawInput;
  } else {
    const raw = rawInput.replace(/\D/g, '');
    if (!raw || raw.length < 10) {
      fab.style.display = 'none';
      return;
    }
    const msg = encodeURIComponent(SITE.support?.message || 'Olá! Preciso de suporte.');
    fab.href = `https://wa.me/${raw}?text=${msg}`;
  }
  fab.target = '_blank';
}

function render() {
  const list = document.getElementById('app-list');
  const hint = document.getElementById('results-hint');
  if (!list) return;

  const filtered = getFilteredCatalog();

  if (hint) {
    hint.textContent = filtered.length
      ? `${filtered.length} resultado(s) • Clique em um app para ver detalhes`
      : 'Nenhum resultado — tente outra busca ou filtro.';
  }

  list.innerHTML = '';

  filtered.forEach((p) => {
    const card = document.createElement('article');
    card.className = 'app-card';
    card.setAttribute('data-id', p.id);

    const a = document.createElement('a');
    a.className = 'app-card-link';
    a.href = `product.html?slug=${encodeURIComponent(p.slug)}`;
    a.setAttribute('aria-label', `Ver ${p.name}`);

    const media = document.createElement('div');
    media.className = 'app-media';
    const img = document.createElement('img');
    img.src = p.image;
    img.alt = p.name;
    media.appendChild(img);

    const body = document.createElement('div');
    body.className = 'app-body';

    const top = document.createElement('div');
    top.className = 'app-top';
    const title = document.createElement('h3');
    title.className = 'app-title';
    title.textContent = p.name;
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = p.category;
    top.appendChild(title);
    top.appendChild(badge);

    const desc = document.createElement('p');
    desc.className = 'app-desc';
    desc.textContent = p.description || 'Sem descrição.';

    const meta = document.createElement('div');
    meta.className = 'app-meta';

    const price = document.createElement('div');
    price.className = 'app-price';
    price.textContent = p.price > 0 ? `R$ ${p.price.toFixed(2)}` : 'Grátis';

    const platforms = document.createElement('div');
    platforms.className = 'platforms';
    platforms.innerHTML = `
      ${p.android_url ? '<span class="platform"><i class="fa-brands fa-android"></i></span>' : ''}
      ${p.ios_link ? '<span class="platform"><i class="fa-brands fa-apple"></i></span>' : ''}
      ${p.web_link ? '<span class="platform"><i class="fa-solid fa-desktop"></i></span>' : ''}
    `;

    meta.appendChild(price);
    meta.appendChild(platforms);

    const cta = document.createElement('div');
    cta.className = 'app-cta';
    cta.innerHTML = `<span>Ver detalhes</span><i class="fa-solid fa-arrow-right"></i>`;

    body.appendChild(top);
    body.appendChild(desc);
    body.appendChild(meta);
    body.appendChild(cta);

    a.appendChild(media);
    a.appendChild(body);
    card.appendChild(a);
    list.appendChild(card);
  });
}
