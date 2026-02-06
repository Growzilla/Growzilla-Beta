#!/bin/bash
# Growzilla Beta - Local Development Setup
# This script prepares the local environment for testing against deployed backend

set -e

echo "🚀 Growzilla Beta - Local Development Setup"
echo "=========================================="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# Generate Prisma Client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run Prisma migrations for session storage
echo "🗄️  Running Prisma migrations..."
npx prisma migrate deploy

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Configuration:"
echo "   - Backend API: https://ecomdash-api.onrender.com"
echo "   - Test Store: testingground-9560.myshopify.com"
echo "   - Session Storage: SQLite (file:./dev.db)"
echo "   - Scopes: read_products, read_orders"
echo ""
echo "🎯 Next steps:"
echo "   1. Run: npm run dev"
echo "   2. Install app in test store via provided URL"
echo "   3. Test dashboard and insights"
echo ""
