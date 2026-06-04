/** 로그인 폼 (FE-04) */
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginValues } from './authSchemas';
import { useLoginMutation } from './useAuthMutations';

const inputClass =
  'mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none';

export function LoginForm(): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const mutation = useLoginMutation();

  return (
    <form className="space-y-4" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
      {mutation.isError && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {mutation.error.message}
        </p>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700">
          이메일
          <input type="email" autoComplete="email" className={inputClass} {...register('email')} />
        </label>
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">
          비밀번호
          <input
            type="password"
            autoComplete="current-password"
            className={inputClass}
            {...register('password')}
          />
        </label>
        {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
      </div>
      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full rounded bg-slate-800 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {mutation.isPending ? '로그인 중…' : '로그인'}
      </button>
    </form>
  );
}
