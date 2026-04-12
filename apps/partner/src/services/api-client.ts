import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { ApiResponse } from '../types/api';
import { getApiBaseUrl } from '../config/env';

export type ClientRequestOptions = {
  timeoutMs?: number;
  idempotencyKey?: string;
   /** Skip 401 refresh + retry (e.g. auth endpoints). */
  skipAuthRefresh?: boolean;
  isMultipart?: boolean;
  headers?: Record<string, string>;
};

type AuthHandlers = {
  refresh: () => Promise<boolean>;
  onSessionInvalid: () => void;
};

let authHandlers: AuthHandlers | null = null;

export function registerApiAuthHandlers(handlers: AuthHandlers): void {
  authHandlers = handlers;
}

let refreshFlight: Promise<boolean> | null = null;

function singleFlightRefresh(): Promise<boolean> {
  if (!authHandlers) return Promise.resolve(false);
  if (!refreshFlight) {
    refreshFlight = authHandlers
      .refresh()
      .finally(() => {
        refreshFlight = null;
      });
  }
  return refreshFlight;
}

const READ_TIMEOUT_MS = 15_000;
const MUTATION_TIMEOUT_MS = 30_000;
const PAYMENT_TIMEOUT_MS = 60_000;

function defaultTimeoutFor(
  method: string,
  path: string
): number {
  const p = path.toLowerCase();
  if (
    p.includes('/payments') ||
    p.includes('process-order') ||
    p.includes('/cart/checkout') ||
    p.includes('/cart/verify-payment') ||
    p.includes('/bookings/extend')
  ) {
    return PAYMENT_TIMEOUT_MS;
  }
  if (method === 'GET' || method === 'HEAD') return READ_TIMEOUT_MS;
  return MUTATION_TIMEOUT_MS;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function shouldRetry(
  attempt: number,
  err: unknown,
  status?: number
): boolean {
  if (attempt >= 3) return false;
  if (status === 502 || status === 503 || status === 504 || status === 429) return true;
  if (err instanceof TypeError) return true;
  if (err instanceof DOMException && err.name === 'AbortError') return false;
  return false;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const ct = response.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  const text = await response.text();
  return text.length ? { raw: text } : null;
}

function generateRequestId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;
  private deviceId: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  setDeviceId(deviceId: string): void {
    this.deviceId = deviceId;
  }

  private getHeaders(isMultipart = false, extra?: Record<string, string>): Record<string, string> {
    const appVersion =
      Constants.expoConfig?.version ||
      (Constants as { nativeAppVersion?: string }).nativeAppVersion ||
      '1.0.0';

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-App-Version': String(appVersion),
      'X-Platform': Platform.OS === 'ios' ? 'ios' : 'android',
      'X-Request-ID': generateRequestId(),
      ...extra,
    };

    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    if (this.deviceId) {
      headers['X-Device-ID'] = this.deviceId;
    }

    return headers;
  }

  private async fetchOnce(
    url: string,
    init: RequestInit,
    timeoutMs: number
  ): Promise<Response> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(t);
    }
  }

  private async requestInner<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    body: unknown | undefined,
    opts: ClientRequestOptions
  ): Promise<ApiResponse<T>> {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${path}`;
    const timeoutMs = opts.timeoutMs ?? defaultTimeoutFor(method, path);
    const isMultipart = opts.isMultipart ?? false;

    const headers = this.getHeaders(isMultipart, {
      ...opts.headers,
      ...(opts.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : {}),
    });

    const init: RequestInit = { method, headers };

    if (body !== undefined && body !== null) {
      if (isMultipart) {
        init.body = body as FormData;
      } else {
        init.body = JSON.stringify(body);
      }
    }

    const skipRefresh =
      opts.skipAuthRefresh ||
      path.includes('/auth/refresh') ||
      path.includes('/auth/login') ||
      path.includes('/auth/verify');

    let attempt = 0;
    let lastErr: unknown;

    while (attempt < 4) {
      attempt += 1;
      try {
        const response = await this.fetchOnce(url, init, timeoutMs);
        const payload = (await parseResponseBody(response)) as Record<string, unknown> | null;

        if (response.status === 401 && !skipRefresh && authHandlers) {
          const ok = await singleFlightRefresh();
          if (ok) {
            const retryHeaders = this.getHeaders(isMultipart, {
              ...opts.headers,
              ...(opts.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : {}),
            });
            init.headers = retryHeaders;
            const retryResp = await this.fetchOnce(url, init, timeoutMs);
            const retryPayload = (await parseResponseBody(retryResp)) as Record<
              string,
              unknown
            > | null;
            return this.shapeResult<T>(retryResp, retryPayload);
          }
          authHandlers.onSessionInvalid();
          return this.errorResult<T>('UNAUTHORIZED', 'Session expired');
        }

        return this.shapeResult<T>(response, payload);
      } catch (e) {
        lastErr = e;
        if (!shouldRetry(attempt, e)) {
          return {
            success: false,
            error: {
              code: 'NETWORK_ERROR',
              message: e instanceof Error ? e.message : 'Network error',
            },
          };
        }
        const backoff = 400 * 2 ** (attempt - 1);
        const jitter = Math.floor(Math.random() * 200);
        await sleep(backoff + jitter);
      }
    }

    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: lastErr instanceof Error ? lastErr.message : 'Network error',
      },
    };
  }

  private shapeResult<T>(
    response: Response,
    payload: Record<string, unknown> | null
  ): ApiResponse<T> {
    const errObj = payload?.error as { code?: string; message?: string } | undefined;

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: errObj?.code || 'REQUEST_FAILED',
          message: errObj?.message || response.statusText || 'Request failed',
        },
      };
    }

    if (payload && typeof payload === 'object' && 'success' in payload) {
      const success = Boolean(payload.success);
      if (!success) {
        return {
          success: false,
          error: {
            code: errObj?.code || 'REQUEST_FAILED',
            message: errObj?.message || 'Request failed',
          },
        };
      }
      return payload as unknown as ApiResponse<T>;
    }

    return {
      success: true,
      data: payload as T,
    };
  }

  private errorResult<T>(code: string, message: string): ApiResponse<T> {
    return { success: false, error: { code, message } };
  }

  async get<T>(endpoint: string, opts: ClientRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.requestInner<T>(endpoint, 'GET', undefined, opts);
  }

  async post<T>(
    endpoint: string,
    body?: unknown,
    opts: ClientRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.requestInner<T>(endpoint, 'POST', body, opts);
  }

  async put<T>(
    endpoint: string,
    body?: unknown,
    opts: ClientRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.requestInner<T>(endpoint, 'PUT', body, opts);
  }

  async patch<T>(
    endpoint: string,
    body?: unknown,
    opts: ClientRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.requestInner<T>(endpoint, 'PATCH', body, opts);
  }

  async delete<T>(
    endpoint: string,
    body?: unknown,
    opts: ClientRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.requestInner<T>(endpoint, 'DELETE', body, opts);
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    return this.requestInner<T>(endpoint, 'POST', formData, { isMultipart: true });
  }
}

export const apiClient = new ApiClient(getApiBaseUrl());
