/**
 * Cloudflare Worker (Parte 8A) — Automação mínima (0 custo)
 *
 * Rotas:
 *  POST /api/order/create
 *  GET  /api/order/:id
 *  POST /api/webhook/payment   (precisa do header X-Webhook-Secret)
 *  POST /api/admin/mark-paid   (teste manual, precisa do header X-Admin-Secret)
 *  GET  /api/admin/orders      (lista pedidos, precisa do header X-Admin-Secret)
 *  POST /api/admin/regenerate-token (gera novo token, precisa do header X-Admin-Secret)
 *  POST /api/admin/create-order (cria pedido pelo admin, precisa do header X-Admin-Secret)
 *  GET  /api/deliver/:token
 *
 * Armazenamento:
 *  - KV: ORDERS (orderId -> JSON)
 *  - KV: TOKENS (token  -> JSON)
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');

    // CORS (site estático chamando Worker)
    if (request.method === 'OPTIONS') {
      return cors(new Response(null, { status: 204 }), env);
    }

    try {
      if (request.method === 'POST' && path === '/api/order/create') {
        const body = await safeJson(request);
        const orderId = makeId('ORD');
        const createdAt = new Date().toISOString();

        const order = {
          orderId,
          status: 'created',
          createdAt,
          productId: String(body.productId || ''),
          slug: String(body.slug || ''),
          productName: String(body.productName || ''),
          subtotal: Number(body.subtotal || 0),
          total: Number(body.total || 0),
          coupon: body.coupon || null,
          payLink: String(body.payLink || ''),
          // Links de entrega (serão anexados na confirmação)
          android_url: String(body.android_url || ''),
          ios_link: String(body.ios_link || ''),
          web_link: String(body.web_link || ''),
          deliverToken: '',
          expiresAt: ''
        };

        // Segurança básica: só aceitar payLink/links se vierem do frontend
        // (ideal: validar por catálogo no backend — Parte 9)
        await env.ORDERS.put(orderId, JSON.stringify(order), { expirationTtl: 60 * 60 * 24 * 30 });

        const origin = String(url.origin);
        const orderUrl = `${origin}/order.html?id=${encodeURIComponent(orderId)}`;
        return cors(json({ orderId, orderUrl, payLink: order.payLink }), env);
      }

      if (request.method === 'GET' && path.startsWith('/api/order/')) {
        const orderId = decodeURIComponent(path.split('/').pop() || '');
        const raw = await env.ORDERS.get(orderId);
        if (!raw) return cors(json({ error: 'Pedido não encontrado' }, 404), env);
        const order = JSON.parse(raw);
        const origin = String(url.origin);
        const deliverUrl = order.status === 'paid' && order.deliverToken
          ? `${origin}/deliver.html?token=${encodeURIComponent(order.deliverToken)}`
          : '';
        return cors(json({
          orderId: order.orderId,
          status: order.status,
          productName: order.productName,
          total: order.total,
          deliverUrl,
          expiresAt: order.expiresAt
        }), env);
      }

      if (request.method === 'POST' && path === '/api/webhook/payment') {
        const secret = request.headers.get('X-Webhook-Secret') || '';
        if (!env.WEBHOOK_SECRET || secret !== env.WEBHOOK_SECRET) {
          return cors(json({ error: 'Unauthorized' }, 401), env);
        }

        const body = await safeJson(request);
        const orderId = String(body.orderId || '');
        if (!orderId) return cors(json({ error: 'orderId obrigatório' }, 400), env);

        const order = await getOrder(env, orderId);
        if (!order) return cors(json({ error: 'Pedido não encontrado' }, 404), env);

        const token = await markPaidAndTokenize(env, order);
        return cors(json({ ok: true, orderId, token }), env);
      }

      // Endpoint para teste manual (sem gateway) — útil para validar o fluxo
      if (request.method === 'POST' && path === '/api/admin/mark-paid') {
        const secret = request.headers.get('X-Admin-Secret') || '';
        if (!env.ADMIN_SECRET || secret !== env.ADMIN_SECRET) {
          return cors(json({ error: 'Unauthorized' }, 401), env);
        }
        const body = await safeJson(request);
        const orderId = String(body.orderId || '');
        if (!orderId) return cors(json({ error: 'orderId obrigatório' }, 400), env);
        const order = await getOrder(env, orderId);
        if (!order) return cors(json({ error: 'Pedido não encontrado' }, 404), env);
        const token = await markPaidAndTokenize(env, order);
        return cors(json({ ok: true, orderId, token }), env);
      }

      // Lista pedidos (para o Admin buscar e operar sem localStorage)
      if (request.method === 'GET' && path === '/api/admin/orders') {
        const secret = request.headers.get('X-Admin-Secret') || '';
        if (!env.ADMIN_SECRET || secret !== env.ADMIN_SECRET) {
          return cors(json({ error: 'Unauthorized' }, 401), env);
        }

        const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || 50)));
        const cursor = url.searchParams.get('cursor') || undefined;
        const list = await env.ORDERS.list({ limit, cursor });

        const items = [];
        for (const k of list.keys) {
          const raw = await env.ORDERS.get(k.name);
          if (!raw) continue;
          try {
            const o = JSON.parse(raw);
            items.push({
              orderId: o.orderId,
              status: o.status,
              createdAt: o.createdAt,
              productName: o.productName,
              total: o.total,
              deliverToken: o.deliverToken,
              expiresAt: o.expiresAt
            });
          } catch {}
        }

        // Mais recentes primeiro
        items.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

        return cors(json({ items, cursor: list.cursor || null, hasMore: list.list_complete === false }), env);
      }

      // Regenera token de entrega (caso o cliente tenha perdido/expirado)
      if (request.method === 'POST' && path === '/api/admin/regenerate-token') {
        const secret = request.headers.get('X-Admin-Secret') || '';
        if (!env.ADMIN_SECRET || secret !== env.ADMIN_SECRET) {
          return cors(json({ error: 'Unauthorized' }, 401), env);
        }
        const body = await safeJson(request);
        const orderId = String(body.orderId || '');
        if (!orderId) return cors(json({ error: 'orderId obrigatório' }, 400), env);
        const order = await getOrder(env, orderId);
        if (!order) return cors(json({ error: 'Pedido não encontrado' }, 404), env);
        const token = await regenerateToken(env, order);
        return cors(json({ ok: true, orderId, token }), env);
      }

      // Criação de pedido pelo Admin (para operações manuais sem checkout)
      if (request.method === 'POST' && path === '/api/admin/create-order') {
        const secret = request.headers.get('X-Admin-Secret') || '';
        if (!env.ADMIN_SECRET || secret !== env.ADMIN_SECRET) {
          return cors(json({ error: 'Unauthorized' }, 401), env);
        }
        const body = await safeJson(request);
        const orderId = makeId('ORD');
        const createdAt = new Date().toISOString();
        const order = {
          orderId,
          status: String(body.status || 'created'),
          createdAt,
          productId: String(body.productId || ''),
          slug: String(body.slug || ''),
          productName: String(body.productName || ''),
          subtotal: Number(body.subtotal || 0),
          total: Number(body.total || 0),
          coupon: body.coupon || null,
          payLink: String(body.payLink || ''),
          android_url: String(body.android_url || ''),
          ios_link: String(body.ios_link || ''),
          web_link: String(body.web_link || ''),
          deliverToken: '',
          expiresAt: ''
        };

        await env.ORDERS.put(orderId, JSON.stringify(order), { expirationTtl: 60 * 60 * 24 * 30 });
        return cors(json({ ok: true, orderId }), env);
      }

      if (request.method === 'GET' && path.startsWith('/api/deliver/')) {
        const token = decodeURIComponent(path.split('/').pop() || '');
        if (!token) return cors(json({ error: 'Token inválido' }, 400), env);
        const raw = await env.TOKENS.get(token);
        if (!raw) return cors(json({ error: 'Token inválido ou expirado' }, 404), env);
        const record = JSON.parse(raw);
        if (record.expiresAt && Date.now() > new Date(record.expiresAt).getTime()) {
          await env.TOKENS.delete(token);
          return cors(json({ error: 'Token expirado' }, 410), env);
        }
        // "Used" é informativo (pode ser reusado até expirar, pois o usuário pode
        // atualizar a página e ainda precisar do link). Para reforçar segurança,
        // mantenha expiração curta.
        record.used = true;
        await env.TOKENS.put(token, JSON.stringify(record), { expirationTtl: 60 * 60 });

        return cors(json({
          productId: record.productId,
          productSlug: record.slug,
          productName: record.productName,
          note: 'Acesso liberado. Guarde este app na sua biblioteca.',
          android_url: record.android_url,
          ios_link: record.ios_link,
          web_link: record.web_link
        }), env);
      }

      return cors(json({ error: 'Not found' }, 404), env);
    } catch (err) {
      return cors(json({ error: String(err?.message || err) }, 500), env);
    }
  }
};

async function getOrder(env, orderId) {
  const raw = await env.ORDERS.get(orderId);
  return raw ? JSON.parse(raw) : null;
}

async function markPaidAndTokenize(env, order) {
  const token = makeId('TOK');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutos

  order.status = 'paid';
  order.deliverToken = token;
  order.expiresAt = expiresAt;

  await env.ORDERS.put(order.orderId, JSON.stringify(order), { expirationTtl: 60 * 60 * 24 * 30 });

  const tokenRecord = {
    token,
    used: false,
    expiresAt,
    orderId: order.orderId,
    productId: order.productId,
    slug: order.slug,
    productName: order.productName,
    android_url: order.android_url,
    ios_link: order.ios_link,
    web_link: order.web_link
  };

  await env.TOKENS.put(token, JSON.stringify(tokenRecord), { expirationTtl: 60 * 60 });
  return token;
}

async function regenerateToken(env, order) {
  // Invalida token antigo (se existir)
  if (order.deliverToken) {
    await env.TOKENS.delete(order.deliverToken);
  }
  // Mantém status como paid
  order.status = 'paid';
  const token = makeId('TOK');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  order.deliverToken = token;
  order.expiresAt = expiresAt;
  await env.ORDERS.put(order.orderId, JSON.stringify(order), { expirationTtl: 60 * 60 * 24 * 30 });
  const tokenRecord = {
    token,
    used: false,
    expiresAt,
    orderId: order.orderId,
    productId: order.productId,
    slug: order.slug,
    productName: order.productName,
    android_url: order.android_url,
    ios_link: order.ios_link,
    web_link: order.web_link
  };
  await env.TOKENS.put(token, JSON.stringify(tokenRecord), { expirationTtl: 60 * 60 });
  return token;
}

function makeId(prefix) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 10; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${prefix}-${s}`;
}

function clampInt(v, min, max, fallback) {
  const n = Number.parseInt(String(v ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

async function safeJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

function cors(response, env) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Webhook-Secret, X-Admin-Secret');
  headers.set('Access-Control-Max-Age', '86400');
  return new Response(response.body, { status: response.status, headers });
}
