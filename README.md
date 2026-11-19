# ouropaulista-site

Site estático (GitHub Pages) de ouropaulista.com.

## Fluxo de reserva (`comprar.html`)

Reserva em etapas: peso, dados de quem compra, endereço, documentos, revisão. Arquivos: `comprar.html`, `comprar.js`, `config.js`.
Como ligar o banco de cadastros, modelo de segurança e formato do link de anúncio: `backend/LEIA-ME.md`.

## Preço do dia (`precos.json`)

O site só mostra preço se existir `/precos.json` na raiz, com menos de 36 horas:

```json
{ "atualizado_em": "2026-11-19T08:30:00-03:00", "barras": { "1": 0, "5": 0, "10": 0, "25": 0, "50": 0, "100": 0 } }
```

- `barras`: preço final em reais de cada barra (chave = gramas), já com o acréscimo da Ouro Paulista.
- Nunca gravar aqui a cotação da instituição parceira nem o percentual de acréscimo: o repositório é público.
- Sem o arquivo, o site volta a dizer "o preço do dia é informado na reserva".
