/*
 * admin.js
 *
 * Este script implementa a área administrativa da Loja de Apps. Ele inclui
 * autenticação simples, gerenciamento de produtos (criação, edição e remoção),
 * importação/exportação de dados e visualização de vendas gravadas durante as
 * compras. Todos os dados são persistidos em localStorage para permitir um
 * comportamento offline. A estrutura foi desenhada para evoluir com back‑end
 * futuro sem alterar o core.
 */

document.addEventListener('DOMContentLoaded', () => {
  setupAdmin();
});

// Chave de senha padrão. Se o usuário nunca definiu uma senha, usa 'admin'.
const DEFAULT_PASSWORD = 'admin';

// Elementos da página
const loginSection = document.getElementById('loginSection');
const adminSection = document.getElementById('adminSection');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const productsListDiv = document.getElementById('productsList');
const salesUl = document.getElementById('salesUl');
const addProductBtn = document.getElementById('addProductBtn');
const exportBtn = document.getElementById('exportDataBtn');
const importBtn = document.getElementById('importDataBtn');
const importFileInput = document.getElementById('importFileInput');
const productModal = document.getElementById('productModal');
const closeModal = document.getElementById('closeModal');
const productForm = document.getElementById('productForm');
const modalTitle = document.getElementById('modalTitle');
const cancelBtn = document.getElementById('cancelBtn');

/**
 * Inicializa a área administrativa verificando o status de login.
 */
function setupAdmin() {
  const loggedIn = localStorage.getItem('adminLoggedIn') === 'true';
  if (loggedIn) {
    showAdminSection();
  } else {
    showLoginSection();
  }
  // Eventos
  loginForm.addEventListener('submit', handleLogin);
  logoutBtn.addEventListener('click', handleLogout);
  addProductBtn.addEventListener('click', () => openProductModal());
  exportBtn.addEventListener('click', exportData);
  importBtn.addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', handleImport);
  productForm.addEventListener('submit', saveProduct);
  cancelBtn.addEventListener('click', closeProductModal);
  document.getElementById('closeModal').addEventListener('click', closeProductModal);
}

/**
 * Mostra a tela de login.
 */
function showLoginSection() {
  loginSection.classList.remove('hidden');
  adminSection.classList.add('hidden');
  logoutBtn.classList.add('hidden');
}

/**
 * Mostra a tela de administração.
 */
function showAdminSection() {
  loginSection.classList.add('hidden');
  adminSection.classList.remove('hidden');
  logoutBtn.classList.remove('hidden');
  // Se não houver produtos no localStorage, carregar do manifesto inicial
  initializeProducts().then(() => {
    renderProducts();
    renderSales();
  });
}

/**
 * Lida com o login. Verifica se a senha digitada corresponde à senha armazenada.
 * A senha é armazenada em localStorage sob a chave 'adminPassword'. Caso não
 * exista, a senha padrão 'admin' é utilizada. Para aumentar a segurança,
 * recomenda‑se alterar a senha na primeira utilização.
 * @param {Event} e
 */
function handleLogin(e) {
  e.preventDefault();
  const inputPass = document.getElementById('password').value;
  const storedPass = localStorage.getItem('adminPassword') || DEFAULT_PASSWORD;
  if (inputPass === storedPass) {
    localStorage.setItem('adminLoggedIn', 'true');
    showAdminSection();
  } else {
    alert('Senha incorreta.');
  }
  loginForm.reset();
}

/**
 * Sai da sessão de administração.
 */
function handleLogout() {
  localStorage.setItem('adminLoggedIn', 'false');
  showLoginSection();
}

/**
 * Obtém a lista de produtos do localStorage. Caso não exista, tenta carregar
 * do manifesto original. Esta função garante que a lista de produtos esteja
 * disponível para edição e manipulação.
 * @returns {Array}
 */
function getProducts() {
  const localData = localStorage.getItem('products');
  if (localData) {
    try {
      return JSON.parse(localData);
    } catch {
      return [];
    }
  }
  // Se não houver dados locais, retorne vazio; a função initializeProducts
  // carregará dados do manifesto.
  return [];
}

/**
 * Carrega o manifesto inicial para o localStorage se ainda não houver produtos.
 * Isso permite que a área administrativa comece com os dados existentes.
 */
async function initializeProducts() {
  const localData = localStorage.getItem('products');
  if (localData) return;
  try {
    const resp = await fetch('content/manifest.json');
    const manifest = await resp.json();
    const products = manifest.products || [];
    setProducts(products);
  } catch (err) {
    console.warn('Não foi possível carregar manifest.json para o admin:', err);
  }
}

/**
 * Salva a lista de produtos no localStorage.
 * @param {Array} products
 */
function setProducts(products) {
  localStorage.setItem('products', JSON.stringify(products));
}

/**
 * Renderiza a lista de produtos na área administrativa.
 */
function renderProducts() {
  const products = getProducts();
  productsListDiv.innerHTML = '<h3>Apps Disponíveis</h3>';
  if (products.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'Nenhum app cadastrado.';
    productsListDiv.appendChild(p);
    return;
  }
  products.forEach((product, index) => {
    const li = document.createElement('li');
    li.className = 'product-item';
    const spanName = document.createElement('span');
    spanName.textContent = `${product.name} – R$ ${Number(product.price || 0).toFixed(2)}`;
    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    // Editar
    const editBtn = document.createElement('button');
    editBtn.className = 'button secondary';
    editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
    editBtn.title = 'Editar';
    editBtn.onclick = () => openProductModal(product, index);
    actions.appendChild(editBtn);
    // Remover
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'button secondary';
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    deleteBtn.title = 'Remover';
    deleteBtn.onclick = () => removeProduct(index);
    actions.appendChild(deleteBtn);
    li.appendChild(spanName);
    li.appendChild(actions);
    productsListDiv.appendChild(li);
  });
}

/**
 * Renderiza a lista de vendas gravadas no localStorage.
 */
function renderSales() {
  const sales = JSON.parse(localStorage.getItem('sales') || '[]');
  salesUl.innerHTML = '';
  if (sales.length === 0) {
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

/**
 * Abre o modal de edição/criação de produto.
 * @param {Object} product
 * @param {number} index
 */
function openProductModal(product = null, index = null) {
  productModal.classList.remove('hidden');
  if (product) {
    modalTitle.textContent = 'Editar App';
    document.getElementById('productId').value = index;
    document.getElementById('productName').value = product.name || '';
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productPrice').value = product.price || '';
    document.getElementById('productAndroid').value = product.android_url || '';
    document.getElementById('productIOS').value = product.ios_link || '';
  } else {
    modalTitle.textContent = 'Novo App';
    document.getElementById('productId').value = '';
    productForm.reset();
  }
}

/**
 * Fecha o modal de produto.
 */
function closeProductModal() {
  productModal.classList.add('hidden');
}

/**
 * Remove um produto pelo índice.
 * @param {number} index
 */
function removeProduct(index) {
  if (!confirm('Deseja remover este app?')) return;
  const products = getProducts();
  products.splice(index, 1);
  setProducts(products);
  renderProducts();
}

/**
 * Lida com a submissão do formulário de produto. Se houver um índice
 * (productId), atualiza o produto existente; caso contrário, adiciona um
 * novo produto. Imagens são convertidas para Data URI para armazenamento no
 * localStorage. O link de pagamento será configurado manualmente.
 * @param {Event} e
 */
function saveProduct(e) {
  e.preventDefault();
  const index = document.getElementById('productId').value;
  const name = document.getElementById('productName').value;
  const description = document.getElementById('productDescription').value;
  const price = document.getElementById('productPrice').value;
  const androidUrl = document.getElementById('productAndroid').value;
  const iosLink = document.getElementById('productIOS').value;
  const imageFile = document.getElementById('productImage').files[0];

  const processAndSave = (imageDataUrl) => {
    const products = getProducts();
    const productObj = {
      id: name.toLowerCase().replace(/\s+/g, '_'),
      name,
      description,
      price,
      android_url: androidUrl,
      ios_link: iosLink,
      image: imageDataUrl || (products[index] ? products[index].image : ''),
      // O campo payLink deve ser ajustado manualmente através de exportação
      payLink: products[index] ? products[index].payLink : '',
    };
    if (index !== '') {
      products[index] = productObj;
    } else {
      products.push(productObj);
    }
    setProducts(products);
    renderProducts();
    closeProductModal();
  };

  if (imageFile) {
    const reader = new FileReader();
    reader.onload = (evt) => {
      processAndSave(evt.target.result);
    };
    reader.readAsDataURL(imageFile);
  } else {
    processAndSave(null);
  }
}

/**
 * Exporta os produtos como arquivo JSON para download. O arquivo gerado
 * contém os produtos armazenados no localStorage e pode ser utilizado para
 * atualizar o manifesto ou servir como backup.
 */
function exportData() {
  const products = getProducts();
  const data = { products };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'products-export.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Lida com a importação de um arquivo JSON selecionado pelo usuário.
 * Os dados importados substituem os produtos atuais.
 * @param {Event} e
 */
function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const data = JSON.parse(evt.target.result);
      if (data.products && Array.isArray(data.products)) {
        setProducts(data.products);
        renderProducts();
        alert('Dados importados com sucesso.');
      } else {
        alert('Arquivo inválido.');
      }
    } catch (err) {
      alert('Erro ao importar arquivo: ' + err.message);
    }
  };
  reader.readAsText(file);
  // Limpar input para permitir importar novamente o mesmo arquivo se necessário
  importFileInput.value = '';
}