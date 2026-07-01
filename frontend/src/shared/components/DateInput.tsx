import { forwardRef, InputHTMLAttributes, useId } from 'react';
import { Calendar } from 'lucide-react';
import { clsx } from 'clsx';

interface DateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || props.name || generatedId;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="label">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type="date"
            className={clsx(
              'input w-full pr-10',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />
          <Calendar
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]"
            aria-hidden="true"
          />
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

DateInput.displayName = 'DateInput';
