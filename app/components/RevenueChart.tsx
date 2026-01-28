import { Box, Text, SkeletonDisplayText, Card, BlockStack } from "@shopify/polaris";
import { formatNumber, getWeekdayShort } from "../utils/format";

interface ChartDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

interface RevenueChartProps {
  data?: ChartDataPoint[];
  totalRevenue?: number;
  totalOrders?: number;
  loading?: boolean;
  error?: boolean;
}

export function RevenueChart({
  data = [],
  totalRevenue = 0,
  totalOrders = 0,
  loading = false,
  error = false,
}: RevenueChartProps) {
  if (loading) {
    return (
      <Card>
        <Box minHeight="200px" padding="400">
          <SkeletonDisplayText size="small" />
        </Box>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Box minHeight="200px" padding="400">
          <Text as="p" tone="critical">
            Failed to load chart data
          </Text>
        </Box>
      </Card>
    );
  }

  const chartData = data ?? [];
  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1);

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">
          Revenue Trend
        </Text>
        <Box minHeight="200px">
          <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "180px" }}>
            {chartData.map((point, index) => {
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
                      height: `${height}%`,
                      minHeight: "4px",
                      backgroundColor: "var(--p-color-bg-fill-brand)",
                      borderRadius: "4px 4px 0 0",
                      transition: "height 0.3s ease",
                    }}
                    title={`$${formatNumber(point.revenue)} - ${point.orders} orders`}
                  />
                  <Text as="span" variant="bodySm" tone="subdued">
                    {getWeekdayShort(point.date)}
                  </Text>
                </div>
              );
            })}
          </div>

          <Box paddingBlockStart="400">
            <Text as="p" variant="bodySm" tone="subdued" alignment="center">
              Total: ${formatNumber(totalRevenue ?? 0)} from {totalOrders ?? 0} orders
            </Text>
          </Box>
        </Box>
      </BlockStack>
    </Card>
  );
}
