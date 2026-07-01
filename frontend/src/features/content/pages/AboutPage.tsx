import { useQuery } from '@tanstack/react-query';
import api from '@/shared/lib/api';
import { SEO } from '@/shared/components/SEO';
import { Breadcrumb } from '@/shared/components/Breadcrumb';
import { Section, SectionHeader } from '@/shared/components/Section';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import ptBR from '@/shared/i18n/pt-BR';

interface Configuracao {
  chave: string;
  valor: string;
}

function useConfig(chave: string, fallback: string) {
  return useQuery({
    queryKey: ['config', chave],
    queryFn: async () => {
      const response = await api.get<Configuracao>(`/config/${chave}/`);
      return response.data.valor ?? fallback;
    },
    staleTime: 10 * 60 * 1000,
    placeholderData: fallback,
  });
}

const DEFAULT_PARAGRAPHS = [
  'O Repositório Digital do Colégio Agrícola Vidal de Negreiros (CAVN/UFPB) foi criado para preservar e disponibilizar a memória histórica, fotográfica e documental da instituição.',
  'Aqui você encontra documentos textuais, fotografias históricas, atas, relatórios, correspondências, produção acadêmica e outros materiais que registram a trajetória do CAVN ao longo das décadas.',
  'O acervo é organizado por categorias e pode ser explorado por meio da busca, da linha do tempo ou da galeria de imagens. Todo o conteúdo é disponibilizado com fins educacionais, culturais e de preservação da memória institucional.',
];

export function AboutPage() {
  const {
    data: subtitle,
    isLoading: subtitleLoading,
    error: subtitleError,
    refetch: refetchSubtitle,
  } = useConfig('sobre_subtitulo', 'Conheça o Repositório Digital do CAVN/UFPB');
  const {
    data: conteudo,
    isLoading: conteudoLoading,
    error: conteudoError,
    refetch: refetchConteudo,
  } = useConfig('sobre_conteudo', DEFAULT_PARAGRAPHS.join('\n\n'));

  const hasError = subtitleError || conteudoError;

  const paragraphs = conteudo
    ? conteudo.split(/\n\n+/).filter(Boolean)
    : DEFAULT_PARAGRAPHS;

  return (
    <>
      <SEO title={ptBR.footer.about} />
      <main id="main-content">
        <Section ariaLabelledby="about-title">
          <Breadcrumb items={[{ label: ptBR.footer.about }]} className="mb-6" />
          <SectionHeader
            title={ptBR.footer.about}
            titleId="about-title"
            subtitle={subtitleLoading ? '' : subtitle}
            centered
          />

          <div className="prose prose-slate mx-auto max-w-3xl">
            {conteudoLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-5/6" />
                <Skeleton className="h-5 w-full" />
              </div>
            ) : hasError ? (
              <ErrorMessage
                onRetry={() => {
                  if (subtitleError) refetchSubtitle();
                  if (conteudoError) refetchConteudo();
                }}
              />
            ) : (
              paragraphs.map((p, i) => <p key={i}>{p}</p>)
            )}
          </div>
        </Section>
      </main>
    </>
  );
}
