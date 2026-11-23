// 업무 규칙 상수. API 응답에 없는 값은 설계·BE 코드(2026-11 확정)와 같은 값으로 둔다.
// 정원: 허니문 4 / 효도 20 / 골프 10 / 트레킹 20 (BE TravelScheduleService와 동일, Q7 확정)
// 출발 확정: 허니문 4명(2팀) 이상, 그 외 3명 이상 (Q5 확정)
// 신청 마감: 출발 7일 전까지 (BE BookingPolicy D-7)

export const THEMES = ['허니문', '효도', '골프', '트레킹'] as const;
export type Theme = (typeof THEMES)[number];

/** 화면 표시용 테마 풀네임. BE·URL·규칙 판정에는 짧은 이름(THEMES)을 그대로 쓴다. */
export const THEME_DISPLAY: Record<Theme, string> = {
  허니문: '허니문 낭만 투어',
  효도: '효도 힐링 투어',
  골프: '골프 챌린지 투어',
  트레킹: '아웃도어 트레킹 투어',
};

/** 상품 표시 이름: 상품명이 짧은 테마명('허니문' 등)이면 풀네임으로, 직원이 따로 지은 이름이면 그대로 */
export function productDisplayName(name: string | null | undefined): string {
  if (!name) return '';
  return (THEME_DISPLAY as Record<string, string>)[name.trim()] ?? name;
}

export function capacityOf(theme: string): number {
  switch (theme) {
    case '허니문': return 4;
    case '골프': return 10;
    case '효도':
    case '트레킹': return 20;
    default: return 0;
  }
}

export function needOf(theme: string): number {
  return theme === '허니문' ? 4 : 3;
}

export function needTextOf(theme: string): string {
  return theme === '허니문' ? '4명(2팀) 이상' : '3명 이상';
}

export function carOf(theme: string): string {
  return theme === '허니문' ? '2인 전용 고급차량' : '10인 승합 고급차량';
}

/** 클래식 판매 금지 테마 (허니문·효도는 그랜드 이상만) */
export function classicBlocked(theme: string): boolean {
  return theme === '허니문' || theme === '효도';
}

/** 신청 마감일 = 출발일 - 7일 (그날까지 신청 가능) */
export function deadlineOf(departureDate: string): string {
  return addDays(departureDate, -7);
}

export function addDays(iso: string, n: number): string {
  const t = new Date(iso + 'T00:00:00Z');
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

export function todayIso(): string {
  const t = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
}

export function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}
