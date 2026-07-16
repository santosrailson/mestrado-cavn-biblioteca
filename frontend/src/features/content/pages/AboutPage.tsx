import { useQuery } from '@tanstack/react-query';
import api from '@/shared/lib/api';
import { SEO } from '@/shared/components/SEO';
import { Breadcrumb } from '@/shared/components/Breadcrumb';
import { Section, SectionHeader } from '@/shared/components/Section';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { useLocale } from '@/shared/i18n';

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

export function AboutPage() {
  const { t } = useLocale();
  const defaultParagraphs = t.about.paragraphs;
  const {
    data: subtitle,
    isLoading: subtitleLoading,
    error: subtitleError,
    refetch: refetchSubtitle,
  } = useConfig('sobre_subtitulo', t.about.subtitle);
  const {
    data: conteudo,
    isLoading: conteudoLoading,
    error: conteudoError,
    refetch: refetchConteudo,
  } = useConfig('sobre_conteudo', defaultParagraphs.join('\n\n'));

  const hasError = subtitleError || conteudoError;

  const paragraphs = conteudo ? conteudo.split(/\n\n+/).filter(Boolean) : defaultParagraphs;

  return (
    <>
      <SEO title={t.footer.about} />
      <main id="main-content">
        <Section ariaLabelledby="about-title">
          <Breadcrumb items={[{ label: t.footer.about }]} className="mb-6" />
          <SectionHeader
            title={t.footer.about}
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
