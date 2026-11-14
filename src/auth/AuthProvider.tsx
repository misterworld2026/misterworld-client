import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { onSessionExpired, restoreSession, tokenStore } from '@/api/client';
import { login as apiLogin, logout as apiLogout } from '@/api/auth';
import type { Role } from '@/domain/status';

interface AuthState {
  /** null: 복구 확인 중, 'anonymous': 비로그인 */
  status: 'loading' | 'anonymous' | 'authed';
  role: Role | null;
  login: (email: string, password: string) => Promise<Role>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const restored = tokenStore.refresh ? await restoreSession() : null;
      if (!mounted) return;
      if (restored) {
        setRole(restored.role);
        setStatus('authed');
      } else {
        setStatus('anonymous');
      }
    })();
    const off = onSessionExpired(() => {
      setRole(null);
      setStatus('anonymous');
    });
    return () => {
      mounted = false;
      off();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiLogin({ email, password });
    setRole(data.role);
    setStatus('authed');
    return data.role;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setRole(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo(() => ({ status, role, login, logout }), [status, role, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}
