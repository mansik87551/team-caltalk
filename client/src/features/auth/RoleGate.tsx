/**
 * 역할 기반 조건부 렌더링 가드 (FE-13)
 *
 * 주의: 이 컴포넌트는 **보안 경계가 아니라 표시 정리(UX) 수단**이다.
 * 실제 권한 강제는 서버에서 이뤄진다(BR-03/04). 팀원이 우회해 API 를 호출해도 서버가 403 으로 막는다.
 *
 * 사용: <RoleGate allow="team_leader"><button>일정 추가</button></RoleGate>
 */
import type { ReactElement, ReactNode } from 'react';
import { useRole } from './useRole';
import type { Role } from '../../api/types';

interface Props {
  allow: Role | Role[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGate({ allow, children, fallback = null }: Props): ReactElement {
  const { role } = useRole();
  const allowed = Array.isArray(allow) ? allow : [allow];
  return <>{role && allowed.includes(role) ? children : fallback}</>;
}
