# Loja de Apps Premium

Este projeto é uma **loja de aplicativos mobile‑first** desenvolvida com HTML, CSS e JavaScript puro. A proposta é oferecer um marketplace de apps Android e links de apps iOS com visual AAA premium e arquitetura pronta para expansões (DLCs). Além disso, a aplicação conta com uma **área administrativa** para gerenciar produtos e visualizar vendas.

## 🎯 Funcionalidades principais

1. **Home/Catálogo profissional:** busca por texto, filtros por plataforma e cards premium.
2. **Página de produto completa:** `product.html?slug=...` (descrição longa, destaques, galeria e CTAs).
3. **Checkout MVP sem custo:** `checkout.html?slug=...` abre o link de pagamento e gera um **código de compra**.
4. **Entrega por código (sem backend):** `deliver.html` desbloqueia Android/iOS/Web por um código liberado pelo vendedor.
5. **Área Administrativa:** login simples com senha armazenada em `localStorage`, CRUD de produtos, importação/exportação de dados em JSON e painel de **Pedidos** (códigos do checkout) + **Entregas** (cofre local que libera links na página `deliver.html`).
6. **Arquitetura expansível (DLC):** manifesto + DLCs em `/content/dlc*/`.
7. **Design premium:** UI mobile‑first com gradientes sofisticados, botões com microinterações e tipografia elegante. A aparência é pensada para se assemelhar a um app de loja profissional.

## 📦 Estrutura de pastas

```
app/
├── index.html          # Home/Catálogo
├── product.html        # Página de produto
├── checkout.html       # Checkout (MVP sem backend)
├── deliver.html        # Entrega por código
├── admin.html          # Área administrativa
├── css/
│   └── styles.css      # Estilos globais
├── js/
│   ├── main.js         # Catálogo (busca/filtros)
│   ├── product.js      # Página de produto
│   ├── checkout.js     # Checkout (gera código de compra)
│   ├── deliver.js      # Entrega por código
│   └── admin.js        # Área de administração
├── assets/
│   ├── hero.png        # Imagem de capa premium (decorativa)
│   └── default-app.png # Ícone padrão para apps sem imagem
├── content/
│   ├── manifest.json   # Manifesto inicial com apps básicos
│   └── dlc1/
│       └── manifest.json # Exemplo de expansão
└── README.md
```

## 🚀 Como rodar localmente

1. **Baixe ou clone** este repositório e descompacte o arquivo ZIP se necessário.
2. Para evitar problemas de permissões ao carregar arquivos JSON via `fetch`, **execute um servidor HTTP local** na pasta `app/`. Em máquinas com Python instalado você pode rodar:

   ```bash
   cd app
   python3 -m http.server 8080
   ```

   Em seguida, acesse `http://localhost:8080/index.html` no navegador.
3. Para acessar a área administrativa, abra `http://localhost:8080/admin.html` e faça login com a senha padrão `admin`. Na aba **Config**, você pode trocar a senha (fica salva em `localStorage`).
4. **Adicionando apps:** na área administrativa, clique em **Adicionar App**, preencha os campos e salve. As alterações ficam armazenadas em `localStorage` e podem ser exportadas como JSON para atualizar o manifesto.
5. **Expansões (DLCs):** crie novas pastas dentro de `content/` como `dlc2/`, `dlc3/` etc., cada uma contendo um `manifest.json` no mesmo formato do manifesto principal. Adicione o caminho relativo deste manifesto em `dlcs` dentro de `content/manifest.json` para que a loja o carregue automaticamente.

## 📥 Como hospedar APK sem gastar (zero custo)
O jeito mais simples e **100% gratuito** é usar o **GitHub Releases**:

1. Crie um repositório no GitHub (gratuito).
2. Vá em **Releases** → **Draft a new release**.
3. Faça upload do arquivo `.apk` na release.
4. Copie o link do arquivo na release e coloque no campo `android_url` do produto.

> Importante: sem backend não dá para impedir que um link público seja compartilhado. Por isso, o fluxo “profissional” (Parte 4) usa links temporários/assinados via backend. Mas para começar com custo zero, GitHub Releases é o caminho mais simples.

## 📲 PWA (instalável, 0 custo)

O Vale Games Store inclui **PWA** (manifest + service worker) para:

- melhorar performance (cache)
- funcionar melhor em conexão ruim
- permitir “Adicionar à tela inicial” (sensação de app)

Em Android/Chrome, abra o site e use **Adicionar à tela inicial**.

## 📲 PWA (instalável)

O Vale Games Store inclui **PWA** (Service Worker + manifest) para:

- cache/offline básico
- performance melhor (cache de assets)
- sensação de “app instalado” na tela inicial do Android

Para testar: abra o site no celular e use “Adicionar à tela inicial”.

## 💳 Sugestões de integrações de pagamento

O projeto é agnóstico em relação ao provedor de pagamento, mas cada produto pode conter um `payLink` que leva o comprador para a plataforma escolhida. Algumas opções populares no Brasil são:

- **Ton (Stone):** O *link de pagamento* da Ton permite vender online sem precisar de site. Ele oferece um modo seguro de receber por Pix ou cartão de crédito (parcelamento em até 12x) e conta com antifraude【511166507530439†L192-L208】. As taxas começam em **4,19%** no crédito à vista, **6,08%** no crédito parcelado e **0,75%** no Pix【511166507530439†L170-L188】. Os links podem ser enviados via WhatsApp ou redes sociais e não há mensalidade【511166507530439†L192-L208】.
- **PagBank (PagSeguro):** Permite receber pagamentos na hora e parcelar em até 18x, sem necessidade de site ou maquinininha【961405928256140†L184-L204】. Usa autenticação 3DS e biometria facial para aumentar a segurança【961405928256140†L213-L224】.
- **Cobre Fácil:** Possui plano básico gratuito onde você paga apenas pelas transações (boleto pago R$3,50 e 4,14% no cartão de crédito) e pode ter um link ativo【23621427964587†L160-L179】. Não é necessário ter maquininha ou site【23621427964587†L60-L74】.
- **Asaas:** Oferece link de pagamento sem mensalidade ou taxa de adesão, com tarifas a partir de **R$0,99** por boleto e **1,99% + R$0,49** por cobrança no cartão de crédito nos primeiros 3 meses【369074839023882†L14-L36】. Permite criar cobranças avulsas, parceladas ou recorrentes e enviar notificações automáticas por e‑mail e SMS【369074839023882†L53-L63】.

Embora algumas plataformas anunciem a criação de links gratuitamente, **não existe serviço de pagamento totalmente isento de taxas** para transações com cartão ou boleto; a cobrança costuma ocorrer por transação. O Pix para pessoas físicas pode ser gratuito, mas exige que você gere manualmente um QR code ou chave e verifique os pagamentos. Caso você busque uma solução 100% gratuita, considere receber via **Pix Copia e Cola** utilizando sua chave pessoal ou empresarial, mas isso exigirá validação manual dos pagamentos.

## 🔔 Notificação de vendas

Quando um comprador clica em **Comprar**, o sistema registra a venda no `localStorage` e abre o link de pagamento em uma nova aba. Na área administrativa, você pode visualizar a lista de vendas registradas. Para notificações automáticas via e‑mail ou app, será necessário integrar com a API do provedor de pagamento escolhido (por exemplo, a Ton envia notificações no aplicativo do vendedor【511166507530439†L296-L324】). A arquitetura do projeto permite evoluir para um backend caso você deseje implementar notificações mais sofisticadas.

---

## 🤖 Parte 8A — Automação mínima (backend grátis)

Para **automatizar** o fluxo (criar pedido → acompanhar status → liberar entrega com token temporário), use o Cloudflare Worker incluído em `backend/`.

1. Siga o guia em `backend/README_BACKEND.md`.
2. Cole a URL do Worker em `js/config.js`:

```js
var API_BASE = 'https://seu-worker.sua-conta.workers.dev';
```

Quando configurado:
- o checkout cria um **pedido** no backend e abre a tela `order.html`
- ao confirmar pagamento (via webhook do gateway, ou manualmente em teste), o backend libera `deliver.html?token=...`

> Observação: para segurança máxima, o ideal é o backend validar o catálogo (Parte 9). Nesta Parte 8A, o backend recebe os links do frontend para manter simplicidade.

## 🛠️ Futuras melhorias

- **Sistema de autenticação aprimorado:** integração com backend, criptografia de senha e controle de sessões.
- **Integração com APIs de pagamento:** permitir gerar links diretamente do admin e confirmar pagamentos automaticamente.
- **Carregamento de DLCs remoto:** buscar manifestos de expansões hospedados externamente.
- **Internacionalização:** suporte a múltiplos idiomas (pt‑BR e en‑US).
- **Tema claro/escuro:** permitir alternar entre modos de visualização.

## 📄 Licença

Este projeto é fornecido como demonstração e não possui uma licença específica. Adapte‑o conforme necessário para seu uso pessoal ou comercial.