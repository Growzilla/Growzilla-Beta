# GrowZilla Beta - Customer Onboarding

## For You (Internal): Adding a New Beta Customer

### Quick Add (30 seconds)

1. Get customer's Shopify store URL (e.g., `acme-store.myshopify.com`)
2. Send them this install link:

```
https://acme-store.myshopify.com/admin/oauth/authorize?client_id=02e4e67112ab0bf60bbd4de3afbff59e&scope=read_products,read_orders,read_customers,read_inventory,read_discounts,read_analytics&redirect_uri=https://growzilla-app.onrender.com/auth/callback
```

3. They click → approve → done

### Or Use Generic Install Link

If you have "Custom distribution" enabled in Partner Dashboard:

```
https://admin.shopify.com/oauth/install?client_id=02e4e67112ab0bf60bbd4de3afbff59e
```

Customer enters their store URL, then approves.

---

## For Customer: Installation Instructions

### What You'll Do (2 minutes)

1. **Click the install link** we sent you
2. **Review permissions** - we only request READ access:
   - ✅ Read products
   - ✅ Read orders
   - ✅ Read customers
   - ✅ Read inventory
   - ❌ No write access (we can't modify your store)
3. **Click "Install app"**
4. **You're done!** GrowZilla appears in your Shopify Admin sidebar

### What Happens Next

- Your store data syncs automatically (takes 5-15 minutes for initial sync)
- AI insights start generating within 24 hours
- Dashboard shows real-time analytics

### Need Help?

Contact: [your-support-email]

---

## FAQ

### Q: Do I need to create API keys?
**A: No.** The install link handles everything automatically.

### Q: Can the app modify my store?
**A: No.** We only have READ permissions. We cannot create, edit, or delete anything.

### Q: How do I get updates?
**A: Automatically.** When we release new features, they appear in your dashboard instantly.

### Q: How do I uninstall?
**A:** Shopify Admin → Settings → Apps → GrowZilla → Delete

---

## Technical Details (For Your Records)

| Item | Value |
|------|-------|
| App Name | GrowzillaBeta |
| Client ID | 02e4e67112ab0bf60bbd4de3afbff59e |
| Permissions | read_products, read_orders, read_customers, read_inventory, read_discounts, read_analytics |
| Data Access | Read-only |
| App Type | Embedded (appears in Shopify Admin) |
