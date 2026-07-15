import { Search } from 'lucide-react';
import { useId, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '@/shared/i18n';

interface SearchFormProps {
  className?: string;
  inputClassName?: string;
  onSubmit?: () => void;
}

export function SearchForm({ className = '', inputClassName = '', onSubmit }: SearchFormProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { t } = useLocale();
  const generatedId = useId();
  const inputId = `search-input-${generatedId.replace(/:/g, '')}`;

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/busca?q=${encodeURIComponent(searchTerm.trim())}`);
      onSubmit?.();
    }
  };

  return (
    <form onSubmit={handleSearch} className={className} role="search">
      <label htmlFor={inputId} className="sr-only">
        {t.navigation.searchPlaceholder}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t.navigation.searchPlaceholder}
          className={`input pr-10 ${inputClassName}`}
        />
        <button
          type="submit"
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-text-muted hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          aria-label={t.common.search}
        >
          <Search className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
