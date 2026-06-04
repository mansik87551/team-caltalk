/** 워크스페이스 레이아웃 셸 (FE-06) — 헤더 + 캘린더/채팅 2열 슬롯(반응형, NFR-08). */
import type { ReactNode, ReactElement } from 'react';

interface Props {
  header: ReactNode;
  calendar: ReactNode;
  chat: ReactNode;
}

export function WorkspaceLayout({ header, calendar, chat }: Props): ReactElement {
  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="border-b bg-white">{header}</header>
      {/* ≥1024px: 캘린더(가변) + 채팅(고정 폭) 2열 / 좁은 폭: 세로 스택 */}
      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[1fr_360px]">
        <section aria-label="캘린더 영역" className="min-h-[16rem] flex-1 p-4">
          {calendar}
        </section>
        <aside
          aria-label="채팅 영역"
          className="min-h-[16rem] border-t bg-white p-4 lg:border-l lg:border-t-0"
        >
          {chat}
        </aside>
      </div>
    </div>
  );
}
