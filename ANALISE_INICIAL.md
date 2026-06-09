# Análise Inicial do Projeto: Gestão Financeira para Igreja

Este documento apresenta a análise inicial da arquitetura, tecnologias e funcionalidades do sistema de Gestão Financeira para Igreja, conforme a **Etapa 1** do processo de auditoria e refatoração.

## 1. Stack Utilizada
O projeto é uma aplicação Full-stack baseada em **TypeScript**, dividida claramente entre cliente (Frontend) e servidor (Backend), compartilhando tipos através de um diretório comum.

* **Linguagem Principal:** TypeScript (TS/TSX)
* **Gerenciador de Pacotes:** pnpm
* **Build Tool:** Vite (Frontend) / esbuild (Backend)

## 2. Framework Frontend
A interface de usuário foi construída visando performance e componentes reutilizáveis.

* **Biblioteca Core:** React 19
* **Roteamento:** Wouter
* **Estilização:** Tailwind CSS v4 com `tailwindcss-animate`
* **Biblioteca de Componentes:** shadcn/ui (baseado em Radix UI primitives)
* **Gerenciamento de Estado e Data Fetching:** TanStack React Query + tRPC Client
* **Formulários e Validação:** React Hook Form + Zod
* **Ícones:** Lucide React

## 3. Backend Utilizado
O backend é uma API moderna com tipagem estática end-to-end conectando com o frontend.

* **Runtime:** Node.js
* **Framework Web:** Express
* **Comunicação API:** tRPC (TypeScript Remote Procedure Call) permitindo compartilhamento de tipos estritos com o frontend.

## 4. Banco de Dados
A persistência de dados utiliza um banco de dados relacional moderno.

* **Banco de Dados:** MySQL (driver `mysql2`)
* **ORM:** Drizzle ORM
* **Migrações:** gerenciadas via Drizzle Kit (`drizzle/`)

## 5. Autenticação e Segurança
O sistema possui controle de acesso com base em funções (Role-Based Access Control - RBAC).

* **Método:** JWT (JSON Web Tokens) manipulado pela biblioteca `jose`.
* **Gerenciamento de Sessão:** Cookies HTTP-only.
* **Perfis de Acesso Identificados:** 
  - `admin` (Acesso total)
  - `tesoureiro` (Acesso restrito a operações financeiras e membros)

## 6. Estrutura de Pastas
A organização do monorepo segue um padrão modular:

```text
/
├── client/          # Aplicação Frontend (React + Vite)
│   ├── public/      # Assets estáticos
│   └── src/         # Código fonte (components, pages, hooks, contexts, lib)
├── server/          # Aplicação Backend (Express + tRPC)
│   ├── _core/       # Configurações essenciais (trpc setup, system router)
│   ├── db.ts        # Configuração do Drizzle e queries DB
│   ├── routers.ts   # Rotas do tRPC e regras de negócio
│   └── storage.ts   # Uploads / S3 client
├── shared/          # Código compartilhado entre Frontend e Backend
│   ├── types.ts     # Interfaces globais
│   └── const.ts     # Constantes globais
├── drizzle/         # Arquivos de schema e migrations do Drizzle ORM
└── package.json     # Dependências globais do projeto (monorepo root)
```

## 7. Funcionalidades Existentes
Analisando as rotas do servidor (`server/routers.ts`), o sistema possui:

1. **Configurações da Igreja:** Gestão dos dados gerais (Nome, Pastor, Tesoureiro, Logo).
2. **Gestão de Membros:** CRUD de membros (status: regular, inativo, atrasado) e histórico de dízimos.
3. **Entradas (Receitas):** Registro de dízimos, ofertas, campanhas, doações, etc., categorizados com métodos de pagamento.
4. **Saídas (Despesas):** Registro de contas a pagar (água, luz, internet, missões, etc.) com upload de comprovantes.
5. **Centros de Custo:** Criação e listagem para categorização avançada financeira.
6. **Emissão de Recibos:** Geração de recibos em PDF para dízimos e ofertas vinculados aos membros.

## 8. Integrações Externas
* **AWS S3:** Utilizado via `@aws-sdk/client-s3` para armazenamento de arquivos em nuvem (ex: Upload de Logos da Igreja e Comprovantes de Despesas).

## 9. Dependências Principais Notáveis
Além das bibliotecas citadas acima:
* `html2pdf.js`: Para geração de recibos PDF no client-side.
* `recharts`: Para geração de gráficos em relatórios financeiros e dashboards.
* `date-fns`: Para manipulação de datas e ranges de relatórios.
* `embla-carousel-react`: Para componentes interativos de carrossel.
* `sonner`: Para notificações toast elegantes no frontend.

---
**Status da Etapa 1:** Concluída com sucesso.
