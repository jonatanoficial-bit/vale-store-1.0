/*
 * deliver.js
 *
 * Dois modos:
 * 1) 100% estático (0 custo): código de entrega no localStorage (Admin libera manualmente)
 * 2) Automação (Parte 8A): token validado no backend (Cloudflare Worker)
 */

const K_DELIVERIES = 'deliveries';
const K_LIBRARY = 'library';

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('deliveryCode');
  const btn = document.getElementById('btnUnlock');
  const hint = document.getElementById('deliverHint');
  const result = document.getElementById('deliverResult');

  // Suporte a token por URL: deliver.html?token=...
  const token = getParam('token');
  if (token) {
    unlockAny(token, { hint, result, input });
  }

  if (btn) {
    btn.addEventListener('click', () => {
      const code = (input?.value || '').trim();
      if (!code) {
        setHint(hint, 'Digite um código ou token.', true);
        return;
      }
      unlockAny(code, { hint, result, input });
    });
  }
});

async function unlockAny(codeOrToken, ui) {
  const { hint, result, input } = ui;
  const value = String(codeOrToken || '').trim();
  if (!value) return;

  // Se existir backend configurado, tenta token primeiro
  if (typeof API_BASE !== 'undefined' && String(API_BASE || '').trim()) {
    const payload = await fetchDeliveryFromApi(value);
    if (payload) {
      if (input) input.value = value;
      setHint(hint, 'Entrega liberada ✅', false);
      saveToLibrary(payload);
      if (result) {
        result.classList.remove('is-hidden');
        result.innerHTML = renderPayload(payload);
      }
      return;
    }
  }

  // Fallback: cofre local (código tradicional)
  const code = value.toUpperCase();
  const payload = getDeliveryByCode(code);
  if (!payload) {
    setHint(hint, 'Código/token inválido ou ainda não liberado.', true);
    if (result) result.classList.add('is-hidden');
    return;
  }

  setHint(hint, 'Desbloqueado ✅', false);
  saveToLibrary(payload);
  if (result) {
    result.classList.remove('is-hidden');
    result.innerHTML = renderPayload(payload);
  }
}

async function fetchDeliveryFromApi(token) {
  try {
    const api = String(API_BASE).replace(/\/$/, '');
    const res = await fetch(`${api}/api/deliver/${encodeURIComponent(token)}`);
    const data = await res.json();
    if (!res.ok) return null;
    return data;
  } catch {
    return null;
  }
}

function getDeliveryByCode(code) {
  try {
    const vault = JSON.parse(localStorage.getItem(K_DELIVERIES) || '{}');
    return vault[code] || null;
  } catch {
    return null;
  }
}

function saveToLibrary(payload) {
  const slug = (payload.productSlug || payload.slug || payload.productId || payload.productName || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
  if (!slug) return;

  const list = safeJson(localStorage.getItem(K_LIBRARY), []);
  if (list.some((i) => i.slug === slug)) return;
  list.unshift({
    slug,
    productName: payload.productName || payload.name || '',
    unlockedAt: new Date().toISOString()
  });
  localStorage.setItem(K_LIBRARY, JSON.stringify(list));
}

function renderPayload(p) {
  const rows = [];

  const licenseSection = p.licenseKey ? `
    <div class="notice" style="margin-top:14px;">
      <h3><i class="fa-solid fa-key"></i> Seu Serial (Licença)</h3>
      <p style="margin:6px 0 10px;">Guarde este serial. Ele ativa o app em até <strong>${Number(p.activationsMax || 2)}</strong> dispositivo(s).</p>
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
        <code style="padding:10px 12px; border-radius:12px; background:rgba(255,255,255,.06);">${escapeHtml(p.licenseKey)}</code>
        <button class="btn btn-ghost" type="button" onclick="navigator.clipboard.writeText('${escapeAttr(p.licenseKey)}')">
          <i class="fa-regular fa-copy"></i> Copiar serial
        </button>
      </div>
      <p class="hint" style="margin-top:10px;">Dica: o desenvolvedor pode exigir esse serial dentro do app para reduzir compartilhamento indevido.</p>
    </div>
  ` : '';

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
    <p class="card-text">${escapeHtml(p.note || 'Links liberados para este acesso.')}</p>
    ${licenseSection}
    <div class="deliver-actions">${rows.join('')}</div>
  `;
}

function getParam(key) {
  const url = new URL(window.location.href);
  return (url.searchParams.get(key) || '').trim();
}

function setHint(el, msg, isError) {
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? '#ff7a7a' : 'rgba(230,240,255,0.85)';
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

function escapeAttr(str) {
  return escapeHtml(str);
}
