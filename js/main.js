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
let ACTIVE_FILTER = 'all';

document.addEventListener('DOMContentLoaded', () => {
  boot();
});

async function boot() {
  wireUI();
  CATALOG = await loadCatalog();
  render();
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
}

async function loadCatalog() {
  try {
    const response = await fetch('content/manifest.json');
    const data = await response.json();
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
