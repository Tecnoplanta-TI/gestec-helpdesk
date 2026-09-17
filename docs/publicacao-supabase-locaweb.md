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
   `NEXT_PUBLIC_HELP_DESK_JORNADA_ONLY=true`. Nesse modo, **Jornada** e
   **Relatórios** permanecem ativos; os demais itens ficam indisponíveis.
   Como a variável é pública e incorporada no build, alterá-la exige
   reconstruir a imagem.

3. `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e
   `NEXT_PUBLIC_HELP_DESK_JORNADA_ONLY` são incorporadas ao pacote do navegador
   durante o build. Sempre que qualquer uma delas for alterada, reconstrua a
   imagem com `docker compose ... up -d --build`.
4. Use a rota `GET /api/health` para verificar se a aplicação e o PostgreSQL
   estão disponíveis. Ela não expõe dados, tokens nem detalhes de conexão.

## 2. Limpar o banco local com segurança

1. Pare o servidor local que estiver usando esse banco.
2. Faça uma cópia recuperável do banco e da pasta `storage/attachments`.
3. Rode apenas a inspeção, que não altera nada:

   ```powershell
   npm run db:inspect
   ```

4. Para remover usuários locais e os dados operacionais que dependem deles,
   preservando centros de custo, serviços, projetos e ativos, execute:

   ```powershell
   npm run db:reset-local-users -- --confirm=ZERAR_USUARIOS_LOCAIS
   ```

   O comando recusa qualquer banco que não seja `localhost`/`127.0.0.1` e exige
   a confirmação literal acima. Ele não apaga arquivos de anexo fora do banco;
   revise a cópia de `storage/attachments` antes de removê-los manualmente.

Não use `prisma migrate reset` como atalho: ele reaplica o seed de desenvolvimento
e pode repovoar dados demonstrativos. A limpeza deve ser executada somente após
o escopo ter sido confirmado e as contagens terem sido registradas.

## 3. Criar e migrar o Supabase

1. Crie um projeto Supabase exclusivo para o Help Desk, inicialmente em
   homologação.
2. Em **Connect**, copie a conexão direta ou o **Session Pooler na porta 5432**.
   Esta publicação não inicia worker, fila ou integração com o Zeev.
3. Preencha `deploy/.env.production` a partir de
   `deploy/.env.production.example`, sem versionar o arquivo.
4. Em **Authentication > Providers**, deixe **Email** habilitado e crie o
   primeiro usuário no painel do Supabase. Copie a URL do projeto e a chave
   pública em **Connect/API** para `NEXT_PUBLIC_SUPABASE_URL` e
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. A variável
   `SUPABASE_ADMIN_EMAILS` já contém os dois únicos e-mails que podem receber
   **ADMIN** no primeiro login. Os demais usuários iniciam como **TECHNICIAN**.
5. Para executar a migração a partir de uma máquina confiável, defina as duas
   URLs do Supabase naquela sessão e execute somente:

   ```powershell
   npm run db:generate
   npm run db:deploy
   ```

5. Não execute `npm run db:seed` nem `npm run db:migrate` contra o Supabase.
   `db:migrate` é o fluxo de desenvolvimento e pode precisar de um banco shadow.
6. A migração habilita RLS em todas as tabelas da aplicação. Pelo Data API,
   `anon` não possui acesso e `authenticated` pode consultar somente o próprio
   perfil em `UserRef`; tickets e operações continuam passando pelas APIs do
   Help Desk, que aplicam as permissões internas no servidor.
7. Depois da migração, rode `npm run db:inspect` apontando para o Supabase e
   registre as contagens. Antes do go-live, elas devem refletir somente os
   cadastros aprovados para produção.

## 4. Configurar o servidor Locaweb

1. Use uma VPS Linux com Docker Engine e Docker Compose Plugin. Hospedagem
   estática não executa este módulo Next.js nem o worker de sincronização.
2. No servidor, clone a `main`, copie
   `deploy/.env.production.example` para `deploy/.env.production` e preencha
   os segredos reais. Gere segredos longos e diferentes para a autenticação do
   Gestec, entrada Zeev e callback Zeev.
3. Use `GESTEC_AUTH_MODE=supabase` e `GESTEC_ALLOW_DEV_AUTH=false`. Preencha
   também as duas variáveis públicas do Supabase e
   `SUPABASE_ADMIN_EMAILS`. Não use nem publique a `service_role` no
   navegador ou no arquivo de ambiente do Help Desk.
4. Mantenha `ZEEV_SYNC_ENABLED=false`. Os valores `ZEEV_*` não precisam ser
   preenchidos nesta publicação: o app não cria worker e os endpoints Zeev
   respondem como indisponíveis.
5. Garanta uma pasta persistente, por exemplo
   `/var/lib/gestec-helpdesk/storage`, para anexos. A imagem nunca armazena
   anexos somente na camada temporária do container.
6. Construa e inicie o serviço. O Compose interrompe o build caso as duas
   variáveis públicas do Supabase não tenham sido preenchidas:

   ```bash
   docker compose --env-file deploy/.env.production -f deploy/docker-compose.production.yml up -d --build
   docker compose --env-file deploy/.env.production -f deploy/docker-compose.production.yml ps
   curl --fail http://127.0.0.1:3000/api/health
   ```

   Em uma VPS com 1 GB de memória ou menos, crie antes um arquivo de swap de
   2 GB. O build do Next.js requer mais memória que o processo em produção:

   ```bash
   fallocate -l 2G /swapfile
   chmod 600 /swapfile
   mkswap /swapfile
   swapon /swapfile
   echo '/swapfile none swap sw 0 0' >> /etc/fstab
   free -h
   ```

   O arquivo `deploy/.env.production` configura
   `GESTEC_BUILD_NODE_HEAP_MB=1536`, usado somente para montar a imagem.

7. Configure Nginx com base em `deploy/nginx/helpdesk.conf.example`, substitua
   o domínio e habilite HTTPS antes de expor o endereço. O container fica
   ligado apenas a `127.0.0.1`; Nginx é o único ponto público.
8. Não configure callbacks no Gestec nem no Zeev nesta publicação. Valide
   apenas login, Jornada e Relatórios.

## 5. Critérios de aceite

- `docker compose ... ps` mostra o serviço saudável;
- `/api/health` retorna HTTP 200;
- o login do Supabase impede acesso sem sessão e permite os dois
  administradores autorizados entrarem;
- o Data API do Supabase não permite acesso anônimo às tabelas do Help Desk;
- o menu mostra **Jornada** e **Relatórios** ativos, com os outros itens cinza
  e riscados;
- não há ticket, anexo ou dado demonstrativo não aprovado no Supabase;
- a cópia local e a cópia de anexos permanecem disponíveis até a validação final.
