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

  const ctx = await loadCheckoutContext(slug);
  const product = ctx.product;
  if (!product) {
    root.innerHTML = renderError('Produto não encontrado.');
    return;
  }

  document.title = `Checkout • ${product.name} • Vale Games Store`;
  root.innerHTML = renderCheckout(product, ctx.support);

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

  // Cupom
  const couponInput = document.getElementById('couponCode');
  const btnApplyCoupon = document.getElementById('btnApplyCoupon');
  const priceBox = document.getElementById('priceBox');
  let appliedCoupon = null;

  const recalc = () => {
    const breakdown = calcPrice(product.price, appliedCoupon);
    if (priceBox) priceBox.innerHTML = renderPriceBreakdown(breakdown);
  };
  recalc();

  if (btnApplyCoupon) {
    btnApplyCoupon.addEventListener('click', () => {
      const code = (couponInput?.value || '').trim().toUpperCase();
      if (!code) {
        alert('Digite um cupom.');
        return;
      }
      const c = (ctx.coupons || []).find((x) => String(x.code || '').toUpperCase() === code && x.active !== false);
      if (!c) {
        alert('Cupom inválido ou expirado.');
        return;
      }
      if (c.expiresAt) {
        const exp = new Date(c.expiresAt + 'T23:59:59');
        if (!isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
          alert('Cupom expirado.');
          return;
        }
      }
      appliedCoupon = normalizeCoupon(c);
      recalc();
      alert(`Cupom aplicado: ${appliedCoupon.code}`);
    });
  }

  if (btnIpaid) {
    btnIpaid.addEventListener('click', async () => {
      const breakdown = calcPrice(product.price, appliedCoupon);

      // Modo automação (Parte 8A): cria pedido no backend e redireciona para status
      if (typeof API_BASE !== 'undefined' && String(API_BASE || '').trim()) {
        try {
          btnIpaid.setAttribute('disabled', 'disabled');
          const api = String(API_BASE).replace(/\/$/, '');
          const payload = {
            slug: product.slug,
            productId: product.id,
            productName: product.name,
            subtotal: product.price,
            total: breakdown.total,
            coupon: appliedCoupon ? { code: appliedCoupon.code, type: appliedCoupon.type, value: appliedCoupon.value } : null
            ,payLink: product.payLink || ''
            ,android_url: product.android_url || ''
            ,ios_link: product.ios_link || ''
            ,web_link: product.web_link || ''
          };
          const res = await fetch(`${api}/api/order/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || 'Falha ao criar pedido');

          // Abre o link de pagamento e acompanha status do pedido
          if (data.payLink) window.open(data.payLink, '_blank');
          const orderUrl = data.orderUrl || `order.html?id=${encodeURIComponent(data.orderId)}`;
          window.location.href = orderUrl;
          return;
        } catch (err) {
          btnIpaid.removeAttribute('disabled');
          alert(String(err?.message || err));
          return;
        }
      }

      // Modo 100% estático (fallback): gera código para enviar ao vendedor
      const purchaseCode = makeCode('AV');
      const order = {
        orderId: makeCode('ORD'),
        purchaseCode,
        slug: product.slug,
        productId: product.id,
        productName: product.name,
        price: product.price,
        finalPrice: breakdown.total,
        coupon: appliedCoupon ? { code: appliedCoupon.code, type: appliedCoupon.type, value: appliedCoupon.value } : null,
        createdAt: new Date().toISOString(),
        status: 'paid_unverified'
      };
      saveOrder(order);
      if (codeText) codeText.textContent = purchaseCode;
      if (codeBox) codeBox.classList.remove('is-hidden');
      btnIpaid.setAttribute('disabled', 'disabled');
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

async function loadCheckoutContext(slug) {
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
  const product = normalized.find((p) => p.slug === slug) || normalized.find((p) => p.id === slug) || null;
  return {
    product,
    coupons: Array.isArray(data.coupons) ? data.coupons : safeJson(localStorage.getItem('coupons'), []),
    support: data.support || {}
  };
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
    android_url: p.android_url || '',
    ios_link: p.ios_link || '',
    web_link: p.web_link || '',
  };
}

function normalizeCoupon(c) {
  return {
    code: String(c.code || '').trim().toUpperCase(),
    type: c.type === 'fixed' ? 'fixed' : 'percent',
    value: typeof c.value === 'number' ? c.value : Number(c.value || 0)
  };
}

function calcPrice(price, coupon) {
  const subtotal = Number(price || 0);
  let discount = 0;
  if (coupon && subtotal > 0) {
    if (coupon.type === 'fixed') {
      discount = Math.min(subtotal, Math.max(0, coupon.value));
    } else {
      discount = Math.min(subtotal, Math.max(0, subtotal * (coupon.value / 100)));
    }
  }
  const total = Math.max(0, subtotal - discount);
  return { subtotal, discount, total };
}

function renderCheckout(p, support) {
  const priceLabel = p.price > 0 ? `R$ ${p.price.toFixed(2)}` : 'Grátis';
  const hasPay = !!p.payLink;
  const hasApi = (typeof API_BASE !== 'undefined' && String(API_BASE || '').trim());
  const buyHint = hasApi
    ? 'Automação ativa: após abrir o pagamento, você será levado para a tela de status do pedido.'
    : (hasPay
      ? 'Clique em “Pagar agora” para abrir o link do pagamento.'
      : 'Este produto está sem link de pagamento. Configure no Admin.');

  const waInput = support?.whatsapp ? String(support.whatsapp).trim() : '';
  let waLink = '';
  if (waInput) {
    if (/^https?:\/\//i.test(waInput) || waInput.includes('wa.me/')) {
      waLink = waInput;
    } else {
      const wa = waInput.replace(/\D/g, '');
      if (wa && wa.length >= 10) {
        const waMsg = support?.message ? encodeURIComponent(String(support.message)) : encodeURIComponent('Olá! Preciso de ajuda com uma compra.');
        waLink = `https://wa.me/${wa}?text=${waMsg}`;
      }
    }
  }

  return `
    <section class="section-head">
      <div>
        <h2 class="section-title">Checkout</h2>
        <p class="section-subtitle">${escapeHtml(buyHint)}</p>
      </div>
    </section>

    <div class="steps">
      <div class="step is-active"><span class="step-dot">1</span><span>Escolha</span></div>
      <div class="step"><span class="step-dot">2</span><span>Pague</span></div>
      <div class="step"><span class="step-dot">3</span><span>Receba</span></div>
    </div>

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
          <i class="fa-solid fa-receipt"></i> ${hasApi ? 'Criar pedido e acompanhar' : 'Já paguei (gerar código)'}
        </button>
      </div>

      <div class="checkout-grid">
        <div class="mini-card">
          <div class="mini-title"><i class="fa-solid fa-shield"></i> Compra segura</div>
          <div class="mini-text">Você paga no provedor (Ton/PagBank/etc.) e recebe um código para desbloquear a entrega.</div>
        </div>
        <div class="mini-card">
          <div class="mini-title"><i class="fa-solid fa-headset"></i> Suporte</div>
          <div class="mini-text">Precisou? Fale com o vendedor em 1 toque.</div>
          ${waLink ? `<a class="ghost-link" href="${escapeAttr(waLink)}" target="_blank" rel="noreferrer">Abrir WhatsApp <i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : `<span class="muted">WhatsApp não configurado</span>`}
        </div>
      </div>

      <div class="coupon-row">
        <div class="field">
          <label for="couponCode">Cupom</label>
          <input id="couponCode" type="text" placeholder="EX: BEMVINDO10" />
        </div>
        <button class="btn btn-secondary" id="btnApplyCoupon" type="button">
          <i class="fa-solid fa-ticket"></i> Aplicar
        </button>
      </div>

      <div id="priceBox"></div>

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

function renderPriceBreakdown(b) {
  const money = (n) => `R$ ${Number(n || 0).toFixed(2)}`;
  return `
    <div class="price-breakdown">
      <div class="row"><span>Subtotal</span><strong>${money(b.subtotal)}</strong></div>
      <div class="row"><span>Desconto</span><strong>${money(b.discount)}</strong></div>
      <div class="row total"><span>Total</span><strong>${money(b.total)}</strong></div>
    </div>
  `;
}

function safeJson(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
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
  const rand = cryptoRandomHex(8);
  const time = Date.now().toString(36).toUpperCase();
  return `${prefix}-${time}-${rand}`;
}

function cryptoRandomHex(bytes) {
  try {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  } catch {
    let out = '';
    for (let i = 0; i < bytes; i++) out += Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    return out.toUpperCase();
  }
}

function escapeHtml(str) {
  return (str || '').toString().replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, '&#39;');
}
