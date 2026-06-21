# Smart Tiffin & Student Analytics Platform

A comprehensive full-stack SaaS application designed to help students manage their meal expenses and budgets, while empowering tiffin service owners to efficiently manage their customers, billing, and business analytics.

## 🎯 Overview

This platform bridges the gap between students seeking affordable meal services and tiffin owners looking to streamline their business operations. With intelligent expense tracking, budget management, and analytics, it's the perfect solution for modern student meal services.

## ✨ Key Features

### Student Features
- 📊 **Expense Tracking** - Log and categorize all meal-related expenses
- 💰 **Budget Management** - Set budgets and monitor spending patterns
- 🍽️ **Meal Tracking** - Keep track of meals consumed and attendance
- 📈 **Personal Analytics** - Visual insights into spending trends
- 📄 **Reports** - Generate downloadable expense reports
- 🔐 **Secure Authentication** - JWT-based authentication

### Tiffin Owner Features
- 👥 **Customer Management** - Manage customer profiles and subscriptions
- 📋 **Attendance Tracking** - Track daily meal attendance and deliveries
- 💳 **Billing System** - Automated billing and payment tracking
- 💵 **Payment Management** - Record and manage customer payments
- 📊 **Business Analytics** - Revenue insights and customer trends
- 🔔 **Notifications** - Alert system for important events

## 🛠️ Tech Stack

### Frontend
- **React** 19.1.0 - Modern UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** 7.3.3 - Lightning-fast build tool
- **Tailwind CSS** 4.3.0 - Utility-first CSS framework
- **Node.js** 25.9.0

### Backend
- **Express** 5.2.1 - Web framework
- **TypeScript** 5.9.3 - Type-safe backend
- **Drizzle ORM** 0.45.2 - Database ORM
- **Zod** - Schema validation

### Database
- **PostgreSQL** - Relational database
- **Neon** - Serverless PostgreSQL hosting
- **Drizzle Kit** 0.31.10 - Schema migration tool

### Package Manager
- **pnpm** 11.0.8 - Fast, disk space-efficient package manager
- **pnpm Workspaces** - Monorepo management

## 📁 Folder Structure

```
Meal-and-expance-tracker/
├── artifacts/
│   ├── backend/                 # Express API server
│   │   ├── src/
│   │   │   ├── routes/         # API endpoints
│   │   │   ├── middlewares/    # Express middleware
│   │   │   ├── services/       # Business logic
│   │   │   ├── app.ts          # Express configuration
│   │   │   └── index.ts        # Server entry point
│   │   ├── scripts/dev.js      # Dev launcher script
│   │   ├── .env               # Local environment variables
│   │   ├── .env.example       # Environment template
│   │   └── package.json
│   │
│   ├── frontend/                # React Vite application
│   │   ├── src/
│   │   │   ├── components/     # Reusable components
│   │   │   ├── pages/          # Page components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── lib/            # Utilities and helpers
│   │   │   ├── App.tsx         # Root component
│   │   │   └── main.tsx        # Entry point
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── mockup-sandbox/          # Design prototypes
│
├── lib/
│   ├── api-client-react/        # React HTTP client wrapper
│   ├── api-spec/                # OpenAPI specification
│   ├── api-zod/                 # Zod validation schemas
│   ├── db/                      # Database configuration
│   │   ├── src/
│   │   │   ├── schema/         # Drizzle ORM table schemas
│   │   │   └── index.ts        # Database connection
│   │   ├── drizzle.config.ts   # Drizzle Kit configuration
│   │   └── package.json
│   │
│   └── integrations/            # Third-party integrations
│
├── scripts/                      # Utility scripts
│   ├── src/
│   │   └── seed.ts             # Database seeding
│   └── package.json
│
├── Documentation/
│   ├── README.md               # This file
│   ├── SETUP.md                # Installation guide
│   ├── DEPLOYMENT.md           # Deployment guide
│   ├── PROJECT_DOCUMENTATION.md # Technical documentation
│   ├── CONTRIBUTING.md         # Contribution guidelines
│   ├── CHANGELOG.md            # Version history
│   └── LICENSE                 # MIT License
│
├── pnpm-workspace.yaml         # Workspace configuration
├── pnpm-lock.yaml              # Locked dependencies
├── tsconfig.base.json          # Base TypeScript configuration
├── tsconfig.json               # Root TypeScript configuration
├── package.json                # Root package configuration
├── .env.example                # Environment template
└── .gitignore                  # Git ignore rules
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** 20+
- **pnpm** 10+
- **PostgreSQL** 14+ (or Neon account)
- **Git**

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/smart-tiffin-platform.git
   cd Meal-and-expance-tracker
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example artifacts/backend/.env
   # Edit artifacts/backend/.env with your Neon database URL and secrets
   ```

4. **Initialize database schema**
   ```bash
   pnpm --filter @workspace/db run push
   ```

5. **Seed demo data (optional)**
   ```bash
   pnpm --filter @workspace/scripts run seed
   ```

6. **Start development servers**
   
   Terminal 1 - Backend API:
   ```bash
   cd artifacts/backend
   $env:DATABASE_URL='your-connection-string'
   $env:PORT=8080
   pnpm dev
   ```
   
   Terminal 2 - Frontend UI:
   ```bash
   cd artifacts/frontend
   $env:PORT=4173
   pnpm dev
   ```

7. **Access the application**
   - **Frontend**: http://localhost:4173
   - **Backend API**: http://localhost:8080

## 🔐 Environment Variables

Create `.env` file in `artifacts/backend/`:

```env
# Database Configuration (Required)
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication (Required)
SESSION_SECRET=your-super-secret-session-key-change-in-production
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Server Configuration
PORT=8080
NODE_ENV=development
BASE_PATH=/

# Optional: Twilio SMS/WhatsApp Notifications
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
TWILIO_CHANNEL=sms
```

See `.env.example` for detailed descriptions of all variables.

## 📝 Demo Credentials

After seeding, use these credentials to test:

| Role    | Email                 | Password     |
|---------|-----------------------|--------------|
| Student | arjun@example.com     | password123  |
| Student | priya@example.com     | password123  |
| Owner   | ramesh@tiffin.com     | password123  |

**Connection Code**: `PATEL1` - Students use this to link to the owner's tiffin service.

## 🏗️ Architecture

### API Routes Structure

**Authentication**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - New user registration
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/logout` - User logout

**Student Routes**
- `GET /api/students/profile` - Student profile
- `GET /api/students/dashboard` - Dashboard data
- `POST /api/expenses` - Create expense
- `GET /api/expenses` - List expenses
- `POST /api/budgets` - Set budget
- `GET /api/budgets` - Get budgets
- `GET /api/analytics/student` - Student analytics

**Owner Routes**
- `GET /api/owners/profile` - Owner profile
- `GET /api/customers` - List customers
- `POST /api/customers` - Add customer
- `GET /api/attendance` - Attendance records
- `POST /api/attendance` - Mark attendance
- `GET /api/bills` - List bills
- `POST /api/bills` - Generate bills
- `POST /api/payments` - Record payment
- `GET /api/analytics/owner` - Owner analytics

## 📊 Database Schema

Core tables:
- **users** - User authentication and profiles
- **students** - Student-specific data
- **owners** - Tiffin owner information
- **customers** - Owner's customer relationships
- **meals** - Available meal offerings
- **mealPlans** - Subscription plan pricing
- **attendance** - Daily meal attendance records
- **bills** - Customer billing records
- **payments** - Payment transactions
- **expenses** - Student expense logs
- **budgets** - Student budget allocations
- **notifications** - In-app notifications
- **analytics** - Cached analytics data

## 🔄 Common Commands

### Development
```bash
# Install dependencies
pnpm install

# Start all services
bash start.sh

# Start individual services
pnpm --filter @workspace/backend run dev
pnpm --filter @workspace/frontend run dev

# Type checking
pnpm run typecheck

# Build all packages
pnpm run build
```

### Database
```bash
# Push schema to database
pnpm --filter @workspace/db run push

# Force push (use cautiously)
pnpm --filter @workspace/db run push-force

# Seed demo data
pnpm --filter @workspace/scripts run seed
```

## 🚀 Deployment

### Quick Deploy
- **Frontend**: Deploy to [Vercel](https://vercel.com) or [Netlify](https://netlify.com)
- **Backend**: Deploy to [Render](https://render.com) or [Railway](https://railway.app)
- **Database**: Use [Neon](https://neon.tech) serverless PostgreSQL

See [Deployment Guide](./DEPLOYMENT.md) for detailed instructions.

## 📚 Documentation

- **[Setup Guide](./SETUP.md)** - Detailed installation and configuration
- **[Project Documentation](./PROJECT_DOCUMENTATION.md)** - Architecture, design, and technical details
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment instructions
- **[Contributing Guide](./CONTRIBUTING.md)** - How to contribute to this project
- **[Changelog](./CHANGELOG.md)** - Version history and updates

## 🤝 Contributing

We welcome contributions! Please see [Contributing Guide](./CONTRIBUTING.md) for:
- Branch naming conventions
- Commit message format
- Pull request process
- Coding standards

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🗺️ Roadmap

### Phase 1 (Current)
- ✅ Core authentication system
- ✅ Student module (expenses, budgets, analytics)
- ✅ Owner module (customer management, billing)
- ✅ Basic analytics engine
- ✅ Billing and payment tracking

### Phase 2 (Planned)
- 🔄 Mobile application (React Native)
- 🔄 Advanced analytics dashboard
- 🔄 SMS/Email notifications
- 🔄 Payment gateway integration
- 🔄 Multi-language support

### Phase 3 (Future)
- 📅 AI-powered budget recommendations
- 📅 Chatbot support
- 📅 Social features (sharing, groups)
- 📅 Loyalty and rewards program
- 📅 Third-party integrations

## 📞 Support

- **Documentation** - See docs folder
- **Issues** - Report on GitHub Issues
- **Discussions** - Ask questions in Discussions

## 🙏 Acknowledgments

Built with modern technologies:
- React for flexible UI
- Express for robust backend
- Drizzle ORM for type-safe database
- Tailwind CSS for beautiful styling
- Neon for serverless PostgreSQL

---

**Made with ❤️ for students and tiffin service providers.**

Last Updated: June 21, 2026 | Version 1.0.0
