import { useEffect, useState, useCallback } from "react";
import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData } from "react-router";
import { Layout, InlineGrid, Banner, Card, Text, BlockStack } from "@shopify/polaris";
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
  backendDown?: boolean;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shopDomain = session.shop;
  const accessToken = session.accessToken || "";

  const data: LoaderData = {
    stats: null,
    revenueChart: null,
    insights: [],
    shopId: shopDomain,
    backendDown: false,
  };

  try {
    const api = await createApiClient(accessToken, shopDomain);

    // Resolve shop domain to UUID (backend expects UUID, not domain)
    const shopId = await resolveShopId(api, shopDomain, accessToken);

    if (!shopId) {
      data.error = "Could not register shop with backend. Data sync may be pending.";
      return data;
    }

    // Fetch dashboard data using the shop UUID (not domain)
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
  } catch (error) {
    console.error("Dashboard loader error:", error);
    data.backendDown = true;
    data.error = "Backend unavailable — showing cached or empty data";
  }

  return data;
};

export default function Dashboard() {
  const { stats, revenueChart, insights: initialInsights, error, backendDown, shopId } =
    useLoaderData<LoaderData>();

  const [insights, setInsights] = useState<Insight[]>(initialInsights);
  const [dismissingId, setDismissingId] = useState<string>();
  // Defer banner rendering to prevent hydration mismatch
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (error || backendDown) {
      setShowBanner(true);
    }
  }, [error, backendDown]);

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

  const statsLoading = false;
  const chartLoading = false;
  const insightsLoading = false;

  // Use real data (which may be zeros for an empty store)
  const displayStats = stats;
  const displayChart = revenueChart;

  return (
    <SafePage title="Dashboard" subtitle="AI-powered insights for your store">
      <Layout>
        {/* Status Banner - only for actual errors */}
        {showBanner && (
          <Layout.Section>
            <Banner
              tone={backendDown ? "critical" : "warning"}
              onDismiss={() => setShowBanner(false)}
            >
              {error || "Loading data..."}
            </Banner>
          </Layout.Section>
        )}

        {/* Stats Row */}
        <Layout.Section>
          <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
            <StatsCard
              title="Yesterday Revenue"
              value={displayStats?.yesterdayRevenue ?? 0}
              prefix="$"
              comparison={displayStats?.revenueDelta ?? 0}
              loading={statsLoading}
            />
            <StatsCard
              title="Yesterday Orders"
              value={displayStats?.yesterdayOrders ?? 0}
              comparison={displayStats?.ordersDelta ?? 0}
              loading={statsLoading}
            />
            <StatsCard
              title="Avg Order Value"
              value={displayStats?.yesterdayAov ?? 0}
              prefix="$"
              comparison={displayStats?.aovDelta ?? 0}
              loading={statsLoading}
            />
            <StatsCard
              title="7-Day Avg Revenue"
              value={displayStats?.weekAvgRevenue ?? 0}
              prefix="$"
              loading={statsLoading}
            />
          </InlineGrid>
        </Layout.Section>

        {/* Chart Section */}
        <Layout.Section>
          {displayChart && displayChart.data && displayChart.data.length > 0 ? (
            <RevenueChart
              data={displayChart.data}
              totalRevenue={displayChart.totalRevenue}
              totalOrders={displayChart.totalOrders}
              loading={chartLoading}
              error={!!backendDown}
            />
          ) : (
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">Revenue Chart</Text>
                <Text as="p" tone="subdued">
                  No revenue data yet. Data will appear here after your first orders are synced.
                </Text>
              </BlockStack>
            </Card>
          )}
        </Layout.Section>

        {/* Insights Section */}
        <Layout.Section>
          {insights.length > 0 ? (
            <InsightsList
              insights={insights}
              loading={insightsLoading}
              error={!!backendDown}
              onDismiss={handleDismissInsight}
              dismissingId={dismissingId}
            />
          ) : (
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">AI Insights</Text>
                <Text as="p" tone="subdued">
                  No insights yet. Insights will be generated after your store data is synced.
                </Text>
              </BlockStack>
            </Card>
          )}
        </Layout.Section>
      </Layout>
    </SafePage>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
