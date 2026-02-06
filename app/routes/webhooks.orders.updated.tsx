import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

/**
 * Webhook handler for orders/updated
 * Forwards the webhook to the backend API for processing
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  try {
    const backendUrl = process.env.BACKEND_API_URL || "https://ecomdash-api.onrender.com";
    await fetch(`${backendUrl}/webhooks/orders/updated`, {
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
