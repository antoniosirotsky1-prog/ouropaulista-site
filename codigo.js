/* Código de primeira compra e código de indicação.
   Regra: barras de 1, 5 e 10 g têm acréscimo de 5% no preço de referência. Com código válido, na primeira compra,
   o acréscimo não é cobrado. O código geral é o mesmo para todo mundo: não há sorteio.
   Depois da primeira reserva o cliente recebe um código de indicação próprio (OP + protocolo + dígito de conferência).
   A conferência final (primeira compra, indicação válida) é feita no atendimento, antes do pagamento. */
(function () {
  'use strict';
  var GERAL = 'PAULISTA5', CH = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  function digito(s) { var n = 7; for (var i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i) * (i + 3)) % 9973; return CH[n % CH.length]; }
  function limpa(c) { return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12); }
  function valido(c) {
    c = limpa(c);
    if (c === GERAL) return true;
    return /^OP[0-9A-F]{6}[0-9A-Z]$/.test(c) && digito(c.slice(0, 8)) === c[8];
  }
  function gerar(id) { var b = 'OP' + String(id || '').replace(/[^0-9a-f]/gi, '').slice(0, 6).toUpperCase(); return b.length === 8 ? b + digito(b) : ''; }
  function get() { try { var c = localStorage.getItem('op_codigo'); return valido(c) ? limpa(c) : ''; } catch (e) { return ''; } }
  function set(c) { try { if (valido(c)) localStorage.setItem('op_codigo', limpa(c)); } catch (e) {} }
  /* preço de referência de uma barra, em reais: com código válido usa a tabela sem acréscimo, quando existe */
  function preco(d, g, c) { var v = Number(d && d.barras && d.barras[g]), k = Number(d && d.com_codigo && d.com_codigo[g]); return valido(c) && k > 0 ? k : v; }
  window.OP_CODIGO = { GERAL: GERAL, limpa: limpa, valido: valido, gerar: gerar, get: get, set: set, preco: preco, MIN_INDICADO_G: 50 };
})();
