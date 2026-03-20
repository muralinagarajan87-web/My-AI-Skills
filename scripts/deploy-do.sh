#!/bin/bash

# DigitalOcean Deployment Script
# Run this on your DigitalOcean Droplet

set -e

echo "🚀 Test Case Management Tool - DigitalOcean Deployment"
echo "======================================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: System Setup
echo -e "${YELLOW}[1/7] Updating system packages...${NC}"
apt-get update
apt-get upgrade -y
apt-get install -y docker.io docker-compose git curl wget certbot nginx

systemctl start docker
systemctl enable docker

echo -e "${GREEN}✅ System updated${NC}"

# Step 2: Clone Repository
echo -e "${YELLOW}[2/7] Cloning repository...${NC}"
cd /root

if [ -d "test-case-tool" ]; then
    cd test-case-tool
    git pull origin main
else
    echo "Enter GitHub repository URL:"
    read REPO_URL
    git clone $REPO_URL test-case-tool
    cd test-case-tool
fi

echo -e "${GREEN}✅ Repository ready${NC}"

# Step 3: Environment Setup
echo -e "${YELLOW}[3/7] Configuring environment...${NC}"

if [ ! -f .env ]; then
    echo "Enter your DigitalOcean PostgreSQL host:"
    read DB_HOST
    echo "Enter database password:"
    read -s DB_PASSWORD
    
    JWT_SECRET=$(openssl rand -base64 32)
    
    cat > .env << EOF
DB_HOST=$DB_HOST
DB_PORT=25060
DB_NAME=defaultdb
DB_USER=doadmin
DB_PASSWORD=$DB_PASSWORD
JWT_SECRET=$JWT_SECRET
PORT=5000
NODE_ENV=production
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
EOF
    
    echo "✅ .env created with your credentials"
else
    echo "⚠️  .env already exists, skipping..."
fi

mkdir -p uploads
chmod 755 uploads

echo -e "${GREEN}✅ Environment configured${NC}"

# Step 4: Start Services
echo -e "${YELLOW}[4/7] Starting Docker services...${NC}"
docker-compose up -d
sleep 15

echo -e "${GREEN}✅ Services started${NC}"

# Step 5: Database Migrations
echo -e "${YELLOW}[5/7] Running database migrations...${NC}"
docker-compose exec -T backend npm run migrate

echo -e "${GREEN}✅ Database ready${NC}"

# Step 6: SSL Setup
echo -e "${YELLOW}[6/7] Setting up SSL...${NC}"
echo "Enter your domain (e.g., test-case-tool.com):"
read DOMAIN

certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN

mkdir -p certbot/conf
cp -r /etc/letsencrypt/* certbot/conf/

# Update nginx.conf
echo "⚠️  Manual step: Edit nginx.conf with your domain and restart"
echo "    Uncomment HTTPS sections and set server_name to $DOMAIN"

echo -e "${GREEN}✅ SSL certificate obtained${NC}"

# Step 7: Firewall Setup
echo -e "${YELLOW}[7/7] Configuring firewall...${NC}"

if command -v ufw &> /dev/null; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw enable
    echo "✅ Firewall configured"
else
    echo "⚠️  UFW not available, please configure firewall manually"
fi

echo ""
echo -e "${GREEN}======================================================"
echo "✅ Deployment Complete!"
echo "======================================================${NC}"
echo ""
echo "📍 Next Steps:"
echo "1. Update nginx.conf with your domain"
echo "2. Run: docker-compose restart nginx"
echo "3. Point your domain DNS to: $HOSTNAME"
echo "4. Wait 5-30 minutes for DNS to propagate"
echo "5. Visit: https://your-domain.com"
echo ""
echo "🔧 Useful Commands:"
echo "   View logs:      docker-compose logs -f backend"
echo "   Stop services:  docker-compose down"
echo "   Restart all:    docker-compose restart"
echo ""
echo "💾 Backup database:"
echo "   docker-compose exec postgres pg_dump -U postgres test_case_tool > backup.sql"
echo ""
