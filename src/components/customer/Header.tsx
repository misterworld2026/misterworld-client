// 고객 화면 공통 헤더 — 디자인 캔버스 Auth/Main/Themes의 헤더를 포팅.
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '@/auth/AuthProvider';
import { color } from '@/styles/tokens';
import CustomerLogo from './CustomerLogo';

const Bar = styled.header`
  background: ${color.surfaceDark};
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 clamp(8px, 2.8vw, 40px);
  height: 96px;
  box-sizing: border-box;
  position: relative;
  z-index: 5;
`;

const LogoBlock = styled(Link)`
  position: absolute;
  top: 0;
  left: clamp(16px, 4.4vw, 64px);
  background: ${color.brandGold};
  color: #ffffff;
  width: clamp(100px, 10.4vw, 148px);
  height: clamp(100px, 10.4vw, 148px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-align: center;
`;

const Nav = styled.nav`
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  height: 96px;
  display: flex;
  align-items: center;
  gap: clamp(16px, 2.8vw, 40px);
  white-space: nowrap;

  a {
    font-size: 17px;
    line-height: 44px;
  }
  a:hover {
    text-decoration: underline;
  }
`;

const LogoutBtn = styled.button`
  background: none;
  border: 0;
  color: #ffffff;
  font-size: 15px;
  line-height: 44px;
  padding: 0 8px;
  cursor: pointer;
  opacity: 0.8;
  &:hover {
    opacity: 1;
    text-decoration: underline;
  }
`;

const LoginLink = styled(Link)`
  color: #ffffff;
  font-size: 17px;
  line-height: 44px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  white-space: nowrap;
  &:hover {
    text-decoration: underline;
  }
`;

function UserIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

export default function CustomerHeader({ current }: { current?: 'login' | 'themes' | 'home' | 'my' }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const authed = auth.status === 'authed';

  const logout = async () => {
    await auth.logout();
    navigate('/', { replace: true });
  };

  return (
    <Bar>
      <LogoBlock to="/">
        <CustomerLogo />
        <span style={{ fontSize: 'clamp(13px, 1.3vw, 18px)', lineHeight: 1.3, fontWeight: 700 }}>Mr. World</span>
      </LogoBlock>
      <Nav aria-label="주 메뉴">
        <Link to="/themes" aria-current={current === 'themes' ? 'page' : undefined}>여행 테마</Link>
      </Nav>
      {authed ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {auth.role === 'STAFF' ? (
            <LoginLink to="/staff/products">
              <UserIcon />
              직원 콘솔
            </LoginLink>
          ) : (
            <LoginLink to="/my" aria-current={current === 'my' ? 'page' : undefined}>
              <UserIcon />
              내 예약
            </LoginLink>
          )}
          <LogoutBtn type="button" onClick={logout}>
            로그아웃
          </LogoutBtn>
        </span>
      ) : (
        <LoginLink to="/login" aria-current={current === 'login' ? 'page' : undefined}>
          <UserIcon />
          로그인
        </LoginLink>
      )}
    </Bar>
  );
}
