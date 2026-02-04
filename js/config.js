// config.js
// >>> CONFIGURAÇÃO DO BACKEND GRATUITO (SUPABASE) <<<
//
// 1) Crie um projeto no Supabase (plano free)
// 2) Copie:
//    - Project URL
//    - anon public key
// 3) Cole abaixo.
//
// IMPORTANTE:
// - Não use service_role key no site (GitHub Pages), ela dá acesso total.
// - A área Admin faz login via Supabase Auth (email fixo + senha que você define).
//
// Se SUPABASE_URL/ANON_KEY estiverem vazios, o site roda 100% local (sem serial online).

var SUPABASE_URL = '';       // ex: https://xxxx.supabase.co
var SUPABASE_ANON_KEY = '';  // ex: eyJhbGci...

// Email do admin no Supabase Auth (crie esse usuário no painel Auth)
var SUPABASE_ADMIN_EMAIL = 'admin@valegames.local';

// Mantido por compatibilidade (não usado no modo Supabase)
var API_BASE = '';
