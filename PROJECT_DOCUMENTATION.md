# Smart Tiffin Platform - Technical Documentation

Comprehensive technical documentation for the Smart Tiffin & Student Analytics Platform.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Problem Statement](#problem-statement)
3. [System Architecture](#system-architecture)
4. [Database Design](#database-design)
5. [User Roles & Permissions](#user-roles--permissions)
6. [Feature Specifications](#feature-specifications)
7. [API Documentation](#api-documentation)
8. [Security Features](#security-features)
9. [Analytics Engine](#analytics-engine)
10. [Future Enhancements](#future-enhancements)

---

## Project Overview

### Vision
To provide a comprehensive digital platform that bridges students and tiffin service providers through intelligent expense tracking, budget management, and business analytics.

### Mission
Empower students to manage their meal expenses effectively while helping tiffin owners optimize their business operations through real-time data and analytics.

### Objectives
1. Enable students to track meal expenses and manage budgets
2. Help owners manage customers and billing efficiently
3. Provide actionable business insights through analytics
4. Ensure secure and reliable service delivery
5. Foster trust through transparent transactions

---

## Problem Statement

### Student Pain Points
- No centralized platform to track meal expenses
- Difficulty in setting and monitoring budgets
- Lack of expense categorization
- No clear visibility into meal patterns
- Limited expense reports for personal planning

### Owner Pain Points
- Manual customer management (spreadsheets)
- Tedious attendance tracking processes
- Complex billing calculations
- Payment tracking challenges
- No business performance metrics
- Limited customer insights

### Platform Solution
A dual-role SaaS platform addressing all these pain points through:
- Automated expense tracking
- Intelligent budget management
- Real-time attendance marking
- Automated billing generation
- Comprehensive analytics dashboard
- Secure payment tracking

---

## System Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────┐
│         Frontend Layer (React + Vite)             │
│  http://localhost:4173 (Development)              │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │  Backend API Layer (Express)            │    │
│  │  http://localhost:8080                  │    │
│  │                                         │    │
│  │  - Authentication & Authorization      │    │
│  │  - Business Logic & Validation          │    │
│  │  - Data Processing & Analytics         │    │
│  │  - Integration Services                 │    │
│  └────────────────────────────────────────┘    │
│                    ↓                             │
│  ┌────────────────────────────────────────┐    │
│  │   Data Access Layer (Drizzle ORM)       │    │
│  │   Type-safe database queries            │    │
│  └────────────────────────────────────────┘    │
│                    ↓                             │
│  ┌────────────────────────────────────────┐    │
│  │ PostgreSQL Database (Neon)              │    │
│  │ - Relational Data Storage               │    │
│  │ - Transactional Integrity               │    │
│  │ - ACID Compliance                       │    │
│  └────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

### Technology Stack Rationale

| Component | Technology | Why |
|-----------|-----------|-----|
| Frontend UI | React | Component-based, reusable, large ecosystem |
| Build Tool | Vite | Fast builds, instant HMR, optimized bundling |
| Styling | Tailwind CSS | Utility-first, responsive, low CSS footprint |
| Backend | Express | Lightweight, flexible, excellent middleware support |
| Language | TypeScript | Type safety, better IDE support, fewer runtime errors |
| Database | PostgreSQL | ACID compliance, JSON support, excellent JSON operators |
| ORM | Drizzle | Type-safe, minimal overhead, SQL-like API |
| Package Manager | pnpm | Faster installs, lower disk usage, monorepo support |
| Auth | JWT | Stateless, scalable, fits REST API pattern |

---

## Database Design

### Entity-Relationship Diagram

```
Users (1) ──── (Many) Students
       ├───── (Many) Owners
       └───── (Many) Notifications

Owners (1) ──── (Many) Customers
        ├───── (Many) MealPlans
        └───── (Many) Attendance

Students (1) ──── (Many) Expenses
         ├────── (Many) Budgets
         └────── (Many) Meals

Customers (1) ──── (Many) Bills
          └────── (Many) Payments

MealPlans (1) ──── (Many) Customers
          └────── (Many) Attendance
```

### Core Tables

#### users
- User authentication and base profile
- Fields: id, name, email, password_hash, role, refresh_token, deleted_at, created_at, updated_at
- Role: STUDENT | OWNER | ADMIN
- Unique Index: email

#### students
- Student-specific profile data
- Fields: id, userId, schoolYear, contact, bio, created_at, updated_at
- Foreign Key: userId → users.id

#### owners
- Tiffin owner information
- Fields: id, userId, businessName, description, phone, address, bankDetails, created_at, updated_at
- Foreign Key: userId → users.id

#### customers
- Owner's customer relationships
- Fields: id, ownerId, name, email, contact, status, mealPlanId, subscriptionStartDate, subscriptionEndDate, created_at, updated_at
- Foreign Keys: ownerId → owners.id, mealPlanId → mealPlans.id
- Status: ACTIVE | INACTIVE | PAUSED

#### meals
- Available meal offerings
- Fields: id, ownerId, name, description, category, price, available, created_at, updated_at
- Foreign Key: ownerId → owners.id
- Category: BREAKFAST | LUNCH | DINNER | SNACK

#### mealPlans
- Subscription plans with pricing
- Fields: id, ownerId, name, price, frequency, mealsPerWeek, startDate, endDate, active, created_at, updated_at
- Foreign Key: ownerId → owners.id
- Frequency: DAILY | WEEKLY | MONTHLY

#### attendance
- Daily meal attendance marking
- Fields: id, customerId, date, morningMarked, eveningMarked, created_at, updated_at
- Foreign Key: customerId → customers.id
- Unique Constraint: (customerId, date)

#### bills
- Customer billing records
- Fields: id, customerId, month, year, amount, discount, extraCharges, status, dueDate, created_at, updated_at
- Foreign Key: customerId → customers.id
- Status: PENDING | PAID | OVERDUE | CANCELLED
- Unique Constraint: (customerId, month, year, deleted_at IS NULL)

#### payments
- Payment transaction records
- Fields: id, billId, amount, paymentMethod, transactionRef, paymentDate, created_at, updated_at
- Foreign Key: billId → bills.id
- Payment Method: CASH | UPI | BANK_TRANSFER | CHEQUE | ONLINE

#### expenses
- Student expense logs
- Fields: id, studentId, amount, category, description, date, created_at, updated_at
- Foreign Key: studentId → students.id
- Category: FOOD | TRANSPORT | UTILITIES | OTHER

#### budgets
- Student budget allocations
- Fields: id, studentId, month, year, budgetAmount, limitPerDay, alertThreshold, created_at, updated_at
- Foreign Key: studentId → students.id
- Unique Constraint: (studentId, month, year)

#### notifications
- In-app notification feed
- Fields: id, userId, type, title, message, read, created_at, updated_at
- Foreign Key: userId → users.id
- Type: PAYMENT | REMINDER | ALERT | INFO

#### analyticsSnapshots
- Cached analytics data
- Fields: id, userId, metricType, value, period, created_at
- Foreign Key: userId → users.id

#### reminderLogs
- SMS/WhatsApp reminder logs
- Fields: id, userId, type, recipient, status, response, created_at, updated_at
- Type: SMS | WHATSAPP | EMAIL
- Status: PENDING | SENT | FAILED

---

## User Roles & Permissions

### Student Role
**Can:**
- Register and manage profile
- Track personal expenses
- Set monthly budgets
- Log meals consumed
- View personal analytics
- Connect to tiffin services
- View bills and payment history
- Make payments

**Cannot:**
- Manage other students' data
- Access owner features
- View owner analytics
- Modify meal plans

**Permissions:**
```json
{
  "expenses": ["create", "read", "update", "delete"],
  "budgets": ["create", "read", "update"],
  "meals": ["read"],
  "analytics": ["read"],
  "profile": ["read", "update"]
}
```

### Owner Role
**Can:**
- Register and manage profile
- Add and manage customers
- Create meal plans
- Mark daily attendance
- Generate bills
- Record payments
- View business analytics
- Export reports

**Cannot:**
- Modify customer expenses
- Access other owner's data
- View student analytics
- Delete transactions (soft delete only)

**Permissions:**
```json
{
  "customers": ["create", "read", "update", "delete"],
  "mealPlans": ["create", "read", "update", "delete"],
  "attendance": ["create", "read", "update"],
  "bills": ["create", "read", "update"],
  "payments": ["create", "read"],
  "analytics": ["read"],
  "profile": ["read", "update"]
}
```

### Admin Role
**Can:**
- Access all system features
- Manage users
- View all analytics
- Generate system reports
- Manage platform settings
- Handle disputes

---

## Feature Specifications

### Student Module

#### Expense Tracking
- **Purpose**: Help students log and categorize expenses
- **Features**:
  - Quick expense entry (amount, category, description)
  - Category management (FOOD, TRANSPORT, UTILITIES, OTHER)
  - Date selection with calendar picker
  - Bulk import from CSV (future)
  - Recurring expenses (future)
  - Expense tags and notes
  
- **Validation**:
  - Amount must be > 0
  - Category is mandatory
  - Date must not be in future
  - Description max 255 characters

#### Budget Management
- **Purpose**: Help students set spending limits and monitor
- **Features**:
  - Monthly/Weekly budget configuration
  - Per-day limit calculation
  - Budget vs. actual tracking
  - Alert thresholds (80%, 90%, 100%)
  - Visual progress indicators
  - Budget history

- **Calculations**:
  ```
  Daily Limit = Monthly Budget / Days in Month
  Used = SUM(expenses in month)
  Remaining = Monthly Budget - Used
  % Used = (Used / Monthly Budget) × 100
  ```

#### Meal Tracking
- **Purpose**: Log and track meals consumed
- **Features**:
  - Calendar-based meal log
  - Morning and evening meal marking
  - Meal attendance confirmation
  - Meal history view
  - Meal preferences (future)

#### Personal Analytics
- **Purpose**: Provide insights into spending patterns
- **Features**:
  - Spending trends (chart)
  - Category breakdown (pie chart)
  - Monthly comparison
  - Average daily spending
  - Wellness score based on budget adherence
  - Forecast based on current spending

#### Reports
- **Purpose**: Generate downloadable financial reports
- **Features**:
  - Monthly expense report (PDF)
  - Custom date range reports
  - Category-wise breakdown
  - Budget analysis
  - Export to CSV/Excel

### Owner Module

#### Customer Management
- **Purpose**: Manage tiffin service customers
- **Features**:
  - Add/Edit customer profiles
  - Assign meal plans
  - Track subscription status
  - Customer notes
  - Contact management
  - Status: ACTIVE, INACTIVE, PAUSED

#### Attendance Tracking
- **Purpose**: Mark daily meal attendance
- **Features**:
  - Bulk attendance grid
  - Morning and evening marking
  - Calendar view
  - Attendance reports
  - Missing day tracking
  - Edit past attendance

#### Billing System
- **Purpose**: Automate billing generation
- **Features**:
  - Monthly bill generation
  - Attendance-based calculations
  - Discount application
  - Extra charges handling
  - Bill templates
  - Payment due dates

- **Calculation**:
  ```
  Days Delivered = COUNT(attendance marked)
  Bill Amount = Meal Plan Price × Days Delivered
  Bill Amount = Bill Amount - Discount + Extra Charges
  ```

#### Payment Management
- **Purpose**: Track and reconcile payments
- **Features**:
  - Multiple payment methods (CASH, UPI, BANK, CHEQUE, ONLINE)
  - Payment recording
  - Payment reconciliation
  - Receipt generation
  - Payment history
  - Outstanding tracking

#### Business Analytics
- **Purpose**: Provide business insights
- **Features**:
  - Revenue dashboard
  - Customer acquisition rate
  - Churn analysis
  - Collection rate
  - Top customers
  - Monthly trends
  - Customer retention metrics

---

## API Documentation

### Authentication Endpoints

#### POST /api/auth/login
Register a user account

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "name": "John",
    "email": "user@example.com",
    "role": "STUDENT"
  },
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token"
}
```

#### POST /api/auth/register
Create new user account

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secure123",
  "role": "STUDENT"
}
```

#### POST /api/auth/refresh
Refresh access token

**Request:**
```json
{
  "refreshToken": "token"
}
```

### Student Endpoints

#### GET /api/students/profile
Get student profile

**Response (200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "schoolYear": 3,
  "contact": "+91...",
  "bio": "..."
}
```

#### GET /api/expenses
List student expenses

**Query Params:**
- month: number (1-12)
- year: number
- category: string (optional)

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "amount": 500,
      "category": "FOOD",
      "description": "Lunch",
      "date": "2026-06-15"
    }
  ],
  "total": 2500,
  "average": 250
}
```

#### POST /api/expenses
Create expense

**Request:**
```json
{
  "amount": 500,
  "category": "FOOD",
  "description": "Lunch",
  "date": "2026-06-15"
}
```

### Owner Endpoints

#### GET /api/customers
List owner's customers

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Arjun",
      "email": "arjun@example.com",
      "mealPlanId": "uuid",
      "status": "ACTIVE"
    }
  ],
  "total": 10
}
```

#### POST /api/bills
Generate monthly bills

**Request:**
```json
{
  "month": 6,
  "year": 2026
}
```

**Response (200):**
```json
{
  "billsGenerated": 10,
  "totalAmount": 50000
}
```

---

## Security Features

### Authentication
- **JWT Tokens**: 15-minute access tokens, 7-day refresh tokens
- **Password Hashing**: Bcrypt with salt rounds 10
- **Token Refresh**: Secure refresh token rotation

### Authorization
- **Role-Based Access Control**: STUDENT, OWNER, ADMIN
- **Resource-Level Permissions**: Verify user ownership
- **Route Guards**: Middleware validation

### Data Protection
- **Input Validation**: Zod schema validation
- **SQL Injection Prevention**: Parameterized queries (Drizzle ORM)
- **CORS**: Whitelist allowed origins
- **HTTPS**: Enforced in production
- **Environment Variables**: Never hardcoded secrets

### Audit & Compliance
- **Soft Deletes**: Logical deletion for data retention
- **Timestamps**: created_at, updated_at tracking
- **User Tracking**: Action logging (future)
- **GDPR Compliance**: Data export, account deletion (future)

---

## Analytics Engine

### Student Analytics Metrics

1. **Monthly Spending Trend**
   ```
   Calculated: SUM(expenses) grouped by month
   Displayed: Line chart over 12 months
   ```

2. **Budget Adherence Score**
   ```
   Score = (Budget - Actual) / Budget × 100
   Range: 0-100%
   Grade: A (>80%), B (60-80%), C (<60%)
   ```

3. **Category Breakdown**
   ```
   Pie chart showing percentage of expenses by category
   ```

4. **Daily Average Spending**
   ```
   Average = Total Expenses / Days in Period
   Helps identify if within sustainable budget
   ```

### Owner Analytics Metrics

1. **Monthly Revenue**
   ```
   Revenue = SUM(bills paid) for month
   Includes discounts and extra charges
   ```

2. **Collection Rate**
   ```
   Rate = (Amount Collected / Total Billed) × 100
   Target: >95%
   ```

3. **Customer Churn**
   ```
   Churn = (Customers Left / Start Customers) × 100
   Helps identify retention issues
   ```

4. **Customer Acquisition**
   ```
   New customers added per month
   Helps track growth
   ```

---

## Future Enhancements

### Phase 2 Features
1. **Mobile App (React Native)**
   - Native iOS and Android applications
   - Offline-first architecture
   - Push notifications

2. **Advanced Analytics**
   - Predictive spending models
   - Machine learning-based recommendations
   - Anomaly detection

3. **Third-Party Integrations**
   - Payment gateway (Razorpay, Stripe)
   - SMS/Email (Twilio, SendGrid)
   - Calendar sync

4. **Multi-Language Support**
   - Hindi, Kannada, Tamil, Telugu
   - RTL language support

### Phase 3 Features
1. **AI Features**
   - Budget optimization suggestions
   - Expense categorization (ML)
   - Chatbot support

2. **Social Features**
   - Group expense sharing
   - Social analytics
   - User profiles and networking

3. **Loyalty Program**
   - Reward points system
   - Referral bonuses
   - Exclusive offers

4. **Advanced Integrations**
   - Restaurant partnerships
   - Discount aggregation
   - Booking systems

---

## Performance Considerations

### Database Optimization
- Indexes on frequently queried columns
- Query optimization with EXPLAIN ANALYZE
- Connection pooling with Neon
- Caching strategy for analytics

### Frontend Optimization
- Code splitting with Vite
- Lazy loading components
- Image optimization
- Service workers (future)

### Backend Optimization
- Request/response caching
- Pagination for list endpoints
- Batch operations for bulk updates
- Query result caching

---

## Disaster Recovery

### Backup Strategy
- Neon automated backups (daily)
- Point-in-time recovery capability
- Manual backups before major updates

### Data Retention
- Transaction records: 7 years
- User data: Until account deletion
- Audit logs: 1 year (future)

### Incident Response
- Error monitoring with Sentry (future)
- Uptime monitoring
- Incident playbooks
- Communication plan

---

## Compliance & Legal

### Data Protection
- GDPR compliance roadmap
- Data privacy policy
- User consent management
- Right to deletion

### Financial Compliance
- GST compliance (India)
- Tax calculation accuracy
- Financial audit trail
- PCI DSS for payments (future)

---

Last Updated: June 21, 2026
