import { useState } from 'react';
import { UseFormRegister, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { Input } from '@/shared/components/Input';
import { DateInput } from '@/shared/components/DateInput';
import { DocumentFormData } from '../lib/documentSchema';
import { tipoDocumentoOptions, dataPrecisaoOptions } from '../lib/documentFormConstants';
import { Categoria, Autor } from '@/shared/types';
import { X, Plus } from 'lucide-react';

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
}: DocumentFormStepsProps) {
  const [newAuthor, setNewAuthor] = useState('');

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
          <Input label="Título *" {...register('titulo')} error={errors.titulo?.message} />
          <Input label="Título alternativo" {...register('tituloAlternativo')} />
          <Input label="Código de referência" {...register('codigoReferencia')} />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label htmlFor="descricao" className="label">
              Descrição
            </label>
            <textarea id="descricao" {...register('descricao')} className="input min-h-[120px]" />
          </div>
          <div>
            <label htmlFor="resumo" className="label">
              Resumo
            </label>
            <textarea id="resumo" {...register('resumo')} className="input min-h-[80px]" />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <label htmlFor="tipoDocumento" className="label">
              Tipo de documento *
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
            <span className="label">Categorias *</span>
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
            <span className="label">Autores</span>
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
                <span className="text-sm text-[var(--color-text-muted)]">Autores existentes</span>
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
                placeholder="Novo autor"
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
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <DateInput label="Data do documento" {...register('dataDocumento')} />
          <div>
            <label htmlFor="dataPrecisao" className="label">
              Precisão da data
            </label>
            <select id="dataPrecisao" {...register('dataPrecisao')} className="input">
              {dataPrecisaoOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <Input label="Cobertura temporal" {...register('coberturaTemporal')} />
          <Input label="Cobertura espacial" {...register('coberturaEspacial')} />
          <Input label="Idioma" {...register('idioma')} />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div>
            <label htmlFor="arquivo" className="label">
              Arquivo digital
            </label>
            <input
              id="arquivo"
              type="file"
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
              className="input"
            />
            {selectedFile && <p className="mt-1 text-sm text-text-muted">{selectedFile.name}</p>}
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <Input label="Direitos" {...register('direitos')} />
          <Input label="Fonte" {...register('fonte')} />
          <Input label="Relação" {...register('relacao')} />
        </div>
      )}
    </>
  );
}
