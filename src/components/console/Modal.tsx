// 콘솔 모달·확인 대화상자 — 디자인 캔버스의 일정 취소/삭제 다이얼로그 형태.
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { color } from '@/styles/tokens';
import { DangerBtn, GhostBtn, PrimaryBtn } from './ui';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const Box = styled.div<{ $width: number }>`
  width: ${(p) => p.$width}px;
  max-width: 100%;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  box-sizing: border-box;
  background: #121212;
  border: 1px solid ${color.consoleBtnBorder};
`;

const Head = styled.div`
  padding: 14px 20px;
  border-bottom: 1px solid ${color.consoleBorder};
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  background: #121212;
`;

export function Modal({
  title,
  width = 460,
  onClose,
  children,
}: {
  title: string;
  width?: number;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Overlay role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <Box $width={width}>
        <Head>
          <h3 style={{ margin: 0, fontSize: 16, lineHeight: '22px', fontWeight: 700 }}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            style={{ background: 'none', border: 0, color: color.consoleDim, padding: 4, cursor: 'pointer', display: 'flex' }}
          >
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3 3l8 8M11 3l-8 8" />
            </svg>
          </button>
        </Head>
        {children}
      </Box>
    </Overlay>
  );
}

export function ConfirmDialog({
  title,
  body,
  confirmText,
  busy,
  onClose,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmText: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p style={{ margin: 0, padding: '16px 20px 8px', color: color.consoleBtnText }}>{body}</p>
      <p style={{ margin: 0, padding: '0 20px 16px', fontSize: 12, lineHeight: '16px', color: color.consoleFaint }}>
        이 작업은 되돌릴 수 없으며, 처리 결과는 상단 알림으로 표시됩니다.
      </p>
      <div style={{ padding: '0 20px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <GhostBtn type="button" onClick={onClose} disabled={busy}>
          닫기
        </GhostBtn>
        <DangerBtn type="button" onClick={onConfirm} disabled={busy}>
          {busy ? '처리 중…' : confirmText}
        </DangerBtn>
      </div>
    </Modal>
  );
}

export function ModalFooter({
  onClose,
  saveText,
  busy,
  formId,
}: {
  onClose: () => void;
  saveText: string;
  busy?: boolean;
  formId?: string;
}) {
  return (
    <div style={{ padding: '0 20px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
      <GhostBtn type="button" onClick={onClose} disabled={busy}>
        닫기
      </GhostBtn>
      <PrimaryBtn type="submit" form={formId} disabled={busy}>
        {busy ? '저장 중…' : saveText}
      </PrimaryBtn>
    </div>
  );
}
