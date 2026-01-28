export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  conversionRate: number;
  revenueChange: number;
  ordersChange: number;
  aovChange: number;
  conversionChange: number;
}

export interface ChartDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface RevenueChartData {
  data: ChartDataPoint[];
  totalRevenue: number;
  totalOrders: number;
}

export interface Insight {
  id: string;
  shopId: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  actionSummary: string;
  expectedUplift?: string;
  confidence: number;
  payload?: Record<string, unknown>;
  adminDeepLink?: string;
  dismissedAt?: string;
  actionedAt?: string;
  createdAt: string;
  expiresAt?: string;
}

export type InsightType =
  | "traffic_sales_mismatch"
  | "understocked_winner"
  | "overstock_slow_mover"
  | "coupon_cannibalization"
  | "checkout_dropoff"
  | "pricing_opportunity"
  | "inventory_alert"
  | "trend_detection";

export type InsightSeverity = "critical" | "high" | "medium" | "low";

export interface InsightsResponse {
  items: Insight[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TopProduct {
  id: string;
  title: string;
  handle: string;
  revenue: number;
  unitsSold: number;
  imageUrl?: string;
}

export interface Shop {
  id: string;
  domain: string;
  deepModeEnabled: boolean;
  lastSyncAt?: string;
  syncStatus: "pending" | "syncing" | "completed" | "failed";
  createdAt: string;
}
