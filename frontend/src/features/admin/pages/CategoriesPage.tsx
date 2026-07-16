import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2 } from 'lucide-react';
import adminApi from '../api/adminApi';
import { CategoryFormModal } from '../components/CategoryFormModal';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Loading } from '@/shared/components/Loading';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { useLocale } from '@/shared/i18n';
import { Categoria } from '@/shared/types';

export function CategoriesPage() {
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useLocale();

  const {
    data: categories,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: adminApi.categories,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteCategory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-categories'] }),
  });

  const openCreate = () => {
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (cat: Categoria) => {
    setEditing(cat);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  if (isLoading) return <Loading fullScreen />;
  if (error) return <ErrorMessage onRetry={refetch} />;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t.admin.categories}</h1>
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
              <th className="px-4 py-3 font-semibold">{t.admin.categoryDescription}</th>
              <th className="px-4 py-3 font-semibold">{t.admin.parent}</th>
              <th className="px-4 py-3 font-semibold">{t.admin.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {categories?.map((cat) => (
              <tr key={cat.id}>
                <td className="px-4 py-3 font-medium">{cat.nome}</td>
                <td className="px-4 py-3">{cat.descricao || '-'}</td>
                <td className="px-4 py-3">{cat.pai?.nome || '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(cat)}
                      className="rounded p-1.5 text-blue-600 hover:bg-blue-50"
                      aria-label={t.common.edit}
                    >
                      <Edit className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(t.admin.deleteConfirm)) deleteMutation.mutate(cat.id);
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

      <CategoryFormModal isOpen={showModal} onClose={closeModal} category={editing} />
    </>
  );
}
