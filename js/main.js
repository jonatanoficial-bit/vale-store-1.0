/*
 * main.js
 *
 * Script responsável por carregar os aplicativos a partir de um manifesto JSON
 * e renderizá‑los na página principal. Também implementa a lógica de compra
 * simulada e armazenamento de vendas no localStorage para visualização pela
 * área administrativa. Caso o produto tenha um link de pagamento externo,
 * ele será aberto em nova aba; após a compra, o download do APK ou acesso ao
 * link iOS é liberado manualmente.
 */

document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
});

/**
 * Carrega o manifesto de produtos e expansões.
 */
async function loadProducts() {
  try {
    const response = await fetch('content/manifest.json');
    const data = await response.json();
    let allProducts = data.products || [];
    // Carregar manifestos de DLCs se definido
    if (data.dlcs && Array.isArray(data.dlcs)) {
      for (const dlcPath of data.dlcs) {
        try {
          const dlcResponse = await fetch('content/' + dlcPath);
          const dlcData = await dlcResponse.json();
          if (dlcData.products) {
            allProducts = allProducts.concat(dlcData.products);
          }
        } catch (err) {
          console.warn('Erro ao carregar DLC:', dlcPath, err);
        }
      }
    }
    renderProducts(allProducts);
  } catch (error) {
    console.error('Erro ao carregar manifest.json:', error);
    const container = document.getElementById('app-list');
    container.innerHTML =
      '<p style="color: red;">Erro ao carregar produtos. Verifique se o arquivo manifest.json existe em /content.</p>';
  }
}

/**
 * Renderiza os produtos na tela.
 * @param {Array} products
 */
function renderProducts(products) {
  const container = document.getElementById('app-list');
  container.innerHTML = '';
  products.forEach((product) => {
    const card = document.createElement('div');
    card.className = 'card';
    // Imagem
    const img = document.createElement('img');
    img.src = product.image || 'assets/default-app.png';
    img.alt = product.name;
    card.appendChild(img);
    // Conteúdo
    const content = document.createElement('div');
    content.className = 'card-content';
    const title = document.createElement('h3');
    title.textContent = product.name;
    const description = document.createElement('p');
    description.textContent = product.description;
    const price = document.createElement('div');
    price.className = 'price';
    price.textContent = product.price
      ? `R$ ${Number(product.price).toFixed(2)}`
      : 'Grátis';
    // Botões
    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.gap = '8px';
    btnContainer.style.flexWrap = 'wrap';
    // Comprar (se houver link de pagamento)
    if (product.payLink) {
      const buyBtn = document.createElement('button');
      buyBtn.className = 'button primary';
      buyBtn.innerHTML = '<i class="fa-solid fa-shopping-cart"></i> Comprar';
      buyBtn.onclick = () => handlePurchase(product);
      btnContainer.appendChild(buyBtn);
    }
    // Download APK
    if (product.android_url) {
      const downloadBtn = document.createElement('a');
      downloadBtn.className = 'button secondary';
      downloadBtn.innerHTML = '<i class="fa-solid fa-download"></i> Android';
      downloadBtn.href = product.android_url;
      downloadBtn.setAttribute('download', '');
      btnContainer.appendChild(downloadBtn);
    }
    // Link iOS
    if (product.ios_link) {
      const iosBtn = document.createElement('a');
      iosBtn.className = 'button secondary';
      iosBtn.innerHTML = '<i class="fa-brands fa-apple"></i> iOS';
      iosBtn.href = product.ios_link;
      iosBtn.target = '_blank';
      btnContainer.appendChild(iosBtn);
    }
    content.appendChild(title);
    content.appendChild(description);
    content.appendChild(price);
    content.appendChild(btnContainer);
    card.appendChild(content);
    container.appendChild(card);
  });
}

/**
 * Lida com a compra de um produto. Este método grava a venda no localStorage e
 * abre o link de pagamento em nova aba. Para fins de demonstração, a venda
 * é considerada concluída imediatamente. O administrador pode visualizar as
 * vendas na área administrativa.
 * @param {Object} product
 */
function handlePurchase(product) {
  // Registrando venda no localStorage
  const sale = {
    id: product.id,
    name: product.name,
    price: product.price,
    date: new Date().toISOString(),
  };
  const sales = JSON.parse(localStorage.getItem('sales') || '[]');
  sales.push(sale);
  localStorage.setItem('sales', JSON.stringify(sales));
  // Abrir link de pagamento em nova aba
  if (product.payLink) {
    window.open(product.payLink, '_blank');
  }
  // Mensagem de agradecimento
  alert(
    'Obrigado pela compra! Após o pagamento, volte para baixar seu aplicativo. O administrador será notificado.'
  );
}