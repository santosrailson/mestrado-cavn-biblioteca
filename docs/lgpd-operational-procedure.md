# Procedimento operacional de privacidade

## Escopo

Este procedimento descreve o fluxo técnico interno para registrar, acompanhar,
resolver e auditar solicitações de titulares. Ele não substitui a validação da
base legal, dos prazos jurídicos ou da identidade do controlador pelo jurídico e
responsável institucional.

## Papéis configuráveis

- Controlador: instituição responsável pelo acervo e pelas decisões de tratamento.
- Responsável/DPO: configurado por `PRIVACY_DPO_NAME` e `PRIVACY_DPO_EMAIL`.
- Administrador: recebe e resolve solicitações no painel administrativo.
- Titular: registra e acompanha suas próprias solicitações no centro de privacidade.

## Fluxo interno

1. O titular autentica-se, registra o tipo e descreve a solicitação.
2. O sistema cria o registro, atribui `prazo_em` conforme `PRIVACY_REQUEST_SLA_DAYS`
   e registra a ação na trilha de auditoria.
3. O administrador define responsável, base legal aplicável, decisão e resposta.
4. Conclusão ou rejeição grava responsável, data, motivo e resposta.
5. `python manage.py privacy_sla_report --json` gera a fila de acompanhamento.

## Evidências e controles

- ID imutável da solicitação e timestamps de criação/atualização.
- Registro de auditoria para criação, exportação e atualização.
- Exportação do titular sem senha ou hashes de senha.
- Separação entre consulta do titular e resolução administrativa.
- Registro de prazo e responsável para acompanhamento operacional.

## Pendências externas

Jurídico/DPO devem aprovar os textos públicos, bases legais, prazos definitivos,
critérios de exceção, canal de contato e política de retenção antes de declarar
conformidade jurídica.
