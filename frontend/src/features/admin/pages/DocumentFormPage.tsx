import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/shared/lib/api';
import adminApi, { DocumentoFormPayload } from '../api/adminApi';
import { useToast } from '@/shared/hooks/useToast';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Loading } from '@/shared/components/Loading';
import { DocumentFormSteps } from '../components/DocumentFormSteps';
import { documentSchema, DocumentFormData, defaultDocumentFormValues } from '../lib/documentSchema';
import { documentSteps } from '../lib/documentFormConstants';
import { useCategories } from '@/shared/hooks/useCategories';
import ptBR from '@/shared/i18n/pt-BR';
import { clsx } from 'clsx';
import { Autor } from '@/shared/types';

const DRAFT_KEY = 'cavn:document-form-draft';

export function DocumentFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const isEdit = Boolean(id);

  const { data: documento, isLoading: loadingDocument } = useQuery({
    queryKey: ['admin-document', id],
    queryFn: () => (id ? adminApi.document(id) : undefined),
    enabled: isEdit,
  });

  const { data: categories } = useCategories();

  const { data: authors } = useQuery({
    queryKey: ['admin-authors'],
    queryFn: () => api.get<Autor[]>('/documentos/autores/?limit=200').then((r) => r.data),
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
    }
  }, [documento, reset]);

  // Carrega rascunho local ao criar um novo documento.
  const [hasDraft, setHasDraft] = useState(false);
  useEffect(() => {
    if (isEdit) return;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as DocumentFormData;
        reset({ ...defaultDocumentFormValues, ...parsed });
        setHasDraft(true);
      }
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, [isEdit, reset]);

  // Salva rascunho automaticamente a cada mudança (debounce 2s).
  const formValues = watch();
  useEffect(() => {
    if (isEdit) return;
    const timer = setTimeout(() => {
      const values = formValues as DocumentFormData;
      const hasAnyValue = Object.values(values).some((v) =>
        Array.isArray(v) ? v.length > 0 : Boolean(v)
      );
      if (hasAnyValue) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
        setHasDraft(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [formValues, isEdit]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    reset(defaultDocumentFormValues);
    setHasDraft(false);
    toast('Rascunho descartado.', 'info');
  };

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
      if (isEdit && id) {
        return adminApi.updateDocument(id, payload);
      }
      return adminApi.createDocument(payload);
    },
    onSuccess: async (saved) => {
      if (selectedFile && saved.slug) {
        await adminApi.uploadFile(saved.slug, selectedFile);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
      localStorage.removeItem(DRAFT_KEY);
      toast(id ? 'Documento atualizado com sucesso.' : 'Documento criado com sucesso.', 'success');
      navigate('/admin/documentos');
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

  if (isEdit && loadingDocument) return <Loading fullScreen />;

  const toggleCategory = (catId: string) => {
    const updated = categoriaIds.includes(catId)
      ? categoriaIds.filter((itemId) => itemId !== catId)
      : [...categoriaIds, catId];
    setValue('categoriaIds', updated);
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-text">
          {isEdit ? ptBR.admin.editDocument : ptBR.admin.newDocument}
        </h1>
        {!isEdit && hasDraft && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-text-muted">Rascunho salvo automaticamente</span>
            <button
              type="button"
              onClick={clearDraft}
              className="text-danger hover:underline"
            >
              Descartar rascunho
            </button>
          </div>
        )}
      </div>

      <div className="mb-6 flex items-center justify-between">
        {documentSteps.map((label, index) => (
          <div key={label} className="flex flex-1 flex-col items-center">
            <div
              className={clsx(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                index <= step ? 'bg-primary text-primary-contrast' : 'bg-surface-alt text-text-muted'
              )}
            >
              {index + 1}
            </div>
            <span className="mt-1 hidden text-xs sm:block">{label}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="min-h-[400px]">
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

        <div className="mt-6 flex justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
          >
            {ptBR.common.previous}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => navigate('/admin/documentos')}>
              {ptBR.common.cancel}
            </Button>
            <Button type="submit" variant="primary" isLoading={saveMutation.isPending}>
              {step === documentSteps.length - 1 ? ptBR.common.save : ptBR.common.next}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
