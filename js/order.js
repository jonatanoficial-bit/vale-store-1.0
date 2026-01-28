/*
 * order.js (Parte 8A)
 *
 * Página de status do pedido para o fluxo com backend (Cloudflare Worker).
 * - Lê orderId na URL (?id=ORD-...)
 * - Consulta o backend e mostra status (aguardando / pago)
 * - Quando pago, exibe botão para abrir a entrega com token
 */

document.addEventListener('DOMContentLoaded', () => {
  boot();
});

async function boot() {
  const root = document.getElementById('orderRoot');
  if (!root) return;

  const id = getParam('id');
  if (!id) {
    root.innerHTML = renderError('Pedido não informado.');
    return;
  }

  // Se não houver backend configurado, mostrar dica
  if (!window.API_BASE || !String(window.API_BASE).trim()) {
    root.innerHTML = renderStaticMode();
    return;
  }

  root.innerHTML = renderLoading(id);

  const poll = async () => {
    try {
      const res = await fetch(`${API_BASE.replace(/\/$/, '')}/api/order/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao consultar pedido');
      root.innerHTML = renderOrder(data);
    } catch (err) {
      root.innerHTML = renderError(String(err?.message || err));
    }
  };

  await poll();
  setInterval(poll, 6000);
}

function getParam(key) {
  const url = new URL(window.location.href);
  return (url.searchParams.get(key) || '').trim();
}

function renderLoading(id) {
  return `
    <section class="section-head">
      <div>
        <h2 class="section-title">Acompanhando pedido</h2>
        <p class="section-subtitle">Pedido: <strong>${escapeHtml(id)}</strong></p>
      </div>
    </section>
    <div class="card" style="padding:16px;">
      <div class="skeleton" style="height:16px; width:60%; margin-bottom:10px;"></div>
      <div class="skeleton" style="height:12px; width:90%;"></div>
    </div>
  `;
}

function renderOrder(o) {
  const status = String(o.status || 'created');
  const paid = status === 'paid';
  const title = paid ? 'Pagamento confirmado ✅' : 'Aguardando pagamento ⏳';
  const subtitle = paid
    ? 'Seu acesso está liberado. Clique abaixo para abrir a entrega.'
    : 'Assim que o pagamento for confirmado, esta página libera automaticamente o acesso.';

  const deliverUrl = o.deliverUrl || '';
  const licenseKey = (o.licenseKey || '').trim();
  const licenseBlock = paid && licenseKey ? `
    <div class="notice" style="margin-top:14px;">
      <h3><i class="fa-solid fa-key"></i> Serial (Licença)</h3>
      <p style="margin:6px 0 10px;">Guarde este serial. Ele ativa o app em até <strong>${Number(o.activationsMax || 2)}</strong> dispositivo(s).</p>
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
        <code style="padding:10px 12px; border-radius:12px; background:rgba(255,255,255,.06);">${escapeHtml(licenseKey)}</code>
        <button class="btn btn-ghost" type="button" onclick="navigator.clipboard.writeText('${escapeHtml(licenseKey)}')"><i class="fa-regular fa-copy"></i> Copiar serial</button>
      </div>
    </div>
  ` : '';

  return `
    <section class="section-head">
      <div>
        <h2 class="section-title">${title}</h2>
        <p class="section-subtitle">${escapeHtml(subtitle)}</p>
      </div>
    </section>

    <div class="card" style="padding:16px;">
      <div class="card-title">${escapeHtml(o.productName || 'Produto')}</div>
      <div class="card-sub">Pedido: <strong>${escapeHtml(o.orderId || '')}</strong></div>
      <div class="card-meta" style="margin-top:10px;">
        <span>Status: <strong>${escapeHtml(status)}</strong></span>
        <span class="dot"></span>
        <span>Total: <strong>${formatPrice(o.total)}</strong></span>
      </div>

      ${paid && deliverUrl ? `
        <div style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap;">
          <a class="btn btn-primary" href="${escapeHtml(deliverUrl)}"><i class="fa-solid fa-unlock"></i> Abrir entrega</a>
          <a class="btn btn-ghost" href="library.html"><i class="fa-solid fa-box"></i> Minha biblioteca</a>
        </div>
        ${licenseBlock}
      ` : `
        <div class="notice" style="margin-top:14px;">
          <h3><i class="fa-solid fa-circle-info"></i> Dica</h3>
          <p>Você pode manter esta página aberta. Ela atualiza automaticamente.</p>
        </div>
      `}
    </div>
  `;
}

function renderStaticMode() {
  return `
    <section class="section-head">
      <div>
        <h2 class="section-title">Modo 100% estático</h2>
        <p class="section-subtitle">Para usar automação (Parte 8A), configure <code>API_BASE</code> em <code>js/config.js</code>.</p>
      </div>
    </section>

    <div class="notice">
      <h3><i class="fa-solid fa-rocket"></i> Próximo passo</h3>
      <p>
        Suba o Worker (Cloudflare) e cole a URL do Worker em <code>js/config.js</code>. Depois volte ao checkout.
      </p>
    </div>
  `;
}

function renderError(msg) {
  return `
    <section class="section-head">
      <div>
        <h2 class="section-title">Ops…</h2>
        <p class="section-subtitle">${escapeHtml(msg)}</p>
      </div>
    </section>
    <a class="btn btn-ghost" href="index.html"><i class="fa-solid fa-arrow-left"></i> Voltar</a>
  `;
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatPrice(v) {
  const n = Number(v || 0);
  return `R$ ${n.toFixed(2)}`;
}
