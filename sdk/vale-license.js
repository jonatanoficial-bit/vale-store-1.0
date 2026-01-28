/*
 * Vale Games Store — License SDK (Serial)
 *
 * Objetivo: reduzir compartilhamento indevido.
 * - Ativação por serial
 * - Limite de ativações por dispositivo (ex.: 2)
 *
 * Requisitos:
 * - Seu app precisa rodar em HTTPS
 * - Você precisa ter o backend (Cloudflare Worker) ativo
 *
 * Uso rápido:
 *   <script src="https://SEU_SITE/sdk/vale-license.js"></script>
 *   <script>
 *     ValeLicense.bootstrap({
 *       apiBase: 'https://SEU_WORKER.workers.dev',
 *       storageKey: 'myapp_license',
 *       appName: 'Meu App',
 *       onValid: () => document.body.classList.add('premium'),
 *       onInvalid: () => document.body.classList.remove('premium')
 *     });
 *   </script>
 */

(function () {
  const DEFAULT_STORAGE_KEY = 'vale_license_key';
  const DEVICE_KEY = 'vale_device_id';

  function uuid() {
    // UUID simples (LGPD-friendly; não coleta dados pessoais)
    if (crypto?.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getDeviceId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = uuid();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }

  async function postJson(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  async function validate(apiBase, licenseKey) {
    const deviceId = getDeviceId();
    const { ok, data } = await postJson(`${apiBase.replace(/\/$/, '')}/api/license/validate`, {
      licenseKey,
      deviceId
    });
    if (!ok) return { valid: false, reason: data?.reason || 'error' };
    return { valid: !!data?.valid, activationsMax: data?.activationsMax, activationsUsed: data?.activationsUsed };
  }

  async function activate(apiBase, licenseKey) {
    const deviceId = getDeviceId();
    const { ok, data, status } = await postJson(`${apiBase.replace(/\/$/, '')}/api/license/activate`, {
      licenseKey,
      deviceId
    });
    if (!ok) {
      return { ok: false, status, error: data?.error || 'Falha ao ativar' };
    }
    return { ok: true, status: data?.status || 'activated', activationsLeft: data?.activationsLeft };
  }

  function createBasicModal({ appName }) {
    const wrap = document.createElement('div');
    wrap.style.position = 'fixed';
    wrap.style.inset = '0';
    wrap.style.background = 'rgba(0,0,0,.6)';
    wrap.style.backdropFilter = 'blur(10px)';
    wrap.style.display = 'grid';
    wrap.style.placeItems = 'center';
    wrap.style.zIndex = '9999';

    const card = document.createElement('div');
    card.style.width = 'min(520px, 92vw)';
    card.style.background = 'rgba(20,22,30,.92)';
    card.style.border = '1px solid rgba(255,255,255,.12)';
    card.style.borderRadius = '18px';
    card.style.boxShadow = '0 20px 60px rgba(0,0,0,.55)';
    card.style.padding = '16px';
    card.style.color = 'rgba(240,245,255,.92)';
    card.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Arial';

    card.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
        <div>
          <div style="font-size:18px; font-weight:800;">Ativar licença</div>
          <div style="font-size:13px; opacity:.85; margin-top:2px;">${escapeHtml(appName || 'App')} • Vale Games Store</div>
        </div>
      </div>
      <div style="margin-top:12px; font-size:13px; opacity:.9; line-height:1.45;">
        Insira seu <strong>serial</strong> para ativar. O serial é enviado após a compra.
      </div>
      <div style="margin-top:12px; display:grid; gap:10px;">
        <input id="vg_serial" placeholder="Ex: VG-ABCD-EFGH-IJKL" style="width:100%; padding:12px 12px; border-radius:14px; border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.06); color:rgba(240,245,255,.92); outline:none;" />
        <button id="vg_activate" style="padding:12px 12px; border-radius:14px; border:0; background:linear-gradient(135deg, rgba(91,43,224,1), rgba(0,201,255,1)); color:white; font-weight:800; cursor:pointer;">Ativar</button>
        <div id="vg_msg" style="font-size:12px; opacity:.9; min-height:18px;"></div>
      </div>
      <div style="margin-top:12px; font-size:12px; opacity:.75;">
        Dica: limite de ativações por compra ajuda a reduzir compartilhamento indevido.
      </div>
    `;

    wrap.appendChild(card);
    document.body.appendChild(wrap);

    return {
      wrap,
      input: card.querySelector('#vg_serial'),
      btn: card.querySelector('#vg_activate'),
      msg: card.querySelector('#vg_msg'),
      close: () => wrap.remove()
    };
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  async function bootstrap(opts) {
    const apiBase = String(opts?.apiBase || '').trim();
    if (!apiBase) throw new Error('ValeLicense: apiBase obrigatório');

    const storageKey = String(opts?.storageKey || DEFAULT_STORAGE_KEY);
    const appName = String(opts?.appName || '');
    const onValid = typeof opts?.onValid === 'function' ? opts.onValid : () => {};
    const onInvalid = typeof opts?.onInvalid === 'function' ? opts.onInvalid : () => {};

    // 1) Tenta serial salvo
    let licenseKey = String(localStorage.getItem(storageKey) || '').trim().toUpperCase();

    // 2) Valida
    if (licenseKey) {
      const v = await validate(apiBase, licenseKey);
      if (v.valid) {
        onValid(v);
        return { valid: true, licenseKey };
      }
      // Serial existe mas não está ativado neste device
      onInvalid(v);
    }

    // 3) Abre UI de ativação
    const modal = createBasicModal({ appName });
    modal.btn.addEventListener('click', async () => {
      const raw = String(modal.input.value || '').trim().toUpperCase();
      if (!raw) {
        modal.msg.textContent = 'Digite seu serial.';
        return;
      }
      modal.msg.textContent = 'Ativando…';
      const out = await activate(apiBase, raw);
      if (!out.ok) {
        modal.msg.textContent = out.error || 'Falha ao ativar.';
        return;
      }
      localStorage.setItem(storageKey, raw);
      const v = await validate(apiBase, raw);
      if (v.valid) {
        modal.msg.textContent = 'Ativado ✅';
        setTimeout(() => {
          modal.close();
          onValid(v);
        }, 350);
      } else {
        modal.msg.textContent = 'Não foi possível validar neste dispositivo.';
        onInvalid(v);
      }
    });

    return { valid: false, licenseKey: '' };
  }

  window.ValeLicense = {
    bootstrap,
    validate,
    activate,
    getDeviceId
  };
})();
