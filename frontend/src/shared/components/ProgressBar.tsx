interface ProgressBarProps {
  value?: number;
  label: string;
  detail?: string;
  indeterminate?: boolean;
}

export function ProgressBar({ value, label, detail, indeterminate = false }: ProgressBarProps) {
  const normalized = typeof value === 'number' ? Math.min(100, Math.max(0, value)) : undefined;

  return (
    <div className="space-y-2" aria-label={label} aria-live="polite" aria-busy={indeterminate}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-text">{label}</span>
        {normalized !== undefined && <span className="text-text-muted">{normalized}%</span>}
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        {...(normalized === undefined ? {} : { 'aria-valuenow': normalized })}
        aria-valuetext={normalized === undefined ? 'Em andamento' : `${normalized}%`}
      >
        <div
          className={
            indeterminate
              ? 'progress-value w-1/3 animate-[progress_1.4s_ease-in-out_infinite]'
              : 'progress-value'
          }
          style={indeterminate ? undefined : { width: `${normalized ?? 0}%` }}
        />
      </div>
      {detail && <p className="field-help">{detail}</p>}
    </div>
  );
}
