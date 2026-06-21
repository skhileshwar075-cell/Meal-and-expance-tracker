# Deployment Guide

Complete guide to deploy Smart Tiffin Platform to production environments.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Frontend Deployment](#frontend-deployment)
3. [Backend Deployment](#backend-deployment)
4. [Database Setup](#database-setup)
5. [Environment Variables](#environment-variables)
6. [Deployment Platforms](#deployment-platforms)
7. [Post-Deployment](#post-deployment)
8. [Monitoring](#monitoring)
9. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Code Quality

- [ ] All tests passing locally
- [ ] TypeScript compilation successful
- [ ] No console errors or warnings
- [ ] Code reviewed and approved
- [ ] Security vulnerabilities checked

### Environment

- [ ] Production database created and initialized
- [ ] Environment variables configured
- [ ] SSL certificates ready (if self-hosted)
- [ ] DNS records configured
- [ ] CDN configured (optional)

### Configuration

- [ ] Production API URLs configured
- [ ] Authentication secrets generated
- [ ] Rate limiting configured
- [ ] Error monitoring setup
- [ ] Backup strategy defined

### Documentation

- [ ] Deployment runbook created
- [ ] Rollback procedure documented
- [ ] Team notified of deployment
- [ ] Maintenance window scheduled (if needed)

---

## Frontend Deployment

### Build for Production

```bash
# Install dependencies
pnpm install

# Create production build
pnpm --filter @workspace/frontend run build

# Output location: artifacts/frontend/dist/

# Verify build size
ls -lh artifacts/frontend/dist/
# Should be <5MB
```

### Option 1: Deploy to Vercel (Recommended)

**Advantages:**
- Zero configuration
- Automatic deployments on git push
- Global CDN
- Free tier available
- Environment variables management

#### Step 1: Connect Repository

1. Visit https://vercel.com
2. Sign up with GitHub account
3. Click "Import Project"
4. Select your Smart Tiffin repository
5. Click "Import"

#### Step 2: Configure Build Settings

1. **Project Name**: `smart-tiffin-frontend`
2. **Framework**: React
3. **Build Command**: 
   ```
   pnpm --filter @workspace/frontend run build
   ```
4. **Output Directory**: `artifacts/frontend/dist`
5. **Install Command**: 
   ```
   pnpm install
   ```

#### Step 3: Environment Variables

Add to Vercel dashboard:

```
VITE_API_URL=https://api.smarttiffin.com
VITE_PUBLIC_KEYS=...
```

#### Step 4: Deploy

```bash
# Automatic on git push to main
# Or manual in Vercel dashboard
```

**Production URL**: https://smart-tiffin-frontend.vercel.app

---

### Option 2: Deploy to Netlify

**Advantages:**
- Similar to Vercel
- Good for static sites
- Good documentation

#### Step 1: Connect Repository

1. Visit https://netlify.com
2. Sign up with GitHub
3. Click "New site from Git"
4. Select repository

#### Step 2: Build Configuration

```toml
[build]
  base = "artifacts/frontend"
  command = "pnpm run build"
  publish = "dist"

[build.environment]
  VITE_API_URL = "https://api.smarttiffin.com"
```

#### Step 3: Deploy

```bash
# Automatic on git push
```

---

### Option 3: Deploy to Custom Server

**Requirements:**
- Web server (Nginx, Apache)
- Node.js for serving (optional)
- SSL certificate

#### Step 1: Build

```bash
cd artifacts/frontend
pnpm run build
```

#### Step 2: Upload to Server

```bash
# Copy dist folder to server
scp -r dist/ user@server:/var/www/smart-tiffin/

# Or use SFTP
sftp user@server
put -r dist/ /var/www/smart-tiffin/
```

#### Step 3: Configure Web Server

**Nginx Configuration:**
```nginx
server {
    listen 443 ssl http2;
    server_name smarttiffin.com;

    ssl_certificate /etc/ssl/certs/smarttiffin.crt;
    ssl_certificate_key /etc/ssl/private/smarttiffin.key;

    root /var/www/smart-tiffin;
    index index.html;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## Backend Deployment

### Build for Production

```bash
# Install dependencies
pnpm install

# TypeScript compilation
pnpm --filter @workspace/backend run build

# Create production bundle
pnpm --filter @workspace/backend run bundle
```

### Option 1: Deploy to Render (Recommended)

**Advantages:**
- Simple deployment
- Auto-deploys on git push
- Free tier available
- PostgreSQL support

#### Step 1: Create Render Account

1. Visit https://render.com
2. Sign up with GitHub
3. Create new web service

#### Step 2: Configure Service

1. **Name**: `smart-tiffin-backend`
2. **Environment**: Node
3. **Build Command**: 
   ```
   pnpm install && pnpm run build
   ```
4. **Start Command**: 
   ```
   node --enable-source-maps dist/index.js
   ```

#### Step 3: Environment Variables

Add in Render dashboard:

```
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://...
JWT_SECRET=<generate-strong-secret>
SESSION_SECRET=<generate-strong-secret>
```

#### Step 4: Deploy

1. Select branch (main)
2. Click "Deploy"
3. Wait for deployment complete

**Production URL**: https://smart-tiffin-backend.onrender.com

---

### Option 2: Deploy to Railway

**Advantages:**
- Simple interface
- Good performance
- PostgreSQL included

#### Step 1: Connect Repository

1. Visit https://railway.app
2. Sign up with GitHub
3. Create new project
4. Select GitHub repository

#### Step 2: Configure

Railway auto-detects Node.js project

#### Step 3: Set Environment

```
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=...
SESSION_SECRET=...
```

#### Step 4: Deploy

Railway automatically deploys on git push

---

### Option 3: Deploy to Custom VPS

**Requirements:**
- Virtual Private Server (AWS EC2, DigitalOcean, Linode)
- Node.js installed
- PostgreSQL or managed database

#### Step 1: Prepare Server

```bash
# Connect to server
ssh user@server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y

# Install pnpm
npm install -g pnpm

# Verify
node --version
pnpm --version
```

#### Step 2: Clone and Setup

```bash
# Clone repository
git clone https://github.com/yourusername/smart-tiffin.git
cd smart-tiffin

# Install dependencies
pnpm install

# Build backend
pnpm --filter @workspace/backend run build
```

#### Step 3: Configure Environment

```bash
# Create .env file
nano artifacts/backend/.env

# Add:
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=<generate>
SESSION_SECRET=<generate>
PORT=8080
```

#### Step 4: Run with PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start service
cd artifacts/backend
pm2 start "node dist/index.js" --name "smart-tiffin-api"

# Save PM2 configuration
pm2 save

# Startup on reboot
pm2 startup
```

#### Step 5: Configure Nginx Reverse Proxy

```bash
sudo apt install nginx -y

# Create configuration
sudo nano /etc/nginx/sites-available/smart-tiffin

# Paste configuration (see above)

# Enable site
sudo ln -s /etc/nginx/sites-available/smart-tiffin /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## Database Setup

### Option 1: Neon (Recommended)

**Advantages:**
- Serverless PostgreSQL
- Automatic scaling
- No infrastructure management
- Free tier available

#### Step 1: Create Project

1. Visit https://neon.tech
2. Create new project
3. Select region
4. Create database

#### Step 2: Get Connection String

1. In Neon dashboard, click "Connection string"
2. Copy full connection string
3. Add to backend `.env`:
   ```
   DATABASE_URL=postgresql://user:password@...?sslmode=require&channel_binding=require
   ```

#### Step 3: Initialize Schema

```bash
pnpm --filter @workspace/db run push
```

### Option 2: AWS RDS

#### Step 1: Create RDS Instance

1. Login to AWS Console
2. Go to RDS > Create Database
3. Select PostgreSQL
4. Choose production template
5. Configure instance details
6. Enable backup and encryption

#### Step 2: Get Connection String

```
postgresql://user:password@instance.rds.amazonaws.com:5432/dbname
```

#### Step 3: Initialize

```bash
pnpm --filter @workspace/db run push
```

### Option 3: DigitalOcean Managed Database

#### Step 1: Create Database

1. Login to DigitalOcean
2. Create Managed Database > PostgreSQL
3. Select region and size

#### Step 2: Configure Firewall

- Add your server IP to firewall rules
- Get connection string from dashboard

#### Step 3: Initialize

```bash
pnpm --filter @workspace/db run push
```

---

## Environment Variables

### Production Variables

```env
# Server
NODE_ENV=production
PORT=8080

# Database
DATABASE_URL=postgresql://user:password@host/db

# Authentication
JWT_SECRET=<generate-64-char-random-string>
SESSION_SECRET=<generate-64-char-random-string>

# Third-party APIs (optional)
TWILIO_ACCOUNT_SID=<if-using-notifications>
TWILIO_AUTH_TOKEN=<if-using-notifications>
TWILIO_FROM_NUMBER=<if-using-notifications>

# Frontend URL (for CORS)
FRONTEND_URL=https://smarttiffin.com

# Error Monitoring (optional)
SENTRY_DSN=https://...

# Email Service (optional)
SENDGRID_API_KEY=<if-using-email>

# Payment Gateway (future)
RAZORPAY_KEY_ID=<if-using-payments>
RAZORPAY_KEY_SECRET=<if-using-payments>
```

### Generating Secrets

```bash
# Generate secure random strings
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Repeat 2-3 times for different secrets
```

---

## Deployment Platforms Comparison

| Platform | Type | Cost | Setup | Scaling |
|----------|------|------|-------|---------|
| Vercel | Frontend | Free-Pro | 5 min | Auto |
| Netlify | Frontend | Free-Pro | 5 min | Auto |
| Render | Backend | Free-Pro | 10 min | Manual |
| Railway | Backend | Paid | 5 min | Auto |
| Heroku | Both | Paid | 10 min | Auto |
| AWS | Both | Pay-as-go | 30 min | Manual |
| DigitalOcean | Both | $5+/mo | 15 min | Manual |

---

## Post-Deployment

### Step 1: Verify Deployment

```bash
# Test frontend
curl https://smarttiffin.com
# Should return HTML

# Test API
curl https://api.smarttiffin.com/api/health
# Should return {"status":"ok"}

# Test database connection
# Check logs for connection success
```

### Step 2: Run Smoke Tests

```bash
# Test critical flows
1. Visit homepage → Should load
2. Try login → Should authenticate
3. Create test record → Should save
4. View analytics → Should display
```

### Step 3: Setup Monitoring

```bash
# Add to error tracking (optional)
# Sentry: https://sentry.io
# Rollbar: https://rollbar.com

# Add uptime monitoring
# UptimeRobot: https://uptimerobot.com
# StatusCake: https://www.statuscake.com
```

### Step 4: Backup Database

```bash
# Enable automatic backups
# - Neon: Automatic
# - RDS: Configure in dashboard
# - DigitalOcean: Enable backups
```

---

## Monitoring

### Log Monitoring

```bash
# View logs in Render/Railway dashboard
# Or stream logs locally:
fly logs -a smart-tiffin-api  # if using Fly.io
heroku logs -t -a smart-tiffin  # if using Heroku
```

### Performance Monitoring

Key metrics to track:
- Response time (target: <200ms)
- Error rate (target: <0.1%)
- CPU usage (target: <80%)
- Memory usage (target: <80%)
- Database connections (target: <20)

### Security Monitoring

- Enable WAF (Web Application Firewall)
- Monitor failed login attempts
- Track API rate limiting
- Review access logs regularly

---

## Rollback Procedure

### If Deployment Goes Wrong

#### Step 1: Immediate Action

```bash
# Render
# Go to dashboard > Previous deploys > Select last good deploy > Redeploy

# Railway
# Click "Deployments" > Select previous > "Deploy"

# Vercel
# Similar in dashboard

# Custom Server
git checkout <previous-commit>
pnpm run build
pm2 restart smart-tiffin-api
```

#### Step 2: Database Rollback (if needed)

```bash
# Neon: Use point-in-time recovery
# AWS RDS: Use snapshots
# DigitalOcean: Use backups
```

#### Step 3: Post-Rollback

1. Investigate what went wrong
2. Fix issues locally
3. Test thoroughly
4. Deploy again carefully

---

## Troubleshooting Deployments

### Common Issues

#### 1. Build Fails

**Error**: `Cannot find module`

**Solution**:
```bash
# Ensure pnpm install runs
# Check build command includes: pnpm install
# Verify all dependencies in package.json
```

#### 2. Application Won't Start

**Error**: `PORT already in use` or timeout

**Solution**:
```bash
# Check PORT environment variable set correctly
# Kill process using port if needed
# Increase startup timeout
```

#### 3. Database Connection Fails

**Error**: `ECONNREFUSED` or `authentication failed`

**Solution**:
1. Verify DATABASE_URL format
2. Check database is running
3. Verify credentials correct
4. Check network/firewall rules
5. Test connection locally first

#### 4. Frontend Shows Wrong API URL

**Error**: Requests go to wrong API endpoint

**Solution**:
1. Check VITE_API_URL environment variable
2. Verify frontend build includes correct URL
3. Clear browser cache
4. Check browser DevTools Network tab

#### 5. Out of Memory

**Error**: `JavaScript heap out of memory`

**Solution**:
```bash
# Increase memory for Node
NODE_OPTIONS=--max-old-space-size=2048

# Or for production, increase server RAM
```

#### 6. Deployment Timeout

**Error**: Deployment times out during build

**Solution**:
1. Optimize build (remove unused packages)
2. Increase build timeout (if available)
3. Cache dependencies
4. Split large builds

---

## Production Checklist

- [ ] HTTPS enforced (redirect HTTP to HTTPS)
- [ ] Security headers configured
- [ ] CORS configured for specific origins
- [ ] Rate limiting enabled
- [ ] Error monitoring active
- [ ] Backups automated
- [ ] Monitoring alerts setup
- [ ] Rollback procedure tested
- [ ] Team trained on deployment
- [ ] Incident response plan created

---

## Scaling in Production

### Vertical Scaling
- Increase server RAM/CPU
- Upgrade database tier
- Simple but limited

### Horizontal Scaling
- Multiple backend instances (needs load balancer)
- Database replicas (read scaling)
- CDN for frontend
- More complex but unlimited

### Recommended Setup
- Load balancer (AWS ALB, Nginx)
- 2-3 backend instances
- Single primary database (managed service)
- CDN for static assets
- Redis cache (if needed)

---

## Cost Optimization

### Frontend
- Use Vercel (free tier: 100GB bandwidth/month)
- Enable asset caching
- Use CDN for assets

### Backend
- Start with Render hobby tier (~$5/month)
- Scale up as needed
- Monitor resource usage

### Database
- Start with Neon free tier
- Monitor storage and connections
- Optimize queries

### Total Estimated Cost (Small)
- Frontend: $0-20/month
- Backend: $0-50/month
- Database: $0-50/month
- **Total: $0-120/month**

---

## Further Reading

- [Vercel Deployment](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [Railway Guide](https://railway.app/docs)
- [PostgreSQL Best Practices](https://www.postgresql.org/docs/)

---

Last Updated: June 21, 2026
