import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

/**
 * Webhook handler for inventory_levels/update
 * Forwards the webhook to the backend API for processing
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  try {
    const backendUrl = process.env.BACKEND_API_URL || "http://localhost:8000";
    await fetch(`${backendUrl}/webhooks/inventory/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Shop-Domain": shop,
        "X-Shopify-Topic": topic,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Failed to forward webhook to backend:", error);
  }

  return new Response();
};
