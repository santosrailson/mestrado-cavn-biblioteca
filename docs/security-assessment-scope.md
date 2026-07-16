# Avaliação de segurança e conformidade — escopo interno

## Controles técnicos verificados no repositório

- autenticação privilegiada com 2FA obrigatório em produção;
- tokens com versão de sessão e revogação imediata em logout, alteração de
  senha, ativação/desativação de 2FA e rotação de códigos;
- códigos de recuperação armazenados somente como hash e consumidos uma vez;
- uploads com validação de extensão/MIME, limites de arquivo, checksum e hook
  de antivírus fail-closed quando configurado como obrigatório;
- documentos servidos por endpoint autorizado e `X-Accel-Redirect` interno;
- CSP sem `unsafe-inline` em `script-src`, headers de segurança e Nginx;
- rate limit em autenticação e endpoints sensíveis;
- auditoria, health checks, métricas protegidas, contratos OpenAPI e CI com
  auditoria de dependências.

Evidência local em 15/07/2026: suíte backend com 164 testes aprovados e 1 teste
PostgreSQL condicionado ao ambiente; `makemigrations --check`, checks de
deploy, validação OpenAPI, `ruff`, `pip-audit`/`npm audit` configurados no CI e
build/testes do frontend aprovados. Isso demonstra controles e regressão
automatizada, não substitui pentest ou certificação.

## Matriz de referência

Use os requisitos versionados do [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/),
os controles aplicáveis do [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks)
e o sistema de gestão da [ISO/IEC 27001](https://www.iso.org/isoiec-27001-information-security.html)
como referências de avaliação. O repositório não declara certificação ou
conformidade automática por possuir esta matriz.

## Pendências que não serão simuladas internamente

- pentest independente e reteste dos achados;
- avaliação formal por terceiro contra ASVS, CIS e ISO 27001;
- revisão jurídica dos termos, privacidade e acessibilidade;
- validação de DPO/controlador e aprovação de bases legais;
- provisionamento de ClamAV, storage externo, SIEM, APM e notificações.

Esses itens exigem autoridade, contratos, pessoas ou infraestrutura externa e
ficam explicitamente fora desta rodada.
