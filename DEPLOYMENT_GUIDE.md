# Growzilla Beta - Development & Deployment Guide

## Architecture Overview

```
                    Shopify Store
                         │
                         ▼
    ┌─────────────────────────────────────────┐
    │       GROWZILLA-BETA (Shopify App)      │
    │  - React Router + Polaris Components    │
    │  - Lightweight UI (No computation)      │
    │  - App Bridge for Shopify integration   │
    │  - Session storage via Prisma           │
    └─────────────────┬───────────────────────┘
                      │ REST API
                      ▼
    ┌─────────────────────────────────────────┐
    │         BACKEND (Render.com)            │
    │  - FastAPI + PostgreSQL + Redis         │
    │  - AI Analytics (DeepSeek/OpenAI)       │
    │  - Shopify GraphQL Client               │
    │  - All computation happens here         │
    └─────────────────────────────────────────┘
```

## Quick Start (10 minutes)

### 1. Backend Deployment on Render

```bash
# From project root
cd backend

# Create .env from template
cp .env.example .env
```

**Edit `.env` with your credentials:**
```bash
# Required - Get from Shopify Partners Dashboard
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_SCOPES=read_products,read_orders,read_customers,read_inventory,read_discounts,read_analytics

# Required - AI Provider (pick one)
OPENROUTER_API_KEY=sk-or-v1-xxx    # DeepSeek via OpenRouter (cheaper)
# OR
OPENAI_API_KEY=sk-xxx              # OpenAI direct

# Generate secure keys (32+ chars)
SECRET_KEY=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
```

**Deploy via Render Blueprint:**
```bash
# Option 1: CLI
render blueprint apply

# Option 2: Dashboard
# 1. Go to dashboard.render.com
# 2. New → Blueprint → Select repo → Apply
```

**Services created:**
- `ecomdash-api` - FastAPI backend ($7/mo)
- `ecomdash-worker` - Background jobs ($7/mo)
- `ecomdash-db` - PostgreSQL ($7/mo)
- `ecomdash-redis` - Redis (Free)

**Total: $21/month starter**

### 2. Growzilla-Beta Local Development

```bash
cd growzilla-beta

# Install dependencies
npm install

# Add Polaris for design components
npm install @shopify/polaris @shopify/polaris-icons

# Link to your Shopify app
npm run config:link

# Start development server
npm run dev
```

### 3. Connect to Backend

Create `growzilla-beta/.env`:
```bash
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SCOPES=read_products,read_orders,read_customers,read_inventory,read_discounts

# Backend API URL (update after Render deployment)
BACKEND_API_URL=https://ecomdash-api.onrender.com

# For local development
# BACKEND_API_URL=http://localhost:8000
```

---

## Required Shopify Scopes

Update `shopify.app.toml`:

```toml
[access_scopes]
scopes = "read_products,read_orders,read_customers,read_inventory,read_discounts,read_analytics"
```

| Scope | Purpose |
|-------|---------|
| `read_products` | Product catalog, inventory levels |
| `read_orders` | Sales data, revenue analytics |
| `read_customers` | Customer insights, LTV analysis |
| `read_inventory` | Stock levels, reorder alerts |
| `read_discounts` | Coupon usage analysis |
| `read_analytics` | Store performance metrics |

---

## Frontend Design Philosophy

**LIGHTWEIGHT UI ONLY - NO COMPUTATION**

The Shopify app (growzilla-beta) should:
- Display data received from backend API
- Handle user interactions (clicks, navigation)
- Use Polaris components for consistent Shopify UX
- Never perform calculations, aggregations, or AI inference

**All heavy lifting happens in the backend:**
- AI-powered insights generation
- Revenue/sales computations
- Product performance analysis
- Customer behavior patterns
- Inventory forecasting

---

## API Integration Pattern

```typescript
// growzilla-beta/app/services/api.ts

const BACKEND_URL = process.env.BACKEND_API_URL;

export async function fetchDashboard(shopId: string, accessToken: string) {
  const response = await fetch(`${BACKEND_URL}/api/dashboard/summary?shop_id=${shopId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Shopify-Access-Token': accessToken,
    },
  });
  return response.json();
}

export async function fetchInsights(shopId: string, accessToken: string) {
  const response = await fetch(`${BACKEND_URL}/api/insights?shop_id=${shopId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Shopify-Access-Token': accessToken,
    },
  });
  return response.json();
}
```

---

## Backend API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/shops` | POST | Register shop after OAuth |
| `/api/shops/{domain}` | GET | Get shop details |
| `/api/dashboard/summary` | GET | Full dashboard data |
| `/api/dashboard/stats` | GET | Quick stats (revenue, AOV) |
| `/api/dashboard/revenue-chart` | GET | Historical revenue |
| `/api/dashboard/top-products` | GET | Best sellers |
| `/api/insights` | GET | AI-generated insights |
| `/api/insights/{id}/dismiss` | POST | Dismiss insight |
| `/health` | GET | Health check |

---

## Deployment Checklist

### Backend (Render)
- [ ] Clone repo and push to GitHub
- [ ] Create Render account
- [ ] Apply blueprint (`render blueprint apply`)
- [ ] Set environment variables in Render dashboard
- [ ] Verify health check: `curl https://ecomdash-api.onrender.com/health`
- [ ] Check logs: `render logs ecomdash-api --tail`

### Shopify App (growzilla-beta)
- [ ] Update `shopify.app.toml` with correct scopes
- [ ] Run `npm run config:link` to connect to Partners
- [ ] Set `BACKEND_API_URL` in `.env`
- [ ] Test locally: `npm run dev`
- [ ] Install on development store
- [ ] Verify OAuth flow completes
- [ ] Deploy: `npm run deploy`

---

## Testing Flow

1. **Start Backend Locally** (optional for testing):
   ```bash
   cd backend
   docker-compose up -d
   # API at http://localhost:8000
   ```

2. **Start Shopify App**:
   ```bash
   cd growzilla-beta
   npm run dev
   # Opens ngrok tunnel automatically
   ```

3. **Install on Dev Store**:
   - Go to Shopify Partners → Apps → Your App
   - Click "Select store" → Choose dev store
   - Complete OAuth flow

4. **Verify Integration**:
   - Check backend logs for incoming requests
   - Verify shop registered in database
   - Test dashboard data loading

---

## Scaling Guide

| Traffic | Backend Plan | Cost |
|---------|-------------|------|
| 1-100 shops | Starter | $21/mo |
| 100-1K shops | Standard (auto-scale 1-3) | $80/mo |
| 1K-10K shops | Pro (auto-scale 3-10) | $485/mo |

Auto-scaling is pre-configured in `render.yaml`.

---

## Troubleshooting

### CORS Errors
Add your Shopify app URL to `ALLOWED_ORIGINS` in backend `.env`:
```bash
ALLOWED_ORIGINS=http://localhost:3000,https://admin.shopify.com,https://your-app.shopify.com
```

### OAuth Callback Fails
Ensure redirect URLs match exactly in:
1. `shopify.app.toml` → `auth.redirect_urls`
2. Shopify Partners Dashboard → App Setup → URLs

### Backend Not Responding
```bash
# Check health
curl https://ecomdash-api.onrender.com/health

# View logs
render logs ecomdash-api --tail

# Force redeploy
render deploy ecomdash-api
```

### Database Connection Issues
```bash
# Verify DATABASE_URL is set
render env list ecomdash-api | grep DATABASE_URL

# Test connection
render psql ecomdash-db -c "SELECT 1;"
```
