import { api, fetchAllPages } from './client';
import type { TravelProductRequest, TravelProductResponse } from './types';

export function fetchProducts(): Promise<TravelProductResponse[]> {
  return fetchAllPages<TravelProductResponse>('/api/tours');
}

export function fetchProduct(productId: number): Promise<TravelProductResponse> {
  return api<TravelProductResponse>(`/api/tours/${productId}`);
}

export function createProduct(body: TravelProductRequest): Promise<TravelProductResponse> {
  return api<TravelProductResponse>('/api/admin/tours', { method: 'POST', body });
}

export function updateProduct(productId: number, body: TravelProductRequest): Promise<TravelProductResponse> {
  return api<TravelProductResponse>(`/api/admin/tours/${productId}`, { method: 'PUT', body });
}
