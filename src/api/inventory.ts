import { api, fetchAllPages } from './client';
import type { InventoryResponse, ItemInventoryRequest } from './types';

/** 직원: 전체 물품 재고 */
export function fetchInventory(): Promise<InventoryResponse[]> {
  return fetchAllPages<InventoryResponse>('/api/admin/inventory');
}

export function createInventory(body: ItemInventoryRequest): Promise<InventoryResponse> {
  return api<InventoryResponse>('/api/admin/inventory', { method: 'POST', body });
}

export function updateInventoryQuantity(id: number, quantity: number): Promise<InventoryResponse> {
  return api<InventoryResponse>(`/api/admin/inventory/${id}`, { method: 'PATCH', body: { quantity } });
}
