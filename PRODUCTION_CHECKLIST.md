# CHECKLIST DE PRODUÇÃO

Este checklist garante a integridade da entrega final do projeto antes da implantação (deploy) em ambiente de produção (Nuvem/VPS/Host).

---

## 1. Variáveis de Ambiente Documentadas e Exigidas (`.env`)
- `DATABASE_URL`: Deve apontar para o pool de conexões PostgreSQL de produção.
- `JWT_SECRET`: Chave forte e extensa que não deve ser compartilhada para criptografar cookies de sessão.
- `BUILT_IN_FORGE_API_URL` e `BUILT_IN_FORGE_API_KEY`: Necessários caso a infraestrutura continue a utilizar o Forge Backend.
- O arquivo `.env` verdadeiro está ignorado (`.gitignore` padrão acoplado) e nenhum dado sigiloso foi *hardcoded*. (Verificado e Validado ✅)

## 2. Validação da Integridade do Build
O comando de Build principal garante a geração limpa de *artifacts*:
- [x] TypeScript faz a checagem rigorosa sem emitir arquivos com `tsc --noEmit`.
- [x] O *bundler* (Vite + esbuild) comprime a árvore de HTML e Assets da pasta `/client` na pasta raiz `/dist/public`.
- [x] O build funciona e passou nos testes de compilação sem gerar exceções graves.

## 3. URLs, SSL e Certificados
Como se trata de uma aplicação de controle contábil que trafega senhas e informações institucionais, é OBRIGATÓRIO:
- Habilitar terminação HTTPS/SSL no Proxy Reverso ou Load Balancer (Ex: NGINX / Cloudflare).
- Garantir que o TRPC_URL (base-url configurado no host) não seja interceptado na rede pública.

## 4. Servidor Node
- A aplicação backend roda num processo único Express gerado no `dist/index.js`.
- É obrigatório que seja instanciada via `NODE_ENV=production node dist/index.js` para garantir que o framework de renderização desabilite *dev logs* e *stack traces*.

## 5. Migrations do Banco de Dados
A implantação no PostgreSQL depende exclusivamente da inicialização das tabelas:
- [x] As *foreign keys* (chaves estrangeiras) protetivas foram declaradas e checadas.
- [ ] O administrador deve executar o comando preparatório `npm run db:push` no ambiente configurado (ou gerenciar arquivos via `drizzle-kit migrate`) antes do boot do `dist/index.js`.

---

**NOTA FINAL:** O deploy automático NÃO ESTÁ AUTORIZADO via script, mantendo a conformidade com as regras de que dados destrutivos não seriam modificados sem a intervenção humana ativa do cliente. O ambiente está 100% livre de bloqueios técnicos e pronto para ir para o servidor de hospedagem.
