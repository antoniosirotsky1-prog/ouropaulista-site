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
- Sobrepreço da Ouro Paulista (regra do Antonio de 19/11/2026): 17% na barra de 1 g, 15% na de 5 g, 13% na de 10 g, 10% na de 25 g, 8% na de 50 g e 6% na de 100 g, sobre o custo da barra. Fica em `SOBREPRECO`, em `tools/precos.mjs`. O acréscimo de 5% sem código, nas barras de até 10 g, entra por cima.
- Quem gera: `tools/precos.mjs`, rodado pelo GitHub Actions (`.github/workflows/precos.yml`) três vezes por dia útil e uma vez no fim de semana. Também roda à mão em Actions → Preço de referência → Run workflow.
- Conta: paridade pública do ouro (onça em dólar × dólar em reais ÷ 31,10) × fator da barra × gramas. As cotações vêm de fontes públicas: onça em gold-api.com; dólar em AwesomeAPI e, se ela não responder, em DolarAPI, no último boletim PTAX do Banco Central e em open.er-api.com, nessa ordem.
- Nunca gravar neste repositório dado lido do sistema interno da instituição parceira: o repositório é público.
- Se uma fonte falhar ou o preço variar mais de 8% de uma vez, o arquivo não é atualizado. Depois de 36 horas sem atualização o site volta a dizer que o preço é informado na reserva.

## Home (`index.html`, `home.js`) e arte da reserva (`fluxo.js`)

- Capa: barra em 3D feita com as imagens `assets/barra-*.webp`, que gira ao trocar o peso. O Reservar anima a barra virando blister e caixa e só então abre `/comprar.html?barra=N`. O preço continua vindo de `precos.json` em `#pick-price`.
- Ordem da home (pedido do Antonio em 19/11): capa com a compra, como comprar, história, notícias, dúvidas e fecho. Na capa há uma seta pequena de rolagem (`#seta`): entra depois de 5 s, fica 7 s e some, e não entra se a pessoa já rolou, clicou em comprar ou está com a roleta aberta.
- Roleta (`#codigo`): não é seção. É um banner de entrada sobre a página, aberto na primeira visita (guarda `op_gate` no navegador para não repetir) e pelos links `/#codigo`. Sem JavaScript ele não aparece. Só gira depois de nome e e-mail, que ficam em `op_user` no navegador, aparecem como usuário no canto do cabeçalho de todas as páginas e pré-preenchem a reserva. O sorteio (5%, 10%, 15% ou uma barra de 1 g) é feito no banco pela função `girar` de `backend/roleta.sql`, que grava nome, e-mail, prêmio e código na tabela `giros`; cada e-mail gira uma vez. As chances estão em três lugares e mudam juntas: `backend/roleta.sql`, `CHANCES` em `codigo.js` e "Regras e chances" no banner. Prêmio de 10%, 15% ou barra só vale se estiver em `giros` com o e-mail da reserva (visão `premios_a_conferir`). Enquanto a função não existir no banco (resposta 404), o sorteio roda no navegador, como antes; se o banco falhar, o giro dá o código geral de 5%.
- Passos de como comprar: cada passo tem uma aquarela em `assets/passos/passo-N.webp` e o traço dela em `assets/passos/ol-passo-N.json`; ao entrar na tela o traço se desenha e a aquarela aparece.
- Toda notícia tem imagem: aquarela 4:3 de 720 × 540 em `assets/blog/`, no campo `img` do `blog.json`. As primeiras vieram das artes do Instagram e do Krea.
- Blog: os posts ficam em `blog.json` (`data`, `tipo` "noticia" ou "post", `titulo`, `resumo`, `fonte`, `url`, e opcionais `img` e `data_texto`). `blog.js` preenche a seção da home (3 mais recentes) e `blog.html` (todos). Os três primeiros da home e a lista de `blog.html` também estão escritos no HTML, para quem está sem JavaScript; ao acrescentar um post, edite o `blog.json` e, se quiser manter esse HTML em dia, copie o cartão. Notícia sempre com fonte e link; nada de promessa de resultado.
- Compra que acompanha a página (`.buybar`): uma barra de ouro flutuante no canto inferior direito, em todas as páginas menos na reserva. Na home ela surge quando o botão Reservar da capa sai da tela e acompanha o peso e o preço escolhidos.
- História (`#fio`): cenas em sketch (`assets/fio/ol-*.json`, traços vetoriais desenhados conforme a rolagem) que se pintam em aquarela (`assets/fio/aq-*.webp`). Título e legenda de cada época ficam na lista `CH` de `home.js`. No fim, todas as cenas viram um quadro.
- `fluxo.js` desenha, só no computador, a barra girando e o cartão "Sua reserva" ao lado do formulário. Ele lê os campos, não grava nem envia nada. O envio continua em `comprar.js`.
- `codigo.js` e `home.js` entram na home com `?v=N`. Ao mudar os dois juntos, aumente o N em `index.html`, para o navegador não misturar um arquivo novo com outro antigo guardado.
- Bibliotecas em `assets/v/` (GSAP, ScrollTrigger, Lenis). Sem JavaScript, sem GSAP ou com movimento reduzido, a página funciona parada: os pesos trocam a imagem, o Reservar leva direto à reserva e a história aparece como quadro.

## Código de primeira compra e indicação (`codigo.js`)

- Regra de preço: barras de 1, 5 e 10 g têm acréscimo de 5% no preço de referência. Com código válido, na primeira compra de cada CPF, o acréscimo não é cobrado. `precos.json` traz as duas tabelas: `barras` (preço de tabela) e `com_codigo` (1, 5 e 10 g sem o acréscimo). A conta fica em `tools/precos.mjs`.
- Código geral: `PAULISTA5`, igual para todo mundo. É o resultado de 5% da roda. Os resultados de 10%, 15% e barra têm código próprio (`D10`, `D15`, `B1G` + 5 caracteres + dígito), sorteado e registrado no banco.
- Código de indicação: gerado no fim da reserva (`OP` + 6 primeiros caracteres do protocolo + 1 dígito de conferência). Dá ao indicado o mesmo desconto. Se a primeira compra do indicado somar 50 g ou mais, quem indicou ganha uma barra de 1 g na sua segunda compra.
- Onde fica gravado: no campo `origem` do cadastro, em `codigo` (o código usado) e `indicacao` (o código de indicação de quem reservou). Para achar quem indicou, procurar em `cadastros` a linha cujo `origem->>indicacao` é igual ao `origem->>codigo` do indicado.
- O site só confere o formato do código. Primeira compra, indicação válida e entrega da barra de 1 g são conferidas no atendimento, antes do pagamento.
