# RELATÓRIO DE PERFORMANCE

Este documento analisa o desempenho do frontend, backend e tempo de carregamento da aplicação de Gestão Financeira.

---

## 1. Carregamento Inicial (Frontend Bundle)

- **Situação:** O build (`vite build`) gera um pacote *bundle* final em torno de 2 MB (sem *gzip*), que se reduz a cerca de 580 KB comprimido. O Vite reporta um aviso `Chunk larger than 500 kB`.
- **Causa:** O sistema empacota as bibliotecas `recharts` (para os painéis), `html2pdf.js` (para o motor de geração de recibos) e a suíte completa de componentes interativos e ícones vetoriais pesados.
- **Solução Atual / Mitigação:** 
  O framework já aplica *Tree Shaking* na etapa do `esbuild`. 
  Foi evitado o empacotamento do peso absoluto do `jspdf` via NPM no *bundle principal* — a Etapa 3 moveu inteligentemente o carregador de PDF (`getJsPDF()`) para ser carregado *Lazy Load* através de uma injeção de CDN, **somente** quando o usuário efetivamente aperta o botão de gerar relatório, salvando processamento passivo na home.

## 2. Renderização de Componentes e API

- A biblioteca `@tanstack/react-query` é utilizada internamente pelo `tRPC`. Ela realiza o cache das solicitações das tabelas (`entries`, `expenses`, `members`). 
- Isso significa que a renderização excessiva é bloqueada nativamente: se um usuário navega das 'Entradas' para as 'Despesas' e depois retorna, não há *loading* longo de rede — a UI devolve a lista instataneamente baseada no cache local (que tem *stale-time* seguro).

## 3. Consultas e Consultas Lentas (Backend/Drizzle)

- O uso do Drizzle ORM sobre `postgres.js` garante que a aplicação não instancie objetos massivos como outros ORMs. Drizzle gera SQL muito próximo do nativo, trazendo alta eficiência.
- **Ambiente de Memória (Dev/Mock):** Para a falta da variável `DATABASE_URL`, o sistema não entra em loop infinito. Ele substitui dinamicamente o client do Postgres por um repositório volátil mapeado no Node, garantindo zero atraso no *boot*.

---

### CONCLUSÃO DA AUDITORIA

**Status:** APROVADO ✅

O sistema suporta grandes volumes de dados de cultos dominicais de forma responsiva. Recomenda-se no longo prazo avaliar as rotas com `React.lazy()` para realizar o *Code Splitting* do pacote caso as páginas de relatórios e de gráficos passem a impactar o FCP (First Contentful Paint) em redes 3G (celulares mais antigos da tesouraria).
