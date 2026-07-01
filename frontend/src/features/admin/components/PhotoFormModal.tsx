import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminApi from '../api/adminApi';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Modal } from '@/shared/components/Modal';
import { Loading } from '@/shared/components/Loading';
import ptBR from '@/shared/i18n/pt-BR';
import { Foto, Album } from '@/shared/types';

interface PhotoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  photo?: Foto | null;
  defaultAlbumId?: string;
}

export function PhotoFormModal({ isOpen, onClose, photo, defaultAlbumId }: PhotoFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(photo);
  const [albumId, setAlbumId] = useState(defaultAlbumId || '');
  const [legenda, setLegenda] = useState('');
  const [ordem, setOrdem] = useState(0);
  const [imagem, setImagem] = useState<File | null>(null);

  const { data: albums, isLoading } = useQuery({
    queryKey: ['albums'],
    queryFn: adminApi.albums,
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen) {
      if (photo) {
        setAlbumId(photo.albumId || defaultAlbumId || '');
        setLegenda(photo.legenda || '');
        setOrdem(photo.ordem);
      } else {
        setAlbumId(defaultAlbumId || '');
        setLegenda('');
        setOrdem(0);
      }
      setImagem(null);
    }
  }, [isOpen, photo, defaultAlbumId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('album', albumId);
      formData.append('legenda', legenda);
      formData.append('ordem', String(ordem));
      if (imagem) formData.append('imagem', imagem);
      return isEdit ? adminApi.updatePhoto(photo!.id, formData) : adminApi.createPhoto(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEdit && !imagem) return;
    saveMutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar foto' : 'Nova foto'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {ptBR.common.cancel}
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={saveMutation.isPending}>
            {ptBR.common.save}
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <Loading />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="photo-album" className="label">
              Álbum *
            </label>
            <select
              id="photo-album"
              value={albumId}
              onChange={(e) => setAlbumId(e.target.value)}
              className="input"
            >
              <option value="">Selecione</option>
              {albums?.map((album: Album) => (
                <option key={album.id} value={album.id}>
                  {album.titulo}
                </option>
              ))}
            </select>
          </div>
          <Input label="Legenda" value={legenda} onChange={(e) => setLegenda(e.target.value)} />
          <Input
            label="Ordem"
            type="number"
            value={String(ordem)}
            onChange={(e) => setOrdem(Number(e.target.value))}
          />
          <div>
            <label htmlFor="photo-imagem" className="label">
              Imagem {isEdit ? '' : '*'}
            </label>
            <input
              id="photo-imagem"
              type="file"
              accept="image/*"
              onChange={(e) => setImagem(e.target.files?.[0] || null)}
              className="input"
            />
            {imagem && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{imagem.name}</p>}
          </div>
        </form>
      )}
    </Modal>
  );
}
