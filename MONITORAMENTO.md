# MONITORAMENTO E LOGS

O sistema atual não possui telemetria de código (como envio passivo de telemetrias) por privacidade nativa da igreja, mantendo apenas logs de console locais (`console.error`).

No entanto, para suportar a manutenção em ambiente produtivo contínuo, **recomendamos a configuração das seguintes camadas de monitoramento:**

### 1. Monitoramento de Erros de Front e Back (Sentry)
- **O que faz:** Captura de exceções e crashes não tratados de forma inteligente.
- **Implementação Sugerida:** Configurar o Sentry Node no `server/_core/index.ts` interceptando as exceções globais. Além disso, usar a biblioteca `@sentry/react` em volta do `client/src/main.tsx` capturando componentes que "quebraram" devido a erros.

### 2. Disponibilidade (UptimeRobot ou BetterStack)
- É crucial garantir que o link do sistema esteja funcionando, especialmente em domingos de manhã ou fechamentos de mês.
- Configurar pings HTTP para um end-point simples como `GET /api/health` para checar 200 OK de cinco em cinco minutos.

### 3. Logs de Nuvem Estruturados
Se a hospedagem escolhida for **AWS (CloudWatch), GCP (Cloud Logging)** ou provedores Node (Render, Vercel ou Heroku), garanta que os logs capturados pelo `.catch(console.error)` sejam persistidos e acessíveis.
