import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/shared/lib/api';
import adminApi, { DocumentoFormPayload } from '../api/adminApi';
import { useToast } from '@/shared/hooks/useToast';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Loading } from '@/shared/components/Loading';
import { Modal } from '@/shared/components/Modal';
import { DocumentFormSteps } from './DocumentFormSteps';
import { documentSchema, DocumentFormData, defaultDocumentFormValues } from '../lib/documentSchema';
import { getDocumentSteps } from '../lib/documentFormConstants';
import { useCategories } from '@/shared/hooks/useCategories';
import { useLocale } from '@/shared/i18n';
import { clsx } from 'clsx';
import { Autor, Documento } from '@/shared/types';
import { getErrorMessage } from '@/shared/lib/getErrorMessage';
import { trackEvent } from '@/shared/lib/analytics';

interface DocumentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId?: string;
}

const DRAFT_VERSION = 2;
const DRAFT_TTL_MS = 1000 * 60 * 60 * 24 * 30;
type DraftEnvelope = { version: number; values: DocumentFormData; savedAt: number };

function documentToFormValues(documento?: Documento): DocumentFormData {
  if (!documento) return { ...defaultDocumentFormValues };
  return {
    titulo: documento.titulo,
    tituloAlternativo: documento.tituloAlternativo || '',
    descricao: documento.descricao || '',
    resumo: documento.resumo || '',
    tipoDocumento: documento.tipoDocumento,
    dataDocumento: documento.dataDocumento || '',
    dataPrecisao: documento.dataPrecisao,
    coberturaTemporal: documento.coberturaTemporal || '',
    coberturaEspacial: documento.coberturaEspacial || '',
    idioma: documento.idioma,
    direitos: documento.direitos,
    fonte: documento.fonte || '',
    codigoReferencia: documento.codigoReferencia || '',
    relacao: documento.relacao || '',
    categoriaIds: documento.categorias?.map((c) => c.id) || [],
    tags: documento.tags?.map((t) => t.nome) || [],
    autores: documento.autores?.map((a) => a.nome) || [],
  };
}

export function DocumentFormModal({ isOpen, onClose, documentId }: DocumentFormModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLocale();
  const documentSteps = getDocumentSteps(t);
  const [step, setStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>();
  const [uploadStage, setUploadStage] = useState<string>();
  const [draftSavedAt, setDraftSavedAt] = useState<number>();
  const [draftRestored, setDraftRestored] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const [pendingUpload, setPendingUpload] = useState<{
    slug: string;
    file: File;
    saved: Documento;
  }>();
  const draftTimeoutRef = useRef<number>();
  const isEdit = Boolean(documentId);
  const draftKey = `cavn:document-draft:${documentId || 'novo'}`;

  const {
    data: documento,
    isLoading: loadingDocument,
    error: documentError,
    refetch,
  } = useQuery({
    queryKey: ['admin-document', documentId],
    queryFn: () => (documentId ? adminApi.document(documentId) : undefined),
    enabled: isEdit && isOpen,
    retry: 1,
  });

  const { data: categories } = useCategories();

  const { data: authors } = useQuery({
    queryKey: ['admin-authors'],
    queryFn: () => api.get<Autor[]>('/documentos/autores/?limit=200').then((r) => r.data),
    enabled: isOpen,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: defaultDocumentFormValues,
  });

  useEffect(() => {
    const serverValues = documentToFormValues(documento);

    if (isOpen && !draftRestored && (documento || !isEdit)) {
      try {
        const rawDraft = localStorage.getItem(draftKey);
        const parsed = rawDraft ? (JSON.parse(rawDraft) as Partial<DraftEnvelope>) : {};
        const isFresh = Boolean(parsed.savedAt && Date.now() - parsed.savedAt < DRAFT_TTL_MS);
        const isNewerThanServer =
          !documento ||
          !documento.updatedAt ||
          Boolean(parsed.savedAt && parsed.savedAt > Date.parse(documento.updatedAt));
        if (
          parsed.version === DRAFT_VERSION &&
          parsed.values &&
          parsed.savedAt &&
          isFresh &&
          isNewerThanServer
        ) {
          reset(parsed.values);
          setDraftSavedAt(parsed.savedAt);
          trackEvent('draft_restored');
        } else if (rawDraft && !isFresh) {
          localStorage.removeItem(draftKey);
          trackEvent('draft_expired');
          reset(serverValues);
          toast('O rascunho local expirou e foi removido.', 'info');
        } else {
          reset(serverValues);
        }
      } catch {
        reset(serverValues);
      }
      setDraftRestored(true);
    }
  }, [documento, reset, isEdit, isOpen, draftKey, draftRestored, toast]);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setDraftRestored(false);
      setDraftSavedAt(undefined);
      setUploadProgress(undefined);
      setUploadStage(undefined);
      setUploadError(undefined);
      setPendingUpload(undefined);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const subscription = watch((values) => {
      window.clearTimeout(draftTimeoutRef.current);
      draftTimeoutRef.current = window.setTimeout(() => {
        try {
          const savedAt = Date.now();
          const envelope: DraftEnvelope = {
            version: DRAFT_VERSION,
            values: values as DocumentFormData,
            savedAt,
          };
          localStorage.setItem(draftKey, JSON.stringify(envelope));
          setDraftSavedAt(savedAt);
        } catch {
          // O storage pode estar indisponível; o formulário continua funcionando.
        }
      }, 500);
    });
    return () => {
      window.clearTimeout(draftTimeoutRef.current);
      subscription.unsubscribe();
    };
  }, [draftKey, isOpen, watch]);

  const categoriaIds = watch('categoriaIds') || [];
  const autores = watch('autores') || [];

  const finishSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    queryClient.invalidateQueries({ queryKey: ['document'] });
    queryClient.invalidateQueries({ queryKey: ['latest-documents'] });
    setSelectedFile(null);
    setPendingUpload(undefined);
    localStorage.removeItem(draftKey);
    setUploadStage(undefined);
    setUploadError(undefined);
    toast(
      documentId ? 'Documento atualizado com sucesso.' : 'Documento criado com sucesso.',
      'success'
    );
    onClose();
  };

  const uploadSelectedFile = async (slug: string, file: File, saved: Documento) => {
    setUploadError(undefined);
    setUploadStage('Enviando arquivo');
    setUploadProgress(0);
    trackEvent('upload_started', { file_type: file.type, file_size: file.size });
    try {
      await adminApi.uploadFile(slug, file, setUploadProgress);
      setUploadStage('Processando OCR e miniatura');
      setUploadProgress(undefined);
      setPendingUpload(undefined);
      trackEvent('upload_completed', { file_type: file.type, file_size: file.size });
      finishSuccess();
      return true;
    } catch (error) {
      const message = getErrorMessage(error, 'Não foi possível enviar o arquivo.');
      setUploadError(message);
      setUploadStage('Falha no envio');
      setPendingUpload({ slug, file, saved });
      trackEvent('upload_failed', { file_type: file.type });
      return false;
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: DocumentFormData) => {
      const payload: DocumentoFormPayload = {
        titulo: data.titulo,
        tituloAlternativo: data.tituloAlternativo,
        descricao: data.descricao,
        resumo: data.resumo,
        tipoDocumento: data.tipoDocumento,
        dataDocumento: data.dataDocumento,
        dataPrecisao: data.dataPrecisao,
        coberturaTemporal: data.coberturaTemporal,
        coberturaEspacial: data.coberturaEspacial,
        idioma: data.idioma,
        direitos: data.direitos,
        fonte: data.fonte,
        codigoReferencia: data.codigoReferencia,
        relacao: data.relacao,
        autorIds: [],
        autores: data.autores,
        categoriaIds: data.categoriaIds,
        tags: data.tags,
      };
      if (isEdit && documentId) {
        return adminApi.updateDocument(documentId, payload);
      }
      return adminApi.createDocument(payload);
    },
    onSuccess: async (saved) => {
      if (selectedFile && saved.slug) {
        await uploadSelectedFile(saved.slug, selectedFile, saved);
        return;
      }
      finishSuccess();
    },
    onError: () => {
      setUploadStage(undefined);
      toast(
        'Não foi possível salvar o documento. Seus dados continuam salvos como rascunho local.',
        'error'
      );
    },
  });

  const retryUpload = () => {
    if (pendingUpload)
      void uploadSelectedFile(pendingUpload.slug, pendingUpload.file, pendingUpload.saved);
  };

  const discardDraft = () => {
    localStorage.removeItem(draftKey);
    reset(documentToFormValues(documento));
    setDraftSavedAt(undefined);
    setUploadError(undefined);
    toast('Rascunho descartado.', 'info');
  };

  const onSubmit = (data: DocumentFormData) => {
    if (step < documentSteps.length - 1) {
      setStep(step + 1);
      return;
    }
    saveMutation.mutate(data);
  };

  const toggleCategory = (catId: string) => {
    const updated = categoriaIds.includes(catId)
      ? categoriaIds.filter((id) => id !== catId)
      : [...categoriaIds, catId];
    setValue('categoriaIds', updated);
  };

  const footer = (
    <div className="flex justify-between">
      <Button
        type="button"
        variant="secondary"
        onClick={() => setStep(Math.max(0, step - 1))}
        disabled={step === 0}
      >
        {t.common.previous}
      </Button>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          {t.common.cancel}
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={saveMutation.isPending}
          disabled={Boolean(uploadError)}
          form="document-form-modal"
        >
          {step === documentSteps.length - 1 ? t.common.save : t.common.next}
        </Button>
      </div>
    </div>
  );

  const isReady = !isEdit || (!!documento && !loadingDocument);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t.admin.editDocument : t.admin.newDocument}
      size="lg"
      footer={isReady && !documentError ? footer : undefined}
    >
      {isEdit && (loadingDocument || !documento) && !documentError ? (
        <Loading />
      ) : documentError ? (
        <div className="space-y-4 text-center">
          <p className="text-red-600">{t.auth.sessionExpired || 'Unable to load the document.'}</p>
          <Button type="button" variant="primary" onClick={() => refetch()}>
            {t.admin.form.retryLoad}
          </Button>
        </div>
      ) : (
        <form id="document-form-modal" onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-6 flex items-center justify-between">
            {documentSteps.map((label, index) => (
              <div key={label} className="flex flex-1 flex-col items-center">
                <div
                  className={clsx(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                    index <= step ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600'
                  )}
                >
                  {index + 1}
                </div>
                <span className="mt-1 hidden text-xs sm:block">{label}</span>
              </div>
            ))}
          </div>

          <Card className="min-h-[300px]">
            {draftSavedAt && (
              <div
                className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md bg-success-bg px-3 py-2 text-xs text-success-text"
                role="status"
              >
                <span>
                  Rascunho salvo automaticamente às{' '}
                  {new Date(draftSavedAt).toLocaleTimeString('pt-BR')}.
                </span>
                <button type="button" className="font-semibold underline" onClick={discardDraft}>
                  Descartar rascunho
                </button>
              </div>
            )}
            <DocumentFormSteps
              step={step}
              register={register}
              errors={errors}
              setValue={setValue}
              categories={categories}
              categoriaIds={categoriaIds}
              toggleCategory={toggleCategory}
              autores={autores}
              availableAuthors={authors}
              selectedFile={selectedFile}
              onFileChange={setSelectedFile}
              uploadProgress={uploadProgress}
              uploadStage={uploadStage}
              uploadError={uploadError}
              onRetryUpload={retryUpload}
            />
          </Card>
        </form>
      )}
    </Modal>
  );
}
