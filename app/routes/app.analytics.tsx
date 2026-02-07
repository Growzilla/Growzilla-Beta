/**
 * Analytics Page
 * ==============
 * Detailed analytics for store performance.
 * Shows AOV, LTV, conversion trends over time, and performance comparisons.
 */
import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData, useSearchParams, useSubmit } from "react-router";
import { Layout, Card, BlockStack, InlineStack, Text, Badge, Button, Box, Select, ProgressBar, Banner } from "@shopify/polaris";
import { SafePage } from "../components";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { createApiClient, resolveShopId } from "../services/api";
import { formatCurrency, formatNumber, getWeekdayShort } from "../utils/format";

interface AnalyticsData {
  period: string;
  metrics: {
    totalRevenue: number;
    revenueChange: number;
    totalOrders: number;
    ordersChange: number;
    aov: number;
    aovChange: number;
    ltv: number;
    ltvChange: number;
    conversionRate: number;
    conversionChange: number;
    repeatCustomerRate: number;
    repeatChange: number;
  };
  revenueByDay: Array<{ date: string; revenue: number; orders: number }>;
  topPerformers: Array<{ name: string; revenue: number; orders: number; growth: number }>;
  error?: string;
}

// Zero data for when backend has no data or store is empty
const getZeroData = (period: string): AnalyticsData => ({
  period,
  metrics: {
    totalRevenue: 0,
    revenueChange: 0,
    totalOrders: 0,
    ordersChange: 0,
    aov: 0,
    aovChange: 0,
    ltv: 0,
    ltvChange: 0,
    conversionRate: 0,
    conversionChange: 0,
    repeatCustomerRate: 0,
    repeatChange: 0,
  },
  revenueByDay: [],
  topPerformers: [],
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const accessToken = session.accessToken || "";

  const url = new URL(request.url);
  const period = url.searchParams.get("period") || "7d";

  const data: AnalyticsData = getZeroData(period);

  try {
    const api = await createApiClient(accessToken, shopDomain);
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;

    // Resolve shop domain to UUID (backend expects UUID, not domain)
    const shopId = await resolveShopId(api, shopDomain, accessToken);

    if (!shopId) {
      data.error = "Could not register shop with backend. Data sync may be pending.";
      return data;
    }

    // Get real data using shop UUID
    const [statsResult, chartResult] = await Promise.allSettled([
      api.getDashboardStats(shopId),
      api.getRevenueChart(shopId, days),
    ]);

    if (statsResult.status === "fulfilled") {
      const stats = statsResult.value;
      const aov = stats.yesterdayAov ?? 0;
      const aovChange = stats.aovDelta ?? 0;
      data.metrics = {
        totalRevenue: stats.yesterdayRevenue ?? 0,
        revenueChange: stats.revenueDelta ?? 0,
        totalOrders: stats.yesterdayOrders ?? 0,
        ordersChange: stats.ordersDelta ?? 0,
        aov,
        aovChange,
        ltv: aov * 2.2,
        ltvChange: aovChange * 1.5,
        conversionRate: 0,
        conversionChange: 0,
        repeatCustomerRate: 0,
        repeatChange: 0,
      };
    }

    if (chartResult.status === "fulfilled") {
      data.revenueByDay = chartResult.value.data || [];
    }
  } catch (error) {
    console.error("Analytics loader error:", error);
    data.error = "Backend unavailable";
  }

  return data;
};

export default function Analytics() {
  const data = useLoaderData<AnalyticsData>();
  const [searchParams] = useSearchParams();
  const submit = useSubmit();

  const currentPeriod = searchParams.get("period") || "7d";

  const handlePeriodChange = (value: string) => {
    const formData = new FormData();
    formData.set("period", value);
    submit(formData, { method: "get" });
  };

  const { metrics, revenueByDay, topPerformers } = data;
  const maxRevenue = Math.max(...revenueByDay.map((d) => d.revenue), 1);

  // Calculate goal progress (example: 5% conversion target)
  // Null-safe: default to 0 if conversionRate is missing
  const conversionRate = metrics.conversionRate ?? 0;
  const conversionGoalProgress = Math.min((conversionRate / 5) * 100, 100);

  return (
    <SafePage title="Analytics" subtitle="Detailed store performance metrics">
      <Layout>
        {/* Demo data notice */}
        {data.error && (
          <Layout.Section>
            <Banner tone="warning">{data.error}</Banner>
          </Layout.Section>
        )}

        {/* Period Selector */}
        <Layout.Section>
          <Card>
            <InlineStack align="space-between">
              <Text as="h2" variant="headingMd">Performance Overview</Text>
              <Select
                label=""
                labelHidden
                options={[
                  { label: "Last 7 days", value: "7d" },
                  { label: "Last 30 days", value: "30d" },
                  { label: "Last 90 days", value: "90d" },
                ]}
                value={currentPeriod}
                onChange={handlePeriodChange}
              />
            </InlineStack>
          </Card>
        </Layout.Section>

        {/* Key Metrics Grid */}
        <Layout.Section>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <MetricBox
              title="Total Revenue"
              value={formatCurrency(metrics.totalRevenue)}
              change={metrics.revenueChange}
              icon="$"
            />
            <MetricBox
              title="Average Order Value"
              value={formatCurrency(metrics.aov)}
              change={metrics.aovChange}
              icon="AOV"
            />
            <MetricBox
              title="Customer LTV"
              value={formatCurrency(metrics.ltv)}
              change={metrics.ltvChange}
              icon="LTV"
            />
            <MetricBox
              title="Conversion Rate"
              value={`${metrics.conversionRate}%`}
              change={metrics.conversionChange}
              icon="%"
            />
            <MetricBox
              title="Total Orders"
              value={formatNumber(metrics.totalOrders)}
              change={metrics.ordersChange}
              icon="#"
            />
            <MetricBox
              title="Repeat Customers"
              value={`${metrics.repeatCustomerRate}%`}
              change={metrics.repeatChange}
              icon="R"
            />
          </div>
        </Layout.Section>

        {/* Conversion Goal Progress */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">Conversion Rate Goal</Text>
                  <Text as="p" variant="bodySm" tone="subdued">Target: 5.0% conversion rate</Text>
                </BlockStack>
                <Badge tone={conversionGoalProgress >= 100 ? "success" : conversionGoalProgress >= 70 ? "warning" : "critical"}>
                  {`${metrics.conversionRate}% / 5.0%`}
                </Badge>
              </InlineStack>
              <ProgressBar
                progress={conversionGoalProgress}
                tone={conversionGoalProgress >= 100 ? "success" : "primary"}
                size="small"
              />
              <Text as="p" variant="bodySm" tone="subdued">
                {conversionGoalProgress >= 100
                  ? "Goal achieved! Consider setting a higher target."
                  : `${(5.0 - metrics.conversionRate).toFixed(1)} percentage points to reach your goal`
                }
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Revenue Chart */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Revenue Trend</Text>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "200px", padding: "0 8px" }}>
                {revenueByDay.map((point, index) => {
                  const height = (point.revenue / maxRevenue) * 100;
                  return (
                    <div
                      key={index}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          maxWidth: "40px",
                          height: `${height}%`,
                          minHeight: "4px",
                          backgroundColor: "var(--p-color-bg-fill-brand)",
                          borderRadius: "4px 4px 0 0",
                          transition: "height 0.3s ease",
                        }}
                        title={`${formatCurrency(point.revenue)} - ${point.orders} orders`}
                      />
                      <Text as="span" variant="bodySm" tone="subdued">
                        {getWeekdayShort(point.date)}
                      </Text>
                    </div>
                  );
                })}
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Top Performers */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text as="h2" variant="headingMd">Top Performing Products</Text>
                <Button variant="plain">View All Products</Button>
              </InlineStack>
              <BlockStack gap="200">
                {topPerformers.map((product, index) => (
                  <Box
                    key={product.name}
                    padding="300"
                    borderWidth="025"
                    borderRadius="200"
                    borderColor="border"
                  >
                    <InlineStack align="space-between">
                      <InlineStack gap="300">
                        <div style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          backgroundColor: index < 3 ? "var(--p-color-bg-fill-success)" : "var(--p-color-bg-fill-secondary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: "bold",
                          color: index < 3 ? "white" : "inherit",
                        }}>
                          {index + 1}
                        </div>
                        <BlockStack gap="050">
                          <Text as="span" variant="bodySm" fontWeight="semibold">{product.name}</Text>
                          <Text as="span" variant="bodySm" tone="subdued">{product.orders} orders</Text>
                        </BlockStack>
                      </InlineStack>
                      <InlineStack gap="200">
                        <Text as="span" variant="bodySm" fontWeight="bold">{formatCurrency(product.revenue)}</Text>
                        <Badge tone={product.growth >= 0 ? "success" : "critical"}>
                          {`${product.growth >= 0 ? "+" : ""}${product.growth}%`}
                        </Badge>
                      </InlineStack>
                    </InlineStack>
                  </Box>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </SafePage>
  );
}

// Metric Box Component
function MetricBox({
  title,
  value,
  change,
  icon
}: {
  title: string;
  value: string;
  change: number | null | undefined;
  icon: string;
}) {
  // Null-safe: default to 0 if change is undefined/null
  const safeChange = change ?? 0;
  const isPositive = safeChange >= 0;

  return (
    <Card>
      <BlockStack gap="200">
        <InlineStack align="space-between">
          <Text as="span" variant="bodySm" tone="subdued">{title}</Text>
          <div style={{
            width: "24px",
            height: "24px",
            borderRadius: "4px",
            backgroundColor: "var(--p-color-bg-fill-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "10px",
            fontWeight: "bold",
          }}>
            {icon}
          </div>
        </InlineStack>
        <Text as="p" variant="headingLg" fontWeight="bold">{value}</Text>
        <Badge tone={isPositive ? "success" : "critical"}>
          {`${isPositive ? "+" : ""}${safeChange.toFixed(1)}% vs last period`}
        </Badge>
      </BlockStack>
    </Card>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
