import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { SEO } from '@/shared/components/SEO';
import { Button } from '@/shared/components/Button';
import { DocumentCard } from '@/shared/components/DocumentCard';
import { Pagination } from '@/shared/components/Pagination';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { Breadcrumb } from '@/shared/components/Breadcrumb';
import { DateInput } from '@/shared/components/DateInput';
import { EmptyState } from '@/shared/components/EmptyState';
import { SkeletonGrid } from '@/shared/components/Skeleton';
import { useSearch } from '@/shared/hooks/useSearch';
import { useCategories } from '@/shared/hooks/useCategories';
import { useEditable } from '@/features/admin/hooks/useEditable';
import { lazy, Suspense } from 'react';
import { CreateButton } from '@/features/admin/components/CreateButton';
import { TipoDocumento } from '@/shared/types';
import ptBR from '@/shared/i18n/pt-BR';

const DocumentFormModal = lazy(() =>
  import('@/features/admin/components/DocumentFormModal').then((m) => ({ default: m.DocumentFormModal }))
);

const tiposDocumento: { value: TipoDocumento | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'ata', label: 'Ata' },
  { value: 'relatorio', label: 'Relatório' },
  { value: 'correspondencia', label: 'Correspondência' },
  { value: 'fotografia', label: 'Fotografia' },
  { value: 'documento_administrativo', label: 'Documento administrativo' },
  { value: 'producao_academica', label: 'Produção acadêmica' },
  { value: 'documento_pedagogico', label: 'Documento pedagógico' },
  { value: 'outro', label: 'Outro' },
];

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const q = searchParams.get('q') || '';
  const [inputQ, setInputQ] = useState(q);

  // Sincroniza o input controlado quando o parâmetro q muda via navegação SPA.
  useEffect(() => { setInputQ(q); }, [q]);
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
  };

  const hasFilters = tipo || categoria || tag || dataInicio || dataFim;

  return (
    <>
      <SEO title={ptBR.search.title} />
      <main id="main-content" className="container-page py-6">
        <Breadcrumb items={[{ label: ptBR.navigation.collection }]} />

        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="section-title">{ptBR.search.title}</h1>
            {canEdit && <CreateButton onClick={openDocumentCreate} label="Documento" />}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
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
                placeholder={ptBR.navigation.searchPlaceholder}
                className="input pl-10"
                aria-label={ptBR.navigation.searchPlaceholder}
              />
            </div>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              {ptBR.common.search}
            </Button>
          </form>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="lg:w-64" aria-label={ptBR.search.filters}>
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
              {ptBR.search.filters}
            </Button>

            <div
              id="filter-panel"
              className={`space-y-6 ${mobileFiltersOpen ? 'block' : 'hidden lg:block'}`}
            >
              <div className="card">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold">{ptBR.search.filters}</h2>
                  {hasFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="flex items-center gap-1 text-xs text-red-600 no-underline"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                      {ptBR.search.clearFilters}
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="filter-type" className="label">
                      {ptBR.search.type}
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
                      {ptBR.search.category}
                    </label>
                    <select
                      id="filter-category"
                      value={categoria}
                      onChange={(e) => updateParam('categoria', e.target.value)}
                      className="input"
                    >
                      <option value="">Todas as categorias</option>
                      {categories?.map((cat) => (
                        <option key={cat.id} value={cat.slug}>
                          {cat.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="filter-tag" className="label">
                      {ptBR.search.tags}
                    </label>
                    <input
                      id="filter-tag"
                      type="text"
                      value={tag}
                      onChange={(e) => updateParam('tag', e.target.value)}
                      placeholder="Ex: fundação"
                      className="input"
                    />
                  </div>

                  <div>
                    <span className="label">{ptBR.search.period}</span>
                    <div className="grid grid-cols-2 gap-2">
                      <DateInput
                        id="filter-from"
                        aria-label={ptBR.search.from}
                        value={dataInicio}
                        onChange={(e) => updateParam('data_inicio', e.target.value)}
                      />
                      <DateInput
                        id="filter-to"
                        aria-label={ptBR.search.to}
                        value={dataFim}
                        onChange={(e) => updateParam('data_fim', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="filter-sort" className="label">
                      {ptBR.search.sortBy}
                    </label>
                    <select
                      id="filter-sort"
                      value={ordenacao}
                      onChange={(e) => updateParam('ordenacao', e.target.value)}
                      className="input"
                    >
                      <option value="relevancia">{ptBR.search.relevance}</option>
                      <option value="data">{ptBR.search.date}</option>
                      <option value="titulo">{ptBR.search.title}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="flex-1" aria-live="polite" aria-busy={isLoading}>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-[var(--color-text-muted)]">
                {results ? `${results.total} resultados encontrados` : ptBR.common.loading}
              </p>
            </div>

            {isLoading && <SkeletonGrid count={9} columns={3} />}
            {error && <ErrorMessage onRetry={refetch} />}

            {results && results.dados.length === 0 && !isLoading && (
              <EmptyState
                title={ptBR.search.noResults}
                description="Tente remover alguns filtros ou usar termos diferentes na busca."
                action={
                  hasFilters ? (
                    <button type="button" onClick={clearFilters} className="btn-secondary">
                      <X className="h-4 w-4" aria-hidden="true" />
                      Limpar filtros
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

      <Suspense fallback={null}>
        <DocumentFormModal
          isOpen={documentModalOpen}
          onClose={() => setDocumentModalOpen(false)}
          documentId={editingDocumentId}
        />
      </Suspense>
    </>
  );
}
