/**
 * SafePage Component
 * ==================
 * A wrapper around Polaris Page that prevents hydration mismatch errors.
 *
 * The Polaris Page component with title/subtitle props can cause hydration
 * mismatches on small breakpoints because the server renders differently
 * than the client (GitHub Issue #11886).
 *
 * This wrapper renders the Page without title/subtitle on the server,
 * then adds them after hydration is complete on the client.
 */
import { Page, type PageProps } from "@shopify/polaris";
import { useState, useEffect } from "react";

export function SafePage(props: PageProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Render without title/subtitle on server to prevent hydration mismatch
  // Add them back after the component mounts on the client
  if (!mounted) {
    return <Page {...props} title={undefined} subtitle={undefined} />;
  }

  return <Page {...props} />;
}
