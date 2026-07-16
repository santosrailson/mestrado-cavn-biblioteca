import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, UserCheck, UserX } from 'lucide-react';
import adminApi from '../api/adminApi';
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage } from '@/shared/lib/getErrorMessage';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Card } from '@/shared/components/Card';
import { Modal } from '@/shared/components/Modal';
import { Loading } from '@/shared/components/Loading';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { EmptyState } from '@/shared/components/EmptyState';
import { useLocale } from '@/shared/i18n';
import { Usuario, PerfilUsuario } from '@/shared/types';
import { clsx } from 'clsx';

const perfis: PerfilUsuario[] = ['catalogador', 'curador', 'administrador'];

const userSchema = (isEdit: boolean) =>
  z.object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('E-mail inválido'),
    perfil: z.enum(['catalogador', 'curador', 'administrador']),
    senha: isEdit ? z.string().optional() : z.string().min(1, 'Senha é obrigatória'),
    ativo: z.boolean().default(true),
  });

type UserFormData = z.infer<ReturnType<typeof userSchema>>;

export function UsersPage() {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLocale();

  const {
    data: users,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminApi.users,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema(Boolean(editing))),
    defaultValues: {
      nome: '',
      email: '',
      perfil: 'catalogador',
      senha: '',
      ativo: true,
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: UserFormData) => {
      const payload: Partial<Usuario> & { senha?: string } = {
        nome: data.nome,
        email: data.email,
        perfil: data.perfil,
        ativo: data.ativo,
      };
      if (data.senha) payload.senha = data.senha;
      return editing
        ? adminApi.updateUser(editing.id, payload)
        : adminApi.createUser(payload as Partial<Usuario> & { senha: string });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast(t.admin.saveSuccess.replace('{entity}', t.admin.user.toLowerCase()), 'success');
      closeModal();
    },
    onError: (error) => {
      toast(getErrorMessage(error, t.admin.saveFailed), 'error');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      adminApi.toggleUserStatus(id, ativo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast(t.admin.statusUpdated, 'success');
    },
    onError: (error) => {
      toast(getErrorMessage(error, t.admin.statusUpdateFailed), 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast(t.admin.userDeleted, 'success');
    },
    onError: (error) => {
      toast(getErrorMessage(error, t.admin.userDeleteFailed), 'error');
    },
  });

  const openCreate = () => {
    setEditing(null);
    reset({ nome: '', email: '', perfil: 'catalogador', senha: '', ativo: true });
    setShowModal(true);
  };

  const openEdit = (user: Usuario) => {
    setEditing(user);
    reset({
      nome: user.nome,
      email: user.email,
      perfil: user.perfil,
      senha: '',
      ativo: user.ativo,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const onSubmit = (data: UserFormData) => {
    saveMutation.mutate(data);
  };

  if (isLoading) return <Loading fullScreen />;
  if (error) return <ErrorMessage onRetry={refetch} />;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t.admin.users}</h1>
        <Button variant="primary" onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t.common.create}
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        {users && users.length === 0 ? (
          <EmptyState title={t.admin.noUsers} description={t.admin.emptyUsersDescription} />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">{t.admin.name}</th>
                <th className="px-4 py-3 font-semibold">{t.auth.email}</th>
                <th className="px-4 py-3 font-semibold">{t.admin.profile}</th>
                <th className="px-4 py-3 font-semibold">{t.admin.status}</th>
                <th className="px-4 py-3 font-semibold">{t.admin.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users?.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-medium">{user.nome}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3 capitalize">{user.perfil}</td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        'rounded px-2 py-1 text-xs font-medium',
                        user.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      )}
                    >
                      {user.ativo ? t.admin.active : t.admin.inactive}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(user)}
                        className="rounded p-1.5 text-blue-600 hover:bg-blue-50"
                        aria-label={t.common.edit}
                      >
                        <Edit className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          toggleStatusMutation.mutate({ id: user.id, ativo: !user.ativo })
                        }
                        className="rounded p-1.5 text-yellow-600 hover:bg-yellow-50"
                        aria-label={user.ativo ? t.admin.inactive : t.admin.active}
                      >
                        {user.ativo ? (
                          <UserX className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <UserCheck className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(t.admin.deleteConfirm)) deleteMutation.mutate(user.id);
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
        )}
      </Card>

      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={
          editing
            ? `${t.common.edit} ${t.admin.user.toLowerCase()}`
            : `${t.admin.new} ${t.admin.user.toLowerCase()}`
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label={`${t.admin.name} *`} {...register('nome')} error={errors.nome?.message} />
          <Input
            label={`${t.auth.email} *`}
            type="email"
            {...register('email')}
            error={errors.email?.message}
          />
          <div>
            <label htmlFor="perfil" className="label">
              {t.admin.permissionProfile}
            </label>
            <select id="perfil" {...register('perfil')} className="input">
              {perfis.map((p) => (
                <option key={p} value={p}>
                  {t.admin.profiles[p]}
                </option>
              ))}
            </select>
          </div>
          <Input
            label={editing ? t.admin.newPasswordKeep : `${t.auth.password} *`}
            type="password"
            {...register('senha')}
          />
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register('ativo')} />
            <span className="text-sm">{t.admin.active}</span>
          </label>
        </form>
      </Modal>
    </>
  );
}
