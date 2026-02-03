/* admin.js (Supabase-first)
   - Mantém o visual/IDs do admin.html já existente
   - "Backend" agora significa: Supabase (free) via REST + Auth
*/
const DEFAULT_PASSWORD = 'admin';

function $(id){ return document.getElementById(id); }
function toast(msg){ alert(msg); }

function isLoggedIn(){
  return localStorage.getItem('vgs_admin_login') === '1';
}
function setLoggedIn(v){
  localStorage.setItem('vgs_admin_login', v ? '1' : '0');
}

function show(el, on){
  if(!el) return;
  el.classList.toggle('hidden', !on);
}

// ====== Login básico do painel (local) ======
function initLogin(){
  const form = $('loginForm');
  const input = $('adminPassword');
  const btn = $('loginBtn');
  const logout = $('logoutBtn');

  function sync(){
    show($('loginSection'), !isLoggedIn());
    show($('adminSection'), isLoggedIn());
  }
  sync();

  form?.addEventListener('submit',(e)=>{
    e.preventDefault();
    const pass = (input?.value||'').trim();
    if(pass === DEFAULT_PASSWORD){
      setLoggedIn(true);
      sync();
    }else{
      toast('Senha incorreta (padrão: admin). Você pode mudar isso no admin.js');
    }
  });
  btn?.addEventListener('click',()=> form?.requestSubmit());

  logout?.addEventListener('click',()=>{
    setLoggedIn(false);
    sbClearAdminAuth();
    sync();
  });
}

// ====== Supabase Backend (Orders/Serial) ======
function supabaseReady(){
  return (typeof sbConfigured === 'function') && sbConfigured();
}

function vgsMakeCode(prefix){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for(let i=0;i<6;i++) s += chars[Math.floor(Math.random()*chars.length)];
  const t = Date.now().toString(36).toUpperCase();
  return `${prefix}-${s}-${t}`.replace(/[^A-Z0-9-]/g,'');
}

async function ensureBackendAuth(){
  if(!supabaseReady()){
    toast('SUPABASE não configurado (js/config.js).');
    throw new Error('no supabase');
  }
  let jwt = sbGetAdminJwt();
  if(jwt) return jwt;

  const pass = ($('backendSecret')?.value||'').trim();
  if(!pass){
    toast('Digite a SENHA do Admin do Supabase no campo "Admin Secret".');
    throw new Error('missing password');
  }
  const auth = await sbAuthLogin(pass);
  sbSetAdminAuth(auth);
  return auth.access_token;
}

function renderBackendOrders(list){
  const box = $('backendOrdersList');
  if(!box) return;
  box.innerHTML = '';
  show(box, true);

  if(!list || !list.length){
    box.innerHTML = '<div class="muted">Nenhum pedido encontrado.</div>';
    return;
  }

  list.forEach(o=>{
    const paid = (o.status === 'paid' || o.status === 'delivered');
    const token = o.deliver_token || '';
    const el = document.createElement('div');
    el.className = 'admin-item';
    el.innerHTML = `
      <div class="row" style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap">
        <div>
          <div style="font-weight:700">${o.product_name || o.product_slug}</div>
          <div class="muted" style="font-size:12px">Pedido: <b>${o.order_code}</b> • Status: <b>${o.status}</b> • Total: R$ ${Number(o.total||0).toFixed(2)}</div>
          ${token ? `<div class="muted" style="font-size:12px">Token: <b>${token}</b></div>` : ''}
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap">
          <button class="button secondary" data-act="markPaid">Marcar pago</button>
          <button class="button secondary" data-act="regen">Gerar novo token</button>
          <a class="button primary" data-act="openDeliver" href="${location.origin}${location.pathname.replace(/\/[^\/]*$/,'')}/deliver.html" target="_blank" rel="noopener">Abrir Entrega</a>
        </div>
      </div>
    `;
    el.querySelector('[data-act="markPaid"]').addEventListener('click',()=> markPaid(o));
    el.querySelector('[data-act="regen"]').addEventListener('click',()=> regenToken(o));
    el.querySelector('[data-act="openDeliver"]').addEventListener('click',(e)=>{
      // apenas abre a página; token o admin copia e manda pro cliente
    });
    box.appendChild(el);
  });
}

async function fetchOrders(){
  const jwt = await ensureBackendAuth();
  const filter = ($('backendOrdersFilter')?.value||'all').toLowerCase();
  let rows = await sbSelect('orders', {'select':'*','order':'created_at.desc','limit':'100'}, {jwt});
  if(filter === 'paid') rows = rows.filter(o=> (o.status==='paid' || o.status==='delivered'));
  if(filter === 'pending') rows = rows.filter(o=> (o.status==='created'));
  renderBackendOrders(rows);
}

async function markPaid(order){
  const jwt = await ensureBackendAuth();
  const token = order.deliver_token && order.deliver_token.trim() ? order.deliver_token.trim() : vgsMakeCode('AV');

  // Pega produto (para links)
  const prows = await sbSelect('products', {slug:'eq.'+String(order.product_slug||'')}, {jwt});
  const p = prows && prows[0] ? prows[0] : null;

  // Atualiza pedido
  await sbUpdate('orders', {order_code:'eq.'+order.order_code}, {
    status:'paid',
    deliver_token: token,
    paid_at: new Date().toISOString()
  }, {jwt});

  // Upsert entrega (se já existe, atualiza)
  const existing = await sbSelect('deliveries', {token:'eq.'+token}, {jwt:null}).catch(()=>[]);
  if(existing && existing.length){
    // nada
  }else{
    await sbInsert('deliveries',[{
      token,
      product_slug: String(order.product_slug||''),
      product_name: String(order.product_name||order.product_slug||''),
      android_url: p?.android_url || '',
      ios_link: p?.ios_link || '',
      web_link: p?.web_link || ''
    }], {jwt});
  }

  toast('Pago confirmado! Token: '+token+'\n\nEnvie esse token ao cliente.');
  await fetchOrders();
}

async function regenToken(order){
  const jwt = await ensureBackendAuth();
  const oldToken = (order.deliver_token||'').trim();
  if(!oldToken){
    toast('Esse pedido ainda não tem token. Use "Marcar pago" primeiro.');
    return;
  }
  const newToken = vgsMakeCode('AV');

  await sbUpdate('orders', {order_code:'eq.'+order.order_code}, {deliver_token:newToken}, {jwt});
  // Para simplicidade: cria uma nova entrega; a antiga pode expirar no futuro
  const prows = await sbSelect('products', {slug:'eq.'+String(order.product_slug||'')}, {jwt});
  const p = prows && prows[0] ? prows[0] : null;
  await sbInsert('deliveries',[{
    token:newToken,
    product_slug:String(order.product_slug||''),
    product_name:String(order.product_name||order.product_slug||''),
    android_url: p?.android_url || '',
    ios_link: p?.ios_link || '',
    web_link: p?.web_link || ''
  }], {jwt});

  toast('Novo token: '+newToken+'\n\nO token antigo continua existindo (você pode revogar depois).');
  await fetchOrders();
}

async function createBackendOrder(){
  const jwt = await ensureBackendAuth();
  const sel = $('createBackendOrderProduct');
  const markPaidBox = $('createBackendMarkPaid');
  const pslug = sel?.value || '';
  if(!pslug){ toast('Selecione um produto'); return; }

  const prows = await sbSelect('products', {slug:'eq.'+pslug}, {jwt});
  const p = prows && prows[0] ? prows[0] : null;
  if(!p){ toast('Produto não encontrado no Supabase.'); return; }

  const order_code = vgsMakeCode('ORD');
  const token = markPaidBox?.checked ? vgsMakeCode('AV') : '';
  await sbInsert('orders',[{
    order_code,
    product_slug: p.slug,
    product_name: p.name,
    total: Number(p.price||0),
    status: markPaidBox?.checked ? 'paid' : 'created',
    deliver_token: token,
    paid_at: markPaidBox?.checked ? new Date().toISOString() : null
  }], {jwt});

  if(markPaidBox?.checked){
    await sbInsert('deliveries',[{
      token,
      product_slug:p.slug,
      product_name:p.name,
      android_url:p.android_url||'',
      ios_link:p.ios_link||'',
      web_link:p.web_link||''
    }], {jwt});
    toast('Pedido criado e PAGO. Token: '+token);
  }else{
    toast('Pedido criado (pendente). Código: '+order_code);
  }
  await fetchOrders();
}

async function fillProductSelect(){
  const sel = $('createBackendOrderProduct');
  if(!sel) return;
  // tenta supabase primeiro
  if(supabaseReady()){
    try{
      const rows = await sbSelect('products', {'select':'slug,name,price','order':'updated_at.desc','limit':'200'}, {jwt:null});
      sel.innerHTML = rows.map(p=>`<option value="${p.slug}">${p.name} — R$ ${Number(p.price||0).toFixed(2)}</option>`).join('');
      return;
    }catch(e){ /* fallback */ }
  }
  // fallback: catálogos locais (content)
  if(Array.isArray(window.__VGS_CATALOG__) && window.__VGS_CATALOG__.length){
    sel.innerHTML = window.__VGS_CATALOG__.map(p=>`<option value="${p.slug}">${p.name}</option>`).join('');
  }
}

function initBackendUI(){
  const btnBackend = $('ordersModeBackend');
  const btnRefresh = $('refreshBackendOrders');
  const btnCreate = $('createBackendOrderBtn');

  btnBackend?.addEventListener('click', async ()=>{
    try{
      await ensureBackendAuth();
      toast('Conectado ao Supabase!');
      await fillProductSelect();
      await fetchOrders();
    }catch(e){
      toast(e.message || 'Falha ao conectar');
    }
  });

  btnRefresh?.addEventListener('click', async ()=>{
    try{ await fetchOrders(); }catch(e){ toast(e.message || 'Erro'); }
  });

  btnCreate?.addEventListener('click', async ()=>{
    try{ await createBackendOrder(); }catch(e){ toast(e.message || 'Erro'); }
  });

  $('backendOrdersFilter')?.addEventListener('change', ()=>{
    fetchOrders().catch(()=>{});
  });
}

document.addEventListener('DOMContentLoaded',()=>{
  initLogin();
  initBackendUI();
  fillProductSelect().catch(()=>{});
});
