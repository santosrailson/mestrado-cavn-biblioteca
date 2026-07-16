import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExternalLink, FileText, BookOpen } from 'lucide-react';
import { SEO } from '@/shared/components/SEO';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { Breadcrumb } from '@/shared/components/Breadcrumb';
import { Pagination } from '@/shared/components/Pagination';
import { Card } from '@/shared/components/Card';
import { EmptyState } from '@/shared/components/EmptyState';
import { SkeletonCard } from '@/shared/components/Skeleton';
import { Section, SectionHeader } from '@/shared/components/Section';
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/lib/api';
import { useEditable } from '@/features/admin/hooks/useEditable';
import { useToast } from '@/shared/hooks/useToast';
import { CreateButton } from '@/features/admin/components/CreateButton';
import { EditButton } from '@/features/admin/components/EditButton';
import { AcademicProductionFormModal } from '@/features/admin/components/AcademicProductionFormModal';
import { ProducaoAcademica, TipoProducaoAcademica, PaginatedResponse } from '@/shared/types';
import { useLocale } from '@/shared/i18n';

export function AcademicPage() {
  const { t } = useLocale();
  const productionTypes: TipoProducaoAcademica[] = [
    'dissertacao',
    'tese',
    'artigo',
    'tcc',
    'livro',
    'capitulo',
    'outro',
  ];
  const tiposProducao: { value: TipoProducaoAcademica | ''; label: string }[] = [
    { value: '', label: t.academic.types[0] },
    ...productionTypes.map((value, index) => ({ value, label: t.academic.types[index + 1] })),
  ];
  const [searchParams, setSearchParams] = useSearchParams();
  const tipo = (searchParams.get('tipo') as TipoProducaoAcademica | '') || '';
  const ano = searchParams.get('ano') || '';
  const autor = searchParams.get('autor') || '';
  const q = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const { canEdit } = useEditable();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProducao, setEditingProducao] = useState<ProducaoAcademica | null>(null);

  const {
    data: producoes,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['producoes-academicas', tipo, ano, autor, q, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tipo) params.set('tipo', tipo);
      if (ano) params.set('ano', ano);
      if (autor) params.set('autor', autor);
      if (q) params.set('q', q);
      params.set('page', String(page));
      params.set('limit', '24');
      const response = await api.get<PaginatedResponse<ProducaoAcademica>>(
        `/producao-academica/?${params.toString()}`
      );
      return response.data;
    },
  });

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.set('page', '1');
    setSearchParams(params);
  };

  return (
    <>
      <SEO title={t.academic.title} />
      <main id="main-content">
        <Section ariaLabelledby="academic-title">
          <Breadcrumb items={[{ label: t.navigation.academic }]} className="mb-6" />

          <SectionHeader
            title={t.academic.title}
            titleId="academic-title"
            subtitle={t.academic.subtitle}
            centered
            action={
              canEdit ? (
                <CreateButton
                  onClick={() => {
                    setEditingProducao(null);
                    setModalOpen(true);
                  }}
                  label={t.academic.productionCreate}
                />
              ) : undefined
            }
          />

          <div className="mb-8 rounded-xl bg-[var(--color-surface)] p-4 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="academic-type" className="label">
                  {t.academic.type}
                </label>
                <select
                  id="academic-type"
                  value={tipo}
                  onChange={(e) => updateParam('tipo', e.target.value)}
                  className="input"
                >
                  {tiposProducao.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="academic-year" className="label">
                  {t.academic.year}
                </label>
                <input
                  id="academic-year"
                  type="number"
                  value={ano}
                  onChange={(e) => updateParam('ano', e.target.value)}
                  placeholder={t.academic.yearPlaceholder}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="academic-author" className="label">
                  {t.academic.author}
                </label>
                <input
                  id="academic-author"
                  type="text"
                  value={autor}
                  onChange={(e) => updateParam('autor', e.target.value)}
                  placeholder={t.academic.authorPlaceholder}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="academic-search" className="label">
                  {t.common.search}
                </label>
                <input
                  id="academic-search"
                  type="search"
                  value={q}
                  onChange={(e) => updateParam('q', e.target.value)}
                  placeholder={t.academic.searchPlaceholder}
                  className="input"
                />
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} cover={false} lines={3} />
              ))}
            </div>
          )}
          {error && <ErrorMessage onRetry={refetch} />}

          {!isLoading && producoes && producoes.dados.length === 0 && (
            <EmptyState title={t.academic.emptyTitle} description={t.academic.emptyDescription} />
          )}

          {!isLoading && producoes && producoes.dados.length > 0 && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {producoes.dados.map((producao) => (
                  <AcademicCard
                    key={producao.id}
                    producao={producao}
                    canEdit={canEdit}
                    onEdit={() => {
                      setEditingProducao(producao);
                      setModalOpen(true);
                    }}
                  />
                ))}
              </div>
              <Pagination
                page={page}
                totalPages={producoes.totalPaginas}
                onChange={(p) => updateParam('page', String(p))}
              />
            </>
          )}
        </Section>
      </main>

      <AcademicProductionFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        producao={editingProducao}
      />
    </>
  );
}

function AcademicCard({
  producao,
  canEdit,
  onEdit,
}: {
  producao: ProducaoAcademica;
  canEdit?: boolean;
  onEdit?: () => void;
}) {
  const { t } = useLocale();
  const { toast } = useToast();

  const handleCopyCitation = async () => {
    try {
      await navigator.clipboard.writeText(producao.citacaoAbnt || '');
      toast(t.academic.citationCopied, 'success');
    } catch {
      toast(t.academic.citationCopyError, 'error');
    }
  };

  return (
    <Card className={`relative flex h-full flex-col ${canEdit ? 'pt-10' : ''}`}>
      {canEdit && onEdit && (
        <div className="absolute right-3 top-3">
          <EditButton onClick={onEdit} label={t.admin.edit} />
        </div>
      )}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          {producao.tipo === 'artigo' ? (
            <FileText className="h-5 w-5" aria-hidden="true" />
          ) : (
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          )}
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {t.academic.types[
            ['dissertacao', 'tese', 'artigo', 'tcc', 'livro', 'capitulo', 'outro'].indexOf(
              producao.tipo
            ) + 1
          ] ?? producao.tipo}
        </span>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-text">{producao.titulo}</h3>
      <div className="mb-3 space-y-1 text-sm text-[var(--color-text-muted)]">
        <p>
          <strong>{t.academic.author}:</strong> {producao.autor}
        </p>
        {producao.orientador && (
          <p>
            <strong>{t.academic.advisor}</strong> {producao.orientador}
          </p>
        )}
        <p>
          <strong>{t.academic.year}:</strong> {producao.ano}
        </p>
        {producao.palavrasChave && (
          <p>
            <strong>{t.academic.keywords}</strong> {producao.palavrasChave}
          </p>
        )}
      </div>
      {producao.resumo && (
        <p className="mb-4 line-clamp-3 text-sm text-[var(--color-text-muted)]">
          {producao.resumo}
        </p>
      )}
      <div className="mt-auto flex flex-wrap gap-2">
        {producao.urlAcesso && (
          <a
            href={producao.urlAcesso}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-xs no-underline"
          >
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            {t.academic.access}
          </a>
        )}
        {producao.citacaoAbnt && (
          <button type="button" onClick={handleCopyCitation} className="btn-outline text-xs">
            {t.academic.citation}
          </button>
        )}
      </div>
    </Card>
  );
}
