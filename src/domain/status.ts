// BE Enum → 화면 라벨·색 매핑 (디자인 캔버스 Staff/Reservations/Inventory 기준).
import { color } from '@/styles/tokens';

export type ScheduleStatus =
  | 'RECRUITING_SCHEDULE'
  | 'CONFIRMED_SCHEDULE'
  | 'CLOSED_SCHEDULE'
  | 'IN_PROGRESS_SCHEDULE'
  | 'COMPLETED_SCHEDULE'
  | 'CANCELLED_SCHEDULE';

export type ApplicationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
export type InventoryStatus = 'NORMAL' | 'LOW_STOCK' | 'OUT_OF_STOCK';
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';
export type NotificationType = 'APPLICATION_COMPLETED' | 'DEPARTURE_CONFIRMED' | 'SCHEDULE_CANCELLED';
export type Role = 'MEMBER' | 'STAFF';
export type Grade = 'CLASSIC' | 'GRAND' | 'PREMIUM';

export const SCHEDULE_META: Record<ScheduleStatus, { text: string; fg: string; bar: string; dim: boolean }> = {
  RECRUITING_SCHEDULE: { text: '모집 중', fg: color.info, bar: color.info, dim: false },
  CONFIRMED_SCHEDULE: { text: '출발 확정', fg: color.ok, bar: color.ok, dim: false },
  CLOSED_SCHEDULE: { text: '모집 마감', fg: color.consoleDim, bar: color.consoleFaint, dim: false },
  IN_PROGRESS_SCHEDULE: { text: '진행 중', fg: color.warn, bar: color.ok, dim: false },
  COMPLETED_SCHEDULE: { text: '완료', fg: color.consoleFaint, bar: '#3a3a3a', dim: true },
  CANCELLED_SCHEDULE: { text: '취소', fg: color.danger, bar: color.consoleFaint, dim: true },
};

export const APPLICATION_META: Record<ApplicationStatus, { text: string; fg: string }> = {
  PENDING: { text: '출발 확정 대기', fg: color.info },
  CONFIRMED: { text: '출발 확정', fg: color.ok },
  CANCELLED: { text: '취소', fg: color.danger },
};

export const INVENTORY_META: Record<InventoryStatus, { text: string; fg: string }> = {
  NORMAL: { text: '정상', fg: color.consoleText },
  LOW_STOCK: { text: '재고 부족', fg: color.warn },
  OUT_OF_STOCK: { text: '재고 없음', fg: color.danger },
};

export const GRADE_LABEL: Record<Grade, string> = {
  CLASSIC: '클래식',
  GRAND: '그랜드',
  PREMIUM: '프리미엄',
};

export const OPTION_TYPE_LABEL: Record<string, string> = {
  HOTEL: '호텔',
  TRANSPORT: '교통',
  MEAL: '식사',
  EXTRA: '추가 옵션',
};
