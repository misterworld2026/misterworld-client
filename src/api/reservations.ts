import { fetchAllPages } from './client';
import type { ApplicationResponse, NotificationResponse } from './types';

/** 직원: 전체 신청 목록 */
export function fetchAdminApplications(): Promise<ApplicationResponse[]> {
  return fetchAllPages<ApplicationResponse>('/api/admin/reservations');
}

/** 직원: 전체 문자 알림 목록 */
export function fetchAdminNotifications(): Promise<NotificationResponse[]> {
  return fetchAllPages<NotificationResponse>('/api/admin/notifications');
}
