/**
 * Backend API Service for Growzilla Beta
 * =======================================
 *
 * This service handles all communication with the FastAPI backend.
 * Features:
 * - Health check validation
 * - Request timeout handling (10s default)
 * - Retry with exponential backoff (3 attempts)
 * - Graceful fallback on failures
 *
 * Backend URLs:
 * - Primary API: https://ecomdash-api.onrender.com
 * - App Backend: https://ecomdash-app.onrender.com
 * - Frontend: https://ecomdash-frontend.onrender.com
 */

import type {
  DashboardStats,
  RevenueChartData,
  InsightsResponse,
  TopProduct,
  Shop,
  Insight,
} from "../types";

// Backend API URL - set via environment variable
const BACKEND_URL = typeof process !== "undefined"
  ? process.env.BACKEND_API_URL || "https://ecomdash-api.onrender.com"
  : "https://ecomdash-api.onrender.com";

// Configuration constants
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s
const HEALTH_CHECK_CACHE_MS = 60000; // Cache health status for 1 minute

interface ApiConfig {
  shopId: string;
  accessToken: string;
}

interface HealthStatus {
  healthy: boolean;
  version: string;
  timestamp: Date;
  error?: string;
}

// Cache for health check status
let healthCache: HealthStatus | null = null;

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class ApiClient {
  private baseUrl: string;
  private config: ApiConfig | null = null;

  constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  configure(config: ApiConfig) {
    this.config = config;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (this.config?.accessToken) {
      headers["Authorization"] = `Bearer ${this.config.accessToken}`;
      headers["X-Shopify-Access-Token"] = this.config.accessToken;
    }

    return headers;
  }

  /**
   * Check if backend is healthy
   * Returns cached result if still valid
   */
  async checkHealth(): Promise<HealthStatus> {
    // Return cached result if still valid
    if (healthCache && (Date.now() - healthCache.timestamp.getTime()) < HEALTH_CHECK_CACHE_MS) {
      return healthCache;
    }

    try {
      const response = await fetchWithTimeout(
        `${this.baseUrl}/health`,
        { method: "GET" },
        5000 // 5 second timeout for health check
      );

      if (response.ok) {
        const data = await response.json();
        healthCache = {
          healthy: data.status === "healthy",
          version: data.version || "unknown",
          timestamp: new Date(),
        };
      } else {
        healthCache = {
          healthy: false,
          version: "unknown",
          timestamp: new Date(),
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      healthCache = {
        healthy: false,
        version: "unknown",
        timestamp: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    return healthCache;
  }

  /**
   * Make API request with retry logic
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetchWithTimeout(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(error.detail || `API error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      // Check if we should retry
      if (retryCount < MAX_RETRIES) {
        const isRetryable =
          error instanceof Error &&
          (error.name === "AbortError" || // Timeout
            error.message.includes("fetch") || // Network error
            error.message.includes("5")); // 5xx errors

        if (isRetryable) {
          console.warn(
            `API request failed, retrying (${retryCount + 1}/${MAX_RETRIES}):`,
            endpoint
          );
          await sleep(RETRY_DELAYS[retryCount]);
          return this.request<T>(endpoint, options, retryCount + 1);
        }
      }

      // Log error and rethrow
      console.error(`API request failed after ${retryCount} retries:`, endpoint, error);
      throw error;
    }
  }

  /**
   * Safe request that returns null on failure instead of throwing
   */
  private async safeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T | null> {
    try {
      return await this.request<T>(endpoint, options);
    } catch {
      return null;
    }
  }

  // Shop endpoints
  async registerShop(domain: string, accessToken: string, scopes: string): Promise<Shop> {
    return this.request<Shop>("/api/shops", {
      method: "POST",
      body: JSON.stringify({ domain, access_token: accessToken, scopes }),
    });
  }

  async getShop(domain: string): Promise<Shop> {
    return this.request<Shop>(`/api/shops/${domain}`);
  }

  async syncShop(shopId: string): Promise<{ status: string }> {
    return this.request<{ status: string }>(`/api/shops/${shopId}/sync`, {
      method: "POST",
    });
  }

  // Dashboard endpoints
  async getDashboardStats(shopId: string): Promise<DashboardStats> {
    return this.request<DashboardStats>(`/api/dashboard/stats?shop_id=${shopId}`);
  }

  async getRevenueChart(shopId: string, days: number = 7): Promise<RevenueChartData> {
    return this.request<RevenueChartData>(
      `/api/dashboard/revenue-chart?shop_id=${shopId}&days=${days}`
    );
  }

  async getTopProducts(shopId: string, limit: number = 5): Promise<TopProduct[]> {
    return this.request<TopProduct[]>(
      `/api/dashboard/top-products?shop_id=${shopId}&limit=${limit}`
    );
  }

  async getDashboardSummary(shopId: string): Promise<{
    stats: DashboardStats;
    revenueChart: RevenueChartData;
    topProducts: TopProduct[];
  }> {
    return this.request(`/api/dashboard/summary?shop_id=${shopId}`);
  }

  // Insights endpoints
  async getInsights(
    shopId: string,
    params?: {
      page?: number;
      pageSize?: number;
      type?: string;
      severity?: string;
      includeDismissed?: boolean;
    }
  ): Promise<InsightsResponse> {
    const searchParams = new URLSearchParams({ shop_id: shopId });

    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.pageSize) searchParams.set("page_size", String(params.pageSize));
    if (params?.type) searchParams.set("type", params.type);
    if (params?.severity) searchParams.set("severity", params.severity);
    if (params?.includeDismissed) searchParams.set("include_dismissed", "true");

    return this.request<InsightsResponse>(`/api/insights?${searchParams}`);
  }

  async getInsight(insightId: string): Promise<Insight> {
    return this.request<Insight>(`/api/insights/${insightId}`);
  }

  async dismissInsight(insightId: string): Promise<Insight> {
    return this.request<Insight>(`/api/insights/${insightId}/dismiss`, {
      method: "POST",
    });
  }

  async actionInsight(insightId: string): Promise<Insight> {
    return this.request<Insight>(`/api/insights/${insightId}/action`, {
      method: "POST",
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; version: string }> {
    return this.request<{ status: string; version: string }>("/health");
  }
}

// Singleton instance
export const api = new ApiClient();

// Server-side loader helper with health check
export async function createApiClient(
  accessToken: string,
  shopId: string
): Promise<ApiClient> {
  const client = new ApiClient(BACKEND_URL);
  client.configure({ accessToken, shopId });

  // Perform health check (non-blocking, logs warning if unhealthy)
  const health = await client.checkHealth();
  if (!health.healthy) {
    console.warn(`Backend health check failed: ${health.error || "unknown"}`);
  }

  return client;
}

/**
 * Resolve shop domain to UUID
 * Backend expects UUID for shop_id parameters, not domain strings.
 * This helper gets or registers a shop and returns its UUID.
 *
 * @param client - Configured API client
 * @param shopDomain - The shop's myshopify.com domain
 * @param accessToken - Shopify access token for registration
 * @returns Shop UUID or null if resolution fails
 */
export async function resolveShopId(
  client: ApiClient,
  shopDomain: string,
  accessToken: string
): Promise<string | null> {
  try {
    // Try to get existing shop
    const shop = await client.getShop(shopDomain);
    return shop.id;
  } catch {
    // Shop not registered - try to register it
    try {
      const scopes = process.env.SCOPES || "read_products,read_orders";
      const newShop = await client.registerShop(shopDomain, accessToken, scopes);
      return newShop.id;
    } catch (regError) {
      console.error("Failed to resolve shop ID:", regError);
      return null;
    }
  }
}

// Export for external health monitoring
export async function getBackendHealth(): Promise<HealthStatus> {
  const client = new ApiClient(BACKEND_URL);
  return client.checkHealth();
}

// Export configuration constants for reference
export const API_CONFIG = {
  BACKEND_URL,
  REQUEST_TIMEOUT_MS,
  MAX_RETRIES,
  HEALTH_CHECK_CACHE_MS,
} as const;

// Export types for convenience
export type { ApiConfig, HealthStatus };
