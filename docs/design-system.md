# Design system — CAVN Digital

Este documento descreve os tokens e padrões visuais usados pelo frontend. Novos componentes devem preferir os tokens abaixo e os componentes compartilhados em `frontend/src/shared/components`.

## Princípios

- Clareza antes de ornamentação: cada tela informa o que está acontecendo e qual é o próximo passo.
- Acessibilidade por padrão: foco visível, navegação por teclado, semântica HTML e mensagens anunciadas por tecnologias assistivas.
- Progressão segura: ações que alteram dados exibem estado de carregamento, sucesso e recuperação de erro.
- Responsividade: o conteúdo continua utilizável em telas pequenas, com reflow até 320px e sem depender apenas de cor.

## Tokens

Os tokens vivem em `frontend/src/shared/styles/globals.css` como variáveis `--color-*`, `--space-*`, `--radius-*` e `--shadow-*`. Use classes compartilhadas (`btn-*`, `input`, `card`, `container-page`, `section`) antes de criar estilos locais.

- Cores: `bg` para a tela, `surface` para cartões, `text`/`text-muted` para conteúdo, `primary` para ações, `success`, `warning`, `danger` para estados.
- Espaçamento: escala de 4px (`--space-1` até `--space-12`), com `--space-5` para 20px; use os utilitários Tailwind correspondentes sempre que possível.
- Tipografia: Inter para interface e Merriweather para conteúdo editorial; a escala usa `--font-size-sm` até `--font-size-3xl`, com line-height `--line-height-tight`/`--line-height-normal`.
- Movimento: use `--motion-fast`, `--motion-normal` e `--motion-slow`; respeite sempre `prefers-reduced-motion`.
- Camadas: `--z-header`, `--z-overlay` e `--z-toast` evitam z-index arbitrário.
- Foco: todo controle interativo deve manter o anel `focus-visible` amarelo de alto contraste.

## Estados obrigatórios

Componentes que carregam dados devem expor `Loading`/`Skeleton`; falhas devem usar `ErrorMessage` com ação de retry; listas vazias devem usar `EmptyState`; mutações devem confirmar sucesso com toast e bloquear o botão enquanto pendentes.

## Acessibilidade e conteúdo

- Todo campo tem `label`, `aria-invalid` e mensagem associada quando necessário.
- Imagens informativas têm texto alternativo; imagens decorativas usam `aria-hidden`.
- Gráficos incluem resumo textual e tabela acessível quando os dados forem relevantes para decisão.
- Textos de interface ficam em `frontend/src/shared/i18n`; não adicionar novos textos fixos em componentes sem necessidade.

## Componentes obrigatórios

Use `FeedbackState` para estados de dados, `ProgressBar` para operações demoradas e `AccessibleDataTable` para gráficos. Toda mutação deve manter a ação disponível para retry sem perder os dados do formulário.

## Checklist de revisão

- [ ] Funciona por teclado e em viewport estreita.
- [ ] Contraste mínimo AA e foco visível.
- [ ] Loading, erro, vazio e sucesso cobertos.
- [ ] Mensagens em português e sem depender só de cor.
- [ ] Teste unitário ou E2E atualizado para o fluxo principal.
