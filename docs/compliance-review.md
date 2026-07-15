# Matriz de revisão de segurança, privacidade e conformidade

**Versão:** 1.0 — 15/07/2026
**Escopo:** CAVN Digital, aplicação web, API, containers, PostgreSQL, Redis, Nginx e processos de operação.

Este documento é uma avaliação técnica inicial. Não substitui certificação, pentest, auditoria independente ou parecer jurídico. Cada item precisa de evidência anexada, responsável e prazo.

## OWASP ASVS 4.0.3 — nível 2 como referência

| Área | Controle verificado | Evidência no repositório | Estado |
|---|---|---|---|
| V1 Arquitetura | Separação frontend/API e configuração por ambiente | `docker-compose.yml`, `config/settings.py` | Parcial |
| V2 Autenticação | JWT em cookies httpOnly, CSRF e rate limit | `apps/users/views.py`, testes de rate limit | Implementado; revisão independente pendente |
| V3 Sessão | Refresh token em cookie, blacklist e logout | `apps/users/views.py` | Implementado; validar expiração em produção |
| V4 Controle de acesso | RBAC e segregação de publicação | `apps/users/permissions.py`, `docs/access-review.md` | Implementado; teste de penetração pendente |
| V5 Validação | MIME, extensão, tamanho e ZIP | `apps/core/validators.py`, testes de upload | Implementado |
| V6 Criptografia | TLS, hashes de integridade e backups cifrados | `apps/audit/models.py`, `scripts/backup.sh` | Parcial; revisar chaves e gestão de segredos |
| V7 Erros e logs | request ID, logs estruturados e auditoria append-only | `apps/core/middleware.py`, `apps/audit` | Implementado; revisar PII nos logs |
| V8 Proteção de dados | Consentimento, retenção e solicitações LGPD | `PrivacyRequest`, `docs/data-inventory.md` | Implementado tecnicamente; validação jurídica pendente |
| V9 Comunicação | CORS, CSRF, CSP e headers de segurança | `config/settings.py`, Nginx | Parcial; remover `unsafe-inline` |
| V10 Malicious code | Dependências auditadas no CI | `.github/workflows/ci.yml` | Parcial; Trivy, secret scanning e SBOM pendentes |

## CIS Benchmarks

| Domínio | Verificação | Evidência necessária | Estado |
|---|---|---|---|
| Host Linux | SSH, atualizações, firewall, usuários e permissões | relatório do host e `sshd -T` | Pendente de execução no servidor |
| Docker | usuário não-root, capabilities, limites, imagens por digest | Dockerfiles e relatório Trivy | Parcial |
| PostgreSQL | autenticação, rede, TLS, backups e roles | configuração efetiva e restore drill | Pendente |
| Redis | bind privado, autenticação e isolamento de rede | compose e inspeção do container | Parcial |
| Nginx | TLS, headers, limites e logs | `nginx -T` e relatório de headers | Pendente de revisão independente |

## ISO 27001 — controles organizacionais mínimos

| Tema | Entregável | Responsável | Estado |
|---|---|---|---|
| Ativos e dados | inventário e classificação | responsável de privacidade | Inicial concluído |
| Riscos | matriz de riscos e plano de tratamento | gestão + segurança | Pendente de aprovação |
| Acessos | revisão trimestral e segregação de funções | administrador | Implementado tecnicamente |
| Incidentes | runbook, contatos, severidade e evidências | operação | Pendente |
| Continuidade | RPO/RTO, backup externo e teste de restauração | operação | Pendente |
| Fornecedores | avaliação de hosting, e-mail, storage e analytics | gestão/jurídico | Pendente |
| Auditoria | revisão periódica e evidência de mudanças | segurança | Parcial |

## Critério de encerramento

Um item só pode ser marcado como concluído quando houver: data, escopo, evidência reproduzível, responsável, achados, decisão de risco e aprovação do responsável institucional. O parecer jurídico e o pentest devem permanecer como anexos externos versionados.
