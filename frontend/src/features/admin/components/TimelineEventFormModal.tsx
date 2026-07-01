import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminApi from '../api/adminApi';
import { useToast } from '@/shared/hooks/useToast';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { DateInput } from '@/shared/components/DateInput';
import { Modal } from '@/shared/components/Modal';
import { Loading } from '@/shared/components/Loading';
import ptBR from '@/shared/i18n/pt-BR';
import { TimelineEvent } from '@/shared/types';

const PRECISION_OPTIONS = [
  { value: 'dia', label: 'Dia' },
  { value: 'mes', label: 'Mês' },
  { value: 'ano', label: 'Ano' },
  { value: 'decada', label: 'Década' },
  { value: 'seculo', label: 'Século' },
  { value: 'desconhecida', label: 'Desconhecida' },
];

interface TimelineEventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: TimelineEvent | null;
}

export function TimelineEventFormModal({ isOpen, onClose, event }: TimelineEventFormModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEdit = Boolean(event);

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataEvento, setDataEvento] = useState('');
  const [dataPrecisao, setDataPrecisao] = useState('dia');
  const [imagemDestaque, setImagemDestaque] = useState<File | null>(null);
  const [documentoId, setDocumentoId] = useState('');
  const [ordem, setOrdem] = useState(0);
  const [destaque, setDestaque] = useState(false);

  const { data: documents, isLoading: loadingDocuments } = useQuery({
    queryKey: ['admin-documents-select'],
    queryFn: () => adminApi.documents({ limit: 200 }),
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen) {
      if (event) {
        setTitulo(event.titulo);
        setDescricao(event.descricao || '');
        setDataEvento(event.dataEvento);
        setDataPrecisao(event.dataPrecisao);
        setDocumentoId(event.documentoId || '');
        setOrdem(event.ordem);
        setDestaque(event.destaque);
      } else {
        setTitulo('');
        setDescricao('');
        setDataEvento('');
        setDataPrecisao('dia');
        setDocumentoId('');
        setOrdem(0);
        setDestaque(false);
      }
      setImagemDestaque(null);
    }
  }, [isOpen, event]);

  const buildFormData = () => {
    const data = new FormData();
    data.append('titulo', titulo);
    data.append('descricao', descricao);
    data.append('data_evento', dataEvento);
    data.append('data_precisao', dataPrecisao);
    data.append('destaque', String(destaque));
    data.append('ordem', String(ordem));
    if (documentoId) {
      data.append('documento', documentoId);
    }
    if (imagemDestaque) {
      data.append('imagem_destaque', imagemDestaque);
    }
    return data;
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      isEdit && event
        ? adminApi.updateTimelineEvent(event.id, buildFormData())
        : adminApi.createTimelineEvent(buildFormData()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-timeline'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      toast(event ? 'Evento atualizado com sucesso.' : 'Evento criado com sucesso.', 'success');
      onClose();
    },
    onError: () => {
      toast('Não foi possível salvar o evento. Tente novamente.', 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || !dataEvento) return;
    saveMutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar evento' : 'Novo evento'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {ptBR.common.cancel}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={saveMutation.isPending}
          >
            {ptBR.common.save}
          </Button>
        </div>
      }
    >
      {loadingDocuments ? (
        <Loading />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Título *"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
          <div>
            <label htmlFor="event-desc" className="label">
              Descrição
            </label>
            <textarea
              id="event-desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="input min-h-[80px]"
            />
          </div>
          <DateInput
            label="Data *"
            value={dataEvento}
            onChange={(e) => setDataEvento(e.target.value)}
          />
          <div>
            <label htmlFor="event-precision" className="label">
              Precisão
            </label>
            <select
              id="event-precision"
              value={dataPrecisao}
              onChange={(e) => setDataPrecisao(e.target.value)}
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
              value={documentoId}
              onChange={(e) => setDocumentoId(e.target.value)}
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
            value={String(ordem)}
            onChange={(e) => setOrdem(Number(e.target.value))}
          />
          <div>
            <label htmlFor="event-image" className="label">
              Imagem de destaque
            </label>
            <input
              id="event-image"
              type="file"
              accept="image/*"
              onChange={(e) => setImagemDestaque(e.target.files?.[0] || null)}
              className="input"
            />
            {imagemDestaque && (
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {imagemDestaque.name}
              </p>
            )}
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={destaque}
              onChange={(e) => setDestaque(e.target.checked)}
            />
            <span className="text-sm">Destaque</span>
          </label>
        </form>
      )}
    </Modal>
  );
}
