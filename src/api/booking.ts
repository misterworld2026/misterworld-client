// 고객 예약·결제·내 신청 API (MEMBER 전용)
import { api, fetchAllPages, normalizePage } from './client';
import type {
  ApplicationResponse,
  TravelApplicationRequest,
  TravelApplicationChangeRequest,
  TravelApplicationResponse,
  TravelHistoryResponse,
  TravelQuoteResponse,
} from './types';

/** 견적(가격·할인 확정 + quoteToken 15분) */
export function quoteReservation(body: TravelApplicationRequest): Promise<TravelQuoteResponse> {
  return api<TravelQuoteResponse>('/api/reservations/quote', { method: 'POST', body });
}

/** 신청 저장 (requestKey 멱등, quoteToken 필수) */
export function applyReservation(body: TravelApplicationRequest): Promise<TravelApplicationResponse> {
  return api<TravelApplicationResponse>('/api/reservations', { method: 'POST', body });
}

export function quoteReservationChange(applicationId: number, body: TravelApplicationChangeRequest): Promise<TravelQuoteResponse> {
  return api<TravelQuoteResponse>(`/api/my/applications/${applicationId}/change/quote`, { method: 'POST', body });
}

export function changeReservation(applicationId: number, body: TravelApplicationChangeRequest): Promise<ApplicationResponse> {
  return api<ApplicationResponse>(`/api/my/applications/${applicationId}/change`, { method: 'PUT', body });
}

/** 모의 결제(World Pay) */
export function payApplication(applicationId: number): Promise<ApplicationResponse> {
  return api<ApplicationResponse>(`/api/my/applications/${applicationId}/payment`, { method: 'POST' });
}

export function fetchMyApplications(): Promise<ApplicationResponse[]> {
  return fetchAllPages<ApplicationResponse>('/api/my/applications');
}

export function cancelMyApplication(applicationId: number): Promise<void> {
  return api<void>(`/api/my/applications/${applicationId}/cancel`, { method: 'PUT' });
}

export function fetchTravelHistory(): Promise<TravelHistoryResponse[]> {
  return fetchAllPages<TravelHistoryResponse>('/api/my/trips/history');
}

/** 완료 여행 수(단골 할인 예상용). 최종 할인은 견적 응답이 기준이다. */
export async function fetchCompletedTripCount(): Promise<number> {
  const page = normalizePage<TravelHistoryResponse>(await api<unknown>('/api/my/trips/history?page=0&size=1'));
  return page.totalElements;
}
