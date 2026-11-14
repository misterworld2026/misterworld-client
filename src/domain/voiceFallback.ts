// 임시: 음성 해석 서비스(502/504)가 안 될 때 브라우저에서 문장을 간단히 해석해 선택값을 만든다.
// 시나리오 테스트용이며, voice-service가 정상화되면 이 파일과 VoiceWidget의 호출부를 제거한다.
// 규칙은 BE VoicePreviewService의 매칭을 단순화한 것: 상품 이름/테마, 등급 단어, "N월 N일", 옵션 이름 포함 여부.
import { fetchProducts } from '@/api/tours';
import { fetchProductSchedules } from '@/api/schedules';
import type { TravelProductResponse, VoiceSelection } from '@/api/types';

const THEME_WORDS = ['허니문', '효도', '골프', '트레킹'];
const GRADE_WORDS: [string, string[]][] = [
  ['CLASSIC', ['클래식', 'classic']],
  ['GRAND', ['그랜드', 'grand']],
  ['PREMIUM', ['프리미엄', 'premium']],
];

const norm = (v: string) => v.toLowerCase().replace(/[\s·,\-]+/g, '');

function pickProduct(text: string, products: TravelProductResponse[], fallbackId: number | null) {
  const byName = products.find((p) => {
    const n = norm(p.name);
    return n && (text.includes(n) || text.includes(n.replace(/(여행|투어)$/, '')));
  });
  if (byName) return byName;
  const theme = THEME_WORDS.find((t) => text.includes(t));
  const byTheme = theme ? products.find((p) => p.theme === theme) : undefined;
  return byTheme ?? products.find((p) => p.id === fallbackId) ?? null;
}

export async function interpretLocally(raw: string, context: VoiceSelection): Promise<VoiceSelection> {
  const text = norm(raw);
  const products = await fetchProducts();
  const product = pickProduct(text, products, context.productId);
  if (!product) return { productId: null, scheduleId: null, grade: null, optionIds: null };
  const sameProduct = product.id === context.productId;

  // 등급: 말한 등급이 이 상품에서 고를 수 있을 때만
  const spokenGrade = GRADE_WORDS.find(([, words]) => words.some((w) => text.includes(w)))?.[0] ?? null;
  const gradeOk = (g: string | null) => !!g && product.allowedGrades.some((c) => c.grade === g && c.configurationReady);
  const grade = gradeOk(spokenGrade) ? spokenGrade : sameProduct && gradeOk(context.grade) ? context.grade : null;

  // 일정: "N월 N일" 출발 + 신청 가능한 일정
  let scheduleId = sameProduct ? context.scheduleId : null;
  const date = raw.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (date) {
    const mmdd = `-${date[1].padStart(2, '0')}-${date[2].padStart(2, '0')}`;
    const schedules = await fetchProductSchedules(product.id);
    const hit = schedules.find((s) => s.applicationEnabled && s.departureDate.endsWith(mmdd));
    if (hit) scheduleId = hit.travelScheduleId;
  }

  // 옵션: 등급이 정해졌을 때, 그 등급에서 허용된 옵션 중 이름이 문장에 들어 있는 것
  const allowed = product.allowedGrades.find((c) => c.grade === grade)?.allowedOptions ?? [];
  const named = (type: string) => allowed.filter((o) => o.type === type && text.includes(norm(o.name)));
  const prev = sameProduct ? context.optionIds : null;
  const optionIds = {
    HOTEL: named('HOTEL')[0]?.id ?? prev?.HOTEL ?? null,
    TRANSPORT: null,
    MEAL: named('MEAL')[0]?.id ?? prev?.MEAL ?? null,
    EXTRA: [...new Set([...(prev?.EXTRA ?? []), ...named('EXTRA').map((o) => o.id)])],
  };

  return { productId: product.id, scheduleId, grade, optionIds };
}
