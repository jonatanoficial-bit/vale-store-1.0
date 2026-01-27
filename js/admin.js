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
const deliveriesListDiv = document.getElementById('deliveriesList');
const couponsListDiv = document.getElementById('couponsList');
const salesUl = document.getElementById('salesUl');

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
  const panels = ['products', 'orders', 'deliveries', 'coupons', 'sales'];
  panels.forEach((p) => {
    const el = document.getElementById('tab-' + p);
    if (!el) return;
    if (p === tab) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });
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
  renderAll();
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
  const payload = {
    productId: order.productId,
    productSlug,
    productName: order.productName || p.name,
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

  // UX: mostra código pronto
  alert(`Entrega liberada!\n\nEnvie este CÓDIGO DE ENTREGA ao cliente:\n\n${deliveryCode}\n\nEle vai usar em deliver.html`);
  copyText(deliveryCode);

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
    note: (document.getElementById('deliveryNote')?.value || '').trim()
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
