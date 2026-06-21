# Setup Guide

Complete step-by-step guide to set up the Smart Tiffin Platform for development.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Windows-Specific Setup](#windows-specific-setup)
3. [Installation](#installation)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Seeding Demo Data](#seeding-demo-data)
7. [Starting Development Servers](#starting-development-servers)
8. [Verification](#verification)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

1. **Node.js 20 or higher**
   - Download: https://nodejs.org/
   - Verify installation:
     ```bash
     node --version    # Should be v20.x.x or higher
     npm --version     # Should be 10.x.x or higher
     ```

2. **pnpm 10 or higher**
   - Install globally:
     ```bash
     npm install -g pnpm
     ```
   - Verify installation:
     ```bash
     pnpm --version    # Should be 10.x.x or higher
     ```

3. **PostgreSQL 14+ (Optional if using Neon)**
   - For local development: https://www.postgresql.org/download/
   - For cloud: https://neon.tech/ (recommended)

4. **Git**
   - Download: https://git-scm.com/
   - Verify:
     ```bash
     git --version
     ```

### System Requirements

- **RAM**: 4GB minimum (8GB recommended)
- **Disk Space**: 2GB minimum
- **Network**: Internet connection required
- **Ports**: 4173 (frontend), 8080 (backend) must be available

---

## Windows-Specific Setup

### PowerShell Configuration

If you get execution policy errors, run PowerShell as Administrator:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Git Configuration

Ensure CRLF line endings don't cause issues:

```bash
git config --global core.autocrlf input
```

### Environment Variables

Windows uses different path separators. All npm scripts are cross-platform compatible.

---

## Installation

### Step 1: Clone Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/smart-tiffin-platform.git
cd Meal-and-expance-tracker

# Verify directory contents
ls -la
# Should show: artifacts/, lib/, scripts/, package.json, pnpm-lock.yaml, etc.
```

### Step 2: Install Dependencies

```bash
# Install all dependencies for all packages
pnpm install

# Verify installation
pnpm --version
ls -la node_modules  # Should have packages installed
```

**Expected output:**
```
Lockfile is up-to-date, installation skipped
 + 234 packages in 45.23s
```

**Note**: This may take 5-10 minutes on first run.

### Step 3: Verify Installation

```bash
# Check TypeScript
npx tsc --version    # Should show version 5.9.3+

# Check workspace packages
pnpm list --depth=0  # Should list all workspace packages
```

---

## Environment Configuration

### Step 1: Create Environment File

```bash
# Copy example to actual config
cp artifacts/backend/.env.example artifacts/backend/.env

# Verify file created
cat artifacts/backend/.env
```

### Step 2: Configure Database Connection

#### Option A: Use Neon (Recommended)

1. **Create Neon Account**
   - Visit https://neon.tech
   - Sign up with GitHub or email
   - Create new project (default settings fine)

2. **Get Connection String**
   - In Neon dashboard, click "Connection string"
   - Copy the full connection string
   - Should look like:
     ```
     postgresql://user:password@ep-xyz.c-123.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
     ```

3. **Update .env File**
   ```bash
   # Edit artifacts/backend/.env
   # Replace DATABASE_URL with your Neon connection string
   ```

#### Option B: Use Local PostgreSQL

1. **Install PostgreSQL** (if not already installed)
   - Windows: https://www.postgresql.org/download/windows/
   - macOS: `brew install postgresql`
   - Linux: `sudo apt install postgresql`

2. **Create Database**
   ```bash
   createdb smart_tiffin_db
   ```

3. **Get Connection String**
   ```
   postgresql://postgres:password@localhost:5432/smart_tiffin_db
   ```

### Step 3: Generate Secrets

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output and paste in .env as JWT_SECRET

# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output and paste in .env as SESSION_SECRET
```

### Step 4: Verify Configuration

```bash
# Check .env file
cat artifacts/backend/.env

# Should have:
# DATABASE_URL=postgresql://...
# JWT_SECRET=<your-secret>
# SESSION_SECRET=<your-secret>
# PORT=8080
# NODE_ENV=development
```

**⚠️ Important**: Never commit `.env` file to Git!

---

## Database Setup

### Step 1: Push Schema to Database

```bash
# Navigate to database package
cd lib/db

# Push schema to database
pnpm run push

# Output should show:
# ✅ Preparing to push...
# ✅ Creating schema...
# ✅ Tables created successfully
```

**What this does:**
- Creates all 16 database tables
- Sets up indexes and constraints
- Configures relationships

### Step 2: Verify Schema

```bash
# View tables created (local PostgreSQL)
psql -d smart_tiffin_db -c "\dt"

# Or check Neon dashboard
# Tables should be visible in Neon Console
```

**Expected Tables:**
```
users, students, owners, customers, meals, mealPlans,
attendance, bills, payments, expenses, budgets,
notifications, connections, analyticsSnapshots, reminderLogs
```

---

## Seeding Demo Data

### Optional: Seed Demo Data

```bash
# Navigate back to root
cd ../..

# Run seeding script
pnpm --filter @workspace/scripts run seed

# Output should show:
# ✅ Creating user accounts...
# ✅ Creating student profiles...
# ✅ Creating owner profile...
# ✅ Creating meal plans...
# ✅ Creating customers...
# ✅ Demo data seeding completed!
```

### Demo Credentials (if seeded)

| Email                | Password     | Role  |
|----------------------|--------------|-------|
| arjun@example.com    | password123  | Student |
| priya@example.com    | password123  | Student |
| ramesh@tiffin.com    | password123  | Owner |

**Connection Code**: `PATEL1`

---

## Starting Development Servers

### Option 1: Start All Services (Recommended)

```bash
# From root directory
bash start.sh
```

**Expected Output:**
- Frontend: `VITE v7.3.3 ready in XXX ms` at `http://localhost:4173`
- Backend: `Server listening on port 8080`

### Option 2: Start Services Individually

**Terminal 1 - Backend:**
```bash
cd artifacts/backend
pnpm dev

# Output:
# [10:15:30.123] INFO Server listening port 8080
```

**Terminal 2 - Frontend:**
```bash
cd artifacts/frontend
pnpm dev

# Output:
# VITE v7.3.3 ready in 437 ms
# Local:    http://localhost:4173/
# Network:  http://192.168.x.x:4173/
```

---

## Verification

### Step 1: Access Frontend

Open browser and visit: http://localhost:4173

**Expected:**
- Landing page loads
- No console errors
- Styling loads properly (Tailwind CSS)

### Step 2: Test Backend API

```bash
# Test health endpoint
curl http://localhost:8080/api/health

# Expected response:
# {"status":"ok","timestamp":"2026-06-21T10:30:00Z"}
```

### Step 3: Test Login

```bash
# Try login (if demo data seeded)
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"arjun@example.com","password":"password123"}'

# Expected response:
# {
#   "user": {...},
#   "accessToken": "jwt-token",
#   "refreshToken": "refresh-token"
# }
```

### Step 4: Verify Database Connection

```bash
# Check database tables exist
# Neon: Visit dashboard and view tables
# Local: psql -d smart_tiffin_db -c "\dt"
```

---

## Troubleshooting

### Common Issues & Solutions

#### 1. pnpm Installation Fails

**Error**: `pnpm: command not found`

**Solution**:
```bash
# Install pnpm globally
npm install -g pnpm

# Verify
pnpm --version
```

#### 2. Node Modules Corruption

**Error**: Various module not found errors

**Solution**:
```bash
# Clear and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

#### 3. TypeScript Compilation Errors

**Error**: `error TS2688: Cannot find type definition`

**Solution**:
```bash
# Clear TypeScript cache
rm -rf dist tsconfig.tsbuildinfo

# Reinstall
pnpm install
```

#### 4. Database Connection Fails

**Error**: `ECONNREFUSED` or `authentication failed`

**Solutions**:

a) **Wrong connection string**:
   - Verify DATABASE_URL in `.env`
   - Ensure URL has correct format
   - Check username/password (no special chars without encoding)

b) **Neon connection issues**:
   - Ensure `sslmode=require&channel_binding=require` in URL
   - Check firewall/VPN not blocking connection
   - Verify IP address is whitelisted (if needed)

c) **Local PostgreSQL not running**:
   ```bash
   # Start PostgreSQL service
   # Windows: Services > PostgreSQL > Start
   # macOS: brew services start postgresql
   # Linux: sudo systemctl start postgresql
   ```

#### 5. Port Already in Use

**Error**: `EADDRINUSE: address already in use :::8080`

**Solution**:
```bash
# Find process using port
# Windows: netstat -ano | findstr :8080
# macOS/Linux: lsof -i :8080

# Kill process
# Windows: taskkill /PID <pid> /F
# macOS/Linux: kill -9 <pid>

# Or use different port
PORT=8081 pnpm dev
```

#### 6. Vite Configuration Error

**Error**: `Cannot find module '@tailwindcss/vite'`

**Solution**:
```bash
# Reinstall frontend dependencies
cd artifacts/frontend
rm -rf node_modules
pnpm install
```

#### 7. Windows Script Execution Fails

**Error**: `script.sh: command not found`

**Solution**:
```powershell
# Use bash if available
bash start.sh

# Or run commands directly
cd artifacts/backend && pnpm dev
# In another terminal:
cd artifacts/frontend && pnpm dev
```

#### 8. Drizzle Schema Push Fails

**Error**: `Error migrating: connect ECONNREFUSED`

**Solution**:
1. Verify DATABASE_URL in `.env`
2. Check database is running/accessible
3. Check network connectivity
4. Retry: `pnpm --filter @workspace/db run push`

#### 9. Memory Issues

**Error**: `JavaScript heap out of memory`

**Solution**:
```bash
# Increase Node memory
NODE_OPTIONS=--max-old-space-size=4096 pnpm dev

# Or for builds
NODE_OPTIONS=--max-old-space-size=4096 pnpm build
```

#### 10. CORS Errors

**Error**: `Access to XMLHttpRequest blocked by CORS policy`

**Solution**:
- This is normal in development
- Backend should have CORS enabled
- Frontend should use correct API URL
- Check `.env` files in both frontend and backend

### Getting Help

1. **Check existing issues**: https://github.com/issues
2. **Read documentation**: See [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)
3. **Create issue**: https://github.com/issues/new
4. **Ask for help**: Create a discussion in GitHub

---

## Useful Development Commands

```bash
# Type checking
pnpm run typecheck

# Build all packages
pnpm run build

# Format code
pnpm run format

# Lint (if configured)
pnpm run lint

# Run tests (if configured)
pnpm run test

# Clean build artifacts
pnpm run clean

# Database operations
pnpm --filter @workspace/db run push        # Push schema
pnpm --filter @workspace/db run push-force  # Force push
pnpm --filter @workspace/scripts run seed   # Seed data
```

---

## Next Steps

1. **Review Codebase**: Explore `artifacts/backend` and `artifacts/frontend`
2. **Read Documentation**: See [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)
3. **Try Features**: Login with demo credentials and explore
4. **Start Contributing**: See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## Performance Tips

- Use `pnpm` instead of `npm` or `yarn` (faster, less disk usage)
- Enable Docker for PostgreSQL (if using local) for isolation
- Use VS Code extensions for better development experience
- Keep dependencies updated: `pnpm update`

---

Last Updated: June 21, 2026
