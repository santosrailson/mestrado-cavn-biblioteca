import { SEO } from '@/shared/components/SEO';
import { Breadcrumb } from '@/shared/components/Breadcrumb';
import { Section, SectionHeader } from '@/shared/components/Section';
import { useLocale } from '@/shared/i18n';

export function TermsPage() {
  const { t } = useLocale();
  const legal = t.legal;
  return (
    <>
      <SEO title={legal.termsTitle} />
      <main id="main-content">
        <Section ariaLabelledby="terms-title">
          <Breadcrumb items={[{ label: legal.termsTitle }]} className="mb-6" />
          <SectionHeader
            title={legal.termsTitle}
            titleId="terms-title"
            subtitle={legal.termsSubtitle}
            centered
          />

          <div className="prose prose-slate mx-auto max-w-3xl">
            <p>{legal.termsIntro}</p>
            <h3>{legal.termsContentTitle}</h3>
            <p>{legal.termsContent}</p>
            <h3>{legal.termsResponsibilityTitle}</h3>
            <p>{legal.termsResponsibility}</p>
            <h3>{legal.termsChangesTitle}</h3>
            <p>{legal.termsChanges}</p>
          </div>
        </Section>
      </main>
    </>
  );
}
