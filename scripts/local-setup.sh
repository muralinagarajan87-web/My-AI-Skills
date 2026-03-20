#!/bin/bash

# Quick Start Script for Local Development
# This script sets up the entire application locally using Docker

set -e

echo "🚀 Test Case Management Tool - Local Setup"
echo "=========================================="

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose first."
    echo "   Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose found"

# Create .env file if not exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Edit .env file with your database credentials if needed"
else
    echo "✅ .env file already exists"
fi

# Create uploads directory
mkdir -p uploads
chmod 755 uploads

# Start services
echo "🔨 Starting Docker containers..."
docker-compose up -d

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check database connection
echo "🗄️  Testing database connection..."
docker-compose exec -T postgres psql -h localhost -U postgres -d test_case_tool -c "SELECT 1" || true

# Run migrations
echo "📊 Running database migrations..."
docker-compose exec -T backend npm run migrate

echo ""
echo "✅ Setup Complete!"
echo ""
echo "📍 Application URLs:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:5000/api"
echo "   Health:    http://localhost:5000/api/health"
echo ""
echo "👤 Default Credentials:"
echo "   Email:    test@example.com"
echo "   Password: test123 (set during signup)"
echo ""
echo "🛑 To stop: docker-compose down"
echo "📋 To view logs: docker-compose logs -f backend"
echo ""
echo "Happy Testing! 🎉"
