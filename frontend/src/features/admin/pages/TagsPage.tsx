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
import { useLocale } from '@/shared/i18n';
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
  const { t } = useLocale();

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
      toast(t.admin.saveSuccess.replace('{entity}', t.admin.tags.slice(0, -1)), 'success');
      closeModal();
    },
    onError: () => {
      toast(t.admin.saveFailed, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteTag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tags'] });
      toast(t.admin.deleteSuccess.replace('{entity}', t.admin.tags.slice(0, -1)), 'success');
    },
    onError: () => {
      toast(t.admin.deleteFailedGeneric, 'error');
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
        <h1 className="text-2xl font-bold text-slate-900">{t.admin.tags}</h1>
        <Button variant="primary" onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t.common.create}
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">{t.admin.name}</th>
              <th className="px-4 py-3 font-semibold">{t.admin.slug}</th>
              <th className="px-4 py-3 font-semibold">{t.admin.usage}</th>
              <th className="px-4 py-3 font-semibold">{t.admin.actions}</th>
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
                      aria-label={t.common.edit}
                    >
                      <Edit className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(t.admin.deleteConfirm)) deleteMutation.mutate(tag.id);
                      }}
                      className="rounded p-1.5 text-red-600 hover:bg-red-50"
                      aria-label={t.common.delete}
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
        title={
          editing
            ? `${t.common.edit} ${t.admin.tags.slice(0, -1).toLowerCase()}`
            : `${t.admin.new} ${t.admin.tags.slice(0, -1).toLowerCase()}`
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal}>
              {t.common.cancel}
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit(onSubmit)}
              isLoading={saveMutation.isPending}
            >
              {t.common.save}
            </Button>
          </div>
        }
      >
        <Input label={t.admin.tagName} {...register('nome')} error={errors.nome?.message} />
      </Modal>
    </>
  );
}
