// 직원 · 예약 현황 조회 — 디자인 캔버스 Reservations.dc.html을 실제 API로 구현. (조회 전용)
// 데이터: GET /api/tours, GET /api/tours/schedules, GET /api/admin/reservations, GET /api/admin/notifications
// Q13: 일정별 예약 현황 API(BE 요청 3)가 생기기 전까지 위 4개 목록을 FE에서 조합한다.
// Q11: 대표 신청자·연락처는 BE 요청 2 반영 전까지 '-'로 표시한다.
import { Fragment, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { fetchProducts } from '@/api/tours';
import { fetchAllSchedules } from '@/api/schedules';
import { fetchAdminApplications, fetchAdminNotifications } from '@/api/reservations';
import type { ApplicationResponse, NotificationResponse, TravelProductResponse, TravelScheduleResponse } from '@/api/types';
import { GRADE_LABEL, SCHEDULE_META, type ScheduleStatus } from '@/domain/status';
import { capacityOf, dayDiff, deadlineOf, needOf, needTextOf, todayIso, THEMES } from '@/domain/rules';
import { dateTimeKst, md, ymd } from '@/domain/format';
import { color } from '@/styles/tokens';
import ConsoleLayout, { type Flash } from '@/components/console/ConsoleLayout';
import {
  Chip, ChipDivider, ChipGroup, ClickRow, Cut, EmptyNote, FootNote, Gauge, Panel, PanelTitle, RangeText, RefreshBox, Row,
  Select, Table, TableScroll,
} from '@/components/console/ui';

const ST_FILTERS: { value: 'all' | ScheduleStatus; label: string }[] = [
  { value: 'all', label: '모든 상태' },
  { value: 'RECRUITING_SCHEDULE', label: '모집 중' },
  { value: 'CONFIRMED_SCHEDULE', label: '출발 확정' },
  { value: 'CLOSED_SCHEDULE', label: '모집 마감' },
  { value: 'IN_PROGRESS_SCHEDULE', label: '진행 중' },
  { value: 'COMPLETED_SCHEDULE', label: '완료' },
  { value: 'CANCELLED_SCHEDULE', label: '취소' },
];

const ACTIVE: ScheduleStatus[] = ['RECRUITING_SCHEDULE', 'CONFIRMED_SCHEDULE', 'CLOSED_SCHEDULE', 'IN_PROGRESS_SCHEDULE'];

interface Item {
  s: TravelScheduleResponse;
  p: TravelProductResponse;
  apps: ApplicationResponse[];
}

/** '010-1234-5678' → '010-****-5678' (가운데 번호 가림) */
function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '-';
  const d = phone.replace(/\D/g, '');
  if (d.length < 8) return phone;
  return `${d.slice(0, 3)}-****-${d.slice(-4)}`;
}

/** 신청 번호 표시: R + 신청일(yyMMdd, KST) + '-' + 신청 ID */
function appNo(a: ApplicationResponse): string {
  const day = dateTimeKst(a.appliedAt).slice(2, 10).replace(/\./g, '');
  return `R${day}-${String(a.id).padStart(3, '0')}`;
}

/** 신청 1건의 문자 알림 상태 — 가장 최근 알림 기준 */
function smsOf(list: NotificationResponse[] | undefined): { text: string; warn: boolean } {
  if (!list || list.length === 0) return { text: '-', warn: false };
  const last = [...list].sort((a, b) => b.id - a.id)[0];
  if (last.status === 'FAILED') return { text: '발송 실패, 재발송 대기', warn: true };
  if (last.status === 'PENDING') return { text: '발송 대기', warn: false };
  switch (last.notificationType) {
    case 'DEPARTURE_CONFIRMED': return { text: '확정 안내 발송 완료', warn: false };
    case 'SCHEDULE_CANCELLED': return { text: '취소 안내 발송 완료', warn: false };
    default: return { text: '신청 완료 안내 발송 완료', warn: false };
  }
}

export default function ReservationsPage() {
  const qc = useQueryClient();
  const [flash, setFlash] = useState<Flash | null>(null);
  const [theme, setTheme] = useState<string>('all');
  const [stFilter, setStFilter] = useState<'all' | ScheduleStatus>('all');
  const [sel, setSel] = useState<number | null>(null);

  const products = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
  const schedules = useQuery({ queryKey: ['schedules'], queryFn: fetchAllSchedules });
  const apps = useQuery({ queryKey: ['admin-apps'], queryFn: fetchAdminApplications });
  const notis = useQuery({ queryKey: ['admin-notis'], queryFn: fetchAdminNotifications });

  const refresh = async () => {
    await qc.invalidateQueries();
    setFlash({ text: '예약 현황을 다시 불러왔습니다.', kind: 'ok' });
  };

  const all = useMemo<Item[]>(() => {
    const byId = new Map((products.data ?? []).map((p) => [p.id, p]));
    const appsBySched = new Map<number, ApplicationResponse[]>();
    for (const a of apps.data ?? []) {
      const list = appsBySched.get(a.scheduleId) ?? [];
      list.push(a);
      appsBySched.set(a.scheduleId, list);
    }
    const out: Item[] = [];
    for (const s of schedules.data ?? []) {
      const p = byId.get(s.productId);
      if (!p) continue;
      const list = (appsBySched.get(s.travelScheduleId) ?? []).sort((a, b) => a.appliedAt.localeCompare(b.appliedAt));
      out.push({ s, p, apps: list });
    }
    return out.sort((a, b) => a.s.departureDate.localeCompare(b.s.departureDate));
  }, [products.data, schedules.data, apps.data]);

  const notisByApp = useMemo(() => {
    const map = new Map<number, NotificationResponse[]>();
    for (const n of notis.data ?? []) {
      const list = map.get(n.applicationId) ?? [];
      list.push(n);
      map.set(n.applicationId, list);
    }
    return map;
  }, [notis.data]);

  const visible = all.filter((x) => (theme === 'all' || x.p.theme === theme) && (stFilter === 'all' || x.s.status === stFilter));
  const firstActive = visible.find((x) => ACTIVE.includes(x.s.status)) ?? visible[0];
  const selId = visible.some((x) => x.s.travelScheduleId === sel) ? sel : (firstActive?.s.travelScheduleId ?? null);
  const selected = all.find((x) => x.s.travelScheduleId === selId) ?? null;
  const today = todayIso();

  const validOf = (x: Item) => (x.s.status === 'CANCELLED_SCHEDULE' ? [] : x.apps.filter((a) => a.status !== 'CANCELLED'));

  const chips = [{ id: 'all', name: '전체' }, ...THEMES.map((t) => ({ id: t, name: t }))];
  const loadError = products.error ?? schedules.error ?? apps.error;
  const loading = products.isLoading || schedules.isLoading || apps.isLoading;

  // ---- 선택 일정 상세 ----
  let facts: { label: string; value: string; fg: string }[] = [];
  if (selected) {
    const { s, p } = selected;
    const meta = SCHEDULE_META[s.status];
    const valid = validOf(selected);
    const people = valid.reduce((n, a) => n + a.applicantCount, 0);
    const short = Math.max(0, needOf(p.theme) - s.applicantCount);
    facts = [
      { label: '출발 - 종료', value: `${ymd(s.departureDate)} - ${ymd(s.arrivalDate).slice(5)}`, fg: color.consoleText },
      { label: '일정 상태', value: meta.text, fg: meta.fg },
      { label: '신청 인원', value: `${s.applicantCount} / ${capacityOf(p.theme)}명`, fg: color.consoleText },
      {
        label: '확정 기준',
        value: needTextOf(p.theme) + (s.status === 'RECRUITING_SCHEDULE' && short ? `, ${short}명 부족` : ''),
        fg: color.consoleBtnText,
      },
      { label: '신청 마감', value: ymd(deadlineOf(s.departureDate)), fg: color.consoleBtnText },
      { label: '유효 신청', value: `${valid.length}건, ${people}명`, fg: color.consoleBtnText },
    ];
  }

  return (
    <ConsoleLayout
      title="예약 현황 조회"
      description="일정별 신청 인원과 출발 확정 상태를 확인합니다. 이 화면에서는 신청 정보와 상태를 변경할 수 없습니다."
      flash={flash}
      onClearFlash={() => setFlash(null)}
    >
      <Panel aria-labelledby="sched-h">
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${color.consoleBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <PanelTitle id="sched-h">
            일정별 예약 현황 <span>({all.length})</span>
          </PanelTitle>
          <RefreshBox onClick={refresh} />
        </div>

        <div style={{ padding: '10px 20px 10px 8px', borderBottom: `1px solid ${color.consoleBorder}`, display: 'grid', gridTemplateColumns: 'auto 200px 1fr', alignItems: 'center', columnGap: 16 }}>
          <ChipGroup role="group" aria-label="테마 필터">
            {chips.map((c, i) => (
              <Fragment key={c.id}>
                {i > 0 && <ChipDivider />}
                <Chip type="button" $on={theme === c.id} aria-pressed={theme === c.id} onClick={() => setTheme(c.id)}>
                  {c.name}
                </Chip>
              </Fragment>
            ))}
          </ChipGroup>
          <Select aria-label="일정 상태" value={stFilter} onChange={(e) => setStFilter(e.target.value as 'all' | ScheduleStatus)} style={{ width: 200, cursor: 'pointer' }}>
            {ST_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </Select>
          <RangeText>{visible.length ? `총 ${visible.length}개 일정` : '표시할 일정 없음'}</RangeText>
        </div>

        <TableScroll>
          <Table $minWidth={1100}>
            <thead>
              <tr>
                <th scope="col" style={{ width: 176 }}>상품</th>
                <th scope="col" aria-sort="ascending" style={{ width: 184 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: color.consoleText }}>
                    출발 - 종료
                    <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <path d="M2 6.5 5 3.5l3 3" />
                    </svg>
                  </span>
                </th>
                <th scope="col" style={{ width: 100 }}>상태</th>
                <th scope="col">신청 인원</th>
                <th scope="col" style={{ width: 128 }}>확정 기준</th>
                <th scope="col" style={{ width: 140 }}>신청 마감</th>
                <th scope="col" style={{ width: 108, textAlign: 'right' }}>유효 신청</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((x) => {
                const { s, p } = x;
                const meta = SCHEDULE_META[s.status];
                const cap = capacityOf(p.theme);
                const fg = meta.dim ? color.consoleFaint : color.consoleText;
                const dl = deadlineOf(s.departureDate);
                const dLeft = dayDiff(today, dl);
                const urgent = s.status === 'RECRUITING_SCHEDULE' && dLeft <= 3;
                const pick = () => setSel(s.travelScheduleId);
                return (
                  <ClickRow key={s.travelScheduleId} onClick={pick} aria-selected={s.travelScheduleId === selId}>
                    <td style={{ padding: '10px 12px 10px 20px' }}>
                      <button
                        type="button"
                        title={p.name}
                        onClick={(e) => { e.stopPropagation(); pick(); }}
                        style={{ width: '100%', background: 'none', border: 0, padding: 0, color: '#ffffff', fontSize: 14, cursor: 'pointer', textAlign: 'left', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {p.name}
                      </button>
                    </td>
                    <td style={{ padding: '10px 12px', color: fg }}><Cut>{md(s.departureDate)} - {md(s.arrivalDate)}</Cut></td>
                    <td style={{ padding: '10px 12px' }}><Cut style={{ color: meta.fg }}>{meta.text}</Cut></td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 72px', alignItems: 'center', columnGap: 10 }}>
                        <Gauge pct={(s.applicantCount / cap) * 100} needPct={(needOf(p.theme) / cap) * 100} bar={meta.bar} />
                        <span style={{ textAlign: 'right', whiteSpace: 'nowrap', color: fg }}>{s.applicantCount} / {cap}명</span>
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: color.consoleDim }}><Cut>{needTextOf(p.theme)}</Cut></td>
                    <td style={{ padding: '10px 12px', color: urgent ? color.warn : meta.dim ? color.consoleFaint : color.consoleDim }}>
                      <Cut>{ymd(dl)}{urgent ? ` (D-${Math.max(0, dLeft)})` : ''}</Cut>
                    </td>
                    <td style={{ padding: '10px 20px 10px 12px', color: fg, textAlign: 'right', whiteSpace: 'nowrap' }}>{validOf(x).length}건</td>
                  </ClickRow>
                );
              })}
            </tbody>
          </Table>
        </TableScroll>
        {loading && <EmptyNote>예약 현황을 불러오는 중입니다…</EmptyNote>}
        {loadError != null && (
          <EmptyNote role="alert">
            {loadError instanceof ApiError ? loadError.message : '예약 현황을 불러오지 못했습니다. 새로고침을 눌러 다시 시도해 주세요.'}
          </EmptyNote>
        )}
        {!loading && !loadError && visible.length === 0 && (
          <EmptyNote>조건에 맞는 일정이 없습니다. 테마나 상태 조건을 바꿔 보세요.</EmptyNote>
        )}
      </Panel>

      <Panel aria-labelledby="detail-h">
        <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h3 id="detail-h" style={{ margin: 0, fontSize: 16, lineHeight: '22px', fontWeight: 700 }}>
            {selected ? selected.p.name : '선택한 일정 없음'}
          </h3>
          <span style={{ fontSize: 13, color: color.consoleDim }}>상세 예약 현황</span>
        </div>

        {selected ? (
          <>
            <dl style={{ margin: 0, padding: '12px 20px 14px', display: 'grid', gridTemplateColumns: '172px 104px 120px 200px 112px minmax(140px, 1fr)', columnGap: 24, borderBottom: `1px solid ${color.consoleBorder}` }}>
              {facts.map((f) => (
                <div key={f.label} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <dt style={{ fontSize: 12, lineHeight: '16px', color: color.consoleDim }}>{f.label}</dt>
                  <dd style={{ margin: 0, color: f.fg }}><Cut title={f.value}>{f.value}</Cut></dd>
                </div>
              ))}
            </dl>

            <TableScroll>
              <Table $minWidth={1100}>
                <thead>
                  <tr>
                    <th scope="col" style={{ width: 140 }}>신청 번호</th>
                    <th scope="col" style={{ width: 116 }}>대표 신청자</th>
                    <th scope="col" style={{ width: 140 }}>연락처</th>
                    <th scope="col" style={{ width: 72, textAlign: 'right' }}>인원</th>
                    <th scope="col" style={{ width: 100 }}>투어 등급</th>
                    <th scope="col" style={{ width: 112 }}>신청일</th>
                    <th scope="col" style={{ width: 150 }}>신청 상태</th>
                    <th scope="col">문자 알림</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.apps.map((a) => {
                    const off = a.status === 'CANCELLED';
                    const fg = off ? color.consoleFaint : color.consoleText;
                    const sub = off ? color.consoleFaint : color.consoleDim;
                    const status =
                      a.status === 'CONFIRMED'
                        ? { text: '출발 확정', fg: color.ok }
                        : a.status === 'PENDING'
                          ? { text: '출발 확정 대기', fg: color.consoleBtnText }
                          : {
                              text: selected.s.status === 'CANCELLED_SCHEDULE' ? '취소 (일정 취소)' : '취소 (고객 요청)',
                              fg: color.danger,
                            };
                    const sms = smsOf(notisByApp.get(a.id));
                    return (
                      <Row key={a.id}>
                        <td style={{ padding: '10px 12px 10px 20px', color: fg }}><Cut>{appNo(a)}</Cut></td>
                        <td style={{ padding: '10px 12px', color: fg }}><Cut>{a.applicantName || '-'}</Cut></td>
                        <td style={{ padding: '10px 12px', color: sub }}><Cut>{maskPhone(a.applicantPhoneNumber)}</Cut></td>
                        <td style={{ padding: '10px 12px', color: fg, textAlign: 'right', whiteSpace: 'nowrap' }}>{a.applicantCount}명</td>
                        <td style={{ padding: '10px 12px', color: fg }}><Cut>{GRADE_LABEL[a.tourGrade] ?? a.tourGrade}</Cut></td>
                        <td style={{ padding: '10px 12px', color: sub }}><Cut>{dateTimeKst(a.appliedAt).slice(0, 10)}</Cut></td>
                        <td style={{ padding: '10px 12px' }}><Cut title={status.text} style={{ color: status.fg }}>{status.text}</Cut></td>
                        <td style={{ padding: '10px 20px 10px 12px', color: sms.warn ? color.warn : color.consoleDim }}>
                          <Cut title={sms.text}>{sms.text}</Cut>
                        </td>
                      </Row>
                    );
                  })}
                </tbody>
              </Table>
            </TableScroll>
            {selected.apps.length === 0 && <EmptyNote style={{ padding: '28px 20px' }}>아직 이 일정에 들어온 신청이 없습니다.</EmptyNote>}
            <FootNote>신청 인원은 취소된 신청을 뺀 유효 신청 기준입니다. 연락처는 가운데 번호를 가려서 표시합니다.</FootNote>
          </>
        ) : (
          <p style={{ margin: 0, padding: '28px 20px', color: color.consoleDim }}>위 목록에서 일정을 고르면 신청 내역이 여기에 표시됩니다.</p>
        )}
      </Panel>
    </ConsoleLayout>
  );
}

