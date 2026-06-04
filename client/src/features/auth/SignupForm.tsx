/** 회원가입 폼 (FE-04) — 성공 시 자동 로그인. */
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema, type SignupValues } from './authSchemas';
import { useSignupMutation } from './useAuthMutations';

const inputClass =
  'mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none';

export function SignupForm(): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema) });
  const mutation = useSignupMutation();

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
          이름
          <input type="text" autoComplete="name" className={inputClass} {...register('displayName')} />
        </label>
        {errors.displayName && (
          <p className="mt-1 text-xs text-red-600">{errors.displayName.message}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">
          비밀번호
          <input
            type="password"
            autoComplete="new-password"
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
        {mutation.isPending ? '가입 중…' : '회원가입'}
      </button>
    </form>
  );
}
