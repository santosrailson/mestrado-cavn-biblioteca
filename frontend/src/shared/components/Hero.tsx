import { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ptBR from '@/shared/i18n/pt-BR';

interface HeroProps {
  title: string;
  subtitle: string;
  badge?: string;
  backgroundImage?: string;
  actions?: ReactNode;
  showSearch?: boolean;
}

export function Hero({
  title,
  subtitle,
  badge,
  backgroundImage,
  actions,
  showSearch = true,
}: HeroProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/busca?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <section
      className="relative flex min-h-[520px] items-center justify-center overflow-hidden px-4 py-20 text-center text-white sm:min-h-[580px]"
      aria-labelledby="hero-title"
    >
      {/* Background image */}
      {backgroundImage ? (
        <>
          <img
            src={backgroundImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-gradient-to-br from-brand-950/90 via-brand-900/85 to-brand-800/80"
            aria-hidden="true"
          />
        </>
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800"
          aria-hidden="true"
        />
      )}

      <div className="container-page relative z-10">
        {badge && (
          <span className="mb-4 inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
            {badge}
          </span>
        )}

        <h1
          id="hero-title"
          className="mx-auto max-w-4xl text-3xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl"
        >
          {title}
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-lg text-brand-100 sm:text-xl">{subtitle}</p>

        {showSearch && (
          <form
            onSubmit={handleSearch}
            className="mx-auto mt-8 flex w-full max-w-2xl flex-col gap-2 sm:flex-row"
            role="search"
          >
            <div className="relative flex-1">
              <Search
                className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={ptBR.home.searchPlaceholder || 'Buscar no acervo...'}
                className="input h-12 w-full pl-11 text-base"
                aria-label="Buscar no acervo"
              />
            </div>
            <button type="submit" className="btn-primary h-12 px-8">
              {ptBR.home.ctaSearch || 'Buscar'}
            </button>
          </form>
        )}

        {actions && (
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}
