/* Blog: lê /blog.json e preenche cada [data-blog]. data-max limita a quantidade.
   Cada post: data (AAAA-MM-DD), tipo ("noticia" ou "post"), titulo, resumo, fonte, url e, se houver, img e data_texto.
   "noticia" é repost com fonte; "post" é conteúdo da Ouro Paulista (o mesmo do Instagram). */
(function () {
  'use strict';
  var boxes = document.querySelectorAll('[data-blog]');
  if (!boxes.length || !window.fetch) return;
  var MES = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
  var el = function (t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  var seguro = function (u) { return /^https:\/\//.test(u || '') || /^\/[^/]/.test(u || ''); };
  function card(p) {
    var d = String(p.data || '').split('-'), a = el('article', 'post');
    var dt = el('p', 'post-d'); dt.appendChild(el('b', '', d[2] ? String(Number(d[2])) : ''));
    dt.appendChild(el('span', '', p.data_texto || ((MES[Number(d[1]) - 1] || '') + ' ' + (d[0] || ''))));
    if (p.data_texto) dt.firstChild.textContent = '';
    a.appendChild(dt);
    var m = el('div', 'post-m');
    m.appendChild(el('p', 'label', p.tipo === 'post' ? 'Ouro Paulista' : 'Notícia'));
    m.appendChild(el('h3', '', p.titulo));
    if (p.resumo) m.appendChild(el('p', 'post-r', p.resumo));
    a.appendChild(m);
    var s = el('p', 'post-s');
    if (seguro(p.img)) { var i = el('img'); i.src = p.img; i.alt = ''; i.loading = 'lazy'; i.decoding = 'async'; s.appendChild(i); }
    if (seguro(p.url)) {
      var k = el('a', '', p.tipo === 'post' ? 'Ver a publicação' : 'Ler na fonte'); k.href = p.url;
      if (/^https:/.test(p.url)) { k.target = '_blank'; k.rel = 'noopener'; }
      s.appendChild(k);
    }
    if (p.fonte) s.appendChild(el('span', '', p.fonte));
    a.appendChild(s);
    return a;
  }
  fetch('/blog.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (!j || !j.posts || !j.posts.length) return;
    var ps = j.posts.slice().sort(function (a, b) { return a.data < b.data ? 1 : -1; });
    [].forEach.call(boxes, function (b) {
      var n = Number(b.getAttribute('data-max')) || ps.length;
      b.textContent = '';
      ps.slice(0, n).forEach(function (p) { b.appendChild(card(p)); });
    });
  }).catch(function () {});
})();
