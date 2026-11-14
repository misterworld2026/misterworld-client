// 직원 콘솔 공통 레이아웃: 좌측 사이드바 + 상단 바 + 알림(flash) + 본문.
// 디자인 캔버스 Staff/Reservations/Inventory 세 화면이 공유하는 뼈대.
import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { color } from '@/styles/tokens';
import { useAuth } from '@/auth/AuthProvider';
import { getMyProfile } from '@/api/auth';
import LogoMark from './LogoMark';

const Shell = styled.div`
  background: ${color.consoleBg};
  color: ${color.consoleText};
  min-height: 100vh;
  display: flex;
  font-size: 14px;
  line-height: 20px;
`;

const SideNav = styled.nav`
  flex: 0 0 226px;
  width: 226px;
  box-sizing: border-box;
  background: ${color.consoleBg};
  border-right: 1px solid ${color.consoleBorder};
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
`;

const Brand = styled(Link)`
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 20px 18px;
  border-bottom: 1px solid ${color.consoleBorder};
  color: #ffffff;
`;

const NavList = styled.div`
  padding: 16px 0;
  display: flex;
  flex-direction: column;
`;

const NavItem = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  color: ${color.consoleChip};
  &:hover {
    background: #161616;
    color: #ffffff;
  }
  &.active {
    color: ${color.consoleSelected};
    svg {
      color: ${color.consoleSelected};
    }
  }
`;

const TopBar = styled.div`
  height: 44px;
  box-sizing: border-box;
  border-bottom: 1px solid ${color.consoleBorder};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: ${color.consoleBg};
`;

const Crumbs = styled.nav`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${color.consoleDim};
  a:hover {
    text-decoration: underline;
  }
`;

const LogoutBtn = styled.button`
  height: 28px;
  box-sizing: border-box;
  border: 1px solid ${color.consoleBtnBorder};
  background: none;
  color: ${color.consoleBtnText};
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  cursor: pointer;
  &:hover {
    border-color: ${color.consoleText};
    color: #ffffff;
  }
`;

const Main = styled.main`
  flex: 1 1 auto;
  padding: 20px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FlashBox = styled.div<{ $border: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid ${(p) => p.$border};
  background: #121212;
  padding: 10px 14px;
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: 24px;
  line-height: 32px;
  font-weight: 700;
`;

export interface Flash {
  text: string;
  kind: 'ok' | 'error';
}

function CubeIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
      <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
    </svg>
  );
}
function ClipboardIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4h6v3H9z" />
      <path d="M15 5h3.5v15h-13V5H9" />
      <path d="M8.5 11h7M8.5 15h7" />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 4.5h17v4h-17z" />
      <path d="M5 8.5v11h14v-11" />
      <path d="M10 12.5h4" />
    </svg>
  );
}

export default function ConsoleLayout({
  title,
  description,
  flash,
  onClearFlash,
  children,
}: {
  title: string;
  description?: string;
  flash?: Flash | null;
  onClearFlash?: () => void;
  children: ReactNode;
}) {
  const auth = useAuth();
  const navigate = useNavigate();
  const profile = useQuery({ queryKey: ['my-profile'], queryFn: getMyProfile, staleTime: 5 * 60_000 });

  const handleLogout = async () => {
    await auth.logout();
    navigate('/login', { replace: true });
  };

  const flashColor = flash?.kind === 'error' ? color.danger : color.ok;

  return (
    <Shell>
      <SideNav aria-label="직원 메뉴">
        <Brand to="/staff/products">
          <span style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center' }}>
            <LogoMark width={46} />
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: 16, lineHeight: '20px', fontWeight: 700 }}>Mr. World</span>
            <span style={{ fontSize: 12, lineHeight: '16px', color: color.consoleDim }}>직원 인터페이스</span>
          </span>
        </Brand>
        <NavList>
          <NavItem to="/staff/products">
            <CubeIcon />
            <span>상품·일정 관리</span>
          </NavItem>
          <NavItem to="/staff/reservations">
            <ClipboardIcon />
            <span>예약 현황 조회</span>
          </NavItem>
          <NavItem to="/staff/inventory">
            <BoxIcon />
            <span>물품·재고 관리</span>
          </NavItem>
        </NavList>
      </SideNav>

      <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopBar>
          <Crumbs aria-label="현재 위치">
            <Link to="/staff/products">직원 콘솔</Link>
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M4.5 2.5 8 6l-3.5 3.5" />
            </svg>
            <span style={{ color: color.consoleText }}>{title}</span>
          </Crumbs>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: color.consoleChip }}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
              </svg>
              {profile.data ? `${profile.data.name} (직원)` : '(직원)'}
            </span>
            <LogoutBtn type="button" onClick={handleLogout}>
              로그아웃
            </LogoutBtn>
          </div>
        </TopBar>

        <Main>
          {flash && (
            <FlashBox role="status" $border={flashColor}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={flashColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  {flash.kind === 'ok' ? <path d="M8.5 12.5l2.5 2.5 4.5-5" /> : <path d="M12 7.5v5.5M12 16.5v.5" />}
                </svg>
                {flash.text}
              </span>
              <button
                type="button"
                onClick={onClearFlash}
                aria-label="알림 닫기"
                style={{ background: 'none', border: 0, color: color.consoleDim, padding: 4, cursor: 'pointer', display: 'flex' }}
              >
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M3 3l8 8M11 3l-8 8" />
                </svg>
              </button>
            </FlashBox>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 12 }}>
            <PageTitle>{title}</PageTitle>
            {description && <p style={{ margin: 0, color: color.consoleDim }}>{description}</p>}
          </div>

          {children}
        </Main>
      </div>
    </Shell>
  );
}
