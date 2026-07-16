# Validação interna de acessibilidade

## Escopo

Este documento registra a evidência reproduzível mantida no repositório para a
implementação técnica de acessibilidade. Ele não é uma declaração jurídica de
conformidade WCAG: testes com leitores de tela e pessoas usuárias continuam
dependendo de execução humana externa.

## Evidências automatizadas

- `frontend/e2e/accessibility.spec.ts` executa Axe com as tags WCAG 2.0/2.1/2.2
  AA em início, busca e páginas legais; o gate falha para qualquer violação.
- `frontend/e2e/accessibility-manual.spec.ts` verifica skip link, foco inicial,
  contraste alto e redução de movimento.
- `frontend/e2e/ux-journeys.spec.ts` cobre busca e controles da barra de
  acessibilidade com teclado.
- `frontend/e2e/visual-regression.spec.ts` mantém snapshots de início e busca.

Execução:

```bash
cd frontend
CI=1 npm run test:e2e
```

Última evidência local em 15/07/2026: 36 testes E2E aprovados, incluindo 5
cenários Axe nas páginas críticas, 2 verificações reproduzíveis de teclado/
preferências, jornadas públicas/admin, busca e 2 snapshots visuais. A suíte
unitária do frontend também ficou em 59/59, com build e lint aprovados.

## Checklist manual pendente

- [ ] NVDA + Firefox/Chrome: navegação por landmarks, headings, formulários,
  modais, mensagens dinâmicas e upload.
- [ ] VoiceOver + Safari: os mesmos fluxos em macOS/iOS.
- [ ] Somente teclado: todos os fluxos de login, 2FA, busca, documento,
  administração, privacidade e logout.
- [ ] Contraste e zoom de 200% em viewport móvel e desktop.
- [ ] Pessoas com diferentes deficiências usando as tarefas reais e registro de
  barreiras, severidade, evidência e correção.

Os itens acima não são marcados como concluídos porque exigem participantes,
dispositivos ou serviços externos.
