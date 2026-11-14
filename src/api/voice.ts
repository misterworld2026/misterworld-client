// 음성 선택 (Q15): 녹음 → /api/v1/voice/transcriptions → /api/v1/voice/interpretations
// 브라우저는 Spring 공개 API만 호출한다. (voice-service/FRONTEND_INTEGRATION.md)
import { api } from './client';
import type { VoiceInterpretationResponse, VoiceSelection } from './types';

export function transcribe(audio: Blob): Promise<{ text: string }> {
  const ext = audio.type.includes('mp4') ? 'm4a' : audio.type.includes('wav') ? 'wav' : 'webm';
  const form = new FormData();
  form.append('audio', audio, `voice.${ext}`);
  return api<{ text: string }>('/api/v1/voice/transcriptions', { method: 'POST', body: form });
}

export function interpret(text: string, context: VoiceSelection): Promise<VoiceInterpretationResponse> {
  return api<VoiceInterpretationResponse>('/api/v1/voice/interpretations', { method: 'POST', body: { text, context } });
}

export const EMPTY_SELECTION: VoiceSelection = {
  productId: null,
  scheduleId: null,
  grade: null,
  optionIds: { HOTEL: null, TRANSPORT: null, MEAL: null, EXTRA: [] },
};
