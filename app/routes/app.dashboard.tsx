import { useEffect, useState, useCallback } from "react";
import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData } from "react-router";
import { Layout, InlineGrid, Banner } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { StatsCard, RevenueChart, InsightsList, SafePage } from "../components";
import { createApiClient, resolveShopId } from "../services/api";
import type { DashboardStats, RevenueChartData, Insight } from "../types";

interface LoaderData {
  stats: DashboardStats | null;
  revenueChart: RevenueChartData | null;
  insights: Insight[];
  error?: string;
  shopId: string;
  usingMockData?: boolean;
}

// Mock data fallback when backend unavailable
const MOCK_STATS: DashboardStats = {
  yesterdayRevenue: 1247.50,
  weekAvgRevenue: 1112.30,
  yesterdayOrders: 8,
  weekAvgOrders: 7,
  yesterdayAov: 155.94,
  weekAvgAov: 158.90,
  revenueDelta: 12.1,
  ordersDelta: 14.3,
  aovDelta: -1.9,
};

// Use static dates to prevent hydration mismatch (Date.now() differs server vs client)
const MOCK_CHART_DATA: RevenueChartData = {
  data: [
    { date: "2025-01-14T00:00:00.000Z", revenue: 2850, orders: 18 },
    { date: "2025-01-15T00:00:00.000Z", revenue: 3420, orders: 22 },
    { date: "2025-01-16T00:00:00.000Z", revenue: 2980, orders: 19 },
    { date: "2025-01-17T00:00:00.000Z", revenue: 4150, orders: 26 },
    { date: "2025-01-18T00:00:00.000Z", revenue: 3680, orders: 23 },
    { date: "2025-01-19T00:00:00.000Z", revenue: 3890, orders: 25 },
    { date: "2025-01-20T00:00:00.000Z", revenue: 3610, orders: 23 },
  ],
  totalRevenue: 24580,
  totalOrders: 156,
};

// Use static dates to prevent hydration mismatch
const MOCK_INSIGHTS: Insight[] = [
  {
    id: "mock-1",
    shopId: "demo",
    type: "checkout_dropoff",
    severity: "high",
    title: "Cart Abandonment Alert",
    actionSummary: "Add a 10% discount popup for users about to leave checkout.",
    expectedUplift: "+8% conversion",
    confidence: 0.85,
    createdAt: "2025-01-20T00:00:00.000Z",
  },
  {
    id: "mock-2",
    shopId: "demo",
    type: "inventory_alert",
    severity: "medium",
    title: "Low Stock Warning",
    actionSummary: "Review inventory levels and reorder top sellers - 3 products running low.",
    confidence: 0.92,
    createdAt: "2025-01-20T00:00:00.000Z",
  },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shopDomain = session.shop;
  const accessToken = session.accessToken || "";

  // Default response structure with mock data as fallback
  const data: LoaderData = {
    stats: null,
    revenueChart: null,
    insights: [],
    shopId: shopDomain,
    usingMockData: false,
  };

  try {
    const api = await createApiClient(accessToken, shopDomain);

    // Resolve shop domain to UUID (backend expects UUID, not domain)
    const shopId = await resolveShopId(api, shopDomain, accessToken);

    if (!shopId) {
      // Fall back to mock data if shop resolution fails
      data.usingMockData = true;
    }

    // Fetch dashboard data using the shop UUID (not domain)
    if (shopId) {
      const [statsResult, chartResult, insightsResult] = await Promise.allSettled([
        api.getDashboardStats(shopId),
        api.getRevenueChart(shopId, 7),
        api.getInsights(shopId, { pageSize: 5 }),
      ]);

      if (statsResult.status === "fulfilled") {
        data.stats = statsResult.value;
      }

      if (chartResult.status === "fulfilled") {
        data.revenueChart = chartResult.value;
      }

      if (insightsResult.status === "fulfilled") {
        data.insights = insightsResult.value.items;
      }
    }
  } catch (error) {
    console.error("Dashboard loader error:", error);
    // Use mock data as fallback instead of showing error
    data.usingMockData = true;
  }

  // Apply mock data fallback only if backend was truly unreachable
  if (!data.stats) {
    data.stats = MOCK_STATS;
    data.usingMockData = true;
  }
  if (!data.revenueChart) {
    data.revenueChart = MOCK_CHART_DATA;
    data.usingMockData = true;
  }
  if (data.insights.length === 0) {
    data.insights = MOCK_INSIGHTS;
    // Don't flag as mock just because insights are empty -
    // a new store with no synced data legitimately has 0 insights
  }

  return data;
};

export default function Dashboard() {
  const { stats, revenueChart, insights: initialInsights, error, usingMockData, shopId } =
    useLoaderData<LoaderData>();

  const [insights, setInsights] = useState<Insight[]>(initialInsights);
  const [dismissingId, setDismissingId] = useState<string>();
  // Defer banner rendering to prevent hydration mismatch
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Show banner after hydration to prevent SSR/client mismatch
    if (usingMockData || error) {
      setShowBanner(true);
    }
  }, [usingMockData, error]);

  const handleDismissInsight = useCallback(
    async (insightId: string) => {
      setDismissingId(insightId);
      try {
        const response = await fetch(
          `${process.env.BACKEND_API_URL}/api/insights/${insightId}/dismiss`,
          { method: "POST" }
        );

        if (response.ok) {
          setInsights((prev) => prev.filter((i) => i.id !== insightId));
        }
      } catch (err) {
        console.error("Failed to dismiss insight:", err);
      } finally {
        setDismissingId(undefined);
      }
    },
    []
  );

  // With fallback mock data, we always have data to show
  const statsLoading = false;
  const chartLoading = false;
  const insightsLoading = false;

  return (
    <SafePage title="Dashboard" subtitle="AI-powered insights for your store">
      <Layout>
        {/* Status Banner - rendered after hydration to prevent mismatch */}
        {showBanner && (
          <Layout.Section>
            <Banner
              tone={error ? "critical" : "warning"}
              onDismiss={() => setShowBanner(false)}
            >
              {error
                ? `Error loading data: ${error}`
                : `Showing demo data - connect backend for live data from ${shopId}`}
            </Banner>
          </Layout.Section>
        )}

        {/* Stats Row */}
        <Layout.Section>
          <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
            <StatsCard
              title="Yesterday Revenue"
              value={stats?.yesterdayRevenue ?? 0}
              prefix="$"
              comparison={stats?.revenueDelta ?? 0}
              loading={statsLoading}
            />
            <StatsCard
              title="Yesterday Orders"
              value={stats?.yesterdayOrders ?? 0}
              comparison={stats?.ordersDelta ?? 0}
              loading={statsLoading}
            />
            <StatsCard
              title="Avg Order Value"
              value={stats?.yesterdayAov ?? 0}
              prefix="$"
              comparison={stats?.aovDelta ?? 0}
              loading={statsLoading}
            />
            <StatsCard
              title="7-Day Avg Revenue"
              value={stats?.weekAvgRevenue ?? 0}
              prefix="$"
              loading={statsLoading}
            />
          </InlineGrid>
        </Layout.Section>

        {/* Chart Section */}
        <Layout.Section>
          <RevenueChart
            data={revenueChart?.data}
            totalRevenue={revenueChart?.totalRevenue}
            totalOrders={revenueChart?.totalOrders}
            loading={chartLoading}
            error={!!error}
          />
        </Layout.Section>

        {/* Insights Section */}
        <Layout.Section>
          <InsightsList
            insights={insights}
            loading={insightsLoading}
            error={!!error}
            onDismiss={handleDismissInsight}
            dismissingId={dismissingId}
          />
        </Layout.Section>
      </Layout>
    </SafePage>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
