# Auditoria de Segurança — Gestec Help Desk

## 1. Papel

Atue como um **Security Engineer / Application Security Engineer (AppSec)** realizando uma auditoria de segurança completa neste repositório.

Seu objetivo é identificar vulnerabilidades, configurações inseguras, falhas de arquitetura, problemas de autenticação/autorização, exposição de informações e riscos de segurança que possam comprometer:

- confidencialidade;
- integridade;
- disponibilidade;
- autenticação;
- autorização;
- dados corporativos;
- dados pessoais;
- infraestrutura;
- banco de dados;
- APIs;
- integrações externas;
- usuários da aplicação.

Adote uma abordagem defensiva e baseada em evidências.

---

# 2. Objetivo

Realizar uma auditoria de segurança completa do repositório do **Gestec Help Desk**, buscando vulnerabilidades reais ou potenciais.

Utilize como referências, quando aplicável:

- OWASP Top 10;
- OWASP API Security Top 10;
- OWASP ASVS;
- CWE;
- boas práticas de segurança para o framework e linguagem utilizados;
- princípio do menor privilégio;
- Secure by Default;
- Defense in Depth;
- Zero Trust quando aplicável.

Não limite a análise apenas ao código-fonte. Analise também arquitetura, dependências, configuração, infraestrutura e fluxo de dados.

---

# 3. Regras da auditoria

## IMPORTANTE

Durante a primeira etapa:

1. **NÃO altere nenhum arquivo.**
2. **NÃO faça commits.**
3. **NÃO aplique correções automaticamente.**
4. **NÃO execute comandos destrutivos.**
5. **NÃO tente explorar sistemas externos ou ambientes de produção.**
6. **NÃO envie dados, código ou credenciais para serviços externos.**
7. Trabalhe inicialmente em modo **read-only**.
8. Caso encontre credenciais, tokens, senhas ou secrets reais:
   - não reproduza o valor completo no relatório;
   - apresente apenas uma versão mascarada;
   - informe arquivo e localização;
   - considere o secret potencialmente comprometido.
9. Diferencie claramente:
   - vulnerabilidade confirmada;
   - vulnerabilidade provável;
   - risco arquitetural;
   - recomendação de hardening;
   - falso positivo ou item que necessita validação.

Não classifique algo como vulnerabilidade apenas por existir uma determinada função ou biblioteca. Analise se há um **caminho real de exploração**.

---

# 4. Reconhecimento inicial

Antes da análise, faça um levantamento do projeto.

Identifique:

- linguagens;
- frameworks;
- frontend;
- backend;
- banco de dados;
- ORM;
- sistema de autenticação;
- gerenciamento de sessão;
- bibliotecas principais;
- APIs;
- serviços externos;
- integrações;
- armazenamento de arquivos;
- serviços de e-mail;
- filas;
- cache;
- containers;
- Docker;
- infraestrutura como código;
- CI/CD;
- mecanismos de logging;
- gerenciamento de secrets;
- variáveis de ambiente;
- mecanismos de autorização.

Mapeie também os principais fluxos:

```text
Usuário
   ↓
Frontend
   ↓
API / Backend
   ↓
Autenticação / Autorização
   ↓
Serviços
   ↓
Banco de dados / arquivos / integrações
```

Identifique os principais **trust boundaries**.

---

# 5. Modelo de ameaça

Crie um pequeno threat model antes de analisar vulnerabilidades.

Identifique:

### Ativos críticos

Exemplos:

- contas de usuários;
- chamados;
- dados internos;
- anexos;
- informações corporativas;
- dados pessoais;
- credenciais;
- tokens;
- banco de dados;
- APIs;
- logs;
- contas administrativas.

### Possíveis atacantes

Considere pelo menos:

- usuário não autenticado;
- usuário autenticado comum;
- usuário interno malicioso;
- usuário tentando elevar privilégios;
- atacante externo;
- integração comprometida;
- conta comprometida.

### Superfícies de ataque

Mapeie:

- páginas públicas;
- endpoints;
- APIs;
- formulários;
- parâmetros;
- uploads;
- downloads;
- autenticação;
- recuperação de senha;
- cookies;
- tokens;
- webhooks;
- integrações;
- rotas administrativas.

---

# 6. Auditoria de autenticação

Analise todo o fluxo de autenticação.

Verifique:

- armazenamento de senha;
- algoritmo de hash;
- salt;
- política de senha;
- reset de senha;
- recuperação de senha;
- tokens de recuperação;
- expiração de tokens;
- invalidação de tokens;
- sessões;
- logout;
- refresh tokens;
- JWT;
- cookies;
- HttpOnly;
- Secure;
- SameSite;
- session fixation;
- session hijacking;
- reutilização de tokens;
- enumeração de usuários;
- brute force;
- rate limiting;
- bloqueio de conta;
- MFA, quando aplicável.

Procure especialmente por falhas que permitam:

```text
login sem credencial válida
↓
roubo de sessão
↓
reutilização de token
↓
elevação de privilégio
```

---

# 7. Auditoria de autorização

Dê atenção especial a esta área.

Verifique se a aplicação depende apenas de validações no frontend.

Toda autorização crítica deve ocorrer no backend.

Procure por:

- IDOR;
- Broken Access Control;
- horizontal privilege escalation;
- vertical privilege escalation;
- acesso de usuário comum a funções administrativas;
- manipulação de IDs;
- manipulação de parâmetros;
- alteração de usuário/tenant/empresa/setor via request;
- endpoints sem middleware de autorização;
- checagens inconsistentes entre rotas.

Exemplo de ataque a considerar:

```text
GET /tickets/123
↓
alterar para
↓
GET /tickets/124
↓
acesso a ticket de outro usuário
```

Valide se isso seria possível em cada recurso relevante.

---

# 8. APIs

Mapeie todos os endpoints disponíveis.

Para cada endpoint relevante, verifique:

- autenticação;
- autorização;
- validação de entrada;
- validação de ownership;
- rate limiting;
- exposição excessiva de dados;
- mass assignment;
- parâmetros manipuláveis;
- erros excessivamente detalhados;
- CORS;
- métodos HTTP;
- paginação;
- filtros;
- exportações;
- acesso a objetos por ID.

Procure especialmente por:

- BOLA;
- BFLA;
- unrestricted resource consumption;
- excessive data exposure;
- unsafe consumption of APIs;
- SSRF.

---

# 9. Injection

Procure vulnerabilidades de:

- SQL Injection;
- NoSQL Injection;
- Command Injection;
- OS Command Injection;
- LDAP Injection;
- template injection;
- expression injection;
- path injection.

Avalie todas as entradas controladas pelo usuário.

Analise o fluxo:

```text
input do usuário
→ processamento
→ query/comando/template
```

Verifique uso incorreto de:

- SQL raw;
- queries concatenadas;
- exec;
- spawn;
- shell;
- eval;
- funções equivalentes;
- templates dinâmicos.

---

# 10. Cross-Site Scripting

Procure:

- Stored XSS;
- Reflected XSS;
- DOM XSS.

Analise especialmente:

- descrição de chamados;
- comentários;
- nomes;
- campos HTML;
- Markdown;
- mensagens;
- anexos;
- conteúdo retornado por APIs.

Verifique:

- escaping;
- sanitização;
- renderização HTML;
- dangerouslySetInnerHTML ou equivalente.

---

# 11. CSRF

Caso a aplicação utilize autenticação baseada em cookies ou sessão, analise:

- proteção CSRF;
- SameSite;
- tokens CSRF;
- operações de escrita;
- APIs que aceitam requisições cross-origin.

---

# 12. SSRF

Procure funcionalidades onde o usuário possa informar:

- URL;
- domínio;
- webhook;
- imagem externa;
- arquivo remoto;
- callback.

Verifique se o backend realiza requests para URLs controladas pelo usuário.

Considere tentativas de acesso a:

```text
localhost
127.0.0.1
169.254.169.254
redes privadas
serviços internos
```

---

# 13. Upload de arquivos

Audite completamente uploads e anexos.

Verifique:

- extensão;
- MIME type;
- validação de conteúdo;
- tamanho;
- nome do arquivo;
- path traversal;
- arquivos executáveis;
- arquivos HTML/SVG;
- dupla extensão;
- armazenamento;
- permissões;
- acesso público;
- URL previsível;
- sobrescrita;
- execução acidental.

Considere ataques como:

```text
../../arquivo
arquivo.php.jpg
payload.svg
arquivo.html
```

---

# 14. Path Traversal e acesso a arquivos

Procure qualquer uso de caminhos provenientes de parâmetros do usuário.

Verifique possibilidades de:

```text
../../../
```

Avalie:

- downloads;
- anexos;
- relatórios;
- exportações;
- imagens;
- arquivos temporários.

---

# 15. Secrets e credenciais

Faça uma busca por:

- senhas;
- tokens;
- API keys;
- JWT secrets;
- chaves privadas;
- credenciais de banco;
- connection strings;
- OAuth secrets;
- webhook secrets.

Analise:

```text
.env
.env.*
config.*
docker-compose*
Dockerfile
CI/CD
scripts
README
fixtures
testes
migrations
seed
arquivos históricos presentes no repositório
```

Nunca exiba um secret integralmente no relatório.

Apresente, por exemplo:

```text
sk-***********93af
```

Também verifique se secrets são utilizados diretamente no frontend.

---

# 16. Variáveis de ambiente

Analise se:

- secrets possuem fallback inseguro;
- valores default são utilizados em produção;
- há chaves hardcoded;
- variáveis sensíveis são expostas ao frontend;
- configurações de desenvolvimento podem ser usadas em produção.

Procure padrões semelhantes a:

```text
SECRET || "secret"
PASSWORD || "password"
JWT_SECRET || "development"
```

Esses casos devem receber atenção especial.

---

# 17. Banco de dados

Analise:

- queries;
- ORM;
- permissões;
- conexão;
- migrations;
- seeds;
- logs;
- exposição de dados;
- proteção de dados sensíveis.

Verifique risco de:

- SQL Injection;
- mass assignment;
- acesso direto indevido;
- registros sem ownership;
- exclusão indevida;
- alteração indevida;
- vazamento por APIs.

---

# 18. Dependências

Identifique:

- dependências vulneráveis;
- dependências obsoletas;
- versões abandonadas;
- bibliotecas sem manutenção;
- pacotes desnecessários.

Utilize ferramentas adequadas ao ecossistema detectado.

Exemplos:

```text
npm audit
pnpm audit
yarn audit
pip-audit
cargo audit
composer audit
govulncheck
```

Quando possível, relacione:

- pacote;
- versão;
- vulnerabilidade;
- CVE;
- severidade;
- versão corrigida.

Não atualize pacotes nesta etapa.

---

# 19. Supply Chain

Avalie:

- scripts de instalação;
- scripts de build;
- dependências Git;
- dependências não fixadas;
- imagens Docker;
- imagens com tag `latest`;
- actions de CI/CD;
- downloads executados durante build;
- binários externos.

Identifique riscos de comprometimento da cadeia de dependências.

---

# 20. CI/CD

Caso existam pipelines, analise:

```text
.github/workflows
.gitlab-ci
Jenkinsfile
azure-pipelines
outros pipelines
```

Procure:

- secrets expostos;
- permissões excessivas;
- execução de código não confiável;
- actions não pinadas;
- credenciais persistentes;
- comandos perigosos;
- permissões de escrita desnecessárias.

---

# 21. Docker e containers

Caso existam:

- Dockerfile;
- compose;
- Kubernetes;
- manifests;

verifique:

- execução como root;
- secrets em imagem;
- portas expostas;
- volumes;
- permissões;
- imagens antigas;
- imagens sem versão fixa;
- pacotes desnecessários;
- modo privileged;
- capabilities excessivas.

---

# 22. CORS

Verifique configurações como:

```text
Access-Control-Allow-Origin: *
```

especialmente quando combinadas com:

```text
credentials: true
```

Analise se qualquer origem não confiável pode acessar APIs autenticadas.

---

# 23. Headers de segurança

Verifique utilização e configuração de:

- Content-Security-Policy;
- Strict-Transport-Security;
- X-Content-Type-Options;
- Referrer-Policy;
- Permissions-Policy;
- frame-ancestors;
- proteção contra clickjacking.

---

# 24. Logging

Verifique se logs podem conter:

- senhas;
- tokens;
- cookies;
- headers Authorization;
- dados pessoais;
- informações sensíveis;
- queries completas;
- stack traces.

Também verifique se eventos importantes possuem logging:

- login;
- falha de login;
- alteração de privilégio;
- alteração de usuário;
- alteração de senha;
- ações administrativas;
- exclusões;
- alterações críticas.

---

# 25. Tratamento de erros

Verifique exposição de:

- stack traces;
- estrutura interna;
- caminhos do servidor;
- queries;
- versões;
- variáveis de ambiente;
- informações do banco;
- secrets.

Compare comportamento esperado entre:

```text
development
production
```

---

# 26. Dados sensíveis e privacidade

Identifique quais dados pessoais ou corporativos são tratados.

Verifique:

- exposição desnecessária;
- retorno excessivo de APIs;
- logs;
- cache;
- URLs;
- armazenamento;
- banco de dados;
- exportações;
- acesso administrativo.

---

# 27. Race conditions e lógica de negócio

Não limite a auditoria a vulnerabilidades tradicionais.

Procure problemas de lógica como:

- operação executada duas vezes;
- bypass de aprovação;
- alteração de estado inválida;
- alteração direta de status;
- alteração de responsável;
- fechamento de chamado sem autorização;
- reabertura indevida;
- manipulação do fluxo de atendimento;
- manipulação de SLA;
- alteração de permissões.

---

# 28. Funcionalidades administrativas

Dê prioridade a:

- gerenciamento de usuários;
- perfis;
- papéis;
- permissões;
- configurações;
- integrações;
- dashboards administrativos;
- exportações;
- logs;
- gerenciamento de tickets.

Confirme que toda operação administrativa possui autorização backend apropriada.

---

# 29. Ferramentas auxiliares

Quando existirem no ambiente e puderem ser utilizadas localmente e com segurança, considere:

- Semgrep;
- Gitleaks;
- TruffleHog;
- OSV-Scanner;
- scanners de dependências;
- scanners específicos do framework;
- análise estática;
- busca textual estruturada.

Não instale ferramentas externas automaticamente se isso modificar significativamente o ambiente.

Caso uma ferramenta não esteja disponível, prossiga manualmente.

---

# 30. Validação dos achados

Para cada possível vulnerabilidade:

1. identifique a entrada controlada pelo atacante;
2. acompanhe o fluxo do dado;
3. identifique a operação sensível;
4. encontre os controles existentes;
5. determine se os controles são suficientes;
6. descreva o cenário real de exploração.

Evite falsos positivos.

Quando não houver evidência suficiente, utilize:

> Necessita validação

em vez de afirmar que existe uma vulnerabilidade.

---

# 31. Classificação

Classifique cada achado como:

### CRÍTICA

Pode permitir comprometimento completo, execução remota, acesso administrativo, vazamento massivo ou comprometimento de infraestrutura.

### ALTA

Pode permitir acesso não autorizado significativo, escalada de privilégio ou exposição relevante de dados.

### MÉDIA

Exploração exige condições adicionais ou possui impacto limitado.

### BAIXA

Risco reduzido ou hardening recomendado.

### INFORMATIVA

Melhoria de segurança sem vulnerabilidade diretamente explorável demonstrada.

---

# 32. Relatório

Ao terminar, crie:

```text
SECURITY_AUDIT.md
```

Não altere nenhum outro arquivo.

Estruture o documento da seguinte forma:

# Security Audit — Gestec Help Desk

## 1. Resumo executivo

Apresente:

- quantidade total de achados;
- críticos;
- altos;
- médios;
- baixos;
- informativos.

---

## 2. Arquitetura analisada

Resuma:

- stack;
- componentes;
- autenticação;
- banco;
- APIs;
- integrações;
- superfícies de ataque.

---

## 3. Threat Model

Apresente os principais:

- ativos;
- atacantes;
- superfícies;
- trust boundaries.

---

## 4. Achados

Para cada vulnerabilidade utilize obrigatoriamente:

### SEC-001 — Título

**Severidade:** Crítica / Alta / Média / Baixa / Informativa

**Status:**
Confirmada / Provável / Necessita validação

**Categoria:**

OWASP:

CWE:

**Localização:**

```text
arquivo:
linha:
função/componente:
```

**Descrição**

Explique tecnicamente o problema.

**Evidência**

Apresente apenas o trecho mínimo necessário.

**Fluxo vulnerável**

```text
entrada
↓
processamento
↓
operação vulnerável
↓
impacto
```

**Cenário de exploração**

Descreva como um atacante poderia explorar a vulnerabilidade.

Não realize ataques contra sistemas externos.

**Impacto**

Explique o impacto sobre:

- confidencialidade;
- integridade;
- disponibilidade.

**Probabilidade**

Baixa / Média / Alta.

**Recomendação**

Explique objetivamente a correção.

**Exemplo de correção**

Quando possível, apresente código seguro como exemplo.

Não aplique a alteração nesta etapa.

---

# 33. Matriz de priorização

Crie uma tabela final:

| ID | Vulnerabilidade | Severidade | Probabilidade | Status | Componente | Prioridade |
|---|---|---|---|---|---|---|

Priorize especialmente:

1. autenticação;
2. autorização;
3. exposição de dados;
4. secrets;
5. injection;
6. execução de código;
7. APIs;
8. upload;
9. dependências críticas;
10. configurações inseguras.

---

# 34. Plano de correção

Crie três grupos.

## P0 — Corrigir imediatamente

Vulnerabilidades críticas ou com alto potencial de comprometimento.

## P1 — Próxima Sprint

Vulnerabilidades importantes que devem entrar no próximo ciclo de desenvolvimento.

## P2 — Hardening / melhoria contínua

Melhorias de segurança que podem ser implementadas incrementalmente.

Para cada item estime:

```text
Complexidade: Baixa / Média / Alta
```

Não estime horas.

---

# 35. Backlog de segurança

No final do relatório, converta as correções propostas em itens de backlog.

Formato:

```text
SEC-001
Título:
Prioridade:
Problema:
Correção proposta:
Critério de aceite:
Arquivos/componentes envolvidos:
Complexidade:
```

Os critérios de aceite devem ser verificáveis.

---

# 36. Segunda etapa

Depois de gerar `SECURITY_AUDIT.md`:

**PARE.**

Não altere o código da aplicação.

Apresente no terminal um resumo contendo:

```text
Auditoria concluída

Críticas:
Altas:
Médias:
Baixas:
Informativas:

Relatório:
SECURITY_AUDIT.md
```

Aguarde autorização explícita antes de implementar qualquer correção.

---

# 37. Princípio final

Priorize **vulnerabilidades exploráveis e riscos concretos**.

Não produza dezenas de alertas genéricos apenas para aumentar a quantidade de achados.

É preferível apresentar:

```text
5 vulnerabilidades reais e bem demonstradas
```

do que:

```text
50 alertas genéricos ou falsos positivos.
```

Cada achado deve possuir evidência técnica suficiente para que outro desenvolvedor consiga reproduzir o raciocínio e implementar a correção.