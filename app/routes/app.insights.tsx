/**
 * Insights Page
 * =============
 * AI-powered insights for store optimization.
 * Shows customer journey analysis, drop-off points, and conversion suggestions.
 */
import { useState, useCallback } from "react";
import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData } from "react-router";
import { Layout, Card, BlockStack, InlineStack, Text, Badge, Button, Box, ProgressBar, Banner } from "@shopify/polaris";
import { SafePage } from "../components";
import { formatNumber } from "../utils/format";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { createApiClient, resolveShopId } from "../services/api";
import type { Insight } from "../types";

interface LoaderData {
  insights: Insight[];
  journeyStats: {
    visitors: number;
    addedToCart: number;
    reachedCheckout: number;
    purchased: number;
  } | null;
  conversionGoal: {
    current: number;
    target: number;
    progress: number;
  } | null;
  error?: string;
  shopId: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const accessToken = session.accessToken || "";

  const data: LoaderData = {
    insights: [],
    journeyStats: null,
    conversionGoal: null,
    shopId: shopDomain,
  };

  try {
    const api = await createApiClient(accessToken, shopDomain);

    // Resolve shop domain to UUID (backend expects UUID, not domain)
    const shopId = await resolveShopId(api, shopDomain, accessToken);

    if (!shopId) {
      data.error = "Could not register shop with backend. Data sync may be pending.";
      return data;
    }

    const insightsResult = await api.getInsights(shopId, { pageSize: 10 });
    data.insights = insightsResult.items;
  } catch (error) {
    console.error("Insights loader error:", error);
    data.error = "Backend unavailable";
  }

  return data;
};

export default function Insights() {
  const { insights: initialInsights, journeyStats, conversionGoal, error } = useLoaderData<LoaderData>();
  const [insights, setInsights] = useState<Insight[]>(initialInsights);
  const [dismissingId, setDismissingId] = useState<string>();
  const [dismissedMessage, setDismissedMessage] = useState<string>();

  const handleDismissInsight = useCallback(
    async (insightId: string) => {
      setDismissingId(insightId);
      try {
        // Optimistically remove from UI
        setInsights((prev) => prev.filter((i) => i.id !== insightId));
        setDismissedMessage("Insight dismissed");
        // Auto-hide message after 3 seconds
        setTimeout(() => setDismissedMessage(undefined), 3000);
      } catch (err) {
        setDismissedMessage("Failed to dismiss insight");
      } finally {
        setDismissingId(undefined);
      }
    },
    []
  );

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return <Badge tone="critical">High Priority</Badge>;
      case "medium":
        return <Badge tone="warning">Medium</Badge>;
      case "low":
        return <Badge tone="success">Low</Badge>;
      default:
        return <Badge>Info</Badge>;
    }
  };

  return (
    <SafePage title="Insights" subtitle="AI-powered recommendations for your store">
      <Layout>
        {/* Error notice */}
        {error && (
          <Layout.Section>
            <Banner tone="warning">{error}</Banner>
          </Layout.Section>
        )}

        {/* Dismissed feedback */}
        {dismissedMessage && (
          <Layout.Section>
            <Banner tone="success" onDismiss={() => setDismissedMessage(undefined)}>{dismissedMessage}</Banner>
          </Layout.Section>
        )}

        {/* Conversion Goal Progress — only show if data available */}
        {conversionGoal && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">Conversion Goal Progress</Text>
                  <Badge tone="info">{`${conversionGoal.current}% / ${conversionGoal.target}% target`}</Badge>
                </InlineStack>
                <ProgressBar progress={conversionGoal.progress} tone="primary" size="small" />
                <Text as="p" variant="bodySm" tone="subdued">
                  You&apos;re {conversionGoal.progress}% of the way to your conversion rate goal. Keep optimizing!
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {/* Customer Journey Funnel — only show if data available */}
        {journeyStats && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Customer Journey Funnel</Text>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", height: "200px" }}>
                  {[
                    { label: "Visitors", value: journeyStats.visitors, percent: 100 },
                    { label: "Added to Cart", value: journeyStats.addedToCart, percent: Math.round((journeyStats.addedToCart / journeyStats.visitors) * 100) },
                    { label: "Reached Checkout", value: journeyStats.reachedCheckout, percent: Math.round((journeyStats.reachedCheckout / journeyStats.visitors) * 100) },
                    { label: "Purchased", value: journeyStats.purchased, percent: Math.round((journeyStats.purchased / journeyStats.visitors) * 100) },
                  ].map((stage, index, arr) => (
                    <div
                      key={stage.label}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <Text as="span" variant="bodySm" fontWeight="bold">
                        {formatNumber(stage.value)}
                      </Text>
                      <div
                        style={{
                          width: "100%",
                          height: `${stage.percent * 1.5}px`,
                          minHeight: "20px",
                          backgroundColor: index === arr.length - 1 ? "var(--p-color-bg-fill-success)" : "var(--p-color-bg-fill-brand)",
                          borderRadius: "4px 4px 0 0",
                          transition: "height 0.3s ease",
                        }}
                      />
                      <Text as="span" variant="bodySm" tone="subdued" alignment="center">
                        {stage.label}
                      </Text>
                      <Text as="span" variant="bodySm" tone={index === 0 ? "subdued" : stage.percent < 20 ? "critical" : "success"}>
                        {stage.percent}%
                      </Text>
                    </div>
                  ))}
                </div>
                <Box paddingBlockStart="200">
                  <Text as="p" variant="bodySm" tone="subdued">
                    Drop-off detected: {Math.round((journeyStats.addedToCart - journeyStats.reachedCheckout) / journeyStats.addedToCart * 100)}% abandon between cart and checkout
                  </Text>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {/* AI Insights List */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text as="h2" variant="headingMd">AI Insights</Text>
                <Text as="span" variant="bodySm" tone="subdued">{insights.length} active insights</Text>
              </InlineStack>

              {insights.length === 0 ? (
                <Box padding="400">
                  <Text as="p" tone="subdued" alignment="center">
                    No insights yet. Insights will be generated after your store data is synced and analyzed.
                  </Text>
                </Box>
              ) : (
                <BlockStack gap="300">
                  {insights.map((insight) => (
                    <Box
                      key={insight.id}
                      padding="400"
                      borderWidth="025"
                      borderRadius="200"
                      borderColor="border"
                      background="bg-surface-secondary"
                    >
                      <BlockStack gap="200">
                        <InlineStack align="space-between">
                          <InlineStack gap="200">
                            {getSeverityBadge(insight.severity)}
                            <Badge>{insight.type}</Badge>
                          </InlineStack>
                          <Button
                            variant="plain"
                            tone="critical"
                            onClick={() => handleDismissInsight(insight.id)}
                            loading={dismissingId === insight.id}
                          >
                            Dismiss
                          </Button>
                        </InlineStack>
                        <Text as="h3" variant="headingSm">{insight.title}</Text>
                        <Text as="p" variant="bodySm" tone="subdued">{insight.actionSummary}</Text>
                        {insight.expectedUplift && (
                          <Box paddingBlockStart="200" paddingInlineStart="300" borderInlineStartWidth="025" borderColor="border-brand">
                            <Text as="p" variant="bodySm">
                              <Text as="span" fontWeight="bold">Expected Impact: </Text>
                              {insight.expectedUplift} (Confidence: {Math.round(insight.confidence * 100)}%)
                            </Text>
                          </Box>
                        )}
                      </BlockStack>
                    </Box>
                  ))}
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </SafePage>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
