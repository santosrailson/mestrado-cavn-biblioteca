# Inventário e classificação de dados

Documento operacional para revisão trimestral pelo responsável de privacidade e pelo administrador da plataforma. A classificação indica o tratamento mínimo esperado; a base legal e os prazos devem ser confirmados juridicamente antes de produção.

| Domínio | Dados | Classificação | Finalidade | Retenção proposta | Controle |
|---|---|---|---|---|---|
| Acervo | metadados, arquivos, OCR, thumbnails | Público/Institucional | preservação e consulta | conforme política arquivística | checksum, workflow e backup |
| Usuários | e-mail, nome, perfil, instituição, avatar | Pessoal restrito | autenticação e gestão de acesso | vigência + prazo legal | RBAC, 2FA, revisão periódica |
| Segurança | IP, user-agent, eventos de auditoria | Pessoal restrito/segurança | prevenção e investigação | definir com jurídico | acesso administrativo e cadeia de hash |
| Analytics | evento, rota, métricas, propriedades primitivas | Anônimo/telemetria | melhoria de UX e performance | 180 dias por padrão | consentimento + `retention_cleanup` |
| Suporte | mensagens enviadas pelo usuário | Pessoal restrito | atendimento | definir com jurídico | acesso mínimo e descarte controlado |

Regras: não enviar conteúdo de documentos para analytics; não usar e-mail/IP como identificador de produto; registrar qualquer novo campo neste inventário antes do deploy.
