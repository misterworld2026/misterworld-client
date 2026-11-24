// 직원 · 상품·일정 관리 — 디자인 캔버스 Staff.dc.html을 실제 API로 구현.
// 데이터: GET /api/tours, GET /api/tours/schedules, GET /api/admin/reservations, GET /api/admin/notifications
import { useMemo, useState, Fragment } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { ApiError } from '@/api/client';
import { fetchProducts } from '@/api/tours';
import { cancelSchedule, completeSchedule, deleteSchedule, fetchAllSchedules, startSchedule } from '@/api/schedules';
import { fetchAdminApplications, fetchAdminNotifications } from '@/api/reservations';
import type { NotificationResponse, TravelProductResponse, TravelScheduleResponse } from '@/api/types';
import { GRADE_LABEL, OPTION_TYPE_LABEL, SCHEDULE_META } from '@/domain/status';
import { capacityOf, classicBlocked, dayDiff, deadlineOf, needOf, needTextOf, carOf, todayIso, THEMES } from '@/domain/rules';
import { md, range, won, ymd } from '@/domain/format';
import { color } from '@/styles/tokens';
import ConsoleLayout, { type Flash } from '@/components/console/ConsoleLayout';
import { ConfirmDialog } from '@/components/console/Modal';
import {
  Chip, ChipDivider, ChipGroup, ClickRow, Cut, DelIconBtn, EditIconBtn, EmptyNote, FilterRow, FootNote, Gauge,
  GhostBtn, IcoBtn, Panel, PanelHead, PanelTitle, PencilIcon, PrimaryBtn, RangeText, RefreshIcon, Row, Table,
  TableScroll, TrashIcon,
} from '@/components/console/ui';
import ScheduleFormModal from './ScheduleFormModal';
import ProductFormModal from './ProductFormModal';

const TabBtn = styled.button<{ $on: boolean }>`
  background: none;
  border: 0;
  border-bottom: 2px solid ${(p) => (p.$on ? color.brandGold : 'transparent')};
  padding: 0 2px 10px;
  color: ${(p) => (p.$on ? color.consoleText : color.consoleDim)};
  font-size: 14px;
  font-weight: ${(p) => (p.$on ? 700 : 400)};
  cursor: pointer;
  &:hover {
    color: #ffffff;
  }
`;

type Confirm = { kind: 'cancel' | 'delete' | 'start' | 'complete'; schedule: TravelScheduleResponse };
type SchedForm = { productId: number; productName: string; schedule: TravelScheduleResponse | null };

/** 일정별 문자 알림 요약 문구 */
function smsSummary(list: NotificationResponse[] | undefined): string {
  if (!list || list.length === 0) return '-';
  const sent = (t: string) => list.filter((n) => n.notificationType === t && n.status === 'SENT').length;
  const parts: string[] = [];
  const conf = sent('DEPARTURE_CONFIRMED');
  const cancel = sent('SCHEDULE_CANCELLED');
  const done = sent('APPLICATION_COMPLETED');
  if (conf) parts.push(`확정 안내 발송 ${conf}건`);
  if (cancel) parts.push(`취소 안내 발송 ${cancel}건`);
  if (done) parts.push(`신청 완료 발송 ${done}건`);
  const failed = list.filter((n) => n.status === 'FAILED').length;
  const pending = list.filter((n) => n.status === 'PENDING').length;
  if (failed) parts.push(`실패 ${failed}건 (재발송 대기)`);
  if (pending) parts.push(`발송 대기 ${pending}건`);
  return parts.length ? parts.join(' · ') : '-';
}

export default function ProductsPage() {
  const qc = useQueryClient();
  const [flash, setFlash] = useState<Flash | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [sel, setSel] = useState<number | null>(null);
  const [tab, setTab] = useState<'sched' | 'grade' | 'opt'>('sched');
  const [spin, setSpin] = useState(0);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [schedForm, setSchedForm] = useState<SchedForm | null>(null);
  const [productForm, setProductForm] = useState<{ product: TravelProductResponse | null } | null>(null);

  const products = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
  const schedules = useQuery({ queryKey: ['schedules'], queryFn: fetchAllSchedules });
  const apps = useQuery({ queryKey: ['admin-apps'], queryFn: fetchAdminApplications });
  const notis = useQuery({ queryKey: ['admin-notis'], queryFn: fetchAdminNotifications });

  const ok = (text: string) => setFlash({ text, kind: 'ok' });
  const fail = (e: unknown, fallback: string) =>
    setFlash({ text: e instanceof ApiError ? e.message : fallback, kind: 'error' });

  const refresh = () => {
    setSpin((s) => s + 1);
    void qc.invalidateQueries();
    ok('상품 목록을 다시 불러왔습니다.');
  };

  // 일정 → 상품별 묶음
  const schedByProduct = useMemo(() => {
    const map = new Map<number, TravelScheduleResponse[]>();
    for (const s of schedules.data ?? []) {
      const list = map.get(s.productId) ?? [];
      list.push(s);
      map.set(s.productId, list);
    }
    return map;
  }, [schedules.data]);

  // 신청 ID → 일정 ID → 알림 목록
  const notisBySchedule = useMemo(() => {
    const appToSched = new Map<number, number>();
    for (const a of apps.data ?? []) appToSched.set(a.id, a.scheduleId);
    const map = new Map<number, NotificationResponse[]>();
    for (const n of notis.data ?? []) {
      const sid = appToSched.get(n.applicationId);
      if (sid == null) continue;
      const list = map.get(sid) ?? [];
      list.push(n);
      map.set(sid, list);
    }
    return map;
  }, [apps.data, notis.data]);

  const visible = useMemo(
    () => (products.data ?? []).filter((p) => filter === 'all' || p.theme === filter),
    [products.data, filter],
  );
  const selected = visible.find((p) => p.id === sel) ?? visible[0] ?? null;
  const selScheds = selected ? (schedByProduct.get(selected.id) ?? []) : [];
  const today = todayIso();

  // ---- 작업 ----
  const doCancel = useMutation({
    mutationFn: (scheduleId: number) => cancelSchedule(scheduleId),
    onSuccess: async (_d, _id) => {
      await qc.invalidateQueries({ queryKey: ['schedules'] });
      await qc.invalidateQueries({ queryKey: ['admin-apps'] });
      await qc.invalidateQueries({ queryKey: ['admin-notis'] });
      const c = confirm;
      setConfirm(null);
      if (c)
        ok(
          `${md(c.schedule.departureDate)} 출발 일정을 취소했습니다. 유효 신청이 취소되고 취소 안내 문자 발송을 요청했습니다.`,
        );
    },
    onError: (e) => {
      setConfirm(null);
      fail(e, '일정을 취소하지 못했습니다.');
    },
  });

  const doDelete = useMutation({
    mutationFn: (scheduleId: number) => deleteSchedule(scheduleId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['schedules'] });
      const c = confirm;
      setConfirm(null);
      if (c) ok(`${md(c.schedule.departureDate)} 출발 일정을 삭제했습니다.`);
    },
    onError: (e) => {
      setConfirm(null);
      fail(e, '일정을 삭제하지 못했습니다.');
    },
  });

  const doTransition = useMutation({
    mutationFn: ({ scheduleId, kind }: { scheduleId: number; kind: 'start' | 'complete' }) =>
      kind === 'start' ? startSchedule(scheduleId) : completeSchedule(scheduleId),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['schedules'] }),
        qc.invalidateQueries({ queryKey: ['admin-apps'] }),
        qc.invalidateQueries({ queryKey: ['inventory'] }),
      ]);
      setConfirm(null);
      ok(variables.kind === 'start' ? '여행을 시작했습니다. 물품재고는 출발 확정 시 차감되었습니다.' : '여행을 완료했습니다.');
    },
    onError: (e) => { setConfirm(null); fail(e, '일정 상태를 변경하지 못했습니다.'); },
  });

  // ---- 파생 표시값 ----
  const chips = [{ id: 'all', name: '전체' }, ...THEMES.map((t) => ({ id: t, name: t }))];

  const productRow = (p: TravelProductResponse) => {
    const grades: string[] = [];
    if (p.classicPrice != null && !classicBlocked(p.theme)) grades.push(GRADE_LABEL.CLASSIC);
    grades.push(GRADE_LABEL.GRAND, GRADE_LABEL.PREMIUM);
    const minPrice = p.classicPrice ?? Math.min(p.grandPrice, p.premiumPrice);
    const list = schedByProduct.get(p.id) ?? [];
    return {
      grades: grades.join(', '),
      price: won(minPrice),
      cap: capacityOf(p.theme),
      nSched: list.length,
      nOpen: list.filter((s) => s.status === 'RECRUITING_SCHEDULE').length,
      nConf: list.filter((s) => s.status === 'CONFIRMED_SCHEDULE').length,
    };
  };

  const gradeRows = selected
    ? (['CLASSIC', 'GRAND', 'PREMIUM'] as const).map((g) => {
        const config = selected.allowedGrades.find((c) => c.grade === g);
        const price = g === 'CLASSIC' ? selected.classicPrice : g === 'GRAND' ? selected.grandPrice : selected.premiumPrice;
        const saleOk = g === 'CLASSIC' ? selected.classicPrice != null && !classicBlocked(selected.theme) : true;
        const byType = (t: string) =>
          config?.defaultOptions.find((o) => o.type === t)?.name ?? (t === 'TRANSPORT' ? carOf(selected.theme) : '-');
        return {
          name: GRADE_LABEL[g],
          sale: saleOk ? '판매' : '판매 불가',
          price: saleOk ? won(price) : '-',
          hotel: saleOk ? byType('HOTEL') : '-',
          car: saleOk ? byType('TRANSPORT') : '-',
          meal: saleOk ? byType('MEAL') : '-',
          fg: saleOk ? color.consoleText : color.consoleFaint,
        };
      })
    : [];

  const gradeNote = selected
    ? classicBlocked(selected.theme)
      ? `${selected.theme} 상품은 그랜드 또는 프리미엄 등급만 판매할 수 있어 클래식 등급과 그 옵션은 등록할 수 없습니다.`
      : '세 등급을 모두 판매합니다. 등급별 가격은 0원 이상이어야 합니다.'
    : '';

  const optRows = selected
    ? [
        ...(['HOTEL', 'TRANSPORT', 'MEAL', 'EXTRA'] as const)
          .map((t) => ({ t, list: selected.options.filter((o) => o.type === t) }))
          .filter(({ list }) => list.length > 0)
          .map(({ t, list }) => ({
            label: OPTION_TYPE_LABEL[t],
            value: list.map((o) => `${o.name}${o.additionalPrice ? ` (+${won(o.additionalPrice)})` : ''}`).join(' · '),
          })),
        { label: '단골 할인', value: '완료 여행 2회 이상 고객에게 최종 금액 10% 자동 적용' },
      ]
    : [];

  const loadError = products.error ?? schedules.error;

  return (
    <ConsoleLayout title="상품·일정 관리" flash={flash} onClearFlash={() => setFlash(null)}>
      <Panel aria-labelledby="products-h">
        <PanelHead>
          <PanelTitle id="products-h">
            여행 상품 <span>({products.data?.length ?? 0})</span>
          </PanelTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IcoBtn type="button" onClick={refresh} aria-label="새로고침">
              <RefreshIcon deg={spin * 360} />
            </IcoBtn>
            <PrimaryBtn type="button" onClick={() => setProductForm({ product: null })}>
              상품 등록
            </PrimaryBtn>
          </div>
        </PanelHead>

        <FilterRow>
          <ChipGroup role="group" aria-label="테마 필터">
            {chips.map((c, i) => (
              <Fragment key={c.id}>
                {i > 0 && <ChipDivider />}
                <Chip type="button" $on={filter === c.id} aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}>
                  {c.name}
                </Chip>
              </Fragment>
            ))}
          </ChipGroup>
          <RangeText>{visible.length ? `총 ${visible.length}개` : '표시할 상품 없음'}</RangeText>
        </FilterRow>

        <TableScroll $minHeight={237}>
          <Table $minWidth={1000}>
            <thead>
              <tr>
                <th scope="col" aria-sort="ascending">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: color.consoleText }}>
                    테마
                    <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <path d="M2 6.5 5 3.5l3 3" />
                    </svg>
                  </span>
                </th>
                <th scope="col" style={{ width: 200 }}>판매 등급</th>
                <th scope="col" style={{ width: 152, textAlign: 'right' }}>1인 시작가</th>
                <th scope="col" style={{ width: 64, textAlign: 'right' }}>정원</th>
                <th scope="col" style={{ width: 60, textAlign: 'right' }}>일정</th>
                <th scope="col" style={{ width: 124, textAlign: 'right' }}>모집 중 / 확정</th>
                <th scope="col" style={{ width: 60 }}>
                  <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>수정</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => {
                const r = productRow(p);
                return (
                  <ClickRow key={p.id} onClick={() => { setSel(p.id); setTab('sched'); }}>
                    <td>
                      <button
                        type="button"
                        title={p.name}
                        style={{ width: '100%', background: 'none', border: 0, padding: 0, color: '#ffffff', fontSize: 14, cursor: 'pointer', textAlign: 'left', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {p.name}
                      </button>
                    </td>
                    <td><Cut title={r.grades}>{r.grades}</Cut></td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {r.price}
                      <span style={{ color: color.consoleDim, fontSize: 12 }}>/1인</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{r.cap}명</td>
                    <td style={{ textAlign: 'right' }}>{r.nSched}</td>
                    <td style={{ textAlign: 'right' }}>{r.nOpen} / {r.nConf}</td>
                    <td>
                      <EditIconBtn
                        type="button"
                        aria-label={`${p.name} 수정`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setProductForm({ product: p });
                        }}
                      >
                        <PencilIcon />
                      </EditIconBtn>
                    </td>
                  </ClickRow>
                );
              })}
            </tbody>
          </Table>
          {products.isLoading && <EmptyNote>상품 목록을 불러오는 중입니다…</EmptyNote>}
          {loadError != null && (
            <EmptyNote role="alert">
              {loadError instanceof ApiError ? loadError.message : '목록을 불러오지 못했습니다. 새로고침을 눌러 다시 시도해 주세요.'}
            </EmptyNote>
          )}
          {!products.isLoading && !loadError && visible.length === 0 && (
            <EmptyNote>조건에 맞는 상품이 없습니다. 테마 필터를 바꿔 보세요.</EmptyNote>
          )}
        </TableScroll>
      </Panel>

      <Panel aria-label="선택한 상품 상세">
        <div
          style={{ padding: '12px 20px 0', borderBottom: `1px solid ${color.consoleBorder}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 16, lineHeight: '22px', fontWeight: 700, width: 260 }}>
              <Cut title={selected?.name ?? ''}>{selected ? selected.name : '선택한 상품 없음'}</Cut>
            </h3>
            <div role="tablist" aria-label="상품 상세 탭" style={{ display: 'flex', gap: 24 }}>
              <TabBtn type="button" role="tab" aria-selected={tab === 'sched'} $on={tab === 'sched'} onClick={() => setTab('sched')}>
                일정{selected ? ` (${selScheds.length})` : ''}
              </TabBtn>
              <TabBtn type="button" role="tab" aria-selected={tab === 'grade'} $on={tab === 'grade'} onClick={() => setTab('grade')}>
                등급과 가격
              </TabBtn>
              <TabBtn type="button" role="tab" aria-selected={tab === 'opt'} $on={tab === 'opt'} onClick={() => setTab('opt')}>
                옵션
              </TabBtn>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, paddingBottom: 10 }}>
            {tab === 'sched' ? (
              <PrimaryBtn
                type="button"
                disabled={!selected}
                onClick={() => selected && setSchedForm({ productId: selected.id, productName: selected.name, schedule: null })}
              >
                일정 등록
              </PrimaryBtn>
            ) : (
              <GhostBtn type="button" disabled={!selected} onClick={() => selected && setProductForm({ product: selected })}>
                수정
              </GhostBtn>
            )}
          </div>
        </div>

        {tab === 'sched' && (
          <>
            <TableScroll $minHeight={206}>
              <Table $minWidth={1100}>
                <thead>
                  <tr>
                    <th scope="col" style={{ width: 192 }}>출발 - 종료</th>
                    <th scope="col" style={{ width: 104 }}>상태</th>
                    <th scope="col" style={{ whiteSpace: 'nowrap' }}>신청 인원 ({selected ? needTextOf(selected.theme) : '-'})</th>
                    <th scope="col" style={{ width: 150 }}>신청 마감</th>
                    <th scope="col" style={{ width: 170 }}>문자 알림</th>
                    <th scope="col" style={{ width: 300, textAlign: 'right' }}>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {selected &&
                    selScheds.map((s) => {
                      const meta = SCHEDULE_META[s.status];
                      const cap = capacityOf(selected.theme);
                      const need = needOf(selected.theme);
                      const active = s.status === 'RECRUITING_SCHEDULE' || s.status === 'CONFIRMED_SCHEDULE' || s.status === 'CLOSED_SCHEDULE';
                      const hasApps = s.applicantCount > 0;
                      const canCancel = active && hasApps;
                      const canDelete = (s.status === 'RECRUITING_SCHEDULE' || s.status === 'CLOSED_SCHEDULE') && !hasApps;
                      const dl = deadlineOf(s.departureDate);
                      const dLeft = dayDiff(today, dl);
                      const urgent = s.status === 'RECRUITING_SCHEDULE' && dLeft <= 3;
                      const fg = meta.dim ? color.consoleFaint : color.consoleText;
                      return (
                        <Row key={s.travelScheduleId}>
                          <td style={{ padding: '10px 12px 10px 20px', color: fg }}>
                            <Cut>{range(s.departureDate, s.arrivalDate)}</Cut>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <Cut style={{ color: meta.fg }}>{meta.text}</Cut>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 72px', alignItems: 'center', columnGap: 10 }}>
                              <Gauge pct={(s.applicantCount / cap) * 100} needPct={(need / cap) * 100} bar={meta.bar} />
                              <span style={{ textAlign: 'right', whiteSpace: 'nowrap', color: fg }}>
                                {s.applicantCount} / {cap}명
                              </span>
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', color: urgent ? color.warn : meta.dim ? color.consoleFaint : color.consoleDim }}>
                            <Cut>
                              {ymd(dl)}
                              {urgent ? ` (D-${Math.max(0, dLeft)})` : ''}
                            </Cut>
                          </td>
                          <td style={{ padding: '10px 12px', color: color.consoleDim }}>
                            <Cut title={smsSummary(notisBySchedule.get(s.travelScheduleId))}>
                              {smsSummary(notisBySchedule.get(s.travelScheduleId))}
                            </Cut>
                          </td>
                          <td style={{ padding: '6px 20px 6px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <span style={{ display: 'inline-flex', gap: 8 }}>
                              {s.status === 'CONFIRMED_SCHEDULE' && <GhostBtn type="button" onClick={() => setConfirm({ kind: 'start', schedule: s })}>여행 출발</GhostBtn>}
                              {s.status === 'IN_PROGRESS_SCHEDULE' && <GhostBtn type="button" onClick={() => setConfirm({ kind: 'complete', schedule: s })}>여행 완료</GhostBtn>}
                              <EditIconBtn
                                type="button"
                                disabled={!active}
                                aria-label="일정 수정"
                                onClick={() => setSchedForm({ productId: selected.id, productName: selected.name, schedule: s })}
                              >
                                <PencilIcon />
                              </EditIconBtn>
                              {canCancel ? (
                                <DelIconBtn type="button" aria-label="일정 취소" onClick={() => setConfirm({ kind: 'cancel', schedule: s })}>
                                  <TrashIcon />
                                </DelIconBtn>
                              ) : canDelete ? (
                                <DelIconBtn type="button" aria-label="일정 삭제" onClick={() => setConfirm({ kind: 'delete', schedule: s })}>
                                  <TrashIcon />
                                </DelIconBtn>
                              ) : (
                                <DelIconBtn type="button" disabled aria-label="일정 취소">
                                  <TrashIcon />
                                </DelIconBtn>
                              )}
                            </span>
                          </td>
                        </Row>
                      );
                    })}
                </tbody>
              </Table>
              {selected && schedules.isLoading && <EmptyNote>일정을 불러오는 중입니다…</EmptyNote>}
              {selected && !schedules.isLoading && selScheds.length === 0 && (
                <EmptyNote>등록된 일정이 없습니다. '일정 등록'으로 첫 일정을 추가하세요.</EmptyNote>
              )}
            </TableScroll>
            <FootNote>
              취소는 신청이 있는 일정에만, 삭제는 신청이 없는 모집 중·모집 마감 일정에만 할 수 있습니다. 취소하면 해당 일정의 유효
              신청이 함께 취소되고 신청 고객에게 취소 안내 문자가 발송됩니다.
            </FootNote>
          </>
        )}

        {tab === 'grade' && (
          <>
            <TableScroll>
              <Table $minWidth={1100}>
                <thead>
                  <tr>
                    <th scope="col" style={{ width: 130 }}>투어 등급</th>
                    <th scope="col" style={{ width: 110 }}>판매</th>
                    <th scope="col" style={{ width: 150 }}>1인 가격</th>
                    <th scope="col" style={{ width: 150 }}>기본 호텔</th>
                    <th scope="col" style={{ width: 190 }}>기본 교통</th>
                    <th scope="col">기본 식사</th>
                  </tr>
                </thead>
                <tbody>
                  {gradeRows.map((g) => (
                    <Row key={g.name}>
                      <td style={{ color: g.fg, fontWeight: 700 }}>{g.name}</td>
                      <td style={{ color: g.fg }}>{g.sale}</td>
                      <td style={{ color: g.fg }}><Cut>{g.price}</Cut></td>
                      <td style={{ color: g.fg }}><Cut>{g.hotel}</Cut></td>
                      <td style={{ color: g.fg }}><Cut title={g.car}>{g.car}</Cut></td>
                      <td style={{ color: g.fg }}><Cut title={g.meal}>{g.meal}</Cut></td>
                    </Row>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
            <FootNote>{gradeNote}</FootNote>
          </>
        )}

        {tab === 'opt' && (
          <dl style={{ margin: 0, padding: '4px 20px 16px', display: 'grid', gridTemplateColumns: '160px 1fr', columnGap: 24, rowGap: 0 }}>
            {optRows.map((o) => (
              <Fragment key={o.label}>
                <dt style={{ padding: '11px 0', borderBottom: `1px solid ${color.consoleRowBorder}`, color: color.consoleDim }}>{o.label}</dt>
                <dd style={{ margin: 0, padding: '11px 0', borderBottom: `1px solid ${color.consoleRowBorder}` }}>{o.value}</dd>
              </Fragment>
            ))}
          </dl>
        )}
      </Panel>

      {confirm && (
        <ConfirmDialog
          title={confirm.kind === 'cancel' ? '일정 취소' : confirm.kind === 'delete' ? '일정 삭제' : confirm.kind === 'start' ? '여행 출발' : '여행 완료'}
          body={
            confirm.kind === 'cancel'
              ? `${md(confirm.schedule.departureDate)} 출발 일정을 취소합니다. 이 일정의 유효 신청 인원 ${confirm.schedule.applicantCount}명의 신청이 함께 취소되고, 신청 고객에게 취소 안내 문자가 발송됩니다.`
              : confirm.kind === 'delete'
                ? `${md(confirm.schedule.departureDate)} 출발 일정을 삭제합니다. 신청이 없는 일정이므로 바로 삭제됩니다.`
                : confirm.kind === 'start'
                  ? `${md(confirm.schedule.departureDate)} 출발 일정을 여행 진행 중으로 바꿉니다. 물품재고는 출발 확정 시 이미 차감되었습니다.`
                  : `${md(confirm.schedule.departureDate)} 출발 일정을 여행 완료로 바꾸고 여행 이력에 반영합니다.`
          }
          confirmText={confirm.kind === 'cancel' ? '일정 취소' : confirm.kind === 'delete' ? '일정 삭제' : confirm.kind === 'start' ? '여행 출발' : '여행 완료'}
          busy={doCancel.isPending || doDelete.isPending || doTransition.isPending}
          onClose={() => setConfirm(null)}
          onConfirm={() =>
            confirm.kind === 'cancel'
              ? doCancel.mutate(confirm.schedule.travelScheduleId)
              : confirm.kind === 'delete'
                ? doDelete.mutate(confirm.schedule.travelScheduleId)
                : doTransition.mutate({ scheduleId: confirm.schedule.travelScheduleId, kind: confirm.kind })
          }
        />
      )}

      {schedForm && (
        <ScheduleFormModal
          productId={schedForm.productId}
          productName={schedForm.productName}
          schedule={schedForm.schedule}
          onClose={() => setSchedForm(null)}
          onSaved={(text) => {
            setSchedForm(null);
            ok(text);
          }}
        />
      )}

      {productForm && (
        <ProductFormModal
          product={productForm.product}
          onClose={() => setProductForm(null)}
          onSaved={(text) => {
            setProductForm(null);
            ok(text);
          }}
        />
      )}
    </ConsoleLayout>
  );
}
