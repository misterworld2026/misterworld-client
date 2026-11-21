// 고객(MEMBER) 로그인 직후 홈 화면에서 1회 표시되는 이전 여행 이력 팝업. 이력이 없어도 표시한다.
// 데이터: GET /api/my/trips/history (마이페이지 '여행 이력'과 같은 쿼리 키 사용)
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchTravelHistory } from '@/api/booking';
import { useAuth } from '@/auth/AuthProvider';
import { GRADE_LABEL } from '@/domain/status';
import { ymd } from '@/domain/format';
import { color } from '@/styles/tokens';

const MAX_ROWS = 5;
const wonSign = (n: number) => `₩${n.toLocaleString('ko-KR')}`;

export default function TravelHistoryPopup() {
  const { status, role, historyPopupPending, dismissHistoryPopup } = useAuth();
  const enabled = historyPopupPending && status === 'authed' && role === 'MEMBER';

  const history = useQuery({
    queryKey: ['my-history'],
    queryFn: fetchTravelHistory,
    enabled,
    // 직전 로그인 사용자의 캐시를 보여주지 않도록 항상 새로 조회
    refetchOnMount: 'always',
  });

  const fetched = enabled && !history.isFetching;
  const trips = history.data ?? [];

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismissHistoryPopup();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, dismissHistoryPopup]);

  if (!fetched) return null;
  const empty = history.isError || trips.length === 0;

  const recent = [...trips].sort((a, b) => b.departureDate.localeCompare(a.departureDate)).slice(0, MAX_ROWS);
  const cell = { padding: '12px 8px', borderBottom: `1px solid ${color.surfaceCool}` } as const;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-popup-title"
      onMouseDown={(e) => e.target === e.currentTarget && dismissHistoryPopup()}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0, 0, 0, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        style={{ width: 560, maxWidth: '100%', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', boxSizing: 'border-box', background: '#ffffff', color: '#000000', border: '1px solid #000000', padding: '28px 24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h2 id="history-popup-title" style={{ margin: 0, fontSize: 22, lineHeight: '28px', fontWeight: 700 }}>
              {empty ? '여행 이력' : '다시 오신 것을 환영합니다'}
            </h2>
            <p style={{ margin: 0, fontSize: 15, lineHeight: '22px', color: color.muted }}>
              {history.isError
                ? '여행 이력을 불러오지 못했습니다. 마이페이지에서 다시 확인해 주세요.'
                : empty
                  ? '아직 완료한 여행이 없습니다.'
                  : `지금까지 ${trips.length}번의 여행을 함께했습니다.`}
            </p>
          </div>
          <button
            type="button"
            onClick={dismissHistoryPopup}
            aria-label="닫기"
            style={{ background: 'none', border: 0, padding: 4, cursor: 'pointer', display: 'flex', color: '#000000' }}
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3 3l8 8M11 3l-8 8" />
            </svg>
          </button>
        </div>

        {empty ? (
          <p style={{ margin: 0, padding: '32px 16px', borderTop: '2px solid #000000', borderBottom: `1px solid ${color.surfaceCool}`, textAlign: 'center', fontSize: 15, lineHeight: '22px', color: color.muted }}>
            표시할 여행 이력이 없습니다.
            <br />
            여행을 2회 이상 완료하면 다음 예약부터 단골 할인 10%가 적용됩니다.
          </p>
        ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 440, borderCollapse: 'collapse', borderTop: '2px solid #000000', fontSize: 14, lineHeight: '20px', fontVariantNumeric: 'tabular-nums' }}>
            <thead>
              <tr>
                {['여행', '일정', '등급', '결제 금액'].map((h, i) => (
                  <th key={h} scope="col" style={{ ...cell, fontWeight: 700, textAlign: i === 3 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((t) => (
                <tr key={t.id}>
                  <td style={cell}>{t.productName}</td>
                  <td style={{ ...cell, whiteSpace: 'nowrap' }}>{ymd(t.departureDate)} - {ymd(t.arrivalDate).slice(5)}</td>
                  <td style={cell}>{GRADE_LABEL[t.tourGrade] ?? t.tourGrade}</td>
                  <td style={{ ...cell, textAlign: 'right' }}>{wonSign(t.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        {!empty && trips.length >= 2 && (
          <p style={{ margin: 0, padding: 12, background: color.surfaceSoft, fontSize: 14, lineHeight: '20px' }}>
            단골 고객님께는 다음 예약부터 10% 할인이 적용됩니다.
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={dismissHistoryPopup}
            style={{ minHeight: 44, padding: '10px 20px', border: '1px solid #000000', borderRadius: 0, background: '#ffffff', color: '#000000', fontSize: 14, cursor: 'pointer' }}
          >
            닫기
          </button>
          <Link
            to="/my"
            onClick={dismissHistoryPopup}
            style={{ minHeight: 44, boxSizing: 'border-box', padding: '12px 20px', border: '1px solid #000000', background: '#000000', color: '#ffffff', fontSize: 14, lineHeight: '20px', textDecoration: 'none' }}
          >
            {trips.length > MAX_ROWS ? `전체 ${trips.length}건 보기` : '마이페이지로 이동'}
          </Link>
        </div>
      </div>
    </div>
  );
}
