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
- [ ] Implementar filtros por data, categoria, membro, forma de pagamento
- [x] Criar procedures tRPC para CRUD de entradas

## Módulo de Saídas
- [ ] Criar formulário de registro de despesas
- [ ] Implementar campos: data, categoria, centro de custo, fornecedor, valor, status
- [ ] Criar tabela filtrável de saídas
- [ ] Implementar filtros por data, categoria, centro de custo, status
- [ ] Criar procedures tRPC para CRUD de saídas

## Gestão de Membros
- [ ] Criar formulário de cadastro de membros
- [ ] Implementar campos: nome, contato, status (Regular, Atrasado, Inativo), data de batismo
- [ ] Criar tabela de membros com indicadores de status
- [ ] Implementar histórico individual de contribuições por membro
- [ ] Criar procedures tRPC para CRUD de membros

## Centros de Custo
- [ ] Criar formulário de cadastro de centros de custo
- [ ] Implementar tabela de centros de custo
- [ ] Integrar centros de custo ao módulo de saídas
- [ ] Criar procedures tRPC para CRUD de centros de custo

## Configurações da Igreja
- [ ] Criar formulário de configurações (nome, logo, pastor, tesoureira, versículo padrão)
- [ ] Implementar upload/armazenamento de logo
- [ ] Criar procedures tRPC para salvar e recuperar configurações
- [ ] Garantir que configurações sejam consumidas automaticamente pelos relatórios

## Relatórios
- [ ] Implementar Relatório de Entradas Dominical (cabeçalho, tabelas, total, versículo, rodapé)
- [ ] Implementar Relatório Financeiro-Clerical (gráficos, resumo, assinaturas)
- [ ] Integrar exportação em PDF para ambos os relatórios
- [ ] Criar procedures tRPC para gerar relatórios
- [ ] Implementar consumo automático de dados das Configurações da Igreja

## Módulo de Recibos
- [ ] Criar template de recibo individual
- [ ] Implementar geração de recibos por contribuição
- [ ] Implementar exportação/impressão de recibos em PDF
- [ ] Criar procedures tRPC para gerar recibos

## Controle de Acesso e Permissões
- [ ] Implementar verificação de perfil em todas as rotas
- [ ] Restringir acesso a funcionalidades por perfil (admin > tesoureiro > visualizador)
- [ ] Implementar proteção de procedures tRPC com adminProcedure, tesoureiroProcedure, etc.
- [ ] Criar UI condicional baseada em perfil do usuário

## Layout e Navegação
- [ ] Implementar sidebar fixa com menu de navegação
- [ ] Criar componente DashboardLayout personalizado para o sistema
- [ ] Implementar colapsibilidade da sidebar
- [ ] Criar navegação entre módulos (Dashboard, Entradas, Saídas, Membros, Centros de Custo, Relatórios, Recibos, Configurações)
- [ ] Implementar header com usuário logado e opção de logout

## Testes e Validação
- [ ] Escrever testes vitest para procedures tRPC críticas
- [ ] Testar fluxos de autenticação e autorização
- [ ] Testar geração de relatórios e recibos
- [ ] Validar responsividade em desktop, tablet e mobile
- [ ] Testar filtros e buscas em tabelas

## Entrega
- [ ] Revisar todo o sistema
- [ ] Criar checkpoint final
- [ ] Entregar ao usuário
