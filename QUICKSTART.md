# 🚀 Quick Start Guide

Get your Test Case Management Tool up and running in minutes!

## For Local Testing (Mac/Linux/Windows)

### Option 1: Using Docker (Recommended - 5 minutes)

```bash
cd test-case-tool

# Make setup script executable
chmod +x scripts/local-setup.sh

# Run setup
./scripts/local-setup.sh

# Wait for setup to complete...
# Then open: http://localhost:3000
```

### Option 2: Manual Setup (15 minutes)

**Prerequisites:**
- Node.js 18+
- PostgreSQL 12+
- npm

**Backend:**
```bash
cd backend
npm install
cp .env.example .env

# Edit .env with your database credentials
nano .env

npm run migrate    # Create tables
npm run dev        # Start server on :5000
```

**Frontend (new terminal):**
```bash
cd frontend
npm install
npm start          # Opens browser @ :3000
```

## First Time Usage

1. **Visit** http://localhost:3000
2. **Signup** with email/password
3. **Create** a test template
4. **Add** test cases
5. **Create** a test run
6. **Execute** tests and see results

## For Production Deployment (DigitalOcean)

### Prerequisites
- DigitalOcean account ($200 free credit)
- Domain name (~$2/year)

### Total Cost: ~$20/month

### Quick Deploy (30 minutes)

```bash
# 1. Create Droplet on DigitalOcean (Ubuntu 22.04)
#    - Size: $4/month
#    - Get IPv4 address

# 2. Create PostgreSQL Database
#    - Plan: $15/month
#    - Get connection credentials

# 3. SSH into Droplet
ssh root@YOUR_DROPLET_IP

# 4. Run deployment script
cd /root
git clone YOUR_REPO_URL
cd test-case-tool

chmod +x scripts/deploy-do.sh
./scripts/deploy-do.sh

# 5. Configure domain DNS → Droplet IP
#    (takes 5-30 minutes to propagate)

# 6. Access at https://your-domain.com
```

## Project Structure

```
test-case-tool/
├── README.md                   # Full documentation
├── DEPLOYMENT_GUIDE.md         # Detailed DO deployment
├── docker-compose.yml          # Docker configuration
├── .env.example               # Environment template
│
├── backend/                   # Node.js/Express API
│   ├── src/
│   │   ├── config/           # Database setup
│   │   ├── controllers/      # Business logic
│   │   ├── routes/           # API endpoints
│   │   ├── migrations/       # Database schema
│   │   └── index.js          # Server entry
│   └── package.json
│
├── frontend/                 # React 18 app
│   ├── src/
│   │   ├── pages/           # Dashboard, Test Cases, etc.
│   │   ├── services/        # API client
│   │   └── App.js
│   └── package.json
│
└── scripts/
    ├── local-setup.sh       # Local Docker setup
    └── deploy-do.sh         # DigitalOcean deployment
```

## Features Included

✅ **User Management**
- Signup/Login with JWT
- Role-based access

✅ **Test Case Management**
- Create/Edit/Delete/Clone
- Custom templates
- Bulk upload (CSV/Excel)
- Bulk download (Excel/CSV)
- Version history & edit tracking

✅ **Test Execution**
- Create test runs
- Mark pass/fail/skip
- Add comments & attachments
- Real-time metrics

✅ **Reporting**
- Pass/Fail statistics
- Audit logs
- Edit history
- Team collaboration

## Key API Endpoints

```
POST   /api/auth/signup              # User registration
POST   /api/auth/login               # User login
GET    /api/test-cases               # List all test cases
POST   /api/test-cases               # Create test case
PUT    /api/test-cases/:id           # Update test case
POST   /api/test-cases/:id/clone     # Clone test case
POST   /api/test-runs                # Create test run
GET    /api/test-runs/:id            # Get test run details
PUT    /api/test-runs/result/:id     # Update test result
GET    /api/reports/metrics          # Get statistics
POST   /api/upload/upload            # Import test cases
```

## Database Schema

Tables: Users, Workspaces, Templates, Test Cases, Test Case Versions, Test Runs, Test Results, Audit Log

## Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=test_case_tool
DB_USER=postgres
DB_PASSWORD=password

# Security
JWT_SECRET=your-secret-key

# Server
PORT=5000
NODE_ENV=production
```

## Docker Commands

```bash
# Start all containers
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop everything
docker-compose down

# Rebuild images
docker-compose up -d --build

# Get container details
docker-compose ps
```

## Troubleshooting

### Port 3000/5000 already in use
```bash
# Kill process using port
lsof -i :3000
kill -9 PID
```

### Database connection error
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View logs
docker-compose logs postgres
```

### API not responding
```bash
# Check backend logs
docker-compose logs backend

# Restart backend
docker-compose restart backend
```

## Performance

- **Mock Data**: Handles 1000+ test cases
- **Concurrent Users**: 50+ users on $4 Droplet
- **Database**: Managed PostgreSQL with backups
- **Scalability**: Add more Droplets + load balancer

## Security Features

- ✅ JWT Authentication
- ✅ Password hashing (bcrypt)
- ✅ Audit logs for compliance
- ✅ HTTPS/SSL support
- ✅ Role-based access control

## Next Steps

1. **Run locally** to understand features
2. **Create templates** for your QA processes
3. **Import test cases** (CSV/Excel)
4. **Deploy to DigitalOcean** for team access
5. **Invite team members** to collaborate

## Support & Resources

- **Full README**: See `README.md`
- **Deployment Details**: See `DEPLOYMENT_GUIDE.md`
- **API Docs**: Available in README
- **DigitalOcean Help**: https://www.digitalocean.com/support

## Quick Reference

| Task | Command |
|------|---------|
| Local setup | `./scripts/local-setup.sh` |
| Deploy to DO | `./scripts/deploy-do.sh` |
| View logs | `docker-compose logs -f` |
| Stop services | `docker-compose down` |
| Database backup | `docker-compose exec postgres pg_dump -U postgres -d test_case_tool` |
| Update code | `git pull && docker-compose up -d --build` |

---

**Ready to get started?**

1. For local testing: `./scripts/local-setup.sh`
2. For production: Follow `DEPLOYMENT_GUIDE.md`
3. Questions? Check `README.md`

**Happy Testing! 🎉**
