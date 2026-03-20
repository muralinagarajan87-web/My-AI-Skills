# Deployment Guide - DigitalOcean

This guide will help you deploy your Test Case Management Tool to DigitalOcean with a custom domain.

## Prerequisites

- DigitalOcean account (get $200 free credit)
- Domain name (register at NameCheap or Porkbun)
- SSH client on your machine
- ~1 hour for complete setup

## Cost Breakdown

- **Droplet**: $4/month (1GB RAM, 1vCPU, 25GB SSD)
- **PostgreSQL Database**: $15/month (managed, autobackups)
- **Domain**: ~$2/year
- **Total**: ~$20/month

Free credits cover first few months!

## Step-by-Step Deployment

### 1. Create DigitalOcean Droplet

1. Log in to [DigitalOcean](https://cloud.digitalocean.com)
2. Click "Create" → "Droplets"
3. Choose:
   - **Image**: Ubuntu 22.04 LTS
   - **Size**: $4/month plan
   - **Region**: Nearest to your location (e.g., us-east-1 for India use Singapore)
   - **Authentication**: SSH keys (create new if needed)
4. Click "Create Droplet"
5. Wait for droplet to be created (2-3 minutes)
6. Copy the IPv4 address

### 2. Create Managed PostgreSQL Database

1. Click "Create" → "Databases" → PostgreSQL
2. Choose:
   - **Version**: 15
   - **Size**: $15/month (1GB)
   - **Region**: Same as Droplet
   - **Backup**: Enable (automatic daily)
3. Click "Create Database Cluster"
4. Copy connection string and password from credentials tab

### 3. Connect to Droplet via SSH

```bash
# On Mac/Linux
ssh root@YOUR_DROPLET_IP

# Or use PuTTY on Windows with your SSH key
```

### 4. Install Docker & Dependencies

```bash
# Update system packages
apt-get update && apt-get upgrade -y

# Install Docker
apt-get install -y docker.io docker-compose git curl wget

# Start Docker service
systemctl start docker
systemctl enable docker

# Add root to docker group (optional)
usermod -aG docker $USER

# Verify installation
docker --version
docker-compose --version
```

### 5. Clone and Setup Application

```bash
# Navigate to home directory
cd /root

# Clone your repository (replace with your repo URL)
git clone https://github.com/yourusername/test-case-tool.git
cd test-case-tool

# Create .env file with database credentials
cat > .env << 'EOF'
# From DigitalOcean managed DB connection string
DB_HOST=your-db-cluster.ondigitalocean.com
DB_PORT=25060
DB_NAME=defaultdb
DB_USER=doadmin
DB_PASSWORD=your-password-from-do-console

# Generate new secret
JWT_SECRET=$(openssl rand -base64 32)

# Server settings
PORT=5000
NODE_ENV=production
UPLOAD_DIR=/root/test-case-tool/uploads

# Max file upload
MAX_FILE_SIZE=10485760
EOF

# Create uploads directory
mkdir -p uploads
chmod 755 uploads
```

### 6. Update Docker Compose for SSL

```bash
# Edit nginx.conf for your domain
nano nginx.conf

# Replace all instances of "your-domain.com" with your actual domain
# Uncomment HTTPS sections (around line 50)
```

### 7. Start Docker Containers

```bash
# Build images and start services
docker-compose up -d

# Wait for containers to start (30 seconds)
sleep 30

# Check service status
docker-compose ps

# View logs
docker-compose logs -f backend
```

### 8. Initialize Database

```bash
# Run database migrations
docker-compose exec backend npm run migrate

# Or manually:
docker-compose exec -T postgres psql -h localhost -U doadmin -d defaultdb < backend/src/migrations/initDatabase.sql
```

### 9. Setup Domain & SSL

#### Option A: Update DNS Records

1. Go to your domain registrar (NameCheap, Porkbun, etc.)
2. Find DNS settings
3. Update A record:
   - Host: @ (or domain root)
   - Points to: Your droplet IP address
   - TTL: 3600

4. Add subdomain (optional):
   - Host: www
   - Points to: Your droplet IP address

#### Option B: Setup Let's Encrypt SSL Certificate

```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP

# Install Certbot
apt-get install -y certbot

# Get certificate
certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Note the certificate paths from output
# Typically: /etc/letsencrypt/live/your-domain.com/

# Copy certificates to app directory
mkdir -p /root/test-case-tool/certbot/conf
cp -r /etc/letsencrypt/* /root/test-case-tool/certbot/conf/
```

#### Update nginx.conf for HTTPS

```bash
nano /root/test-case-tool/nginx.conf

# Uncomment and configure:
# server {
#     listen 443 ssl http2;
#     server_name your-domain.com www.your-domain.com;
#     
#     ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
```

### 10. Restart Nginx with SSL

```bash
# Restart nginx container
docker-compose restart nginx

# Check if already running
docker-compose ps

# View nginx logs
docker-compose logs nginx
```

### 11. Setup Automatic SSL Certificate Renewal

```bash
# Create renewal cron job
cat > /etc/cron.d/certbot-renew << 'EOF'
0 3 * * * /usr/bin/certbot renew --quiet --post-hook "docker-compose -f /root/test-case-tool/docker-compose.yml restart nginx"
EOF

chmod 644 /etc/cron.d/certbot-renew
```

## Accessing Your Application

Once DNS propagates (5-30 minutes):

- **Frontend**: https://your-domain.com
- **Backend API**: https://your-domain.com/api
- **Health Check**: https://your-domain.com/api/health

## Initial Setup

1. Go to your domain
2. Sign up with email/password
3. Dashboard will be empty
4. Create templates
5. Add test cases
6. Create test runs

## Monitoring & Maintenance

### View Logs

```bash
# Backend logs
docker-compose logs -f backend

# Frontend logs
docker-compose logs -f frontend

# Database logs
docker-compose logs -f postgres

# All logs
docker-compose logs -f
```

### Database Backup

```bash
# Automatic backups configured in DigitalOcean console
# Manual backup:
pg_dump -h your-db-cluster.ondigitalocean.com -U doadmin -d defaultdb > backup-$(date +%Y%m%d).sql
```

### Update Application

```bash
cd /root/test-case-tool

# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Run migrations if schema changed
docker-compose exec backend npm run migrate
```

### Monitor Droplet Resources

```bash
# CPU and memory usage
top

# Disk usage
df -h

# Process status
docker stats

# Network connections
netstat -tlnp
```

## Troubleshooting

### 502 Bad Gateway Error
```bash
# Check backend is running
docker-compose ps

# Restart services
docker-compose restart backend nginx

# View nginx error logs
docker-compose logs nginx
```

### Can't connect to database
```bash
# Check database credentials in .env
cat .env

# Test connection
docker-compose exec backend npm run db-check

# Verify database is running and accessible from DigitalOcean console
```

### Port already in use
```bash
# Find what's using port 80/443
lsof -i :80
lsof -i :443

# Kill process if needed
kill -9 PID
```

### SSL certificate not working
```bash
# Check certificate validity
certbot certificates

# Renew manually
certbot renew --force-renewal

# Restart nginx
docker-compose restart nginx
```

### High resource usage
```bash
# Check disk space
df -h

# Clean Docker
docker system prune -a

# Increase droplet size if needed
# (Go to DigitalOcean console → Droplet → Resize)
```

## Security Best Practices

```bash
# 1. Firewall rules in DigitalOcean console:
# - Allow: SSH (22), HTTP (80), HTTPS (443)
# - Deny: Everything else from internet

# 2. Update system regularly
apt-get update && apt-get upgrade -y

# 3. Monitor logs for suspicious activity
docker-compose logs | grep ERROR

# 4. Rotate SSH keys
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519

# 5. Enable 2FA in DigitalOcean account
```

## Performance Optimization

```bash
# Monitor current usage
docker stats

# Upgrade droplet size if needed:
# - Current: 1GB ($4/mo)
# - Next tier: 2GB ($6/mo)
# - Go to: DigitalOcean console → Droplet → Resize

# Add database read replica for scaling:
# - DigitalOcean console → Database → Add node
```

## Backup Strategy

```bash
# Enable automated backups
# DigitalOcean console → Droplet → Settings → Backups (ON)

# Manual backup
docker-compose exec postgres pg_dump -U postgres -d test_case_tool > /backups/backup.sql

# Download backup to local machine
scp root@YOUR_DROPLET_IP:/backups/backup.sql ./

# Restore from backup
docker-compose exec postgres psql -U postgres test_case_tool < backup.sql
```

## Support

For DigitalOcean support: https://www.digitalocean.com/support
For app issues: Check application logs

## Next Steps

1. Configure team members with login credentials
2. Create test templates
3. Upload existing test cases
4. Configure CI/CD integration (optional)
5. Setup automated backups

---

**Estimated Time**: 30-45 minutes
**Estimated Cost**: ~$20/month after free credits
**Uptime SLA**: 99.99% (DigitalOcean guarantee)
