/* Medição leve do site, sem cookie e sem dado pessoal.
   O que grava: nome do evento, página, um alvo curto (seção, etapa, peso ou nome do campo com erro),
   faixa de largura da tela, origem do anúncio (utm_source) e o site de onde a visita veio (só o domínio).
   O que nunca grava: valor digitado, nome, CPF, e-mail, endereço, IP, identificador entre visitas.
   A sessão é um código aleatório guardado só no sessionStorage: some ao fechar a aba.
   Respeita "Não rastrear" e Global Privacy Control. Sem banco configurado, ou com a tabela ausente, não faz nada.
   Tabela e função de leitura: backend/supabase.sql (bloco "eventos"). */
(function () {
  'use strict';
  var C = window.OP_CONFIG || {};
  if (!C.supabaseUrl || !C.supabaseKey || !window.fetch || !window.sessionStorage) return;
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl) return;
  if (navigator.webdriver) return;
  var S;
  try { S = window.sessionStorage; S.getItem('op_m'); } catch (e) { return; }
  if (S.getItem('op_m_off')) return;

  var MAX = 80;
  var sessao = S.getItem('op_m');
  if (!sessao) {
    var b = new Uint8Array(9); (window.crypto || window.msCrypto).getRandomValues(b);
    sessao = [].map.call(b, function (x) { return (x % 36).toString(36); }).join('') + Date.now().toString(36).slice(-3);
    S.setItem('op_m', sessao);
  }
  var q = new URLSearchParams(location.search);
  var origem = S.getItem('op_m_o');
  if (origem === null) {
    origem = (q.get('utm_source') || '').toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 40);
    var ref = '';
    try { if (document.referrer) { ref = new URL(document.referrer).hostname.replace(/^www\./, ''); if (ref === location.hostname.replace(/^www\./, '')) ref = ''; } } catch (e) {}
    S.setItem('op_m_o', origem); S.setItem('op_m_r', ref.slice(0, 60));
  }
  var ref0 = S.getItem('op_m_r') || '';
  var pagina = (location.pathname.replace(/^\/|\.html$/g, '').replace(/^index$/, '') || 'home').slice(0, 40);
  var w = window.innerWidth || 0;
  var faixa = w < 480 ? 'celular' : w < 1024 ? 'tablet' : 'computador';

  var fila = [], visto = {}, timer = null;
  var n = +(S.getItem('op_m_n') || 0);
  function envia(viaBeacon) {
    timer = null;
    if (!fila.length) return;
    var lote = fila; fila = [];
    var url = C.supabaseUrl.replace(/\/$/, '') + '/rest/v1/eventos';
    try {
      fetch(url, {
        method: 'POST', keepalive: true, credentials: 'omit',
        headers: { apikey: C.supabaseKey, Authorization: 'Bearer ' + C.supabaseKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(lote)
      }).then(function (r) { if (r.status === 404 || r.status === 401 || r.status === 403) S.setItem('op_m_off', '1'); }).catch(function () {});
    } catch (e) {}
  }
  function medir(evento, alvo, unico) {
    if (S.getItem('op_m_off') || n >= MAX) return;
    alvo = String(alvo == null ? '' : alvo).slice(0, 40);
    var k = evento + '|' + alvo;
    if (unico) { if (visto[k] || S.getItem('op_m_v|' + pagina + '|' + k)) return; visto[k] = 1; S.setItem('op_m_v|' + pagina + '|' + k, '1'); }
    n++; S.setItem('op_m_n', String(n));
    fila.push({ sessao: sessao, evento: evento, pagina: pagina, alvo: alvo, faixa: faixa, origem: origem, ref: ref0 });
    if (!timer) timer = setTimeout(envia, 1500);
  }
  window.opMedir = medir;
  addEventListener('pagehide', function () { if (timer) clearTimeout(timer); envia(); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') { if (timer) clearTimeout(timer); envia(); } });

  medir('pagina_vista', '', true);

  /* seções vistas (a seção cruza o meio da tela, uma vez por sessão) */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); medir('secao_vista', e.target.id || e.target.getAttribute('aria-labelledby'), true); } });
    }, { rootMargin: '-45% 0px -45% 0px' });
    [].forEach.call(document.querySelectorAll('main section[id], main section[aria-labelledby]'), function (s) { io.observe(s); });
  }

  /* cliques: botões de compra, WhatsApp, e-mail, peso escolhido, pergunta aberta */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a,summary,button') : null;
    if (!a) return;
    var sec = a.closest('section[id],section[aria-labelledby],header,footer,nav');
    var onde = sec ? (sec.id || sec.getAttribute('aria-labelledby') || sec.tagName.toLowerCase()) : '';
    var h = a.getAttribute('href') || '';
    if (a.hasAttribute('data-g')) medir('peso', a.getAttribute('data-g'));
    else if (h.indexOf('/comprar.html') === 0) { medir('cta_comprar', onde); if (timer) clearTimeout(timer); envia(); }
    else if (/wa\.me|whatsapp/.test(h)) medir('cta_whatsapp', onde);
    else if (h.indexOf('mailto:') === 0) medir('cta_email', onde);
    else if (a.tagName === 'SUMMARY') { var d = a.parentNode; if (d && !d.open) medir('duvida', [].indexOf.call(d.parentNode.children, d) + 1, true); }
  }, true);

  /* fluxo de compra: lê o que a página já mostra, sem tocar na lógica de envio */
  var passos = document.querySelectorAll('.step[data-step]');
  if (passos.length && 'MutationObserver' in window) {
    var atual = null;
    var olha = function () {
      for (var i = 0; i < passos.length; i++) {
        if (!passos[i].hidden) {
          var k = passos[i].getAttribute('data-step');
          if (k !== atual) { atual = k; medir(k === 'fim' ? 'envio_ok' : 'etapa_vista', k, true); }
          return;
        }
      }
    };
    var mo = new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        if (m.attributeName === 'hidden') { olha(); return; }
        var el = m.target;
        if (m.attributeName === 'aria-invalid' && el.getAttribute('aria-invalid') === 'true') medir('erro_campo', el.id || el.name, true);
      });
    });
    [].forEach.call(passos, function (s) { mo.observe(s, { attributes: true, attributeFilter: ['hidden'] }); });
    [].forEach.call(document.querySelectorAll('.step input,.step select'), function (el) { mo.observe(el, { attributes: true, attributeFilter: ['aria-invalid'] }); });
    olha();
    var st = document.getElementById('status');
    if (st) new MutationObserver(function () { if (/n[ãa]o foi poss[ií]vel/i.test(st.textContent)) medir('envio_falha', atual, true); }).observe(st, { childList: true, characterData: true, subtree: true });
  }
})();
