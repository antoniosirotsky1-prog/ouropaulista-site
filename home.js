/* Home: barra em 3D na capa, animação do Reservar e a história em sketch e aquarela.
   Sem GSAP, com movimento reduzido ou sem JavaScript, a página funciona parada:
   os pesos trocam a imagem, o Reservar leva direto à reserva e a história aparece como quadro. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var G = window.gsap, ST = window.ScrollTrigger;
  var LIVE = !!G && !RM;
  var FIO = '/assets/fio/';
  var cl = function (v, a, b) { return Math.max(0, Math.min(1, (v - a) / (b - a))); };
  var json = function (u) { return fetch(u).then(function (r) { if (!r.ok) throw 0; return r.json(); }); };

  /* linhas: cada traço é desenhado conforme a "pena" passa por ele */
  function build(svg, d, drawn) {
    svg.setAttribute('viewBox', '0 0 ' + d.w + ' ' + d.h);
    var ps = d.paths.map(function (p) {
      var el = document.createElementNS(NS, 'path'); el.setAttribute('d', p.d);
      if (!drawn) { el.style.strokeDasharray = p.l + 2; el.style.strokeDashoffset = p.l + 2; }
      svg.appendChild(el); return { el: el, l: p.l + 2, x: p.x, t: 0 };
    });
    return { w: d.w, h: d.h, ps: ps };
  }
  function drawTo(g, penX, win) {
    for (var i = 0; i < g.ps.length; i++) {
      var p = g.ps[i], t = Math.max(0, Math.min(1, (penX - p.x) / win));
      if (t !== p.t) { p.t = t; p.el.style.strokeDashoffset = p.l * (1 - t); }
    }
  }

  if (window.opPreco) window.opPreco();

  /* ---------- capa ---------- */
  var pk = $('pick'), bar = $('hx-bar'), flt = $('hx-float');
  if (pk && flt) {
    var as = [].slice.call(pk.querySelectorAll('a'));
    var SC = { 1: .62, 5: .72, 10: .8, 25: .88, 50: .94, 100: 1 };
    var src = function (g) { return '/assets/barra-' + g + 'g.webp'; };
    var cur = '10', turn = 0, front, back, still = flt.querySelector('img'), warm = false;
    var heat = function () { if (warm) return; warm = true; as.forEach(function (a) { new Image().src = src(a.getAttribute('data-g')); }); };

    if (LIVE) {
      var T = 18, N = 19;
      var mk = function (cls, z, ry) { var i = new Image(); i.className = cls; i.alt = ''; i.src = src(cur); i.style.transform = 'rotateY(' + ry + 'deg) translateZ(' + z + 'px)'; bar.appendChild(i); return i; };
      for (var k = 0; k < N; k++) mk('edge', -T / 2 + 1 + k * (T - 2) / (N - 1), 0);
      front = mk('', T / 2, 0); back = mk('', T / 2, 180);
      if (still) still.remove();
      G.set(bar, { rotationY: -24, rotationX: 8, scale: SC[10] });
      G.to(flt, { y: -14, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      G.to(flt, { rotationZ: 1.2, duration: 3.7, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      var sh = $('hx-shadow');
      for (var i = 0; i < 34; i++) { var x = 20 + i * 7.8, d = Math.abs(i - 16.5) / 16.5, h = 18 * Math.sqrt(1 - d * d); var l = document.createElementNS(NS, 'path'); l.setAttribute('d', 'M' + x + ' ' + (22 + h) + ' L' + (x + 10) + ' ' + (22 - h)); sh.appendChild(l); }
      G.to(sh, { scaleX: .86, opacity: .55, transformOrigin: '50% 50%', duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      var stage = $('hx-stage');
      if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
        stage.addEventListener('pointermove', function (e) { if (packing) return; var r = stage.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5; G.to(flt, { rotationY: px * 26, rotationX: -py * 18, duration: .6, ease: 'power2.out', overwrite: 'auto' }); });
        stage.addEventListener('pointerleave', function () { if (packing) return; G.to(flt, { rotationY: 0, rotationX: 0, duration: .9, ease: 'power3.out' }); });
      }
    }

    var set = function (a, instant) {
      var g = a.getAttribute('data-g');
      as.forEach(function (x) { x.setAttribute('aria-pressed', x === a ? 'true' : 'false'); });
      $('pick-l').textContent = g + ' g';
      var cg = window.OP_CODIGO ? window.OP_CODIGO.get() : '';
      $('pick-go').href = '/comprar.html?barra=' + g + (cg ? '&codigo=' + cg : '');
      if ($('cod-go') && cg) $('cod-go').href = '/comprar.html?barra=' + g + '&codigo=' + cg;
      pk.setAttribute('data-sel', g); if (window.opPreco) window.opPreco();
      if (LIVE && g !== cur) {
        back.src = src(g); turn += 540;
        G.to(bar, { rotationY: -24 + turn, scale: SC[g], duration: instant ? 0 : .9, ease: 'power3.inOut', overwrite: true });
        if (!instant) G.fromTo(flt, { scale: 1 }, { scale: 1.08, duration: .45, ease: 'power2.out', yoyo: true, repeat: 1, overwrite: 'auto' });
        G.delayedCall(instant ? 0 : .45, function () { $('pick-n').textContent = g; });
        var t = front; front = back; back = t;
      } else {
        $('pick-n').textContent = g;
        if (!LIVE && still) { still.src = src(g); still.style.transform = 'scale(' + SC[g] + ')'; }
      }
      cur = g;
    };
    pk.addEventListener('pointerenter', heat); pk.addEventListener('focusin', heat); pk.addEventListener('touchstart', heat, { passive: true });
    as.forEach(function (a) {
      a.setAttribute('role', 'button'); a.setAttribute('aria-pressed', a.classList.contains('sel') ? 'true' : 'false'); a.classList.remove('sel');
      a.addEventListener('click', function (e) { e.preventDefault(); if (!packing) set(a, e.detail === 0); });
      a.addEventListener('keydown', function (e) { if (e.key === ' ') { e.preventDefault(); if (!packing) set(a, true); } });
    });
    var fromHash = function () { var m = /^#barra-(\d+)g$/.exec(location.hash); if (!m) return; var a = $('barra-' + m[1] + 'g'); if (a && SC[m[1]]) { heat(); set(a, true); } };
    addEventListener('hashchange', fromHash); fromHash();

    /* Reservar: o botão fica dourado, a linha contorna a barra e vira o blister,
       o blister gira e vira a caixa fechada, a caixa sai da tela e a reserva abre.
       Um segundo clique, ou qualquer falha, leva direto à reserva. */
    var packing = false, blLine = null, go = $('pick-go');
    if (LIVE) {
      var arm = function () { json(FIO + 'blister.json').then(function (d) { blLine = build($('hx-ln'), d); new Image().src = FIO + 'caixa.webp'; }).catch(function () {}); };
      if (document.readyState === 'complete') arm(); else addEventListener('load', arm);
      addEventListener('pageshow', function (e) { if (e.persisted && packing) location.reload(); });
      go.addEventListener('click', function (e) {
        if (packing || !blLine || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
        e.preventDefault(); packing = true; go.classList.add('gold');
        var sr = $('hx-stage').getBoundingClientRect(); if (sr.top < 76 || sr.bottom > innerHeight) scrollTo({ top: scrollY + sr.top - 84, behavior: 'smooth' });
        var href = go.href, leave = function () { location.href = href; };
        try {
          G.killTweensOf(flt);
          var bl = $('hx-bl'), box = $('hx-box'), sBar = bl.offsetWidth * .483 / flt.offsetWidth, o = { v: 0 };
          G.set(bl, { opacity: 1, scale: 1, rotationY: 0, transformPerspective: 1400 });
          G.set('#hx-ln', { opacity: 1 }); G.set(['#hx-blister', box], { opacity: 0 });
          G.timeline()
            .to(['#hx-tag', '.hx-shadow', '.hx-cap'], { opacity: 0, duration: .25 }, 0)
            .to(flt, { y: 0, rotationX: 0, rotationY: 0, rotationZ: 0, scale: 1, duration: .5, ease: 'power3.out' }, 0)
            .to(bar, { rotationY: turn, rotationX: 0, scale: sBar, duration: .6, ease: 'power3.inOut' }, 0)
            .to(o, { v: 1, duration: 1.2, ease: 'power1.inOut', onUpdate: function () { drawTo(blLine, o.v * blLine.w * 1.14 - blLine.w * .02, blLine.w * .12); } }, .35)
            .to('#hx-blister', { opacity: 1, duration: .45, ease: 'power1.inOut' }, 1.6)
            .to('#hx-ln', { opacity: 0, duration: .45 }, 1.6)
            .set(bar, { opacity: 0 }, 2.05)
            .to(bl, { rotationY: 270, scale: .86, duration: .6, ease: 'power2.in' }, 2.1)
            .set(bl, { opacity: 0 }, 2.7)
            .set(box, { opacity: 1, transformPerspective: 1400, rotationY: -90, scale: .9 }, 2.7)
            .to(box, { rotationY: 0, scale: 1, duration: .45, ease: 'power3.out' }, 2.7)
            .to(box, { scale: .9, rotation: -7, y: 14, duration: .26, ease: 'power2.out' }, 3.16)
            .add(function () {
              var r = box.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, p = $('hx-trailp');
              p.setAttribute('d', 'M' + x + ' ' + y + 'C' + (x + 120) + ' ' + (y - 260) + ' ' + (innerWidth - 260) + ' ' + (y - 380) + ' ' + (innerWidth + 60) + ' -40');
              G.set(p, { opacity: 1 }); G.to(p, { opacity: 0, duration: .5, delay: .6 });
            }, 3.4)
            .to(box, { x: innerWidth * .5, y: -innerHeight * .75, scale: .18, rotation: 24, duration: .7, ease: 'power3.in' }, 3.42)
            .add(leave, 4.0);
        } catch (err) { leave(); }
      });
    }
  }

  /* ---------- passos: o sketch se desenha e vira aquarela quando entra na tela ---------- */
  (function () {
    var arts = document.querySelectorAll('.st-art');
    if (!LIVE || !arts.length || !('IntersectionObserver' in window)) return;
    [].forEach.call(arts, function (a) { G.set(a.querySelector('img'), { opacity: 0 }); });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return; io.unobserve(e.target);
        var a = e.target, img = a.querySelector('img'), svg = a.querySelector('svg'), n = Number(a.getAttribute('data-art')) || 1;
        var wait = innerWidth > 960 ? (n - 1) * .22 : 0;
        img.loading = 'eager';
        json('/assets/passos/ol-passo-' + n + '.json').then(function (d) {
          var g = build(svg, d), pen = { x: -60 };
          G.to(pen, { x: d.w + 120, duration: 1.5, delay: wait, ease: 'power1.inOut', onUpdate: function () { drawTo(g, pen.x, 110); } });
          G.to(img, { opacity: 1, duration: .9, delay: wait + 1.05, ease: 'power1.out' });
          G.to(svg, { opacity: 0, duration: .7, delay: wait + 1.5, ease: 'power1.out' });
        }).catch(function () { G.set(img, { opacity: 1 }); });
      });
    }, { threshold: .3 });
    [].forEach.call(arts, function (a) { io.observe(a); });
  })();

  /* ---------- roleta como banner de entrada: abre antes de tudo na primeira visita e pelo link "5% a menos" ---------- */
  (function () {
    var gate = $('codigo'), box = gate && gate.firstElementChild, no = $('gate-no'), out = $('cod-out');
    if (!gate || !box) return;
    var last = null, KEY = 'op_gate';
    var seen = function () { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } };
    function open() {
      if (!gate.hidden) return;
      last = document.activeElement; gate.hidden = false; document.documentElement.classList.add('gate-on');
      if (LIVE) { G.fromTo(gate, { opacity: 0 }, { opacity: 1, duration: .25, ease: 'power1.out' }); G.fromTo(box, { y: 28, scale: .97 }, { y: 0, scale: 1, duration: .45, ease: 'power3.out' }); }
      var b = $('g-nome'); if (!b || b.offsetParent === null) b = $('cod-go'); if (b) try { b.focus({ preventScroll: true }); } catch (e) {}
    }
    function close() {
      if (gate.hidden) return;
      gate.hidden = true; document.documentElement.classList.remove('gate-on');
      try { localStorage.setItem(KEY, '1'); } catch (e) {}
      if (location.hash === '#codigo' && history.replaceState) history.replaceState(null, '', location.pathname + location.search);
      if (last && last.focus) try { last.focus({ preventScroll: true }); } catch (e) {}
    }
    gate.addEventListener('click', function (e) { if (e.target === gate) close(); });
    $('gate-x').addEventListener('click', close);
    if (no) no.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (gate.hidden) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      var f = [].filter.call(gate.querySelectorAll('a[href],button,summary'), function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    });
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href$="#codigo"]');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault(); open();
    });
    if (no && out) try { new MutationObserver(function () { if (!out.hidden) no.textContent = 'Continuar no site'; }).observe(out, { attributes: true, attributeFilter: ['hidden'] }); } catch (e) {}
    /* nome e e-mail antes de girar: o botão só acende com os dois preenchidos */
    var U = window.OP_USER, fm = $('gate-f'), fn = $('g-nome'), fe = $('g-email'), bt = $('cod-go');
    if (U && fm && fn && fe && bt) {
      var u0 = U.get(); if (u0) { fn.value = u0.nome; fe.value = u0.email; }
      var acende = function () { bt.classList.toggle('off', !(fn.value.trim().length >= 2 && U.EMAIL.test(fe.value.trim()))); };
      fn.addEventListener('input', acende); fe.addEventListener('input', acende); acende();
      fm.addEventListener('submit', function (e) { e.preventDefault(); bt.click(); });
    }
    var tem = window.OP_CODIGO && window.OP_CODIGO.get();
    if (location.hash === '#codigo' || (!seen() && !tem)) open();
  })();

  /* ---------- roleta: sorteio feito no banco, depois de nome e e-mail ---------- */
  (function () {
    var COD = window.OP_CODIGO, w = $('cod-wheel'), go = $('cod-go');
    if (!COD || !w || !go) return;
    var n = 12, A = Math.PI * 2 / n, got = false;
    /* fatias da roda; o resultado é sorteado em codigo.js (CHANCES), não pelo tamanho das fatias */
    var LAB = ['5%', '10%', '5%', '5%', '15%', '5%', '5%', '10%', '5%', '5%', '1 g', '5%'], ALVO = { '5': 0, '10': 1, '15': 4, B: 10 };
    var el = function (t, a, p) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); (p || w).appendChild(e); return e; };
    el('circle', { r: 198, fill: '#111' });
    for (var i = 0; i < n; i++) {
      var a = i * A - A / 2, b = a + A, r0 = 44, r1 = 190;
      el('path', { d: 'M' + Math.cos(a) * r1 + ' ' + Math.sin(a) * r1 + 'A' + r1 + ' ' + r1 + ' 0 0 1 ' + Math.cos(b) * r1 + ' ' + Math.sin(b) * r1 + 'L' + Math.cos(b) * r0 + ' ' + Math.sin(b) * r0 + 'A' + r0 + ' ' + r0 + ' 0 0 0 ' + Math.cos(a) * r0 + ' ' + Math.sin(a) * r0 + 'Z', fill: LAB[i] === '1 g' ? '#d4a017' : LAB[i] !== '5%' ? '#f0d98a' : i % 2 ? '#ffffff' : '#f3efe4', stroke: '#111', 'stroke-width': .5 });
      el('circle', { cx: Math.cos(a) * 194, cy: Math.sin(a) * 194, r: 2, fill: '#f3efe4' });
      var g = el('g', { transform: 'rotate(' + (i * 30) + ')' });
      var t = el('text', { x: 176, y: 9, 'text-anchor': 'end', 'font-family': 'Inter Tight, sans-serif', 'font-weight': 800, 'font-size': 26, 'letter-spacing': '-.02em', fill: '#111' }, g); t.textContent = LAB[i];
      var t2 = el('text', { x: 122, y: 4, 'text-anchor': 'end', 'font-family': 'Inter Tight, sans-serif', 'font-weight': 700, 'font-size': 10, 'letter-spacing': '.14em', fill: '#111' }, g); t2.textContent = LAB[i] === '1 g' ? 'BARRA DE' : 'A MENOS';
    }
    el('circle', { r: 44, fill: '#d4a017', stroke: '#111', 'stroke-width': 3 });
    var hub = el('text', { y: 8, 'text-anchor': 'middle', 'font-family': 'Inter Tight, sans-serif', 'font-weight': 800, 'font-size': 24, 'letter-spacing': '-.02em', fill: '#111' }); hub.textContent = 'OURO';
    var idle = LIVE ? G.to(w, { rotation: '+=360', duration: 40, ease: 'none', repeat: -1, transformOrigin: '50% 50%' }) : null;
    function reveal() {
      got = true; var meu = COD.get() || COD.GERAL, ganho = COD.desconto(meu) || { pct: 5, barra: false };
      var us = window.OP_USER && window.OP_USER.get(), fm = $('gate-f');
      $('h-cod').innerHTML = 'Você ganhou <em>' + COD.rotulo(meu) + '</em>.';
      var ob = $('cod-out').querySelector('b'), os = $('cod-out').querySelector('span'); if (ob) ob.textContent = meu;
      if (os) os.textContent = ganho.barra ? 'uma barra de 1 g junto com a sua primeira compra, e 5% a menos nas barras de 1, 5 e 10 g' : ganho.pct + '% a menos nas barras de 1, 5 e 10 g, na primeira compra';
      $('cod-sub').textContent = (us ? us.nome.split(' ')[0] + ', o código vale' : 'Vale') + ' para a primeira barra de 1, 5 ou 10 g. Ele já está aplicado no preço desta página e entra sozinho na reserva.';
      if (fm) fm.hidden = true; go.classList.remove('off');
      if (window.OP_USER) window.OP_USER.pinta();
      $('cod-out').hidden = false; go.textContent = 'Usar meu código';
      var sel = pk ? pk.getAttribute('data-sel') || '10' : '10';
      go.href = '/comprar.html?barra=' + sel + '&codigo=' + meu;
      if ($('pick-go')) $('pick-go').href = '/comprar.html?barra=' + sel + '&codigo=' + meu;
      if (window.opPreco) window.opPreco();
    }
    function coins() {
      var z = $('cod-wz'), r = z.getBoundingClientRect(), cx = r.width / 2, cy = r.height / 2;
      for (var i = 0; i < 40; i++) (function () {
        var c = document.createElement('i'); c.className = 'cod-coin'; z.appendChild(c);
        var sz = 12 + Math.random() * 14, ang = -Math.PI / 2 + (Math.random() - .5) * 2.6, v = r.width * (.35 + Math.random() * .5);
        G.set(c, { x: cx, y: cy, width: sz, height: sz, opacity: 1 });
        G.to(c, { x: cx + Math.cos(ang) * v, duration: 1.7, ease: 'power1.out' });
        G.to(c, { y: cy + Math.sin(ang) * v * .8, duration: .55, ease: 'power2.out', onComplete: function () { G.to(c, { y: r.height + 80, opacity: 0, duration: 1.1, ease: 'power2.in', onComplete: function () { c.remove(); } }); } });
        G.to(c, { scaleX: .12, duration: .16 + Math.random() * .12, ease: 'sine.inOut', yoyo: true, repeat: 9 });
      })();
    }
    if (COD.get()) reveal();
    go.addEventListener('click', function (e) {
      if (got || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault();
      var U = window.OP_USER, fn = $('g-nome'), fe = $('g-email'), er = $('gate-e');
      if (U && fn && fe) {
        var nm = fn.value.trim(), em = fe.value.trim(), okN = nm.length >= 2, okE = U.EMAIL.test(em);
        fn.setAttribute('aria-invalid', String(!okN)); fe.setAttribute('aria-invalid', String(!okE));
        if (!okN || !okE) { if (er) er.textContent = !okN ? 'Digite seu nome para girar.' : 'Digite um e-mail válido para girar.'; (okN ? fe : fn).focus(); return; }
        if (er) er.textContent = ''; U.set(nm, em);
      }
      var nmv = fn ? fn.value.trim() : '', eml = fe ? fe.value.trim() : '';
      got = true; go.classList.add('off');
      /* o sorteio é feito no banco (backend/roleta.sql) e fica registrado com nome e e-mail */
      COD.girar(nmv, eml).then(function (res) {
        var fim = function () { COD.set(res.codigo); reveal(); };
        if (!LIVE) { fim(); return; }
        if (idle) idle.kill();
        var now = G.getProperty(w, 'rotation') % 360; G.set(w, { rotation: now });
        var para = ((-90 - ALVO[res.premio] * 30 - now) % 360 + 360) % 360;
        G.to(w, { rotation: now + 360 * 4 + para, duration: 4.6, ease: 'power4.out', onComplete: function () { coins(); fim(); } });
      });
    });
  })();

  /* ---------- a história ---------- */
  var fio = $('fio');
  if (!fio) return;
  var PANELS = ['ouro', 'bandeira', 'igreja', '1822', '1867', 'r32', 'predio', 'sky', '2026'];
  /* rótulo, ano, título e legenda de cada época */
  var INTRO = ['Raposo Tavares', '1628', 'O ouro sempre saiu de São Paulo a pé.', 'Raposo Tavares deixa a vila de São Paulo de Piratininga a pé, rumo ao sertão. É o bandeirante que dá rosto à Ouro Paulista.'];
  var CH = [
    ['Sertão de São Paulo', '1693', 'Quem achou o ouro foram os paulistas.', 'Bandeiras saídas de São Paulo encontram ouro no interior. O nome Minas Gerais só viria em 1720.'],
    ['O caminho do ouro', '1709', 'São Paulo e Minas do Ouro.', 'A Coroa cria a Capitania de São Paulo e Minas do Ouro. As minas e São Paulo eram uma coisa só.'],
    ['Barroco paulista', '1750', 'O ouro virou altar.', 'O ouro vira talha dourada nos altares das igrejas paulistas.'],
    ['Independência', '1822', 'O país nasceu em São Paulo.', 'O grito da Independência é dado às margens do Ipiranga.'],
    ['Ouro verde', '1867', 'O ouro mudou de cor.', 'O café desce a serra de trem e enriquece São Paulo. O apelido dele diz tudo: ouro verde.'],
    ['Revolução Constitucionalista', '1932', 'Ouro para o bem de São Paulo.', 'Os paulistas doam alianças e joias à campanha. Quem doava recebia um anel com a frase “Dei ouro para o bem de São Paulo”.'],
    ['O prédio do ouro', '1939', 'O ouro que sobrou virou prédio.', 'Com o ouro que restou da campanha ergueu-se, no centro, o Edifício Ouro para o Bem de São Paulo, entregue à Santa Casa. É dessa frase que vem o nosso lema.'],
    ['São Paulo', 'Hoje', 'A cidade que o ouro ajudou a erguer.', 'A vila de onde saíam as bandeiras é hoje a maior cidade do país.'],
    ['Na sua casa', '2026', 'Ouro de São Paulo para o seu bem.', 'A Ouro Paulista inverte a frase de 1932: agora é o ouro que vai até você, em barra, no seu nome.']
  ];
  var data = null, trig = null, lenis = null, lastW = 0;
  var track = $('fio-track'), quadro = $('fio-quadro'), walker = $('fio-walker'), rap = $('fio-rap');

  /* tamanho de cada cena para uma altura de chão vh */
  function sizes(ds, vh) {
    return ds.map(function (d) { var hh = vh / (d.g || 1) * (d.s || 1); return { hh: hh, bl: hh * (1 - (d.g || 1)), w: d.w / d.h * hh }; });
  }
  /* o quadro final: todas as cenas pintadas, em faixas, dentro de uma moldura */
  function paintQuadro(ds, maxW, maxH) {
    quadro.textContent = '';
    var vh = 300, sz = sizes(ds, vh), per = maxW < 620 ? 2 : 3, rows = [], i;
    for (i = 0; i < ds.length; i += per) rows.push(ds.map(function (_, j) { return j; }).slice(i, i + per));
    var rw = rows.map(function (r) { return r.reduce(function (a, j) { return a + sz[j].w; }, 0); });
    var rh = rows.reduce(function (a, r) { return a + vh + Math.max.apply(0, r.map(function (j) { return sz[j].bl; })); }, 0);
    var k = Math.min(maxW / Math.max.apply(0, rw), maxH / rh);
    rows.forEach(function (r) {
      var row = document.createElement('div'); row.className = 'qrow';
      var mb = Math.max.apply(0, r.map(function (j) { return sz[j].bl; })) * k;
      r.forEach(function (j) {
        var c = document.createElement('div'); c.style.width = sz[j].w * k + 'px'; c.style.height = sz[j].hh * k + 'px'; c.style.marginBottom = (mb - sz[j].bl * k) + 'px';
        var im = new Image(); im.alt = ''; im.decoding = 'async'; im.src = FIO + 'aq-' + PANELS[j] + '.webp'; c.appendChild(im);
        var sv = document.createElementNS(NS, 'svg'); c.appendChild(sv); build(sv, ds[j], true); row.appendChild(c);
      });
      quadro.appendChild(row);
    });
  }
  function quadroParado() {
    fio.classList.remove('live'); fio.classList.add('still');
    if (G) G.set(quadro, { clearProps: 'all' });
    var w = fio.clientWidth - 48 - (innerWidth > 960 ? 66 : 34);
    paintQuadro(data.ds, Math.min(w, 1180), 1e5); quadro.classList.add('on');
  }
  function live() {
    var ds = data.ds, rd = data.rap, W = innerWidth, H = innerHeight;
    if (trig) { trig.kill(true); trig = null; }
    [].slice.call(track.children).forEach(function (n) { n.remove(); });
    while (rap.firstChild) rap.removeChild(rap.firstChild);
    fio.classList.remove('still'); fio.classList.add('live'); fio.style.height = H + 'px';
    var vh = H * .44, sz = sizes(ds, vh), gs = [], offs = [], total = 0;
    ds.forEach(function (d, i) {
      var s = document.createElementNS(NS, 'svg'); s.style.height = sz[i].hh + 'px'; s.style.marginBottom = -sz[i].bl + 'px'; track.appendChild(s);
      gs.push(build(s, d)); offs[i] = total; total += sz[i].w;
    });
    var aq = ds.map(function (d, i) {
      var im = new Image(); im.className = 'aq'; im.alt = ''; im.decoding = 'async'; im.src = FIO + 'aq-' + PANELS[i] + '.webp';
      im.style.width = sz[i].w + 'px'; im.style.height = sz[i].hh + 'px'; im.style.left = offs[i] + 'px'; im.style.bottom = -sz[i].bl + 'px'; track.appendChild(im); return im;
    });
    [0, 1].forEach(function (j) { var l = document.createElement('div'); l.className = 'gl'; l.style[j ? 'left' : 'right'] = '100%'; track.appendChild(l); });
    paintQuadro(ds, Math.min(W * .9, 1260) - (W > 960 ? 66 : 34), H * .7 - 84);
    /* Raposo em linha: mesmo tamanho da figura real; desfaz de cima para baixo e vira o fio */
    var rg = build(rap, rd, true), bb = rap.getBBox();
    rap.setAttribute('viewBox', (bb.x - 4) + ' ' + (bb.y - 4) + ' ' + (bb.width + 8) + ' ' + (bb.height + 6));
    var wH = H * .27; rap.style.height = wH + 'px'; rap.style.width = wH * (bb.width + 8) / (bb.height + 6) + 'px';
    var rps = rg.ps.map(function (p) { return { el: p.el, l: p.l, y: p.el.getBBox().y }; });
    rps.forEach(function (p) { p.el.style.strokeDasharray = p.l; p.el.style.strokeDashoffset = 0; });
    var y0 = bb.y, yh = bb.height, lead = W * .22, startX = lead + W * .02, L = gs.length - 1;
    var xEnd = W / 2 - (offs[L] + sz[L].w / 2), travel = startX - xEnd;
    var head = fio.querySelector('.fio-head'), chap = fio.querySelector('.fio-chap'), cl0 = $('fio-chap-l'), cy = $('fio-chap-y'), leg = $('fio-legend'), h2 = $('h-fio'), legw = leg.parentNode, fin = $('fio-fin'), skip = fio.querySelector('.fio-skip');
    var lab = '';
    function render(p) {
      var wi = cl(p, 0, .05), xf = cl(p, .045, .06), un = cl(p, .06, .105);
      var q = cl(p, .08, .86), a = cl(p, .88, .94), fr = cl(p, .93, .99);
      var x0 = startX - q * travel;
      G.set(track, { x: x0, opacity: 1 - fr });
      var pen = p < .08 ? -1e6 : -x0 + W * (.3 + .32 * cl(p, .08, .14)) + W * .4 * cl(p, .8, .88);
      for (var i = 0; i < gs.length; i++) drawTo(gs[i], (pen - offs[i]) / sz[i].w * gs[i].w, gs[i].w * .09);
      for (i = 0; i < aq.length; i++) aq[i].style.opacity = Math.max(a, cl((pen - offs[i]) / sz[i].w, .6, 1.1));
      var wx0 = -W * .16 + (lead + W * .16) * wi;
      walker.style.left = rap.style.left = wx0 + 'px';
      var f = ((Math.floor(wi * (lead + W * .16) / 22) % 12) + 12) % 12; walker.style.backgroundPosition = (f / 11 * 100) + '% 0';
      walker.style.opacity = 1 - xf; rap.style.opacity = p >= .105 ? 0 : xf;
      for (i = 0; i < rps.length; i++) { var pp = rps[i], t0 = (pp.y - y0) / yh * .7; pp.el.style.strokeDashoffset = pp.l * cl(un, t0, t0 + .3); }
      head.style.opacity = chap.style.opacity = skip.style.opacity = 1 - fr; legw.style.opacity = 1 - cl(p, .9, .94); fin.style.opacity = fr;
      G.set(quadro, { opacity: fr, scale: .94 + .06 * fr, xPercent: -50, yPercent: -50 });
      var wx = W * .5 - x0, k = 0; for (i = 0; i < offs.length; i++) if (wx > offs[i]) k = i;
      var c = p < .1 ? INTRO : CH[k];
      if (lab !== c[0]) { var first = !lab; lab = c[0]; cl0.textContent = c[0]; cy.textContent = c[1]; h2.textContent = c[2]; leg.textContent = c[3]; if (!first) G.fromTo([h2, leg], { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .45, ease: 'power3.out', stagger: .06, overwrite: true }); }
    }
    render(0);
    trig = ST.create({ trigger: fio, start: 'top top', end: '+=' + Math.round(travel * 1.3), pin: true, scrub: .6, invalidateOnRefresh: false, onUpdate: function (s) { render(s.progress); } });
    ST.refresh();
  }
  function start() {
    if (data) return;
    data = {};
    Promise.all([Promise.all(PANELS.map(function (n) { return json(FIO + 'ol-' + n + '.json'); })), json(FIO + 'raposo.json')]).then(function (r) {
      data = { ds: r[0], rap: r[1] };
      if (!LIVE || !ST) { quadroParado(); return; }
      G.registerPlugin(ST); lastW = innerWidth;
      try { live(); } catch (e) { if (trig) { trig.kill(true); trig = null; } fio.style.height = ''; quadroParado(); }
      var t; addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { if (innerWidth === lastW || !fio.classList.contains('live')) return; lastW = innerWidth; try { live(); } catch (e) {} }, 250); });
    }).catch(function (e) { data = null; if (window.console) console.warn('fio', e); });
  }
  if (LIVE && ST && window.Lenis && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    try {
      lenis = new window.Lenis({ lerp: .1, anchors: { offset: -88 } });
      lenis.on('scroll', ST.update); G.ticker.add(function (t) { lenis.raf(t * 1000); }); G.ticker.lagSmoothing(0);
    } catch (e) { lenis = null; }
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); start(); } }, { rootMargin: '150% 0px' });
    io.observe(fio);
  } else start();
})();
