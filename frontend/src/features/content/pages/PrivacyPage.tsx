import { SEO } from '@/shared/components/SEO';
import { Breadcrumb } from '@/shared/components/Breadcrumb';
import { Section, SectionHeader } from '@/shared/components/Section';
import ptBR from '@/shared/i18n/pt-BR';

export function PrivacyPage() {
  return (
    <>
      <SEO title={ptBR.footer.privacy} />
      <main id="main-content">
        <Section ariaLabelledby="privacy-title">
          <Breadcrumb items={[{ label: ptBR.footer.privacy }]} className="mb-6" />
          <SectionHeader
            title={ptBR.footer.privacy}
            titleId="privacy-title"
            subtitle="Como tratamos suas informações"
            centered
          />

          <div className="prose prose-slate mx-auto max-w-3xl">
            <p>
              O Repositório Digital CAVN respeita sua privacidade e está comprometido com a proteção
              dos dados pessoais dos usuários.
            </p>
            <h3>Dados coletados</h3>
            <p>
              Para usuários administrativos, coletamos nome e e-mail necessários para autenticação e
              controle de acesso. Para visitantes, não coletamos dados pessoais, exceto informações
              técnicas de acesso (logs) utilizadas para melhoria do serviço.
            </p>
            <h3>Uso dos dados</h3>
            <p>
              Os dados são utilizados exclusivamente para fins de autenticação, auditoria, segurança
              e melhoria contínua da plataforma.
            </p>
            <h3>Segurança</h3>
            <p>
              Adotamos medidas técnicas e administrativas para proteger as informações contra
              acessos não autorizados, alterações ou divulgações indevidas.
            </p>
          </div>
        </Section>
      </main>
    </>
  );
}
