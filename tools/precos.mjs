// Gera /precos.json: preço de referência de cada barra, em reais, já com o acréscimo da Ouro Paulista.
// Roda no GitHub Actions (.github/workflows/precos.yml). Sem dependências: Node 20+.
//
// Conta: paridade pública do ouro (onça em dólar × dólar em reais ÷ 31,10) × fator da barra × gramas.
// As duas cotações vêm de fontes públicas (o dólar tem três, em ordem de preferência). Nada aqui é lido de sistema de parceiro.
// O fator de cada barra é o preço final sobre a paridade. A regra e a justificativa ficam no Drive do projeto.
import { readFile, writeFile } from 'node:fs/promises';

const FATOR = { 1: 1.139, 5: 1.0763, 10: 1.0763, 25: 1.0506, 50: 1.0506, 100: 1.0506 };
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

let anterior = null;
try { anterior = JSON.parse(await readFile(ARQUIVO, 'utf8')); } catch {}
const recente = anterior && Date.now() - new Date(anterior.atualizado_em).getTime() < 4 * 24 * 3600 * 1000;
if (recente && anterior.barras && anterior.barras['10'] > 0) {
  const salto = Math.abs(barras['10'] / anterior.barras['10'] - 1);
  if (salto > SALTO_MAXIMO) throw new Error(`variação de ${(salto * 100).toFixed(1)}% contra o último preço: não publicado`);
}

await writeFile(ARQUIVO, JSON.stringify({ atualizado_em: agoraSaoPaulo(), barras }) + '\n');
console.log('precos.json atualizado', barras);
