# Publicação com Supabase e Locaweb

Este roteiro publica a `main` sem levar dados de testes para produção. Ele não
executa `db:seed` em nenhum ambiente de produção.

## 1. Preparar a main

1. Confira que está na `main` e que não há arquivos pendentes:

   ```powershell
   git switch main
   git status
   npm run lint
   npm run typecheck
   npm test
   npm run build:isolated
   ```

2. O menu restrito é controlado por
   `NEXT_PUBLIC_HELP_DESK_JORNADA_ONLY=true`. Como a variável é pública e
   incorporada no build, alterá-la exige reconstruir a imagem.

3. Use a rota `GET /api/health` para verificar se a aplicação e o PostgreSQL
   estão disponíveis. Ela não expõe dados, tokens nem detalhes de conexão.

## 2. Limpar o banco local com segurança

1. Pare o servidor local que estiver usando esse banco.
2. Faça uma cópia recuperável do banco e da pasta `storage/attachments`.
3. Rode apenas a inspeção, que não altera nada:

   ```powershell
   npm run db:inspect
   ```

4. Decida o escopo antes da exclusão:
   - **somente operação de teste:** tickets, comentários, anexos, histórico,
     apontamentos, timers, notificações, avaliações, sincronizações e auditoria;
   - **tudo:** inclui também usuários, clientes/centros de custo, serviços,
     projetos, grupos de usuários, metas e ativos.

Não use `prisma migrate reset` como atalho: ele reaplica o seed de desenvolvimento
e pode repovoar dados demonstrativos. A limpeza deve ser executada somente após
o escopo ter sido confirmado e as contagens terem sido registradas.

## 3. Criar e migrar o Supabase

1. Crie um projeto Supabase exclusivo para o Help Desk, inicialmente em
   homologação.
2. Em **Connect**, copie a conexão direta ou o **Session Pooler na porta 5432**.
   Não use o Transaction Pooler (porta 6543) para o worker `pg-boss`.
3. Preencha `deploy/.env.production` a partir de
   `deploy/.env.production.example`, sem versionar o arquivo.
4. Para executar a migração a partir de uma máquina confiável, defina as duas
   URLs do Supabase naquela sessão e execute somente:

   ```powershell
   npm run db:generate
   npm run db:deploy
   ```

5. Não execute `npm run db:seed` nem `npm run db:migrate` contra o Supabase.
   `db:migrate` é o fluxo de desenvolvimento e pode precisar de um banco shadow.
6. Depois da migração, rode `npm run db:inspect` apontando para o Supabase e
   registre as contagens. Antes do go-live, elas devem refletir somente os
   cadastros aprovados para produção.

## 4. Configurar o servidor Locaweb

1. Use uma VPS Linux com Docker Engine e Docker Compose Plugin. Hospedagem
   estática não executa este módulo Next.js nem o worker de sincronização.
2. No servidor, clone a `main`, copie
   `deploy/.env.production.example` para `deploy/.env.production` e preencha
   os segredos reais. Gere segredos longos e diferentes para a autenticação do
   Gestec, entrada Zeev e callback Zeev.
3. Mantenha `GESTEC_AUTH_MODE=production` e
   `GESTEC_ALLOW_DEV_AUTH=false`.
4. Garanta uma pasta persistente, por exemplo
   `/var/lib/gestec-helpdesk/storage`, para anexos. A imagem nunca armazena
   anexos somente na camada temporária do container.
5. Construa e inicie o serviço:

   ```bash
   docker compose --env-file deploy/.env.production -f deploy/docker-compose.production.yml up -d --build
   docker compose --env-file deploy/.env.production -f deploy/docker-compose.production.yml ps
   curl --fail http://127.0.0.1:3000/api/health
   ```

6. Configure Nginx com base em `deploy/nginx/helpdesk.conf.example`, substitua
   o domínio e habilite HTTPS antes de expor o endereço. O container fica
   ligado apenas a `127.0.0.1`; Nginx é o único ponto público.
7. No Gestec e no Zeev, atualize as URLs de callback somente depois do HTTPS
   responder com sucesso. Faça um ticket real controlado e confirme o ciclo
   completo: entrada, triagem, contato, atendimento, conclusão e avaliação.

## 5. Critérios de aceite

- `docker compose ... ps` mostra o serviço saudável;
- `/api/health` retorna HTTP 200;
- o worker cria/processa uma sincronização Zeev pendente após iniciar;
- o Gestec assina a identidade de produção corretamente;
- o menu mostra somente **Jornada** ativa, com os outros itens cinza e riscados;
- não há ticket, anexo ou dado demonstrativo não aprovado no Supabase;
- a cópia local e a cópia de anexos permanecem disponíveis até a validação final.
