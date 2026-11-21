// 로그인 · 회원가입 — 디자인 캔버스 Auth.dc.html을 실제 API로 구현.
// 로그인: POST /api/auth/login, 가입: POST /api/auth/signup
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { ApiError } from '@/api/client';
import { signup } from '@/api/auth';
import { useAuth } from '@/auth/AuthProvider';
import { color } from '@/styles/tokens';
import CustomerHeader from '@/components/customer/Header';

const TabBtn = styled.button<{ $on: boolean }>`
  flex: 1 1 0;
  background: none;
  border: 0;
  border-bottom: 3px solid ${(p) => (p.$on ? '#000000' : '#ffffff')};
  padding: 12px 0;
  font-size: 22px;
  line-height: 28px;
  font-weight: 700;
  color: ${(p) => (p.$on ? '#000000' : color.muted)};
  cursor: pointer;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  label {
    font-size: 15px;
    line-height: 22px;
    font-weight: 700;
  }
  input {
    height: 48px;
    box-sizing: border-box;
    border: 1px solid #000000;
    border-radius: 0;
    padding: 0 16px;
    font-size: 17px;
    background: #ffffff;
    color: #000000;
    min-width: 0;
    width: 100%;
  }
`;

const SubmitBtn = styled.button`
  height: 48px;
  background: #000000;
  color: #ffffff;
  border: 0;
  border-radius: 0;
  font-size: 14px;
  line-height: 20px;
  cursor: pointer;
  margin-top: 8px;
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const utf8Bytes = (s: string) => new TextEncoder().encode(s).length;
const emailOk = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

export default function AuthPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [message, setMessage] = useState('');
  const [isOk, setIsOk] = useState(false);
  const [busy, setBusy] = useState(false);

  if (auth.status === 'authed') {
    return <Navigate to={auth.role === 'STAFF' ? '/staff/products' : (location.state?.from ?? '/')} replace />;
  }

  const fail = (text: string) => {
    setMessage(text);
    setIsOk(false);
  };

  const fields = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const out: Record<string, string> = {};
    new FormData(e.currentTarget).forEach((v, k) => {
      out[k] = String(v).trim();
    });
    return out;
  };

  const submitLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    const f = fields(e);
    if (!f.email || !f.password) return fail('이메일과 비밀번호를 모두 입력해 주세요.');
    if (!emailOk(f.email)) return fail('이메일 형식이 올바르지 않습니다.');
    setBusy(true);
    try {
      const role = await auth.login(f.email, f.password);
      navigate(role === 'STAFF' ? '/staff/products' : (location.state?.from ?? '/'), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) fail('이메일 또는 비밀번호가 올바르지 않습니다.');
      else fail(err instanceof ApiError ? err.message : '로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const submitSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    const f = fields(e);
    if (!f.email || !f.name || !f.phone || !f.address || !f.password || !f.password2)
      return fail('이메일, 이름, 연락처, 주소, 비밀번호를 모두 입력해 주세요.');
    if (!emailOk(f.email)) return fail('이메일 형식이 올바르지 않습니다.');
    if (f.password.length < 10 || f.password.length > 72 || utf8Bytes(f.password) > 72)
      return fail('비밀번호는 10자 이상 72자(72바이트) 이하로 입력해 주세요.');
    if (f.password !== f.password2) return fail('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
    setBusy(true);
    try {
      await signup({
        email: f.email,
        password: f.password,
        passwordConfirmation: f.password2,
        name: f.name,
        address: f.address,
        phoneNumber: f.phone,
      });
      setTab('login');
      setMessage('회원가입이 완료되었습니다. 로그인해 주세요.');
      setIsOk(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) fail('이미 가입된 이메일입니다.');
      else fail(err instanceof ApiError ? err.message : '회원가입을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const isLogin = tab === 'login';

  return (
    <div style={{ background: '#ffffff', color: '#000000', minHeight: '100vh' }}>
      <CustomerHeader current="login" />

      <main style={{ background: '#ffffff' }}>
        <section
          style={{ boxSizing: 'border-box', padding: '64px clamp(16px, 6vw, 96px) 96px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}
        >
          <div style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 40 }}>
            <div role="tablist" aria-label="로그인 또는 회원가입" style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${color.surfaceCool}` }}>
              <TabBtn type="button" role="tab" aria-selected={isLogin} $on={isLogin} onClick={() => { setTab('login'); setMessage(''); }}>
                로그인
              </TabBtn>
              <TabBtn type="button" role="tab" aria-selected={!isLogin} $on={!isLogin} onClick={() => { setTab('signup'); setMessage(''); }}>
                회원가입
              </TabBtn>
            </div>

            {isLogin ? (
              <form noValidate onSubmit={submitLogin} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <Field>
                  <label htmlFor="login-email">이메일</label>
                  <input id="login-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} />
                </Field>
                <Field>
                  <label htmlFor="login-password">비밀번호</label>
                  <input id="login-password" name="password" type="password" autoComplete="current-password" />
                </Field>
                <SubmitBtn type="submit" disabled={busy}>
                  {busy ? '확인 중…' : '로그인'}
                </SubmitBtn>
              </form>
            ) : (
              <form noValidate onSubmit={submitSignup} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <Field>
                  <label htmlFor="su-email">이메일</label>
                  <input id="su-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} />
                </Field>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px 16px' }}>
                  <Field style={{ flex: '1 1 200px' }}>
                    <label htmlFor="su-name">이름</label>
                    <input id="su-name" name="name" type="text" autoComplete="name" />
                  </Field>
                  <Field style={{ flex: '1 1 200px' }}>
                    <label htmlFor="su-phone">연락처</label>
                    <input id="su-phone" name="phone" type="tel" autoComplete="tel" placeholder="010-0000-0000" />
                  </Field>
                </div>
                <Field>
                  <label htmlFor="su-address">주소</label>
                  <input id="su-address" name="address" type="text" autoComplete="street-address" />
                </Field>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px 16px' }}>
                  <Field style={{ flex: '1 1 200px' }}>
                    <label htmlFor="su-password">비밀번호</label>
                    <input id="su-password" name="password" type="password" autoComplete="new-password" />
                  </Field>
                  <Field style={{ flex: '1 1 200px' }}>
                    <label htmlFor="su-password2">비밀번호 확인</label>
                    <input id="su-password2" name="password2" type="password" autoComplete="new-password" />
                  </Field>
                </div>
                <SubmitBtn type="submit" disabled={busy}>
                  {busy ? '확인 중…' : '회원가입'}
                </SubmitBtn>
              </form>
            )}

            {message && (
              <p role="alert" style={{ margin: 0, padding: 16, background: color.surfaceSoft, fontSize: 15, lineHeight: '22px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span aria-hidden="true" style={{ flexShrink: 0, width: 12, height: 12, marginTop: 5, background: isOk ? '#000000' : color.brandGold, display: 'block' }} />
                <span>{message}</span>
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
