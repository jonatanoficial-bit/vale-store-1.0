/*
 * library.js (Parte 4)
 *
 * "Minha Biblioteca" (sem login e sem backend):
 * - Lista apps que foram desbloqueados neste navegador
 * - Lê a biblioteca de localStorage (K_LIBRARY)
 * - Resolve detalhes dos produtos via manifest.json + DLCs
 */

const K_LIBRARY = 'library';

document.addEventListener('DOMContentLoaded', () => {
  boot();
});

async function boot() {
  const root = document.getElementById('libraryList');
  if (!root) return;

  const lib = getLibrary();
  if (!lib.length) {
    root.innerHTML = renderEmpty();
    return;
  }

  const { products } = await loadAllProducts();
  const map = new Map(products.map((p) => [p.slug, p]));

  const items = lib
    .map((i) => ({
      ...i,
      product: map.get(i.slug) || null,
    }))
    .filter((i) => i.product);

  if (!items.length) {
    root.innerHTML = renderEmpty();
    return;
  }

  root.innerHTML = items.map((i) => renderCard(i.product, i)).join('');
}

function getLibrary() {
  try {
    const raw = localStorage.getItem(K_LIBRARY);
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function loadAllProducts() {
  const res = await fetch('content/manifest.json');
  const data = await res.json();
  let products = Array.isArray(data.products) ? data.products : [];

  if (Array.isArray(data.dlcs)) {
    for (const dlcPath of data.dlcs) {
      try {
        const dlcRes = await fetch('content/' + dlcPath);
        const dlcData = await dlcRes.json();
        if (Array.isArray(dlcData.products)) products = products.concat(dlcData.products);
      } catch (e) {
        console.warn('DLC falhou:', dlcPath, e);
      }
    }
  }

  return { products: products.map(normalizeProduct) };
}

function normalizeProduct(p) {
  const slug = (p.slug || p.id || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');

  return {
    ...p,
    slug,
    name: p.name || 'Produto',
    image: p.image || 'assets/default-app.png',
    category: p.category || 'Geral',
  };
}

function renderCard(p, meta) {
  const unlockedAt = meta.unlockedAt ? new Date(meta.unlockedAt).toLocaleString('pt-BR') : '';
  return `
    <article class="card product-card">
      <div class="product-img">
        <img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.name)}" loading="lazy" />
      </div>
      <div class="product-body">
        <div class="product-meta">
          <span class="badge">${escapeHtml(p.category)}</span>
          ${unlockedAt ? `<span class="pill"><i class=\"fa-regular fa-clock\"></i> ${escapeHtml(unlockedAt)}</span>` : ''}
        </div>
        <h3 class="product-title">${escapeHtml(p.name)}</h3>
        <p class="product-desc">${escapeHtml(p.description || '')}</p>
        <div class="product-actions">
          <a class="btn btn-secondary" href="product.html?slug=${encodeURIComponent(p.slug)}">
            <i class="fa-solid fa-circle-info"></i> Ver produto
          </a>
          <a class="btn btn-primary" href="deliver.html">
            <i class="fa-solid fa-key"></i> Desbloquear/baixar
          </a>
        </div>
      </div>
    </article>
  `;
}

function renderEmpty() {
  return `
    <article class="card">
      <h3 class="card-title">Nada por aqui…</h3>
      <p class="card-text">Você ainda não desbloqueou nenhum app neste navegador.</p>
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
        <a class="btn btn-primary" href="index.html"><i class="fa-solid fa-store"></i> Ver catálogo</a>
        <a class="btn btn-secondary" href="deliver.html"><i class="fa-solid fa-key"></i> Já comprei</a>
      </div>
    </article>
  `;
}

function escapeHtml(str) {
  return (str || '').toString().replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, '&#39;');
}
