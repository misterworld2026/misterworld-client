// 내 예약 — 디자인이 없는 화면(Q14 a). 고객 화면(Booking/Themes) 디자인 언어로 구성.
// 데이터: GET /api/my/profile, GET /api/my/applications, GET /api/my/trips/history,
//        GET /api/tours/schedules + GET /api/tours (신청의 상품·일정 표시용)
// 작업: 미결제 신청 결제(POST /api/my/applications/{id}/payment), 대기 신청 취소(PUT .../cancel)
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { getMyProfile } from '@/api/auth';
import { fetchProducts } from '@/api/tours';
import { fetchAllSchedules } from '@/api/schedules';
import { cancelMyApplication, fetchMyApplications, fetchTravelHistory, payApplication } from '@/api/booking';
import type { ApplicationResponse } from '@/api/types';
import { GRADE_LABEL } from '@/domain/status';
import { deadlineOf, todayIso } from '@/domain/rules';
import { dateTimeKst, range, ymd } from '@/domain/format';
import { color } from '@/styles/tokens';
import CustomerHeader from '@/components/customer/Header';
import CustomerFooter from '@/components/customer/Footer';

const wonSign = (n: number | null | undefined) => (n == null ? '-' : `₩${n.toLocaleString('ko-KR')}`);
const GREEN = '#1E7B34';

const btnBlack = { minHeight: 44, padding: '10px 20px', border: '1px solid #000000', borderRadius: 0, background: '#000000', color: '#ffffff', fontSize: 14, cursor: 'pointer' } as const;
const btnWhite = { ...btnBlack, background: '#ffffff', color: '#000000' } as const;

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <dt style={{ fontSize: 14, lineHeight: '20px', color: color.muted }}>{label}</dt>
      <dd style={{ margin: 0, fontSize: 15, lineHeight: '22px', fontWeight: 700 }}>{value}</dd>
    </div>
  );
}

export default function MyPage() {
  const qc = useQueryClient();
  const today = todayIso();
  const profile = useQuery({ queryKey: ['my-profile'], queryFn: getMyProfile, staleTime: 5 * 60_000 });
  const apps = useQuery({ queryKey: ['my-apps'], queryFn: fetchMyApplications });
  const history = useQuery({ queryKey: ['my-history'], queryFn: fetchTravelHistory });
  const schedules = useQuery({ queryKey: ['schedules'], queryFn: fetchAllSchedules });
  const products = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const schedById = useMemo(() => new Map((schedules.data ?? []).map((s) => [s.travelScheduleId, s])), [schedules.data]);
  const prodById = useMemo(() => new Map((products.data ?? []).map((p) => [p.id, p])), [products.data]);

  const refreshAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['my-apps'] }),
      qc.invalidateQueries({ queryKey: ['schedules'] }),
    ]);
  };

  const pay = useMutation({
    mutationFn: (id: number) => payApplication(id),
    onSuccess: async () => {
      await refreshAll();
      setMessage({ text: 'World Pay 결제를 완료했습니다.', ok: true });
    },
    onError: (e) => setMessage({ text: e instanceof ApiError ? e.message : '결제를 완료하지 못했습니다.', ok: false }),
  });

  const cancel = useMutation({
    mutationFn: (id: number) => cancelMyApplication(id),
    onSuccess: async () => {
      setConfirmId(null);
      await refreshAll();
      setMessage({ text: '신청을 취소했습니다.', ok: true });
    },
    onError: (e) => {
      setConfirmId(null);
      setMessage({ text: e instanceof ApiError ? e.message : '신청을 취소하지 못했습니다.', ok: false });
    },
  });

  const list = [...(apps.data ?? [])].sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
  const trips = history.data ?? [];
  const me = profile.data;

  const view = (a: ApplicationResponse) => {
    const s = schedById.get(a.scheduleId);
    const p = s ? prodById.get(s.productId) : undefined;
    const cancellable =
      a.status === 'PENDING' && !!s && (s.status === 'RECRUITING_SCHEDULE' || s.status === 'CLOSED_SCHEDULE');
    const unpaid = a.status !== 'CANCELLED' && a.paymentStatus !== 'PAID';
    const status =
      a.status === 'CONFIRMED'
        ? { text: '출발 확정', fg: GREEN }
        : a.status === 'PENDING'
          ? { text: '출발 확정 대기', fg: color.info }
          : { text: s?.status === 'CANCELLED_SCHEDULE' ? '취소 (일정 취소)' : '취소', fg: color.consoleFaint };
    const options = [a.hotelOption, a.transportOption, a.mealOption, a.extraOption].filter(Boolean).join(' / ') || '-';
    return { s, p, cancellable, unpaid, status, options };
  };

  return (
    <div style={{ background: '#ffffff', color: '#000000', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <CustomerHeader current="my" />
      <main style={{ flexGrow: 1, padding: '96px 24px 64px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 48 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
            <h1 style={{ margin: 0, fontSize: 32, lineHeight: '40px', fontWeight: 700 }}>내 예약</h1>
            <Link to="/booking" style={{ background: '#000000', color: '#ffffff', fontSize: 14, lineHeight: '20px', padding: '14px 24px' }}>새 여행 예약</Link>
          </div>

          <section aria-label="회원 정보" style={{ padding: 24, background: color.surfaceSoft }}>
            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px 24px' }}>
              <Line label="이름" value={me?.name ?? '-'} />
              <Line label="이메일" value={me?.email ?? '-'} />
              <Line label="연락처" value={me?.phoneNumber ?? '-'} />
              <Line label="완료 여행" value={`${trips.length}회${trips.length >= 2 ? ' · 단골 할인 10% 대상' : ''}`} />
            </dl>
          </section>

          {message && (
            <p role={message.ok ? 'status' : 'alert'} style={{ margin: 0, fontSize: 15, lineHeight: '22px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span aria-hidden="true" style={{ flexShrink: 0, width: 12, height: 12, marginTop: 5, background: message.ok ? color.brandGold : color.danger, display: 'block' }} />
              {message.text}
            </p>
          )}

          <section aria-labelledby="apps-h" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 id="apps-h" style={{ margin: 0, fontSize: 22, lineHeight: '28px', fontWeight: 700 }}>신청 내역</h2>
            {apps.isLoading && <p style={{ margin: 0, fontSize: 15 }}>신청 내역을 불러오는 중입니다…</p>}
            {apps.error != null && (
              <p role="alert" style={{ margin: 0, fontSize: 15 }}>
                {apps.error instanceof ApiError ? apps.error.message : '신청 내역을 불러오지 못했습니다.'}
              </p>
            )}
            {!apps.isLoading && !apps.error && list.length === 0 && (
              <p style={{ margin: 0, fontSize: 15, lineHeight: '22px' }}>아직 신청한 여행이 없습니다. 마음에 드는 테마를 골라 예약해 보세요.</p>
            )}
            {list.map((a) => {
              const v = view(a);
              const off = a.status === 'CANCELLED';
              return (
                <article
                  key={a.id}
                  style={{ boxSizing: 'border-box', padding: '20px 24px', background: off ? color.surfaceCool : color.surfaceSoft, borderLeft: `8px solid ${off ? '#c4c4c4' : a.status === 'CONFIRMED' ? color.brandGold : color.navyDeep}`, display: 'flex', flexDirection: 'column', gap: 16, color: off ? color.consoleFaint : '#000000' }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px 16px' }}>
                    <h3 style={{ margin: 0, fontSize: 17, lineHeight: '24px', fontWeight: 700 }}>
                      {v.p?.name ?? '여행 상품'} · {v.s ? range(v.s.departureDate, v.s.arrivalDate) : '-'}
                    </h3>
                    <span style={{ fontSize: 15, lineHeight: '22px', fontWeight: 700, color: v.status.fg }}>{v.status.text}</span>
                  </div>
                  <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px 24px' }}>
                    <Line label="등급" value={GRADE_LABEL[a.tourGrade] ?? a.tourGrade} />
                    <Line label="인원" value={`${a.applicantCount}명`} />
                    <Line label="결제 금액" value={wonSign(a.totalPrice)} />
                    <Line label="결제" value={a.paymentStatus === 'PAID' ? `완료 · ${dateTimeKst(a.paidAt).slice(0, 10)}` : off ? '-' : '미결제'} />
                    <Line label="신청일" value={dateTimeKst(a.appliedAt).slice(0, 10)} />
                  </dl>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: '20px' }}>옵션 · {v.options}{a.discountRate ? ` · 단골 할인 ${a.discountRate}% 적용` : ''}</p>
                  {(v.unpaid || v.cancellable) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                      {v.unpaid && (
                        <button type="button" style={btnBlack} disabled={pay.isPending} onClick={() => pay.mutate(a.id)}>
                          {pay.isPending && pay.variables === a.id ? '결제 중…' : 'World Pay로 결제'}
                        </button>
                      )}
                      {v.cancellable &&
                        (confirmId === a.id ? (
                          <>
                            <span style={{ fontSize: 15 }}>이 신청을 취소할까요?</span>
                            <button type="button" style={{ ...btnWhite, borderColor: color.danger, color: color.danger }} disabled={cancel.isPending} onClick={() => cancel.mutate(a.id)}>
                              {cancel.isPending ? '취소 중…' : '신청 취소'}
                            </button>
                            <button type="button" style={btnWhite} disabled={cancel.isPending} onClick={() => setConfirmId(null)}>
                              아니요
                            </button>
                          </>
                        ) : (
                          <button type="button" style={btnWhite} onClick={() => setConfirmId(a.id)}>
                            신청 취소
                          </button>
                        ))}
                      {v.cancellable && v.s && (
                        <span style={{ fontSize: 14, lineHeight: '20px' }}>
                          출발 확정 전까지 취소할 수 있습니다{today <= deadlineOf(v.s.departureDate) ? ` · 신청 마감 ${ymd(deadlineOf(v.s.departureDate))}` : ''}
                        </span>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </section>

          <section aria-labelledby="history-h" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 id="history-h" style={{ margin: 0, fontSize: 22, lineHeight: '28px', fontWeight: 700 }}>여행 이력</h2>
            {!history.isLoading && trips.length === 0 && (
              <p style={{ margin: 0, fontSize: 15, lineHeight: '22px' }}>
                완료한 여행이 없습니다. 여행을 2회 이상 완료하면 다음 예약부터 단골 할인 10%가 적용됩니다.
              </p>
            )}
            {trips.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse', borderTop: '2px solid #000000', fontSize: 15, lineHeight: '22px', fontVariantNumeric: 'tabular-nums' }}>
                  <thead>
                    <tr style={{ textAlign: 'left' }}>
                      {['여행', '일정', '등급', '인원', '결제 금액'].map((h, i) => (
                        <th key={h} scope="col" style={{ padding: '14px 12px', borderBottom: `1px solid ${color.surfaceCool}`, fontWeight: 700, textAlign: i >= 3 ? 'right' : 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map((t) => (
                      <tr key={t.id}>
                        <td style={{ padding: '14px 12px', borderBottom: `1px solid ${color.surfaceCool}` }}>{t.productName}</td>
                        <td style={{ padding: '14px 12px', borderBottom: `1px solid ${color.surfaceCool}` }}>{ymd(t.departureDate)} - {ymd(t.arrivalDate).slice(5)}</td>
                        <td style={{ padding: '14px 12px', borderBottom: `1px solid ${color.surfaceCool}` }}>{GRADE_LABEL[t.tourGrade] ?? t.tourGrade}</td>
                        <td style={{ padding: '14px 12px', borderBottom: `1px solid ${color.surfaceCool}`, textAlign: 'right' }}>{t.applicantCount}명</td>
                        <td style={{ padding: '14px 12px', borderBottom: `1px solid ${color.surfaceCool}`, textAlign: 'right' }}>{wonSign(t.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
      <CustomerFooter />
    </div>
  );
}
