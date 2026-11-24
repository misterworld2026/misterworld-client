// BE(misterworld-server) DTO를 그대로 옮긴 타입. 필드명은 BE 코드가 기준이다.
import type {
  ApplicationStatus,
  Grade,
  InventoryStatus,
  NotificationStatus,
  NotificationType,
  Role,
  ScheduleStatus,
} from '@/domain/status';

// ---- 공통 ----

/** 오류 응답 (common/ResultDto.java) */
export interface ResultDto {
  success: boolean;
  message: string;
  status: number;
  code: string;
}

/** Spring Data Page 직렬화 (구·신 형식 모두 normalizePage로 흡수) */
export interface PageData<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// ---- 인증 (auth/dto) ----

export interface LoginRequest {
  email: string;
  password: string;
}
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  role: Role;
}
export interface SignUpRequest {
  email: string;
  password: string;
  passwordConfirmation: string;
  name: string;
  address: string;
  phoneNumber: string;
}
export interface SignUpResponse {
  id: number;
  email: string;
  role: Role;
}

// ---- 회원 (member/dto) ----

export interface MemberResponse {
  id: number;
  email: string;
  name: string;
  address: string;
  phoneNumber: string;
  travelCount: number;
  role: Role;
}

// ---- 상품·옵션 (travelproduct/dto) ----

export interface TravelOptionResponse {
  id: number;
  type: string; // HOTEL | TRANSPORT | MEAL | EXTRA
  name: string;
  grade: string;
  additionalPrice: number;
  description: string | null;
  defaultForGrade: string | null;
  allowedTourGrades: string[];
  benefitCode: string | null;
}

export interface TravelGradeConfiguration {
  grade: string;
  price: number | null;
  defaultOptions: TravelOptionResponse[];
  allowedOptions: TravelOptionResponse[];
  configurationReady: boolean;
}

export interface TravelProductResponse {
  id: number;
  name: string;
  theme: string; // 허니문 | 효도 | 골프 | 트레킹
  description: string | null;
  classicPrice: number | null;
  grandPrice: number;
  premiumPrice: number;
  options: TravelOptionResponse[];
  allowedGrades: TravelGradeConfiguration[];
}

export interface TravelOptionRequest {
  id?: number | null;
  type: string;
  name: string;
  grade: string;
  additionalPrice: number;
  description?: string | null;
  defaultForGrade?: string | null;
  allowedTourGrades?: string[] | null;
  benefitCode?: string | null;
}

export interface TravelProductRequest {
  name: string;
  theme: string;
  description?: string | null;
  classicPrice: number | null;
  grandPrice: number;
  premiumPrice: number;
  options: TravelOptionRequest[];
}

// ---- 일정 (travelschedule/dto) ----

export interface TravelScheduleResponse {
  travelScheduleId: number;
  productId: number;
  departureDate: string; // yyyy-MM-dd
  arrivalDate: string; // BE 응답 필드명. DB '종료일'에 매핑
  status: ScheduleStatus;
  applicantCount: number;
  applicationEnabled: boolean;
  disabledReason: string | null;
  selectionEnabled: boolean;
}

/** 요청 본문은 endDate, 응답은 arrivalDate (BE 계약 그대로) */
export interface TravelScheduleRequest {
  departureDate: string;
  endDate: string;
}

// ---- 신청 (travelapplication/dto) ----

export interface ApplicationResponse {
  id: number;
  scheduleId: number;
  tourGrade: Grade;
  hotelOption: string | null;
  transportOption: string | null;
  mealOption: string | null;
  extraOption: string | null;
  applicantCount: number;
  basePrice: number;
  additionalOptionPrice: number;
  discountRate: number;
  discountAmount: number;
  totalPrice: number;
  status: ApplicationStatus;
  appliedAt: string;
  paymentStatus: 'UNPAID' | 'PAID' | null;
  paidAmount: number | null;
  paidAt: string | null;
  /** BE 요청 2(Q11): 대표 신청자 이름·연락처. BE 반영 전에는 없음 → 화면에 '-' */
  applicantName?: string | null;
  applicantPhoneNumber?: string | null;
}

/** POST /api/reservations 응답 */
export interface TravelApplicationResponse {
  application: ApplicationResponse;
  scheduleStatus: ScheduleStatus;
  departureConfirmed: boolean;
}

/** 신청 여행객 (participantType: 신청자 1명 APPLICANT, 나머지 COMPANION) */
export interface TravelParticipantRequest {
  name: string;
  phoneNumber: string;
  birthDate: string; // yyyy-MM-dd
  participantType: 'APPLICANT' | 'COMPANION';
}

/** POST /api/reservations/quote 와 /api/reservations 공통 요청 */
export interface TravelApplicationRequest {
  productId: number;
  scheduleId: number;
  grade: Grade;
  optionIds: number[];
  applicantCount: number;
  participants: TravelParticipantRequest[];
  requestKey: string;
  quoteToken?: string | null;
}

export interface TravelApplicationChangeRequest {
  grade: Grade;
  optionIds: number[];
  quoteToken?: string | null;
}

export interface TravelPriceResponse {
  basePrice: number;
  additionalOptionPrice: number;
  discountRate: number;
  discountAmount: number;
  totalPrice: number;
}

export interface TravelQuoteResponse {
  product: TravelProductResponse;
  schedule: TravelScheduleResponse;
  grade: Grade;
  applicantCount: number;
  selectedOptions: TravelOptionResponse[];
  completedTrips: number;
  price: TravelPriceResponse;
  quoteToken: string;
  expiresAt: string;
}

/** GET /api/my/trips/history */
export interface TravelHistoryResponse {
  id: number;
  scheduleId: number;
  productId: number;
  productName: string;
  departureDate: string;
  arrivalDate: string;
  tourGrade: Grade;
  hotelOption: string | null;
  transportOption: string | null;
  mealOption: string | null;
  extraOption: string | null;
  applicantCount: number;
  basePrice: number;
  additionalOptionPrice: number;
  discountRate: number;
  discountAmount: number;
  totalPrice: number;
  status: ApplicationStatus;
  appliedAt: string;
}

// ---- 음성 선택 (dto/voice/VoiceDtos) ----

export interface VoiceSelection {
  productId: number | null;
  scheduleId: number | null;
  grade: string | null;
  optionIds: { HOTEL: number | null; TRANSPORT: number | null; MEAL: number | null; EXTRA: number[] } | null;
}
export type VoiceFieldStatus = 'NOT_MENTIONED' | 'MATCHED' | 'UNRESOLVED' | 'INVALID' | 'AMBIGUOUS';
export interface VoicePreviewField {
  status: VoiceFieldStatus;
  value: string | null;
}
export interface VoiceInterpretationResponse {
  text: string;
  selection: VoiceSelection;
  fields: {
    tour: VoicePreviewField;
    schedule: VoicePreviewField;
    grade: VoicePreviewField;
    hotel: VoicePreviewField;
    transport: VoicePreviewField;
    meal: VoicePreviewField;
    extras: VoicePreviewField[];
  };
  failureCount: number;
  nextAction: 'REVIEW' | 'RETRY_OR_GUI';
}

// ---- 재고 (inventory/dto) ----

export interface InventoryResponse {
  id: number;
  productId: number;
  itemName: string;
  quantity: number;
  status: InventoryStatus;
  updatedAt: string;
}

export interface ItemInventoryRequest {
  productId: number;
  itemName: string;
  quantity: number;
}

// ---- 문자 알림 (notification/dto) ----

export interface NotificationResponse {
  id: number;
  applicationId: number;
  notificationType: NotificationType;
  message: string;
  status: NotificationStatus;
  sentAt: string | null;
}
