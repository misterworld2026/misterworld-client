// 음성으로 여행 선택 — 디자인 캔버스(Main/Themes/Booking)의 금색 알약 버튼 + 검은 패널을 그대로 쓰고,
// 인식은 BE 방식(Q15)으로 한다: MediaRecorder 녹음 → POST /api/v1/voice/transcriptions
// → (고객이 문장 확인·수정) → POST /api/v1/voice/interpretations → 고객이 확인한 선택만 화면에 적용.
// 음성 응답만으로 신청을 만들거나 가격을 확정하지 않는다. (voice-service/FRONTEND_INTEGRATION.md)
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { interpret, transcribe } from '@/api/voice';
import { interpretLocally } from '@/domain/voiceFallback';
import type { VoiceInterpretationResponse, VoicePreviewField, VoiceSelection } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { color } from '@/styles/tokens';

type Phase = 'recording' | 'uploading' | 'review' | 'interpreting' | 'result' | 'idle';

const MAX_MS = 10_000; // 최대 10초 녹음 후 자동 종료 → 지금까지의 음성을 문장으로 변환 (BE 제한 30초 이내)
const BAR_COUNT = 20;
const flatBars = () => Array.from({ length: BAR_COUNT }, () => 4);

function pickMime(): string {
  const list = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  for (const m of list) if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m;
  return '';
}

function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.status) {
      case 401:
      case 403: return '음성 선택은 로그인한 회원만 사용할 수 있습니다.';
      case 413: return '녹음이 너무 깁니다. 10초 안으로 다시 말씀해 주세요.';
      case 415: return '지원하지 않는 녹음 형식입니다. 다른 브라우저로 다시 시도해 주세요.';
      case 422: return '음성을 알아듣지 못했어요. 다시 말하거나 화면에서 직접 골라 주세요.';
      case 502:
      case 504: return '음성 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.';
      default: return e.message;
    }
  }
  return '요청을 처리하지 못했습니다. 다시 시도해 주세요.';
}

const FIELD_LABEL: [keyof Omit<VoiceInterpretationResponse['fields'], 'extras'>, string][] = [
  ['tour', '상품'],
  ['schedule', '일정'],
  ['grade', '등급'],
  ['hotel', '호텔'],
  ['transport', '교통'],
  ['meal', '식사'],
];

function fieldText(f: VoicePreviewField): { text: string; ok: boolean } | null {
  if (f.status === 'NOT_MENTIONED') return null;
  if (f.status === 'MATCHED') return { text: f.value ?? '-', ok: true };
  return { text: f.value ? `${f.value} (확인 필요)` : '확인 필요', ok: false };
}

// 버튼·패널 크기 (버튼을 키우면 펼친 패널도 같은 비율로 키운다)
const BTN_W = 240;
const BTN_H = 56;
const PANEL_W = 560;
const PANEL_MIN_H = 168;

function MicIcon({ size = 20 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

/** 흰 원 버튼 (마이크 · 입력 중지 공통) */
const circleBtn = {
  width: 40,
  height: 40,
  border: 0,
  borderRadius: '50%',
  padding: 0,
  background: '#ffffff',
  color: '#000000',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
} as const;

const iconLayer = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'opacity 0.25s ease, transform 0.25s ease',
} as const;

const BARS_W = (BAR_COUNT / 2) * 4 + (BAR_COUNT / 2 - 1) * 4; // 막대 10개 + 간격 9개

/** 원 버튼 옆 막대. 녹음이 시작되면 폭이 0 → 전체로 펼쳐지며 나타난다 (바깥쪽 끝 기준으로 잘림) */
function BarsSlot({ show, side, values }: { show: boolean; side: 'left' | 'right'; values: number[] }) {
  const pad = 16;
  return (
    <div
      aria-hidden="true"
      style={{
        boxSizing: 'border-box',
        width: show ? BARS_W + pad : 0,
        opacity: show ? 1 : 0,
        overflow: 'hidden',
        display: 'flex',
        justifyContent: side === 'left' ? 'flex-end' : 'flex-start',
        [side === 'left' ? 'paddingRight' : 'paddingLeft']: show ? pad : 0,
        transition: 'width 0.35s ease, opacity 0.3s ease 0.05s, padding 0.35s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32, flexShrink: 0 }}>
        {values.map((h, i) => (
          <span key={i} style={{ width: 4, height: h, borderRadius: 2, background: '#ffffff', display: 'block', transition: 'height 0.08s linear' }} />
        ))}
      </div>
    </div>
  );
}

const pillBtn = {
  height: 36,
  border: 0,
  borderRadius: 18,
  padding: '0 16px',
  background: '#ffffff',
  color: '#000000',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
} as const;

export default function VoiceWidget({
  context,
  onApply,
}: {
  /** 현재 화면의 선택 (선택 전 값은 null, EXTRA는 []) */
  context: VoiceSelection;
  /** 고객이 '선택 적용'을 누른 결과 */
  onApply: (selection: VoiceSelection) => void;
}) {
  const auth = useAuth();
  const member = auth.status === 'authed' && auth.role === 'MEMBER';
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [bars, setBars] = useState<number[]>(flatBars);
  const [result, setResult] = useState<VoiceInterpretationResponse | null>(null);
  const [panelH, setPanelH] = useState(PANEL_MIN_H);
  const [dur, setDur] = useState('0.5s');

  const panelRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);
  const timerRef = useRef(0);
  const cancelledRef = useRef(false);

  // 패널 높이를 내용에 맞춰 애니메이션 (디자인의 voiceMeasure)
  useLayoutEffect(() => {
    if (!open || !panelRef.current) return;
    const el = panelRef.current;
    const measure = () => setPanelH(Math.max(PANEL_MIN_H, el.scrollHeight));
    measure();
    const ro = new ResizeObserver(measure);
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => ro.disconnect();
  }, [open, phase, text, note, result]);

  const stopAudio = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    window.clearTimeout(timerRef.current);
    if (ctxRef.current) {
      void ctxRef.current.close().catch(() => undefined);
      ctxRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const finishRecording = useCallback(() => {
    const rec = recRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    else stopAudio();
  }, [stopAudio]);

  const upload = useCallback(async (blob: Blob) => {
    setPhase('uploading');
    setNote('');
    try {
      const res = await transcribe(blob);
      if (!res.text?.trim()) {
        setNote('음성을 알아듣지 못했어요. 다시 말하거나 화면에서 직접 골라 주세요.');
        setPhase('idle');
        return;
      }
      setText(res.text);
      setPhase('review');
    } catch (e) {
      // 실패하면 문장 칸 없이 실패 안내 문구만 보여준다
      setNote(errorText(e));
      setPhase('idle');
    }
  }, []);

  const startRecording = useCallback(async () => {
    setResult(null);
    setNote('');
    setBars(flatBars());
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setNote('이 브라우저에서는 마이크를 사용할 수 없습니다. 화면에서 직접 골라 주세요.');
      setPhase('idle');
      return;
    }
    setPhase('recording');
    cancelledRef.current = false;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setNote('마이크를 사용할 수 없습니다. 브라우저의 마이크 권한을 확인해 주세요.');
      setPhase('idle');
      return;
    }
    if (cancelledRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    streamRef.current = stream;

    const mime = pickMime();
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      stopAudio();
      recRef.current = null;
      if (cancelledRef.current) return;
      const base = (rec.mimeType || mime || 'audio/webm').split(';')[0];
      const blob = new Blob(chunks, { type: base });
      if (blob.size === 0) {
        setNote('녹음된 소리가 없습니다. 다시 말씀해 주세요.');
        setPhase('idle');
        return;
      }
      void upload(blob);
    };
    recRef.current = rec;
    rec.start();
    timerRef.current = window.setTimeout(() => finishRecording(), MAX_MS);

    // 소리 크기 막대 + 말이 끝나면 자동 종료
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    ctxRef.current = ctx;
    const an = ctx.createAnalyser();
    an.fftSize = 64;
    an.smoothingTimeConstant = 0.6;
    ctx.createMediaStreamSource(stream).connect(an);
    const data = new Uint8Array(an.frequencyBinCount);
    let frame = 0;
    const tick = () => {
      // 종료는 '입력 중지' 버튼 또는 10초 타이머(MAX_MS)로만 한다. 여기서는 막대만 그린다.
      an.getByteFrequencyData(data);
      const next: number[] = [];
      for (let i = 0; i < BAR_COUNT; i++) next.push(4 + (data[i + 1] / 255) * 28);
      if (frame++ % 2 === 0) setBars(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [finishRecording, stopAudio, upload]);

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true;
    const rec = recRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    recRef.current = null;
    stopAudio();
  }, [stopAudio]);

  useEffect(() => () => cancelRecording(), [cancelRecording]);

  const openPanel = () => {
    setDur('0.5s');
    setOpen(true);
    setText('');
    setResult(null);
    setNote('');
    setBars(flatBars());
    setPhase('idle'); // 팝업이 열려도 바로 녹음하지 않고, 마이크 버튼을 눌러야 시작한다
  };

  const closePanel = () => {
    cancelRecording();
    setDur('0.3s');
    setOpen(false);
    setPhase('idle');
  };

  const runInterpret = async () => {
    const t = text.trim();
    if (!t) {
      setNote('문장을 입력하거나 다시 말씀해 주세요.');
      return;
    }
    setPhase('interpreting');
    setNote('');
    let selection: VoiceSelection;
    try {
      selection = (await interpret(t, context)).selection;
    } catch (e) {
      // 임시: 해석 서비스 연결 실패(502/504) 시 브라우저에서 간단히 해석
      if (!(e instanceof ApiError && (e.status === 502 || e.status === 504))) {
        setNote(errorText(e));
        setPhase('review');
        return;
      }
      try {
        selection = await interpretLocally(t, context);
      } catch {
        setNote(errorText(e));
        setPhase('review');
        return;
      }
    }
    if (selection.productId == null) {
      setNote('말씀에서 여행 상품을 찾지 못했어요. 문장을 고치거나 화면에서 직접 골라 주세요.');
      setPhase('review');
      return;
    }
    // 찾은 선택값을 바로 예약 화면에 채운다 (예약 화면이 누락된 첫 단계로 이동)
    onApply(selection);
    closePanel();
  };

  const apply = () => {
    if (!result) return;
    onApply(result.selection);
    closePanel();
  };

  // ---- 표시값 ----
  const hint =
    note ||
    (!member
      ? '음성 선택은 로그인한 회원만 사용할 수 있습니다.'
      : phase === 'recording'
        ? '듣고 있어요. 원하는 여행을 10초 안에 말씀해 주세요.'
        : phase === 'uploading'
          ? '말씀을 문장으로 바꾸는 중입니다…'
          : phase === 'interpreting'
            ? '말씀하신 여행을 찾는 중입니다…'
            : phase === 'review'
              ? '문장이 맞는지 확인하고 고칠 부분이 있으면 고쳐 주세요.'
              : phase === 'result'
                ? '위 선택을 확인하고 적용해 주세요.'
                : '마이크 버튼을 눌러 말씀해 주세요.');

  const rows =
    result == null
      ? []
      : [
          ...FIELD_LABEL.map(([k, label]) => ({ label, v: fieldText(result.fields[k]) })),
          ...result.fields.extras.map((f) => ({ label: '추가', v: fieldText(f) })),
        ].filter((r): r is { label: string; v: { text: string; ok: boolean } } => r.v != null);

  const recording = phase === 'recording';
  const showText =phase === 'review' || phase === 'interpreting' || phase === 'result';

  return (
    <div
      style={{
        position: 'relative',
        width: open ? PANEL_W : BTN_W,
        maxWidth: 'calc(100vw - 96px)',
        height: open ? panelH : BTN_H,
        boxSizing: 'border-box',
        background: open ? '#000000' : color.brandGold,
        color: '#ffffff',
        borderRadius: BTN_H / 2,
        overflow: 'hidden',
        transition: `width ${dur} ease, height ${dur} ease, background-color ${dur} ease`,
      }}
    >
      <button
        type="button"
        onClick={openPanel}
        aria-expanded={open}
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'none', color: '#ffffff', border: 0, padding: 0,
          fontSize: 16, lineHeight: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer',
          opacity: open ? 0 : 1, visibility: open ? 'hidden' : 'visible', transition: 'opacity 0.2s ease, visibility 0.2s',
        }}
      >
        <MicIcon size={22} />
        <span>음성으로 여행 선택</span>
      </button>

      <div
        ref={panelRef}
        role="dialog"
        aria-label="음성으로 여행 선택"
        aria-hidden={!open}
        style={{
          position: 'absolute', top: 0, left: 0, width: PANEL_W, maxWidth: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
          minHeight: PANEL_MIN_H, opacity: open ? 1 : 0, visibility: open ? 'visible' : 'hidden',
          transition: `opacity 0.25s ease ${open ? '0.25s' : '0s'}, visibility 0.25s ${open ? '0.25s' : '0s'}`,
        }}
      >
        <button
          type="button"
          onClick={closePanel}
          aria-label="음성 입력 닫기"
          style={{ position: 'absolute', top: 6, right: 6, width: 36, height: 36, background: 'none', border: 0, padding: 0, color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        </button>

        <div aria-live="polite" style={{ flex: '1 1 auto', boxSizing: 'border-box', minHeight: 100, padding: '26px 56px 20px 24px', fontSize: 16, lineHeight: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
          {showText && (
            <textarea
              aria-label="인식된 문장"
              value={text}
              rows={2}
              readOnly={phase !== 'review'}
              onChange={(e) => setText(e.target.value)}
              style={{ margin: 0, padding: 0, border: 0, background: 'none', color: '#ffffff', font: 'inherit', resize: 'none', outline: 'none', width: '100%', borderBottom: phase === 'review' ? '1px dashed rgba(255,255,255,0.4)' : '1px solid transparent' }}
            />
          )}
          {rows.length > 0 && (
            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '48px 1fr', rowGap: 4, fontSize: 14, lineHeight: '20px' }}>
              {rows.map((r, i) => (
                <div key={i} style={{ display: 'contents' }}>
                  <dt style={{ opacity: 0.6 }}>{r.label}</dt>
                  <dd style={{ margin: 0, color: r.v.ok ? '#ffffff' : color.warn }}>{r.v.text}</dd>
                </div>
              ))}
            </dl>
          )}
          <p style={{ margin: 0, opacity: 0.6 }}>
            {hint}
            {!member && auth.status !== 'authed' && (
              <>
                {' '}
                <Link to="/login" style={{ textDecoration: 'underline', opacity: 1 }}>로그인</Link>
              </>
            )}
          </p>
        </div>

        <div style={{ flex: '0 0 62px', height: 62, margin: '0 16px', boxSizing: 'border-box', borderTop: '2px solid rgba(255, 255, 255, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {phase === 'uploading' || phase === 'interpreting' ? (
            <span style={{ fontSize: 14, opacity: 0.7 }}>잠시만 기다려 주세요…</span>
          ) : member ? (
            <>
              {/* 가운데 원 버튼은 제자리에 두고, 아이콘만 마이크 ↔ 붉은 네모로 교차 전환 + 막대가 좌우로 펼쳐진다 */}
              <BarsSlot show={recording} side="left" values={bars.slice(0, BAR_COUNT / 2).reverse()} />
              <button
                type="button"
                onClick={() => (recording ? finishRecording() : void startRecording())}
                aria-label={recording ? '입력 중지' : phase === 'idle' ? '말하기 시작' : '다시 말하기'}
                style={{ ...circleBtn, position: 'relative' }}
              >
                <span aria-hidden="true" style={{ ...iconLayer, opacity: recording ? 0 : 1, transform: recording ? 'scale(0.5)' : 'scale(1)' }}>
                  <MicIcon size={20} />
                </span>
                <span aria-hidden="true" style={{ ...iconLayer, opacity: recording ? 1 : 0, transform: recording ? 'scale(1)' : 'scale(0.5)' }}>
                  <span style={{ width: 14, height: 14, background: '#e5201d', borderRadius: 2, display: 'block' }} />
                </span>
              </button>
              <BarsSlot show={recording} side="right" values={bars.slice(BAR_COUNT / 2)} />
              {phase === 'review' && (
                <button type="button" style={{ ...pillBtn, marginLeft: 12 }} onClick={() => void runInterpret()}>
                  이 문장으로 찾기
                </button>
              )}
              {phase === 'result' && result && (
                <button type="button" style={{ ...pillBtn, marginLeft: 12 }} onClick={apply}>
                  선택 적용
                </button>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
