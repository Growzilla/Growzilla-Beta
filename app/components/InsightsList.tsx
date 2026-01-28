import {
  BlockStack,
  InlineStack,
  Text,
  Button,
  Badge,
  Box,
  SkeletonBodyText,
  Card,
} from "@shopify/polaris";
import type { Insight } from "../types";

const severityTones: Record<string, "critical" | "warning" | "attention" | "info"> = {
  critical: "critical",
  high: "warning",
  medium: "attention",
  low: "info",
};

interface InsightCardProps {
  insight: Insight;
  onDismiss: (id: string) => void;
  dismissLoading?: boolean;
}

function InsightCard({ insight, onDismiss, dismissLoading }: InsightCardProps) {
  return (
    <Box padding="300" borderRadius="200" background="bg-surface-secondary">
      <BlockStack gap="200">
        <InlineStack align="space-between">
          <Badge tone={severityTones[insight.severity] ?? "info"}>
            {insight.severity.toUpperCase()}
          </Badge>
          <Text as="span" variant="bodySm" tone="subdued">
            {insight.type.replace(/_/g, " ")}
          </Text>
        </InlineStack>

        <Text as="p" variant="bodyMd" fontWeight="semibold">
          {insight.title}
        </Text>

        <Text as="p" variant="bodySm" tone="subdued">
          {insight.actionSummary}
        </Text>

        {insight.expectedUplift && (
          <Text as="p" variant="bodySm" tone="success">
            Expected: {insight.expectedUplift}
          </Text>
        )}

        <InlineStack gap="200">
          {insight.adminDeepLink && (
            <Button
              size="slim"
              url={`https://admin.shopify.com${insight.adminDeepLink}`}
              target="_blank"
            >
              View in Shopify
            </Button>
          )}
          <Button
            size="slim"
            variant="plain"
            onClick={() => onDismiss(insight.id)}
            loading={dismissLoading}
          >
            Dismiss
          </Button>
        </InlineStack>
      </BlockStack>
    </Box>
  );
}

interface InsightsListProps {
  insights?: Insight[];
  loading?: boolean;
  error?: boolean;
  onDismiss: (id: string) => void;
  dismissingId?: string;
}

export function InsightsList({
  insights = [],
  loading = false,
  error = false,
  onDismiss,
  dismissingId,
}: InsightsListProps) {
  if (loading) {
    return (
      <Card>
        <BlockStack gap="300">
          {[1, 2, 3].map((i) => (
            <Box key={i} padding="300" background="bg-surface-secondary" borderRadius="200">
              <SkeletonBodyText lines={3} />
            </Box>
          ))}
        </BlockStack>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Text as="p" tone="critical">
          Failed to load insights
        </Text>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card>
        <Box padding="400" background="bg-surface-secondary" borderRadius="200">
          <Text as="p" alignment="center" tone="subdued">
            No active insights. Your store is running smoothly!
          </Text>
        </Box>
      </Card>
    );
  }

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">
          AI Insights
        </Text>
        <BlockStack gap="300">
          {insights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onDismiss={onDismiss}
              dismissLoading={dismissingId === insight.id}
            />
          ))}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}
