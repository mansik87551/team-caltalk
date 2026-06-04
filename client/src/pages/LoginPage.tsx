import type { ReactElement } from 'react';

/** 로그인/회원가입 화면 (UC-01). 실제 폼·토큰 흐름은 FE-04 에서 구현. */
export default function LoginPage(): ReactElement {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="rounded-lg bg-white p-8 shadow">
        <h1 className="text-xl font-semibold text-slate-800">Team CalTalk</h1>
        <p className="mt-2 text-sm text-slate-500">로그인 화면 (FE-04 예정)</p>
      </div>
    </main>
  );
}
