import apiClient from './axios';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  services: {
    database: 'connected' | 'disconnected' | 'connecting';
  };
}

export interface PingResponse {
  pong: boolean;
  ts: number;
}

export const healthApi = {
  check(): Promise<HealthResponse> {
    return apiClient.get<HealthResponse>('/health').then((r) => r.data);
  },

  ping(): Promise<PingResponse> {
    return apiClient.get<PingResponse>('/health/ping').then((r) => r.data);
  },
};
