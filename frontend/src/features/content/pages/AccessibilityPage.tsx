import { SEO } from '@/shared/components/SEO';
import { Breadcrumb } from '@/shared/components/Breadcrumb';
import { Section, SectionHeader } from '@/shared/components/Section';
import { useLocale } from '@/shared/i18n';

export function AccessibilityPage() {
  const { t } = useLocale();
  const legal = t.legal;
  return (
    <>
      <SEO title={legal.accessibilityTitle} />
      <main id="main-content">
        <Section ariaLabelledby="accessibility-title">
          <Breadcrumb items={[{ label: legal.accessibilityTitle }]} className="mb-6" />
          <SectionHeader
            title={legal.accessibilityTitle}
            titleId="accessibility-title"
            subtitle={legal.accessibilitySubtitle}
            centered
          />

          <div className="prose prose-slate mx-auto max-w-3xl">
            <p>{legal.accessibilityIntro}</p>
            <h3>{legal.accessibilityResourcesTitle}</h3>
            <ul>
              {legal.accessibilityResources.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>{legal.accessibilityFeedback}</p>
            <p>
              <a href="mailto:cavn@ufpb.br">cavn@ufpb.br</a>
            </p>
          </div>
        </Section>
      </main>
    </>
  );
}
