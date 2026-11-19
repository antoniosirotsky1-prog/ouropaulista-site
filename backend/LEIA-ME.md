# Banco de cadastros

O fluxo de reserva (`/comprar.html`) grava o pedido e os documentos do cliente num projeto Supabase próprio.

## Ligar (uma vez)

1. Criar um projeto novo no Supabase, só para a Ouro Paulista, região São Paulo. Não reutilizar projeto de outro negócio.
2. Ativar a verificação em duas etapas na conta do Supabase.
3. No SQL Editor, colar e rodar `backend/supabase.sql`.
4. Em Project Settings → API, copiar a URL do projeto e a chave pública (anon / publishable).
5. Preencher `supabaseUrl` e `supabaseKey` em `/config.js`. A chave `service_role` nunca entra no site nem no repositório.

Enquanto `config.js` estiver vazio, o fluxo não grava nada: envia o resumo pelo WhatsApp do cliente e pede os documentos na conversa.

## Ver os cadastros

Painel do Supabase → Table Editor → `cadastros`. Documentos em Storage → `documentos`, numa pasta com o `id` do cadastro.

## Segurança

- O público só insere. Não há leitura, alteração nem exclusão pela chave pública.
- Bucket privado, só imagem e PDF, até 10 MB.
- A página tem Content-Security-Policy: só carrega script do próprio site e só conversa com o Supabase e o ViaCEP (preenchimento do endereço).
- Depois que o cadastro for registrado na instituição parceira, apagar os documentos do bucket. Guardar só o necessário, pelo tempo necessário.

## Link para anúncio

`https://ouropaulista.com/comprar.html?barra=10&utm_source=instagram&utm_medium=anuncio&utm_campaign=NOME`

`barra` escolhe o peso inicial. Os `utm_*` ficam gravados no campo `origem` do cadastro.
