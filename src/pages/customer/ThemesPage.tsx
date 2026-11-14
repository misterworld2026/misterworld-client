// 여행 테마 — 디자인 캔버스 Themes.dc.html 구현.
// 시작 가격은 로그인 후에만 조회 가능(/api/tours 인증 필요)하므로 로그인 전에는 숨긴다.
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchProducts } from '@/api/tours';
import { useAuth } from '@/auth/AuthProvider';
import { THEME_CONTENT } from '@/domain/themes';
import { themeStartPrice } from '@/domain/pricing';
import { color } from '@/styles/tokens';
import CustomerHeader from '@/components/customer/Header';
import CustomerFooter from '@/components/customer/Footer';
import FloatingVoice from '@/components/customer/FloatingVoice';

export default function ThemesPage() {
  const auth = useAuth();
  const products = useQuery({ queryKey: ['products'], queryFn: fetchProducts, enabled: auth.status === 'authed' });

  return (
    <div style={{ background: '#ffffff', color: '#000000' }}>
      <CustomerHeader current="themes" />
      <main style={{ padding: '96px 24px 64px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 128 }}>
          <h1 style={{ margin: 0, fontSize: 40, lineHeight: '48px', fontWeight: 700, textAlign: 'center' }}>우리의 여행 테마</h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 160 }}>
            {THEME_CONTENT.map((t, i) => {
              const price = themeStartPrice(products.data ?? [], t.theme);
              return (
                <article key={t.theme} style={{ display: 'flex', flexDirection: i % 2 ? 'row-reverse' : 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: 0 }}>
                  <div aria-hidden="true" style={{ flex: '1 1 420px', minHeight: 360, background: color.navyDeep }} />
                  <div style={{ flex: '1 1 420px', boxSizing: 'border-box', padding: 40, background: color.surfaceSoft, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
                    <h2 style={{ margin: 0, fontSize: 32, lineHeight: '40px', fontWeight: 700 }}>{t.name}</h2>
                    <p style={{ margin: 0, fontSize: 17, lineHeight: '26px' }}>{t.intro}</p>
                    <ul style={{ margin: 0, padding: '0 0 0 20px', fontSize: 17, lineHeight: '26px' }}>
                      {t.points.map((pt) => (
                        <li key={pt}>{pt}</li>
                      ))}
                    </ul>
                    <p style={{ margin: 0, fontSize: 15, lineHeight: '22px' }}>
                      <span style={{ fontWeight: 700 }}>선택 가능 등급</span> &nbsp; {t.grades}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px 24px', marginTop: 8 }}>
                      {price != null && (
                        <span style={{ fontSize: 22, lineHeight: '28px', fontWeight: 700 }}>
                          {price.toLocaleString('ko-KR')}원<span style={{ fontSize: 15, opacity: 0.7 }}>/1인</span>부터
                        </span>
                      )}
                      <Link
                        to={`/booking?theme=${encodeURIComponent(t.theme)}`}
                        style={{ background: '#000000', color: '#ffffff', fontSize: 14, lineHeight: '20px', padding: '14px 24px' }}
                      >
                        예약하기
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </main>
      <CustomerFooter />
      <FloatingVoice />
    </div>
  );
}
