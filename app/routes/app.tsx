/**
 * Growzilla Beta App Layout
 * =========================
 * Main application shell with responsive sidebar, header, and content area.
 * Styled with the Growzilla black/green design system.
 */

import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useLocation, useRouteError, Link } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import "@shopify/polaris/build/esm/styles.css";
import "../styles/growzilla.css";
import { useState, useEffect } from "react";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

// Navigation items - 4 pages for complete app experience
const navigationItems = [
  { label: "Dashboard", path: "/app/dashboard", icon: "dashboard" },
  { label: "Insights", path: "/app/insights", icon: "insights" },
  { label: "Analytics", path: "/app/analytics", icon: "analytics" },
  { label: "Settings", path: "/app/additional", icon: "settings" },
];

// Page titles
const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/app": { title: "Dashboard", subtitle: "AI-powered insights" },
  "/app/dashboard": { title: "Dashboard", subtitle: "AI-powered insights" },
  "/app/insights": { title: "Insights", subtitle: "Customer journey analysis" },
  "/app/analytics": { title: "Analytics", subtitle: "Store performance metrics" },
  "/app/additional": { title: "Settings", subtitle: "App configuration" },
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();
  const location = useLocation();
  const currentPath = location.pathname;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get current page meta
  const currentMeta = pageTitles[currentPath] || pageTitles["/app"];

  // Check if nav item is active
  const isActive = (path: string) => {
    if (path === "/app") {
      return currentPath === "/app" || currentPath === "/app/";
    }
    return currentPath === path || currentPath.startsWith(path + "/");
  };

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    document.body.style.overflow = "";
  }, [currentPath]);

  // Open mobile menu
  const openMobileMenu = () => {
    setMobileMenuOpen(true);
    document.body.style.overflow = "hidden";
  };

  // Close mobile menu
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    document.body.style.overflow = "";
  };

  return (
    <AppProvider embedded apiKey={apiKey}>
      <PolarisAppProvider i18n={enTranslations}>
        {/* Skip Link */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* App Layout */}
        <div className="app-layout">
          {/* Sidebar - Desktop */}
          <aside
            className={`app-sidebar ${sidebarCollapsed ? "app-sidebar--collapsed" : ""}`}
            aria-label="Main navigation"
          >
            {/* Collapse Toggle */}
            <button
              type="button"
              className="sidebar-collapse-toggle"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronIcon collapsed={sidebarCollapsed} />
            </button>

            {/* Logo */}
            <div className="sidebar-header">
              <div className="sidebar-logo">
                <GrowzillaLogoIcon />
              </div>
              <div className="sidebar-branding">
                <span className="sidebar-brand-name">Growzilla</span>
                <span className="sidebar-brand-tagline">Scale with power</span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
              <ul className="sidebar-nav-list" role="menubar">
                {navigationItems.map((item) => (
                  <li key={item.path} role="none">
                    <Link
                      to={item.path}
                      className={`sidebar-nav-item ${isActive(item.path) ? "sidebar-nav-item--active" : ""}`}
                      role="menuitem"
                      aria-current={isActive(item.path) ? "page" : undefined}
                    >
                      <NavIcon type={item.icon} />
                      <span className="sidebar-nav-label">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Footer */}
            <div className="sidebar-footer">
              <p className="sidebar-powered">Powered by Growzilla AI</p>
            </div>
          </aside>

          {/* Mobile Drawer */}
          <div
            className={`mobile-drawer-backdrop ${mobileMenuOpen ? "mobile-drawer-backdrop--open" : ""}`}
            onClick={closeMobileMenu}
            onKeyDown={(e) => e.key === "Escape" && closeMobileMenu()}
            role="button"
            tabIndex={mobileMenuOpen ? 0 : -1}
            aria-label="Close menu"
          />
          <div className={`mobile-drawer ${mobileMenuOpen ? "mobile-drawer--open" : ""}`}>
            <div className="mobile-drawer-header">
              <div className="sidebar-logo">
                <GrowzillaLogoIcon />
              </div>
              <span className="sidebar-brand-name">Growzilla</span>
              <button
                type="button"
                className="mobile-drawer-close"
                onClick={closeMobileMenu}
                aria-label="Close menu"
              >
                <CloseIcon />
              </button>
            </div>
            <nav className="mobile-drawer-nav">
              <ul>
                {navigationItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`mobile-drawer-item ${isActive(item.path) ? "mobile-drawer-item--active" : ""}`}
                      onClick={closeMobileMenu}
                    >
                      <NavIcon type={item.icon} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Main Content */}
          <main
            className={`app-main ${sidebarCollapsed ? "app-main--expanded" : ""}`}
            id="main-content"
          >
            {/* Header */}
            <header className="app-header">
              <div className="app-header-left">
                <button
                  type="button"
                  className="mobile-menu-button"
                  onClick={openMobileMenu}
                  aria-label="Open menu"
                >
                  <MenuIcon />
                </button>
                <div className="app-header-title">
                  <h1 className="page-title">{currentMeta.title}</h1>
                  <p className="page-subtitle">{currentMeta.subtitle}</p>
                </div>
              </div>

              <div className="app-header-right">
                {/* Search */}
                <div className="search-container">
                  <SearchIcon className="search-icon" />
                  <input
                    type="search"
                    className="search-input"
                    placeholder="Search..."
                    aria-label="Search"
                  />
                </div>

                {/* Upgrade */}
                <button type="button" className="upgrade-button">
                  <SparkleIcon />
                  <span>Upgrade</span>
                </button>
              </div>
            </header>

            {/* Content */}
            <div className="app-content">
              <Outlet />
            </div>
          </main>
        </div>
      </PolarisAppProvider>
    </AppProvider>
  );
}

// Shopify error boundary
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

/* ========================================
 * ICONS
 * ======================================== */

function GrowzillaLogoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function NavIcon({ type }: { type: string }) {
  switch (type) {
    case "dashboard":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="6" height="6" rx="1" />
          <rect x="11" y="3" width="6" height="6" rx="1" />
          <rect x="3" y="11" width="6" height="6" rx="1" />
          <rect x="11" y="11" width="6" height="6" rx="1" />
        </svg>
      );
    case "insights":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="10" r="7" />
          <path d="M10 6v4l2.5 2.5" />
          <circle cx="10" cy="10" r="1" fill="currentColor" />
        </svg>
      );
    case "analytics":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 17V9l4 4 4-6 6 3v7" />
          <polyline points="17 6 17 3 14 3" />
          <path d="M17 3l-6 6" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="10" r="2.5" />
          <path d="M10 3v1.5M10 15.5V17M17 10h-1.5M4.5 10H3M14.95 5.05l-1.06 1.06M6.11 13.89l-1.06 1.06M14.95 14.95l-1.06-1.06M6.11 6.11L5.05 5.05" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="10" cy="10" r="7" />
        </svg>
      );
  }
}

function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="6" />
      <path d="M13.5 13.5L17 17" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path d="M8 15l-1-3.5L3.5 10l3.5-1.5L8 5l1 3.5L12.5 10 9 11.5 8 15zM14.5 8l-.5-1.5L12.5 6l1.5-.5.5-1.5.5 1.5 1.5.5-1.5.5-.5 1.5z" />
    </svg>
  );
}
