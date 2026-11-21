// 직원 콘솔 공통 UI 조각 — 디자인 캔버스의 클래스(.sc-*)를 styled-components로 옮긴 것.
import { useState } from 'react';
import styled, { css } from 'styled-components';
import { color } from '@/styles/tokens';

export const Panel = styled.section`
  border: 1px solid ${color.consoleBorder};
  background: ${color.consolePanel};
  display: flex;
  flex-direction: column;
`;

export const PanelHead = styled.div`
  padding: 14px 20px;
  border-bottom: 1px solid ${color.consoleBorder};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`;

export const PanelTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  line-height: 24px;
  font-weight: 700;
  display: flex;
  align-items: baseline;
  gap: 8px;

  span {
    font-size: 14px;
    font-weight: 400;
    color: ${color.consoleDim};
  }
`;

/** 노란색 주요 버튼 (.sc-pri) — 콘솔 선택 강조색(consoleSelected)과 통일 */
export const PrimaryBtn = styled.button`
  height: 32px;
  box-sizing: border-box;
  border: 1px solid ${color.consoleSelected};
  background: ${color.consoleSelected};
  color: #000000;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  &:hover:not(:disabled) {
    background: #ffe04d;
    border-color: #ffe04d;
  }
  &:disabled {
    opacity: 0.4;
  }
`;

/** 외곽선 버튼 (.sc-btn) */
export const GhostBtn = styled.button`
  height: 32px;
  box-sizing: border-box;
  border: 1px solid ${color.consoleBtnBorder};
  background: none;
  color: ${color.consoleBtnText};
  padding: 0 14px;
  font-size: 14px;
  cursor: pointer;
  &:hover:not(:disabled) {
    border-color: ${color.consoleText};
    color: #ffffff;
  }
  &:disabled {
    opacity: 0.4;
  }
`;

/** 위험(빨간 외곽선) 버튼 (.sc-danger) */
export const DangerBtn = styled.button`
  height: 32px;
  box-sizing: border-box;
  border: 1px solid ${color.danger};
  background: none;
  color: ${color.danger};
  padding: 0 16px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  &:hover:not(:disabled) {
    background: #2a1515;
  }
  &:disabled {
    opacity: 0.4;
  }
`;

/** 26×26 연필 수정 버튼 (.sc-edit) */
export const EditIconBtn = styled.button`
  width: 26px;
  height: 26px;
  box-sizing: border-box;
  border: 0;
  border-radius: 6px;
  color: #000000;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: ${color.editBtn};
  transition: background 0.25s;
  &:active {
    background: ${color.editBtnActive};
    transition: none;
  }
  &:disabled {
    background: ${color.btnDisabled};
    cursor: default;
    opacity: 0.4;
  }
`;

/** 26×26 빨간 취소/삭제 버튼 (.sc-del) — 아이콘 정중앙 고정 */
export const DelIconBtn = styled.button`
  width: 26px;
  height: 26px;
  box-sizing: border-box;
  border: 0;
  border-radius: 6px;
  color: ${color.editBtn};
  padding: 0;
  position: relative;
  cursor: pointer;
  background: ${color.delBtn};
  transition: background 0.25s;
  &:active {
    background: ${color.delBtnActive};
    transition: none;
  }
  &:disabled {
    background: ${color.btnDisabled};
    cursor: default;
    opacity: 0.4;
  }
  svg {
    position: absolute;
    left: 50%;
    top: 50%;
    margin: -8px 0 0 -8px;
    display: block;
  }
`;

export function PencilIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4H4v16h16v-6" />
      <path d="M19.5 2.5l3 3-10 10-4.2 1.2 1.2-4.2z" />
      <path d="M16.5 5.5l3 3" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6.5h18" />
      <path d="M9 6.5v-2a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 4.5v2" />
      <path d="M5 6.5V18a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V6.5" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

/** 새로고침 아이콘 버튼 (.sc-ico) */
export const IcoBtn = styled.button`
  height: 32px;
  width: 32px;
  box-sizing: border-box;
  border: 0;
  background: none;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${color.consoleBtnText};
  &:hover {
    color: #ffffff;
  }
`;

export function RefreshIcon({ deg = 0 }: { deg?: number }) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: `rotate(${deg}deg)`, transition: 'transform .6s ease' }}
    >
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
      <path d="M20 4v5h-5" />
    </svg>
  );
}

/** 외곽선 새로고침 버튼 (Reservations/Inventory 디자인의 32×32 .sc-btn) */
const BoxBtn = styled.button`
  height: 32px;
  width: 32px;
  box-sizing: border-box;
  border: 1px solid ${color.consoleBtnBorder};
  background: none;
  color: ${color.consoleBtnText};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  &:hover {
    border-color: ${color.consoleText};
    color: #ffffff;
  }
`;

export function RefreshBox({ onClick }: { onClick: () => void }) {
  const [deg, setDeg] = useState(0);
  return (
    <BoxBtn type="button" aria-label="새로고침" onClick={() => { setDeg((d) => d + 360); onClick(); }}>
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${deg}deg)`, transition: 'transform .6s ease' }}>
        <path d="M20 12a8 8 0 1 1-2.3-5.7" />
        <path d="M20 4v5h-5" />
      </svg>
    </BoxBtn>
  );
}

/** 필터 줄 — hover 시 글자색만 바뀌는 칩 (.sc-chip) */
export const FilterRow = styled.div`
  padding: 10px 20px 10px 8px;
  border-bottom: 1px solid ${color.consoleBorder};
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  column-gap: 16px;
`;

export const ChipGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const Chip = styled.button<{ $on?: boolean }>`
  height: 28px;
  box-sizing: border-box;
  border: 0;
  padding: 0 12px;
  font-size: 14px;
  cursor: pointer;
  background: none;
  color: ${(p) => (p.$on ? color.consoleSelected : color.consoleChip)};
  &:hover {
    color: ${(p) => (p.$on ? color.consoleSelected : '#ffffff')};
  }
`;

export const ChipDivider = styled.span.attrs({ 'aria-hidden': 'true' })`
  width: 1px;
  height: 12px;
  background: ${color.consoleBtnBorder};
  display: block;
`;

export const RangeText = styled.span`
  justify-self: end;
  color: ${color.consoleDim};
  font-size: 13px;
  white-space: nowrap;
`;

// ---- 표 ----

export const TableScroll = styled.div<{ $minHeight?: number }>`
  overflow-x: auto;
  ${(p) => (p.$minHeight ? css`min-height: ${p.$minHeight}px;` : '')}
`;

export const Table = styled.table<{ $minWidth?: number }>`
  width: 100%;
  min-width: ${(p) => p.$minWidth ?? 1100}px;
  border-collapse: collapse;
  table-layout: fixed;

  thead tr {
    color: ${color.consoleDim};
    font-size: 13px;
    text-align: left;
  }
  th {
    padding: 10px 12px;
    border-bottom: 1px solid ${color.consoleBorder};
    font-weight: 400;
    box-sizing: border-box;
  }
  th:first-child {
    padding-left: 20px;
  }
  th:last-child {
    padding-right: 20px;
  }
  td {
    padding: 11px 12px;
    border-bottom: 1px solid ${color.consoleRowBorder};
    box-sizing: border-box;
  }
  td:first-child {
    padding-left: 20px;
  }
  td:last-child {
    padding-right: 20px;
  }
`;

/** 일반 행 hover (.sc-row) */
export const Row = styled.tr`
  td {
    transition: background 0.15s;
  }
  &:hover td {
    background: #161616;
  }
`;

/** 클릭 가능한 상품 행 (.sc-prow) — 흐린 hover */
export const ClickRow = styled.tr`
  cursor: pointer;
  td {
    transition: background 0.15s;
  }
  &:hover td {
    background: ${color.consoleHoverRow};
  }
`;

export const Cut = styled.span`
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const EmptyNote = styled.p`
  margin: 0;
  padding: 32px 20px;
  text-align: center;
  color: ${color.consoleDim};
`;

export const FootNote = styled.p`
  margin: 0;
  padding: 10px 20px 12px;
  font-size: 12px;
  line-height: 16px;
  color: ${color.consoleFaint};
`;

/** 신청 인원 게이지 (기준선 포함) */
export function Gauge({ pct, needPct, bar }: { pct: number; needPct: number; bar: string }) {
  return (
    <span style={{ height: 4, background: color.consoleBorder, position: 'relative', display: 'block' }}>
      <span
        style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(100, pct)}%`, background: bar, display: 'block' }}
      />
      <span
        aria-hidden="true"
        title="출발 확정 기준"
        style={{ position: 'absolute', left: `${Math.min(100, needPct)}%`, top: -3, width: 1, height: 10, background: color.consoleFaint, display: 'block' }}
      />
    </span>
  );
}

// ---- 폼 입력 (.sc-in) ----

export const Input = styled.input`
  height: 32px;
  box-sizing: border-box;
  background: #000000;
  border: 1px solid ${color.consoleBtnBorder};
  border-radius: 0;
  color: ${color.consoleText};
  padding: 0 10px;
  font-size: 14px;
  &:focus {
    outline: 2px solid ${color.brandGold};
    outline-offset: -1px;
  }
`;

export const Select = styled.select`
  height: 32px;
  box-sizing: border-box;
  background: #000000;
  border: 1px solid ${color.consoleBtnBorder};
  border-radius: 0;
  color: ${color.consoleText};
  padding: 0 8px;
  font-size: 14px;
  &:focus {
    outline: 2px solid ${color.brandGold};
    outline-offset: -1px;
  }
`;

export const Textarea = styled.textarea`
  box-sizing: border-box;
  background: #000000;
  border: 1px solid ${color.consoleBtnBorder};
  border-radius: 0;
  color: ${color.consoleText};
  padding: 8px 10px;
  font-size: 14px;
  resize: vertical;
  &:focus {
    outline: 2px solid ${color.brandGold};
    outline-offset: -1px;
  }
`;

export const FieldLabel = styled.span`
  font-size: 13px;
  color: ${color.consoleDim};
`;

export const Required = styled.span`
  color: ${color.danger};
`;
