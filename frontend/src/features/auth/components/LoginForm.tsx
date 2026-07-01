import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import ptBR from '@/shared/i18n/pt-BR';

const loginSchema = z.object({
  email: z.string().email(ptBR.auth.emailRequired),
  password: z.string().min(1, ptBR.auth.passwordRequired),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => void;
  isLoading: boolean;
  error?: Error | null;
}

export function LoginForm({ onSubmit, isLoading, error }: LoginFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Input
        label={ptBR.auth.email}
        type="email"
        autoComplete="email"
        {...register('email')}
        error={errors.email?.message}
      />
      <Input
        label={ptBR.auth.password}
        type="password"
        autoComplete="current-password"
        {...register('password')}
        error={errors.password?.message}
      />
      {error && (
        <p className="rounded bg-red-50 p-2 text-sm text-red-700" role="alert">
          {ptBR.auth.invalidCredentials}
        </p>
      )}
      <Button type="submit" variant="primary" isLoading={isLoading} className="w-full">
        {ptBR.common.login}
      </Button>
    </form>
  );
}
