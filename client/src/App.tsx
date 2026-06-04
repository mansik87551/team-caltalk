import type { ReactElement } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import TeamWorkspacePage from './pages/TeamWorkspacePage';

/**
 * 미인증 리다이렉트 가드 자리(placeholder, FE-01).
 * 실제 인증 상태 연동은 FE-03(스토어)/FE-04(인증 흐름)에서 구현한다.
 */
function RequireAuth({ children }: { children: ReactElement }): ReactElement {
  const isAuthenticated = true; // TODO(FE-04): 인증 스토어 연동
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App(): ReactElement {
  return (
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
  );
}
