import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { SEO } from '@/shared/components/SEO';
import { Button } from '@/shared/components/Button';
import { DocumentCard } from '@/shared/components/DocumentCard';
import { Pagination } from '@/shared/components/Pagination';
import { Breadcrumb } from '@/shared/components/Breadcrumb';
import { DateInput } from '@/shared/components/DateInput';
import { FeedbackState } from '@/shared/components/FeedbackState';
import { SkeletonGrid } from '@/shared/components/Skeleton';
import { useSearch } from '@/shared/hooks/useSearch';
import { useCategories } from '@/shared/hooks/useCategories';
import { useEditable } from '@/features/admin/hooks/useEditable';
import { lazy, Suspense } from 'react';
import { Loading } from '@/shared/components/Loading';
import { CreateButton } from '@/features/admin/components/CreateButton';
import { TipoDocumento } from '@/shared/types';
import { useRecentSearches } from '@/shared/hooks/useRecentSearches';
import { trackEvent } from '@/shared/lib/analytics';
import { useLocale } from '@/shared/i18n';

const DocumentFormModal = lazy(() =>
  import('@/features/admin/components/DocumentFormModal').then((m) => ({
    default: m.DocumentFormModal,
  }))
);

export function SearchPage() {
  const { t } = useLocale();
  const tiposDocumento: { value: TipoDocumento | ''; label: string }[] = [
    { value: '', label: t.search.documentTypeAll },
    ...t.admin.form.documentTypes.map((label, index) => ({
      value: [
        'ata',
        'relatorio',
        'correspondencia',
        'fotografia',
        'documento_administrativo',
        'producao_academica',
        'documento_pedagogico',
        'outro',
      ][index] as TipoDocumento,
      label,
    })),
  ];
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchStartedAt = useRef<number | null>(null);
  const lastReportedSearch = useRef<string>('');
  const {
    items: recentSearches,
    add: addRecentSearch,
    clear: clearRecentSearches,
  } = useRecentSearches();

  const q = searchParams.get('q') || '';
  const [inputQ, setInputQ] = useState(q);

  // Sincroniza o input controlado quando o parâmetro q muda via navegação SPA.
  useEffect(() => {
    setInputQ(q);
  }, [q]);
  const tipo = (searchParams.get('tipo') as TipoDocumento | '') || '';
  const categoria = searchParams.get('categoria') || '';
  const tag = searchParams.get('tag') || '';
  const dataInicio = searchParams.get('data_inicio') || '';
  const dataFim = searchParams.get('data_fim') || '';
  const ordenacao =
    (searchParams.get('ordenacao') as 'relevancia' | 'data' | 'titulo') || 'relevancia';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const {
    data: results,
    isLoading,
    error,
    refetch,
  } = useSearch({
    q,
    tipo,
    categoria,
    tag,
    dataInicio,
    dataFim,
    ordenacao,
    page,
    limit: 24,
  });

  const { data: categories } = useCategories();
  const { canEdit } = useEditable();
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState<string | undefined>();

  const suggestions = [...recentSearches, ...(categories || []).map((category) => category.nome)]
    .filter((value, index, values) => values.indexOf(value) === index)
    .filter((value) => !inputQ.trim() || value.toLowerCase().includes(inputQ.toLowerCase()))
    .slice(0, 6);

  useEffect(() => {
    if (isLoading || !results) return;
    const key = `${q}|${tipo}|${categoria}|${tag}|${dataInicio}|${dataFim}|${page}`;
    if (lastReportedSearch.current === key) return;
    lastReportedSearch.current = key;
    const duration =
      searchStartedAt.current === null
        ? undefined
        : Math.round(performance.now() - searchStartedAt.current);
    trackEvent(results.total === 0 ? 'search_no_results' : 'search_completed', {
      result_count: results.total,
      duration_ms: duration,
    });
  }, [isLoading, results, q, tipo, categoria, tag, dataInicio, dataFim, page]);

  const openDocumentCreate = () => {
    setEditingDocumentId(undefined);
    setDocumentModalOpen(true);
  };

  const openDocumentEdit = (id: string) => {
    setEditingDocumentId(id);
    setDocumentModalOpen(true);
  };

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams({ q });
    trackEvent('search_filters_cleared');
  };

  const hasFilters = tipo || categoria || tag || dataInicio || dataFim;

  return (
    <>
      <SEO title={t.search.title} />
      <main id="main-content" className="container-page py-6">
        <Breadcrumb items={[{ label: t.navigation.collection }]} />

        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="section-title">{t.search.title}</h1>
            {canEdit && <CreateButton onClick={openDocumentCreate} label={t.home.documentCreate} />}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addRecentSearch(inputQ);
              searchStartedAt.current = performance.now();
              trackEvent('search_submitted', {
                has_query: Boolean(inputQ.trim()),
                query_length: inputQ.trim().length,
              });
              updateParam('q', inputQ);
            }}
            className="flex gap-2"
            role="search"
          >
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted"
                aria-hidden="true"
              />
              <input
                name="q"
                type="search"
                value={inputQ}
                onChange={(e) => setInputQ(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => window.setTimeout(() => setShowSuggestions(false), 120)}
                placeholder={t.navigation.searchPlaceholder}
                className="input pl-10"
                aria-label={t.navigation.searchPlaceholder}
                aria-autocomplete="list"
                aria-controls={
                  showSuggestions && inputQ.trim() && suggestions.length > 0
                    ? 'search-suggestions'
                    : undefined
                }
                autoComplete="off"
              />
              {showSuggestions && inputQ.trim() && suggestions.length > 0 && (
                <ul
                  id="search-suggestions"
                  className="absolute inset-x-0 top-full z-20 mt-1 rounded-lg border border-border bg-bg p-1 shadow-md"
                  role="listbox"
                  aria-label={t.search.suggestions}
                >
                  {suggestions.map((suggestion) => (
                    <li key={suggestion} role="option" aria-selected="false">
                      <button
                        type="button"
                        className="w-full rounded px-3 py-2 text-left text-sm text-text hover:bg-surface-alt"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setInputQ(suggestion);
                          updateParam('q', suggestion);
                          setShowSuggestions(false);
                        }}
                      >
                        {suggestion}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              {t.common.search}
            </Button>
          </form>
          {recentSearches.length > 0 && (
            <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
              <span>{t.search.recentSearches}:</span>
              {recentSearches.slice(0, 3).map((item) => (
                <button
                  key={item}
                  type="button"
                  className="rounded-full border border-border px-2 py-1 hover:bg-surface-alt"
                  onClick={() => {
                    setInputQ(item);
                    updateParam('q', item);
                  }}
                >
                  {item}
                </button>
              ))}
              <button type="button" className="underline" onClick={clearRecentSearches}>
                {t.search.clearHistory}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="lg:w-64" aria-label={t.search.filters}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`mb-4 w-full lg:hidden ${mobileFiltersOpen ? 'bg-primary/10 text-primary' : ''}`}
              onClick={() => setMobileFiltersOpen((prev) => !prev)}
              aria-expanded={mobileFiltersOpen}
              aria-controls="filter-panel"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              {t.search.filters}
            </Button>

            <div
              id="filter-panel"
              className={`space-y-6 ${mobileFiltersOpen ? 'block' : 'hidden lg:block'}`}
            >
              <div className="card">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold">{t.search.filters}</h2>
                  {hasFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="flex items-center gap-1 text-xs text-danger no-underline"
                      aria-label={t.search.clearFilters}
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                      {t.search.clearFilters}
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="filter-type" className="label">
                      {t.search.type}
                    </label>
                    <select
                      id="filter-type"
                      value={tipo}
                      onChange={(e) => updateParam('tipo', e.target.value)}
                      className="input"
                    >
                      {tiposDocumento.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="filter-category" className="label">
                      {t.search.category}
                    </label>
                    <select
                      id="filter-category"
                      value={categoria}
                      onChange={(e) => updateParam('categoria', e.target.value)}
                      className="input"
                    >
                      <option value="">{t.search.allCategories}</option>
                      {categories?.map((cat) => (
                        <option key={cat.id} value={cat.slug}>
                          {cat.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="filter-tag" className="label">
                      {t.search.tags}
                    </label>
                    <input
                      id="filter-tag"
                      type="text"
                      value={tag}
                      onChange={(e) => updateParam('tag', e.target.value)}
                      placeholder={t.search.tagPlaceholder}
                      className="input"
                    />
                  </div>

                  <div>
                    <span className="label">{t.search.period}</span>
                    <div className="grid grid-cols-2 gap-2">
                      <DateInput
                        id="filter-from"
                        aria-label={t.search.from}
                        value={dataInicio}
                        onChange={(e) => updateParam('data_inicio', e.target.value)}
                      />
                      <DateInput
                        id="filter-to"
                        aria-label={t.search.to}
                        value={dataFim}
                        onChange={(e) => updateParam('data_fim', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="filter-sort" className="label">
                      {t.search.sortBy}
                    </label>
                    <select
                      id="filter-sort"
                      value={ordenacao}
                      onChange={(e) => updateParam('ordenacao', e.target.value)}
                      className="input"
                    >
                      <option value="relevancia">{t.search.relevance}</option>
                      <option value="data">{t.search.date}</option>
                      <option value="titulo">{t.search.sortTitle}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="flex-1" aria-live="polite" aria-busy={isLoading}>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-[var(--color-text-muted)]">
                {results
                  ? t.search.resultsCount.replace('{count}', String(results.total))
                  : t.common.loading}
              </p>
            </div>

            {isLoading && <SkeletonGrid count={9} columns={3} />}
            {error && <FeedbackState state="error" onRetry={refetch} />}

            {results && results.dados.length === 0 && !isLoading && (
              <FeedbackState
                state="empty"
                title={t.search.noResults}
                message={t.search.noResultsDescription}
                action={
                  hasFilters ? (
                    <button type="button" onClick={clearFilters} className="btn-secondary">
                      <X className="h-4 w-4" aria-hidden="true" />
                      {t.search.clearFiltersAction}
                    </button>
                  ) : undefined
                }
              />
            )}

            {results && results.dados.length > 0 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {results.dados.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      documento={doc}
                      highlight={q}
                      editTo={canEdit ? doc.slug : undefined}
                      onEdit={openDocumentEdit}
                    />
                  ))}
                </div>
                <Pagination
                  page={page}
                  totalPages={results.totalPaginas}
                  onChange={(p) => updateParam('page', String(p))}
                />
              </>
            )}
          </section>
        </div>
      </main>

      <Suspense fallback={<Loading />}>
        <DocumentFormModal
          isOpen={documentModalOpen}
          onClose={() => setDocumentModalOpen(false)}
          documentId={editingDocumentId}
        />
      </Suspense>
    </>
  );
}
