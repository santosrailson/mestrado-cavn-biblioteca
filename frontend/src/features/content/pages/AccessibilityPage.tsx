import { SEO } from '@/shared/components/SEO';
import { Breadcrumb } from '@/shared/components/Breadcrumb';
import { Section, SectionHeader } from '@/shared/components/Section';
import ptBR from '@/shared/i18n/pt-BR';

export function AccessibilityPage() {
  return (
    <>
      <SEO title={ptBR.footer.accessibility} />
      <main id="main-content">
        <Section ariaLabelledby="accessibility-title">
          <Breadcrumb items={[{ label: ptBR.footer.accessibility }]} className="mb-6" />
          <SectionHeader
            title={ptBR.footer.accessibility}
            titleId="accessibility-title"
            subtitle="Compromisso com a acessibilidade digital"
            centered
          />

          <div className="prose prose-slate mx-auto max-w-3xl">
            <p>
              O Repositório Digital CAVN busca seguir as diretrizes de acessibilidade do WCAG 2.1
              nível AA, garantindo que o maior número possível de pessoas consiga navegar e utilizar
              o site.
            </p>
            <h3>Recursos disponíveis</h3>
            <ul>
              <li>Barra de acessibilidade com ajuste de tamanho de fonte.</li>
              <li>Modo de alto contraste para melhor leitura.</li>
              <li>Links de pular para o conteúdo principal.</li>
              <li>Navegação por teclado em todos os componentes interativos.</li>
              <li>Textos alternativos em imagens.</li>
              <li>Rótulos e instruções claras em formulários.</li>
            </ul>
            <p>
              Se encontrar dificuldades para acessar algum conteúdo, entre em contato conosco pelo
              e-mail <a href="mailto:cavn@ufpb.br">cavn@ufpb.br</a>.
            </p>
          </div>
        </Section>
      </main>
    </>
  );
}
