# Aviation Content Studio

MVP privado para pesquisa editorial e produção de roteiros aeronáuticos em português brasileiro. A interface não publica conteúdo e não gera imagens.

## O que está implementado

- Dashboard responsivo, biblioteca, estados do workflow e preferências editoriais.
- Componentes de interface com Tailwind CSS e base shadcn/ui (`components/ui/button.tsx`).
- Modo demo local sem chamadas externas. Projetos e roteiros de exemplo são fictícios e identificados como demonstração. O botão de pesquisa não cria resultados fictícios; sem as chaves Gemini e Tavily, a rota explica a configuração ausente.
- Supabase Auth por e-mail/senha e sincronização de projetos com PostgreSQL quando as variáveis Supabase estão definidas.
- Pesquisa web via Tavily nos domínios governamentais e dos fabricantes prioritários, analisada pelo Gemini, com títulos/URLs, data de consulta e revisão humana.
- Roteiros estruturados, edição manual/conversacional, exportação Markdown/TXT, versões, comparação, restauração e aprovação explícita.
- Migração SQL com sete tabelas, RLS por proprietário, índices, auditoria de eventos, transições controladas e proteção de roteiro aprovado.
- Schemas Zod, limite simples de uso em memória, idempotência por chave, timeout e no máximo uma repetição do SDK por chamada.

## Requisitos

- Node.js 20.9+ (a versão atual do Next instalada pode exigir uma versão LTS recente).
- npm.
- Para pesquisar e gerar roteiros com acesso privado: uma chave Gemini, uma chave Tavily e um projeto Supabase configurado.
- Não é preciso executar migration remota para experimentar o modo demo.

## Executar localmente

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`. Sem variáveis Supabase, a aplicação usa o workspace de demonstração local. As rotas de pesquisa e geração permanecem desabilitadas sem Supabase Auth, mesmo se as chaves de IA existirem, para impedir que um workspace público consuma as cotas. Com Supabase Auth e migration configurados, defina `GEMINI_API_KEY` e `TAVILY_API_KEY` apenas no `.env.local` do servidor. Chaves privadas nunca usam prefixo `NEXT_PUBLIC_`.

## Supabase

1. Crie um projeto Supabase e configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no `.env.local`.
2. Aplique `supabase/migrations/202610120001_initial_schema.sql` pelo Supabase CLI ou SQL Editor somente após revisar e autorizar a execução no projeto desejado.
3. Cadastre/invite usuários em Authentication. O MVP não oferece cadastro público.
4. Reinicie o servidor. Com as variáveis definidas, as telas exigem login e os projetos autenticados são sincronizados com o banco, protegidos por RLS.

Nunca configure `service_role` no navegador ou neste MVP. O cliente Supabase usa a chave anon/public, com RLS como controle de acesso.

## Gemini e pesquisa web

Defina `GEMINI_API_KEY` e `TAVILY_API_KEY` no ambiente servidor. `GEMINI_MODEL` é opcional e usa `gemini-3.8-flash` por padrão. A busca web usa Tavily Basic (cota gratuita anunciada de 1.000 créditos/mês, sem cartão); uma pesquisa básica consome crédito conforme o plano Tavily. O Gemini analisa somente os trechos e URLs retornados pela busca, que são tratados como dados não confiáveis. Fontes aparecem como links e seguem para a revisão humana. O código não publica em redes.

O limite de chamadas e a idempotência atuais são mantidos em memória do processo: são proteções básicas para desenvolvimento, não cotas duráveis entre réplicas/restarts. Adote armazenamento de uso/idempotência no banco antes de operar em escala. Custos dependem de modelo, tokens e chamadas de busca.

## Comandos

```bash
npm run dev        # desenvolvimento
npm run lint       # ESLint
npm run typecheck  # TypeScript strict
npm test           # Vitest
npm run test:e2e   # Playwright (instale Chromium na primeira execução)
npm run build      # build de produção
npm start          # servidor de produção local
```

Para Playwright, se o navegador ainda não estiver instalado: `npx playwright install chromium`.

## Deploy Vercel

1. Configure no painel Vercel as variáveis públicas do Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) e as variáveis privadas `GEMINI_API_KEY`, `GEMINI_MODEL` (`gemini-3.8-flash`) e `TAVILY_API_KEY`. Marque `Production` e, se aplicável, `Preview`/`Development`. Não use o prefixo `NEXT_PUBLIC_` nas chaves de IA.
2. Aplique a migration `supabase/migrations/202610120001_initial_schema.sql` no projeto Supabase pelo SQL Editor. O app não executa migrations remotas automaticamente.
3. Em Supabase Authentication, crie o usuário. Em Authentication > URL Configuration, configure o domínio Vercel como Site URL e inclua a URL de callback indicada no fluxo de autenticação em Redirect URLs.
4. Depois de salvar variáveis no painel Vercel, publique um novo deploy. Variáveis novas não alteram implantações já criadas.
5. Entre com o usuário Supabase, pesquise uma pauta e depois gere o roteiro usando a pesquisa aprovada. O painel indica se as variáveis chegaram à aplicação, sem exibir seus valores.

Se o painel indicar que as chaves de IA estão ausentes, confira os nomes exatos, os ambientes Vercel e faça um novo deploy. Gemini e Tavily retornam mensagens diferentes para chave inválida (401/403), modelo inexistente (404) e cota excedida (429). As chaves devem permanecer privadas.

## Limitações conhecidas

- O editor salva em Supabase no modo autenticado e no localStorage no modo demo; o envio do estado completo do projeto usa uma rota de sincronização simples, sem transação multi-tabela. Operação concorrente e colaboração multiusuário não são suportadas.
- O MVP não tem comparação de diff palavra a palavra, convite de equipe, orçamento monetário durável, compartilhamento, publicação ou geração de imagem.
- Os limites de uso em memória não substituem monitoramento financeiro nem controle por organização.
- Fontes e trechos de apoio vêm dos resultados do Tavily. Data de publicação só aparece quando a fonte fornece essa informação; a data de consulta é sempre registrada.
- A aprovação de pesquisa e roteiro é uma ação humana na interface. Revise alegações técnicas nas fontes oficiais antes de publicar.

## Verificação

Schemas e transições têm testes Vitest. O Playwright cobre uma navegação principal no modo demo. As APIs com credenciais exigem configuração separada e não devem ser avaliadas contra recursos remotos sem autorização explícita.
