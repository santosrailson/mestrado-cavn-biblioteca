import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import adminApi from '../api/adminApi';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Modal } from '@/shared/components/Modal';
import { useLocale } from '@/shared/i18n';
import { Album } from '@/shared/types';

interface AlbumFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  album?: Album | null;
}

export function AlbumFormModal({ isOpen, onClose, album }: AlbumFormModalProps) {
  const queryClient = useQueryClient();
  const { t } = useLocale();
  const isEdit = Boolean(album);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [destaque, setDestaque] = useState(false);
  const [capa, setCapa] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (album) {
        setTitulo(album.titulo);
        setDescricao(album.descricao || '');
        setDestaque(album.destaque);
      } else {
        setTitulo('');
        setDescricao('');
        setDestaque(false);
      }
      setCapa(null);
    }
  }, [isOpen, album]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('titulo', titulo);
      formData.append('descricao', descricao);
      formData.append('destaque', String(destaque));
      if (capa) formData.append('capa', capa);
      return isEdit ? adminApi.updateAlbum(album!.slug, formData) : adminApi.createAlbum(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEdit
          ? `${t.common.edit} ${t.gallery.album.toLowerCase()}`
          : `${t.admin.new} ${t.gallery.album.toLowerCase()}`
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={saveMutation.isPending}>
            {t.common.save}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={`${t.admin.title} *`}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <div>
          <label htmlFor="album-desc" className="label">
            {t.admin.categoryDescription}
          </label>
          <textarea
            id="album-desc"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="input min-h-[80px]"
          />
        </div>
        <div>
          <label htmlFor="album-capa" className="label">
            {t.gallery.cover}
          </label>
          <input
            id="album-capa"
            type="file"
            accept="image/*"
            onChange={(e) => setCapa(e.target.files?.[0] || null)}
            className="input"
          />
          {capa && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{capa.name}</p>}
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={destaque}
            onChange={(e) => setDestaque(e.target.checked)}
          />
          <span className="text-sm">{t.admin.featured}</span>
        </label>
      </form>
    </Modal>
  );
}
