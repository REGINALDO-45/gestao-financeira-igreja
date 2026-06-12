# Auditoria de Arquitetura: Gestão Financeira para Igreja

Este documento consolida os resultados da auditoria estrutural do projeto (Etapa 2), focando na organização, escalabilidade e manutenibilidade do código.

## 1. Visão Geral da Arquitetura
O sistema segue uma arquitetura baseada em Monorepo com `pnpm`, dividindo as responsabilidades claramente entre:
* `client/`: Single Page Application (React/Vite).
* `server/`: Backend API Node.js (Express/tRPC).
* `shared/`: Contratos e tipagens compartilhadas.

Essa abordagem (tRPC + Shared Types) garante um excelente *Developer Experience* e *Type-Safety* de ponta a ponta, reduzindo chances de erros ao integrar front e back.

## 2. Pontos Positivos
* **Separação de Componentes UI:** Uso do Radix/shadcn-ui isolado em `client/src/components/ui/`.
* **Separação de Formulários:** Formulários complexos estão extraídos em `client/src/components/forms/` (`EntryForm.tsx`, `ExpenseForm.tsx`, `MemberForm.tsx`). Isso limpa os arquivos de página.
* **Sistema de Rotas Backend:** tRPC garante que os tipos trafeguem corretamente sem a necessidade de gerar clients HTTP manualmente.
* **Isolamento do Banco de Dados:** Uso de Drizzle ORM centralizado previne vazamento de lógica SQL para os *routers*.

## 3. Gargalos e Anti-patterns Encontrados

### 3.1. Arquivos Gigantes (God Objects) no Backend
* O arquivo `server/db.ts` possui aproximadamente 28KB e concentra **todas** as queries do banco (Membros, Entradas, Saídas, Centros de Custo, Recibos).
* O arquivo `server/routers.ts` (aprox. 8KB) concentra **todas** as definições de rotas tRPC em um único objeto.
* **Risco:** Dificuldade de manutenção paralela e aumento cognitivo ao buscar lógicas específicas.

### 3.2. Sobrecarga nas Páginas (Frontend)
* O arquivo `client/src/pages/Reports.tsx` possui cerca de **51KB**. Páginas devem atuar preferencialmente como aglutinadores (*containers*) e delegar as responsabilidades de visualização para componentes menores (ex: `ReportChart.tsx`, `ReportTable.tsx`).
* Há lógica pesada e layouts complexos embutidos diretamente em arquivos de páginas (como `Entries.tsx` e `Expenses.tsx` que rondam os 10KB+).

## 4. Recomendações e Melhorias (Preparação para Etapa 3)

Como estas alterações estruturais envolvem refatoração de dezenas de imports (o que faremos a fundo na Etapa 3), listamos aqui as decisões arquiteturais a serem tomadas:

1. **Modularização do Backend:**
   * Criar `server/routers/` com: `membersRouter.ts`, `financeRouter.ts`, `settingsRouter.ts`.
   * Criar `server/db/` (ou `server/repositories/`) para quebrar o `db.ts` em: `members.ts`, `entries.ts`, `expenses.ts`, `settings.ts`.
2. **Modularização do Frontend:**
   * Criar a pasta `client/src/components/reports/` e separar os gráficos e tabelas que estão dentro de `Reports.tsx`.
   * Fazer o mesmo para fragmentos grandes das telas de Lançamentos e Despesas.

## 5. Correções Automáticas Executadas
Nesta etapa de auditoria, validamos a segurança estrutural das pastas e removemos dependências teóricas mortas, mas optamos por transferir as quebras de arquivos grandes (`db.ts` e `Reports.tsx`) para a **Etapa 3 (Refatoração)**, visando garantir a correta checagem do TypeScript após cada split.

---
**Status da Etapa 2:** Concluída.
