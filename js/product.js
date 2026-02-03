/*
 * product.js (Parte 1)
 *
 * Página de produto:
 * - Lê ?slug=
 * - Carrega catálogo (manifest + DLCs)
 * - Renderiza descrição, galeria e CTAs
 */

document.addEventListener('DOMContentLoaded', () => {
  boot();
});

async function boot() {
  const slug = getParam('slug');
  const container = document.getElementById('product');
  const skeleton = document.getElementById('product-skeleton');

  if (!slug) {
    if (container) container.innerHTML = renderNotFound('Produto não informado.');
    if (skeleton) skeleton.remove();
    return;
  }

  const { products: catalog, site } = await loadCatalog();
  const product = catalog.find((p) => p.slug === slug) || catalog.find((p) => p.id === slug);

  if (skeleton) skeleton.remove();

  if (!product) {
    if (container) container.innerHTML = renderNotFound('Produto não encontrado.');
    return;
  }

  document.title = `${product.name} • Vale Games Store`;
  applySeo(product);

  if (container) container.innerHTML = renderProduct(product, site);

  // Gallery thumbs
  document.querySelectorAll('[data-shot]').forEach((el) => {
    el.addEventListener('click', () => {
      const src = el.getAttribute('data-shot');
      const hero = document.getElementById('product-hero-img');
      if (hero && src) hero.setAttribute('src', src);
    });
  });
}

function applySeo(product) {
  const desc = (product.description || product.longDescription || '').toString().slice(0, 160);
  setMeta('description', desc);
  setMeta('og:title', `${product.name} • Vale Games Store`, true);
  setMeta('og:description', desc, true);
  setMeta('og:type', 'product', true);

  // JSON-LD (Schema.org) básico para rich snippets
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: desc,
    image: [absoluteUrl(product.image)],
    category: product.category,
    sku: product.id,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BRL',
      price: Number(product.price || 0).toFixed(2),
      availability: 'https://schema.org/InStock',
      url: absoluteUrl(`product.html?slug=${encodeURIComponent(product.slug)}`),
    },
  };
  if (product.rating && product.reviewsCount) {
    ld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(product.rating),
      reviewCount: String(product.reviewsCount),
    };
  }

  upsertJsonLd(ld);
}

function setMeta(key, content, isProperty = false) {
  if (!content) return;
  const sel = isProperty ? `meta[property="${key}"]` : `meta[name="${key}"]`;
  let el = document.querySelector(sel);
  if (!el) {
    el = document.createElement('meta');
    if (isProperty) el.setAttribute('property', key);
    else el.setAttribute('name', key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertJsonLd(obj) {
  const id = 'ld-product';
  let s = document.getElementById(id);
  if (!s) {
    s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = id;
    document.head.appendChild(s);
  }
  s.textContent = JSON.stringify(obj);
}

function absoluteUrl(path) {
  try {
    return new URL(path, window.location.href).toString();
  } catch {
    return path;
  }
}

function getParam(key) {
  const url = new URL(window.location.href);
  return (url.searchParams.get(key) || '').trim();
}

async function loadCatalog() {
  const res = await fetch('content/manifest.json');
  const data = await res.json();
  const site = {
    support: {
      whatsapp: (data.support?.whatsapp || '').toString(),
      message: (data.support?.message || '').toString(),
    },
  };
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

  return { site, products: products.map(normalizeProduct) };
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

function renderNotFound(msg) {
  return `
    <div class="card">
      <h2 class="section-title">Ops…</h2>
      <p class="section-subtitle">${escapeHtml(msg)}</p>
      <a class="btn btn-primary" href="index.html">
        <i class="fa-solid fa-house"></i> Voltar ao catálogo
      </a>
    </div>
  `;
}

function renderProduct(p, site) {
  const shots = [p.image, ...(p.screenshots || [])].filter(Boolean).slice(0, 6);
  const priceLabel = p.price > 0 ? `R$ ${p.price.toFixed(2)}` : 'Grátis';
  const buyLabel = p.price > 0 ? 'Comprar' : 'Obter';

  const platforms = `
    ${p.android_url ? '<span class="pill"><i class="fa-brands fa-android"></i> Android</span>' : ''}
    ${p.ios_link ? '<span class="pill"><i class="fa-brands fa-apple"></i> iOS</span>' : ''}
    ${p.web_link ? '<span class="pill"><i class="fa-solid fa-desktop"></i> Web/PC</span>' : ''}
  `;

  const features = (p.features || []).slice(0, 10).map((f) => `<li>${escapeHtml(f)}</li>`).join('');
  const tags = (p.tags || []).slice(0, 8).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('');

  const rating = p.rating ? `${p.rating.toFixed(1)}★` : '—';
  const reviewsLabel = p.reviewsCount ? `${p.reviewsCount} avaliações` : 'Sem avaliações';

  const faqHtml = (p.faq || []).slice(0, 8).map((it, idx) => {
    const q = escapeHtml(it?.q || '');
    const a = escapeHtml(it?.a || '');
    return `
      <details class="accordion" ${idx === 0 ? 'open' : ''}>
        <summary><span>${q}</span><i class="fa-solid fa-chevron-down"></i></summary>
        <div class="accordion-body"><p>${a}</p></div>
      </details>
    `;
  }).join('');

  const changeHtml = (p.changelog || []).slice(0, 8).map((c) => {
    const v = escapeHtml(c?.v || '');
    const date = escapeHtml(c?.date || '');
    const items = Array.isArray(c?.items) ? c.items.map((x) => `<li>${escapeHtml(x)}</li>`).join('') : '';
    return `
      <div class="change">
        <div class="change-head">
          <strong>v${v}</strong>
          ${date ? `<span>${date}</span>` : ''}
        </div>
        ${items ? `<ul>${items}</ul>` : ''}
      </div>
    `;
  }).join('');

  const waRaw = (site?.support?.whatsapp || '').replace(/\D/g, '');
  const waOk = waRaw && waRaw.length >= 10;
  const waMsg = encodeURIComponent(site?.support?.message || `Olá! Tenho dúvidas sobre o app: ${p.name}`);
  const waHref = waOk ? `https://wa.me/${waRaw}?text=${waMsg}` : '';

  return `
    <div class="product-hero">
      <div class="product-media">
        <img id="product-hero-img" src="${escapeAttr(shots[0] || p.image)}" alt="${escapeAttr(p.name)}" />
        <div class="thumbs">
          ${shots
            .map(
              (src) =>
                `<button type="button" class="thumb" data-shot="${escapeAttr(src)}" aria-label="Ver imagem">
                  <img src="${escapeAttr(src)}" alt="" />
                </button>`
            )
            .join('')}
        </div>
      </div>

      <div class="product-info">
        <div class="product-top">
          <div>
            <h1 class="product-title">${escapeHtml(p.name)}</h1>
            <p class="product-sub">${escapeHtml(p.description || '')}</p>
          </div>
          <span class="badge">${escapeHtml(p.category)}</span>
        </div>

        <div class="product-price">
          <div class="price-big">${escapeHtml(priceLabel)}</div>
          <div class="product-meta">
            <span class="rating">${escapeHtml(rating)}</span>
            <span class="dot"></span>
            <span>${escapeHtml(reviewsLabel)}</span>
          </div>
          <div class="product-meta">Versão ${escapeHtml(p.version)} ${p.updatedAt ? '• Atualizado: ' + escapeHtml(p.updatedAt) : ''}</div>
        </div>

        <div class="product-platforms">${platforms}</div>

        <div class="product-actions">
          <a class="btn btn-primary" href="checkout.html?slug=${encodeURIComponent(p.slug)}">
            <i class="fa-solid fa-bag-shopping"></i> ${buyLabel}
          </a>
          ${waOk ? `<a class="btn btn-secondary" href="${waHref}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> Suporte</a>` : ''}
          <a class="btn btn-ghost" href="index.html">
            <i class="fa-solid fa-grid-2"></i> Catálogo
          </a>
        </div>

        ${tags ? `<div class="tags">${tags}</div>` : ''}
      </div>
    </div>

    <div class="product-grid">
      <article class="card">
        <h3 class="card-title">Descrição</h3>
        <p class="card-text">${escapeHtml(p.longDescription || p.description || '')}</p>
      </article>

      <article class="card">
        <h3 class="card-title">Destaques</h3>
        ${features ? `<ul class="feature-list">${features}</ul>` : '<p class="card-text">Sem lista de destaques.</p>'}
      </article>

      <article class="card">
        <h3 class="card-title">Screenshots</h3>
        <div class="gallery">
          ${(shots || []).map((src) => `<img src="${escapeAttr(src)}" alt="" loading="lazy" />`).join('')}
        </div>
      </article>

      <article class="card">
        <h3 class="card-title">FAQ</h3>
        ${faqHtml || '<p class="card-text">Sem perguntas cadastradas.</p>'}
      </article>

      <article class="card">
        <h3 class="card-title">Changelog</h3>
        ${changeHtml || '<p class="card-text">Sem histórico de versões.</p>'}
      </article>

      <article class="card">
        <h3 class="card-title">Entrega (sem backend)</h3>
        <p class="card-text">
          Para manter custo <strong>zero</strong>, o pagamento é via link (Ton/PagBank etc.).
          Após pagar, você recebe um <strong>código de compra</strong>. O vendedor confirma e libera um
          <strong>código de entrega</strong> aqui.
        </p>
        <a class="btn btn-secondary" href="deliver.html">
          <i class="fa-solid fa-key"></i> Inserir código de entrega
        </a>
      </article>
    </div>
  `;
}

function escapeHtml(str) {
  return (str || '').toString().replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, '&#39;');
}
