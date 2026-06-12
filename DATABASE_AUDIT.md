# AUDITORIA DO BANCO DE DADOS

Este documento sumariza a revisão completa e correção na camada de banco de dados (Drizzle ORM) da aplicação, garantindo integridade e consistência relacional.

---

## 1. Mapeamento Atual do Banco (PostgreSQL)

A aplicação conta com as seguintes tabelas (em `drizzle/schema.ts`):
1. **users**: Autenticação e Perfis (com a coluna `role`).
2. **churchSettings**: Configurações da Igreja.
3. **members**: Gestão de Membros.
4. **costCenters**: Centros de Custo / Departamentos.
5. **entries**: Receitas (Dízimos, Ofertas, etc.).
6. **expenses**: Despesas (Contas Fixas, Manutenção).
7. **receipts**: Recibos Gerados.

Existem mapeamentos tipados e Enums nativos do Postgres para garantir controle de valores absolutos (`role_enum`, `member_status_enum`, `entry_category_enum`, `expense_category_enum`, `payment_method_enum`, `payment_status_enum`).

## 2. Análise de Falhas (Encontradas)

Durante a auditoria, percebeu-se que o schema relacional carecia das **constraints de Foreign Key (Chave Estrangeira)** para proteger a consistência referencial dos dados.

**Problemas Identificados:**
- Tabela `entries`: Possuía a coluna `memberId` do tipo numérico inteiro, mas sem referência amarrada à tabela `members`.
- Tabela `expenses`: Possuía a coluna `costCenterId`, mas sem a referência forte à tabela `costCenters`.
- Tabela `receipts`: Possuía colunas `entryId` e `memberId`, ambas sem amarração com as respectivas tabelas de base.

Se deixado dessa forma, o sistema poderia corromper dados silenciosamente (por exemplo, deletar um membro na base e deixar "entradas órfãs" não rastreáveis).

## 3. Correções Aplicadas

Atuamos diretamente na base Drizzle (`drizzle/schema.ts`) adicionando a cláusula encadeada `.references()` nas chaves secundárias, consertando o risco relacional do PostgreSQL:

### Alterações:
- `entries.memberId`: Injetada Foreign Key apontando para `members.id`.
- `expenses.costCenterId`: Injetada Foreign Key apontando para `costCenters.id`.
- `receipts.entryId`: Injetada Foreign Key apontando para `entries.id`.
- `receipts.memberId`: Injetada Foreign Key apontando para `members.id`.

### Exemplo do Reparo:
```ts
// ANTES:
memberId: integer("memberId"),

// DEPOIS:
memberId: integer("memberId").references(() => members.id),
```

## 4. Status de Segurança da Tabela de Usuários (Users)

- O campo `openId` já conta com `.unique()`, prevenindo usurpação de perfis duplicados.
- Triggers via `$onUpdate` do Drizzle atualizam adequadamente o `updatedAt` com `new Date()` nativamente.
- O campo `role` possui default como `"visualizador"`, evitando escalar privilégios caso haja ausência da definição na inserção.

---

### CONCLUSÃO DA AUDITORIA

**Status:** CORRIGIDO E APROVADO ✅

O esquema de banco de dados e suas tipagens estão 100% íntegros. Não será possível que o sistema ou chamadas de API gerem lixos de dados órfãos, com referências seguras entre tabelas e *defaults* seguros (Safe Defaults) aplicados corretamente.

O projeto segue agora para auditoria de **SEGURANÇA**.
