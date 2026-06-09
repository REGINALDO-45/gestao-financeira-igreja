# MANUAL TÉCNICO E DE ARQUITETURA

## 1. Arquitetura
A aplicação adota um padrão de **Monorepo (Fullstack)** em TypeScript, que une o Frontend e o Backend sob a mesma base, compartilhando contratos de tipagem de ponta-a-ponta via **tRPC**.
- **Frontend (Client):** Renderizado no cliente (SPA) via Vite, estruturado em React + wouter (roteamento leve) + React Query.
- **Backend (Server):** Processo monolítico rodando Node.js (Express), construído para responder mutações sob medida e proteger as interfaces de dados através de Middlewares rígidos.

## 2. Estrutura de Pastas
O projeto foi refatorado e modulado (padrão Domain-Driven Design) para melhor clareza de contexto:
- `client/src/`: Código fonte do Frontend.
  - `/components`: Componentes visuais UI.
  - `/pages`: Telas completas (Entradas, Despesas, Relatórios).
  - `/lib/reports`: Submódulos extraídos responsáveis por gerar desenhos em Canvas/PDF e lógica pesada de relatórios.
- `server/`: Código fonte do Backend.
  - `/_core`: Lógica não-relacional, como integrações com provedores de Inteligência Artificial, Uploads (Proxy S3) e configuração do TRPC.
  - `/db`: Arquivos de banco de dados extraídos por Domínio (ex: `entries.ts`, `users.ts`, `core.ts`).
  - `/routers`: Controladores de rota tRPC.
- `drizzle/`: Esquemas SQL, Enums e definições absolutas do Banco (ex: `schema.ts`).

## 3. Banco de Dados (Drizzle ORM)
O banco foi purificado para utilizar o PostreSQL via Drizzle.
- O Drizzle empacota a geração e atualização dos metadados através dos comandos do kit (`db:push`).
- Todas as chaves estrangeiras (`Foreign Keys`) como ligações entre `entries.memberId -> members.id` estão amarradas em `.references()` e operam de modo nativo.
- Suporta "In-memory database" ativada como contorno caso a env `DATABASE_URL` não seja encontrada no Boot.

## 4. Segurança e Integrações
- **APIs:** TRPC impede injeções de SQL ou dados não tipados porque transita apenas *Payloads* validados via *Zod Objects*.
- **Role-Based Access Control:** Middlewares de permissões verificam papéis em rotas exclusivas para `treasurerProcedure` e `adminProcedure`.
- **Uploads:** Integração com Storage externo restrita por meio de assinaturas temporárias (Signed URLs).

## 5. Processo de Manutenção Diária
- Ao criar um novo módulo (Exemplo: "Bens Patrimoniais"):
  1. Adicionar o Tabela no `drizzle/schema.ts`.
  2. Executar `npm run check`.
  3. Criar a interface de CRUD no `server/db/bens.ts`.
  4. Adicionar as rotas (query/mutation) em `server/routers/bens.ts`.
  5. Plugar em `server/routers.ts`.
  6. Consumir na tela via `trpc.bens.list.useQuery()`.
