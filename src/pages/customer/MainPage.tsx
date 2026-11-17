// 홈 — 디자인 캔버스 Main.dc.html 구현.
// 시작 가격은 상품 API(/api/tours, 로그인 필요)의 판매 등급 최저가. 로그인 전에는 가격 줄을 숨긴다.
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchProducts } from '@/api/tours';
import { useAuth } from '@/auth/AuthProvider';
import { THEME_CONTENT, REVIEWS } from '@/domain/themes';
import { themeStartPrice } from '@/domain/pricing';
import { color } from '@/styles/tokens';
import CustomerHeader from '@/components/customer/Header';
import CustomerFooter from '@/components/customer/Footer';
import FloatingVoice from '@/components/customer/FloatingVoice';

const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

/** /#reviews 처럼 해시가 있으면 해당 구역으로 스크롤 */
export function useHashScroll() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, [hash]);
}

export default function MainPage() {
  const auth = useAuth();
  const authed = auth.status === 'authed';
  const products = useQuery({ queryKey: ['products'], queryFn: fetchProducts, enabled: authed });
  const [active, setActive] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(false);
  const paused = useRef(false);
  const idxRef = useRef(0);
  const swapRef = useRef(0);
  const timerRef = useRef(0);

  useHashScroll();

  const show = (i: number) => {
    window.clearTimeout(swapRef.current);
    setFade(true);
    swapRef.current = window.setTimeout(() => {
      idxRef.current = i;
      setIdx(i);
      setFade(false);
    }, 300);
  };

  const startTimer = () => {
    window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      if (paused.current) return;
      show((idxRef.current + 1) % REVIEWS.length);
    }, 5000);
  };

  useEffect(() => {
    startTimer();
    return () => {
      window.clearInterval(timerRef.current);
      window.clearTimeout(swapRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const review = REVIEWS[idx];

  return (
    <div style={{ background: '#ffffff', color: '#000000' }}>
      <CustomerHeader current="home" />

      <section
        id="top"
        style={{ position: 'relative', overflow: 'hidden', background: color.navyDeep, color: '#ffffff', minHeight: 620, boxSizing: 'border-box', padding: '64px 24px', display: 'flex', flexDirection: 'column' }}
      >
        <video
          src="/AdobeStock_492787860.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.5)' }} />
        <div style={{ position: 'relative', flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 24, maxWidth: 1200, margin: '0 auto' }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(16px, 3.6vw, 52px)', lineHeight: 1.3, fontWeight: 700, whiteSpace: 'nowrap' }}>당신을 위한 휴식, 우리가 만듭니다.</h1>
          <p style={{ margin: 0, fontSize: 17, lineHeight: '26px', maxWidth: 640 }}>
            계획도, 준비도 필요 없습니다. 설렘만 가져오세요.
            <br />
            Mr. World는 당신과 가족을 위한 맞춤형 테마 여행을 제공합니다.
          </p>
          <Link
            to="/themes"
            style={{ background: '#ffffff', color: '#000000', fontSize: 14, lineHeight: '20px', padding: '14px 24px', marginTop: 16, display: 'inline-block' }}>
            테마 투어 예약
          </Link>
        </div>
      </section>

      <section id="themes" style={{ padding: '192px 24px', background: '#ffffff' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 40, lineHeight: '48px', fontWeight: 400 }}>여행 테마</h2>
            <p style={{ margin: 0, fontSize: 17, lineHeight: '26px' }}>테마에 마우스를 올리거나 눌러 자세한 내용을 확인하세요.</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {THEME_CONTENT.map((t) => {
              const on = active === t.theme;
              const price = themeStartPrice(products.data ?? [], t.theme);
              return (
                <div
                  key={t.theme}
                  onMouseEnter={() => setActive(t.theme)}
                  onMouseLeave={() => setActive(null)}
                  style={{
                    flexGrow: on ? 2 : 1, flexShrink: 1, flexBasis: 0, minWidth: 200, height: 520, boxSizing: 'border-box', padding: 24,
                    background: color.navyDeep, color: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 16,
                    overflow: 'hidden', transition: `flex-grow 0.5s ${EASE}`,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 22, lineHeight: '28px', fontWeight: 400 }}>
                      <button
                        type="button"
                        onClick={() => setActive(t.theme)}
                        onFocus={() => setActive(t.theme)}
                        aria-expanded={on}
                        style={{ background: 'none', border: 0, padding: '8px 0', margin: 0, color: '#ffffff', fontSize: 22, lineHeight: '28px', fontWeight: 400, textAlign: 'left', cursor: 'pointer', minHeight: 44 }}
                      >
                        {t.name}
                      </button>
                    </h3>
                    <div
                      style={{
                        display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden', maxHeight: on ? 240 : 0, opacity: on ? 1 : 0,
                        visibility: on ? 'visible' : 'hidden', transition: `max-height 0.5s ${EASE}, opacity 0.4s ease, visibility 0.5s`,
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 15, lineHeight: '22px' }}>{t.intro}</p>
                      {price != null && (
                        <p style={{ margin: 0, fontSize: 17, lineHeight: '24px', fontWeight: 700 }}>
                          {price.toLocaleString('ko-KR')}원<span style={{ fontSize: 14, opacity: 0.7 }}>/1인</span>부터
                        </p>
                      )}
                      <Link
                        to={`/booking?theme=${encodeURIComponent(t.theme)}`}
                        style={{ background: '#ffffff', color: '#000000', fontSize: 14, lineHeight: '20px', padding: '12px 24px', alignSelf: 'flex-start' }}
                      >
                        예약하기
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="reviews" style={{ padding: '0 24px 64px', background: '#ffffff' }}>
        <div
          style={{ maxWidth: 1080, margin: '0 auto', minHeight: 440, boxSizing: 'border-box', padding: 40, background: color.navyDeep, color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', position: 'relative', overflow: 'hidden' }}
        >
          {REVIEWS.map((r, i) => (
            <div
              key={r.by}
              aria-hidden="true"
              style={{ position: 'absolute', inset: 0, background: i === 1 ? color.surfaceDark : color.navyDeep, opacity: i === idx ? 1 : 0, transition: 'opacity 0.6s ease' }}
            />
          ))}
          <div
            onMouseEnter={() => (paused.current = true)}
            onMouseLeave={() => (paused.current = false)}
            onFocus={() => (paused.current = true)}
            onBlur={() => (paused.current = false)}
            style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 460, boxSizing: 'border-box', padding: '40px 40px 24px', background: '#ffffff', color: '#000000', display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <h2 style={{ margin: 0, fontSize: 32, lineHeight: '40px', fontWeight: 700 }}>고객 후기</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, opacity: fade ? 0 : 1, transform: `translateY(${fade ? 8 : 0}px)`, transition: 'opacity 0.45s ease, transform 0.45s ease' }}>
              <p style={{ margin: 0, fontSize: 17, lineHeight: '26px', minHeight: 104 }}>“{review.text}”</p>
              <p style={{ margin: 0, fontSize: 15, lineHeight: '22px' }}>{review.by} · 예시 후기</p>
            </div>
            <div role="group" aria-label="후기 넘기기" style={{ display: 'flex', gap: 0, marginLeft: -16 }}>
              {REVIEWS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    show(i);
                    startTimer();
                  }}
                  aria-label={`후기 ${i + 1} 보기`}
                  aria-pressed={i === idx}
                  style={{ width: 44, height: 44, background: 'none', border: 0, padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <span style={{ width: 12, height: 12, boxSizing: 'border-box', border: `2px solid ${color.brandGold}`, borderRadius: '50%', background: i === idx ? color.brandGold : '#ffffff', display: 'block' }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CustomerFooter />
      <FloatingVoice />
    </div>
  );
}
