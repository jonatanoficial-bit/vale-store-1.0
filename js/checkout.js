/*
 * checkout.js (Parte 1)
 *
 * Fluxo sem backend (0 custo):
 * - Abre link de pagamento externo (configurado no produto)
 * - Gera um "código de compra" para o cliente enviar ao vendedor
 * - Registra o pedido em localStorage (para aparecer no Admin)
 */

document.addEventListener('DOMContentLoaded', () => {
  boot();
});

async function boot() {
  const slug = getParam('slug');
  const root = document.getElementById('checkout');
  if (!root) return;

  if (!slug) {
    root.innerHTML = renderError('Produto não informado.');
    return;
  }

  const product = await findProductBySlug(slug);
  if (!product) {
    root.innerHTML = renderError('Produto não encontrado.');
    return;
  }

  document.title = `Checkout • ${product.name} • AppVault`;
  root.innerHTML = renderCheckout(product);

  const btnPay = document.getElementById('btnPay');
  const btnIpaid = document.getElementById('btnIpaid');
  const codeBox = document.getElementById('purchaseCodeBox');
  const codeText = document.getElementById('purchaseCode');
  const copyBtn = document.getElementById('btnCopyCode');

  if (btnPay) {
    btnPay.addEventListener('click', () => {
      if (!product.payLink) {
        alert('Este produto não tem link de pagamento configurado.');
        return;
      }
      window.open(product.payLink, '_blank');
    });
  }

  if (btnIpaid) {
    btnIpaid.addEventListener('click', () => {
      const purchaseCode = makeCode('AV');
      const order = {
        orderId: makeCode('ORD'),
        purchaseCode,
        productId: product.id,
        productName: product.name,
        price: product.price,
        createdAt: new Date().toISOString(),
        status: 'paid_unverified'
      };
      saveOrder(order);
      if (codeText) codeText.textContent = purchaseCode;
      if (codeBox) codeBox.classList.remove('is-hidden');
      if (btnIpaid) btnIpaid.setAttribute('disabled', 'disabled');
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const val = (codeText?.textContent || '').trim();
      if (!val) return;
      try {
        await navigator.clipboard.writeText(val);
        copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copiado';
        setTimeout(() => (copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Copiar'), 1200);
      } catch {
        alert('Não foi possível copiar automaticamente. Selecione e copie manualmente.');
      }
    });
  }
}

function getParam(key) {
  const url = new URL(window.location.href);
  return (url.searchParams.get(key) || '').trim();
}

async function findProductBySlug(slug) {
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

  const normalized = products.map(normalizeProduct);
  return normalized.find((p) => p.slug === slug) || normalized.find((p) => p.id === slug);
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
    image: p.image || 'assets/default-app.png',
    price: typeof p.price === 'number' ? p.price : Number(p.price || 0),
    payLink: p.payLink || '',
  };
}

function renderCheckout(p) {
  const priceLabel = p.price > 0 ? `R$ ${p.price.toFixed(2)}` : 'Grátis';
  const hasPay = !!p.payLink;
  const buyHint = hasPay
    ? 'Clique em “Pagar agora” para abrir o link do pagamento.'
    : 'Este produto está sem link de pagamento. Configure no Admin.';

  return `
    <section class="section-head">
      <div>
        <h2 class="section-title">Checkout</h2>
        <p class="section-subtitle">${escapeHtml(buyHint)}</p>
      </div>
    </section>

    <article class="card checkout-card">
      <div class="checkout-product">
        <img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.name)}" />
        <div>
          <div class="checkout-title">${escapeHtml(p.name)}</div>
          <div class="checkout-price">${escapeHtml(priceLabel)}</div>
        </div>
      </div>

      <div class="checkout-actions">
        <button class="btn btn-primary" id="btnPay" type="button" ${hasPay ? '' : 'disabled'}>
          <i class="fa-solid fa-qrcode"></i> Pagar agora
        </button>

        <button class="btn btn-secondary" id="btnIpaid" type="button">
          <i class="fa-solid fa-receipt"></i> Já paguei (gerar código)
        </button>
      </div>

      <div class="card is-hidden" id="purchaseCodeBox">
        <h3 class="card-title">Seu código de compra</h3>
        <p class="card-text">
          Envie este código + comprovante para o vendedor. Após confirmar, ele vai te mandar o código de entrega.
        </p>
        <div class="code-row">
          <div class="code" id="purchaseCode">AV-XXXXXX</div>
          <button class="btn btn-ghost" id="btnCopyCode" type="button">
            <i class="fa-regular fa-copy"></i> Copiar
          </button>
        </div>
        <div class="checkout-next">
          <a class="ghost-link" href="deliver.html">
            Ir para entrega <i class="fa-solid fa-arrow-right"></i>
          </a>
        </div>
      </div>
    </article>
  `;
}

function renderError(msg) {
  return `
    <article class="card">
      <h2 class="section-title">Ops…</h2>
      <p class="section-subtitle">${escapeHtml(msg)}</p>
      <a class="btn btn-primary" href="index.html"><i class="fa-solid fa-house"></i> Voltar</a>
    </article>
  `;
}

function saveOrder(order) {
  const orders = JSON.parse(localStorage.getItem('orders') || '[]');
  orders.unshift(order);
  localStorage.setItem('orders', JSON.stringify(orders));
}

function makeCode(prefix) {
  const n = Math.floor(Math.random() * 0xffffff);
  return `${prefix}-${n.toString(16).toUpperCase().padStart(6, '0')}`;
}

function escapeHtml(str) {
  return (str || '').toString().replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, '&#39;');
}
