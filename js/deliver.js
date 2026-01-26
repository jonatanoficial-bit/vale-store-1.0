/*
 * deliver.js (Parte 1)
 *
 * Sem backend, a entrega precisa de um "cofre local":
 * - O vendedor (Admin) pode cadastrar códigos de entrega no localStorage.
 * - O comprador informa o código e libera os links.
 */

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('deliveryCode');
  const btn = document.getElementById('btnUnlock');
  const hint = document.getElementById('deliverHint');
  const result = document.getElementById('deliverResult');

  if (btn) {
    btn.addEventListener('click', () => {
      const code = (input?.value || '').trim().toUpperCase();
      if (!code) {
        setHint(hint, 'Digite um código.', true);
        return;
      }

      const payload = getDeliveryByCode(code);
      if (!payload) {
        setHint(hint, 'Código inválido ou ainda não liberado pelo vendedor.', true);
        if (result) result.classList.add('is-hidden');
        return;
      }

      setHint(hint, 'Desbloqueado!', false);
      if (result) {
        result.classList.remove('is-hidden');
        result.innerHTML = renderPayload(payload);
      }
    });
  }
});

function setHint(el, msg, isError) {
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? '#ff7a7a' : 'rgba(230,240,255,0.85)';
}

function getDeliveryByCode(code) {
  const vault = JSON.parse(localStorage.getItem('deliveries') || '{}');
  return vault[code] || null;
}

function renderPayload(p) {
  const rows = [];

  if (p.android_url) {
    rows.push(
      `<a class="btn btn-primary" href="${escapeAttr(p.android_url)}" target="_blank" rel="noreferrer">
        <i class="fa-brands fa-android"></i> Baixar Android (APK)
      </a>`
    );
  }

  if (p.ios_link) {
    rows.push(
      `<a class="btn btn-secondary" href="${escapeAttr(p.ios_link)}" target="_blank" rel="noreferrer">
        <i class="fa-brands fa-apple"></i> Acessar iOS
      </a>`
    );
  }

  if (p.web_link) {
    rows.push(
      `<a class="btn btn-secondary" href="${escapeAttr(p.web_link)}" target="_blank" rel="noreferrer">
        <i class="fa-solid fa-desktop"></i> Acessar Web/PC
      </a>`
    );
  }

  return `
    <h3 class="card-title">Entrega liberada</h3>
    <p class="card-text">${escapeHtml(p.note || 'Links liberados para este código.')}</p>
    <div class="deliver-actions">${rows.join('')}</div>
  `;
}

function escapeHtml(str) {
  return (str || '').toString().replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, '&#39;');
}
