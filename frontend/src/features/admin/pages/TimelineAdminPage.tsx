import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2 } from 'lucide-react';
import adminApi from '../api/adminApi';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { DateInput } from '@/shared/components/DateInput';
import { Card } from '@/shared/components/Card';
import { Modal } from '@/shared/components/Modal';
import { Loading } from '@/shared/components/Loading';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import ptBR from '@/shared/i18n/pt-BR';
import { formatTimelineDate } from '@/shared/lib/formatDate';
import { TimelineEvent } from '@/shared/types';

const PRECISION_OPTIONS = [
  { value: 'dia', label: 'Dia' },
  { value: 'mes', label: 'Mês' },
  { value: 'ano', label: 'Ano' },
  { value: 'decada', label: 'Década' },
  { value: 'seculo', label: 'Século' },
  { value: 'desconhecida', label: 'Desconhecida' },
];

export function TimelineAdminPage() {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TimelineEvent | null>(null);
  const [form, setForm] = useState<{
    titulo: string;
    descricao: string;
    dataEvento: string;
    dataPrecisao: string;
    imagemDestaque: File | null;
    documentoId: string;
    ordem: number;
    destaque: boolean;
  }>({
    titulo: '',
    descricao: '',
    dataEvento: '',
    dataPrecisao: 'dia',
    imagemDestaque: null,
    documentoId: '',
    ordem: 0,
    destaque: false,
  });
  const queryClient = useQueryClient();

  const {
    data: events,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-timeline'],
    queryFn: adminApi.timeline,
  });

  const { data: documents } = useQuery({
    queryKey: ['admin-documents-select'],
    queryFn: () => adminApi.documents({ limit: 200 }),
    enabled: showModal,
  });

  const buildFormData = () => {
    const data = new FormData();
    data.append('titulo', form.titulo);
    data.append('descricao', form.descricao);
    data.append('data_evento', form.dataEvento);
    data.append('data_precisao', form.dataPrecisao);
    data.append('destaque', String(form.destaque));
    data.append('ordem', String(form.ordem));
    if (form.documentoId) {
      data.append('documento', form.documentoId);
    }
    if (form.imagemDestaque) {
      data.append('imagem_destaque', form.imagemDestaque);
    }
    return data;
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? adminApi.updateTimelineEvent(editing.id, buildFormData())
        : adminApi.createTimelineEvent(buildFormData()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-timeline'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteTimelineEvent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-timeline'] }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      titulo: '',
      descricao: '',
      dataEvento: '',
      dataPrecisao: 'dia',
      imagemDestaque: null,
      documentoId: '',
      ordem: 0,
      destaque: false,
    });
    setShowModal(true);
  };

  const openEdit = (event: TimelineEvent) => {
    setEditing(event);
    setForm({
      titulo: event.titulo,
      descricao: event.descricao || '',
      dataEvento: event.dataEvento,
      dataPrecisao: event.dataPrecisao,
      imagemDestaque: null,
      documentoId: event.documentoId || '',
      ordem: event.ordem,
      destaque: event.destaque,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  if (isLoading) return <Loading fullScreen />;
  if (error) return <ErrorMessage onRetry={refetch} />;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{ptBR.admin.timeline}</h1>
        <Button variant="primary" onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {ptBR.common.create}
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">Título</th>
              <th className="px-4 py-3 font-semibold">Data</th>
              <th className="px-4 py-3 font-semibold">Destaque</th>
              <th className="px-4 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {events?.map((event) => (
              <tr key={event.id}>
                <td className="px-4 py-3 font-medium">{event.titulo}</td>
                <td className="px-4 py-3">
                  {formatTimelineDate(event.dataEvento, event.dataPrecisao)}
                </td>
                <td className="px-4 py-3">{event.destaque ? 'Sim' : 'Não'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(event)}
                      className="rounded p-1.5 text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Deseja excluir este evento?')) deleteMutation.mutate(event.id);
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
        title={editing ? 'Editar evento' : 'Novo evento'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal}>
              {ptBR.common.cancel}
            </Button>
            <Button variant="primary" onClick={handleSubmit} isLoading={saveMutation.isPending}>
              {ptBR.common.save}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Título *"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
          />
          <div>
            <label htmlFor="event-desc" className="label">
              Descrição
            </label>
            <textarea
              id="event-desc"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              className="input min-h-[80px]"
            />
          </div>
          <DateInput
            label="Data *"
            value={form.dataEvento}
            onChange={(e) => setForm({ ...form, dataEvento: e.target.value })}
          />
          <div>
            <label htmlFor="event-precision" className="label">
              Precisão
            </label>
            <select
              id="event-precision"
              value={form.dataPrecisao}
              onChange={(e) => setForm({ ...form, dataPrecisao: e.target.value })}
              className="input"
            >
              {PRECISION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="event-document" className="label">
              Documento relacionado
            </label>
            <select
              id="event-document"
              value={form.documentoId}
              onChange={(e) => setForm({ ...form, documentoId: e.target.value })}
              className="input"
            >
              <option value="">Nenhum</option>
              {documents?.dados.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.titulo}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Ordem"
            type="number"
            value={String(form.ordem)}
            onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })}
          />
          <div>
            <label htmlFor="event-image" className="label">
              Imagem de destaque
            </label>
            <input
              id="event-image"
              type="file"
              accept="image/*"
              onChange={(e) =>
                setForm({ ...form, imagemDestaque: e.target.files?.[0] || null })
              }
              className="input"
            />
            {form.imagemDestaque && (
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {form.imagemDestaque.name}
              </p>
            )}
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.destaque}
              onChange={(e) => setForm({ ...form, destaque: e.target.checked })}
            />
            <span className="text-sm">Destaque</span>
          </label>
        </form>
      </Modal>
    </>
  );
}
