import { Pencil } from 'lucide-react';

interface EditButtonProps {
  onClick?: () => void;
  label?: string;
  className?: string;
}

export function EditButton({ onClick, label = 'Editar', className = '' }: EditButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded bg-brand-600 px-2 py-0.5 text-xs font-medium leading-none text-white shadow-sm hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${className}`}
      title={label}
      aria-label={label}
    >
      <Pencil className="h-3 w-3" aria-hidden="true" />
      <span className="hidden sm:inline leading-none">{label}</span>
    </button>
  );
}
