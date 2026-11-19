/* Código de primeira compra e código de indicação.
   Regra: barras de 1, 5 e 10 g têm acréscimo de 5% no preço de referência. Com código válido, na primeira compra,
   o acréscimo não é cobrado (código de 5%).
   A roda da home sorteia, por decisão do Antonio em 19/11/2026: 5% (quase sempre), 10%, 15% ou uma barra de 1 g.
   As chances estão em CHANCES, abaixo, e são as mesmas publicadas nas regras do site: se mudar aqui, mude lá.
   O sorteio é feito no banco (função girar, backend/roleta.sql), que registra nome, e-mail, prêmio e código.
   Prêmio de 10%, 15% ou barra só vale se estiver registrado lá com o e-mail da reserva.
   Depois da primeira reserva o cliente recebe um código de indicação próprio (OP + protocolo + dígito de conferência).
   A conferência final (primeira compra, indicação válida) é feita no atendimento, antes do pagamento. */
(function () {
  'use strict';
  var GERAL = 'PAULISTA5', CH = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  function digito(s) { var n = 7; for (var i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i) * (i + 3)) % 9973; return CH[n % CH.length]; }
  function limpa(c) { return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12); }
  var PREMIO = /^(D10|D15|B1G)[0-9A-Z]{6}$/;
  function valido(c) {
    c = limpa(c);
    if (c === GERAL) return true;
    if (PREMIO.test(c)) return digito(c.slice(0, 8)) === c[8];
    return /^OP[0-9A-F]{6}[0-9A-Z]$/.test(c) && digito(c.slice(0, 8)) === c[8];
  }
  /* chance de cada resultado da roda, em partes por 10.000 giros */
  var CHANCES = { B: 1, '15': 10, '10': 50, '5': 9939 };
  function sortear() {
    var r;
    try { var a = new Uint32Array(1); crypto.getRandomValues(a); r = a[0] % 10000; } catch (e) { r = Math.floor(Math.random() * 10000); }
    if (r < CHANCES.B) return 'B';
    if (r < CHANCES.B + CHANCES['15']) return '15';
    if (r < CHANCES.B + CHANCES['15'] + CHANCES['10']) return '10';
    return '5';
  }
  function marca(email, pre) {
    var e = String(email || '').trim().toLowerCase(), h = '', n = 17;
    for (var k = 0; k < 5; k++) { for (var i = 0; i < e.length; i++) n = (n * 33 + e.charCodeAt(i) * (k + 7) + pre.charCodeAt(i % 3)) % 99991; h += CH[n % CH.length]; }
    return pre + h + digito(pre + h);
  }
  /* código do prêmio sorteado: 5% é o código geral; os outros levam a marca do e-mail */
  function premio(email, tipo) { return tipo === 'B' ? marca(email, 'B1G') : tipo === '15' ? marca(email, 'D15') : tipo === '10' ? marca(email, 'D10') : GERAL; }
  /* confere se um código de prêmio é mesmo do e-mail informado (o código geral e os de indicação valem para qualquer um) */
  function confere(c, email) { c = limpa(c); return !PREMIO.test(c) ? valido(c) : marca(email, c.slice(0, 3)) === c; }
  /* o que o código dá: percentual a menos nas barras de 1, 5 e 10 g e, no prêmio especial, uma barra de 1 g */
  function desconto(c) {
    c = limpa(c); if (!valido(c)) return null;
    return { pct: c.indexOf('D10') === 0 ? 10 : c.indexOf('D15') === 0 ? 15 : 5, barra: c.indexOf('B1G') === 0 };
  }
  /* Giro da roda. O sorteio é feito no banco (função girar, em backend/roleta.sql), que guarda nome, e-mail, prêmio e
     código; cada e-mail gira uma vez. Devolve sempre { premio, codigo }.
     Sem banco configurado ou enquanto a função não existir (404), sorteia aqui mesmo, como antes.
     Se o banco existir e falhar, o giro dá o código geral de 5%: prêmio maior só vale registrado. */
  function girar(nome, email) {
    var C = window.OP_CONFIG || {}, local = function () { var t = sortear(); return { premio: t, codigo: premio(email, t) }; };
    if (!C.supabaseUrl || !C.supabaseKey || !window.fetch) return Promise.resolve(local());
    var ctl = window.AbortController ? new AbortController() : null, tm = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
    return fetch(C.supabaseUrl.replace(/\/$/, '') + '/rest/v1/rpc/girar', {
      method: 'POST', signal: ctl ? ctl.signal : undefined,
      headers: { 'Content-Type': 'application/json', apikey: C.supabaseKey, Authorization: 'Bearer ' + C.supabaseKey },
      body: JSON.stringify({ p_nome: nome, p_email: email })
    }).then(function (r) {
      clearTimeout(tm);
      if (r.status === 404) return local();
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json().then(function (j) {
        if (!j || !/^(5|10|15|B)$/.test(j.premio) || !valido(j.codigo)) throw new Error('resposta');
        return { premio: j.premio, codigo: limpa(j.codigo) };
      });
    }).catch(function () { clearTimeout(tm); return { premio: '5', codigo: GERAL }; });
  }
  function rotulo(c) { var d = desconto(c); return !d ? '' : d.barra ? 'uma barra de 1 g' : d.pct + '% a menos'; }
  function gerar(id) { var b = 'OP' + String(id || '').replace(/[^0-9a-f]/gi, '').slice(0, 6).toUpperCase(); return b.length === 8 ? b + digito(b) : ''; }
  function get() { try { var c = localStorage.getItem('op_codigo'); return valido(c) ? limpa(c) : ''; } catch (e) { return ''; } }
  function set(c) { try { if (valido(c)) localStorage.setItem('op_codigo', limpa(c)); } catch (e) {} }
  /* preço de referência de uma barra, em reais: com código válido usa a tabela sem acréscimo, quando existe */
  function preco(d, g, c) {
    var v = Number(d && d.barras && d.barras[g]), k = Number(d && d.com_codigo && d.com_codigo[g]), x = desconto(c);
    if (!x || !(k > 0)) return v;
    return x.pct > 5 ? Math.ceil(v * (1 - x.pct / 100)) : k;
  }
  window.OP_CODIGO = { GERAL: GERAL, limpa: limpa, valido: valido, gerar: gerar, get: get, set: set, preco: preco, MIN_INDICADO_G: 50,
    CHANCES: CHANCES, sortear: sortear, girar: girar, premio: premio, confere: confere, desconto: desconto, rotulo: rotulo };

  /* Usuário: nome e e-mail digitados antes de girar a roda. Ficam neste navegador (localStorage) e servem de
     pré-cadastro: a página de reserva já abre com eles preenchidos. No giro, nome e e-mail vão para o banco (giros). */
  var EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  function uget() {
    try { var u = JSON.parse(localStorage.getItem('op_user') || 'null'); return u && u.nome && EMAIL.test(u.email) ? { nome: String(u.nome).slice(0, 80), email: String(u.email).slice(0, 120) } : null; } catch (e) { return null; }
  }
  function uset(nome, email) {
    nome = String(nome || '').replace(/\s+/g, ' ').trim().slice(0, 80); email = String(email || '').trim().toLowerCase().slice(0, 120);
    if (nome.length < 2 || !EMAIL.test(email)) return false;
    try { localStorage.setItem('op_user', JSON.stringify({ nome: nome, email: email })); } catch (e) {}
    pinta(); return true;
  }
  function usair() { try { localStorage.removeItem('op_user'); localStorage.removeItem('op_codigo'); localStorage.removeItem('op_gate'); } catch (e) {} location.reload(); }
  window.OP_USER = { get: uget, set: uset, sair: usair, EMAIL: EMAIL };

  var CSS = '.uchip{position:relative;flex:none;font:500 14px/20px Inter,system-ui,sans-serif}' +
    '.uchip summary{display:flex;align-items:center;gap:8px;min-height:40px;padding:0 4px;cursor:pointer;list-style:none;white-space:nowrap}' +
    '.uchip summary::-webkit-details-marker{display:none}' +
    '.uchip i{flex:none;display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#111;color:#fff;font:700 14px/1 "Inter Tight",Inter,sans-serif;font-style:normal;box-shadow:0 0 0 2px #D4A017}' +
    '.uchip summary span{max-width:120px;overflow:hidden;text-overflow:ellipsis}' +
    '.uchip div{position:absolute;right:0;top:calc(100% + 10px);z-index:60;min-width:240px;max-width:86vw;padding:16px;background:#fff;border:1px solid #111;display:grid;gap:4px;text-align:left;white-space:normal}' +
    '.uchip div b{font:700 16px/22px "Inter Tight",Inter,sans-serif}' +
    '.uchip div span{font-size:13px;line-height:18px;color:#6b6b6b;overflow-wrap:anywhere}' +
    '.uchip div em{font-style:normal;margin-top:8px;padding-top:8px;border-top:1px solid rgba(17,17,17,.14);font-size:13px;line-height:18px}' +
    '.uchip div em strong{letter-spacing:.06em}' +
    '.uchip button{margin-top:10px;justify-self:start;border:0;background:none;padding:4px 0;font:500 13px/18px Inter,sans-serif;color:#6b6b6b;border-bottom:1px solid rgba(17,17,17,.14);cursor:pointer}' +
    '.site-header .uchip{margin-left:0}.top .uchip{margin-left:auto;margin-right:12px}' +
    '@media (max-width:960px){.site-header .uchip{margin-left:auto}.site-header .uchip+.header-cta{margin-left:0}}' +
    '@media (max-width:640px){.uchip summary span{display:none}}';
  function pinta() {
    if (!document.body) return;
    var u = uget(), old = document.querySelector('.uchip');
    if (old) old.remove();
    if (!u) return;
    var host = document.querySelector('.site-header .wrap') || document.querySelector('header .top');
    if (!host) return;
    if (!document.getElementById('uchip-css')) { var st = document.createElement('style'); st.id = 'uchip-css'; st.textContent = CSS; document.head.appendChild(st); }
    var mk = function (t, x) { var e = document.createElement(t); if (x != null) e.textContent = x; return e; };
    var d = mk('details'); d.className = 'uchip';
    var s = mk('summary'); s.setAttribute('aria-label', 'Usuário: ' + u.nome); s.appendChild(mk('i', u.nome.charAt(0).toUpperCase())); s.appendChild(mk('span', u.nome.split(' ')[0])); d.appendChild(s);
    var b = mk('div'); b.appendChild(mk('b', u.nome)); b.appendChild(mk('span', u.email));
    var c = get(); if (c) { var em = mk('em', 'Seu código: '); em.appendChild(mk('strong', c)); b.appendChild(em); }
    var out = mk('button', 'Sair'); out.type = 'button'; out.addEventListener('click', usair); b.appendChild(out);
    d.appendChild(b);
    var cta = host.querySelector('.header-cta') || host.querySelector('#count');
    if (cta) host.insertBefore(d, cta); else host.appendChild(d);
    document.addEventListener('click', function (e) { if (d.open && !d.contains(e.target)) d.open = false; });
  }
  window.OP_USER.pinta = pinta;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pinta); else pinta();
})();
