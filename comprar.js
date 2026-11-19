/* Fluxo de reserva em etapas. Sem dependências.
   Com OP_CONFIG.supabaseUrl e supabaseKey preenchidos, grava o pedido e os documentos no banco (só inserção).
   Sem eles, envia o resumo pelo WhatsApp do cliente e não grava nada. */
(function () {
  'use strict';
  var C = window.OP_CONFIG || {};
  var ONLINE = !!(C.supabaseUrl && C.supabaseKey);
  var WA = C.whatsapp || '5511987478144';
  var PESOS = [1, 5, 10, 25, 50, 100];
  var MAX_MB = 10;
  var TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
  var UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
  var FALAS = {
    barra: ['A sua reserva começa aqui.', 'Uma barra de ouro físico, em seu nome, entregue em casa.'],
    nome: ['Falta pouco para o ouro estar em seu nome.', 'O CPF é usado apenas no cadastro e na nota fiscal.'],
    perfil: ['Mais um passo e a reserva ganha forma.', 'Leva menos de um minuto.'],
    contato: ['Você acompanha tudo de perto.', 'Sem ligações de venda. Só os avisos do seu pedido.'],
    endereco: ['Em breve, o ouro chega até você.', 'Entrega no endereço que você indicar, com nota fiscal em seu nome.'],
    documento: ['Em instantes, você estará com mais segurança.', 'O documento segue por conexão cifrada e é usado apenas na análise do cadastro.'],
    comprovante: ['Quase lá. Falta um documento.', 'Depois disso, é só conferir e enviar.'],
    revisao: ['Tudo pronto para enviar.', ONLINE ? 'Os seus dados ficam guardados com acesso restrito.' : 'Os seus dados seguem pelo seu WhatsApp, em uma mensagem pronta.'],
    fim: ['A sua reserva está em andamento.', 'Ouro de São Paulo para o seu bem.']
  };

  var $ = function (id) { return document.getElementById(id); };
  var form = $('flow');
  var steps = [].slice.call(document.querySelectorAll('.step')).filter(function (s) {
    return ONLINE || (s.dataset.step !== 'documento' && s.dataset.step !== 'comprovante');
  });
  var cur = 0, done = false, sending = false;
  var st = { barra: 10, qtd: 1, files: { documento: [], comprovante: [] } };

  /* ---------- montagem ---------- */
  var qs = new URLSearchParams(location.search);
  var b0 = parseInt(qs.get('barra'), 10);
  if (PESOS.indexOf(b0) >= 0) st.barra = b0;
  var origem = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(function (k) {
    var v = qs.get(k); if (v) origem[k] = v.slice(0, 80);
  });
  try { if (document.referrer) origem.referrer = new URL(document.referrer).hostname; } catch (e) {}

  PESOS.forEach(function (g) {
    var l = document.createElement('label');
    var i = document.createElement('input'); i.type = 'radio'; i.name = 'barra'; i.value = g; i.checked = g === st.barra;
    var s = document.createElement('strong'); s.textContent = g + ' g';
    var d = document.createElement('span'); d.textContent = 'Ouro 999';
    l.appendChild(i); l.appendChild(s); l.appendChild(d); $('weights').appendChild(l);
    i.addEventListener('change', function () { st.barra = g; paintBarra(); });
  });
  UFS.forEach(function (u) { var o = document.createElement('option'); o.textContent = u; if (u === 'SP') o.selected = true; $('uf').appendChild(o); });
  $('q-less').addEventListener('click', function () { st.qtd = Math.max(1, st.qtd - 1); paintBarra(); });
  $('q-more').addEventListener('click', function () { st.qtd = Math.min(10, st.qtd + 1); paintBarra(); });
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  var EASE = 'cubic-bezier(0.23,1,0.32,1)';
  var K = { 1: .41, 5: .53, 10: .64, 25: .76, 50: .88, 100: 1 }, byKey = false;
  function paintBarra() {
    $('q-out').textContent = st.qtd;
    $('bar-w').textContent = st.barra + ' g';
    $('limit-note').classList.toggle('on', st.barra * st.qtd >= 15);
    var im = $('bar-img');
    im.classList.toggle('now', byKey || RM.matches);
    im.src = '/assets/barra-' + st.barra + 'g.webp';
    im.style.transform = 'scale(' + K[st.barra] + ')';
    var v = PRECOS && Number(PRECOS.barras[st.barra]);
    $('preco').hidden = !(v > 0);
    if (v > 0) $('preco').textContent = 'Preço de referência: ' + BRL.format(v * st.qtd) + ' (' + PRECOS.quando + '). O valor final é confirmado antes do pagamento.';
  }
  var PRECOS = null, BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  $('weights').addEventListener('keydown', function () { byKey = true; });
  $('weights').addEventListener('pointerdown', function () { byKey = false; });
  PESOS.forEach(function (g) { new Image().src = '/assets/barra-' + g + 'g.webp'; });
  paintBarra();
  /* Preço de referência do dia, lido de /precos.json. Sem arquivo, ou com mais de 36 h, a página fica sem preço. */
  fetch('/precos.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d || !d.atualizado_em || !d.barras) return;
    var t = new Date(d.atualizado_em);
    if (isNaN(t) || Date.now() - t.getTime() > 36 * 3600 * 1000) return;
    PRECOS = { barras: d.barras, quando: t.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) };
    paintBarra();
  }).catch(function () {});

  /* ---------- máscaras ---------- */
  $('cpf').addEventListener('input', function (e) {
    var v = e.target.value.replace(/\D/g, '').slice(0, 11);
    e.target.value = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  });
  $('cel').addEventListener('input', function (e) {
    var v = e.target.value.replace(/\D/g, '').slice(0, 11);
    e.target.value = v.length > 6 ? '(' + v.slice(0, 2) + ') ' + v.slice(2, v.length - 4) + '-' + v.slice(-4) : v.length > 2 ? '(' + v.slice(0, 2) + ') ' + v.slice(2) : v;
  });
  $('cep').addEventListener('input', function (e) {
    var v = e.target.value.replace(/\D/g, '').slice(0, 8);
    e.target.value = v.replace(/(\d{5})(\d)/, '$1-$2');
    if (v.length === 8) buscaCep(v);
  });
  function flash(el) {
    if (!el.animate) return;
    var cs = getComputedStyle(document.documentElement);
    el.animate([{ offset: 0, backgroundColor: cs.getPropertyValue('--surface').trim(), borderColor: cs.getPropertyValue('--ink').trim() }],
      { duration: 300, easing: 'ease' });
  }
  function buscaCep(v) {
    var e = $('e-cep'), msg = 'Buscando endereço.';
    var wait = setTimeout(function () { if (!e.textContent) e.textContent = msg; }, 400);
    var end = function () { clearTimeout(wait); if (e.textContent === msg) e.textContent = ''; };
    fetch('https://viacep.com.br/ws/' + v + '/json/').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      end();
      if (!d || d.erro) return;
      [['rua', d.logradouro], ['bairro', d.bairro], ['cidade', d.localidade]].forEach(function (p) {
        if (p[1] && !$(p[0]).value) { $(p[0]).value = p[1]; flash($(p[0])); }
      });
      if (d.uf && UFS.indexOf(d.uf) >= 0 && $('uf').value !== d.uf) { $('uf').value = d.uf; flash($('uf')); }
      if ($('rua').value && document.activeElement === $('cep')) $('num').focus();
    }).catch(end);
  }

  /* ---------- validação ---------- */
  function cpfOk(v) {
    v = v.replace(/\D/g, ''); if (v.length !== 11 || /^(\d)\1{10}$/.test(v)) return false;
    for (var t = 9; t < 11; t++) { var s = 0; for (var i = 0; i < t; i++) s += v[i] * (t + 1 - i); if ((s * 10) % 11 % 10 !== +v[t]) return false; }
    return true;
  }
  function check(el) {
    var m = '', v = (el.value || '').trim();
    if (el.type === 'checkbox') { if (el.required && !el.checked) m = 'Marque para continuar.'; }
    else if (el.type === 'file' || el.type === 'radio') return true;
    else if (el.required && !v) m = 'Preencha este campo.';
    else if (el.id === 'nome' && v.split(/\s+/).length < 2) m = 'Digite nome e sobrenome.';
    else if (el.id === 'cpf' && !cpfOk(v)) m = 'CPF inválido.';
    else if (el.id === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) m = 'E-mail inválido.';
    else if (el.id === 'cep' && v.replace(/\D/g, '').length !== 8) m = 'CEP com 8 dígitos.';
    else if (el.id === 'cel' && v.replace(/\D/g, '').length < 10) m = 'Celular com DDD.';
    else if (el.id === 'nasc') { var a = (Date.now() - new Date(v).getTime()) / 31557600000; if (!(a >= 18 && a < 120)) m = 'É preciso ter 18 anos ou mais.'; }
    var e = $('e-' + el.id); if (e) e.textContent = m;
    if (el.type !== 'checkbox') el.setAttribute('aria-invalid', m ? 'true' : 'false');
    return !m;
  }
  function validStep(sec) {
    var bad = null;
    [].forEach.call(sec.querySelectorAll('input,select'), function (el) { if (!check(el) && !bad) bad = el; });
    var drop = sec.querySelector('.drop');
    if (drop && !st.files[drop.dataset.drop].length) { drop.querySelector('.err').textContent = 'Envie pelo menos um arquivo.'; if (!bad) bad = drop.querySelector('input'); }
    if (bad) { bad.focus(); return false; }
    return true;
  }

  form.addEventListener('input', function (e) {
    var el = e.target;
    if (el.getAttribute('aria-invalid') === 'true') check(el);
    else if (el.type === 'checkbox') { var er = $('e-' + el.id); if (er) er.textContent = ''; }
  });

  /* ---------- arquivos ---------- */
  function fmtSize(n) { return n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
  function shrink(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 1500000 || !window.createImageBitmap) return Promise.resolve(file);
    return createImageBitmap(file).then(function (bmp) {
      var k = Math.min(1, 2200 / Math.max(bmp.width, bmp.height));
      var c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      return new Promise(function (res) { c.toBlob(function (b) { res(b && b.size < file.size ? new File([b], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file); }, 'image/jpeg', 0.85); });
    }).catch(function () { return file; });
  }
  [].forEach.call(document.querySelectorAll('.drop'), function (drop) {
    var kind = drop.dataset.drop, max = +drop.dataset.max, input = drop.querySelector('input'), zone = drop.querySelector('.zone'), list = drop.querySelector('.files'), err = drop.querySelector('.err');
    function sync() { zone.hidden = st.files[kind].length >= max; }
    function row(f) {
      var li = document.createElement('li'), th;
      if (f.type === 'application/pdf' || f.type === 'image/heic') { th = document.createElement('span'); th.className = 'pdf'; th.textContent = f.type === 'application/pdf' ? 'PDF' : 'FOTO'; }
      else { th = document.createElement('img'); th.alt = ''; th.src = URL.createObjectURL(f); th.onload = function () { URL.revokeObjectURL(th.src); }; }
      var n = document.createElement('span'); n.className = 'n'; n.textContent = f.name;
      var sm = document.createElement('small'); sm.textContent = fmtSize(f.size); n.appendChild(sm);
      var rm = document.createElement('button'); rm.type = 'button'; rm.textContent = 'Remover'; rm.setAttribute('aria-label', 'Remover ' + f.name);
      rm.addEventListener('click', function () { take(f, li); });
      li.appendChild(th); li.appendChild(n); li.appendChild(rm);
      return li;
    }
    function put(f) {
      var li = row(f); list.appendChild(li); sync();
      if (li.animate) li.animate(
        RM.matches ? [{ opacity: 0 }, { opacity: 1 }]
                   : [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 200, easing: EASE });
    }
    function take(f, li) {
      var k = st.files[kind].indexOf(f); if (k < 0) return;
      st.files[kind].splice(k, 1); sync();
      if (!zone.hidden) input.focus();
      if (!li.animate) { li.remove(); return; }
      li.style.pointerEvents = 'none';
      li.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: EASE, fill: 'forwards' }).onfinish = function () { li.remove(); };
    }
    function add(fl) {
      err.textContent = '';
      var chain = Promise.resolve();
      [].slice.call(fl).forEach(function (f) {
        chain = chain.then(function () {
          if (st.files[kind].length >= max) return;
          var type = f.type || (/\.heic$/i.test(f.name) ? 'image/heic' : '');
          if (TIPOS.indexOf(type) < 0) { err.textContent = 'Use foto (JPG, PNG) ou PDF.'; return; }
          return shrink(f).then(function (g) {
            if (g.size > MAX_MB * 1048576) { err.textContent = 'Arquivo acima de ' + MAX_MB + ' MB.'; return; }
            st.files[kind].push(g); put(g);
          });
        });
      });
      input.value = '';
    }
    input.addEventListener('change', function () { add(input.files); });
    ['dragenter', 'dragover'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('over'); }); });
    zone.addEventListener('drop', function (e) { if (e.dataTransfer) add(e.dataTransfer.files); });
  });

  /* ---------- navegação ---------- */
  var pending = null, kbd = false;
  function show(i, back, silent) {
    if (pending) pending();
    var prev = steps[cur];
    cur = Math.max(0, Math.min(steps.length - 1, i));
    var sec = steps[cur], key = sec.dataset.step;
    if (key === 'revisao') paintReview();
    var n = steps.length - 1;
    $('count').textContent = key === 'fim' ? 'Concluído' : 'Passo ' + (cur + 1) + ' de ' + n;
    $('prog').style.setProperty('--p', key === 'fim' ? 1 : (cur + 1) / steps.length);
    var ph = +sec.dataset.phase;
    [].forEach.call(document.querySelectorAll('.scene'), function (s) { s.classList.toggle('on', s.dataset.scene === String(ph)); });
    document.querySelector('.stage').classList.toggle('end', key === 'fim');
    var say = $('say');
    say.children[0].textContent = FALAS[key][0]; say.children[1].textContent = FALAS[key][1];
    [].forEach.call($('trail').children, function (li, k) { li.className = k < ph ? 'done' : k === ph ? 'now' : ''; });
    var simple = kbd || RM.matches; kbd = false;
    var end = key === 'fim';
    var dx = simple || end ? 0 : (back ? 24 : -24);
    var swapped = false;
    function swap() {
      if (swapped) return; swapped = true;
      [].forEach.call(document.querySelectorAll('.step'), function (s) { s.hidden = s !== sec; });
      if (!silent) { window.scrollTo(0, 0); var h = sec.querySelector('h1'); if (h) h.focus({ preventScroll: true }); }
    }
    if (silent || prev === sec || !prev.animate) { swap(); return; }
    var out = prev.animate(
      [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(' + dx + 'px)' }],
      { duration: 120, easing: EASE, fill: 'forwards' });
    var inn = null;
    pending = function () { pending = null; out.cancel(); if (inn) inn.cancel(); swap(); };
    out.onfinish = function () {
      swap(); out.cancel();
      inn = sec.animate(
        [{ opacity: 0, transform: 'translateX(' + (-dx) + 'px)' }, { opacity: 1, transform: 'translateX(0)' }],
        { duration: end ? 200 : (simple ? 120 : 220), easing: EASE });
      inn.onfinish = function () { pending = null; };
    };
  }
  function go(i) {
    var back = i < cur;
    show(i, back);
    try { if (back) history.replaceState({ i: cur }, ''); else history.pushState({ i: cur }, ''); } catch (e) {}
  }
  window.addEventListener('popstate', function (e) {
    if (done || sending) return;
    var i = e.state && typeof e.state.i === 'number' ? e.state.i : 0;
    show(Math.min(i, cur), true);
  });
  form.addEventListener('click', function (e) {
    var t = e.target.closest('[data-next],[data-back],[data-goto]'); if (!t || sending) return;
    var k = e.detail === 0;
    if (t.hasAttribute('data-next')) { if (validStep(steps[cur])) { kbd = k; go(cur + 1); } }
    else if (t.hasAttribute('data-back')) { kbd = k; go(cur - 1); }
    else { kbd = k; go(steps.findIndex(function (s) { return s.dataset.step === t.dataset.goto; })); }
  });
  form.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT' || e.target.type === 'checkbox' || e.target.type === 'file') return;
    e.preventDefault();
    var b = steps[cur].querySelector('[data-next]'); if (b) b.click();
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  window.addEventListener('beforeunload', function (e) { if (!done && cur > 0) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- revisão ---------- */
  var val = function (id) { return $(id).value.trim(); };
  function nascBR() { var n = val('nasc').split('-'); return n[2] + '/' + n[1] + '/' + n[0]; }
  function endereco() { return val('rua') + ', ' + val('num') + (val('comp') ? ', ' + val('comp') : '') + ' · ' + val('bairro') + ' · ' + val('cidade') + '/' + $('uf').value + ' · CEP ' + val('cep'); }
  function paintReview() {
    var rows = [
      ['Barra', st.qtd + ' × ' + st.barra + ' g, ouro 999', 'barra'],
      ['Nome', val('nome'), 'nome'], ['CPF', val('cpf'), 'nome'],
      ['Perfil', nascBR() + ' · ' + val('prof') + ($('pep').checked ? ' · pessoa exposta politicamente' : ''), 'perfil'],
      ['Contato', val('cel') + ' · ' + val('email'), 'contato'],
      ['Entrega', endereco(), 'endereco']
    ];
    if (ONLINE) rows.push(['Documentos', (st.files.documento.length + st.files.comprovante.length) + ' arquivos', 'documento']);
    var dl = $('review'); dl.textContent = '';
    rows.forEach(function (r) {
      var d = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd'), b = document.createElement('button');
      dt.textContent = r[0]; dd.textContent = r[1]; b.type = 'button'; b.textContent = 'Alterar'; b.dataset.goto = r[2]; b.setAttribute('aria-label', 'Alterar ' + r[0].toLowerCase());
      d.appendChild(dt); d.appendChild(dd); d.appendChild(b); dl.appendChild(d);
    });
  }

  /* ---------- envio ---------- */
  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    var b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = [].map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }
  function ext(f) { return ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'application/pdf': 'pdf' })[f.type] || 'bin'; }
  function api(path, opts) {
    opts.headers = Object.assign({ apikey: C.supabaseKey, Authorization: 'Bearer ' + C.supabaseKey }, opts.headers || {});
    return fetch(C.supabaseUrl.replace(/\/$/, '') + path, opts).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r; });
  }
  var CONSENT = 'Autorizo a Ouro Paulista a guardar estes dados e documentos e a encaminhá-los à instituição autorizada pelo Banco Central, para a análise do meu cadastro e a emissão da nota fiscal, conforme a política de privacidade.';
  function enviarOnline(id) {
    var todo = [], docs = [];
    ['documento', 'comprovante'].forEach(function (k) {
      st.files[k].forEach(function (f, i) { var p = id + '/' + k + '-' + (i + 1) + '.' + ext(f); todo.push({ f: f, p: p }); docs.push({ tipo: k, caminho: p, mime: f.type, bytes: f.size }); });
    });
    var chain = Promise.resolve();
    todo.forEach(function (t, i) {
      chain = chain.then(function () {
        status('Enviando documento ' + (i + 1) + ' de ' + todo.length + '.');
        return api('/storage/v1/object/documentos/' + t.p, { method: 'POST', headers: { 'Content-Type': t.f.type, 'x-upsert': 'false' }, body: t.f });
      });
    });
    return chain.then(function () {
      status('Registrando o pedido.');
      return api('/rest/v1/cadastros', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({
          id: id, barra_g: st.barra, quantidade: st.qtd, nome: val('nome'), cpf: val('cpf').replace(/\D/g, ''), nascimento: val('nasc'),
          profissao: val('prof'), pep: $('pep').checked, email: val('email'), celular: val('cel').replace(/\D/g, ''),
          cep: val('cep').replace(/\D/g, ''), logradouro: val('rua'), numero: val('num'), complemento: val('comp') || null,
          bairro: val('bairro'), cidade: val('cidade'), uf: $('uf').value, documentos: docs, origem: origem,
          consentimento_em: new Date().toISOString(), consentimento_texto: CONSENT
        })
      });
    });
  }
  function textoWhats() {
    return ['Olá. Quero reservar ouro físico da Ouro Paulista.', '',
      'Barra: ' + st.qtd + ' × ' + st.barra + ' g', 'Nome: ' + val('nome'), 'CPF: ' + val('cpf'), 'Nascimento: ' + nascBR(), 'Profissão: ' + val('prof'),
      'Celular: ' + val('cel'), 'E-mail: ' + val('email'), 'Entrega: ' + endereco(),
      'Pessoa exposta politicamente: ' + ($('pep').checked ? 'sim' : 'não'), '',
      'Autorizo o envio destes dados à instituição autorizada pelo Banco Central para análise do cadastro.',
      'Envio a seguir a foto do documento de identidade e do comprovante de endereço.'].join('\n');
  }
  var sendN = 0, sendK = 0;
  function status(t) {
    $('status').textContent = t;
    if (sending) { sendK++; $('sendbar').firstElementChild.style.setProperty('--k', Math.min(1, sendK / (sendN + 1))); }
  }
  function finish(id) {
    done = true; sending = false;
    var proto = id.slice(0, 8).toUpperCase();
    $('proto').textContent = ONLINE ? 'Protocolo ' + proto : 'Envie na conversa a foto de um documento de identidade e de um comprovante de endereço.';
    $('wa-end').href = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(ONLINE ? 'Olá. Enviei a minha reserva pelo site. Protocolo ' + proto + '. Barra: ' + st.qtd + ' × ' + st.barra + ' g.' : 'Olá. Acabei de enviar a minha reserva pelo site.');
    if (ONLINE) { $('wa-end').textContent = 'Confirmar pelo WhatsApp'; $('wa-hint').hidden = false; }
    show(steps.length - 1);
    try { history.replaceState({ i: cur }, ''); } catch (e) {}
  }
  $('send').addEventListener('click', function () {
    if (sending || !validStep(steps[cur])) return;
    var id = uuid(), btn = $('send');
    if (!ONLINE) { window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(textoWhats()), '_blank', 'noopener'); finish(id); return; }
    sending = true; btn.disabled = true;
    sendN = st.files.documento.length + st.files.comprovante.length + 1; sendK = 0;
    btn.setAttribute('aria-busy', 'true'); $('sendbar').classList.add('on');
    enviarOnline(id).then(function () { finish(id); }).catch(function () {
      sending = false; btn.disabled = false;
      btn.removeAttribute('aria-busy'); $('sendbar').classList.remove('on');
      setTimeout(function () { var i = $('sendbar').firstElementChild; i.style.transition = 'none'; i.style.setProperty('--k', 0); void i.offsetWidth; i.style.transition = ''; }, 160);
      status('Não foi possível enviar agora. Verifique a conexão e tente de novo. Nada foi cobrado.');
      $('wa-alt').href = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(textoWhats());
      $('alt').hidden = false;
    });
  });

  document.documentElement.className = 'js';
  $('conteudo').hidden = false;
  try { history.replaceState({ i: 0 }, ''); } catch (e) {}
  $('prog').style.transition = 'none';
  show(0, false, true);
  requestAnimationFrame(function () { requestAnimationFrame(function () { $('prog').style.transition = ''; }); });
})();
