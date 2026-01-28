# Backend (Parte 8A) — Cloudflare Worker (GRÁTIS)

Este backend serve para **automatizar** o fluxo de venda com custo zero:

- criar pedido
- acompanhar status
- liberar entrega com **token temporário** (expira)

> Sem backend, o site continua funcionando em modo 100% estático.

## 1) Criar conta Cloudflare (Free)
1. Crie sua conta em cloudflare.com
2. No painel, procure **Workers & Pages**

## 2) Criar KV (Free)
Você precisa de **3 KV Namespaces**:
- `ORDERS`
- `TOKENS`
- `LICENSES` (serial/licenças — limite de ativações por dispositivo)

No painel Cloudflare:
Workers & Pages → KV → Create namespace.

## 3) Criar Worker
1. Workers & Pages → **Create Application** → **Worker**
2. Cole o conteúdo de `worker.js`
3. Vá em **Settings** → **Variables** e crie:
   - `WEBHOOK_SECRET` (um texto grande)
   - `ADMIN_SECRET` (um texto grande)
4. Em **Bindings**, adicione:
   - KV Namespace Binding: `ORDERS`
   - KV Namespace Binding: `TOKENS`
   - KV Namespace Binding: `LICENSES`

## 4) Conectar o site (frontend)
Abra `js/config.js` e cole a URL do Worker:

```js
var API_BASE = 'https://seu-worker.sua-conta.workers.dev';
```

## 5) Teste sem gateway (marcar pago manual)
### Opção A (mais fácil): pelo Admin do site
1. Configure o `API_BASE` no frontend (passo 4).
2. Abra `admin.html` → aba **Pedidos**.
3. Cole o `ADMIN_SECRET` no campo “Admin Secret”.
4. Clique em **Backend** → **Atualizar**.
5. No pedido, clique em **Marcar como pago** ou **Regenerar token**.

### Opção B: via curl (linha de comando)
Crie um pedido no checkout e copie o `orderId`.

Então faça um POST:

```bash
curl -X POST "$API_BASE/api/admin/mark-paid" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: SEU_ADMIN_SECRET" \
  -d '{"orderId":"ORD-XXXXX"}'
```

Isso libera o token automaticamente.

## 6) Integração com pagamento (webhook)
O seu gateway precisa chamar:

`POST /api/webhook/payment`

Com header:
`X-Webhook-Secret: SEU_WEBHOOK_SECRET`

Body:
```json
{ "orderId": "ORD-XXXXX" }
```

> Cada provedor tem formato de webhook diferente. Na Parte 9 (quando houver tempo), a gente cria adaptadores prontos para Ton/PagBank/Asaas.
