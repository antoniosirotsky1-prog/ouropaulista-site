# ouropaulista-site

Site estático (GitHub Pages) de ouropaulista.com.

## Fluxo de reserva (`comprar.html`)

Reserva em etapas: peso, dados de quem compra, endereço, documentos, revisão. Arquivos: `comprar.html`, `comprar.js`, `config.js`.
Como ligar o banco de cadastros, modelo de segurança e formato do link de anúncio: `backend/LEIA-ME.md`.

## Preço de referência (`precos.json`)

O site só mostra preço se existir `/precos.json` na raiz, com menos de 36 horas:

```json
{ "atualizado_em": "2026-11-19T09:15:00-03:00", "barras": { "1": 0, "5": 0, "10": 0, "25": 0, "50": 0, "100": 0 } }
```

- `barras`: preço final em reais de cada barra (chave = gramas), já com o acréscimo da Ouro Paulista. Aparece nos cartões da loja e no primeiro passo de `/comprar.html`, sempre como "preço de referência", com data e hora.
- Quem gera: `tools/precos.mjs`, rodado pelo GitHub Actions (`.github/workflows/precos.yml`) três vezes por dia útil e uma vez no fim de semana. Também roda à mão em Actions → Preço de referência → Run workflow.
- Conta: paridade pública do ouro (onça em dólar × dólar em reais ÷ 31,10) × fator da barra × gramas. As cotações vêm de fontes públicas (gold-api.com e AwesomeAPI).
- Nunca gravar neste repositório dado lido do sistema interno da instituição parceira: o repositório é público.
- Se uma fonte falhar ou o preço variar mais de 8% de uma vez, o arquivo não é atualizado. Depois de 36 horas sem atualização o site volta a dizer que o preço é informado na reserva.
