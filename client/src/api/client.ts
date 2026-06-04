/**
 * axios API 클라이언트 (FE-02, docs/4 §5.2)
 *
 * - baseURL = VITE_API_BASE_URL. 요청마다 JWT 액세스 토큰을 Authorization 헤더로 자동 첨부.
 * - 401 수신 시 토큰 폐기 후 /login 으로 이동.
 * - 서버 표준 에러 { error: { code, message } } 를 ApiError 로 정규화하여 reject.
 */

import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { getToken, clearToken } from '../lib/token';
import type { ApiErrorBody } from './types';

/** 정규화된 API 에러. UI 는 code/message/status 로 분기한다. */
export class ApiError extends Error {
  code: string;
  status: number;
  details?: Array<{ path: string; message: string }>;

  constructor(
    code: string,
    message: string,
    status: number,
    details?: Array<{ path: string; message: string }>
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// 요청 인터셉터: JWT 자동 첨부.
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// 응답 인터셉터: 401 처리 + 에러 정규화.
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status ?? 0;

    if (status === 401) {
      clearToken();
      // 로그인 화면이 아니면 이동(리다이렉트 루프 방지).
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    const body = error.response?.data;
    if (body && body.error) {
      return Promise.reject(
        new ApiError(body.error.code, body.error.message, status, body.error.details)
      );
    }

    // 네트워크/비표준 에러.
    return Promise.reject(new ApiError('NETWORK_ERROR', error.message || '네트워크 오류', status));
  }
);
