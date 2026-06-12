# Notas do Projeto

## 2026-06-12 — PR #2: Relatórios (data atual e remoção de dados fictícios)

- PR: https://github.com/REGINALDO-45/gestao-financeira-igreja/pull/2 (draft)
- Branch: `fix/relatorio-data-atual-remove-mockup`
- Alterações:
  - Datas inicial/final do relatório passam a iniciar na data atual (antes fixas em `2024-05-26`).
  - Removido o "Modo de Demonstração" e todos os dados fictícios/mockados da página de Relatórios.
  - Relatórios usam apenas lançamentos reais (dispositivos diferentes).
  - Rodapé do relatório financeiro usa a data atual em vez de "31 de Maio de 2024" fixo.

### Check "Continuous AI: Accessibility Fix Agent" falhando na PR

- Não é um GitHub Actions workflow do repositório (sem `.github/workflows`).
- É uma integração externa de terceiros (continue.dev) conectada à conta/organização do GitHub.
- Erro reportado: "Agent encountered an error" — erro interno do próprio serviço externo, não relacionado ao código da PR.
- Não bloqueia o merge (não é required check). Se o ruído persistir, avaliar desativar essa integração nas configurações do GitHub da conta/organização.
