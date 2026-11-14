// fetch 래퍼: Bearer 첨부, 401 시 refresh 1회(단일 비행), ResultDto 오류 변환.
// 토큰·개인정보는 절대 로그에 남기지 않는다.
import type { LoginResponse, PageData, ResultDto } from './types';

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '';
const REFRESH_KEY = 'mw.refresh';

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// ---- 토큰 보관: access는 메모리, refresh는 sessionStorage ----
let accessToken: string | null = null;

export const tokenStore = {
  get access() {
    return accessToken;
  },
  setPair(access: string, refresh: string) {
    accessToken = access;
    try {
      sessionStorage.setItem(REFRESH_KEY, refresh);
    } catch {
      /* 저장 불가 환경이면 메모리로만 동작 */
    }
  },
  get refresh(): string | null {
    try {
      return sessionStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  },
  clear() {
    accessToken = null;
    try {
      sessionStorage.removeItem(REFRESH_KEY);
    } catch {
      /* 무시 */
    }
  },
};

type Listener = () => void;
const sessionExpiredListeners: Listener[] = [];
/** refresh까지 실패해 세션이 끝났을 때(로그인 화면 이동용) */
export function onSessionExpired(fn: Listener) {
  sessionExpiredListeners.push(fn);
  return () => {
    const i = sessionExpiredListeners.indexOf(fn);
    if (i >= 0) sessionExpiredListeners.splice(i, 1);
  };
}

// ---- refresh 단일 비행 ----
let refreshing: Promise<LoginResponse | null> | null = null;

async function tryRefresh(): Promise<LoginResponse | null> {
  if (!refreshing) {
    refreshing = (async () => {
      const refresh = tokenStore.refresh;
      if (!refresh) return null;
      try {
        const res = await fetch(`${BASE}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refresh }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as LoginResponse;
        tokenStore.setPair(data.accessToken, data.refreshToken); // 회전된 refresh 저장
        return data;
      } catch {
        return null;
      } finally {
        setTimeout(() => {
          refreshing = null;
        }, 0);
      }
    })();
  }
  return refreshing;
}

/** 앱 시작 시 세션 복구: refresh 토큰이 있으면 새 토큰 쌍과 role을 받는다. */
export async function restoreSession(): Promise<LoginResponse | null> {
  return tryRefresh();
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const run = async (): Promise<Response> => {
    const headers: Record<string, string> = {};
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
    if (auth && accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    return fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  };

  let res = await run();

  if (res.status === 401 && auth) {
    const renewed = await tryRefresh();
    if (renewed) {
      res = await run();
    } else {
      tokenStore.clear();
      sessionExpiredListeners.forEach((fn) => fn());
    }
  }

  if (res.status === 204) return undefined as T;

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const err = (data ?? {}) as Partial<ResultDto>;
    throw new ApiError(res.status, err.code ?? 'UNKNOWN', err.message ?? '요청을 처리하지 못했습니다.');
  }
  return data as T;
}

/** Spring Data Page 직렬화를 구·신 형식 모두 같은 모양으로 맞춘다. */
export function normalizePage<T>(raw: unknown): PageData<T> {
  const r = raw as Record<string, unknown>;
  if (Array.isArray(raw)) {
    return { content: raw as T[], totalElements: raw.length, totalPages: 1, number: 0, size: raw.length };
  }
  const content = (r.content as T[]) ?? [];
  const meta = (r.page as Record<string, unknown>) ?? r;
  return {
    content,
    totalElements: Number(meta.totalElements ?? content.length),
    totalPages: Number(meta.totalPages ?? 1),
    number: Number(meta.number ?? 0),
    size: Number(meta.size ?? content.length),
  };
}

/** 목록 전 페이지 수집 (size 최대 100, 과제 규모 전제) */
export async function fetchAllPages<T>(pathWithQuery: string): Promise<T[]> {
  const sep = pathWithQuery.includes('?') ? '&' : '?';
  const first = normalizePage<T>(await api<unknown>(`${pathWithQuery}${sep}page=0&size=100`));
  const all = [...first.content];
  for (let p = 1; p < first.totalPages; p++) {
    const next = normalizePage<T>(await api<unknown>(`${pathWithQuery}${sep}page=${p}&size=100`));
    all.push(...next.content);
  }
  return all;
}
