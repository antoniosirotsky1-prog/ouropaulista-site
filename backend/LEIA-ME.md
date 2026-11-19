# Banco de cadastros

O fluxo de reserva (`/comprar.html`) grava o pedido e os documentos do cliente num projeto Supabase próprio.

## Estado

Ligado em 19/11/2026. Projeto `ouro-paulista-cadastros`, organização "Ouro Paulista" no Supabase (separada de qualquer outro negócio), região São Paulo, plano gratuito. A URL e a chave pública estão em `/config.js`.

- No plano gratuito o projeto é pausado depois de cerca de uma semana sem uso e não tem backup automático. Se o envio falhar, a página oferece mandar o pedido pelo WhatsApp. Antes de anunciar com volume, passar para o plano pago.
- Ativar a verificação em duas etapas na conta que acessa o painel.
- A chave `service_role` / `sb_secret` nunca entra no site nem no repositório.

## Refazer do zero

1. Criar um projeto no Supabase só para a Ouro Paulista, região São Paulo, com "Grant API access to new tables automatically" desligado.
2. No SQL Editor, colar e rodar `backend/supabase.sql`.
3. Em Project Settings → API Keys, copiar a URL do projeto e a chave pública (publishable).
4. Preencher `supabaseUrl` e `supabaseKey` em `/config.js`. Com os dois vazios, o fluxo não grava nada: envia o resumo pelo WhatsApp do cliente e pede os documentos na conversa.

## Ver os cadastros

Painel do Supabase → Table Editor → `cadastros`. Documentos em Storage → `documentos`, numa pasta com o `id` do cadastro.

A coluna `entrega` traz a forma de recebimento escolhida (`correios`, `portador`, `retirada` ou `combinar`), o frete estimado em reais e o valor de referência do pedido naquele momento. É estimativa: o frete que vale é o confirmado antes do pagamento.

O campo `origem` traz também `codigo` (código de primeira compra ou de indicação usado na reserva) e `indicacao` (o código de indicação gerado para quem reservou). Para saber quem indicou um cliente, procurar a linha cujo `origem->>indicacao` é igual ao `origem->>codigo` dele. Regras em `/codigo.js` e no README.

## Roleta (`giros`)

Rodar `backend/roleta.sql` no SQL Editor, depois de `supabase.sql`. Ele cria a tabela `giros` (nome, e-mail, prêmio, código, data), a função `girar`, que faz o sorteio no banco e é a única que grava na tabela, e a visão `premios_a_conferir`.

- Quem girou: Table Editor → `giros`. É a lista de contatos de quem girou, comprando ou não.
- Antes de honrar 10%, 15% ou barra: abrir `premios_a_conferir`. Cada linha é uma reserva com código de prêmio; `confere` verdadeiro quer dizer que o código foi sorteado para o mesmo e-mail da reserva. Falso ou vazio: o código não foi sorteado, não honrar.
- Cada e-mail gira uma vez. Com mais de 300 giros em uma hora, o giro só devolve 5% até a hora virar (trava contra abuso).
- Enquanto este arquivo não for rodado, o site sorteia no navegador e não registra ninguém.

## Segurança

- O público só insere. Não há leitura, alteração nem exclusão pela chave pública.
- Bucket privado, só imagem e PDF, até 10 MB.
- A página tem Content-Security-Policy: só carrega script do próprio site e só conversa com o Supabase e o ViaCEP (preenchimento do endereço).
- Depois que o cadastro for registrado na instituição parceira, apagar os documentos do bucket. Guardar só o necessário, pelo tempo necessário.

## Link para anúncio

`https://ouropaulista.com/comprar.html?barra=10&utm_source=instagram&utm_medium=anuncio&utm_campaign=NOME`

`barra` escolhe o peso inicial. Os `utm_*` ficam gravados no campo `origem` do cadastro.
