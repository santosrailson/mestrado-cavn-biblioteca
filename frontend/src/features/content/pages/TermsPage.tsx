import { SEO } from '@/shared/components/SEO';
import { Breadcrumb } from '@/shared/components/Breadcrumb';
import { Section, SectionHeader } from '@/shared/components/Section';
import ptBR from '@/shared/i18n/pt-BR';

export function TermsPage() {
  return (
    <>
      <SEO title={ptBR.footer.terms} />
      <main id="main-content">
        <Section ariaLabelledby="terms-title">
          <Breadcrumb items={[{ label: ptBR.footer.terms }]} className="mb-6" />
          <SectionHeader
            title={ptBR.footer.terms}
            titleId="terms-title"
            subtitle="Condições de uso do repositório"
            centered
          />

          <div className="prose prose-slate mx-auto max-w-3xl">
            <p>
              Ao acessar e utilizar o Repositório Digital CAVN, você concorda com as condições
              descritas abaixo.
            </p>
            <h3>Uso do conteúdo</h3>
            <p>
              Os materiais disponibilizados são de uso educacional, cultural e de pesquisa. É
              permitido consultar, compartilhar links e citar o conteúdo, desde que seja dado o
              devido crédito ao CAVN/UFPB.
            </p>
            <h3>Responsabilidades</h3>
            <p>
              O CAVN/UFPB se esforça para manter as informações atualizadas e corretas, mas não se
              responsabiliza por eventuais erros ou omissões nos documentos de origem histórica.
            </p>
            <h3>Alterações</h3>
            <p>
              Estes termos podem ser atualizados periodicamente. Recomendamos que você os consulte
              sempre que utilizar o repositório.
            </p>
          </div>
        </Section>
      </main>
    </>
  );
}
