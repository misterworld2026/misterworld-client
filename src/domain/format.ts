/** '2027-03-01' → '3월 1일' */
export function md(iso: string): string {
  const p = iso.split('-').map(Number);
  return `${p[1]}월 ${p[2]}일`;
}

/** '2027-03-01' → '2027.03.01' */
export function ymd(iso: string): string {
  return iso.replace(/-/g, '.');
}

/** '3월 1일 - 3월 7일' */
export function range(start: string, end: string): string {
  return `${md(start)} - ${md(end)}`;
}

/** 1290000 → '1,290,000원' */
export function won(n: number | null | undefined): string {
  if (n == null) return '-';
  return n.toLocaleString('ko-KR') + '원';
}

/** BE LocalDateTime(UTC) → 'YYYY.MM.DD HH:mm' (KST) */
export function dateTimeKst(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  const k = new Date(d.getTime() + 9 * 3600000);
  return `${k.getUTCFullYear()}.${p(k.getUTCMonth() + 1)}.${p(k.getUTCDate())} ${p(k.getUTCHours())}:${p(k.getUTCMinutes())}`;
}
