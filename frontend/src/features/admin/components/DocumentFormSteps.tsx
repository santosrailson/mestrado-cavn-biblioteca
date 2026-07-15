import { useState } from 'react';
import { UseFormRegister, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { Input } from '@/shared/components/Input';
import { DateInput } from '@/shared/components/DateInput';
import { DocumentFormData } from '../lib/documentSchema';
import { getTipoDocumentoOptions, getDataPrecisaoOptions } from '../lib/documentFormConstants';
import { useLocale } from '@/shared/i18n';
import { Categoria, Autor } from '@/shared/types';
import { X, Plus } from 'lucide-react';
import { ProgressBar } from '@/shared/components/ProgressBar';

interface DocumentFormStepsProps {
  step: number;
  register: UseFormRegister<DocumentFormData>;
  errors: FieldErrors<DocumentFormData>;
  setValue: UseFormSetValue<DocumentFormData>;
  categories?: Categoria[];
  categoriaIds: string[];
  toggleCategory: (id: string) => void;
  autores: string[];
  availableAuthors?: Autor[];
  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
  uploadProgress?: number;
  uploadStage?: string;
  uploadError?: string;
  onRetryUpload?: () => void;
}

export function DocumentFormSteps({
  step,
  register,
  errors,
  setValue,
  categories,
  categoriaIds,
  toggleCategory,
  autores,
  availableAuthors,
  selectedFile,
  onFileChange,
  uploadProgress,
  uploadStage,
  uploadError,
  onRetryUpload,
}: DocumentFormStepsProps) {
  const [newAuthor, setNewAuthor] = useState('');
  const { t } = useLocale();
  const tipoDocumentoOptions = getTipoDocumentoOptions(t);
  const dataPrecisaoOptions = getDataPrecisaoOptions(t);
  const formatLabel = (template: string, value: string) => template.replace('{name}', value);

  const addAuthor = (nome: string) => {
    const trimmed = nome.trim();
    if (!trimmed || autores.includes(trimmed)) return;
    setValue('autores', [...autores, trimmed], { shouldValidate: true });
  };

  const removeAuthor = (nome: string) => {
    setValue(
      'autores',
      autores.filter((a) => a !== nome),
      { shouldValidate: true }
    );
  };

  return (
    <>
      {step === 0 && (
        <div className="space-y-4">
          <Input
            label={t.admin.form.title}
            {...register('titulo')}
            error={errors.titulo?.message}
          />
          <Input label={t.admin.form.alternativeTitle} {...register('tituloAlternativo')} />
          <Input label={t.admin.form.referenceCode} {...register('codigoReferencia')} />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label htmlFor="descricao" className="label">
              {t.admin.form.description}
            </label>
            <textarea id="descricao" {...register('descricao')} className="input min-h-[120px]" />
          </div>
          <div>
            <label htmlFor="resumo" className="label">
              {t.admin.form.summary}
            </label>
            <textarea id="resumo" {...register('resumo')} className="input min-h-[80px]" />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <label htmlFor="tipoDocumento" className="label">
              {t.admin.form.documentType}
            </label>
            <select id="tipoDocumento" {...register('tipoDocumento')} className="input">
              {tipoDocumentoOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="label">{t.admin.form.categoriesRequired}</span>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {categories?.map((cat) => (
                <label
                  key={cat.id}
                  className="flex items-center gap-2 rounded border border-border p-2"
                >
                  <input
                    type="checkbox"
                    checked={categoriaIds.includes(cat.id)}
                    onChange={() => toggleCategory(cat.id)}
                  />
                  <span className="text-sm">{cat.nome}</span>
                </label>
              ))}
            </div>
            {errors.categoriaIds && (
              <p className="mt-1 text-sm text-red-600">{errors.categoriaIds.message}</p>
            )}
          </div>

          <div>
            <span className="label">{t.admin.form.authors}</span>
            <div className="mb-3 flex flex-wrap gap-2">
              {autores.map((autor) => (
                <span
                  key={autor}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-sm"
                >
                  {autor}
                  <button
                    type="button"
                    onClick={() => removeAuthor(autor)}
                    className="text-slate-500 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>

            {availableAuthors && availableAuthors.length > 0 && (
              <div className="mb-3">
                <span className="text-sm text-[var(--color-text-muted)]">
                  {t.admin.form.existingAuthors}
                </span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {availableAuthors.map((autor) => (
                    <button
                      key={autor.id}
                      type="button"
                      onClick={() => addAuthor(autor.nome)}
                      disabled={autores.includes(autor.nome)}
                      className="rounded border border-border px-2 py-1 text-sm hover:bg-surface disabled:opacity-50"
                    >
                      + {autor.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder={t.admin.form.newAuthor}
                value={newAuthor}
                onChange={(e) => setNewAuthor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addAuthor(newAuthor);
                    setNewAuthor('');
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  addAuthor(newAuthor);
                  setNewAuthor('');
                }}
                className="btn-outline flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                {t.admin.form.addAuthor}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <DateInput label={t.admin.form.documentDate} {...register('dataDocumento')} />
          <div>
            <label htmlFor="dataPrecisao" className="label">
              {t.admin.form.datePrecision}
            </label>
            <select id="dataPrecisao" {...register('dataPrecisao')} className="input">
              {dataPrecisaoOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <Input label={t.admin.form.temporalCoverage} {...register('coberturaTemporal')} />
          <Input label={t.admin.form.spatialCoverage} {...register('coberturaEspacial')} />
          <Input label={t.admin.form.language} {...register('idioma')} />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div>
            <label htmlFor="arquivo" className="label">
              {t.admin.form.digitalFile}
            </label>
            <input
              id="arquivo"
              type="file"
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
              className="input"
              aria-describedby="arquivo-help"
            />
            <p id="arquivo-help" className="field-help">
              {t.admin.form.fileHelp}
            </p>
            {selectedFile && (
              <p className="mt-1 text-sm text-text-muted">
                {formatLabel(t.admin.form.selectedFile, selectedFile.name)}
              </p>
            )}
            {uploadStage && (
              <div className="mt-4 rounded-lg border border-border bg-surface p-3">
                <ProgressBar
                  label={uploadStage}
                  value={uploadProgress}
                  indeterminate={uploadProgress === undefined}
                  detail={uploadProgress === 100 ? t.admin.form.processingDetail : undefined}
                />
              </div>
            )}
            {uploadError && (
              <div
                className="mt-3 rounded-lg border border-danger-border bg-danger-bg p-3"
                role="alert"
              >
                <p className="text-sm font-medium text-danger-text">{uploadError}</p>
                {onRetryUpload && (
                  <button
                    type="button"
                    className="btn-outline mt-2 text-sm"
                    onClick={onRetryUpload}
                  >
                    {t.admin.form.retryUpload}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <Input label={t.admin.form.rights} {...register('direitos')} />
          <Input label={t.admin.form.source} {...register('fonte')} />
          <Input label={t.admin.form.relation} {...register('relacao')} />
        </div>
      )}
    </>
  );
}
