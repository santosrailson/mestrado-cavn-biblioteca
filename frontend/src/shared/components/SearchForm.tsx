import { Search } from 'lucide-react';
import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import ptBR from '@/shared/i18n/pt-BR';

interface SearchFormProps {
  className?: string;
  inputClassName?: string;
  onSubmit?: () => void;
}

export function SearchForm({ className = '', inputClassName = '', onSubmit }: SearchFormProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/busca?q=${encodeURIComponent(searchTerm.trim())}`);
      onSubmit?.();
    }
  };

  return (
    <form onSubmit={handleSearch} className={className} role="search">
      <label htmlFor="search-input" className="sr-only">
        {ptBR.navigation.searchPlaceholder}
      </label>
      <div className="relative">
        <input
          id="search-input"
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={ptBR.navigation.searchPlaceholder}
          className={`input pr-10 ${inputClassName}`}
        />
        <button
          type="submit"
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-text-muted hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          aria-label={ptBR.common.search}
        >
          <Search className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
