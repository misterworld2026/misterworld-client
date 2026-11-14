// 페이지 오른쪽 아래에 붙는 음성 선택 버튼 (Main/Themes 디자인의 sticky 래퍼).
// 홈·테마에서 적용하면 예약 화면으로 선택을 넘긴다. 직원 계정에는 보이지 않는다.
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { EMPTY_SELECTION } from '@/api/voice';
import VoiceWidget from './VoiceWidget';

export default function FloatingVoice() {
  const auth = useAuth();
  const navigate = useNavigate();
  if (auth.role === 'STAFF') return null;
  return (
    <div style={{ position: 'sticky', bottom: 24, height: 0, display: 'flex', justifyContent: 'flex-end', padding: '0 24px', zIndex: 10 }}>
      <div style={{ transform: 'translateY(-100%)', alignSelf: 'flex-start' }}>
        <VoiceWidget context={EMPTY_SELECTION} onApply={(selection) => navigate('/booking', { state: { voice: selection } })} />
      </div>
    </div>
  );
}
