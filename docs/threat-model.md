# Threat model — CAVN Digital

Revisar a cada trimestre e após mudanças em autenticação, uploads, storage ou exposição pública.

| Ativo | Ameaça | Impacto | Mitigação atual | Evidência/pendência |
|---|---|---|---|---|
| Contas privilegiadas | roubo de credencial/2FA ausente | alto | JWT httpOnly, lockout, rate limit | tornar 2FA obrigatório |
| Arquivos originais | upload malicioso ou acesso indevido | crítico | validação MIME, processamento assíncrono, auth de mídia | antivírus isolado e storage privado |
| API | IDOR, abuso e enumeração | alto | RBAC, permissões por objeto, throttling | pentest e revisão ASVS |
| Auditoria | adulteração ou exclusão | alto | cadeia SHA-256, sem update/delete | backup append-only externo |
| Analytics | coleta excessiva | médio | consentimento, payload primitivo e sem conteúdo | revisão periódica do inventário |
| Disponibilidade | falha de banco, fila ou disco | alto | healthcheck, backups e Sentry | SLO, alertas e restore drill |

## Fluxo de revisão

1. Identificar ativo, ator, entrada e trust boundary.
2. Atualizar o cenário nesta tabela e o controle correspondente.
3. Criar teste automatizado ou evidência operacional.
4. Registrar risco residual, responsável e prazo.
