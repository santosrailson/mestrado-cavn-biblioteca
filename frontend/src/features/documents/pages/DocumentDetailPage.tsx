import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import {
  Download,
  Share2,
  Link as LinkIcon,
  FileText,
  Pencil,
  Send,
  CheckCircle,
  Globe,
  Archive,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR as ptBRLocale } from 'date-fns/locale';
import { SEO } from '@/shared/components/SEO';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { Breadcrumb } from '@/shared/components/Breadcrumb';
import { RelatedDocumentCard } from '@/shared/components/RelatedDocumentCard';
import { Skeleton } from '@/shared/components/Skeleton';
import { Section } from '@/shared/components/Section';
import { useDocument } from '@/shared/hooks/useDocuments';
import { getApiUrl } from '@/shared/lib/api';
import { getTipoDocumentoLabel, getStatusDocumentoLabel } from '@/shared/lib/documentLabels';
import { LOGO_FALLBACK } from '@/shared/lib/imageFallback';
import { useEditable } from '@/features/admin/hooks/useEditable';
import adminApi from '@/features/admin/api/adminApi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';

const DocumentFormModal = lazy(() =>
  import('@/features/admin/components/DocumentFormModal').then((m) => ({ default: m.DocumentFormModal }))
);
const PdfViewer = lazy(() =>
  import('@/features/documents/components/PdfViewer').then((m) => ({ default: m.PdfViewer }))
);
import { useToast } from '@/shared/hooks/useToast';
import ptBR from '@/shared/i18n/pt-BR';
import { Arquivo, Documento } from '@/shared/types';

function formatBytes(bytes?: number) {
  if (!bytes) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function getViewerUrl(arquivo: Arquivo) {
  return arquivo.url || `${getApiUrl()}/arquivos/${arquivo.id}/download`;
}

export function DocumentDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: documento, isLoading, error, refetch } = useDocument(slug || '');
  const { canEdit } = useEditable();
  const { toast } = useToast();
  const [documentModalOpen, setDocumentModalOpen] = useState(false);

  if (isLoading) return <DocumentDetailSkeleton />;
  if (error || !documento) {
    return (
      <main id="main-content" className="container-page py-12">
        <ErrorMessage title={ptBR.common.notFound} onRetry={refetch} />
      </main>
    );
  }

  const breadcrumbItems = [
    { label: ptBR.navigation.collection, to: '/busca' },
    ...(documento.categorias?.[0]
      ? [
          {
            label: documento.categorias[0].nome,
            to: `/busca?categoria=${documento.categorias[0].slug}`,
          },
        ]
      : []),
    { label: documento.titulo },
  ];

  const mainFile =
    documento.arquivos?.find((a) => a.tipoArquivo === 'original') || documento.arquivos?.[0];
  const isPdf = mainFile?.mimeType === 'application/pdf';
  const isImage = mainFile?.mimeType?.startsWith('image/');

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: documento.titulo,
          text: documento.resumo,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast('Link copiado para a área de transferência.', 'success');
      }
    } catch {
      toast('Não foi possível compartilhar o documento.', 'error');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast('Link copiado para a área de transferência.', 'success');
    } catch {
      toast('Não foi possível copiar o link.', 'error');
    }
  };

  return (
    <>
      <SEO
        title={documento.titulo}
        description={documento.resumo || documento.descricao || ptBR.seo.defaultDescription}
        pathname={`/documentos/${documento.slug}`}
        type="article"
        publishedTime={documento.createdAt}
        modifiedTime={documento.updatedAt}
      />
      <main id="main-content" className="container-page py-6">
        <Breadcrumb items={breadcrumbItems} />

        {canEdit && (
          <AdminDocumentActions documento={documento} onEdit={() => setDocumentModalOpen(true)} />
        )}

        <article>
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-text sm:text-3xl">{documento.titulo}</h1>
            {documento.tituloAlternativo && (
              <p className="mt-1 text-lg text-[var(--color-text-muted)]">
                {documento.tituloAlternativo}
              </p>
            )}
          </header>

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="lg:col-span-2" aria-label="Visualizador do documento">
              <Card className="overflow-hidden p-0">
                {mainFile ? (
                  <div className="relative min-h-[300px] bg-surface-alt">
                    {isPdf ? (
                      <>
                        <Suspense fallback={<Skeleton className="h-[60vh] w-full" />}>
                          <PdfViewer
                            url={getViewerUrl(mainFile)}
                            title={`Visualização PDF de ${documento.titulo}`}
                          />
                        </Suspense>
                        <p id="pdf-instructions" className="sr-only">
                          Documento PDF abaixo. Use as teclas de navegação do leitor de PDF do navegador.
                        </p>
                      </>
                    ) : isImage ? (
                      <img
                        src={getViewerUrl(mainFile)}
                        alt={`Imagem do documento ${documento.titulo}`}
                        className="mx-auto h-auto max-h-[60vh] w-auto object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = LOGO_FALLBACK;
                          (e.currentTarget as HTMLImageElement).className = 'mx-auto h-40 w-auto object-contain opacity-60';
                        }}
                      />
                    ) : (
                      <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-text-muted">
                        <FileText className="h-12 w-12" aria-hidden="true" />
                        <p>Visualização não disponível para este formato.</p>
                        <a
                          href={getViewerUrl(mainFile)}
                          download
                          className="btn-primary inline-flex no-underline"
                        >
                          <Download className="h-4 w-4" aria-hidden="true" />
                          {ptBR.document.downloadOriginal}
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-[var(--color-text-muted)]">
                    Nenhum arquivo digital disponível.
                  </div>
                )}
              </Card>

              {documento.descricao && (
                <section className="mt-6" aria-labelledby="description-title">
                  <h2 id="description-title" className="mb-2 text-xl font-semibold">
                    {ptBR.document.description}
                  </h2>
                  <p className="whitespace-pre-wrap text-[var(--color-text-muted)]">
                    {documento.descricao}
                  </p>
                </section>
              )}

              {mainFile?.conteudoOcr && (
                <section className="mt-6" aria-labelledby="ocr-title">
                  <h2 id="ocr-title" className="mb-2 text-xl font-semibold">
                    {ptBR.document.ocrContent}
                  </h2>
                  <div className="max-h-64 overflow-y-auto rounded-md bg-surface-alt p-4 font-mono text-sm text-text">
                    {mainFile.conteudoOcr}
                  </div>
                </section>
              )}
            </section>

            <aside aria-label={ptBR.document.catalogCard}>
              <Card className="sticky top-24">
                <h2 className="mb-4 text-lg font-semibold">{ptBR.document.catalogCard}</h2>
                <dl className="space-y-3 text-sm">
                  <MetadataItem label={ptBR.document.metadata.title} value={documento.titulo} />
                  <MetadataItem
                    label={ptBR.document.metadata.type}
                    value={getTipoDocumentoLabel(documento.tipoDocumento)}
                  />
                  <MetadataItem
                    label={ptBR.document.metadata.date}
                    value={
                      documento.dataDocumento
                        ? format(new Date(documento.dataDocumento), 'dd/MM/yyyy', {
                            locale: ptBRLocale,
                          })
                        : undefined
                    }
                  />
                  <MetadataItem
                    label={ptBR.document.metadata.publishedDate}
                    value={
                      documento.createdAt
                        ? format(new Date(documento.createdAt), 'dd/MM/yyyy', {
                            locale: ptBRLocale,
                          })
                        : undefined
                    }
                  />
                  <MetadataItem
                    label={ptBR.document.metadata.code}
                    value={documento.codigoReferencia}
                  />
                  <MetadataItem
                    label={ptBR.document.metadata.author}
                    value={documento.autores?.map((a) => a.nome).join(', ')}
                  />
                  <MetadataItem label={ptBR.document.metadata.language} value={documento.idioma} />
                  <MetadataItem label={ptBR.document.metadata.format} value={mainFile?.mimeType} />
                  <MetadataItem
                    label={ptBR.document.metadata.size}
                    value={formatBytes(mainFile?.tamanhoBytes)}
                  />
                  <MetadataItem
                    label={ptBR.document.metadata.dimensions}
                    value={
                      mainFile?.largura && mainFile?.altura
                        ? `${mainFile.largura}x${mainFile.altura}px`
                        : undefined
                    }
                  />
                  <MetadataItem
                    label={ptBR.document.metadata.checksum}
                    value={mainFile?.checksumSha256}
                    monospace
                    truncate
                  />
                  <MetadataItem label={ptBR.document.metadata.rights} value={documento.direitos} />
                  <MetadataItem label={ptBR.document.metadata.source} value={documento.fonte} />
                  <MetadataItem
                    label={ptBR.document.metadata.coverage}
                    value={documento.coberturaEspacial}
                  />
                </dl>

                <div className="mt-6 space-y-2">
                  {mainFile && (
                    <a
                      href={getViewerUrl(mainFile)}
                      download
                      className="btn-primary w-full no-underline"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      {ptBR.document.downloadOriginal}
                    </a>
                  )}
                  <Button variant="outline" className="w-full" onClick={handleShare}>
                    <Share2 className="h-4 w-4" aria-hidden="true" />
                    {ptBR.document.share}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={handleCopyLink}
                  >
                    <LinkIcon className="h-4 w-4" aria-hidden="true" />
                    {ptBR.document.permalink}
                  </Button>
                </div>
              </Card>
            </aside>
          </div>

          {documento.tags && documento.tags.length > 0 && (
            <section className="mt-8" aria-labelledby="tags-title">
              <h2 id="tags-title" className="mb-3 text-lg font-semibold">
                {ptBR.document.tags}
              </h2>
              <div className="flex flex-wrap gap-2">
                {documento.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    to={`/busca?tag=${tag.slug}`}
                    className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 hover:bg-brand-100 hover:text-brand-700 no-underline transition-colors"
                  >
                    #{tag.nome}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {documento.categorias && documento.categorias.length > 0 && (
            <section className="mt-6" aria-labelledby="categories-title">
              <h2 id="categories-title" className="mb-3 text-lg font-semibold">
                {ptBR.document.categories}
              </h2>
              <ul className="space-y-1 text-sm">
                {documento.categorias.map((cat) => (
                  <li key={cat.id}>
                    <Link to={`/busca?categoria=${cat.slug}`} className="no-underline">
                      {cat.nome}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {documento.relacionados && documento.relacionados.length > 0 && (
            <Section variant="alt" ariaLabelledby="related-title" className="mt-12 !py-10">
              <h2 id="related-title" className="section-title mb-6">
                {ptBR.document.relatedDocuments}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {documento.relacionados.map((doc) => (
                  <RelatedDocumentCard key={doc.id} documento={doc} />
                ))}
              </div>
            </Section>
          )}
        </article>
      </main>

      <Suspense fallback={null}>
        <DocumentFormModal
          isOpen={documentModalOpen}
          onClose={() => setDocumentModalOpen(false)}
          documentId={documento.slug}
        />
      </Suspense>
    </>
  );
}

function AdminDocumentActions({ documento, onEdit }: { documento: Documento; onEdit: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['document', documento.slug] });
    queryClient.invalidateQueries({ queryKey: ['documents'] });
  };

  const submitMutation = useMutation({
    mutationFn: () => adminApi.submitDocument(documento.slug),
    onSuccess: () => { invalidate(); toast('Documento enviado para revisão.', 'success'); },
    onError: () => toast('Erro ao submeter documento.', 'error'),
  });
  const approveMutation = useMutation({
    mutationFn: () => adminApi.approveDocument(documento.slug),
    onSuccess: () => { invalidate(); toast('Documento aprovado.', 'success'); },
    onError: () => toast('Erro ao aprovar documento.', 'error'),
  });
  const publishMutation = useMutation({
    mutationFn: () => adminApi.publishDocument(documento.slug),
    onSuccess: () => { invalidate(); toast('Documento publicado com sucesso.', 'success'); },
    onError: () => toast('Erro ao publicar documento.', 'error'),
  });
  const archiveMutation = useMutation({
    mutationFn: () => adminApi.archiveDocument(documento.slug),
    onSuccess: () => { invalidate(); toast('Documento arquivado.', 'success'); },
    onError: () => toast('Erro ao arquivar documento.', 'error'),
  });

  const statusColors: Record<string, string> = {
    rascunho: 'bg-surface-alt text-text',
    em_revisao: 'bg-warning-bg text-warning',
    aprovado: 'bg-primary/10 text-primary',
    publicado: 'bg-success-bg text-success',
    arquivado: 'bg-surface-alt text-text-muted',
  };

  return (
    <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span
          className={`rounded px-2 py-1 text-xs font-semibold uppercase ${statusColors[documento.status] || statusColors.rascunho}`}
        >
          {getStatusDocumentoLabel(documento.status)}
        </span>
        <span className="text-xs text-primary">Ações administrativas</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm" onClick={onEdit}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Editar
        </Button>
        {documento.status === 'rascunho' && (
          <Button
            size="sm"
            className="btn bg-yellow-600 text-white hover:bg-yellow-700"
            onClick={() => submitMutation.mutate()}
            isLoading={submitMutation.isPending}
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Submeter
          </Button>
        )}
        {documento.status === 'em_revisao' && (
          <Button
            size="sm"
            className="btn bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => approveMutation.mutate()}
            isLoading={approveMutation.isPending}
          >
            <CheckCircle className="h-4 w-4" aria-hidden="true" />
            Aprovar
          </Button>
        )}
        {documento.status === 'aprovado' && (
          <Button
            size="sm"
            className="btn bg-green-600 text-white hover:bg-green-700"
            onClick={() => publishMutation.mutate()}
            isLoading={publishMutation.isPending}
          >
            <Globe className="h-4 w-4" aria-hidden="true" />
            Publicar
          </Button>
        )}
        {documento.status === 'publicado' && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => archiveMutation.mutate()}
            isLoading={archiveMutation.isPending}
          >
            <Archive className="h-4 w-4" aria-hidden="true" />
            Arquivar
          </Button>
        )}
      </div>
    </div>
  );
}

function DocumentDetailSkeleton() {
  return (
    <main id="main-content" className="container-page py-6">
      <Skeleton className="mb-6 h-6 w-64" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </main>
  );
}

function MetadataItem({
  label,
  value,
  monospace,
  truncate,
}: {
  label: string;
  value?: string;
  monospace?: boolean;
  truncate?: boolean;
}) {
  if (!value) return null;
  const displayValue =
    truncate && value.length > 20 ? `${value.slice(0, 8)}…${value.slice(-8)}` : value;
  return (
    <div className="flex flex-col border-b border-[var(--color-border)] pb-2 last:border-0 last:pb-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-text ${monospace ? 'font-mono text-xs' : ''}`}
        title={truncate ? value : undefined}
      >
        {displayValue}
      </dd>
    </div>
  );
}
