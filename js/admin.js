/*
 * admin.js (Parte 2)
 *
 * Objetivo: operar a loja com 0 investimento (sem backend).
 *
 * - Login simples (localStorage)
 * - Produtos (CRUD)
 * - Pedidos (gerados no checkout)
 * - Entregas (cofre local): gera código e libera Android/iOS/Web no deliver.html
 * - Export/Import (backup) de tudo
 */

document.addEventListener('DOMContentLoaded', () => bootAdmin());

const DEFAULT_PASSWORD = 'admin';

// ====== Elements ======
const loginSection = document.getElementById('loginSection');
const adminSection = document.getElementById('adminSection');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');

const productsListDiv = document.getElementById('productsList');
const ordersListDiv = document.getElementById('ordersList');
const backendOrdersListDiv = document.getElementById('backendOrdersList');
const backendSecretInput = document.getElementById('backendSecret');
const backendOrdersFilter = document.getElementById('backendOrdersFilter');
const ordersModeLocalBtn = document.getElementById('ordersModeLocal');
const ordersModeBackendBtn = document.getElementById('ordersModeBackend');
const refreshBackendOrdersBtn = document.getElementById('refreshBackendOrders');

// Parte 8A.2 — criar pedido manual no backend
const manualOrderProduct = document.getElementById('manualOrderProduct');
const manualOrderMarkPaid = document.getElementById('manualOrderMarkPaid');
const createBackendOrderBtn = document.getElementById('createBackendOrderBtn');

let ordersMode = 'local'; // 'local' | 'backend'
let backendOrdersCache = [];

function getApiBase() {
  // API_BASE é definido em js/config.js e exposto no window
  const base = (window.API_BASE || '').trim();
  return base.replace(/\/+$/, '');
}

function getBackendSecret() {
  return (backendSecretInput?.value || '').trim();
}
const deliveriesListDiv = document.getElementById('deliveriesList');
const couponsListDiv = document.getElementById('couponsList');
const salesUl = document.getElementById('salesUl');

// Dashboard (Parte 6)
const dashboardGrid = document.getElementById('dashboardGrid');
const dashTopProducts = document.getElementById('dashTopProducts');
const copyMsgPurchaseBtn = document.getElementById('copyMsgPurchaseBtn');
const copyMsgDeliveryBtn = document.getElementById('copyMsgDeliveryBtn');

const addProductBtn = document.getElementById('addProductBtn');
const exportBtn = document.getElementById('exportDataBtn');
const exportBackupBtn = document.getElementById('exportBackupBtn');
const importBtn = document.getElementById('importDataBtn');
const importFileInput = document.getElementById('importFileInput');

const addDeliveryBtn = document.getElementById('addDeliveryBtn');
const clearDeliveriesBtn = document.getElementById('clearDeliveriesBtn');

const addCouponBtn = document.getElementById('addCouponBtn');
const clearCouponsBtn = document.getElementById('clearCouponsBtn');
const exportManifestBtn = document.getElementById('exportManifestBtn');

const productModal = document.getElementById('productModal');
const closeModal = document.getElementById('closeModal');
const productForm = document.getElementById('productForm');
const modalTitle = document.getElementById('modalTitle');
const cancelBtn = document.getElementById('cancelBtn');

const deliveryModal = document.getElementById('deliveryModal');
const closeDeliveryModal = document.getElementById('closeDeliveryModal');
const cancelDeliveryBtn = document.getElementById('cancelDeliveryBtn');
const deliveryForm = document.getElementById('deliveryForm');

const couponModal = document.getElementById('couponModal');
const closeCouponModal = document.getElementById('closeCouponModal');
const cancelCouponBtn = document.getElementById('cancelCouponBtn');
const couponForm = document.getElementById('couponForm');
const couponModalTitle = document.getElementById('couponModalTitle');

// Configurações (Parte 5)
const changePassForm = document.getElementById('changePassForm');
const passCurrent = document.getElementById('passCurrent');
const passNew = document.getElementById('passNew');
const passNew2 = document.getElementById('passNew2');
const passMsg = document.getElementById('passMsg');

// ====== Storage keys ======
const K_PRODUCTS = 'products';
const K_ORDERS = 'orders';
const K_DELIVERIES = 'deliveries';
const K_COUPONS = 'coupons';
const K_SALES = 'sales';
const K_ADMIN_LOGGED = 'adminLoggedIn';
const K_ADMIN_PASS = 'adminPassword';

function bootAdmin() {
  wireTabs();
  wireCoreEvents();

  const loggedIn = localStorage.getItem(K_ADMIN_LOGGED) === 'true';
  loggedIn ? showAdmin() : showLogin();
}

function wireCoreEvents() {
  loginForm?.addEventListener('submit', handleLogin);
  logoutBtn?.addEventListener('click', handleLogout);

  addProductBtn?.addEventListener('click', () => openProductModal());
  exportBtn?.addEventListener('click', exportManifest);
  exportBackupBtn?.addEventListener('click', exportAll);
  importBtn?.addEventListener('click', () => importFileInput?.click());
  importFileInput?.addEventListener('change', handleImport);

  productForm?.addEventListener('submit', saveProduct);
  cancelBtn?.addEventListener('click', closeProductModal);
  closeModal?.addEventListener('click', closeProductModal);

  addDeliveryBtn?.addEventListener('click', () => openDeliveryModal());
  clearDeliveriesBtn?.addEventListener('click', clearDeliveries);
  deliveryForm?.addEventListener('submit', saveDeliveryManual);
  cancelDeliveryBtn?.addEventListener('click', closeDeliveryModalFn);
  closeDeliveryModal?.addEventListener('click', closeDeliveryModalFn);

  // Cupons
  addCouponBtn?.addEventListener('click', () => openCouponModal());
  clearCouponsBtn?.addEventListener('click', clearCoupons);
  exportManifestBtn?.addEventListener('click', exportManifest);
  couponForm?.addEventListener('submit', saveCoupon);
  cancelCouponBtn?.addEventListener('click', closeCouponModalFn);
  closeCouponModal?.addEventListener('click', closeCouponModalFn);

  // Config
  changePassForm?.addEventListener('submit', handleChangePassword);

  // Dashboard (mensagens prontas)
  copyMsgPurchaseBtn?.addEventListener('click', () => {
    const msg = makeWhatsAppTemplate('purchase');
    copyText(msg);
    alert('Mensagem copiada! Cole no WhatsApp.');
  });

  copyMsgDeliveryBtn?.addEventListener('click', () => {
    const msg = makeWhatsAppTemplate('delivery');
    copyText(msg);
    alert('Mensagem copiada! Cole no WhatsApp.');
  });

  // Pedidos: modo local vs backend
  ordersModeLocalBtn?.addEventListener('click', () => {
    ordersMode = 'local';
    renderOrders();
  });
  ordersModeBackendBtn?.addEventListener('click', async () => {
    ordersMode = 'backend';
    await refreshBackendOrders();
  });
  refreshBackendOrdersBtn?.addEventListener('click', async () => {
    if (ordersMode !== 'backend') {
      ordersMode = 'backend';
    }
    await refreshBackendOrders();
  });

  backendOrdersFilter?.addEventListener('change', () => {
    if (ordersMode === 'backend') {
      renderOrders();
    }
  });

  createBackendOrderBtn?.addEventListener('click', async () => {
    await createBackendOrderFromAdmin();
  });
}

function wireTabs() {
  const btns = Array.from(document.querySelectorAll('.segmented-btn'));
  btns.forEach((b) =>
    b.addEventListener('click', () => {
      btns.forEach((x) => x.classList.remove('is-active'));
      b.classList.add('is-active');
      const tab = b.getAttribute('data-tab');
      showTab(tab || 'products');
    })
  );
}

function showTab(tab) {
  const panels = ['dashboard', 'products', 'orders', 'deliveries', 'coupons', 'sales', 'settings'];
  panels.forEach((p) => {
    const el = document.getElementById('tab-' + p);
    if (!el) return;
    if (p === tab) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });

  if (tab === 'dashboard') {
    renderDashboard();
  }
}

function showLogin() {
  loginSection?.classList.remove('hidden');
  adminSection?.classList.add('hidden');
  logoutBtn?.classList.add('hidden');
}

async function showAdmin() {
  loginSection?.classList.add('hidden');
  adminSection?.classList.remove('hidden');
  logoutBtn?.classList.remove('hidden');

  await initializeProductsFromManifest();
  await initializeCouponsFromManifest();
  populateManualOrderProducts();
  renderAll();
}

function populateManualOrderProducts() {
  if (!manualOrderProduct) return;
  const products = getProducts();
  manualOrderProduct.innerHTML = '';
  products.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} • R$ ${Number(p.price || 0).toFixed(2)}`;
    manualOrderProduct.appendChild(opt);
  });
}

function handleLogin(e) {
  e.preventDefault();
  const inputPass = (document.getElementById('password')?.value || '').trim();
  const storedPass = localStorage.getItem(K_ADMIN_PASS) || DEFAULT_PASSWORD;
  if (inputPass === storedPass) {
    localStorage.setItem(K_ADMIN_LOGGED, 'true');
    showAdmin();
  } else {
    alert('Senha incorreta.');
  }
  loginForm?.reset();
}

function handleLogout() {
  localStorage.setItem(K_ADMIN_LOGGED, 'false');
  showLogin();
}

function handleChangePassword(e) {
  e.preventDefault();
  const cur = (passCurrent?.value || '').trim();
  const next = (passNew?.value || '').trim();
  const next2 = (passNew2?.value || '').trim();

  const stored = localStorage.getItem(K_ADMIN_PASS) || DEFAULT_PASSWORD;
  const setMsg = (t) => {
    if (passMsg) passMsg.textContent = t;
  };

  if (cur !== stored) {
    setMsg('Senha atual incorreta.');
    return;
  }
  if (next.length < 6) {
    setMsg('A nova senha deve ter no mínimo 6 caracteres.');
    return;
  }
  if (next !== next2) {
    setMsg('Confirmação não confere.');
    return;
  }
  if (next === DEFAULT_PASSWORD) {
    setMsg('Dica: escolha uma senha diferente de "admin".');
  }

  localStorage.setItem(K_ADMIN_PASS, next);
  changePassForm?.reset();
  setMsg('Senha atualizada com sucesso.');
}

// ====== Products ======
function getProducts() {
  return safeJson(localStorage.getItem(K_PRODUCTS), []);
}

function setProducts(products) {
  localStorage.setItem(K_PRODUCTS, JSON.stringify(products || []));
}

async function initializeProductsFromManifest() {
  if (localStorage.getItem(K_PRODUCTS)) return;
  try {
    const resp = await fetch('content/manifest.json');
    const data = await resp.json();
    setProducts(Array.isArray(data.products) ? data.products : []);
    if (data.support) localStorage.setItem('support', JSON.stringify(data.support));
  } catch (err) {
    console.warn('manifest.json não carregou no admin:', err);
  }
}

// ====== Cupons ======
function getCoupons() {
  return safeJson(localStorage.getItem(K_COUPONS), []);
}

function setCoupons(coupons) {
  localStorage.setItem(K_COUPONS, JSON.stringify(coupons || []));
}

async function initializeCouponsFromManifest() {
  if (localStorage.getItem(K_COUPONS)) return;
  try {
    const resp = await fetch('content/manifest.json');
    const data = await resp.json();
    setCoupons(Array.isArray(data.coupons) ? data.coupons : []);
  } catch (err) {
    console.warn('coupons no manifest não carregaram:', err);
  }
}

function openCouponModal(coupon = null, index = null) {
  couponModal?.classList.remove('hidden');
  if (couponModalTitle) couponModalTitle.textContent = coupon ? 'Editar cupom' : 'Novo cupom';

  const idxField = document.getElementById('couponIndex');
  const code = document.getElementById('couponCode');
  const type = document.getElementById('couponType');
  const value = document.getElementById('couponValue');
  const expires = document.getElementById('couponExpires');
  const active = document.getElementById('couponActive');

  if (coupon) {
    if (idxField) idxField.value = String(index);
    if (code) code.value = String(coupon.code || '');
    if (type) type.value = coupon.type === 'fixed' ? 'fixed' : 'percent';
    if (value) value.value = coupon.value ?? '';
    if (expires) expires.value = coupon.expiresAt || '';
    if (active) active.checked = coupon.active !== false;
  } else {
    if (idxField) idxField.value = '';
    couponForm?.reset();
    if (active) active.checked = true;
  }
}

function closeCouponModalFn() {
  couponModal?.classList.add('hidden');
}

function saveCoupon(e) {
  e.preventDefault();
  const coupons = getCoupons();
  const idx = (document.getElementById('couponIndex')?.value || '').trim();

  const coupon = {
    code: (document.getElementById('couponCode')?.value || '').trim().toUpperCase(),
    type: (document.getElementById('couponType')?.value || 'percent').trim(),
    value: Number(document.getElementById('couponValue')?.value || 0),
    expiresAt: (document.getElementById('couponExpires')?.value || '').trim(),
    active: !!document.getElementById('couponActive')?.checked
  };

  if (!coupon.code) {
    alert('Informe um código.');
    return;
  }

  if (idx !== '') coupons[Number(idx)] = coupon;
  else coupons.unshift(coupon);

  setCoupons(coupons);
  closeCouponModalFn();
  renderCoupons();
}

function clearCoupons() {
  if (!confirm('Limpar TODOS os cupons?')) return;
  setCoupons([]);
  renderCoupons();
}

function renderCoupons() {
  if (!couponsListDiv) return;
  const coupons = getCoupons();
  couponsListDiv.innerHTML = '';

  if (!coupons.length) {
    couponsListDiv.innerHTML = '<p>Nenhum cupom criado ainda.</p>';
    return;
  }

  coupons.forEach((c, idx) => {
    const el = document.createElement('div');
    el.className = 'product-item';

    const type = c.type === 'fixed' ? `R$ ${Number(c.value || 0).toFixed(2)}` : `${Number(c.value || 0).toFixed(0)}%`;
    const active = c.active === false ? 'Inativo' : 'Ativo';
    const exp = c.expiresAt ? `Até ${c.expiresAt}` : 'Sem validade';

    el.innerHTML = `
      <div>
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <strong>${escapeHtml(String(c.code || '').toUpperCase())}</strong>
          <span class="pill"><i class="fa-solid fa-ticket"></i> ${escapeHtml(type)}</span>
          <span class="pill"><i class="fa-solid fa-toggle-on"></i> ${escapeHtml(active)}</span>
        </div>
        <div style="opacity:.86; font-size:12px; margin-top:6px;">
          ${escapeHtml(exp)}
        </div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button class="button secondary" title="Editar"><i class="fa-solid fa-pen"></i></button>
        <button class="button secondary" title="Excluir"><i class="fa-solid fa-trash"></i></button>
        <button class="button secondary" title="Copiar"><i class="fa-regular fa-copy"></i></button>
      </div>
    `;

    const [btnEdit, btnDel, btnCopy] = el.querySelectorAll('button');
    btnEdit?.addEventListener('click', () => openCouponModal(c, idx));
    btnDel?.addEventListener('click', () => {
      if (!confirm('Excluir este cupom?')) return;
      const arr = getCoupons();
      arr.splice(idx, 1);
      setCoupons(arr);
      renderCoupons();
    });
    btnCopy?.addEventListener('click', () => copyText(String(c.code || '')));

    couponsListDiv.appendChild(el);
  });
}

function openProductModal(product = null, index = null) {
  productModal?.classList.remove('hidden');

  const idField = document.getElementById('productId');
  const name = document.getElementById('productName');
  const desc = document.getElementById('productDescription');
  const price = document.getElementById('productPrice');
  const android = document.getElementById('productAndroid');
  const ios = document.getElementById('productIOS');
  const web = document.getElementById('productWeb');
  const pay = document.getElementById('productPayLink');

  if (product) {
    modalTitle.textContent = 'Editar App';
    if (idField) idField.value = String(index);
    if (name) name.value = product.name || '';
    if (desc) desc.value = product.description || '';
    if (price) price.value = product.price ?? '';
    if (android) android.value = product.android_url || '';
    if (ios) ios.value = product.ios_link || '';
    if (web) web.value = product.web_link || '';
    if (pay) pay.value = product.payLink || product.pay_link || '';
  } else {
    modalTitle.textContent = 'Novo App';
    if (idField) idField.value = '';
    productForm?.reset();
  }
}

function closeProductModal() {
  productModal?.classList.add('hidden');
}

async function saveProduct(e) {
  e.preventDefault();

  const products = getProducts();
  const index = (document.getElementById('productId')?.value || '').trim();

  const product = {
    id: makeId('app'),
    name: (document.getElementById('productName')?.value || '').trim(),
    description: (document.getElementById('productDescription')?.value || '').trim(),
    price: Number(document.getElementById('productPrice')?.value || 0),
    android_url: (document.getElementById('productAndroid')?.value || '').trim(),
    ios_link: (document.getElementById('productIOS')?.value || '').trim(),
    web_link: (document.getElementById('productWeb')?.value || '').trim(),
    payLink: (document.getElementById('productPayLink')?.value || '').trim(),
    image: 'assets/default-app.png'
  };

  // imagem (opcional) -> data URI (sem custo)
  const imageInput = document.getElementById('productImage');
  const file = imageInput?.files?.[0];
  if (file) {
    product.image = await fileToDataUrl(file);
  } else if (index !== '' && products[Number(index)]?.image) {
    product.image = products[Number(index)].image;
  }

  if (index !== '') {
    // update
    product.id = products[Number(index)]?.id || product.id;
    products[Number(index)] = product;
  } else {
    products.unshift(product);
  }

  setProducts(products);
  closeProductModal();
  renderProducts();
}

function removeProduct(idx) {
  if (!confirm('Deseja remover este app?')) return;
  const products = getProducts();
  products.splice(idx, 1);
  setProducts(products);
  renderProducts();
}

function renderProducts() {
  if (!productsListDiv) return;
  const products = getProducts();
  productsListDiv.innerHTML = '<h3>Produtos</h3>';

  if (!products.length) {
    productsListDiv.innerHTML += '<p>Nenhum produto cadastrado.</p>';
    return;
  }

  products.forEach((p, idx) => {
    const el = document.createElement('div');
    el.className = 'product-item';
    el.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px;">
        <img src="${escapeAttr(p.image || 'assets/default-app.png')}" alt="" style="width:42px;height:42px;border-radius:12px;object-fit:cover;border:1px solid rgba(255,255,255,.14);" />
        <div>
          <div style="font-weight:800">${escapeHtml(p.name || 'Produto')}</div>
          <div style="opacity:.85; font-size:12px">R$ ${Number(p.price || 0).toFixed(2)} • ${escapeHtml(p.android_url ? 'Android' : '—')} ${p.ios_link ? '• iOS' : ''} ${p.web_link ? '• Web' : ''}</div>
        </div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="button secondary" title="Editar"><i class="fa-solid fa-pen"></i></button>
        <button class="button secondary" title="Excluir"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
    const [btnEdit, btnDel] = el.querySelectorAll('button');
    btnEdit?.addEventListener('click', () => openProductModal(p, idx));
    btnDel?.addEventListener('click', () => removeProduct(idx));
    productsListDiv.appendChild(el);
  });
}

// ====== Orders (from checkout) ======
function getOrders() {
  return safeJson(localStorage.getItem(K_ORDERS), []);
}

function setOrders(orders) {
  localStorage.setItem(K_ORDERS, JSON.stringify(orders || []));
}

function renderOrders() {
  if (!ordersListDiv) return;
  // Alterna UI de acordo com o modo selecionado
  if (ordersMode === 'backend') {
    ordersListDiv.classList.add('hidden');
    backendOrdersListDiv?.classList.remove('hidden');
    renderBackendOrders();
    return;
  }

  backendOrdersListDiv?.classList.add('hidden');
  ordersListDiv.classList.remove('hidden');

  const orders = getOrders();
  ordersListDiv.innerHTML = '';

  if (!orders.length) {
    ordersListDiv.innerHTML = '<p>Nenhum pedido ainda. (O checkout cria pedidos localmente.)</p>';
    return;
  }

  const products = getProducts();

  orders.forEach((o, idx) => {
    const p = products.find((x) => x.id === o.productId);
    const createdAt = o.createdAt ? new Date(o.createdAt).toLocaleString() : '';
    const status = o.status || 'unknown';
    const delivered = status === 'delivered';
    const pill = delivered ? 'Entregue' : status === 'paid_unverified' ? 'Aguardando confirmação' : status;

    const el = document.createElement('div');
    el.className = 'product-item';
    el.innerHTML = `
      <div>
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <strong>${escapeHtml(o.productName || p?.name || 'Produto')}</strong>
          <span class="pill"><i class="fa-solid fa-circle-info"></i> ${escapeHtml(pill)}</span>
        </div>
        <div style="opacity:.86; font-size:12px; margin-top:6px;">
          Código de compra: <strong>${escapeHtml(o.purchaseCode || '—')}</strong> • Pedido: ${escapeHtml(o.orderId || '—')} • ${escapeHtml(createdAt)}
        </div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button class="button primary" ${delivered ? 'disabled' : ''} title="Confirmar e liberar entrega">
          <i class="fa-solid fa-key"></i>
        </button>
        <button class="button secondary" title="Copiar código">
          <i class="fa-regular fa-copy"></i>
        </button>
        <button class="button secondary" title="Excluir pedido">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;

    const buttons = el.querySelectorAll('button');
    const btnDeliver = buttons[0];
    const btnCopy = buttons[1];
    const btnDelete = buttons[2];

    btnDeliver?.addEventListener('click', () => confirmAndDeliver(o, idx));
    btnCopy?.addEventListener('click', () => copyText(o.purchaseCode || ''));
    btnDelete?.addEventListener('click', () => deleteOrder(idx));

    ordersListDiv.appendChild(el);
  });
}

// ====== Orders (Backend / Worker) ======
async function refreshBackendOrders() {
  const api = getApiBase();
  if (!api) {
    alert('API_BASE não está configurado (js/config.js). Use o modo Local por enquanto.');
    ordersMode = 'local';
    renderOrders();
    return;
  }
  const secret = getBackendSecret();
  if (!secret) {
    alert('Cole o ADMIN_SECRET do Worker para listar/operar pedidos no backend.');
    return;
  }

  try {
    const res = await fetch(`${api}/api/admin/orders?limit=100`, {
      headers: { 'X-Admin-Secret': secret }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Falha ao carregar pedidos');
    backendOrdersCache = Array.isArray(data.items) ? data.items : (data.orders || []);
    ordersMode = 'backend';
    renderOrders();
  } catch (err) {
    alert(String(err?.message || err));
  }
}

function renderBackendOrders() {
  if (!backendOrdersListDiv) return;
  backendOrdersListDiv.innerHTML = '';

  // botão visual ativo
  if (ordersModeLocalBtn && ordersModeBackendBtn) {
    ordersModeLocalBtn.classList.toggle('is-active', ordersMode === 'local');
    ordersModeBackendBtn.classList.toggle('is-active', ordersMode === 'backend');
  }

  if (!backendOrdersCache.length) {
    backendOrdersListDiv.innerHTML = '<p>Nenhum pedido no backend (Worker) ainda. Use o checkout com API_BASE ou crie pedidos no modo Local.</p>';
    return;
  }

  const filter = (backendOrdersFilter?.value || 'all').trim();
  const now = Date.now();
  const items = backendOrdersCache.filter((o) => {
    const exp = o.expiresAt ? new Date(o.expiresAt).getTime() : 0;
    const isExpired = exp && now > exp;
    if (filter === 'paid') return o.status === 'paid' && !isExpired;
    if (filter === 'created') return o.status !== 'paid' && !isExpired;
    if (filter === 'expired') return isExpired;
    return true;
  });

  items.forEach((o) => {
    const createdAt = o.createdAt ? new Date(o.createdAt).toLocaleString() : '';
    const exp = o.expiresAt ? new Date(o.expiresAt).getTime() : 0;
    const isExpired = exp && Date.now() > exp;
    const pill = isExpired ? 'Expirado' : o.status === 'paid' ? 'Pago' : 'Criado';
    const deliverPath = o.deliverToken ? `deliver.html?token=${encodeURIComponent(o.deliverToken)}` : '';
    const deliverAbs = o.deliverToken ? `${location.origin}/${deliverPath}` : '';
    const serial = String(o.licenseKey || '').trim();

    const el = document.createElement('div');
    el.className = 'product-item';
    el.innerHTML = `
      <div>
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <strong>${escapeHtml(o.productName || 'Produto')}</strong>
          <span class="pill"><i class="fa-solid fa-circle-info"></i> ${escapeHtml(pill)}</span>
        </div>
        <div style="opacity:.86; font-size:12px; margin-top:6px;">
          Pedido: <strong>${escapeHtml(o.orderId || '—')}</strong> • Total: R$ ${Number(o.total || 0).toFixed(2)} • ${escapeHtml(createdAt)}
        </div>
        ${deliverPath ? `<div style="opacity:.86; font-size:12px; margin-top:6px;">Entrega: <code>${escapeHtml(deliverPath)}</code></div>` : ''}
        ${serial ? `<div style="opacity:.86; font-size:12px; margin-top:6px;">Serial: <code>${escapeHtml(serial)}</code></div>` : ''}
      </div>
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:flex-end;">
        <button class="button ${o.status === 'paid' ? 'secondary' : 'primary'}" title="Marcar como pago" ${o.status === 'paid' ? 'disabled' : ''}>
          <i class="fa-solid fa-check"></i>
        </button>
        <button class="button secondary" title="Regenerar token">
          <i class="fa-solid fa-rotate"></i>
        </button>
        <button class="button secondary" title="Copiar link de entrega" ${deliverAbs ? '' : 'disabled'}>
          <i class="fa-solid fa-link"></i>
        </button>
        <button class="button secondary" title="Copiar serial" ${serial ? '' : 'disabled'}>
          <i class="fa-solid fa-key"></i>
        </button>
        <button class="button secondary" title="Copiar orderId">
          <i class="fa-regular fa-copy"></i>
        </button>
      </div>
    `;

    const [btnPaid, btnRegen, btnCopyLink, btnCopySerial, btnCopy] = el.querySelectorAll('button');
    btnPaid?.addEventListener('click', () => backendMarkPaid(o.orderId));
    btnRegen?.addEventListener('click', () => backendRegenerateToken(o.orderId));
    btnCopyLink?.addEventListener('click', () => copyText(deliverAbs));
    btnCopySerial?.addEventListener('click', () => copyText(serial));
    btnCopy?.addEventListener('click', () => copyText(o.orderId || ''));

    backendOrdersListDiv.appendChild(el);
  });
}

async function backendMarkPaid(orderId) {
  const api = getApiBase();
  const secret = getBackendSecret();
  if (!api || !secret) return;
  try {
    const res = await fetch(`${api}/api/admin/mark-paid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': secret },
      body: JSON.stringify({ orderId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Falha ao marcar como pago');
    // Copia link e serial quando possível
    const token = data.token;
    const licenseKey = data.licenseKey || '';
    const deliverAbs = token ? `${location.origin}/deliver.html?token=${encodeURIComponent(token)}` : '';
    if (deliverAbs) copyText(deliverAbs);
    const extra = licenseKey ? `\nSerial: ${licenseKey}` : '';
    alert(`Pago!\n\nLink de entrega${deliverAbs ? ' (copiado)' : ''}:\n${deliverAbs || '—'}${extra}`);
    await refreshBackendOrders();
  } catch (err) {
    alert(String(err?.message || err));
  }
}

async function backendRegenerateToken(orderId) {
  const api = getApiBase();
  const secret = getBackendSecret();
  if (!api || !secret) return;
  try {
    const res = await fetch(`${api}/api/admin/regenerate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': secret },
      body: JSON.stringify({ orderId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Falha ao regenerar token');
    alert(`Novo token: ${data.token}`);
    await refreshBackendOrders();
  } catch (err) {
    alert(String(err?.message || err));
  }
}

// Parte 8A.2 — cria pedido manual (ex: venda via WhatsApp) direto no Worker
async function createBackendOrderFromAdmin() {
  const api = getApiBase();
  if (!api) {
    alert('API_BASE não está configurado (js/config.js).');
    return;
  }
  const secret = getBackendSecret();
  if (!secret) {
    alert('Cole o ADMIN_SECRET do Worker para criar pedidos no backend.');
    return;
  }
  const products = getProducts();
  const productId = String(manualOrderProduct?.value || '').trim();
  const p = products.find((x) => x.id === productId);
  if (!p) {
    alert('Selecione um produto válido.');
    return;
  }

  try {
    const res = await fetch(`${api}/api/admin/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': secret },
      body: JSON.stringify({
        status: 'created',
        productId: p.id,
        slug: p.slug || p.id,
        productName: p.name,
        subtotal: Number(p.price || 0),
        total: Number(p.price || 0),
        coupon: null,
        payLink: String(p.payLink || ''),
        android_url: String(p.android_url || ''),
        ios_link: String(p.ios_link || ''),
        web_link: String(p.web_link || '')
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Falha ao criar pedido');

    const orderId = data.orderId;
    const markPaid = !!manualOrderMarkPaid?.checked;

    // Muda para backend e atualiza lista
    ordersMode = 'backend';

    if (markPaid) {
      await backendMarkPaid(orderId);
      await refreshBackendOrders();
      // tenta achar o token para copiar link
      const found = backendOrdersCache.find((o) => o.orderId === orderId);
      const deliverAbs = found?.deliverToken ? `${location.origin}/deliver.html?token=${encodeURIComponent(found.deliverToken)}` : '';
      if (deliverAbs) {
        copyText(deliverAbs);
        alert(`Pedido criado e pago!\n\nOrderId: ${orderId}\nLink de entrega copiado para a área de transferência.`);
      } else {
        alert(`Pedido criado e pago!\n\nOrderId: ${orderId}`);
      }
    } else {
      await refreshBackendOrders();
      copyText(orderId);
      alert(`Pedido criado!\n\nOrderId copiado: ${orderId}`);
    }
  } catch (err) {
    alert(String(err?.message || err));
  }
}

function deleteOrder(idx) {
  if (!confirm('Excluir este pedido?')) return;
  const orders = getOrders();
  orders.splice(idx, 1);
  setOrders(orders);
  renderOrders();
}

function confirmAndDeliver(order, idx) {
  const products = getProducts();
  const p = products.find((x) => x.id === order.productId) || {};
  const productSlug = (p.slug || p.id || '').toString().trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');

  const ok = confirm(
    `CONFIRMAR PAGAMENTO?\n\nProduto: ${order.productName || p.name || '—'}\nCódigo de compra: ${order.purchaseCode || '—'}\n\nSe você confirmar, vou gerar um CÓDIGO DE ENTREGA para enviar ao cliente.`
  );
  if (!ok) return;

  const deliveryCode = makeId('DL');
  const licenseKey = makeLicenseKey();
  const payload = {
    productId: order.productId,
    productSlug,
    productName: order.productName || p.name,
    licenseKey,
    activationsMax: 2,
    android_url: p.android_url || '',
    ios_link: p.ios_link || '',
    web_link: p.web_link || '',
    note: `Entrega do produto: ${order.productName || p.name || ''}`
  };

  const vault = getDeliveries();
  vault[deliveryCode] = payload;
  setDeliveries(vault);

  // update order
  const orders = getOrders();
  orders[idx] = {
    ...orders[idx],
    status: 'delivered',
    deliveryCode,
    deliveredAt: new Date().toISOString()
  };
  setOrders(orders);

  // UX: mostra código pronto + mensagem sugerida
  const msg = makeWhatsAppTemplate('delivery')
    .replace('{CODIGO_ENTREGA}', deliveryCode)
    .replace('{SERIAL}', licenseKey);
  alert(
    `Entrega liberada!\n\nCÓDIGO DE ENTREGA:\n${deliveryCode}\n\nSERIAL (Licença):\n${licenseKey}\n(Ativa em até 2 dispositivos)\n\nSugestão de mensagem (copiada):\n\n${msg}`
  );
  // Copia a mensagem pronta (mais útil que copiar só o código)
  copyText(msg);

  renderOrders();
  renderDeliveries();
}

// ====== Deliveries vault ======
function getDeliveries() {
  return safeJson(localStorage.getItem(K_DELIVERIES), {});
}

function setDeliveries(vault) {
  localStorage.setItem(K_DELIVERIES, JSON.stringify(vault || {}));
}

function clearDeliveries() {
  if (!confirm('Limpar TODO o cofre de entregas?')) return;
  setDeliveries({});
  renderDeliveries();
}

function openDeliveryModal() {
  deliveryModal?.classList.remove('hidden');
  deliveryForm?.reset();
}

function closeDeliveryModalFn() {
  deliveryModal?.classList.add('hidden');
}

function saveDeliveryManual(e) {
  e.preventDefault();
  const codeRaw = (document.getElementById('deliveryCodeInput')?.value || '').trim().toUpperCase();
  const code = codeRaw || makeId('DL');

  const payload = {
    android_url: (document.getElementById('deliveryAndroid')?.value || '').trim(),
    ios_link: (document.getElementById('deliveryIOS')?.value || '').trim(),
    web_link: (document.getElementById('deliveryWeb')?.value || '').trim(),
    note: (document.getElementById('deliveryNote')?.value || '').trim(),
    licenseKey: makeLicenseKey(),
    activationsMax: 2
  };

  const vault = getDeliveries();
  vault[code] = payload;
  setDeliveries(vault);

  closeDeliveryModalFn();
  renderDeliveries();
  alert(`Entrega salva!\n\nCódigo: ${code}`);
  copyText(code);
}

function renderDeliveries() {
  if (!deliveriesListDiv) return;
  const vault = getDeliveries();
  const codes = Object.keys(vault);

  deliveriesListDiv.innerHTML = '';
  if (!codes.length) {
    deliveriesListDiv.innerHTML = '<p>Nenhuma entrega liberada ainda.</p>';
    return;
  }

  codes.sort((a, b) => (a < b ? 1 : -1));

  codes.forEach((code) => {
    const p = vault[code] || {};
    const el = document.createElement('div');
    el.className = 'product-item';
    el.innerHTML = `
      <div>
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <strong>${escapeHtml(code)}</strong>
          <span class="pill"><i class="fa-solid fa-lock-open"></i> Ativo</span>
        </div>
        <div style="opacity:.86; font-size:12px; margin-top:6px;">
          ${p.android_url ? 'Android' : '—'} ${p.ios_link ? '• iOS' : ''} ${p.web_link ? '• Web' : ''}
        </div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="button secondary" title="Copiar código"><i class="fa-regular fa-copy"></i></button>
        <button class="button secondary" title="Excluir entrega"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
    const btns = el.querySelectorAll('button');
    btns[0]?.addEventListener('click', () => copyText(code));
    btns[1]?.addEventListener('click', () => deleteDelivery(code));
    deliveriesListDiv.appendChild(el);
  });
}

function deleteDelivery(code) {
  if (!confirm(`Excluir entrega ${code}?`)) return;
  const vault = getDeliveries();
  delete vault[code];
  setDeliveries(vault);
  renderDeliveries();
}

// ====== Sales (registro local do botão "Comprar" no catálogo) ======
function renderSales() {
  if (!salesUl) return;
  const sales = safeJson(localStorage.getItem(K_SALES), []);
  salesUl.innerHTML = '';

  if (!sales.length) {
    const li = document.createElement('li');
    li.textContent = 'Nenhuma venda registrada.';
    salesUl.appendChild(li);
    return;
  }

  sales.forEach((sale) => {
    const li = document.createElement('li');
    const date = new Date(sale.date);
    li.textContent = `${sale.name} – R$ ${Number(sale.price || 0).toFixed(2)} em ${date.toLocaleString()}`;
    salesUl.appendChild(li);
  });
}

// ====== Dashboard (Parte 6) ======
function renderDashboard() {
  if (!dashboardGrid) return;
  const orders = getOrders();
  const deliveries = getDeliveries();

  const delivered = orders.filter((o) => o.status === 'delivered').length;
  const waiting = orders.filter((o) => o.status === 'paid_unverified').length;
  const totalOrders = orders.length;

  const revenue = orders.reduce((sum, o) => sum + Number(o.finalPrice ?? o.price ?? 0), 0);
  const couponsUsed = orders.filter((o) => o.coupon && o.coupon.code).length;
  const deliveryCount = Object.keys(deliveries || {}).length;

  const top = computeTopProducts(orders);

  dashboardGrid.innerHTML = renderDashCards({
    totalOrders,
    delivered,
    waiting,
    revenue,
    couponsUsed,
    deliveryCount
  });

  if (dashTopProducts) {
    dashTopProducts.innerHTML = top.length
      ? top
          .map((t) =>
            `<div class="dash-row"><span>${escapeHtml(t.name)}</span><strong>${t.count}</strong></div>`
          )
          .join('')
      : '<div class="muted">Sem dados ainda.</div>';
  }
}

function renderDashCards(s) {
  const money = (n) => `R$ ${Number(n || 0).toFixed(2)}`;
  return `
    <div class="dash-card">
      <div class="dash-k">Pedidos</div>
      <div class="dash-v">${Number(s.totalOrders || 0)}</div>
      <div class="dash-h">Total gerados no checkout</div>
    </div>
    <div class="dash-card">
      <div class="dash-k">Entregues</div>
      <div class="dash-v">${Number(s.delivered || 0)}</div>
      <div class="dash-h">Pedidos com entrega liberada</div>
    </div>
    <div class="dash-card">
      <div class="dash-k">Aguardando</div>
      <div class="dash-v">${Number(s.waiting || 0)}</div>
      <div class="dash-h">Falta confirmar pagamento</div>
    </div>
    <div class="dash-card">
      <div class="dash-k">Receita (estim.)</div>
      <div class="dash-v">${money(s.revenue)}</div>
      <div class="dash-h">Somatório do total do pedido</div>
    </div>
    <div class="dash-card">
      <div class="dash-k">Cupons usados</div>
      <div class="dash-v">${Number(s.couponsUsed || 0)}</div>
      <div class="dash-h">Campanhas aplicadas</div>
    </div>
    <div class="dash-card">
      <div class="dash-k">Cofre</div>
      <div class="dash-v">${Number(s.deliveryCount || 0)}</div>
      <div class="dash-h">Códigos de entrega ativos</div>
    </div>
  `;
}

function computeTopProducts(orders) {
  const map = new Map();
  for (const o of orders) {
    const name = String(o.productName || 'Produto');
    map.set(name, (map.get(name) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function makeWhatsAppTemplate(kind) {
  // Templates sem custo: copie/cole
  const support = safeJson(localStorage.getItem('support'), {});
  const base = support.message ? String(support.message) : 'Olá!';
  if (kind === 'delivery') {
    return `${base}\n\n✅ Pagamento confirmado.\n\nCódigo de entrega: {CODIGO_ENTREGA}\nSerial (licença): {SERIAL}\n(até 2 dispositivos)\n\nAbra: deliver.html\nCole o código e baixe/acesse seus links.\n\nSe precisar, me chame aqui.`;
  }
  return `${base}\n\n📌 Para confirmar sua compra, me envie:\n1) Comprovante\n2) Código de compra: {CODIGO_COMPRA}\n\nAssim que eu validar, te envio o código de entrega.`;
}

// ====== Export / Import ======
function exportAll() {
  const payload = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    products: getProducts(),
    orders: getOrders(),
    deliveries: getDeliveries(),
    coupons: getCoupons(),
    sales: safeJson(localStorage.getItem(K_SALES), [])
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `appvault-backup-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Exporta um arquivo no formato de manifesto (para colocar em /content/manifest.json)
function exportManifest() {
  const payload = {
    version: '1.0',
    description: 'Manifesto exportado pelo Admin (produtos + cupons).',
    support: safeJson(localStorage.getItem('support'), {}),
    coupons: getCoupons(),
    products: getProducts(),
    dlcs: []
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `manifest-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function handleImport(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (Array.isArray(data.products)) setProducts(data.products);
      if (Array.isArray(data.orders)) setOrders(data.orders);
      if (data.deliveries && typeof data.deliveries === 'object') setDeliveries(data.deliveries);
      if (Array.isArray(data.coupons)) setCoupons(data.coupons);
      if (data.support && typeof data.support === 'object') localStorage.setItem('support', JSON.stringify(data.support));
      if (Array.isArray(data.sales)) localStorage.setItem(K_SALES, JSON.stringify(data.sales));

      alert('Importação concluída!');
      renderAll();
    } catch (err) {
      alert('Arquivo inválido.');
      console.error(err);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ====== Render all ======
function renderAll() {
  renderProducts();
  renderOrders();
  renderDeliveries();
  renderCoupons();
  renderSales();
}

// ====== Helpers ======
function safeJson(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function makeId(prefix) {
  // Token mais longo para reduzir adivinhação/colisão (ainda sem backend)
  const rand = cryptoRandomHex(8);
  const time = Date.now().toString(36).toUpperCase();
  return `${prefix}-${time}-${rand}`;
}

function makeLicenseKey() {
  // Serial amigável para o usuário (sem caracteres ambíguos)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const chunk = () => {
    let s = '';
    for (let i = 0; i < 4; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
    return s;
  };
  return `VG-${chunk()}-${chunk()}-${chunk()}`;
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
    // fallback
    let out = '';
    for (let i = 0; i < bytes; i++) out += Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    return out.toUpperCase();
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function copyText(text) {
  const val = (text || '').trim();
  if (!val) return;
  try {
    await navigator.clipboard.writeText(val);
  } catch {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = val;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

function escapeHtml(str) {
  return (str || '').toString().replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, '&#39;');
}
