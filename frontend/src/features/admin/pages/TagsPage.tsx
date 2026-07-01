import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2 } from 'lucide-react';
import adminApi from '../api/adminApi';
import { useToast } from '@/shared/hooks/useToast';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Card } from '@/shared/components/Card';
import { Modal } from '@/shared/components/Modal';
import { Loading } from '@/shared/components/Loading';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import ptBR from '@/shared/i18n/pt-BR';
import { Tag } from '@/shared/types';

const tagSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
});

type TagFormData = z.infer<typeof tagSchema>;

export function TagsPage() {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Tag | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: tags,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-tags'],
    queryFn: adminApi.tags,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TagFormData>({
    resolver: zodResolver(tagSchema),
    defaultValues: { nome: '' },
  });

  const saveMutation = useMutation({
    mutationFn: (data: TagFormData) => {
      const payload: Partial<Tag> = { nome: data.nome };
      return editing ? adminApi.updateTag(editing.id, payload) : adminApi.createTag(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tags'] });
      toast(editing ? 'Tag atualizada com sucesso.' : 'Tag criada com sucesso.', 'success');
      closeModal();
    },
    onError: () => {
      toast('Não foi possível salvar a tag. Tente novamente.', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteTag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tags'] });
      toast('Tag excluída com sucesso.', 'success');
    },
    onError: () => {
      toast('Não foi possível excluir a tag. Tente novamente.', 'error');
    },
  });

  const openCreate = () => {
    setEditing(null);
    reset({ nome: '' });
    setShowModal(true);
  };

  const openEdit = (tag: Tag) => {
    setEditing(tag);
    reset({ nome: tag.nome });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const onSubmit = (data: TagFormData) => {
    saveMutation.mutate(data);
  };

  if (isLoading) return <Loading fullScreen />;
  if (error) return <ErrorMessage onRetry={refetch} />;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{ptBR.admin.tags}</h1>
        <Button variant="primary" onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {ptBR.common.create}
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">Nome</th>
              <th className="px-4 py-3 font-semibold">Slug</th>
              <th className="px-4 py-3 font-semibold">Uso</th>
              <th className="px-4 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tags?.map((tag) => (
              <tr key={tag.id}>
                <td className="px-4 py-3 font-medium">{tag.nome}</td>
                <td className="px-4 py-3 font-mono text-xs">{tag.slug}</td>
                <td className="px-4 py-3">{tag.contagemUso}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(tag)}
                      className="rounded p-1.5 text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Deseja excluir esta tag?')) deleteMutation.mutate(tag.id);
                      }}
                      className="rounded p-1.5 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editing ? 'Editar tag' : 'Nova tag'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal}>
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
        <Input label="Nome *" {...register('nome')} error={errors.nome?.message} />
      </Modal>
    </>
  );
}
