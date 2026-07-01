import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminApi from '../api/adminApi';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Modal } from '@/shared/components/Modal';
import { Loading } from '@/shared/components/Loading';
import ptBR from '@/shared/i18n/pt-BR';

interface SiteSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SiteSettingsModal({ isOpen, onClose }: SiteSettingsModalProps) {
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState('');
  const [subtitulo, setSubtitulo] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: adminApi.settings,
    enabled: isOpen,
  });

  useEffect(() => {
    if (settings) {
      setTitulo(settings.find((s) => s.chave === 'site.titulo')?.valor || '');
      setSubtitulo(settings.find((s) => s.chave === 'site.subtitulo')?.valor || '');
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await adminApi.updateSetting('site.titulo', titulo);
      await adminApi.updateSetting('site.subtitulo', subtitulo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
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
      title="Configurações do site"
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
          <Input
            label="Título do site"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
          <div>
            <label htmlFor="site-subtitle" className="label">
              Subtítulo do site
            </label>
            <textarea
              id="site-subtitle"
              value={subtitulo}
              onChange={(e) => setSubtitulo(e.target.value)}
              className="input min-h-[80px]"
            />
          </div>
        </form>
      )}
    </Modal>
  );
}
