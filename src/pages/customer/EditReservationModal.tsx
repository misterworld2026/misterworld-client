import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { changeReservation, quoteReservationChange } from '@/api/booking';
import { fetchProduct } from '@/api/tours';
import type { ApplicationResponse, TravelProductResponse, TravelQuoteResponse } from '@/api/types';
import type { Grade } from '@/domain/status';
import { GRADE_LABEL } from '@/domain/status';
import { productDisplayName } from '@/domain/rules';
import './EditReservationModal.css';

const TYPES = ['HOTEL', 'TRANSPORT', 'MEAL'] as const;
const LABELS = { HOTEL: '호텔', TRANSPORT: '교통', MEAL: '식사' };

function initialIds(application: ApplicationResponse, product: TravelProductResponse): number[] {
  const config = product.allowedGrades.find((row) => row.grade === application.tourGrade);
  if (!config) return [];
  const names = {
    HOTEL: application.hotelOption,
    TRANSPORT: application.transportOption,
    MEAL: application.mealOption,
  };
  const main = TYPES.map((type) => config.allowedOptions.find((option) => option.type === type && option.name === names[type])
    ?? config.defaultOptions.find((option) => option.type === type)).filter((option) => option != null);
  const extraNames = new Set((application.extraOption ?? '').split(',').map((name) => name.trim()).filter(Boolean));
  const extras = config.allowedOptions.filter((option) => option.type === 'EXTRA' && extraNames.has(option.name));
  return [...main, ...extras].map((option) => option.id);
}

export default function EditReservationModal({ application, product, onClose, onSaved }: {
  application: ApplicationResponse;
  product: TravelProductResponse;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [grade, setGrade] = useState<Grade>(application.tourGrade);
  const [optionIds, setOptionIds] = useState<number[]>([]);
  const [quote, setQuote] = useState<TravelQuoteResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const detail = useQuery({ queryKey: ['product', product.id], queryFn: () => fetchProduct(product.id) });
  useEffect(() => {
    if (detail.data) setOptionIds(initialIds(application, detail.data));
  }, [application.id, detail.data]);
  const config = detail.data?.allowedGrades.find((row) => row.grade === grade && row.configurationReady);
  const extraOptions = useMemo(() => config?.allowedOptions.filter((option) => option.type === 'EXTRA') ?? [], [config]);

  const changeGrade = (nextGrade: Grade) => {
    const next = detail.data?.allowedGrades.find((row) => row.grade === nextGrade);
    setGrade(nextGrade);
    setOptionIds(next?.defaultOptions.map((option) => option.id) ?? []);
    setQuote(null);
  };
  const changeSingle = (type: string, id: number) => {
    const sameType = new Set(config?.allowedOptions.filter((option) => option.type === type).map((option) => option.id));
    setOptionIds((before) => [...before.filter((value) => !sameType.has(value)), id]);
    setQuote(null);
  };
  const changeExtra = (id: number, checked: boolean) => {
    setOptionIds((before) => checked ? [...before, id] : before.filter((value) => value !== id));
    setQuote(null);
  };
  const showError = (cause: unknown, fallback: string) => setError(cause instanceof ApiError ? cause.message : fallback);
  const checkQuote = async () => {
    setBusy(true); setError('');
    try {
      setQuote(await quoteReservationChange(application.id, { grade, optionIds }));
    } catch (cause) { showError(cause, '변경 금액을 계산하지 못했습니다.'); }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!quote) return;
    setBusy(true); setError('');
    try {
      await changeReservation(application.id, { grade, optionIds, quoteToken: quote.quoteToken });
      onSaved();
    } catch (cause) {
      setQuote(null);
      showError(cause, '신청을 수정하지 못했습니다. 다시 견적을 확인해 주세요.');
    } finally { setBusy(false); }
  };

  return (
    <div className="reservation-edit-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <section className="reservation-edit" role="dialog" aria-modal="true" aria-labelledby="reservation-edit-title">
        <header className="reservation-edit-header">
          <div>
            <span className="reservation-edit-eyebrow">MY RESERVATION</span>
            <h2 id="reservation-edit-title">예약 수정</h2>
            <p>{productDisplayName(product.name)} <span aria-hidden="true">·</span> {application.applicantCount}명</p>
          </div>
          <button className="reservation-edit-close" type="button" onClick={onClose} aria-label="닫기" disabled={busy}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 3l12 12M15 3L3 15" /></svg>
          </button>
        </header>

        <div className="reservation-edit-body">
          <p className="reservation-edit-notice">등급과 옵션을 다시 선택해 주세요. 여행 일정과 여행객은 그대로 유지되며, 결제 전 예약만 수정할 수 있습니다.</p>
          {detail.isLoading && <p className="reservation-edit-feedback">상품 옵션을 불러오는 중입니다…</p>}
          {detail.error && <p className="reservation-edit-feedback reservation-edit-feedback--error" role="alert">상품 옵션을 불러오지 못했습니다.</p>}

          <div className="reservation-edit-section-heading"><span>01</span><h3>여행 구성</h3></div>
          <div className="reservation-edit-fields">
            <label className="reservation-edit-field">투어 등급
              <select value={grade} onChange={(event) => changeGrade(event.target.value as Grade)} disabled={!detail.data || busy}>
                {detail.data?.allowedGrades.filter((row) => row.configurationReady).map((row) => <option key={row.grade} value={row.grade}>{GRADE_LABEL[row.grade as Grade] ?? row.grade}</option>)}
              </select>
            </label>
            {TYPES.map((type) => {
              const choices = config?.allowedOptions.filter((option) => option.type === type) ?? [];
              const selected = choices.find((option) => optionIds.includes(option.id))?.id ?? '';
              return <label className="reservation-edit-field" key={type}>{LABELS[type]}
                <select value={selected} onChange={(event) => changeSingle(type, Number(event.target.value))} disabled={!config || busy}>
                  {choices.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>;
            })}
          </div>

          <div className="reservation-edit-section-heading"><span>02</span><h3>추가 옵션</h3></div>
          <fieldset className="reservation-edit-extras">
            <legend className="reservation-edit-sr-only">추가 옵션</legend>
            {extraOptions.length === 0 && <p className="reservation-edit-empty">선택 가능한 추가 옵션이 없습니다.</p>}
            {extraOptions.map((option) => <label className="reservation-edit-extra" key={option.id}>
              <input type="checkbox" checked={optionIds.includes(option.id)} onChange={(event) => changeExtra(option.id, event.target.checked)} disabled={busy} />
              <span className="reservation-edit-extra-name">{option.name}</span>
              <span className="reservation-edit-extra-price">+₩{option.additionalPrice.toLocaleString('ko-KR')} / 인</span>
            </label>)}
          </fieldset>

          {quote && <div className="reservation-edit-quote" role="status">
            <div className="reservation-edit-quote-total"><span>변경 후 금액</span><strong>₩{quote.price.totalPrice.toLocaleString('ko-KR')}</strong></div>
            <p>기존 ₩{application.totalPrice.toLocaleString('ko-KR')} <span aria-hidden="true">·</span> 차액 {quote.price.totalPrice - application.totalPrice >= 0 ? '+' : '-'}₩{Math.abs(quote.price.totalPrice - application.totalPrice).toLocaleString('ko-KR')}</p>
          </div>}
          {error && <p className="reservation-edit-feedback reservation-edit-feedback--error" role="alert">{error}</p>}
        </div>

        <footer className="reservation-edit-footer">
          <button className="reservation-edit-button reservation-edit-button--ghost" type="button" onClick={onClose} disabled={busy}>닫기</button>
          <button className="reservation-edit-button reservation-edit-button--outline" type="button" onClick={() => void checkQuote()} disabled={busy || !config}>변경 금액 확인</button>
          <button className="reservation-edit-button reservation-edit-button--primary" type="button" onClick={() => void save()} disabled={busy || !quote}>이 내용으로 수정</button>
        </footer>
      </section>
    </div>
  );
}
