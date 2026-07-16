# Observabilidade, SLOs e evidências operacionais

## SLO inicial

Os alvos internos para a aplicação são:

- disponibilidade mensal de 99,9% para o endpoint de readiness;
- p95 de latência da API abaixo de 300 ms em condições normais;
- taxa de respostas 5xx abaixo de 1% em janela móvel de 15 minutos;
- RPO de 24 horas e RTO a ser confirmado após um exercício real de restauração.

Esses números são objetivos operacionais, não evidência de que já foram
atingidos em produção.

## Sinais disponíveis no próprio sistema

- `GET /api/v1/health/live/`: liveness, sem consultar dependências;
- `GET /api/v1/health/ready/`: banco e cache necessários para receber tráfego;
- `GET /api/v1/metrics/` com `X-Metrics-Token`: contadores e amostra limitada
  de p50/p95, sem query string ou dados pessoais;
- `scripts/load_smoke.py`: medição controlada de latência de endpoint somente
  leitura;
- logs do Django/Gunicorn com `X-Request-ID` para correlação;
- `python manage.py privacy_sla_report --json`: evidência de prazos LGPD.

Evidência local em 15/07/2026: smoke test isolado com 100 requisições
concorrentes ao liveness, 100 sucessos, p95 de 277,56 ms e máximo de 524,47
ms. A amostra serve para validar o mecanismo e o ambiente local; não prova o
SLO de produção.

## Alertas definidos

O coletor externo que transformará estas regras em notificações fica fora do
escopo desta rodada. As regras que devem ser configuradas são:

1. readiness diferente de 200 por 2 minutos;
2. p95 acima de 300 ms por 10 minutos;
3. erro 5xx acima de 1% por 15 minutos;
4. disco acima de 80% ou filas Celery acumuladas;
5. backup ausente no período diário ou falha no `restore_drill.sh`;
6. solicitação LGPD vencida sem responsável.

## Evidência e retenção

Registre data, commit, ambiente, executor, comando, resultado, logs e hashes
dos artefatos. Não copie tokens, cookies, dados pessoais ou conteúdo de
documentos para relatórios. Centralização de logs, tracing, notificações e
painéis externos dependem de infraestrutura posterior.
