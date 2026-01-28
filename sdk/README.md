# Vale Games Store — SDK de Licença (Serial)

Este SDK permite que seus apps (PWA/HTML/CSS/JS) **exijam um serial** após a compra, para reduzir compartilhamento indevido.

✅ 100% grátis (Cloudflare Worker + KV Free)

## Como funciona
- Cada compra gera um **serial** (ex: `VG-ABCD-EFGH-IJKL`)
- O usuário ativa o serial no app
- O backend salva a ativação por dispositivo
- Limite padrão: **2 dispositivos por compra**
- Você pode **revogar** um serial no admin (backend)

## 1) Pré-requisitos
1. Seu app está publicado em **HTTPS** (Vercel/GitHub Pages etc.)
2. Backend (Worker) configurado conforme `backend/README_BACKEND.md`
3. KV Namespaces no Cloudflare:
   - `ORDERS`, `TOKENS`, `LICENSES`

## 2) Colar o SDK no seu app
Copie o arquivo `sdk/vale-license.js` para dentro do seu projeto do app.

Exemplo de estrutura:
```
/seu-app
  index.html
  /js
  /sdk
    vale-license.js
```

No seu `index.html`, adicione:
```html
<script src="sdk/vale-license.js"></script>
<script>
  ValeLicense.bootstrap({
    apiBase: 'https://SEU_WORKER.workers.dev',
    storageKey: 'meuapp_license',
    appName: 'Meu App',
    onValid: () => {
      document.documentElement.classList.add('premium');
    },
    onInvalid: () => {
      document.documentElement.classList.remove('premium');
    }
  });
</script>
```

## 3) Bloquear conteúdo premium
No CSS, você pode esconder tudo premium por padrão:
```css
.premium-only { display:none; }
.premium .premium-only { display:block; }
```

No HTML, marque áreas premium:
```html
<div class="premium-only">
  Conteúdo premium liberado ✅
</div>
```

## 4) Erros comuns
- **"apiBase obrigatório"**: você não colocou a URL do Worker.
- **"Licença inválida"**: o usuário digitou serial errado.
- **"Limite de ativações"**: serial já foi usado em 2 dispositivos.

## 5) Argumento para investidores (texto pronto)
> Implementamos licenciamento pós-compra com serial único, limite de ativações por dispositivo (2) e revogação remota via backend serverless gratuito. Isso reduz compartilhamento indevido e permite controle antifraude sem custo fixo.
