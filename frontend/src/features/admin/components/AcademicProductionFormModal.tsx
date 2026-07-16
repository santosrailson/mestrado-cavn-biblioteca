import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import adminApi from '../api/adminApi';
import { useToast } from '@/shared/hooks/useToast';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Modal } from '@/shared/components/Modal';
import { useLocale } from '@/shared/i18n';
import { ProducaoAcademica, TipoProducaoAcademica } from '@/shared/types';

interface AcademicProductionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  producao?: ProducaoAcademica | null;
}

export function AcademicProductionFormModal({
  isOpen,
  onClose,
  producao,
}: AcademicProductionFormModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLocale();
  const tiposProducao: { value: TipoProducaoAcademica; label: string }[] = [
    'dissertacao',
    'tese',
    'artigo',
    'tcc',
    'livro',
    'capitulo',
    'outro',
  ].map((value, index) => ({
    value: value as TipoProducaoAcademica,
    label: t.academic.types[index + 1],
  }));
  const isEdit = Boolean(producao);

  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<TipoProducaoAcademica>('outro');
  const [autor, setAutor] = useState('');
  const [orientador, setOrientador] = useState('');
  const [ano, setAno] = useState(new Date().getFullYear());
  const [resumo, setResumo] = useState('');
  const [palavrasChave, setPalavrasChave] = useState('');
  const [urlAcesso, setUrlAcesso] = useState('');
  const [citacaoAbnt, setCitacaoAbnt] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [arquivo, setArquivo] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (producao) {
        setTitulo(producao.titulo);
        setTipo(producao.tipo);
        setAutor(producao.autor);
        setOrientador(producao.orientador || '');
        setAno(producao.ano);
        setResumo(producao.resumo || '');
        setPalavrasChave(producao.palavrasChave || '');
        setUrlAcesso(producao.urlAcesso || '');
        setCitacaoAbnt(producao.citacaoAbnt || '');
        setAtivo(producao.ativo);
      } else {
        setTitulo('');
        setTipo('outro');
        setAutor('');
        setOrientador('');
        setAno(new Date().getFullYear());
        setResumo('');
        setPalavrasChave('');
        setUrlAcesso('');
        setCitacaoAbnt('');
        setAtivo(true);
      }
      setArquivo(null);
    }
  }, [isOpen, producao]);

  const buildFormData = () => {
    const data = new FormData();
    data.append('titulo', titulo);
    data.append('tipo', tipo);
    data.append('autor', autor);
    data.append('ano', String(ano));
    data.append('ativo', String(ativo));
    if (orientador) data.append('orientador', orientador);
    if (resumo) data.append('resumo', resumo);
    if (palavrasChave) data.append('palavras_chave', palavrasChave);
    if (urlAcesso) data.append('url_acesso', urlAcesso);
    if (citacaoAbnt) data.append('citacao_abnt', citacaoAbnt);
    if (arquivo) data.append('arquivo', arquivo);
    return data;
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      isEdit && producao
        ? adminApi.updateProducaoAcademica(producao.slug, buildFormData())
        : adminApi.createProducaoAcademica(buildFormData()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['producoes-academicas'] });
      toast(t.admin.saveSuccess.replace('{entity}', t.navigation.academic), 'success');
      onClose();
    },
    onError: () => {
      toast(t.admin.saveFailed, 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || !autor || !ano) return;
    saveMutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEdit
          ? `${t.common.edit} ${t.navigation.academic.toLowerCase()}`
          : `${t.admin.new} ${t.navigation.academic.toLowerCase()}`
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
          <label htmlFor="tipo" className="label">
            {t.admin.type} *
          </label>
          <select
            id="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoProducaoAcademica)}
            className="input"
          >
            {tiposProducao.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <Input
          label={`${t.academic.author} *`}
          value={autor}
          onChange={(e) => setAutor(e.target.value)}
        />
        <Input
          label={t.academic.advisor}
          value={orientador}
          onChange={(e) => setOrientador(e.target.value)}
        />
        <Input
          label={`${t.academic.year} *`}
          type="number"
          value={String(ano)}
          onChange={(e) => setAno(Number(e.target.value))}
        />
        <div>
          <label htmlFor="resumo" className="label">
            {t.admin.form.summary}
          </label>
          <textarea
            id="resumo"
            value={resumo}
            onChange={(e) => setResumo(e.target.value)}
            className="input min-h-[80px]"
          />
        </div>
        <Input
          label={t.academic.keywords}
          value={palavrasChave}
          onChange={(e) => setPalavrasChave(e.target.value)}
        />
        <Input
          label={t.academic.access}
          type="url"
          value={urlAcesso}
          onChange={(e) => setUrlAcesso(e.target.value)}
        />
        <div>
          <label htmlFor="citacaoAbnt" className="label">
            {t.academic.citation}
          </label>
          <textarea
            id="citacaoAbnt"
            value={citacaoAbnt}
            onChange={(e) => setCitacaoAbnt(e.target.value)}
            className="input min-h-[80px]"
          />
        </div>
        <div>
          <label htmlFor="arquivo" className="label">
            {t.admin.form.digitalFile}
          </label>
          <input
            id="arquivo"
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => setArquivo(e.target.files?.[0] || null)}
            className="input"
          />
          {arquivo && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{arquivo.name}</p>}
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          <span className="text-sm">{t.admin.active}</span>
        </label>
      </form>
    </Modal>
  );
}
