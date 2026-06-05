# Gestão Financeira Igreja 1.0 - TODO

## Infraestrutura e Autenticação
- [x] Inicializar projeto com scaffold web-db-user
- [x] Definir schema de banco de dados (membros, entradas, saídas, centros de custo, configurações)
- [x] Criar migrações SQL e aplicar ao banco
- [x] Implementar autenticação via Manus OAuth com perfis (admin, tesoureiro, visualizador)
- [x] Criar middleware de autorização por perfil

## Dashboard
- [x] Implementar cards de saldo (entradas, saídas, saldo líquido)
- [x] Implementar gráfico de linha para evolução financeira mensal
- [x] Implementar gráfico de rosca para distribuição por categorias
- [x] Integrar dados dinâmicos do banco ao dashboard

## Módulo de Entradas
- [x] Criar formulário de registro de dízimos e ofertas
- [x] Implementar campos: data, culto/domingo, categoria, forma de pagamento, membro
- [x] Criar tabela filtrável de entradas
- [x] Implementar filtros por data, categoria, membro, forma de pagamento
- [x] Criar procedures tRPC para CRUD de entradas

## Módulo de Saídas
- [x] Criar formulário de registro de despesas
- [x] Implementar campos: data, categoria, centro de custo, fornecedor, valor, status
- [x] Criar tabela filtrável de saídas
- [x] Implementar filtros por data, categoria, centro de custo, status
- [x] Criar procedures tRPC para CRUD de saídas

## Gestão de Membros
- [x] Criar formulário de cadastro de membros
- [x] Implementar campos: nome, contato, status (Regular, Atrasado, Inativo), data de batismo
- [x] Criar tabela de membros com indicadores de status
- [ ] Implementar histórico individual de contribuições por membro
- [x] Criar procedures tRPC para CRUD de membros

## Centros de Custo
- [x] Criar formulário de cadastro de centros de custo
- [x] Implementar tabela de centros de custo
- [x] Integrar centros de custo ao módulo de saídas
- [x] Criar procedures tRPC para CRUD de centros de custo

## Configurações da Igreja
- [x] Criar formulário de configurações (nome, logo, pastor, tesoureira, versículo padrão)
- [ ] Implementar upload/armazenamento de logo
- [x] Criar procedures tRPC para salvar e recuperar configurações
- [x] Garantir que configurações sejam consumidas automaticamente pelos relatórios

## Relatórios
- [x] Implementar Relatório de Entradas Dominical (cabeçalho, tabelas, total, versículo, rodapé)
- [x] Implementar Relatório Financeiro-Clerical (gráficos, resumo, assinaturas)
- [ ] Integrar exportação em PDF para ambos os relatórios
- [x] Criar procedures tRPC para gerar relatórios
- [x] Implementar consumo automático de dados das Configurações da Igreja

## Módulo de Recibos
- [x] Criar template de recibo individual
- [x] Implementar geração de recibos por contribuição
- [ ] Implementar exportação/impressão de recibos em PDF
- [x] Criar procedures tRPC para gerar recibos

## Controle de Acesso e Permissões
- [x] Implementar verificação de perfil em todas as rotas
- [x] Restringir acesso a funcionalidades por perfil (admin > tesoureiro > visualizador)
- [x] Implementar proteção de procedures tRPC com adminProcedure, tesoureiroProcedure, etc.
- [x] Criar UI condicional baseada em perfil do usuário

## Layout e Navegação
- [x] Implementar sidebar fixa com menu de navegação
- [x] Criar componente DashboardLayout personalizado para o sistema
- [x] Implementar colapsibilidade da sidebar
- [x] Criar navegação entre módulos (Dashboard, Entradas, Saídas, Membros, Centros de Custo, Relatórios, Recibos, Configurações)
- [x] Implementar header com usuário logado e opção de logout

## Testes e Validação
- [x] Escrever testes vitest para procedures tRPC críticas
- [x] Testar fluxos de autenticação e autorização
- [ ] Testar geração de relatórios e recibos
- [ ] Validar responsividade em desktop, tablet e mobile
- [ ] Testar filtros e buscas em tabelas

## Entrega
- [ ] Revisar todo o sistema
- [ ] Criar checkpoint final
- [ ] Entregar ao usuário
