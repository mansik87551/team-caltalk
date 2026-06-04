import { lazy, Suspense, type ReactElement } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import { RequireAuth } from './features/auth/RequireAuth';

// 무거운 워크스페이스(FullCalendar·소켓·다수 feature)는 코드 스플리팅(FE-14).
const TeamWorkspacePage = lazy(() => import('./pages/TeamWorkspacePage'));

function PageFallback(): ReactElement {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
      불러오는 중…
    </div>
  );
}

export default function App(): ReactElement {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <TeamWorkspacePage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
