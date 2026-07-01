import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Clock,
  Image,
  BookOpen,
  FileText,
  GraduationCap,
  Landmark,
  FolderArchive,
  ArrowRight,
} from 'lucide-react';
import { SEO } from '@/shared/components/SEO';
import { DocumentCard } from '@/shared/components/DocumentCard';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { EmptyState } from '@/shared/components/EmptyState';
import { SkeletonGrid } from '@/shared/components/Skeleton';
import { Section, SectionHeader } from '@/shared/components/Section';
import { Hero } from '@/shared/components/Hero';
import { useCategories } from '@/shared/hooks/useCategories';
import { useLatestDocuments } from '@/shared/hooks/useDocuments';
import { useTimeline } from '@/shared/hooks/useTimeline';
import { useEditable } from '@/features/admin/hooks/useEditable';
import { CreateButton } from '@/features/admin/components/CreateButton';
import { EditButton } from '@/features/admin/components/EditButton';
import { TimelineCard } from '@/features/timeline/components/TimelineCard';
import { lazy, Suspense } from 'react';
import { CategoryFormModal } from '@/features/admin/components/CategoryFormModal';
import { TimelineEventFormModal } from '@/features/admin/components/TimelineEventFormModal';

import ptBR from '@/shared/i18n/pt-BR';
import { Categoria, TimelineEvent } from '@/shared/types';

const DocumentFormModal = lazy(() =>
  import('@/features/admin/components/DocumentFormModal').then((m) => ({ default: m.DocumentFormModal }))
);

const categoryIcons: Record<string, React.ReactNode> = {
  'documentos-textuais': <FileText className="h-7 w-7" aria-hidden="true" />,
  'fotografias-historicas': <Image className="h-7 w-7" aria-hidden="true" />,
  'documentos-administrativos': <Landmark className="h-7 w-7" aria-hidden="true" />,
  'producao-academica': <GraduationCap className="h-7 w-7" aria-hidden="true" />,
  'documentos-pedagogicos': <BookOpen className="h-7 w-7" aria-hidden="true" />,
  atas: <FolderArchive className="h-7 w-7" aria-hidden="true" />,
};

export function HomePage() {
  const {
    data: categories,
    isLoading: categoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
  } = useCategories();
  const {
    data: latestDocuments,
    isLoading: docsLoading,
    error: docsError,
    refetch: refetchDocuments,
  } = useLatestDocuments(6);
  const {
    data: timelineEvents,
    isLoading: timelineLoading,
    error: timelineError,
    refetch: refetchTimeline,
  } = useTimeline(undefined, true);
  const { canEdit } = useEditable();

  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState<string | undefined>();
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Categoria | null>(null);
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [editingTimelineEvent, setEditingTimelineEvent] = useState<TimelineEvent | null>(null);

  const openDocumentCreate = () => {
    setEditingDocumentId(undefined);
    setDocumentModalOpen(true);
  };

  const openDocumentEdit = (id: string) => {
    setEditingDocumentId(id);
    setDocumentModalOpen(true);
  };

  const openCategoryCreate = () => {
    setEditingCategory(null);
    setCategoryModalOpen(true);
  };

  const openCategoryEdit = (category: Categoria) => {
    setEditingCategory(category);
    setCategoryModalOpen(true);
  };

  const openTimelineCreate = () => {
    setEditingTimelineEvent(null);
    setTimelineModalOpen(true);
  };

  const openTimelineEdit = (event: TimelineEvent) => {
    setEditingTimelineEvent(event);
    setTimelineModalOpen(true);
  };

  return (
    <>
      <SEO />
      <main id="main-content">
        <Hero
          title={ptBR.home.heroTitle}
          subtitle={ptBR.home.heroSubtitle}
          badge="CAVN/UFPB"
          showSearch
          actions={
            <>
              <Link to="/busca" className="btn-primary min-w-[180px]">
                <Search className="h-5 w-5" aria-hidden="true" />
                {ptBR.home.ctaSearch}
              </Link>
              <Link
                to="/linha-do-tempo"
                className="btn-outline border-white text-white hover:bg-white/10 min-w-[180px]"
              >
                <Clock className="h-5 w-5" aria-hidden="true" />
                {ptBR.home.ctaTimeline}
              </Link>
            </>
          }
        />

        <Section ariaLabelledby="categories-title" id="categorias">
          <SectionHeader
            title={ptBR.home.categoriesTitle}
            titleId="categories-title"
            subtitle="Navegue pelos principais grupos documentais do acervo"
            centered
            action={
              canEdit ? <CreateButton onClick={openCategoryCreate} label="Categoria" /> : undefined
            }
          />

          {categoriesLoading && <SkeletonGrid count={8} columns={4} />}
          {categoriesError && <ErrorMessage onRetry={refetchCategories} />}
          {categories && categories.length === 0 && (
            <EmptyState
              title="Nenhuma categoria disponível"
              description="As categorias do acervo aparecerão aqui."
            />
          )}
          {categories && categories.length > 0 && (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="list">
              {categories
                .filter((c) => c.ativo)
                .slice(0, 8)
                .map((category) => (
                  <li key={category.id} className="relative">
                    <Link
                      to={`/busca?categoria=${category.slug}`}
                      className="group card flex flex-col items-center p-6 text-center no-underline transition-all hover:-translate-y-1 hover:shadow-md"
                    >
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                        {categoryIcons[category.slug] || (
                          <FolderArchive className="h-7 w-7" aria-hidden="true" />
                        )}
                      </div>
                      <h3 className="mb-1 text-base font-semibold text-text">
                        {category.nome}
                      </h3>
                      <p className="text-sm text-text-muted">
                        {category.contagemDocumentos ?? 0} itens
                      </p>
                    </Link>
                    {canEdit && (
                      <div className="absolute right-2 top-2">
                        <EditButton onClick={() => openCategoryEdit(category)} label="Editar" />
                      </div>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </Section>

        <Section variant="alt" ariaLabelledby="latest-docs-title">
          <SectionHeader
            title={ptBR.home.latestDocumentsTitle}
            titleId="latest-docs-title"
            subtitle="As novidades mais recentes do repositório"
            centered
            action={
              <>
                {canEdit && <CreateButton onClick={openDocumentCreate} label="Documento" />}
                <Link
                  to="/busca"
                  className="hidden items-center gap-1 text-sm font-medium text-primary no-underline hover:text-primary/80 sm:inline-flex"
                >
                  {ptBR.home.seeAll}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </>
            }
          />

          {docsLoading && <SkeletonGrid count={6} columns={3} />}
          {docsError && <ErrorMessage onRetry={refetchDocuments} />}
          {latestDocuments && latestDocuments.dados.length === 0 && (
            <EmptyState
              title="Nenhum documento ainda"
              description="Os documentos publicados aparecerão aqui."
            />
          )}
          {latestDocuments && latestDocuments.dados.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {latestDocuments.dados.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  documento={doc}
                  editTo={canEdit ? doc.slug : undefined}
                  onEdit={openDocumentEdit}
                />
              ))}
            </div>
          )}
        </Section>

        <Section ariaLabelledby="timeline-preview-title">
          <SectionHeader
            title={ptBR.home.timelinePreviewTitle}
            titleId="timeline-preview-title"
            subtitle="Momentos que marcaram a história do CAVN"
            centered
            action={
              canEdit ? <CreateButton onClick={openTimelineCreate} label="Evento" /> : undefined
            }
          />

          {timelineLoading && <SkeletonGrid count={4} columns={4} cover={false} />}
          {timelineError && <ErrorMessage onRetry={refetchTimeline} />}
          {timelineEvents && timelineEvents.length === 0 && (
            <EmptyState
              title="Nenhum marco histórico"
              description="Os marcos históricos cadastrados aparecerão aqui."
            />
          )}
          {timelineEvents && timelineEvents.length > 0 && (
            <div className="relative">
              <div
                className="absolute left-4 top-6 h-full w-0.5 bg-primary/20 md:left-1/2 md:top-0 md:h-0.5 md:w-full md:-translate-x-1/2"
                aria-hidden="true"
              />

              <div className="grid gap-8 md:grid-cols-4 md:gap-4">
                {timelineEvents.slice(0, 4).map((event) => (
                  <div
                    key={event.id}
                    className="relative flex h-full gap-4 md:block md:text-center"
                  >
                    <span
                      className="absolute left-4 top-6 h-4 w-4 -translate-x-1/2 rounded-full bg-primary ring-4 ring-bg md:left-1/2 md:top-0 md:-translate-x-1/2 md:translate-y-[-6px]"
                      aria-hidden="true"
                    />
                    <div className="flex h-full flex-col pl-12 md:pl-0 md:pt-8">
                      {canEdit && (
                        <div className="mb-2 md:flex md:justify-center">
                          <EditButton onClick={() => openTimelineEdit(event)} label="Editar" />
                        </div>
                      )}
                      <TimelineCard
                        event={event}
                        showImage
                        className="h-full text-left md:text-left"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10 text-center">
            <Link to="/linha-do-tempo" className="btn-outline inline-flex">
              <Clock className="h-5 w-5" aria-hidden="true" />
              {ptBR.home.ctaTimeline}
            </Link>
          </div>
        </Section>
      </main>

      <Suspense fallback={null}>
        <DocumentFormModal
          isOpen={documentModalOpen}
          onClose={() => setDocumentModalOpen(false)}
          documentId={editingDocumentId}
        />
      </Suspense>
      <CategoryFormModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        category={editingCategory}
      />
      <TimelineEventFormModal
        isOpen={timelineModalOpen}
        onClose={() => setTimelineModalOpen(false)}
        event={editingTimelineEvent}
      />
    </>
  );
}
