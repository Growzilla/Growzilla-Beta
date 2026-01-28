/**
 * App Index - Redirect to Dashboard
 * ==================================
 * Redirects the /app route to /app/dashboard where the actual dashboard lives.
 */
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Use redirect from authenticate.admin to preserve embedded app context
  const { redirect } = await authenticate.admin(request);
  return redirect("/app/dashboard");
};

export default function Index() {
  // This component won't render due to redirect in loader
  return null;
}
