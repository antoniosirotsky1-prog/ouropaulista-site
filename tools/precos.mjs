// Gera /precos.json: preço de referência de cada barra, em reais, já com o acréscimo da Ouro Paulista.
// Roda no GitHub Actions (.github/workflows/precos.yml). Sem dependências: Node 20+.
//
// Conta: paridade pública do ouro (onça em dólar × dólar em reais ÷ 31,10) × fator da barra × gramas.
// As duas cotações vêm de fontes públicas (o dólar tem três, em ordem de preferência). Nada aqui é lido de sistema de parceiro.
// O fator de cada barra é o preço final sobre a paridade (BASE × sobrepreço). A regra e a justificativa ficam no Drive do projeto.
import { readFile, writeFile } from 'node:fs/promises';

// BASE: quanto a barra custa sobre a paridade, sem a Ouro Paulista (o mesmo de antes: 1,139 ÷ 1,09, 1,0763 ÷ 1,05 e 1,0506 ÷ 1,03).
// SOBREPRECO: a parte da Ouro Paulista. Regra do Antonio de 19/11/2026: 17% na barra de 1 g e menor a cada peso acima.
// Os degraus abaixo de 17% foram escolhidos para ficar acima dos anteriores (9%, 5% e 3%) e para o prêmio de 15% da
// roleta não levar o preço das barras de até 10 g abaixo da BASE.
const BASE = { 1: 1.045, 5: 1.025, 10: 1.025, 25: 1.02, 50: 1.02, 100: 1.02 };
const SOBREPRECO = { 1: 0.17, 5: 0.15, 10: 0.13, 25: 0.10, 50: 0.08, 100: 0.06 };
const FATOR = Object.fromEntries(Object.keys(BASE).map((g) => [g, BASE[g] * (1 + SOBREPRECO[g])]));
const ARQUIVO = new URL('../precos.json', import.meta.url);
const SALTO_MAXIMO = 0.08; // variação maior que 8% contra o arquivo anterior trava a publicação

async function json(url) {
  const r = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}

function agoraSaoPaulo() {
  const d = new Date(Date.now() - 3 * 3600 * 1000);
  return d.toISOString().slice(0, 19) + '-03:00';
}

// Tenta as fontes na ordem e fica com a primeira que responde dentro da faixa esperada.
async function primeira(nome, min, max, fontes) {
  const falhas = [];
  for (const [rotulo, ler] of fontes) {
    try {
      const v = Number(await ler());
      if (v > min && v < max) { console.log(`${nome}: ${v} (${rotulo})`); return v; }
      falhas.push(`${rotulo}: valor fora da faixa (${v})`);
    } catch (e) { falhas.push(`${rotulo}: ${e.message}`); }
  }
  throw new Error(`${nome} sem fonte válida. ${falhas.join(' | ')}`);
}

function dataBCB(diasAtras) {
  const d = new Date(Date.now() - 3 * 3600 * 1000 - diasAtras * 24 * 3600 * 1000);
  return `${d.toISOString().slice(5, 7)}-${d.toISOString().slice(8, 10)}-${d.toISOString().slice(0, 4)}`;
}

const ouro = await primeira('onça em dólar', 1000, 15000, [
  ['gold-api.com', async () => (await json('https://api.gold-api.com/price/XAU')).price],
]);

// Dólar: cotação ao vivo quando a fonte responde; senão o último boletim PTAX do Banco Central; senão referência diária.
const dolar = await primeira('dólar em reais', 3, 12, [
  ['awesomeapi', async () => (await json('https://economia.awesomeapi.com.br/json/last/USD-BRL')).USDBRL.bid],
  ['dolarapi.com', async () => (await json('https://br.dolarapi.com/v1/cotacoes/usd')).venda],
  ['PTAX do Banco Central', async () => {
    const u = "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo(moeda=@m,dataInicial=@a,dataFinalCotacao=@b)"
      + `?@m='USD'&@a='${dataBCB(7)}'&@b='${dataBCB(0)}'&$format=json&$orderby=dataHoraCotacao%20desc&$top=1`;
    return (await json(u)).value[0].cotacaoVenda;
  }],
  ['open.er-api.com', async () => (await json('https://open.er-api.com/v6/latest/USD')).rates.BRL],
]);

const paridade = (ouro * dolar) / 31.1;
const barras = {};
for (const [g, fator] of Object.entries(FATOR)) barras[g] = Math.ceil(paridade * fator * Number(g));

// Barras de até 10 g: o preço com código tem 5% de desconto sobre o preço cheio (cheio = com código ÷ 0,95).
// No site, isso é sempre "5% de desconto" na primeira compra (ver /codigo.js), nunca acréscimo ou sobretaxa.
const DESCONTO_COM_CODIGO = 0.05;
const com_codigo = {};
for (const g of ['1', '5', '10']) { com_codigo[g] = barras[g]; barras[g] = Math.ceil(barras[g] / (1 - DESCONTO_COM_CODIGO)); }

let anterior = null;
try { anterior = JSON.parse(await readFile(ARQUIVO, 'utf8')); } catch {}
const recente = anterior && Date.now() - new Date(anterior.atualizado_em).getTime() < 4 * 24 * 3600 * 1000;
if (recente && anterior.barras && anterior.barras['10'] > 0) {
  const salto = Math.abs(barras['10'] / anterior.barras['10'] - 1);
  if (salto > SALTO_MAXIMO) throw new Error(`variação de ${(salto * 100).toFixed(1)}% contra o último preço: não publicado`);
}

await writeFile(ARQUIVO, JSON.stringify({ atualizado_em: agoraSaoPaulo(), barras, com_codigo }) + '\n');
console.log('precos.json atualizado', barras, com_codigo);
