# AUDITORIA DO BACKEND

Este documento consolida a análise e auditoria completa do backend do sistema, avaliando arquitetura, segurança, tratamento de erros, rotas, validações e comunicação com banco de dados.

---

## 1. Arquitetura e Organização

A arquitetura do backend segue o padrão tRPC, oferecendo tipagem segura (type-safety) de ponta a ponta.

- **Antes da Intervenção:** O projeto concentrava quase toda a lógica de acesso a dados (repositórios e schemas) no arquivo gigante `server/db.ts` e todas as definições de rotas no arquivo `server/routers.ts`.
- **Após Refatoração (Etapa 3):**
  - **Repositórios:** Movidos para `server/db/[dominio].ts` (ex: `users.ts`, `settings.ts`, `entries.ts`).
  - **Rotas (APIs):** Movidas para `server/routers/[dominio].ts` e agregadas no arquivo central `server/routers.ts`.
  - **Core:** Toda configuração de inicialização e middlewares está em `server/_core/`.

O backend agora está extremamente limpo, fragmentado de forma coesa e pronto para receber novas *features* sem conflitos de *merge*.

## 2. API e Rotas (tRPC)

As rotas são providas primariamente via tRPC e organizadas por domínio de negócio:
- `churchSettingsRouter`
- `membersRouter`
- `entriesRouter`
- `expensesRouter`
- `costCentersRouter`
- `receiptsRouter`

### Avaliação:
Todas as rotas fazem uso de `zod` para **validação rigorosa de dados de entrada**. Isso impede que o sistema seja corrompido com inputs maliciosos ou formatações inconsistentes (SQL Injection via corpo da requisição é barrado aqui e no Drizzle).

## 3. Segurança e Middlewares

O controle de acesso é implementado diretamente no nível de procedimento do tRPC em `server/_core/trpc.ts`.

Existem os seguintes *guards* (middlewares):
- **`publicProcedure`:** Acesso não autenticado (utilizado raramente).
- **`protectedProcedure`:** Acesso autenticado genérico. Requer que `ctx.user` não seja nulo.
- **`adminProcedure`:** Acesso irrestrito restrito a `role === 'admin'`.
- **`treasurerProcedure`:** Acesso financeiro restrito a `role === 'admin'` ou `role === 'tesoureiro'`. Utilizado intensamente nas rotas de `create` e `update` de relatórios, entradas e despesas.

### Avaliação:
A separação de responsabilidades (RBAC - Role-Based Access Control) está corretamente aplicada no núcleo do tRPC. A autenticação baseada em sessão garante a origem das requisições.

## 4. Integrações Externas

O Express conta com endpoints além do tRPC no arquivo principal (`server/_core/index.ts`):
- **Webhooks & OAuth:** `server/_core/oauth.ts` resolve o fluxo de autorização via provedor externo.
- **Storage:** `server/_core/storageProxy.ts` serve de ponte segura para o Forge Storage (envio e visualização de comprovantes com urls pre-assinadas).
- O limite de tamanho do JSON do Express foi elevado a `50mb` (`app.use(express.json({ limit: "50mb" }))`) prevenindo quebras em payloads grandes ou strings Base64.

### Avaliação:
O `storageProxy` oculta as credenciais `forgeApiKey` do cliente, validando requisições backend-to-backend corretamente.

## 5. Comunicação com o Banco

Acesso realizado via **Drizzle ORM** sobre PostgreSQL / Memória.

- O banco é inicializado de forma fluida. Na ausência de `DATABASE_URL` (ambiente de dev local), ele inicializa com banco local / memória, o que é útil.
- Os *Queries* são majoritariamente gerados no padrão *query builder* de forma performática e segura contra injeções de SQL.

## 6. Tratamento de Erros

- O pacote tRPC já padroniza as saídas JSON de erros com `TRPCError` de formato claro para o cliente.
- O middleware de usuário devolve `UNAUTHORIZED` ou `FORBIDDEN` adequadamente se a sessão ou perfil de acesso falharem.
- Erros do `storageProxy` devolvem status corretos HTTP `502` e não expõem stacks internos.

---

### CONCLUSÃO DA AUDITORIA

**Status:** APROVADO ✅

O backend não apresenta gargalos claros e está protegido com validações rígidas. A separação dos módulos feita na Etapa 3 preparou a base para escalabilidade profissional.

Próximos passos deverão auditar o Banco de Dados (Etapa 5) para checagem da sanidade relacional (foreign keys, defaults e constraints).
