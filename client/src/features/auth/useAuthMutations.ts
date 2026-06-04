/** 인증 뮤테이션 (FE-04) — 토큰 수령 → authStore 저장 → 워크스페이스 진입. */
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../../api/endpoints/auth';
import { useAuth } from '../../hooks/useAuth';
import type { ApiError } from '../../api/client';
import type { LoginValues, SignupValues } from './authSchemas';

export function useLoginMutation() {
  const { login } = useAuth();
  const navigate = useNavigate();
  return useMutation<Awaited<ReturnType<typeof authApi.login>>, ApiError, LoginValues>({
    mutationFn: (values) => authApi.login(values),
    onSuccess: (res) => {
      login(res);
      navigate('/', { replace: true });
    },
  });
}

export function useSignupMutation() {
  const { login } = useAuth();
  const navigate = useNavigate();
  // 회원가입 성공 시 자동 로그인(서버가 토큰을 함께 반환).
  return useMutation<Awaited<ReturnType<typeof authApi.signup>>, ApiError, SignupValues>({
    mutationFn: (values) => authApi.signup(values),
    onSuccess: (res) => {
      login(res);
      navigate('/', { replace: true });
    },
  });
}
