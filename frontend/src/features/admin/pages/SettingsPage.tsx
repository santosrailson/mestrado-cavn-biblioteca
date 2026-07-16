import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import adminApi from '../api/adminApi';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { Skeleton } from '@/shared/components/Skeleton';
import { SectionHeader } from '@/shared/components/Section';
import { Breadcrumb } from '@/shared/components/Breadcrumb';
import { useToast } from '@/shared/hooks/useToast';
import { getSettingMeta, GROUP_ORDER } from '@/shared/lib/settingsLabels';
import { SYSTEM_CONFIG_KEY } from '@/shared/hooks/useSystemConfig';
import { Configuracao } from '@/shared/types';
import { useLocale } from '@/shared/i18n';

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLocale();

  const {
    data: settings,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: adminApi.settings,
    staleTime: Infinity,
    refetchOnWindowFocus: true,
  });

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // Guarda a última versão do servidor que foi sincronizada com o draft.
  // Usamos isso para preservar digitação em andamento quando um refetch
  // acontecer, mas atualizar campos que o usuário ainda não alterou.
  const lastServerRef = useRef<Configuracao[] | null>(null);

  useEffect(() => {
    if (!settings) return;

    const lastMap = new Map(lastServerRef.current?.map((s) => [s.chave, s.valor]) ?? []);

    setDraft((prev) => {
      const next = { ...prev };
      settings.forEach((s) => {
        const serverVal = s.valor;
        const previousServerVal = lastMap.get(s.chave);

        if (previousServerVal === undefined) {
          // Primeira carga (ex.: após refresh): espelha o servidor.
          next[s.chave] = serverVal;
        } else if (previousServerVal !== serverVal && prev[s.chave] === previousServerVal) {
          // O servidor mudou e o usuário não editou este campo desde a última
          // sincronização: atualiza o draft com o valor mais recente.
          next[s.chave] = serverVal;
        }
        // Caso contrário, o usuário está editando este campo; mantém o draft.
      });
      return next;
    });

    lastServerRef.current = settings;
  }, [settings]);

  if (isLoading) {
    return (
      <>
        <Breadcrumb items={[{ label: t.admin.settings }]} className="mb-6" />
        <SectionHeader
          title={t.settings.title}
          titleId="settings-title"
          subtitle={t.settings.subtitle}
        />
        <div className="grid gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Breadcrumb items={[{ label: t.admin.settings }]} className="mb-6" />
        <ErrorMessage onRetry={refetch} />
      </>
    );
  }

  if (!settings || settings.length === 0) {
    return (
      <>
        <Breadcrumb items={[{ label: t.admin.settings }]} className="mb-6" />
        <p className="text-sm text-[var(--color-text-muted)]">{t.admin.noSettings}</p>
      </>
    );
  }

  const grouped = GROUP_ORDER.reduce<Record<string, Configuracao[]>>((acc, group) => {
    const items = settings.filter((s) => getSettingMeta(s.chave).group === group);
    if (items.length) acc[group] = items;
    return acc;
  }, {});

  const serverValue = (chave: string) => settings.find((s) => s.chave === chave)?.valor ?? '';
  const isDirty = (chave: string) => (draft[chave] ?? '') !== serverValue(chave);
  const isGroupDirty = (group: string) => grouped[group]?.some((s) => isDirty(s.chave)) ?? false;

  const updateDraft = (chave: string, valor: string) => {
    setDraft((prev) => ({ ...prev, [chave]: valor }));
  };

  const discardGroup = (group: string) => {
    setDraft((prev) => {
      const next = { ...prev };
      grouped[group]?.forEach((s) => {
        next[s.chave] = serverValue(s.chave);
      });
      return next;
    });
  };

  const saveGroup = async (group: string) => {
    const changed = grouped[group]?.filter((s) => isDirty(s.chave)) ?? [];
    if (!changed.length) return;

    setSaving((prev) => ({ ...prev, [group]: true }));
    try {
      const results = await Promise.all(
        changed.map((s) => adminApi.updateSetting(s.chave, draft[s.chave]))
      );

      // Atualiza ambos os caches com os valores confirmados pelo servidor.
      const savedMap = Object.fromEntries(results.map((r) => [r.chave, r]));
      const allUpdated = settings.map((s) => savedMap[s.chave] ?? s);
      queryClient.setQueryData(['admin-settings'], allUpdated);
      queryClient.setQueryData(SYSTEM_CONFIG_KEY, allUpdated);

      // Mantém o draft e o snapshot do servidor alinhados com o valor salvo,
      // evitando que o campo fique marcado como alteração pendente.
      setDraft((prev) => {
        const next = { ...prev };
        results.forEach((r) => {
          next[r.chave] = r.valor;
        });
        return next;
      });
      lastServerRef.current = allUpdated;

      // Aplica CSS vars imediatamente.
      results.forEach((r) => {
        if (r.chave === 'site.cor_primaria') {
          document.documentElement.style.setProperty('--color-primary', r.valor);
        }
      });

      const entity =
        changed.length === 1
          ? t.admin.settings.toLowerCase()
          : `${changed.length} ${t.admin.settings.toLowerCase()}`;
      toast(t.admin.saveSuccess.replace('{entity}', entity), 'success');
    } catch {
      toast(t.admin.saveFailed, 'error');
    } finally {
      setSaving((prev) => ({ ...prev, [group]: false }));
    }
  };

  return (
    <>
      <Breadcrumb items={[{ label: t.admin.settings }]} className="mb-6" />
      <SectionHeader
        title={t.settings.title}
        titleId="settings-title"
        subtitle={t.settings.subtitle}
      />

      <div className="grid gap-10">
        {Object.entries(grouped).map(([group, items]) => {
          const dirty = isGroupDirty(group);
          const isSaving = saving[group] ?? false;

          return (
            <section key={group}>
              <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-lg font-semibold text-slate-700">
                  {t.settings.groups[group as keyof typeof t.settings.groups] ?? group}
                  {dirty && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {t.settings.pendingChanges}
                    </span>
                  )}
                </h2>
                {dirty && (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => discardGroup(group)}
                      disabled={isSaving}
                    >
                      {t.admin.discard}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => saveGroup(group)}
                      isLoading={isSaving}
                    >
                      {t.admin.saveGroup.replace(
                        '{group}',
                        (
                          t.settings.groups[group as keyof typeof t.settings.groups] ?? group
                        ).toLowerCase()
                      )}
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid gap-4">
                {items.map((setting) => {
                  const meta = getSettingMeta(setting.chave);
                  const inputType =
                    meta.inputType ?? (setting.tipo === 'boolean' ? 'boolean' : 'text');
                  const value = draft[setting.chave] ?? '';
                  const changed = isDirty(setting.chave);

                  return (
                    <Card
                      key={setting.id}
                      className={changed ? 'border-amber-300 bg-amber-50/40' : ''}
                    >
                      <label htmlFor={`setting-${setting.chave}`} className="label">
                        {t.settings.labels[setting.chave as keyof typeof t.settings.labels] ??
                          meta.label}
                        {changed && <span className="ml-1 text-amber-600">*</span>}
                      </label>
                      {setting.descricao && (
                        <p className="mb-2 text-xs text-[var(--color-text-muted)]">
                          {setting.descricao}
                        </p>
                      )}

                      {inputType === 'boolean' ? (
                        <select
                          id={`setting-${setting.chave}`}
                          value={value}
                          onChange={(e) => updateDraft(setting.chave, e.target.value)}
                          className="input max-w-xs"
                        >
                          <option value="true">{t.admin.enabled}</option>
                          <option value="false">{t.admin.disabled}</option>
                        </select>
                      ) : inputType === 'color' ? (
                        <div className="flex items-center gap-3">
                          <input
                            id={`setting-${setting.chave}`}
                            type="color"
                            value={value}
                            onChange={(e) => updateDraft(setting.chave, e.target.value)}
                            className="h-10 w-14 cursor-pointer rounded border border-border bg-bg p-0.5"
                          />
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => updateDraft(setting.chave, e.target.value)}
                            maxLength={7}
                            placeholder="#000000"
                            className="input w-36 font-mono uppercase"
                          />
                          <span
                            className="h-8 w-8 rounded-full border border-border shadow-sm"
                            style={{ backgroundColor: value }}
                          />
                          {changed && (
                            <span className="text-xs text-[var(--color-text-muted)]">
                              {t.settings.previous}:{' '}
                              <span className="font-mono">{serverValue(setting.chave)}</span>
                            </span>
                          )}
                        </div>
                      ) : inputType === 'textarea' ? (
                        <textarea
                          id={`setting-${setting.chave}`}
                          value={value}
                          onChange={(e) => updateDraft(setting.chave, e.target.value)}
                          className="input min-h-[80px]"
                        />
                      ) : (
                        <input
                          id={`setting-${setting.chave}`}
                          type={inputType}
                          value={value}
                          onChange={(e) => updateDraft(setting.chave, e.target.value)}
                          className="input max-w-lg"
                        />
                      )}
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
