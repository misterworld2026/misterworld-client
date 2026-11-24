import { api, fetchAllPages } from './client';
import type { TravelScheduleRequest, TravelScheduleResponse } from './types';

/** 전체 일정 (모든 상품) */
export function fetchAllSchedules(): Promise<TravelScheduleResponse[]> {
  return fetchAllPages<TravelScheduleResponse>('/api/tours/schedules');
}

export function fetchProductSchedules(productId: number): Promise<TravelScheduleResponse[]> {
  return fetchAllPages<TravelScheduleResponse>(`/api/tours/${productId}/schedules`);
}

export function createSchedule(productId: number, body: TravelScheduleRequest) {
  return api<TravelScheduleResponse>(`/api/admin/tours/${productId}/schedules`, { method: 'POST', body });
}

export function updateSchedule(scheduleId: number, body: TravelScheduleRequest) {
  return api<TravelScheduleResponse>(`/api/admin/schedules/${scheduleId}`, { method: 'PATCH', body });
}

export function deleteSchedule(scheduleId: number): Promise<void> {
  return api<void>(`/api/admin/schedules/${scheduleId}`, { method: 'DELETE' });
}

export function cancelSchedule(scheduleId: number) {
  return api<TravelScheduleResponse>(`/api/admin/schedules/${scheduleId}/cancel`, { method: 'PUT' });
}

export function startSchedule(scheduleId: number) {
  return api<TravelScheduleResponse>(`/api/admin/schedules/${scheduleId}/start`, { method: 'PUT' });
}

export function completeSchedule(scheduleId: number) {
  return api<TravelScheduleResponse>(`/api/admin/schedules/${scheduleId}/complete`, { method: 'PUT' });
}
