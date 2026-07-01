import { Link } from 'react-router-dom';
import {
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Phone,
  ExternalLink,
  BookOpen,
  FileText,
  Image,
} from 'lucide-react';
import ptBR from '@/shared/i18n/pt-BR';

export function Footer() {
  const year = new Date().getFullYear();

  const institutionalLinks = [
    { label: ptBR.footer.about, to: '/sobre', icon: BookOpen },
    { label: ptBR.navigation.timeline, to: '/linha-do-tempo', icon: null },
    { label: ptBR.navigation.gallery, to: '/galeria', icon: Image },
    { label: ptBR.navigation.academic, to: '/producao-academica', icon: FileText },
  ];

  const supportLinks = [
    { label: ptBR.footer.accessibility, to: '/acessibilidade' },
    { label: ptBR.footer.terms, to: '/termo-de-uso' },
    { label: ptBR.footer.privacy, to: '/politica-de-privacidade' },
  ];

  return (
    <footer
      className="mt-auto border-t border-border bg-surface py-12 text-text"
      role="contentinfo"
    >
      <div className="container-page grid gap-10 md:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div className="lg:col-span-1">
          <h2 className="mb-3 text-lg font-bold text-text">{ptBR.common.siteName}</h2>
          <p className="mb-5 text-sm leading-relaxed text-text-muted">{ptBR.home.heroSubtitle}</p>
          <address className="not-italic text-sm text-text-muted space-y-2">
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {ptBR.footer.address}
            </p>
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <a href={`mailto:${ptBR.footer.email}`} className="text-text-muted hover:text-text">
                {ptBR.footer.email}
              </a>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <a
                href={`tel:${ptBR.footer.phone.replace(/\D/g, '')}`}
                className="text-text-muted hover:text-text"
              >
                {ptBR.footer.phone}
              </a>
            </p>
          </address>
        </div>

        {/* Acervo */}
        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-text">
            {ptBR.footer.collectionTitle}
          </h3>
          <ul className="space-y-2.5 text-sm">
            {institutionalLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="inline-flex items-center gap-2 text-text-muted transition-colors hover:text-text"
                >
                  {link.icon && <link.icon className="h-4 w-4 text-primary" aria-hidden="true" />}
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Suporte */}
        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-text">
            {ptBR.footer.supportTitle}
          </h3>
          <ul className="space-y-2.5 text-sm">
            {supportLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-text-muted transition-colors hover:text-text">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Feedback & Social */}
        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-text">
            {ptBR.footer.contributeTitle}
          </h3>
          <p className="mb-4 text-sm leading-relaxed text-text-muted">
            {ptBR.footer.contributeText}
          </p>
          <a
            href={import.meta.env.VITE_FEEDBACK_FORM_URL || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mb-6 text-sm"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            {ptBR.footer.feedback}
          </a>
          <div className="flex gap-3">
            <a
              href="https://facebook.com/cavnufpb"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook CAVN"
              className="rounded-full bg-surface-alt p-2.5 text-text-muted transition-colors hover:bg-primary hover:text-primary-contrast"
            >
              <Facebook className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href="https://instagram.com/cavnufpb"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram CAVN"
              className="rounded-full bg-surface-alt p-2.5 text-text-muted transition-colors hover:bg-primary hover:text-primary-contrast"
            >
              <Instagram className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      <div className="container-page mt-10 border-t border-border pt-6 text-center text-xs text-text-muted">
        <p className="font-medium text-text">{ptBR.footer.institutional}</p>
        <p className="mt-1">{ptBR.footer.copyright.replace('{year}', String(year))}</p>
      </div>
    </footer>
  );
}
