import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminApi from '../api/adminApi';
import { useToast } from '@/shared/hooks/useToast';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Modal } from '@/shared/components/Modal';
import { Loading } from '@/shared/components/Loading';
import ptBR from '@/shared/i18n/pt-BR';
import { Categoria } from '@/shared/types';

const categorySchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional(),
  icone: z.string().optional(),
  paiId: z.string().optional(),
  ativo: z.boolean().default(true),
  ordem: z.number().int().default(0),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: Categoria | null;
}

export function CategoryFormModal({ isOpen, onClose, category }: CategoryFormModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEdit = Boolean(category);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: adminApi.categories,
    enabled: isOpen,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      nome: '',
      descricao: '',
      icone: '',
      paiId: '',
      ativo: true,
      ordem: 0,
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        nome: category?.nome || '',
        descricao: category?.descricao || '',
        icone: category?.icone || '',
        paiId: category?.paiId ? String(category.paiId) : '',
        ativo: category?.ativo ?? true,
        ordem: category?.ordem ?? 0,
      });
    }
  }, [isOpen, category, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: CategoryFormData) => {
      const payload: Partial<Categoria> = {
        nome: data.nome,
        descricao: data.descricao,
        icone: data.icone,
        paiId: data.paiId || undefined,
        ativo: data.ativo,
        ordem: data.ordem,
      };
      return isEdit && category
        ? adminApi.updateCategory(category.id, payload)
        : adminApi.createCategory(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast(
        category ? 'Categoria atualizada com sucesso.' : 'Categoria criada com sucesso.',
        'success'
      );
      onClose();
    },
    onError: () => {
      toast('Não foi possível salvar a categoria. Tente novamente.', 'error');
    },
  });

  const onSubmit = (data: CategoryFormData) => {
    saveMutation.mutate(data);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar categoria' : 'Nova categoria'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {ptBR.common.cancel}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit(onSubmit)}
            isLoading={saveMutation.isPending}
          >
            {ptBR.common.save}
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <Loading />
      ) : (
        <form id="category-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Nome *" {...register('nome')} error={errors.nome?.message} />
          <div>
            <label htmlFor="descricao" className="label">
              Descrição
            </label>
            <textarea id="descricao" {...register('descricao')} className="input min-h-[80px]" />
          </div>
          <Input label="Ícone" {...register('icone')} error={errors.icone?.message} />
          <div>
            <label htmlFor="paiId" className="label">
              Categoria pai
            </label>
            <select id="paiId" {...register('paiId')} className="input">
              <option value="">Nenhuma</option>
              {categories
                ?.filter((c) => c.id !== category?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
            </select>
          </div>
          <Input
            label="Ordem"
            type="number"
            {...register('ordem', { valueAsNumber: true })}
            error={errors.ordem?.message}
          />
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register('ativo')} checked={watch('ativo')} />
            <span className="text-sm">Ativo</span>
          </label>
        </form>
      )}
    </Modal>
  );
}
