import { Plus } from 'lucide-react';

interface CreateButtonProps {
  onClick?: () => void;
  label: string;
  className?: string;
}

export function CreateButton({ onClick, label, className = '' }: CreateButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${className}`}
      title={label}
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}
