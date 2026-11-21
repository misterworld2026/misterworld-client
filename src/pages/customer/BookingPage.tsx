// 예약 5단계 + 완료 — 디자인 캔버스 Booking.dc.html을 실제 API로 구현. (MEMBER 전용)
// 흐름: 상품·일정 조회 → 등급·옵션(BE allowedGrades/allowedOptions 기준, Q10) → 여행객 정보(생년월일 포함, Q8)
//      → POST /api/reservations/quote (금액·할인 확정, quoteToken) → POST /api/reservations (requestKey 멱등)
//      → POST /api/my/applications/{id}/payment (World Pay 모의 결제) → 완료
// 확정 규칙 문구: 허니문 4명(2팀) 이상, 그 외 3명 이상 (Q5). 추가 옵션은 수량 없이 켜고 끄는 방식 (Q9).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { ApiError } from '@/api/client';
import { getMyProfile } from '@/api/auth';
import { fetchProduct, fetchProducts } from '@/api/tours';
import { fetchProductSchedules } from '@/api/schedules';
import { applyReservation, fetchCompletedTripCount, payApplication, quoteReservation } from '@/api/booking';
import type {
  ApplicationResponse, TravelApplicationRequest, TravelApplicationResponse, TravelOptionResponse, TravelProductResponse,
  TravelQuoteResponse, TravelScheduleResponse, VoiceSelection,
} from '@/api/types';
import { GRADE_LABEL, type Grade } from '@/domain/status';
import { capacityOf, carOf, classicBlocked, deadlineOf, needOf, needTextOf, todayIso, THEMES } from '@/domain/rules';
import { dateTimeKst, md } from '@/domain/format';
import { color } from '@/styles/tokens';
import CustomerHeader from '@/components/customer/Header';

// ---------------------------------------------------------------- 상수·도우미

const STEP_NAMES = ['일정', '등급', '옵션 변경', '여행객 정보', '결제'];
const GRADES: Grade[] = ['CLASSIC', 'GRAND', 'PREMIUM'];
const GRADE_RANK: Record<string, number> = { CLASSIC: 0, GRAND: 1, PREMIUM: 2 };
const GRADE_LOOK: Record<Grade, { eng: string; stars: number; minH: number; bg: string; fg: string; border: string; rule: string }> = {
  // 세 등급 카드는 크기·색상 동일 (등급별로 다른 것은 이름과 호텔 별 개수뿐)
  CLASSIC: { eng: 'CLASSIC', stars: 3, minH: 330, bg: '#ffffff', fg: '#000000', border: '#000000', rule: '#000000' },
  GRAND: { eng: 'GRAND', stars: 4, minH: 330, bg: '#ffffff', fg: '#000000', border: '#000000', rule: '#000000' },
  PREMIUM: { eng: 'PREMIUM', stars: 5, minH: 330, bg: '#ffffff', fg: '#000000', border: '#000000', rule: '#000000' },
};
const GREEN = '#1E7B34';

const REASON: Record<string, string> = {
  CAPACITY_EXCEEDED: '정원이 찼습니다',
  BOOKING_CLOSED: '신청 마감일이 지났습니다',
  SCHEDULE_UNAVAILABLE: '신청할 수 없는 일정입니다',
};

const wonSign = (n: number) => `₩${n.toLocaleString('ko-KR')}`;
const digits = (v: string) => v.replace(/\D/g, '');
const phoneOk = (v: string) => /^\d{10,11}$/.test(digits(v));
const newRequestKey = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '');

function bookingNo(a: ApplicationResponse): string {
  const day = dateTimeKst(a.appliedAt).slice(0, 10).replace(/\./g, '');
  return `MW-${day}-${String(a.id).padStart(4, '0')}`;
}

/** 단골 할인 예상 (BE와 같은 HALF_UP 반올림). 최종 금액은 견적 응답이 기준. */
function estimateDiscount(total: number, completedTrips: number) {
  const rate = completedTrips >= 2 ? 10 : 0;
  return { rate, amount: Math.round((total * rate) / 100) };
}

interface Traveler {
  name: string;
  phone: string;
  birth: string;
}
const emptyTraveler = (): Traveler => ({ name: '', phone: '', birth: '' });

// ---------------------------------------------------------------- 스타일

const OptBtn = styled.button<{ $on: boolean; $off?: boolean }>`
  min-height: 44px;
  padding: 10px 20px;
  border: 1px solid ${(p) => (p.$off ? '#eff1f2' : '#000000')};
  border-radius: 0;
  background: ${(p) => (p.$on ? '#000000' : p.$off ? '#eff1f2' : '#ffffff')};
  color: ${(p) => (p.$on ? '#ffffff' : '#000000')};
  font-size: 15px;
  line-height: 22px;
  text-decoration: ${(p) => (p.$off ? 'line-through' : 'none')};
  cursor: pointer;
`;

const TextInput = styled.input`
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
`;

const FieldLabel = styled.label`
  font-size: 15px;
  line-height: 22px;
  font-weight: 700;
`;

const H1 = styled.h1`
  margin: 0;
  font-size: 32px;
  line-height: 40px;
  font-weight: 700;
`;

const H2 = styled.h2`
  margin: 0;
  font-size: 22px;
  line-height: 28px;
  font-weight: 700;
`;

const OptRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 24px;
  padding: 24px 0;
  border-bottom: 1px solid ${color.surfaceCool};
  h2 {
    margin: 0;
    width: 120px;
    font-size: 17px;
    line-height: 24px;
    font-weight: 700;
  }
`;

function Notice({ children, tone = 'gold' }: { children: React.ReactNode; tone?: 'gold' | 'red' }) {
  return (
    <p role={tone === 'red' ? 'alert' : 'status'} style={{ margin: 0, fontSize: 15, lineHeight: '22px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span aria-hidden="true" style={{ flexShrink: 0, width: 12, height: 12, marginTop: 5, background: tone === 'red' ? color.danger : color.brandGold, display: 'block' }} />
      {children}
    </p>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, k) => (
        <svg key={k} aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.6l2.9 6 6.5.9-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.1 1.1-6.5L2.6 9.5l6.5-.9z" />
        </svg>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- 페이지

export default function BookingPage() {
  const [params] = useSearchParams();
  const location = useLocation() as { state?: { voice?: VoiceSelection } };
  const today = todayIso();

  const products = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
  const profile = useQuery({ queryKey: ['my-profile'], queryFn: getMyProfile, staleTime: 5 * 60_000 });
  const trips = useQuery({ queryKey: ['completed-trips'], queryFn: fetchCompletedTripCount });

  const [productId, setProductId] = useState<number | null>(null);
  const [scheduleId, setScheduleId] = useState<number | null>(null);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [hotelId, setHotelId] = useState<number | null>(null);
  const [mealId, setMealId] = useState<number | null>(null);
  const [extras, setExtras] = useState<number[]>([]);
  const [people, setPeople] = useState(1);
  const [travelers, setTravelers] = useState<Traveler[]>([emptyTraveler()]);
  const [step, setStep] = useState(1);
  const [ym, setYm] = useState<string | null>(null);

  const [quote, setQuote] = useState<TravelQuoteResponse | null>(null);
  const [requestKey, setRequestKey] = useState('');
  const [applied, setApplied] = useState<TravelApplicationResponse | null>(null);
  const [paid, setPaid] = useState<ApplicationResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const voiceApplied = useRef(false);
  const [voicePending, setVoicePending] = useState(false);

  // 상품 정렬: 테마 순서(허니문·효도·골프·트레킹) → 이름
  const productList = useMemo(
    () =>
      [...(products.data ?? [])].sort(
        (a, b) => THEMES.indexOf(a.theme as never) - THEMES.indexOf(b.theme as never) || a.name.localeCompare(b.name, 'ko'),
      ),
    [products.data],
  );
  // 목록 API(/api/tours)는 allowedGrades·options를 비워서 내려준다 → 등급·옵션은 상세 API(/api/tours/{id})로 가져온다.
  const detail = useQuery({
    queryKey: ['product', productId],
    queryFn: () => fetchProduct(productId as number),
    enabled: productId != null,
  });
  const product: TravelProductResponse | null =
    (detail.data?.id === productId ? detail.data : null) ?? productList.find((p) => p.id === productId) ?? null;
  const theme = product?.theme ?? '';
  const isHM = theme === '허니문';

  // 첫 진입: ?product=ID 또는 ?theme=테마 → 그 상품, 없으면 첫 상품
  useEffect(() => {
    if (productId != null || productList.length === 0) return;
    const byId = Number(params.get('product'));
    const byTheme = params.get('theme');
    const first =
      productList.find((p) => p.id === byId) ?? productList.find((p) => byTheme && p.theme === byTheme) ?? productList[0];
    setProductId(first.id);
  }, [productList, productId, params]);

  const schedules = useQuery({
    queryKey: ['schedules', productId],
    queryFn: () => fetchProductSchedules(productId as number),
    enabled: productId != null,
  });

  // ---- 일정 목록 (디자인: 신청 마감 전 + 선택 가능 상태만 노출, 정원 초과 등은 비활성) ----
  const list = useMemo(
    () =>
      (schedules.data ?? [])
        .filter((s) => s.selectionEnabled && today <= deadlineOf(s.departureDate))
        .sort((a, b) => a.departureDate.localeCompare(b.departureDate))
        .map((s) => ({
          s,
          ok: s.applicationEnabled,
          reason: s.applicationEnabled ? '' : (REASON[s.disabledReason ?? ''] ?? '지금은 신청할 수 없습니다'),
          status: s.status === 'CONFIRMED_SCHEDULE' ? '출발 확정' : '모집 중',
        })),
    [schedules.data, today],
  );
  const selected = list.find((x) => x.s.travelScheduleId === scheduleId && x.ok) ?? null;
  const schedule: TravelScheduleResponse | null = selected?.s ?? null;

  // 달력 월 범위
  const months = useMemo(() => {
    if (list.length === 0) return [today.slice(0, 7)];
    const start = list[0].s.departureDate.slice(0, 7);
    const end = list.reduce((m, x) => (x.s.arrivalDate.slice(0, 7) > m ? x.s.arrivalDate.slice(0, 7) : m), start);
    const out: string[] = [];
    let [y, m] = start.split('-').map(Number);
    for (let guard = 0; guard < 36; guard++) {
      const cur = `${y}-${String(m).padStart(2, '0')}`;
      out.push(cur);
      if (cur >= end) break;
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    return out;
  }, [list, today]);
  const curYm = ym && months.includes(ym) ? ym : (schedule ? schedule.departureDate.slice(0, 7) : months[0]);
  const mi = months.indexOf(curYm);

  // ---- 등급·옵션 ----
  const config = product?.allowedGrades.find((c) => c.grade === grade && c.configurationReady) ?? null;
  // 샴페인은 프리미엄 기본 포함 혜택 → 프리미엄에서는 추가 옵션으로 선택 불가
  const allowedIds = new Set(
    (config?.allowedOptions ?? []).filter((o) => !(grade === 'PREMIUM' && o.benefitCode === 'CHAMPAGNE')).map((o) => o.id),
  );
  const defaultOf = (type: string) => config?.defaultOptions.find((o) => o.type === type) ?? null;
  const optionsOf = (type: string) =>
    (product?.options ?? [])
      .filter((o) => o.type === type)
      .sort((a, b) => (GRADE_RANK[a.grade] ?? 9) - (GRADE_RANK[b.grade] ?? 9) || a.additionalPrice - b.additionalPrice || a.id - b.id);

  const hotel = (product?.options ?? []).find((o) => o.id === hotelId && allowedIds.has(o.id)) ?? defaultOf('HOTEL');
  const meal = (product?.options ?? []).find((o) => o.id === mealId && allowedIds.has(o.id)) ?? defaultOf('MEAL');
  const transport = defaultOf('TRANSPORT');
  const extraOpts = (product?.options ?? []).filter((o) => extras.includes(o.id) && allowedIds.has(o.id));
  const chosen = [hotel, transport, meal, ...extraOpts].filter((o): o is TravelOptionResponse => o != null);
  const optionIds = chosen.map((o) => o.id);

  const pickGrade = (g: Grade) => {
    setGrade(g);
    setHotelId(null);
    setMealId(null);
    setExtras([]);
  };

  // ---- 인원·여행객 ----
  const cap = capacityOf(theme);
  const remain = schedule ? Math.max(cap - schedule.applicantCount, 0) : 0;
  const maxPeople = Math.max(Math.min(remain, 20), 1);
  const count = isHM ? 2 : Math.min(Math.max(people, 1), maxPeople);

  useEffect(() => {
    setTravelers((prev) => {
      const next = prev.slice(0, count);
      while (next.length < count) next.push(emptyTraveler());
      return next;
    });
  }, [count]);

  const setTrav = (i: number, key: keyof Traveler, value: string) =>
    setTravelers((prev) => prev.map((t, k) => (k === i ? { ...t, [key]: value } : t)));

  const me = profile.data;
  const birthOk = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && v <= today;
  const travOk =
    !!me &&
    travelers.length === count &&
    birthOk(travelers[0]?.birth ?? '') &&
    travelers.slice(1).every((t) => t.name.trim() && phoneOk(t.phone) && birthOk(t.birth));

  // ---- 금액 (예상) ----
  const unit = config?.price ?? 0;
  const extraUnit = (o: TravelOptionResponse | null) => (o && o.defaultForGrade !== grade ? o.additionalPrice : 0);
  const optUnit = chosen.reduce((n, o) => n + extraUnit(o), 0);
  const subtotal = (unit + optUnit) * count;
  const completedTrips = quote?.completedTrips ?? trips.data ?? 0;
  const est = estimateDiscount(subtotal, completedTrips);
  const price = quote?.price ?? {
    basePrice: unit * count,
    additionalOptionPrice: optUnit * count,
    discountRate: est.rate,
    discountAmount: est.amount,
    totalPrice: subtotal - est.amount,
  };

  const priceLines: { label: string; unit?: string; rest?: string; value: string }[] = [];
  if (config) {
    priceLines.push({ label: `상품 ${unit.toLocaleString('ko-KR')}원`, unit: '/1인', rest: ` × ${count}명`, value: wonSign(unit * count) });
    if (hotel && extraUnit(hotel)) priceLines.push({ label: `호텔 변경 · ${hotel.name} × ${count}명`, value: `+${wonSign(extraUnit(hotel) * count)}` });
    if (meal && extraUnit(meal)) priceLines.push({ label: `식사 변경 · ${meal.name} × ${count}명`, value: `+${wonSign(extraUnit(meal) * count)}` });
    for (const o of extraOpts) priceLines.push({ label: `${o.name} × ${count}명`, value: `+${wonSign(extraUnit(o) * count)}` });
  }

  // ---- 음성 선택 적용 ----
  const applySelection = (sel: VoiceSelection) => {
    if (sel.productId != null && sel.productId !== productId) {
      setProductId(sel.productId);
      setYm(null);
    }
    setScheduleId(sel.scheduleId ?? null);
    const g = (sel.grade as Grade | null) ?? null;
    setGrade(g);
    setHotelId(sel.optionIds?.HOTEL ?? null);
    setMealId(sel.optionIds?.MEAL ?? null);
    setExtras(sel.optionIds?.EXTRA ?? []);
    setPeople(1);
    setQuote(null);
    setError('');
    setVoicePending(true); // 일정 목록을 불러온 뒤 누락된 첫 단계로 이동
  };

  // 음성 선택 적용 후: 값이 실제로 유효한지 확인하고 누락된 가장 앞 단계로 이동
  // 일정(1) → 등급(2) → 옵션(3, 기본 구성이 있어 필수 아님) → 여행객 정보(4, 음성으로 채우지 않음)
  useEffect(() => {
    if (!voicePending || productId == null || !product) return;
    if (schedules.isFetching || !(schedules.isSuccess || schedules.isError)) return;
    setVoicePending(false);
    if (!selected) setScheduleId(null);
    setStep(!selected ? 1 : !config ? 2 : 4);
    window.scrollTo({ top: 0 });
  }, [voicePending, productId, product, schedules.isFetching, schedules.isSuccess, schedules.isError, selected, config]);

  useEffect(() => {
    const v = location.state?.voice;
    if (!v || voiceApplied.current || productList.length === 0) return;
    voiceApplied.current = true;
    applySelection(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productList, location.state]);

  // ---- 견적 → 신청 → 결제 ----
  const buildRequest = (key: string, token?: string): TravelApplicationRequest | null => {
    if (!product || !schedule || !grade || !me) return null;
    return {
      productId: product.id,
      scheduleId: schedule.travelScheduleId,
      grade,
      optionIds,
      applicantCount: count,
      participants: travelers.map((t, i) =>
        i === 0
          ? { name: me.name, phoneNumber: me.phoneNumber, birthDate: t.birth, participantType: 'APPLICANT' as const }
          : { name: t.name.trim(), phoneNumber: t.phone.trim(), birthDate: t.birth, participantType: 'COMPANION' as const },
      ),
      requestKey: key,
      quoteToken: token ?? null,
    };
  };

  const runQuote = async (): Promise<TravelQuoteResponse | null> => {
    const key = newRequestKey();
    const req = buildRequest(key);
    if (!req) return null;
    const q = await quoteReservation(req);
    setRequestKey(key);
    setQuote(q);
    return q;
  };

  const goQuote = async () => {
    setBusy(true);
    setError('');
    try {
      if (await runQuote()) setStep(5);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '금액을 확인하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const goPay = async () => {
    setBusy(true);
    setError('');
    try {
      let result = applied;
      if (!result) {
        const req = quote && buildRequest(requestKey, quote.quoteToken);
        if (!req) return;
        try {
          result = await applyReservation(req);
        } catch (e) {
          if (e instanceof ApiError && (e.code === 'QUOTE_CHANGED' || e.code === 'INVALID_QUOTE')) {
            await runQuote();
            setError('확인 시간이 지났거나 구성·금액이 바뀌었습니다. 다시 확인한 금액으로 한 번 더 결제를 눌러 주세요.');
            return;
          }
          throw e;
        }
        setApplied(result);
      }
      try {
        const done = await payApplication(result.application.id);
        setPaid(done);
        setStep(6);
        window.scrollTo({ top: 0 });
      } catch (e) {
        setError(
          `신청은 저장되었지만 결제를 완료하지 못했습니다. 다시 눌러 결제를 진행해 주세요.${e instanceof ApiError ? ` (${e.message})` : ''}`,
        );
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '신청을 저장하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  // ---- 단계 이동 ----
  const canNext =
    !busy &&
    step <= 5 &&
    (step !== 1 || !!selected) &&
    (step !== 2 || !!config) &&
    (step !== 4 || travOk) &&
    (step !== 5 || !!quote);

  const goNext = () => {
    if (!canNext) return;
    if (step === 4) return void goQuote();
    if (step === 5) return void goPay();
    setError('');
    setStep(step + 1);
    window.scrollTo({ top: 0 });
  };
  const goPrev = () => {
    if (step <= 1 || busy) return;
    if (step === 5 && !applied) setQuote(null);
    setError('');
    setStep(step - 1);
  };

  // 상품(테마) 변경
  const pickProduct = (id: number) => {
    if (id === productId) return;
    setProductId(id);
    setScheduleId(null);
    setGrade(null);
    setHotelId(null);
    setMealId(null);
    setExtras([]);
    setYm(null);
    setPeople(1);
    setQuote(null);
  };

  // ---- 하단 요약 ----
  const optionSummary = config
    ? [hotel?.name, transport?.name ?? carOf(theme), meal?.name, extraOpts.map((o) => o.name).join(', ')].filter(Boolean).join(' / ')
    : '-';
  const summary = [
    { label: '테마', value: product?.name ?? '-' },
    { label: '일정', value: schedule ? `${md(schedule.departureDate)} - ${md(schedule.arrivalDate)}` : '-' },
    { label: '등급', value: grade ? GRADE_LABEL[grade] : '-' },
    { label: '옵션', value: optionSummary },
    { label: '인원', value: step >= 4 ? `${count}명` : '-' },
    {
      label: step >= 4 ? (quote ? '결제 금액' : '예상 금액') : '예상 금액',
      value: step >= 4 ? wonSign(price.totalPrice) : config ? `${(unit + optUnit).toLocaleString('ko-KR')}원` : '-',
      unit: step < 4 && config ? '/1인' : '',
    },
  ];
  const orderLines = summary.slice(0, 5);

  // ---- 완료 문구 ----
  const need = needOf(theme);
  const newCount = (applied ? (quote?.schedule.applicantCount ?? schedule?.applicantCount ?? 0) : 0) + count;
  const confirmedNow = applied?.departureConfirmed ?? false;
  const short = need - newCount;
  const doneNotice = confirmedNow
    ? `이 일정은 신청 인원 ${newCount}명으로 출발이 확정되었습니다. 확정 안내 문자를 ${me?.phoneNumber ?? '가입한 연락처'}로 보내드렸습니다.`
    : short > 0
      ? `현재 신청 인원은 ${newCount}명입니다. ${short}명${isHM ? `(${Math.ceil(short / 2)}팀)` : ''}이 더 신청하면 출발이 확정되고 문자로 알려드립니다.`
      : `현재 신청 인원은 ${newCount}명입니다. 출발이 확정되면 문자로 알려드립니다.`;

  const rule = isHM
    ? `${product?.name ?? '허니문'}는 2인 전용이며, 한 일정에 최대 4명(2팀)까지 신청할 수 있습니다. 신청 인원이 4명(2팀) 이상이면 출발이 확정됩니다.`
    : '신청 인원이 3명 이상이면 출발이 확정되고 문자로 알려드립니다. 신청은 출발 7일 전까지 가능합니다.';

  // ---- 달력 칸 ----
  const [cy, cm] = curYm.split('-').map(Number);
  const lead = new Date(Date.UTC(cy, cm - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(cy, cm, 0)).getUTCDate();
  type Cell = { key: string; label: string; x?: (typeof list)[number]; iso?: string };
  const cells: Cell[] = [];
  for (let i = 0; i < lead; i++) cells.push({ key: `l${i}`, label: '' });
  for (let d = 1; d <= days; d++) {
    const iso = `${curYm}-${String(d).padStart(2, '0')}`;
    const x = list.find((it) => iso >= it.s.departureDate && iso <= it.s.arrivalDate);
    cells.push({ key: iso, label: String(d), x, iso });
  }
  while (cells.length % 7) cells.push({ key: `t${cells.length}`, label: '' });

  const loadErr = products.error ?? schedules.error;

  return (
    <div style={{ background: '#ffffff', color: '#000000', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <CustomerHeader />

      <main style={{ flexGrow: 1, padding: '96px 24px 64px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 40 }}>
          {step <= 5 && (
            <div style={{ overflowX: 'auto' }}>
              <ol
                aria-label="예약 단계"
                style={{ listStyle: 'none', margin: 0, padding: 0, position: 'relative', minWidth: 900, height: 48, display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', alignItems: 'center' }}
              >
                <span aria-hidden="true" style={{ position: 'absolute', left: '10%', right: '10%', top: 23, height: 2, background: '#c4c4c4', display: 'block' }} />
                <span aria-hidden="true" style={{ position: 'absolute', left: '10%', width: `${(step - 1) * 20}%`, top: 23, height: 2, background: '#000000', display: 'block', transition: 'width .3s ease' }} />
                {STEP_NAMES.map((n, i) => (
                  <li key={n} aria-current={i + 1 === step ? 'step' : undefined} style={{ position: 'relative', zIndex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
                    <span style={{ background: '#ffffff', padding: '0 16px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                      <span style={{ color: i + 1 <= step ? '#000000' : color.consoleFaint, fontSize: 15, lineHeight: '20px', fontWeight: i + 1 <= step ? 700 : 400 }}>{n}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {loadErr != null && <Notice tone="red">{loadErr instanceof ApiError ? loadErr.message : '여행 정보를 불러오지 못했습니다. 새로고침해 주세요.'}</Notice>}

          {/* ---------------- 1. 일정 ---------------- */}
          {step === 1 && (
            <section aria-labelledby="step1-title" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              <H1 id="step1-title">일정 선택</H1>
              <div role="group" aria-label="여행 테마" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {productList.map((p) => (
                  <OptBtn key={p.id} type="button" $on={p.id === productId} aria-pressed={p.id === productId} onClick={() => pickProduct(p.id)}>
                    {p.name}
                  </OptBtn>
                ))}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px 64px', alignItems: 'flex-start' }}>
                <div style={{ flex: '0 1 440px', minWidth: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button type="button" onClick={() => mi > 0 && setYm(months[mi - 1])} disabled={mi <= 0} aria-label="이전 달" style={{ width: 44, height: 44, border: '1px solid #000000', background: '#ffffff', color: '#000000', fontSize: 17, cursor: 'pointer', opacity: mi <= 0 ? 0.3 : 1 }}>‹</button>
                    <h2 style={{ margin: 0, fontSize: 22, lineHeight: '28px', fontWeight: 700 }}>{cy}년 {cm}월</h2>
                    <button type="button" onClick={() => mi < months.length - 1 && setYm(months[mi + 1])} disabled={mi >= months.length - 1} aria-label="다음 달" style={{ width: 44, height: 44, border: '1px solid #000000', background: '#ffffff', color: '#000000', fontSize: 17, cursor: 'pointer', opacity: mi >= months.length - 1 ? 0.3 : 1 }}>›</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', textAlign: 'center', fontSize: 14, lineHeight: '20px', fontWeight: 700 }}>
                    {['일', '월', '화', '수', '목', '금', '토'].map((d) => <span key={d}>{d}</span>)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', rowGap: 4 }}>
                    {cells.map((c) => {
                      if (!c.x) return <span key={c.key} style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{c.label}</span>;
                      const { s, ok, reason } = c.x;
                      const on = scheduleId === s.travelScheduleId && ok;
                      const strike = `linear-gradient(#767676, #767676) ${c.iso === s.departureDate ? 'right center / 65%' : c.iso === s.arrivalDate ? 'left center / 65%' : 'center / 100%'} 1.5px no-repeat, #eff1f2`;
                      return (
                        <button
                          key={c.key}
                          type="button"
                          disabled={!ok}
                          aria-pressed={on}
                          aria-label={`${cm}월 ${c.label}일, ${md(s.departureDate)}부터 ${md(s.arrivalDate)}까지 일정${ok ? '' : `, 선택 불가: ${reason}`}`}
                          onClick={() => ok && setScheduleId(s.travelScheduleId)}
                          style={{ height: 48, border: 0, borderRadius: 0, padding: 0, background: on ? color.brandGold : ok ? color.navyDeep : strike, color: on || ok ? '#ffffff' : '#000000', fontSize: 15, fontWeight: 700, cursor: ok ? 'pointer' : 'not-allowed' }}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                  <ul aria-label="달력 표시 설명" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '8px 20px', fontSize: 14, lineHeight: '20px' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span aria-hidden="true" style={{ width: 16, height: 16, background: color.navyDeep, display: 'block' }} />신청 가능</li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span aria-hidden="true" style={{ width: 16, height: 16, background: color.brandGold, display: 'block' }} />선택한 일정</li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span aria-hidden="true" style={{ width: 16, height: 16, background: color.surfaceCool, display: 'block' }} />신청 불가</li>
                  </ul>
                </div>

                <div style={{ flex: '1 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {schedules.isLoading && <p style={{ margin: 0, fontSize: 15 }}>일정을 불러오는 중입니다…</p>}
                  {!schedules.isLoading && productId != null && list.length === 0 && (
                    <p style={{ margin: 0, fontSize: 15, lineHeight: '22px' }}>지금 신청할 수 있는 일정이 없습니다. 다른 테마를 골라 보세요.</p>
                  )}
                  {list.map(({ s, ok, reason, status }) => {
                    const on = scheduleId === s.travelScheduleId && ok;
                    return (
                      <button
                        key={s.travelScheduleId}
                        type="button"
                        disabled={!ok}
                        aria-pressed={on}
                        onClick={() => {
                          if (!ok) return;
                          setScheduleId(s.travelScheduleId);
                          setYm(s.departureDate.slice(0, 7));
                        }}
                        style={{
                          boxSizing: 'border-box', minHeight: 64, padding: '12px 20px',
                          border: `2px solid ${on ? '#000000' : ok ? color.surfaceSoft : color.surfaceCool}`,
                          borderLeft: `8px solid ${on ? color.brandGold : ok ? color.navyDeep : '#c4c4c4'}`,
                          borderRadius: 0, background: ok ? color.surfaceSoft : color.surfaceCool, color: ok ? '#000000' : color.consoleFaint,
                          textAlign: 'left', display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) 84px 104px 184px', alignItems: 'center', gap: '8px 16px', cursor: ok ? 'pointer' : 'not-allowed',
                        }}
                      >
                        <span style={{ fontSize: 17, lineHeight: '24px', fontWeight: 700, whiteSpace: 'nowrap', textDecoration: ok ? 'none' : 'line-through' }}>
                          {md(s.departureDate)} - {md(s.arrivalDate)}
                        </span>
                        <span style={{ fontSize: 15, lineHeight: '22px', fontWeight: 700, color: !ok ? color.consoleFaint : status === '출발 확정' ? GREEN : color.info, whiteSpace: 'nowrap' }}>{status}</span>
                        <span style={{ fontSize: 15, lineHeight: '22px', whiteSpace: 'nowrap' }}>신청 {s.applicantCount} / {cap}명</span>
                        <span style={{ fontSize: 15, lineHeight: '22px', whiteSpace: 'nowrap' }}>{ok ? `신청 마감 ${md(deadlineOf(s.departureDate))}` : reason}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 15, lineHeight: '22px' }}>{rule}</p>
            </section>
          )}

          {/* ---------------- 2. 등급 ---------------- */}
          {step === 2 && product && (
            <section aria-labelledby="step2-title" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              <H1 id="step2-title">등급 선택</H1>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, alignItems: 'stretch', paddingTop: 8 }}>
                {GRADES.map((g) => {
                  const c = product.allowedGrades.find((x) => x.grade === g);
                  const ok = !!c && c.configurationReady;
                  const on = grade === g && ok;
                  const L = GRADE_LOOK[g];
                  const dh = c?.defaultOptions.find((o) => o.type === 'HOTEL')?.name ?? '-';
                  const dm = c?.defaultOptions.find((o) => o.type === 'MEAL')?.name ?? '-';
                  const dt = c?.defaultOptions.find((o) => o.type === 'TRANSPORT')?.name ?? carOf(theme);
                  const why = classicBlocked(theme) && g === 'CLASSIC' ? `${product.name}는 그랜드 이상만 선택할 수 있습니다` : '지금은 고를 수 없는 등급입니다';
                  return (
                    <button
                      key={g}
                      type="button"
                      disabled={!ok}
                      aria-pressed={on}
                      title={ok ? undefined : why}
                      onClick={() => ok && pickGrade(g)}
                      style={{
                        boxSizing: 'border-box', minHeight: L.minH, padding: 24, border: `1px solid ${ok ? L.border : '#c4c4c4'}`, borderRadius: 0,
                        outline: `3px solid ${on ? color.brandGold : 'transparent'}`, outlineOffset: 4, background: ok ? L.bg : color.surfaceSoft,
                        color: ok ? L.fg : color.consoleFaint, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 20, cursor: ok ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '4px 12px' }}>
                        <span style={{ fontSize: 40, lineHeight: '48px', fontWeight: 700, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{L.eng}</span>
                        <span style={{ fontSize: 14, lineHeight: '20px', fontWeight: 700, color: color.brandGold, whiteSpace: 'nowrap' }}>{on ? '선택됨' : ''}</span>
                      </span>
                      <span style={{ height: 1, background: ok ? L.rule : '#c4c4c4', display: 'block' }} />
                      <span style={{ display: 'grid', gridTemplateColumns: '24px auto minmax(0, 1fr)', alignItems: 'center', gap: '14px 10px', fontSize: 15, lineHeight: '22px' }}>
                        <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V4h10v17" /><path d="M14 9h6v12" /><path d="M2.5 21h19" /><path d="M7 7.5h1M10 7.5h1M7 11h1M10 11h1M7 14.5h1M10 14.5h1M17 12.5h0.5M17 16h0.5" /><path d="M7.5 21v-3h3v3" /></svg>
                        <span style={{ fontWeight: 700, paddingRight: 4 }}>호텔</span>
                        <span role="img" aria-label={dh} style={{ display: 'flex', gap: 3 }}><Stars n={L.stars} /></span>
                        <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v5.5a2 2 0 0 0 4 0V3" /><path d="M8 3v18" /><path d="M18 21V3c-2.2 1.4-3.4 4-3.4 7.2 0 2.2 1.1 3.3 3.4 3.3" /></svg>
                        <span style={{ fontWeight: 700, paddingRight: 4 }}>식사</span>
                        <span>{dm}</span>
                        <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 16.5V12l2.3-4.5h9.4L18 12h2a1 1 0 0 1 1 1v3.5h-1.6" /><path d="M3 16.5h1.6M9.4 16.5h5.2" /><path d="M5.5 12h12.5" /><path d="M10.5 7.5V12" /><circle cx="7" cy="16.8" r="2.1" /><circle cx="17" cy="16.8" r="2.1" /></svg>
                        <span style={{ fontWeight: 700, paddingRight: 4 }}>교통</span>
                        <span>{dt}</span>
                      </span>
                      <span style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: 22, lineHeight: '28px', fontWeight: 700 }}>
                          {ok && c?.price != null ? (
                            <>
                              {c.price.toLocaleString('ko-KR')}원<span style={{ fontSize: 15, opacity: 0.7 }}>/1인</span>
                            </>
                          ) : (
                            <span style={{ fontSize: 15, fontWeight: 400 }}>{why}</span>
                          )}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p style={{ margin: 0, fontSize: 15, lineHeight: '22px' }}>
                등급을 고르면 호텔과 식사의 기본 구성이 정해집니다. 다음 단계에서 호텔·식사를 바꾸거나 추가 옵션을 고를 수 있습니다.
              </p>
            </section>
          )}

          {/* ---------------- 3. 옵션 변경 ---------------- */}
          {step === 3 && product && config && grade && (
            <section aria-labelledby="step3-title" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <H1 id="step3-title">옵션 변경</H1>
                <p style={{ margin: 0, fontSize: 17, lineHeight: '26px' }}>
                  {GRADE_LABEL[grade]} 등급의 기본 구성에서 시작합니다. 호텔과 식사는 등급보다 높은 쪽으로만 바꿀 수 있습니다.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', borderTop: '2px solid #000000' }}>
                {(['HOTEL', 'MEAL'] as const).map((type) => {
                  const opts = optionsOf(type);
                  const cur = type === 'HOTEL' ? hotel : meal;
                  const def = defaultOf(type);
                  const blocked = opts.some((o) => !allowedIds.has(o.id));
                  const word = type === 'HOTEL' ? '호텔' : '식사';
                  return (
                    <OptRow key={type} style={{ order: type === 'HOTEL' ? 0 : 2 }}>
                      <h2>{word}</h2>
                      <div style={{ flex: '1 1 480px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div role="group" aria-label={word} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {opts.map((o) => {
                            const ok = allowedIds.has(o.id);
                            const isDef = def?.id === o.id;
                            const add = ok && !isDef && o.additionalPrice ? ` · +${o.additionalPrice.toLocaleString('ko-KR')}원` : '';
                            return (
                              <OptBtn
                                key={o.id}
                                type="button"
                                disabled={!ok}
                                $off={!ok}
                                $on={cur?.id === o.id}
                                aria-pressed={cur?.id === o.id}
                                onClick={() => ok && (type === 'HOTEL' ? setHotelId(o.id) : setMealId(o.id))}
                              >
                                {o.name}
                                {isDef ? ' (기본)' : add}
                              </OptBtn>
                            );
                          })}
                        </div>
                        {blocked && def && (
                          <p style={{ margin: 0, fontSize: 14, lineHeight: '20px' }}>
                            {GRADE_LABEL[grade]} 등급은 {def.name}보다 낮은 {word}로 바꿀 수 없습니다.
                          </p>
                        )}
                      </div>
                    </OptRow>
                  );
                })}

                <OptRow style={{ order: 1 }}>
                  <h2>교통</h2>
                  <div style={{ flex: '1 1 480px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 17, lineHeight: '24px' }}>{transport?.name ?? carOf(theme)}</p>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: '20px' }}>변경 불가 · 테마별 기본 차량으로 운행합니다.</p>
                  </div>
                </OptRow>

                <OptRow style={{ order: 3 }}>
                  <h2>추가</h2>
                  <div style={{ flex: '1 1 480px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {optionsOf('EXTRA').length === 0 ? (
                      <p style={{ margin: 0, fontSize: 15, lineHeight: '22px' }}>이 상품에는 추가할 수 있는 옵션이 없습니다.</p>
                    ) : (
                      <div role="group" aria-label="추가 옵션" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {optionsOf('EXTRA').map((o) => {
                          const ok = allowedIds.has(o.id);
                          const on = extras.includes(o.id) && ok;
                          return (
                            <OptBtn
                              key={o.id}
                              type="button"
                              disabled={!ok}
                              $off={!ok}
                              $on={on}
                              aria-pressed={on}
                              onClick={() => ok && setExtras((prev) => (prev.includes(o.id) ? prev.filter((x) => x !== o.id) : [...prev, o.id]))}
                            >
                              {o.name} · +{o.additionalPrice.toLocaleString('ko-KR')}원<span style={{ fontSize: 12, opacity: 0.7 }}>/1인</span>
                            </OptBtn>
                          );
                        })}
                      </div>
                    )}
                    {grade === 'PREMIUM' && optionsOf('EXTRA').some((o) => o.benefitCode === 'CHAMPAGNE') && (
                      <p style={{ margin: 0, fontSize: 14, lineHeight: '20px' }}>프리미엄 등급에는 샴페인이 기본으로 포함되어 있어 따로 추가하지 않습니다.</p>
                    )}
                  </div>
                </OptRow>
              </div>
            </section>
          )}

          {/* ---------------- 4. 여행객 정보 ---------------- */}
          {step === 4 && product && (
            <section aria-labelledby="step4-title" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              <H1 id="step4-title">여행객 정보</H1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'flex-start' }}>
                <div style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 32 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <H2>신청 인원</H2>
                    {isHM ? (
                      <p style={{ margin: 0, fontSize: 17, lineHeight: '24px' }}>
                        <span style={{ fontWeight: 700 }}>2명</span> · {product.name}는 2인 전용입니다.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
                        <span style={{ display: 'flex', alignItems: 'center', border: '1px solid #000000' }}>
                          <button type="button" onClick={() => setPeople(Math.max(count - 1, 1))} disabled={count <= 1} aria-label="인원 1명 줄이기" style={{ width: 44, height: 44, border: 0, borderRadius: 0, background: '#ffffff', color: '#000000', fontSize: 20, cursor: 'pointer', opacity: count <= 1 ? 0.3 : 1 }}>−</button>
                          <span aria-live="polite" style={{ minWidth: 56, textAlign: 'center', fontSize: 17, fontWeight: 700 }}>{count}명</span>
                          <button type="button" onClick={() => setPeople(Math.min(count + 1, maxPeople))} disabled={count >= maxPeople} aria-label="인원 1명 늘리기" style={{ width: 44, height: 44, border: 0, borderRadius: 0, background: '#ffffff', color: '#000000', fontSize: 20, cursor: 'pointer', opacity: count >= maxPeople ? 0.3 : 1 }}>+</button>
                        </span>
                        <span style={{ fontSize: 15, lineHeight: '22px' }}>이 일정의 남은 자리 {remain}명</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <H2>여행객 정보</H2>
                    <div style={{ padding: 20, background: color.surfaceSoft, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <span style={{ fontSize: 15, lineHeight: '22px', fontWeight: 700 }}>여행객 1 · 본인</span>
                        <span style={{ fontSize: 17, lineHeight: '24px' }}>{me ? `${me.name} · ${me.phoneNumber}` : '회원 정보를 불러오는 중입니다…'}</span>
                        <span style={{ fontSize: 14, lineHeight: '20px' }}>가입 정보로 자동 입력되었습니다.</span>
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 280 }}>
                        <FieldLabel htmlFor="tv-birth-0">생년월일</FieldLabel>
                        <TextInput id="tv-birth-0" type="date" max={today} value={travelers[0]?.birth ?? ''} onChange={(e) => setTrav(0, 'birth', e.target.value)} />
                      </span>
                    </div>
                    {travelers.slice(1).map((t, k) => {
                      const i = k + 1;
                      return (
                        <fieldset key={i} style={{ margin: 0, padding: 20, border: '1px solid #000000', display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
                          <legend style={{ padding: '0 8px', fontSize: 15, lineHeight: '22px', fontWeight: 700 }}>여행객 {i + 1}</legend>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                            <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <FieldLabel htmlFor={`tv-name-${i}`}>이름</FieldLabel>
                              <TextInput id={`tv-name-${i}`} type="text" autoComplete="off" maxLength={50} value={t.name} onChange={(e) => setTrav(i, 'name', e.target.value)} />
                            </div>
                            <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <FieldLabel htmlFor={`tv-phone-${i}`}>연락처</FieldLabel>
                              <TextInput id={`tv-phone-${i}`} type="tel" autoComplete="off" placeholder="010-0000-0000" value={t.phone} onChange={(e) => setTrav(i, 'phone', e.target.value)} />
                            </div>
                            <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <FieldLabel htmlFor={`tv-birth-${i}`}>생년월일</FieldLabel>
                              <TextInput id={`tv-birth-${i}`} type="date" max={today} value={t.birth} onChange={(e) => setTrav(i, 'birth', e.target.value)} />
                            </div>
                          </div>
                        </fieldset>
                      );
                    })}
                    {!travOk && (
                      <Notice>모든 여행객의 이름, 연락처(숫자 10~11자리), 생년월일을 입력하면 다음 단계로 넘어갈 수 있습니다.</Notice>
                    )}
                  </div>
                </div>

                <aside aria-label="금액" style={{ flex: '1 1 340px', boxSizing: 'border-box', padding: 24, background: color.surfaceSoft, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <H2>금액</H2>
                  <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {priceLines.map((p) => (
                      <div key={p.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 15, lineHeight: '22px' }}>
                        <dt>
                          {p.label}
                          {p.unit && <span style={{ fontSize: 13, opacity: 0.7 }}>{p.unit}</span>}
                          {p.rest}
                        </dt>
                        <dd style={{ margin: 0, whiteSpace: 'nowrap' }}>{p.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, paddingTop: 12, borderTop: '1px solid #000000', fontSize: 15, lineHeight: '22px' }}>
                    <span>소계</span>
                    <span>{wonSign(subtotal)}</span>
                  </div>
                  {est.rate > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 15, lineHeight: '22px', fontWeight: 700 }}>
                      <span>단골 할인 {est.rate}% · 완료 여행 {completedTrips}회</span>
                      <span style={{ whiteSpace: 'nowrap' }}>−{wonSign(est.amount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, paddingTop: 12, borderTop: '2px solid #000000' }}>
                    <span style={{ fontSize: 17, lineHeight: '24px', fontWeight: 700 }}>최종 금액</span>
                    <span style={{ fontSize: 22, lineHeight: '28px', fontWeight: 700 }}>{wonSign(subtotal - est.amount)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: '20px' }}>신청 인원이 {needTextOf(theme)}이 되면 출발이 확정되고 문자로 알려드립니다.</p>
                </aside>
              </div>
            </section>
          )}

          {/* ---------------- 5. 결제 ---------------- */}
          {step === 5 && quote && (
            <section aria-labelledby="step5-title" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              <H1 id="step5-title">결제</H1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'flex-start' }}>
                <div style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <H2>결제 수단</H2>
                  <div role="radiogroup" aria-label="결제 수단">
                    <button
                      type="button"
                      role="radio"
                      aria-checked="true"
                      style={{ width: '100%', boxSizing: 'border-box', minHeight: 96, padding: 24, border: '2px solid #000000', borderLeft: `8px solid ${color.brandGold}`, borderRadius: 0, background: '#ffffff', color: '#000000', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
                    >
                      <span aria-hidden="true" style={{ flexShrink: 0, width: 20, height: 20, boxSizing: 'border-box', border: '2px solid #000000', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#000000', display: 'block' }} />
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: 22, lineHeight: '28px', fontWeight: 700 }}>World Pay</span>
                        <span style={{ fontSize: 15, lineHeight: '22px' }}>Mr. World 전용 결제 수단입니다.</span>
                      </span>
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: '22px' }}>아래 "World Pay로 결제"를 누르면 결제가 진행됩니다.</p>
                </div>

                <aside aria-label="결제 내역" style={{ flex: '1 1 340px', boxSizing: 'border-box', padding: 24, background: color.surfaceSoft, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <H2>예약 내역</H2>
                  <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {orderLines.map((o) => (
                      <div key={o.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 15, lineHeight: '22px' }}>
                        <dt style={{ flexShrink: 0 }}>{o.label}</dt>
                        <dd style={{ margin: 0, textAlign: 'right' }}>{o.value}</dd>
                      </div>
                    ))}
                  </dl>
                  {quote.price.discountRate > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, paddingTop: 12, borderTop: '1px solid #000000', fontSize: 15, lineHeight: '22px', fontWeight: 700 }}>
                      <span>단골 할인 {quote.price.discountRate}%</span>
                      <span style={{ whiteSpace: 'nowrap' }}>−{wonSign(quote.price.discountAmount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, paddingTop: 12, borderTop: '2px solid #000000' }}>
                    <span style={{ fontSize: 17, lineHeight: '24px', fontWeight: 700 }}>결제 금액</span>
                    <span style={{ fontSize: 22, lineHeight: '28px', fontWeight: 700 }}>{wonSign(quote.price.totalPrice)}</span>
                  </div>
                </aside>
              </div>
            </section>
          )}

          {error && step <= 5 && <Notice tone="red">{error}</Notice>}

          {/* ---------------- 완료 ---------------- */}
          {step === 6 && applied && (
            <section aria-labelledby="done-title" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 24, padding: '40px 0' }}>
              <span aria-hidden="true" style={{ width: 64, height: 64, background: color.brandGold, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              </span>
              <H1 id="done-title">예약이 완료되었습니다</H1>
              <dl style={{ margin: 0, width: '100%', maxWidth: 560, boxSizing: 'border-box', padding: 24, background: color.surfaceSoft, display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 15, lineHeight: '22px' }}>
                  <dt>예약 번호</dt>
                  <dd style={{ margin: 0, fontWeight: 700 }}>{bookingNo(paid ?? applied.application)}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 15, lineHeight: '22px' }}>
                  <dt>신청 상태</dt>
                  <dd style={{ margin: 0, fontWeight: 700 }}>{confirmedNow ? '출발 확정' : '출발 확정 대기'}</dd>
                </div>
                {orderLines.map((o) => (
                  <div key={o.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 15, lineHeight: '22px' }}>
                    <dt style={{ flexShrink: 0 }}>{o.label}</dt>
                    <dd style={{ margin: 0, textAlign: 'right' }}>{o.value}</dd>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, paddingTop: 12, borderTop: '2px solid #000000', fontSize: 17, lineHeight: '24px', fontWeight: 700 }}>
                  <dt>결제 금액</dt>
                  <dd style={{ margin: 0 }}>{wonSign(paid?.paidAmount ?? applied.application.totalPrice)} · World Pay</dd>
                </div>
              </dl>
              <p style={{ margin: 0, maxWidth: 560, fontSize: 17, lineHeight: '26px' }}>{doneNotice}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Link to="/" style={{ background: '#000000', color: '#ffffff', fontSize: 14, lineHeight: '20px', padding: '14px 32px' }}>홈으로</Link>
                <Link to="/my" style={{ border: '1px solid #000000', color: '#000000', fontSize: 14, lineHeight: '20px', padding: '13px 32px' }}>내 예약 보기</Link>
              </div>
            </section>
          )}
        </div>
      </main>

      {step <= 5 && (
        <div style={{ position: 'sticky', bottom: 0, zIndex: 10, background: color.surfaceDark, color: '#ffffff', padding: '16px 24px', flexShrink: 0 }}>
          <div style={{ maxWidth: 1392, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px 32px' }}>
            <dl style={{ margin: 0, flex: '0 1 auto', maxWidth: '100%', overflowX: 'auto', display: 'grid', gridTemplateColumns: '150px 160px 60px 410px 48px 112px', gap: '8px 24px' }}>
              {summary.map((m) => (
                <div key={m.label} style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <dt style={{ fontSize: 14, lineHeight: '20px', whiteSpace: 'nowrap' }}>{m.label}</dt>
                  <dd title={m.value} style={{ margin: 0, fontSize: 15, lineHeight: '22px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.value}
                    {m.unit && <span style={{ fontSize: 13, opacity: 0.7 }}>{m.unit}</span>}
                  </dd>
                </div>
              ))}
            </dl>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={goPrev} disabled={step <= 1 || busy} style={{ minWidth: 96, height: 48, border: '1px solid #ffffff', borderRadius: 0, background: color.surfaceDark, color: '#ffffff', fontSize: 14, cursor: 'pointer', opacity: step <= 1 ? 0.4 : 1 }}>
                이전
              </button>
              <button type="button" onClick={goNext} disabled={!canNext} style={{ minWidth: 120, height: 48, border: 0, borderRadius: 0, background: '#ffffff', color: '#000000', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: canNext ? 1 : 0.4 }}>
                {busy ? (step === 5 ? '결제 중…' : '확인 중…') : step === 5 ? 'World Pay로 결제' : '다음'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
