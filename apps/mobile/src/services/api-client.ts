import { ApiResponse } from '../types/api';

const API_BASE_URL = __DEV__ ? 'http://localhost:8081' : 'https://api.subito.com';

interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  isMultipart?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;
  private deviceId: string | null = null;
  private appVersion = '1.0.0';

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  setDeviceId(deviceId: string) {
    this.deviceId = deviceId;
  }

  private getHeaders(isMultipart = false): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-App-Version': this.appVersion,
      'X-Request-ID': this.generateRequestId(),
    };

    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    if (this.deviceId) {
      headers['X-Device-ID'] = this.deviceId;
    }

    return headers;
  }

  private generateRequestId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private async request<T>(
    endpoint: string,
    config: RequestConfig
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      ...this.getHeaders(config.isMultipart),
      ...config.headers,
    };

    const options: RequestInit = {
      method: config.method,
      headers,
    };

    if (config.body) {
      if (config.isMultipart) {
        options.body = config.body as FormData;
      } else {
        options.body = JSON.stringify(config.body);
      }
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      if (response.status === 401) {
        // Token expired - trigger logout
        this.handleUnauthorized();
      }

      if (!response.ok) {
        return {
          success: false,
          data: null as T,
          error: {
            code: data.error?.code || 'REQUEST_FAILED',
            message: data.error?.message || 'Request failed',
          },
        };
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      return {
        success: false,
        data: null as T,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error',
        },
      };
    }
  }

  private handleUnauthorized() {
    // This will be connected to the auth store to trigger logout
    console.warn('Unauthorized - token expired');
  }

  // HTTP Methods
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  async delete<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE', body });
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      isMultipart: true,
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
