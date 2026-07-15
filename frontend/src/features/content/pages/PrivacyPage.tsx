import { SEO } from '@/shared/components/SEO';
import { Breadcrumb } from '@/shared/components/Breadcrumb';
import { Section, SectionHeader } from '@/shared/components/Section';
import { Link } from 'react-router-dom';
import { useLocale } from '@/shared/i18n';

export function PrivacyPage() {
  const { t } = useLocale();
  const legal = t.legal;
  return (
    <>
      <SEO title={legal.privacyTitle} />
      <main id="main-content">
        <Section ariaLabelledby="privacy-title">
          <Breadcrumb items={[{ label: legal.privacyTitle }]} className="mb-6" />
          <SectionHeader
            title={legal.privacyTitle}
            titleId="privacy-title"
            subtitle={legal.privacySubtitle}
            centered
          />

          <div className="prose prose-slate mx-auto max-w-3xl">
            <p>{legal.privacyIntro}</p>
            <h3>{legal.privacyCollectedTitle}</h3>
            <p>{legal.privacyCollected}</p>
            <h3>{legal.privacyPurposeTitle}</h3>
            <p>{legal.privacyPurpose}</p>
            <h3>{legal.privacyRightsTitle}</h3>
            <p>{legal.privacyRights}</p>
            <p>
              <Link to="/admin/perfil">{legal.privacyCenterTitle}</Link>
            </p>
            <h3>{legal.privacySecurityTitle}</h3>
            <p>{legal.privacySecurity}</p>
            <h3>{legal.privacyContact}</h3>
            <p>
              <a href="mailto:cavn@ufpb.br">cavn@ufpb.br</a>
            </p>
          </div>
        </Section>
      </main>
    </>
  );
}
