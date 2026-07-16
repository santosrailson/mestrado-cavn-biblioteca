# Roadmap de excelência da plataforma

Este documento consolida as melhorias recomendadas para elevar o CAVN Digital do nível profissional atual para o patamar das melhores plataformas do mercado.

## Meta

Alcançar aproximadamente **9/10** em arquitetura, segurança, confiabilidade, desempenho, experiência, governança e operação.

## Estado da entrega de 15/07/2026

Esta rodada concluiu a parte técnica verificável no repositório: autenticação
privilegiada com 2FA, revogação de sessões, entrega privada de arquivos,
hook de antivírus, fluxo operacional de privacidade, health checks, métricas,
SLOs, contratos, testes de carga/recuperação, acessibilidade automatizada,
regressão visual e i18n `pt-BR`/`en-US`. Atividades que exigem participantes,
dispositivos, fornecedores, infraestrutura externa, auditor independente ou
aprovação jurídica permanecem explicitamente abertas.

## P0 — Segurança e riscos imediatos

- [ ] Revogar o token GitHub exposto na URL do remoto e migrar para SSH ou credential helper.
- [x] Tornar 2FA obrigatório para administradores, curadores e catalogadores em produção, incluindo bloqueio do Admin.
- [x] Criar enrollment seguro de 2FA, códigos de recuperação de uso único e reset/rotação auditados.
- [x] Servir documentos por endpoint privado autorizado e `X-Accel-Redirect` interno.
- [ ] Adotar storage privado S3/MinIO com URLs temporárias assinadas (infraestrutura externa).
- [x] Implementar hook de antivírus fail-closed quando configurado como obrigatório.
- [ ] Provisionar daemon de antivírus isolado e seu processamento externo.
- [x] Manter `pip-audit` e `npm audit` no CI.
- [ ] Adicionar Trivy, secret scanning e políticas de imagem ao CI.
- [ ] Gerar SBOM e assinar imagens Docker.
- [x] Remover `unsafe-inline` de `script-src` e proteger mídia privada no Nginx.
- [ ] Eliminar `unsafe-inline` também de `style-src` (refatoração de estilos/fontes).
- [ ] Realizar pentest independente e corrigir achados críticos e altos.
- [ ] Formalizar política de atualização e resposta a vulnerabilidades.

## P1 — Confiabilidade operacional

- [x] Definir SLOs, como 99,9% de disponibilidade e p95 da API abaixo de 300 ms.
- [x] Documentar regras de alerta para indisponibilidade, latência, erros, disco, filas, backups e solicitações LGPD.
- [ ] Conectar alertas a coletor, painel e notificações externos.
- [ ] Centralizar logs, métricas e tracing distribuído.
- [x] Separar liveness, readiness e verificação de dependências.
- [ ] Automatizar backups criptografados e externos.
- [x] Criar drill local que valida descriptografia e integridade de arquivos de backup.
- [ ] Executar testes periódicos de restauração completa em infraestrutura real.
- [x] Documentar RPO alvo e procedimento de disaster recovery; RTO permanece a confirmar em exercício real.
- [x] Executar migrações em job único de deploy, fora do startup normal.
- [ ] Implementar deploy rolling ou blue-green com rollback automático.
- [x] Criar runbooks/procedimentos de segurança, privacidade, observabilidade e restauração.

## P1 — Qualidade e testes

- [x] Criar testes E2E para as jornadas públicas, busca, login administrativo, navegação e estados de erro; 2FA/upload real permanecem dependentes de serviços.
- [x] Integrar Playwright ao CI.
- [x] Integrar Axe para acessibilidade automatizada WCAG 2.2 AA nas páginas críticas.
- [x] Testar skip link, foco, teclado, contraste alto e movimento reduzido automaticamente.
- [ ] Testar leitores de tela e todos os fluxos manualmente.
- [x] Criar testes de contrato entre frontend e API via OpenAPI.
- [x] Testar idempotência e lock de concorrência; execução PostgreSQL fica coberta no CI.
- [ ] Criar testes integrados com PostgreSQL, Redis, Celery e storage.
- [x] Elevar a cobertura de autenticação, permissões e serviços nesta rodada (78% na suíte local).
- [x] Adicionar testes de regressão visual para home e busca.
- [x] Bloquear a qualidade básica no CI com lint, migrações, checks, contrato, testes e build.

## P1 — Performance e escala

- [ ] Medir LCP, CLS e INP de usuários reais.
- [ ] Definir budgets para JavaScript, CSS, imagens e fontes.
- [x] Disponibilizar smoke test de carga seguro, somente leitura, sem depender de aplicação externa.
- [x] Medir p50 e p95 por rota no endpoint interno de métricas.
- [ ] Executar carga representativa em ambiente de produção/homologação autorizado.
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
- [ ] Validar integralmente WCAG 2.2 AA em contraste, foco, interação, leitores de tela e todos os fluxos.
- [ ] Realizar testes de usabilidade com usuários reais.
- [x] Medir sucesso, abandono e tempo de conclusão das tarefas.
- [x] Completar a internacionalização técnica `pt-BR`/`en-US`, incluindo textos antigos de telas públicas e administrativas.
- [ ] Fazer revisão linguística formal com evidência editorial.

## P2 — Governança e privacidade

- [x] Inventariar e classificar os dados tratados.
- [x] Definir retenção, descarte e anonimização.
- [x] Implementar consentimento e governança de analytics.
- [x] Formalizar o processo técnico de atendimento aos direitos previstos na LGPD, com responsável configurável, SLA, bases legais, decisões, auditoria e relatório de pendências. (Aprovação institucional/jurídica pendente.)
- [x] Tornar a trilha de auditoria resistente a adulteração.
- [x] Definir segregação de funções para publicação e administração.
- [x] Revisar acessos e privilégios periodicamente.
- [x] Manter threat model atualizado.
- [x] Criar escopo e matriz interna de referência para OWASP ASVS, CIS Benchmarks e ISO 27001.
- [ ] Realizar avaliação independente/pentest e emitir evidências formais.
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
- [x] Documentar domínio, deploy, recuperação, observabilidade, privacidade e operação.
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

## Critérios ainda necessários para aproximadamente 9/10

- [ ] Concluir os itens P0 que dependem de credenciais, infraestrutura ou terceiros.
- [x] Manter testes E2E, acessibilidade automatizada, contratos, visual e quality gates no CI.
- [ ] Colocar SLOs, alertas e observabilidade centralizada em operação.
- [ ] Ter backup externo com restauração comprovada.
- [ ] Ter deploy seguro com rollback.
- [ ] Ter storage privado com URLs assinadas.
- [x] Manter as experiências técnicas de upload e busca refinadas.
- [ ] Obter aprovação institucional/jurídica da governança LGPD.

## Sequência sugerida

1. Segurança de contas, credenciais e uploads.
2. Testes E2E, acessibilidade e quality gates.
3. Observabilidade, SLOs e recuperação de desastre.
4. Performance, filas e storage privado.
5. UX de busca, upload e documentos.
6. Governança, preservação digital e diferenciais.

Estimativa inicial para uma equipe pequena: **4 a 8 meses de evolução consistente**, sujeita ao escopo, à infraestrutura e à disponibilidade da equipe.
