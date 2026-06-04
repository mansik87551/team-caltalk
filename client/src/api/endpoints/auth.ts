/** 인증 엔드포인트 (FE-02) */
import { apiClient } from '../client';
import type { AuthResponse, LoginRequest, SignupRequest, User } from '../types';

export async function signup(body: SignupRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/api/auth/signup', body);
  return data;
}

export async function login(body: LoginRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/api/auth/login', body);
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>('/api/auth/me');
  return data;
}
