# Roadmap de excelência da plataforma

Este documento consolida as melhorias recomendadas para elevar o CAVN Digital do nível profissional atual para o patamar das melhores plataformas do mercado.

## Meta

Alcançar aproximadamente **9/10** em arquitetura, segurança, confiabilidade, desempenho, experiência, governança e operação.

## Estado da entrega de 15/07/2026

Esta rodada implementou a base técnica de acessibilidade automatizada, i18n `pt-BR`/`en-US`, solicitações de direitos da LGPD, exportação de dados, auditoria e os artefatos de avaliação/teste. Os itens que exigem participantes externos, auditor independente ou aprovação jurídica permanecem abertos até que exista evidência correspondente.

## P0 — Segurança e riscos imediatos

- [ ] Revogar o token GitHub exposto na URL do remoto e migrar para SSH ou credential helper.
- [ ] Tornar 2FA obrigatório para administradores, curadores e catalogadores.
- [ ] Criar enrollment seguro de 2FA, códigos de recuperação e reset auditado.
- [ ] Adotar storage privado S3/MinIO com URLs temporárias assinadas.
- [ ] Executar antivírus e processamento de uploads em ambiente isolado.
- [ ] Manter `pip-audit`, `npm audit`, Trivy e secret scanning no CI.
- [ ] Gerar SBOM e assinar imagens Docker.
- [ ] Eliminar `unsafe-inline` da CSP usando nonce ou hashes.
- [ ] Realizar pentest independente e corrigir achados críticos e altos.
- [ ] Formalizar política de atualização e resposta a vulnerabilidades.

## P1 — Confiabilidade operacional

- [ ] Definir SLOs, como 99,9% de disponibilidade e p95 da API abaixo de 300 ms.
- [ ] Alertar sobre indisponibilidade, latência, erros, disco, filas e backups.
- [ ] Centralizar logs, métricas e tracing distribuído.
- [ ] Separar liveness, readiness e verificação de dependências.
- [ ] Automatizar backups criptografados e externos.
- [ ] Executar testes periódicos de restauração completa.
- [ ] Definir disaster recovery com RPO e RTO.
- [ ] Executar migrações em job único de deploy, fora do startup normal.
- [ ] Implementar deploy rolling ou blue-green com rollback automático.
- [ ] Criar runbooks para incidentes recorrentes.

## P1 — Qualidade e testes

- [ ] Criar testes E2E para login, 2FA, upload, edição, aprovação, publicação, busca e logout.
- [x] Integrar Playwright ao CI.
- [x] Integrar Axe para acessibilidade automatizada.
- [ ] Testar navegação por teclado e leitores de tela.
- [ ] Criar testes de contrato entre frontend e API.
- [ ] Testar concorrência e idempotência dos workflows.
- [ ] Criar testes integrados com PostgreSQL, Redis, Celery e storage.
- [ ] Elevar progressivamente a cobertura de autenticação, permissões e serviços.
- [ ] Adicionar testes de regressão visual.
- [ ] Bloquear deploy quando quality gates críticos falharem.

## P1 — Performance e escala

- [ ] Medir LCP, CLS e INP de usuários reais.
- [ ] Definir budgets para JavaScript, CSS, imagens e fontes.
- [ ] Executar testes de carga com k6 ou Locust.
- [ ] Medir p50, p95 e p99 por endpoint.
- [ ] Otimizar queries com base em evidências de produção.
- [ ] Eliminar consultas duplicadas no detalhe de documentos relacionados.
- [ ] Separar filas Celery para OCR, imagens e tarefas leves.
- [ ] Aplicar limites de CPU, memória, timeout e tamanho por processamento.
- [ ] Adicionar réplicas e autoscaling quando o volume justificar.
- [ ] Avaliar OpenSearch/Elasticsearch quando PostgreSQL FTS não for suficiente.
- [ ] Usar CDN apenas para conteúdo público e imutável.
- [ ] Gerar thumbnails e formatos AVIF/WebP.
- [ ] Implementar upload multipart e retomável para arquivos grandes.

## P2 — UX/UI de referência

- [x] Criar e documentar um design system completo.
- [x] Padronizar tokens de cor, tipografia, espaçamento, estados e movimento.
- [x] Garantir loading, error, empty e success state em todas as jornadas.
- [x] Oferecer recuperação clara para falhas de upload e processamento.
- [x] Exibir progresso real de upload, OCR e geração de thumbnails.
- [x] Implementar autosave e recuperação de rascunhos com expiração.
- [x] Melhorar a busca com sugestões, filtros persistentes e destaque de resultados.
- [x] Oferecer visualização acessível e responsiva de documentos.
- [x] Produzir alternativas textuais para gráficos.
- [ ] Atender WCAG 2.2 AA em contraste, foco e interação.
- [ ] Realizar testes de usabilidade com usuários reais.
- [x] Medir sucesso, abandono e tempo de conclusão das tarefas.
- [ ] Completar internacionalização caso exista público multilíngue. (Base `pt-BR`/`en-US` e jornadas legais/admin implementadas; revisão dos textos legados restantes pendente.)

## P2 — Governança e privacidade

- [x] Inventariar e classificar os dados tratados.
- [x] Definir retenção, descarte e anonimização.
- [x] Implementar consentimento e governança de analytics.
- [x] Formalizar atendimento aos direitos previstos na LGPD. (Fluxo técnico de solicitação, acompanhamento, exportação, auditoria e administração implementado; validação jurídica de bases, prazos e exceções pendente.)
- [x] Tornar a trilha de auditoria resistente a adulteração.
- [x] Definir segregação de funções para publicação e administração.
- [x] Revisar acessos e privilégios periodicamente.
- [x] Manter threat model atualizado.
- [ ] Avaliar OWASP ASVS, CIS Benchmarks e ISO 27001.
- [ ] Revisar juridicamente termos, privacidade e acessibilidade.

## P2 — Arquitetura e manutenção

- [ ] Fixar versões críticas e imagens por digest.
- [x] Atualizar o frontend e o CI para Node 22.
- [ ] Separar dependências de desenvolvimento da imagem backend.
- [ ] Reduzir o tamanho e a superfície de ataque das imagens.
- [ ] Versionar formalmente a API e definir compatibilidade.
- [ ] Gerar e validar automaticamente o cliente frontend via OpenAPI.
- [ ] Implementar feature flags para liberações graduais.
- [ ] Registrar decisões importantes em ADRs.
- [ ] Documentar domínio, integrações, deploy, recuperação e operação.
- [ ] Controlar débitos técnicos com responsáveis e prazos.

## P3 — Diferenciais de excelência

- [ ] Implementar busca semântica com qualidade e explicabilidade.
- [ ] Adicionar revisão humana, confiança e versionamento ao OCR.
- [ ] Auxiliar extração de metadados, sempre com aprovação humana.
- [ ] Implementar deduplicação de documentos e autores.
- [ ] Exportar padrões arquivísticos e bibliográficos.
- [ ] Disponibilizar APIs públicas com chaves, quotas e documentação.
- [ ] Adotar links persistentes e estratégia de preservação digital.
- [ ] Verificar checksums periodicamente para detectar corrupção.
- [ ] Versionar objetos e metadados.
- [ ] Criar painéis de qualidade e completude do acervo.
- [ ] Analisar buscas sem resultados para orientar catalogação.
- [ ] Criar modo de manutenção e comunicação de incidentes.

## Critérios para atingir aproximadamente 9/10

- [ ] Todo o P0 concluído.
- [ ] Testes E2E, acessibilidade e carga integrados ao CI.
- [ ] SLOs, alertas e observabilidade em operação.
- [ ] Backup externo com restauração comprovada.
- [ ] Deploy seguro com rollback.
- [ ] Storage privado com URLs assinadas.
- [ ] Experiências de upload e busca refinadas.
- [ ] Governança LGPD e revisão periódica de acessos.

## Sequência sugerida

1. Segurança de contas, credenciais e uploads.
2. Testes E2E, acessibilidade e quality gates.
3. Observabilidade, SLOs e recuperação de desastre.
4. Performance, filas e storage privado.
5. UX de busca, upload e documentos.
6. Governança, preservação digital e diferenciais.

Estimativa inicial para uma equipe pequena: **4 a 8 meses de evolução consistente**, sujeita ao escopo, à infraestrutura e à disponibilidade da equipe.
