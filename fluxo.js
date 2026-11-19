/* Arte do fluxo de compra: barra girando e certificado que se preenche.
   Só desenha no computador, com movimento permitido. Lê os campos do
   formulário, não grava nem envia nada. O envio continua em comprar.js. */
(function () {
  'use strict';
  var G = window.gsap, stage = document.querySelector('.stage'), scenes = document.querySelector('.scenes');
  if (!G || !stage || !scenes) return;
  if (!matchMedia('(min-width:900px)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var $ = function (id) { return document.getElementById(id); };
  var src0 = $('bar-img'); if (!src0) return;

  var box = document.createElement('div'); box.className = 'fx';
  box.innerHTML = '<div class="fx-spin"><div class="fx-bar" id="fx-bar"></div></div>' +
    '<div class="fx-cert"><p class="hd">Sua reserva</p>' +
    '<p><span>Barra</span><b id="fx-peso"></b></p>' +
    '<p><span>Titular</span><b id="fx-nome">—</b></p>' +
    '<p><span>CPF</span><b id="fx-cpf">—</b></p>' +
    '<p><span>Contato</span><b id="fx-cel">—</b></p>' +
    '<p><span>Entrega</span><b id="fx-ent">—</b></p>' +
    '<img class="fx-seal" src="/assets/gravura-lacre.webp" alt="" width="480" height="480"></div>';
  scenes.appendChild(box); stage.classList.add('fx-on');

  /* barra em 3D, mesma construção da capa */
  var bar = $('fx-bar'), T = 12, N = 13, imgs = [];
  var mk = function (cls, z, ry) { var i = new Image(); i.className = cls; i.alt = ''; i.src = src0.getAttribute('src'); i.style.transform = 'rotateY(' + ry + 'deg) translateZ(' + z + 'px)'; bar.appendChild(i); imgs.push(i); };
  for (var k = 0; k < N; k++) mk('edge', -T / 2 + 1 + k * (T - 2) / (N - 1), 0);
  mk('', T / 2, 0); mk('', T / 2, 180);
  G.set(bar, { rotationX: 6 });
  var spin = G.to(bar, { rotationY: 360, duration: 9, ease: 'none', repeat: -1 });
  G.to('.fx-spin', { y: -12, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  document.addEventListener('visibilitychange', function () { spin.paused(document.hidden); });

  var flash = function (el) { G.fromTo(el.parentNode, { backgroundColor: 'rgba(212,160,23,.28)' }, { backgroundColor: 'rgba(212,160,23,0)', duration: 1.4, overwrite: true }); };
  var put = function (id, v) { var el = $(id); v = v || '—'; if (el.textContent === v) return; el.textContent = v; flash(el); };

  var peso = function () {
    var q = +($('q-out') || {}).textContent || 1, w = ($('bar-w') || {}).textContent || '';
    put('fx-peso', (q > 1 ? q + ' × ' : '') + w + ' · Au 999');
  };
  new MutationObserver(function () { var s = src0.getAttribute('src'); imgs.forEach(function (i) { if (i.getAttribute('src') !== s) i.src = s; }); G.fromTo('.fx-spin', { scale: 1.08 }, { scale: 1, duration: .5, ease: 'power2.out' }); }).observe(src0, { attributes: true, attributeFilter: ['src'] });
  ['bar-w', 'q-out'].forEach(function (id) { if ($(id)) new MutationObserver(peso).observe($(id), { childList: true, characterData: true, subtree: true }); });
  peso();

  var val = function (id) { var e = $(id); return e ? String(e.value || '').trim() : ''; };
  var fill = function () {
    put('fx-nome', val('nome'));
    put('fx-cpf', val('cpf').length >= 14 ? val('cpf') : '');
    put('fx-cel', val('cel').replace(/\D/g, '').length >= 10 ? val('cel') : '');
    var c = val('cidade'), u = val('uf');
    put('fx-ent', c ? c + (u ? ' · ' + u : '') : (val('cep').length >= 9 ? 'CEP ' + val('cep') : ''));
  };
  var t; document.addEventListener('input', function () { clearTimeout(t); t = setTimeout(fill, 350); });
  document.addEventListener('change', fill);
  fill();
})();
