// 고객 화면 공통 푸터 — 디자인 캔버스 Main/Themes 푸터 포팅.
import { color } from '@/styles/tokens';

const col = { flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 8 } as const;
const p = { margin: 0, fontSize: 15, lineHeight: '22px' } as const;
const h = { margin: 0, fontSize: 17, lineHeight: '24px', fontWeight: 700 } as const;

export default function CustomerFooter() {
  return (
    <footer style={{ background: color.surfaceSoft, color: '#000000', padding: '64px 24px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 40 }}>
        <div style={col}>
          <span style={{ fontSize: 32, lineHeight: '40px', fontWeight: 700 }}>Mr. World</span>
          <span style={p}>테마 여행 서비스</span>
        </div>
        <div style={col}>
          <h2 style={h}>팀 정보</h2>
          <p style={p}>그 날 본 code를 우리는 아직 모른다 (그날code)</p>
          <p style={p}>팀원: 조영재 · 박강현 · 최정혁</p>
        </div>
        <div style={col}>
          <h2 style={h}>과목 정보</h2>
          <p style={p}>소프트웨어공학 (71032)</p>
          <p style={p}>AI 기반 미스터 월드 테마 여행 서비스 구축</p>
        </div>
      </div>
    </footer>
  );
}
