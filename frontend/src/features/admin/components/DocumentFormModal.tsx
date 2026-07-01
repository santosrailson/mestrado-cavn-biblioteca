import { useEffect, useState } from 'react';
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
import { documentSteps } from '../lib/documentFormConstants';
import { useCategories } from '@/shared/hooks/useCategories';
import ptBR from '@/shared/i18n/pt-BR';
import { clsx } from 'clsx';
import { Autor } from '@/shared/types';

interface DocumentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId?: string;
}

export function DocumentFormModal({ isOpen, onClose, documentId }: DocumentFormModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const isEdit = Boolean(documentId);

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
    if (documento) {
      reset({
        titulo: documento.titulo,
        tituloAlternativo: documento.tituloAlternativo,
        descricao: documento.descricao,
        resumo: documento.resumo,
        tipoDocumento: documento.tipoDocumento,
        dataDocumento: documento.dataDocumento,
        dataPrecisao: documento.dataPrecisao,
        coberturaTemporal: documento.coberturaTemporal,
        coberturaEspacial: documento.coberturaEspacial,
        idioma: documento.idioma,
        direitos: documento.direitos,
        fonte: documento.fonte,
        codigoReferencia: documento.codigoReferencia,
        relacao: documento.relacao,
        categoriaIds: documento.categorias?.map((c) => c.id) || [],
        tags: documento.tags?.map((t) => t.nome) || [],
        autores: documento.autores?.map((a) => a.nome) || [],
      });
    } else if (!isEdit && isOpen) {
      reset(defaultDocumentFormValues);
    }
  }, [documento, reset, isEdit, isOpen]);

  useEffect(() => {
    if (isOpen) setStep(0);
  }, [isOpen]);

  const categoriaIds = watch('categoriaIds') || [];
  const autores = watch('autores') || [];

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
        await adminApi.uploadFile(saved.slug, selectedFile);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document'] });
      queryClient.invalidateQueries({ queryKey: ['latest-documents'] });
      setSelectedFile(null);
      toast(
        documentId ? 'Documento atualizado com sucesso.' : 'Documento criado com sucesso.',
        'success'
      );
      onClose();
    },
    onError: () => {
      toast('Não foi possível salvar o documento. Tente novamente.', 'error');
    },
  });

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
        {ptBR.common.previous}
      </Button>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          {ptBR.common.cancel}
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={saveMutation.isPending}
          form="document-form-modal"
        >
          {step === documentSteps.length - 1 ? ptBR.common.save : ptBR.common.next}
        </Button>
      </div>
    </div>
  );

  const isReady = !isEdit || (!!documento && !loadingDocument);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? ptBR.admin.editDocument : ptBR.admin.newDocument}
      size="lg"
      footer={isReady && !documentError ? footer : undefined}
    >
      {isEdit && (loadingDocument || !documento) && !documentError ? (
        <Loading />
      ) : documentError ? (
        <div className="space-y-4 text-center">
          <p className="text-red-600">
            {ptBR.auth.sessionExpired || 'Não foi possível carregar o documento.'}
          </p>
          <Button type="button" variant="primary" onClick={() => refetch()}>
            Tentar novamente
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
            />
          </Card>
        </form>
      )}
    </Modal>
  );
}
