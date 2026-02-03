// supabase.js — REST helper (vanilla)
// Config em js/config.js:
//   var SUPABASE_URL = 'https://xxxx.supabase.co';
//   var SUPABASE_ANON_KEY = '...';
//   var SUPABASE_ADMIN_EMAIL = 'admin@valegames.local'; // opcional

function sbConfigured(){
  return (window.SUPABASE_URL||'').trim() && (window.SUPABASE_ANON_KEY||'').trim();
}
function sbBase(){
  return (window.SUPABASE_URL||'').replace(/\/+$/,'');
}
function sbHeaders(extra){
  const h = {
    'apikey': (window.SUPABASE_ANON_KEY||'').trim(),
    'Content-Type': 'application/json',
  };
  // Supabase aceita Authorization Bearer <jwt|anon>
  h['Authorization'] = 'Bearer ' + (extra && extra.jwt ? extra.jwt : (window.SUPABASE_ANON_KEY||'').trim());
  if(extra && extra.prefer) h['Prefer']=extra.prefer;
  return h;
}
async function sbAuthLogin(password){
  if(!sbConfigured()) throw new Error('SUPABASE não configurado');
  const email = (window.SUPABASE_ADMIN_EMAIL||'admin@valegames.local').trim();
  const url = sbBase() + '/auth/v1/token?grant_type=password';
  const res = await fetch(url,{
    method:'POST',
    headers: sbHeaders({jwt:null}),
    body: JSON.stringify({ email, password })
  });
  const data = await res.json().catch(()=> ({}));
  if(!res.ok) throw new Error(data.error_description || data.msg || 'Login falhou');
  return data; // access_token, refresh_token, user...
}
function sbGetAdminJwt(){
  try{
    const raw = localStorage.getItem('vgs_sb_auth');
    if(!raw) return '';
    const obj = JSON.parse(raw);
    return obj.access_token || '';
  }catch(e){ return ''; }
}
function sbSetAdminAuth(auth){
  localStorage.setItem('vgs_sb_auth', JSON.stringify({
    access_token: auth.access_token,
    refresh_token: auth.refresh_token,
    user: auth.user || null,
    ts: Date.now()
  }));
}
function sbClearAdminAuth(){
  localStorage.removeItem('vgs_sb_auth');
}

async function sbSelect(table, query, opts){
  const url = new URL(sbBase() + '/rest/v1/' + table);
  if(query){
    Object.entries(query).forEach(([k,v])=> url.searchParams.set(k,v));
  }
  const jwt = (opts && opts.jwt) || null;
  const res = await fetch(url.toString(), { headers: sbHeaders({jwt}) });
  const data = await res.json();
  if(!res.ok) throw new Error(data.message || 'Erro ao buscar');
  return data;
}
async function sbInsert(table, rows, opts){
  const url = sbBase() + '/rest/v1/' + table;
  const jwt = (opts && opts.jwt) || null;
  const res = await fetch(url,{
    method:'POST',
    headers: sbHeaders({jwt, prefer:'return=representation'}),
    body: JSON.stringify(rows)
  });
  const data = await res.json();
  if(!res.ok) throw new Error((data && (data.message||data.error_description)) || 'Erro ao inserir');
  return data;
}
async function sbUpdate(table, matchQuery, patch, opts){
  const url = new URL(sbBase() + '/rest/v1/' + table);
  Object.entries(matchQuery||{}).forEach(([k,v])=> url.searchParams.set(k,v));
  const jwt = (opts && opts.jwt) || null;
  const res = await fetch(url.toString(),{
    method:'PATCH',
    headers: sbHeaders({jwt, prefer:'return=representation'}),
    body: JSON.stringify(patch)
  });
  const data = await res.json();
  if(!res.ok) throw new Error((data && (data.message||data.error_description)) || 'Erro ao atualizar');
  return data;
}
