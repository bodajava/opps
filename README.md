# opps

Premium cookie e-commerce platform built for Egypt.

Full-stack application with NestJS backend, Next.js frontend, MongoDB database.

## Architecture

```
opps/
  frontend/          Next.js 16 with App Router
  backend/           NestJS 11 REST API
  docker-compose.yml Local development setup
```

### Backend

- NestJS 11 with TypeScript strict mode
- MongoDB with Mongoose ODM
- JWT access + refresh token authentication
- Passport strategies (JWT, JWT Refresh)
- Role-based access control (RBAC)
- Payment provider adapter architecture
- Swagger/OpenAPI documentation
- Rate limiting, Helmet, CORS security
- Email OTP verification
- Inventory management with stock movement tracking
- Order number generation (concurrency-safe)
- Audit logging

### Frontend

- Next.js 16 with App Router
- TypeScript strict mode
- Tailwind CSS with warm cookie-themed design
- shadcn/ui components
- TanStack Query for server state
- React Hook Form + Zod validation
- Zustand for client state (cart, auth)
- Recharts for admin analytics
- Axios with centralized API client
- Server Components by default
- Client Components only where needed

## Prerequisites

- Node.js 22+
- npm 10+
- MongoDB 7+ (local or Atlas)
- NestJS CLI (`npm install -g @nestjs/cli`)

## Installation

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd opps
```

#### Backend

```bash
cd backend
cp .env.example .env
npm install
```

#### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
```

### 2. Start MongoDB

**Option A: Local MongoDB**

Ensure MongoDB is running on port 27017.

**Option B: Docker**

```bash
cd opps
docker compose up -d mongodb
```

### 3. Configure environment variables

#### Backend (`backend/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_ACCESS_SECRET` | Random 32+ char secret for access tokens | Yes |
| `JWT_REFRESH_SECRET` | Different random 32+ char secret | Yes |
| `ADMIN_SEED_EMAIL` | Email for the first admin account | For seed |
| `ADMIN_SEED_PASSWORD` | Password (must be strong) | For seed |
| `SMTP_HOST` | SMTP server for emails | For OTP |
| `SMTP_USER` | SMTP username | For OTP |
| `SMTP_PASSWORD` | SMTP app password (never your mailbox password) | For OTP and password reset |

#### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL (default: http://localhost:4001/api) |

### 4. Seed the database

```bash
cd backend
npm run seed
```

This creates:
- Roles and permissions
- Sample cookie categories and products
- Product variants
- Delivery zones (Egyptian governorates)
- Store settings
- Payment method records
- Demo coupons

### 5. Create the admin user

Set these in `backend/.env`:

```env
RUN_ADMIN_SEED=true
ADMIN_SEED_NAME=opps Admin
ADMIN_SEED_EMAIL=oppsfoods.egy@gmail.com
ADMIN_SEED_PASSWORD=replace_with_a_strong_admin_password
```

Then run the seed:

```bash
cd backend
npm run seed
```

The admin is created only when `RUN_ADMIN_SEED=true`.

After creating the admin, set `RUN_ADMIN_SEED=false` to prevent re-creation.

### 6. Start development servers

#### Backend (terminal 1)

```bash
cd backend
npm run start:dev
```

API: http://localhost:4001/api
Swagger: http://localhost:4001/docs

#### Frontend (terminal 2)

```bash
cd frontend
npm run dev
```

Frontend: http://localhost:3000

## Commands

### Backend

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start in watch mode |
| `npm run build` | Build for production |
| `npm run start:prod` | Start production build |
| `npm run seed` | Seed the database |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run lint` | Lint code |

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run start` | Start production build |
| `npm run lint` | Lint code |

## Admin Dashboard

URL: http://localhost:3000/admin

Login with the admin credentials you configured during seeding.

### Admin Sections

- **Overview** — Revenue, orders, charts
- **Products** — Full product management
- **Categories** — Category management
- **Orders** — Order management with status updates
- **Coupons** — Discount coupon management
- **Customers** — Customer list and management
- **Inventory** — Stock levels and adjustments
- **Payments** — Payment transactions and verification
- **Delivery Zones** — Governorate delivery settings
- **Financial Planning** — Break-even analysis and costs
- **Analytics** — Detailed sales and performance analytics
- **Reports** — Exportable reports
- **Settings** — Store configuration
- **Audit Logs** — Admin action history

## API Endpoints

Public:

```
GET    /api/products
GET    /api/products/:slug
GET    /api/products/featured
GET    /api/categories
GET    /api/cart
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/refresh
POST   /api/checkout/email/send-otp
POST   /api/checkout/email/verify-otp
POST   /api/checkout/quote
POST   /api/checkout/orders
POST   /api/coupons/validate
GET    /api/health
```

Admin (requires authentication):

```
GET    /api/admin/analytics/*
GET    /api/admin/orders/*
GET    /api/admin/products/*
GET    /api/admin/categories/*
GET    /api/admin/coupons/*
GET    /api/admin/customers/*
GET    /api/admin/inventory/*
GET    /api/admin/payments/*
GET    /api/admin/delivery-zones/*
GET    /api/admin/financial/*
GET    /api/admin/settings/*
GET    /api/admin/audit-logs
```

Full API documentation available at `/api/docs` (Swagger).

## Payment Setup

### Cash on Delivery (COD)

Enabled by default. No additional setup required.

### Online Payment (Paymob)

1. Set `PAYMENT_PROVIDER=paymob` in `backend/.env`
2. Configure Paymob credentials:
   - `PAYMOB_API_KEY`
   - `PAYMOB_INTEGRATION_ID_CARD`
   - `PAYMOB_INTEGRATION_ID_WALLET`
   - `PAYMOB_IFRAME_ID`
   - `PAYMOB_HMAC_SECRET`
3. Set up the webhook URL: `https://your-domain.com/api/payments/webhooks/paymob`

### Wallet Payments (InstaPay, Vodafone Cash, etc.)

1. Enable in admin settings or `.env`:
   - `INSTAPAY_ENABLED=true`
   - `VODAFONE_CASH_ENABLED=true`
2. Configure wallet numbers:
   - `INSTAPAY_ACCOUNT_REFERENCE=replace_with_the_account_owner_reference`
   - `VODAFONE_CASH_NUMBER=replace_with_the_account_owner_number`
3. Payment instructions are shown to customers at checkout
4. Admin manually verifies payment

### Fawry

1. Set `FAWRY_MERCHANT_CODE` and `FAWRY_SECURITY_KEY`
2. Set up the webhook URL: `https://your-domain.com/api/payments/webhooks/fawry`

## Email OTP Setup

Configure SMTP in `backend/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM_NAME=opps
EMAIL_FROM_ADDRESS=noreply@opps.com
```

For development without SMTP, enable console transport:

```env
DEV_EMAIL_OTP_CONSOLE=true
```

OTP codes will be logged to the console instead of sent via email.

## Image Upload

By default, uploads are stored locally in `backend/uploads/`.

For production, configure Cloudinary:

```env
UPLOAD_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
```

## Testing

### Backend Tests

```bash
cd backend
npm run test        # Unit tests
npm run test:e2e    # E2E tests
```

### Frontend Tests

```bash
cd frontend
npm run test        # Unit tests
```

## Docker

Start all services:

```bash
docker compose up -d
```

Start with Mongo Express (database admin UI):

```bash
docker compose --profile tools up -d
```

Mongo Express: http://localhost:8081

## Security Features

- Password hashing with bcrypt (12 rounds)
- JWT access tokens (short-lived, 15 minutes)
- JWT refresh tokens (long-lived, rotated on use)
- Refresh token revocation
- HTTP security headers (Helmet)
- CORS configured for frontend origin
- Rate limiting on all endpoints
- Request validation (class-validator)
- MongoDB injection protection (Mongoose)
- No secrets in frontend code
- No OTP values in API responses
- No card data storage
- Guest checkout without forced account creation
- Admin-only registration via seed script
- Role-based access control (RBAC)
- Permission-based authorization
- Audit logging for admin actions
- Safe error messages (no stack traces in production)
- File upload validation

## Remaining External Setup

- **MongoDB Atlas** — For production, use MongoDB Atlas instead of local
- **SMTP Provider** — SendGrid, Mailgun, or Gmail SMTP for email delivery
- **Cloudinary** — Or S3-compatible storage for image uploads
- **Paymob** — Egyptian payment gateway for card/wallet online payments
- **Fawry** — Alternative payment gateway
- **SSL Certificate** — For HTTPS in production

## License

Private — All rights reserved.
