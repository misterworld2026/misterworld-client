// 상품 가격 표시 헬퍼. 금액 확정은 항상 BE 견적(/api/reservations/quote)이 기준이다.
import type { TravelProductResponse } from '@/api/types';
import type { Grade } from './status';

export function gradePrice(p: TravelProductResponse, g: Grade): number | null {
  return g === 'CLASSIC' ? p.classicPrice : g === 'GRAND' ? p.grandPrice : p.premiumPrice;
}

/** 판매 가능한 등급(BE allowedGrades 기준) 중 가장 낮은 1인 가격 */
export function startPrice(p: TravelProductResponse): number | null {
  const prices = p.allowedGrades.map((c) => c.price).filter((v): v is number => v != null);
  return prices.length ? Math.min(...prices) : null;
}

/** 테마의 여러 상품 중 최저 시작가 */
export function themeStartPrice(products: TravelProductResponse[], theme: string): number | null {
  const prices = products.filter((p) => p.theme === theme).map(startPrice).filter((v): v is number => v != null);
  return prices.length ? Math.min(...prices) : null;
}
