# ouropaulista-site

Site estático (GitHub Pages) de ouropaulista.com.

## Fluxo de reserva (`comprar.html`)

Reserva em etapas: peso, dados de quem compra, endereço, forma de recebimento com frete estimado, documentos, revisão. Arquivos: `comprar.html`, `comprar.js`, `frete.js`, `config.js`.
Como ligar o banco de cadastros, modelo de segurança e formato do link de anúncio: `backend/LEIA-ME.md`.

## Frete (`frete.js`)

No passo de entrega, o cliente escolhe entre Correios (SEDEX com seguro), portador (cidade de São Paulo e parte da Grande São Paulo, compras a partir de R$ 2.000) e retirada em São Paulo. O frete dos Correios é uma estimativa e entra no total estimado.

- Conta: postagem do SEDEX pelo destino (capital ou interior de cada estado) mais seguro de 2% sobre o que passa de R$ 25,50 por envio. Cada envio leva até R$ 38.057,59. Acima disso o pedido é dividido em mais envios, e uma barra que sozinha passa do limite não vai pelos Correios.
- Fonte: simulador público dos Correios, consultado em 19/11/2026 (17 destinos, listados no topo de `frete.js`). O simulador bloqueia consultas em sequência, então a tabela é fixa. Para atualizar, refazer as consultas e trocar `degraus` e `nivel`.
- Portador não tem preço público: aparece como "a confirmar".
- O valor que vale é o confirmado antes do pagamento. A escolha vai para a coluna `entrega` do cadastro.

## Preço de referência (`precos.json`)

O site só mostra preço se existir `/precos.json` na raiz, com menos de 36 horas:

```json
{ "atualizado_em": "2026-11-19T09:15:00-03:00", "barras": { "1": 0, "5": 0, "10": 0, "25": 0, "50": 0, "100": 0 } }
```

- `barras`: preço final em reais de cada barra (chave = gramas), já com o acréscimo da Ouro Paulista. Aparece nos cartões da loja e no primeiro passo de `/comprar.html`, sempre como "preço de referência", com data e hora.
- Quem gera: `tools/precos.mjs`, rodado pelo GitHub Actions (`.github/workflows/precos.yml`) três vezes por dia útil e uma vez no fim de semana. Também roda à mão em Actions → Preço de referência → Run workflow.
- Conta: paridade pública do ouro (onça em dólar × dólar em reais ÷ 31,10) × fator da barra × gramas. As cotações vêm de fontes públicas: onça em gold-api.com; dólar em AwesomeAPI e, se ela não responder, em DolarAPI, no último boletim PTAX do Banco Central e em open.er-api.com, nessa ordem.
- Nunca gravar neste repositório dado lido do sistema interno da instituição parceira: o repositório é público.
- Se uma fonte falhar ou o preço variar mais de 8% de uma vez, o arquivo não é atualizado. Depois de 36 horas sem atualização o site volta a dizer que o preço é informado na reserva.
