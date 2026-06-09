# Gestão Financeira da Igreja

Um sistema web completo para gerenciar as finanças (entradas, despesas, centros de custo), membros, recibos em PDF e painéis gráficos, criado com o objetivo de oferecer transparência contábil e auditoria simplificada para congregações.

## Tecnologias Utilizadas

- **Frontend:** React, Tailwind CSS, Shadcn UI, Recharts, Vite.
- **Backend:** Node.js, Express, tRPC (Type-Safe APIs).
- **Banco de Dados:** PostgreSQL (gerenciado pelo Drizzle ORM).
- **Infraestrutura e Auth:** OAuth, Autenticação de Sessões e Upload via Proxy Assinado.

## Como Instalar e Rodar Localmente

1. Clone ou baixe este repositório.
2. Certifique-se de que possui **Node.js (v18+)** instalado.
3. Instale as dependências:
   ```bash
   npm install
   ```
4. (Opcional) Crie um arquivo `.env` na raiz com:
   ```env
   DATABASE_URL=postgres://usuario:senha@localhost:5432/igreja
   JWT_SECRET=super_senha_aqui
   ```
   *Se omitido, o sistema utilizará um modo Mock em memória (apenas para testes locais).*

5. Inicialize as tabelas no Banco (se tiver a `DATABASE_URL` configurada):
   ```bash
   npm run db:push
   ```
6. Inicie o servidor de desenvolvimento (Frontend + Backend juntos):
   ```bash
   npm run dev
   ```
7. Acesse no navegador em `http://localhost:5000`.

## Como Fazer Build e Deploy (Produção)

1. Gere o Build estático e de Backend:
   ```bash
   npm run build
   ```
2. Defina as variáveis de ambiente mandatórias em seu provedor Cloud (ex: Render, Heroku ou VPS Node).
3. Inicie o sistema no modo produção:
   ```bash
   NODE_ENV=production node dist/index.js
   ```
