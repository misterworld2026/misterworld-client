import { api, tokenStore } from './client';
import type { LoginRequest, LoginResponse, MemberResponse, SignUpRequest, SignUpResponse } from './types';

export async function login(body: LoginRequest): Promise<LoginResponse> {
  const data = await api<LoginResponse>('/api/auth/login', { method: 'POST', body, auth: false });
  tokenStore.setPair(data.accessToken, data.refreshToken);
  return data;
}

export function signup(body: SignUpRequest): Promise<SignUpResponse> {
  return api<SignUpResponse>('/api/auth/signup', { method: 'POST', body, auth: false });
}

export async function logout(): Promise<void> {
  try {
    await api<void>('/api/auth/logout', { method: 'POST' });
  } finally {
    tokenStore.clear();
  }
}

export function getMyProfile(): Promise<MemberResponse> {
  return api<MemberResponse>('/api/my/profile');
}
