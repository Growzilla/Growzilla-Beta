# GrowZilla Beta - Production Deployment Guide

## Architecture Overview

```
GitHub (growzilla-beta)
        │
        │ push to main
        ▼
   Render.com ──────────────────────▶ https://growzilla.onrender.com
   (auto-deploy)                              │
                                              │ OAuth Install
        ┌─────────────────┬───────────────────┼───────────────────┬─────────────────┐
        ▼                 ▼                   ▼                   ▼                 ▼
    Store A           Store B             Store C             Store D           Store N
    (Beta)            (Beta)              (Beta)              (Beta)            (Future)
```

## Why This Architecture?

| Feature | Custom App (Current) | OAuth App (Target) |
|---------|---------------------|-------------------|
| Install process | Manual API keys per store | One-click install link |
| Updates | Manual per store | Push to GitHub → all stores updated |
| Multi-tenant | No (fork per customer) | Yes (single deployment) |
| Scalability | Poor | Excellent |
| Dev server required | Yes (`shopify app dev`) | No (always live) |

---

## Step 1: Create Render Web Service

### 1.1 Connect GitHub Repository

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repo: `EcomDashQ1BetaCohort/growzilla-beta`
3. Configure:
   - **Name**: `growzilla-app`
   - **Region**: Oregon (closest to most US customers)
   - **Branch**: `main`
   - **Root Directory**: `growzilla-beta` (if in monorepo)
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`

### 1.2 Environment Variables

Set these in Render Dashboard → Environment:

```env
# Shopify App Credentials (from Partner Dashboard)
SHOPIFY_API_KEY=02e4e67112ab0bf60bbd4de3afbff59e
SHOPIFY_API_SECRET=<your-api-secret-from-partner-dashboard>

# Your Backend API
BACKEND_API_URL=https://ecomdash-api.onrender.com

# App URL (your Render URL)
SHOPIFY_APP_URL=https://growzilla-app.onrender.com

# Session storage (use Redis for production)
# For now, memory is fine for beta
NODE_ENV=production
```

### 1.3 Get Your Deployed URL

After first deploy, Render gives you: `https://growzilla-app.onrender.com`

---

## Step 2: Update Shopify Partner Dashboard

1. Go to [partners.shopify.com](https://partners.shopify.com)
2. Apps → GrowzillaBeta → Configuration
3. Update URLs:

| Field | Value |
|-------|-------|
| App URL | `https://growzilla-app.onrender.com` |
| Allowed redirection URL(s) | `https://growzilla-app.onrender.com/auth/callback` |
| Preferences URL | `https://growzilla-app.onrender.com/app` |
| GDPR URLs | `https://growzilla-app.onrender.com/webhooks/...` |

4. **Important**: Disable "Automatically update URLs on dev" in CLI config

---

## Step 3: Update shopify.app.toml for Production

```toml
client_id = "02e4e67112ab0bf60bbd4de3afbff59e"
name = "GrowzillaBeta"
application_url = "https://growzilla-app.onrender.com"
embedded = true

[build]
automatically_update_urls_on_dev = false  # IMPORTANT: disable for production
include_config_on_deploy = true

[webhooks]
api_version = "2026-04"

  [[webhooks.subscriptions]]
  topics = [ "app/scopes_update" ]
  uri = "/webhooks/app/scopes_update"

  [[webhooks.subscriptions]]
  topics = [ "app/uninstalled" ]
  uri = "/webhooks/app/uninstalled"

  [[webhooks.subscriptions]]
  topics = [ "orders/create" ]
  uri = "/webhooks/orders/create"

  [[webhooks.subscriptions]]
  topics = [ "orders/updated" ]
  uri = "/webhooks/orders/updated"

[access_scopes]
scopes = "read_products,read_orders,read_customers,read_inventory,read_discounts,read_analytics"

[auth]
redirect_urls = [ "https://growzilla-app.onrender.com/auth/callback" ]
```

---

## Step 4: Deploy Configuration to Shopify

```bash
cd growzilla-beta
shopify app deploy
```

This syncs your `shopify.app.toml` with Shopify Partner Dashboard.

---

## Step 5: Generate Beta Install Link

### Option A: Unlisted App (Recommended for Beta)

1. In Partner Dashboard → App Setup → Distribution
2. Select "Custom distribution" or "Single-merchant install link"
3. Get install link: `https://admin.shopify.com/oauth/install?client_id=02e4e67112ab0bf60bbd4de3afbff59e`

### Option B: Direct Install Link Format

```
https://{store-name}.myshopify.com/admin/oauth/authorize?client_id=02e4e67112ab0bf60bbd4de3afbff59e&scope=read_products,read_orders,read_customers,read_inventory,read_discounts,read_analytics&redirect_uri=https://growzilla-app.onrender.com/auth/callback
```

---

## Customer Onboarding Flow (Final)

### What Customer Does (2 minutes):

1. **Click install link** you provide
2. **Approve permissions** (read-only, no write access)
3. **Done** - App appears in their Shopify Admin sidebar

### What Happens Behind the Scenes:

1. Shopify OAuth flow authenticates the store
2. Your app receives access token
3. Backend registers the shop in your database
4. Webhooks start syncing order/product data
5. Customer sees their dashboard with live data

### No Manual Steps Required:
- ❌ No API key generation
- ❌ No custom app creation
- ❌ No configuration copying
- ❌ No dev server running

---

## Iteration Workflow (Push Updates)

```bash
# Make changes locally
git add .
git commit -m "feat: add new insight type"
git push origin main

# Render auto-deploys in ~2-3 minutes
# All connected stores automatically get the update
```

### Rollback if Needed:

```bash
# In Render Dashboard → Deploys → select previous deploy → "Rollback"
# Or via git:
git revert HEAD
git push origin main
```

---

## Multi-Store Architecture

Your app is **multi-tenant by design**:

```
┌─────────────────────────────────────────┐
│           growzilla-app                 │
│         (single deployment)             │
├─────────────────────────────────────────┤
│  Request: store-a.myshopify.com         │
│     → Session lookup → Store A data     │
│                                         │
│  Request: store-b.myshopify.com         │
│     → Session lookup → Store B data     │
│                                         │
│  Request: store-c.myshopify.com         │
│     → Session lookup → Store C data     │
└─────────────────────────────────────────┘
```

The Shopify session middleware automatically handles multi-tenancy.

---

## Checklist Before Going Live

- [ ] Render deployment working
- [ ] Environment variables set
- [ ] Partner Dashboard URLs updated
- [ ] `shopify app deploy` run successfully
- [ ] Install link tested on dev store
- [ ] Backend API accessible from Render
- [ ] Webhooks receiving data
- [ ] Session storage configured (Redis for production)

---

## Quick Reference

| Task | Command/Action |
|------|----------------|
| Local dev | `npm run dev` (for development only) |
| Deploy | `git push origin main` (auto-deploys) |
| Sync config | `shopify app deploy` |
| View logs | Render Dashboard → Logs |
| Add beta customer | Send install link |
| Update all stores | Push to main branch |
