import type { ReactElement } from 'react';

/** 캘린더+채팅 통합 화면(핵심). 레이아웃 조립은 FE-06 에서 구현. */
export default function TeamWorkspacePage(): ReactElement {
  return (
    <main className="flex min-h-screen flex-col bg-slate-100">
      <header className="border-b bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-800">Team CalTalk</h1>
      </header>
      <div className="flex-1 p-6">
        <p className="text-sm text-slate-500">캘린더 + 채팅 통합 화면 (FE-06 예정)</p>
      </div>
    </main>
  );
}
