import { useState, type ReactElement } from 'react';
import { LoginForm } from '../features/auth/LoginForm';
import { SignupForm } from '../features/auth/SignupForm';

type Mode = 'login' | 'signup';

/** 로그인/회원가입 화면 (FE-04, UC-01). */
export default function LoginPage(): ReactElement {
  const [mode, setMode] = useState<Mode>('login');

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
        <h1 className="text-center text-xl font-semibold text-slate-800">Team CalTalk</h1>

        <div className="mt-6 mb-6 flex rounded border border-slate-200 p-1 text-sm" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            onClick={() => setMode('login')}
            className={`flex-1 rounded py-1.5 ${mode === 'login' ? 'bg-slate-800 text-white' : 'text-slate-600'}`}
          >
            로그인
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            onClick={() => setMode('signup')}
            className={`flex-1 rounded py-1.5 ${mode === 'signup' ? 'bg-slate-800 text-white' : 'text-slate-600'}`}
          >
            회원가입
          </button>
        </div>

        {mode === 'login' ? <LoginForm /> : <SignupForm />}
      </div>
    </main>
  );
}
