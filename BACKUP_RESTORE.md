# ESTRATÉGIA DE BACKUP E RESTAURAÇÃO

Como os dados financeiros são de criticidade máxima para a instituição, a estratégia padrão assume que o PostgreSQL estará em uma instância gerenciada ou local com cronjobs rodando.

## 1. Backups Automáticos (Servidor)

A nuvem responsável por hospedar o banco `DATABASE_URL` deve estar configurada para backups do tipo **Point-in-Time Recovery (PITR)** por pelo menos 7 dias e dumps diários armazenados em um *Bucket* de armazenamento frio (como AWS S3 Glacier ou equivalente).

Comando utilitário sugerido para Backup Cron:
```bash
# Executar diariamente 00:00
pg_dump -U postgres -d igrejafin > /backups/igrejafin_$(date +%Y%m%d).sql
```

## 2. Exportação Manual

O sistema não possui um botão direto de "Baixar Banco de Dados em .SQL" na aba de "Configurações" da interface. A responsabilidade de manter o dado da congregação seguro em arquivo *offline* fica alocada na equipe de TI que faz a ponte com o provedor da nuvem.

## 3. Plano de Recuperação

Em caso de falha catastrófica:
1. Suspender a aplicação temporariamente (`PM2 stop` ou pausando contêiner).
2. Restaurar o banco mais recente através do `pg_restore`.
3. Iniciar a aplicação e validar se não houve conflito de ID.
4. Nenhuma intervenção no código fonte ou nas configurações do Drizzle é necessária.
