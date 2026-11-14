import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import type { Role } from '@/domain/status';

/** 로그인·권한 가드. FE 가드는 편의일 뿐, 실제 차단은 BE 401/403이 한다. */
export default function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === 'loading') {
    return <p style={{ margin: 0, padding: 40, textAlign: 'center', color: '#9c9c9c' }}>세션을 확인하는 중입니다…</p>;
  }
  if (auth.status !== 'authed') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (auth.role !== role) {
    return <Navigate to={auth.role === 'STAFF' ? '/staff/products' : '/'} replace />;
  }
  return <>{children}</>;
}
