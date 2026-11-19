/* Estimativa de frete da reserva. Sem dependências. Expõe window.OP_FRETE.

   De onde vêm os números
   - Postagem: simulador público dos Correios (SEDEX à vista, objeto de até 300 g, origem na cidade de São Paulo),
     consultado em 19/11/2026. Os Correios não publicam a tabela inteira, então há 17 destinos consultados:
       R$ 25,80   São Paulo, Campinas
       R$ 43,00   Rio de Janeiro, Belo Horizonte, Curitiba, Florianópolis, Porto Alegre, Brasília, Goiânia
       R$ 60,10   Cuiabá
       R$ 68,00   Uberlândia (interior de MG)
       R$ 77,10   Recife, Fortaleza, Belém
       R$ 89,80   Manaus
       R$ 104,50  Caruaru (interior de PE)
     Nos dois casos medidos, o interior fica dois degraus acima da capital do mesmo estado. A conta usa essa regra.
     Capitais sem consulta usam o degrau da capital vizinha mais cara (ES, MS, BA, SE, AL, PB, RN, TO, MA, PI, AC, RO, RR, AP).
   - Seguro: serviço Valor Declarado dos Correios, 2% sobre o que passa de R$ 25,50 por objeto (conferido no mesmo simulador).
   - Limite por envio, portador e retirada: política pública de entrega da instituição que vende e entrega o ouro.

   É estimativa. O frete que vale é o informado junto com o valor do dia, antes do pagamento.
   Para atualizar: refazer as consultas no simulador e trocar DEGRAUS e NIVEL. */
(function () {
  'use strict';

  var TABELA = {
    consulta: '2026-11-19',
    seguro: 0.02,            // Valor Declarado: 2%
    franquia: 25.5,          // indenização automática, fora da base do seguro
    limiteEnvio: 38057.59,   // valor máximo por envio pelos Correios
    portadorMinimo: 2000,    // compra mínima para entrega por portador
    // SEDEX à vista, até 300 g, origem São Paulo capital. Degraus de preço e degrau da capital de cada estado.
    degraus: [25.8, 43, 60.1, 68, 77.1, 89.8, 104.5],
    nivel: {
      SP: 0,
      RJ: 1, MG: 1, PR: 1, SC: 1, RS: 1, DF: 1, GO: 1,
      MT: 2, ES: 2, MS: 2,
      PE: 4, CE: 4, PA: 4, BA: 4, SE: 4, AL: 4, PB: 4, RN: 4, TO: 4,
      AM: 5, MA: 5, PI: 5,
      AC: 6, RO: 6, RR: 6, AP: 6
    }
  };

  /* Postagem de um envio. No estado de São Paulo vale o mesmo degrau da capital (medido em Campinas). */
  function sedex(uf, capital) {
    var n = TABELA.nivel[uf];
    if (n === undefined) return 0;
    if (!capital && uf !== 'SP') n = Math.min(n + 2, TABELA.degraus.length - 1);
    return TABELA.degraus[n];
  }

  var CAPITAIS = {
    AC: 'rio branco', AL: 'maceio', AP: 'macapa', AM: 'manaus', BA: 'salvador', CE: 'fortaleza', DF: 'brasilia', ES: 'vitoria',
    GO: 'goiania', MA: 'sao luis', MT: 'cuiaba', MS: 'campo grande', MG: 'belo horizonte', PA: 'belem', PB: 'joao pessoa',
    PR: 'curitiba', PE: 'recife', PI: 'teresina', RJ: 'rio de janeiro', RN: 'natal', RS: 'porto alegre', RO: 'porto velho',
    RR: 'boa vista', SC: 'florianopolis', SP: 'sao paulo', SE: 'aracaju', TO: 'palmas'
  };
  /* Cidades atendidas por portador, conforme a política pública de entrega. */
  var PORTADOR = ['sao paulo', 'osasco', 'diadema', 'sao bernardo do campo', 'santo andre', 'guarulhos', 'barueri', 'santana de parnaiba', 'sao caetano do sul'];

  function limpa(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  /* p: { uf, cidade, unit (preço de referência de uma barra, 0 se não houver), qtd }
     Devolve { valor, opcoes: [{ id, nome, detalhe, ok, frete, partes, envios }] }.
     frete: número em reais (estimativa), 0 para retirada, null quando o custo só sai na confirmação. */
  function calcular(p) {
    var uf = String(p.uf || '').toUpperCase(), cidade = limpa(p.cidade);
    var unit = Number(p.unit) > 0 ? Number(p.unit) : 0, qtd = Math.max(1, Number(p.qtd) || 1);
    var valor = unit * qtd, opcoes = [];

    /* Correios */
    var c = { id: 'correios', nome: 'Correios, SEDEX com seguro', ok: true, frete: null, partes: null, envios: 1,
      detalhe: 'Postagem de 3 a 7 dias úteis depois do pagamento, com código de rastreio.' };
    var tarifa = sedex(uf, CAPITAIS[uf] === cidade);
    if (unit > TABELA.limiteEnvio) {
      c.ok = false;
      c.detalhe = 'Indisponível para esta barra. O valor passa do limite por envio dos Correios.';
    } else if (unit && tarifa) {
      var porEnvio = Math.max(1, Math.floor(TABELA.limiteEnvio / unit));
      c.envios = Math.ceil(qtd / porEnvio);
      var postagem = tarifa * c.envios;
      var seguro = TABELA.seguro * Math.max(0, valor - TABELA.franquia * c.envios);
      c.partes = { postagem: Math.round(postagem * 100) / 100, seguro: Math.round(seguro * 100) / 100 };
      c.frete = Math.ceil(postagem + seguro);
      if (c.envios > 1) c.detalhe += ' Segue em ' + c.envios + ' envios, pelo limite de valor por envio.';
    } else {
      c.detalhe += ' O frete é informado antes do pagamento.';
    }
    opcoes.push(c);

    /* Portador */
    if (uf === 'SP' && PORTADOR.indexOf(cidade) >= 0) {
      var pt = { id: 'portador', nome: 'Portador, na Grande São Paulo', ok: true, frete: null, partes: null, envios: 1,
        detalhe: 'De segunda a sexta, das 9h às 18h. Entrega somente a você, com documento. O custo é informado antes do pagamento.' };
      if (unit && valor < TABELA.portadorMinimo) { pt.ok = false; pt.detalhe = 'Disponível para compras a partir de R$ 2.000.'; }
      else if (!unit) pt.detalhe = 'Para compras a partir de R$ 2.000. ' + pt.detalhe;
      opcoes.push(pt);
    }

    /* Acima do limite dos Correios e fora da área do portador */
    if (!c.ok && !opcoes.some(function (o) { return o.id === 'portador' && o.ok; })) {
      opcoes.push({ id: 'combinar', nome: 'Entrega a combinar', ok: true, frete: null, partes: null, envios: 1,
        detalhe: 'Verificamos a forma de entrega para o seu endereço e informamos o custo antes do pagamento.' });
    }

    /* Retirada */
    opcoes.push({ id: 'retirada', nome: 'Retirada em São Paulo', ok: true, frete: 0, partes: null, envios: 1,
      detalhe: 'Você retira na loja da instituição, com horário marcado e documento. O endereço é informado na confirmação.' });

    return { valor: valor, opcoes: opcoes };
  }

  window.OP_FRETE = { calcular: calcular, TABELA: TABELA };
})();
