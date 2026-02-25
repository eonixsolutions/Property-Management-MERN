# MERN Migration Plan — Real Estate Property Management System
> Source: `real-cpanel-prov1` (PHP 7.4 + MySQL)
> Target: MERN Stack (MongoDB + Express.js + React + Node.js)
> Created: 2026-02-22

---

## Table of Contents

1. [Core Modules to Migrate](#1-core-modules-to-migrate)
2. [Recommended Migration Order](#2-recommended-migration-order)
3. [Database Migration Strategy (MySQL → MongoDB)](#3-database-migration-strategy-mysql--mongodb)
4. [Risk Areas During Migration](#4-risk-areas-during-migration)
5. [Business Logic That Must Not Change](#5-business-logic-that-must-not-change)
6. [Suggested Improvements During Migration](#6-suggested-improvements-during-migration)
7. [Estimated Complexity Per Module](#7-estimated-complexity-per-module)
8. [Refactoring Opportunities](#8-refactoring-opportunities)
9. [Testing Strategy](#9-testing-strategy)
10. [Deployment Strategy](#10-deployment-strategy)
11. [Proposed MERN Project Structure](#11-proposed-mern-project-structure)
12. [Technology Stack Decisions](#12-technology-stack-decisions)

---

## 1. Core Modules to Migrate

### 1.1 Module Inventory

| # | Module | PHP Location | MERN Target | Priority |
|---|---|---|---|---|
| 1 | Authentication & RBAC | `auth/`, `config/config.php` | Express + JWT + React Context | P0 — Blocker |
| 2 | Dashboard | `index.php` | React page + `/api/dashboard` | P0 |
| 3 | Properties (Master + Units) | `properties/` | Full CRUD API + React pages | P0 |
| 4 | Tenants | `tenants/` | Full CRUD API + React pages | P0 |
| 5 | Rent Payments | `rent/` | Full CRUD API + React pages | P0 |
| 6 | Transactions | `transactions/` | Full CRUD API + React pages | P1 |
| 7 | Owner Payments | `owners/` | Full CRUD API + React pages | P1 |
| 8 | Cheque Register | `cheques/` | Full CRUD API + React pages | P1 |
| 9 | Maintenance Requests | `maintenance/` | Full CRUD API + React pages | P1 |
| 10 | Documents | `documents/` | Upload API (Multer/S3) + React | P1 |
| 11 | Accounting | `accounting/` | Aggregation API + React charts | P2 |
| 12 | Reports | `reports/` | Aggregation API + React | P2 |
| 13 | User Management | `users/` | Admin API + React pages | P2 |
| 14 | Notifications | `includes/notifications.php` | REST API + React header | P1 |
| 15 | Settings | `settings/` | REST API + React form | P2 |
| 16 | Recurring Invoices (Cron) | `cron/generate_invoices.php` | node-cron service | P1 |
| 17 | Landing Page | `landing.php` | React public page | P3 |
| 18 | Contracts | `contracts/` | API + React page | P3 |

### 1.2 Module Dependency Map

```
Authentication (JWT)
    └─► All other modules (every API route requires auth middleware)

Properties
    ├─► Tenants (property_id FK)
    ├─► Rent Payments (via tenants)
    ├─► Owner Payments (property.owner config)
    ├─► Maintenance Requests
    ├─► Documents
    ├─► Transactions
    ├─► Cheques
    └─► Dashboard (aggregated)

Tenants
    ├─► Rent Payments
    ├─► Tenant Cheques
    ├─► Documents
    └─► Recurring Invoice Cron

Owner Payments
    └─► Owner Cheques

Accounting / Reports
    └─► All financial tables (Transactions + Rent Payments + Owner Payments)
```

---

## 2. Recommended Migration Order

### Strategy: Backend-First, Module-by-Module (Strangler Fig Pattern)

Build the full Express API first, then replace React page-by-page while the PHP app remains live. Avoid a big-bang rewrite.

---

### Phase 0 — Foundation & Scaffolding (Week 1–2)

**Goal:** Establish project structure, CI/CD, and dev environment. No features yet.

```
Tasks:
  [ ] Initialize monorepo or separate repos (backend/, frontend/)
  [ ] Set up Node.js + Express skeleton
  [ ] Set up MongoDB Atlas (or local mongod)
  [ ] Configure .env for all environments (dev / staging / production)
  [ ] Set up ESLint + Prettier
  [ ] Set up Vitest (backend unit tests) + React Testing Library (frontend)
  [ ] Set up GitHub Actions CI pipeline (lint + test on PR)
  [ ] Configure CORS, Helmet, rate-limiter-flexible in Express
  [ ] Create base Mongoose connection module
  [ ] Initialize React project (Vite + TypeScript recommended)
  [ ] Create React Router skeleton with placeholder routes
  [ ] Create Axios instance with base URL + interceptors for JWT headers
```

**Deliverable:** Running "hello world" Express API + React app, both deployed to staging.

---

### Phase 1 — Authentication & User Management (Week 3–4)

**Goal:** Fully working login/logout/RBAC before any feature work.

```
Modules: Auth, User Management, Settings

Backend:
  [ ] User Mongoose model (email, password bcrypt, role, status, phone)
  [ ] Settings Mongoose model (1:1 with User)
  [ ] POST /api/auth/register
  [ ] POST /api/auth/login → issue accessToken (15min) + refreshToken (7d, httpOnly cookie)
  [ ] POST /api/auth/logout → clear refresh token cookie
  [ ] POST /api/auth/refresh → exchange refresh token for new access token
  [ ] GET  /api/auth/ping → session keepalive (resets refresh token TTL)
  [ ] authMiddleware (verify JWT, attach req.user)
  [ ] roleMiddleware (isAdmin, isSuperAdmin, requireRole)
  [ ] dataScopeMiddleware (inject user_id filter; admins get null = see all)
  [ ] GET/PUT /api/settings (user preferences: currency, timezone)
  [ ] GET/POST/PUT/DELETE /api/users (admin-only)
  [ ] Seed script: create Super Admin user (replace hardcoded demo bypass)

Frontend:
  [ ] Login page (email + password form)
  [ ] Protected route wrapper (redirect to /login if no token)
  [ ] AuthContext (current user, role, currency, login(), logout())
  [ ] Axios interceptors: attach Bearer token; on 401 → call /refresh → retry
  [ ] Idle timer (10 min inactivity → auto logout, 9 min → warning modal)
  [ ] Settings page (currency dropdown, timezone)
  [ ] User Management page (Admin only: list, add, edit)
```

**Deliverable:** Full auth flow working. Users can log in with role-based access. Idle timeout works.

---

### Phase 2 — Properties & Units (Week 5–6)

**Goal:** Core entity. Everything else depends on this.

```
Backend:
  [ ] Property Mongoose model (full schema, see Section 3)
  [ ] propertyOwnerMiddleware (user can only edit own properties; admins bypass)
  [ ] GET    /api/properties (scoped by user; query: ?type=master|unit&status=)
  [ ] POST   /api/properties
  [ ] GET    /api/properties/:id
  [ ] PUT    /api/properties/:id
  [ ] DELETE /api/properties/:id
  [ ] GET    /api/properties/dropdown (master+unit ordered list for <select>)
  [ ] POST   /api/properties/:id/images (Multer upload)
  [ ] DELETE /api/properties/:id/images/:imageId
  [ ] PATCH  /api/properties/:id/images/:imageId/primary
  [ ] Post-save hook: auto-update status (Occupied/Vacant) based on active tenants

Frontend:
  [ ] Properties list page (table with filters: status, type, search)
  [ ] Add Property form (all fields + unit toggle)
  [ ] Edit Property form
  [ ] Property detail page (overview, images, linked tenants, maintenance, docs)
  [ ] Image upload component (drag-and-drop)
  [ ] Property status badge component
```

**Deliverable:** Full property CRUD with image uploads.

---

### Phase 3 — Tenants & Lease Management (Week 7–8)

```
Backend:
  [ ] Tenant Mongoose model
  [ ] GET/POST/PUT/DELETE /api/tenants (scoped)
  [ ] POST-save hook: trigger generateRecurringInvoices on status='Active'
  [ ] POST-save hook: call updatePropertyStatus after tenant status change
  [ ] GET /api/tenants/:id/rent-payments (payment history)

Frontend:
  [ ] Tenants list page (filter: status, property)
  [ ] Add Tenant form (property dropdown uses /api/properties/dropdown)
  [ ] Edit Tenant form
  [ ] Tenant detail page (info, rent history, documents, cheques)
  [ ] Lease expiry badge (warn if within 30 days)
```

---

### Phase 4 — Rent Payments & Recurring Invoices (Week 9–10)

```
Backend:
  [ ] RentPayment Mongoose model
  [ ] GET  /api/rent-payments (filter: status, property, tenant, month)
  [ ] POST /api/rent-payments (record a payment)
  [ ] PUT  /api/rent-payments/:id (update status, payment method)
  [ ] DELETE /api/rent-payments/:id
  [ ] POST /api/rent-payments/generate (manual trigger: generate all invoices)
  [ ] generateRecurringInvoices(tenantId) service function (mirror PHP logic exactly)
  [ ] node-cron: run generateRecurringInvoices for all active tenants on 1st of each month

Frontend:
  [ ] Rent collection list page (filters, overdue highlighting)
  [ ] Record Payment form (tenant dropdown → auto-fill amount)
  [ ] "Generate Invoices" button with confirmation modal
  [ ] Payment status badges
```

---

### Phase 5 — Notifications System (Week 10, parallel)

```
Backend:
  [ ] GET /api/notifications (returns array of notification objects)
      Aggregations:
        - Overdue rent count + total amount
        - Rent due in next 7 days count
        - Pending maintenance count
        - Leases expiring in 30 days count
        - Tenant cheques to deposit (next 7 days)
        - Owner cheques due (next 7 days)
  [ ] Cache response in-memory (node-cache, 60s TTL per user_id)

Frontend:
  [ ] NotificationBell component in top navbar
  [ ] Notification dropdown (each item links to relevant page)
  [ ] Notification count badge (poll /api/notifications every 60s)
```

---

### Phase 6 — Transactions (Week 11)

```
Backend:
  [ ] Transaction Mongoose model
  [ ] GET/POST/PUT/DELETE /api/transactions
  [ ] Filter: type, category, property, tenant, date range

Frontend:
  [ ] Transactions list page (filters + search)
  [ ] Add/Edit Transaction form (Income/Expense toggle, category datalist)
```

---

### Phase 7 — Owner Payments & Cheques (Week 12–13)

```
Backend:
  [ ] OwnerPayment Mongoose model
  [ ] TenantCheque Mongoose model
  [ ] OwnerCheque Mongoose model
  [ ] CRUD endpoints for all three
  [ ] POST /api/owner-payments/generate (trigger recurring generation)
  [ ] generateRecurringOwnerPayments(propertyId) service function
  [ ] PATCH /api/cheques/tenant/:id/status
  [ ] PATCH /api/cheques/owner/:id/status

Frontend:
  [ ] Owner Payments list + generate button
  [ ] Cheque Register pages (tenant + owner tabs)
  [ ] Bulk add cheques form (multiple at once)
  [ ] Cheque status update (inline dropdown or modal)
```

---

### Phase 8 — Maintenance Requests (Week 14)

```
Backend:
  [ ] MaintenanceRequest Mongoose model
  [ ] GET/POST/PUT/DELETE /api/maintenance (scoped by property user_id)

Frontend:
  [ ] Maintenance list page (filters: priority, status, property)
  [ ] Add/Edit Maintenance form
  [ ] Maintenance detail view (with cost + completion date)
```

---

### Phase 9 — Documents (Week 15)

```
Backend:
  [ ] Document Mongoose model
  [ ] POST /api/documents (Multer multipart upload → local /uploads or S3)
  [ ] GET /api/documents (filter by property_id, tenant_id, type)
  [ ] DELETE /api/documents/:id (delete file + DB record)
  [ ] Serve files: static middleware or signed S3 URLs

Frontend:
  [ ] Documents list page (grouped by type)
  [ ] Upload form (file picker + metadata: title, type, property, tenant)
  [ ] Download / preview links
```

---

### Phase 10 — Accounting & Reports (Week 16–17)

```
Backend:
  [ ] GET /api/accounting/balance-sheet (MongoDB aggregation)
  [ ] GET /api/accounting/profit-loss   (MongoDB aggregation with date range)
  [ ] GET /api/accounting/trial-balance (MongoDB aggregation)
  [ ] GET /api/reports (composite: occupancy, rent collection rate, expense breakdown)
  [ ] GET /api/dashboard (all KPIs in ONE call — not 15 separate queries)

Frontend:
  [ ] Dashboard with Chart.js or Recharts (12-month cashflow bar chart)
  [ ] Balance Sheet page
  [ ] Profit & Loss page (date range picker)
  [ ] Trial Balance page
  [ ] Reports page (occupancy rate, expense breakdown pie chart)
```

---

### Phase 11 — Contracts & Landing Page (Week 18)

```
Backend:
  [ ] GET /api/contracts (lease contract management)
  [ ] Public search endpoint (landing page properties search)

Frontend:
  [ ] Contracts list page
  [ ] Public landing page (search properties by location/type)
```

---

### Phase 12 — QA, Performance & Cutover (Week 19–20)

```
  [ ] Full end-to-end testing (Playwright)
  [ ] Performance: add MongoDB indexes, API response caching
  [ ] Security audit: penetration test, OWASP top 10 review
  [ ] Load test: k6 or Artillery
  [ ] Data migration: run MySQL → MongoDB migration script on production data
  [ ] DNS cutover + monitoring setup
  [ ] Decommission PHP server
```

---

## 3. Database Migration Strategy (MySQL → MongoDB)

### 3.1 Decision: Keep SQL or Move to MongoDB?

**Recommendation: Use MongoDB with Mongoose.**

Rationale:
- Avoids N+1 query issues by embedding frequently-read data (e.g., owner info inside property)
- Flexible schema accommodates the many `ALTER TABLE` migrations seen in the PHP project
- Natural fit for the property→units hierarchy (nested documents or refs)
- JSON responses map directly to MongoDB documents (no ORM transformation needed)

If the team prefers a relational approach, use **PostgreSQL + Prisma** — it maps 1:1 to the existing schema with no redesign required.

---

### 3.2 MongoDB Schema Design

#### Collection: `users`
```js
{
  _id: ObjectId,
  email: String (unique, index),
  password: String,              // bcrypt hash, min rounds=12
  firstName: String,
  lastName: String,
  phone: String,
  role: String,                  // enum: ['Super Admin','Admin','Manager','User','Viewer']
  status: String,                // enum: ['Active','Inactive','Suspended']
  lastLogin: Date,
  emailVerified: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### Collection: `settings`
```js
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', unique index),
  currency: String,              // default: 'QAR'
  dateFormat: String,            // default: 'MM/DD/YYYY'
  timezone: String,              // default: 'UTC'
  notificationEmail: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### Collection: `properties`
```js
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', index),

  // Unit support (replaces parent_property_id + is_unit)
  type: String,                  // enum: ['master','unit']  ← cleaner than is_unit flag
  parentPropertyId: ObjectId,    // ref: 'Property', null for master
  unitName: String,

  // Owner info (embedded — replaces 4 separate columns)
  owner: {
    name: String,
    contact: String,
    email: String,
    phone: String,
    monthlyRentAmount: Number,
    rentStartDate: Date
  },

  propertyName: String (index),
  address: String,
  city: String,
  state: String,
  zipCode: String,
  country: String,               // default: 'Qatar'
  propertyType: String,          // enum: 12 types
  bedrooms: Number,
  bathrooms: Number,
  squareFeet: Number,
  purchasePrice: Number,
  currentValue: Number,
  purchaseDate: Date,
  defaultRent: Number,
  contactNumber: String,
  status: String,                // enum: ['Vacant','Occupied','Under Maintenance']
  notes: String,

  // Images (was a separate table via file system)
  images: [{
    _id: ObjectId,
    url: String,                 // local path or S3 URL
    filename: String,
    isPrimary: Boolean,
    uploadedAt: Date
  }],

  createdAt: Date,
  updatedAt: Date
}
Indexes: { userId: 1 }, { status: 1 }, { parentPropertyId: 1 }, { 'owner.name': 1 }
```

#### Collection: `tenants`
```js
{
  _id: ObjectId,
  propertyId: ObjectId (ref: 'Property', index),
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  alternatePhone: String,
  qatarId: String,
  moveInDate: Date,
  moveOutDate: Date,
  leaseStart: Date,
  leaseEnd: Date,
  monthlyRent: Number,
  securityDeposit: Number,
  status: String,                // enum: ['Active','Past','Pending']
  emergencyContact: {
    name: String,
    phone: String
  },
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
Indexes: { propertyId: 1 }, { status: 1 }, { leaseEnd: 1 }
```

#### Collection: `rentpayments`
```js
{
  _id: ObjectId,
  tenantId: ObjectId (ref: 'Tenant', index),
  propertyId: ObjectId (ref: 'Property', index),
  amount: Number,
  dueDate: Date (index),
  paidDate: Date,
  chequeNumber: String,
  paymentMethod: String,         // enum: 7 methods
  status: String,                // enum: ['Pending','Paid','Overdue','Partial']
  referenceNumber: String,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
Indexes: { tenantId: 1 }, { propertyId: 1 }, { status: 1 }, { dueDate: 1 }, { paidDate: 1 }
```

#### Collection: `ownerpayments`
```js
{
  _id: ObjectId,
  propertyId: ObjectId (ref: 'Property', index),
  userId: ObjectId (ref: 'User', index),
  amount: Number,
  paymentMonth: Date (stored as YYYY-MM-01, index),
  paidDate: Date,
  chequeNumber: String,
  paymentMethod: String,
  referenceNumber: String,
  notes: String,
  status: String,                // enum: ['Pending','Paid','Overdue']
  createdAt: Date,
  updatedAt: Date
}
Indexes: { propertyId: 1 }, { paymentMonth: 1 }, { status: 1 }
```

#### Collection: `transactions`
```js
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', index),
  propertyId: ObjectId (ref: 'Property', nullable),
  tenantId: ObjectId (ref: 'Tenant', nullable),
  type: String,                  // enum: ['Income','Expense']
  category: String (index),
  amount: Number,
  description: String,
  transactionDate: Date (index),
  paymentMethod: String,
  referenceNumber: String,
  isRecurring: Boolean,
  recurringFrequency: String,    // enum: ['Monthly','Weekly','Yearly', null]
  createdAt: Date,
  updatedAt: Date
}
Indexes: { userId: 1, transactionDate: -1 }, { type: 1 }, { category: 1 }
```

#### Collection: `tenantcheques`
```js
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User'),
  tenantId: ObjectId (ref: 'Tenant', index),
  propertyId: ObjectId (ref: 'Property'),
  rentPaymentId: ObjectId (ref: 'RentPayment', nullable),
  chequeNumber: String,
  bankName: String,
  chequeAmount: Number,
  chequeDate: Date,
  depositDate: Date (index),
  status: String,                // enum: ['Pending','Deposited','Bounced','Cleared']
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### Collection: `ownercheques`
```js
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User'),
  propertyId: ObjectId (ref: 'Property'),
  ownerPaymentId: ObjectId (ref: 'OwnerPayment', nullable),
  chequeNumber: String,
  bankName: String,
  chequeAmount: Number,
  chequeDate: Date (index),
  issueDate: Date,
  status: String,                // enum: ['Issued','Cleared','Bounced','Cancelled']
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### Collection: `maintenancerequests`
```js
{
  _id: ObjectId,
  propertyId: ObjectId (ref: 'Property', index),
  tenantId: ObjectId (ref: 'Tenant', nullable),
  title: String,
  description: String,
  priority: String,              // enum: ['Low','Medium','High','Emergency']
  status: String,                // enum: ['Pending','In Progress','Completed','Cancelled']
  cost: Number,
  completedDate: Date,
  createdAt: Date,
  updatedAt: Date
}
Indexes: { propertyId: 1 }, { status: 1 }, { priority: 1 }
```

#### Collection: `documents`
```js
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User'),
  propertyId: ObjectId (ref: 'Property', nullable),
  tenantId: ObjectId (ref: 'Tenant', nullable),
  documentType: String,          // enum: 5 types
  title: String,
  filePath: String,              // relative path or S3 key
  fileName: String,
  fileSize: Number,
  mimeType: String,              // add this — PHP didn't store it
  uploadDate: Date,
  createdAt: Date
}
```

---

### 3.3 Data Migration Script Plan

```
Step 1: Export MySQL → JSON
  mysqldump --no-tablespaces -u root property_db | mysql2json > export.json
  (or: use mysql2 Node driver to read each table)

Step 2: Transform
  For each table, run transform script:
    - Convert snake_case columns → camelCase fields
    - Convert integer IDs → ObjectIds (maintain a mapping table: mysql_id → mongo_id)
    - Merge properties.owner_* columns → embedded owner: {} object
    - Set properties.type = is_unit ? 'unit' : 'master'
    - Store parent_property_id as parentPropertyId (mapped ObjectId)
    - All ENUM values stay as strings (validated by Mongoose)
    - DATE strings → JS Date objects
    - DECIMAL → Number (JS float)
    - BOOLEAN (0/1) → true/false

Step 3: Validate
  Run validation scripts confirming:
    - All FK references resolve correctly
    - No orphaned documents
    - Financial totals match between MySQL and MongoDB

Step 4: Import
  mongoimport or Mongoose bulk insertMany()

Step 5: Verify
  Run parallel query comparison:
    - Compare dashboard totals (MySQL PHP app vs MongoDB Node app)
    - Compare rent payment counts and statuses
    - Compare notification counts
```

### 3.4 ID Reference Mapping

MySQL uses integer `id` columns everywhere. MongoDB uses ObjectId.
```js
// Create a migration mapping table
const idMap = {
  users: {},      // { mysql_id: mongo_objectId }
  properties: {},
  tenants: {},
  // ...
};
// After inserting each document, store: idMap.users[mysqlRow.id] = insertedDoc._id
// Use when resolving FK references
```

---

## 4. Risk Areas During Migration

### RISK-01 — Authentication Paradigm Shift
**Severity: CRITICAL**
- PHP uses server-side sessions; MERN uses JWT tokens
- The demo user plain-text password bypass in `auth/login.php:35` (`sidhykqatar@gmail.com / tz669933`) is a security vulnerability that **must be removed entirely**
- Session timeout (10 min) must be re-implemented via short-lived JWT (15 min) + refresh token (7 days) + frontend idle timer

**Mitigation:**
- Implement refresh token rotation with httpOnly cookies
- Replicate the exact idle timer logic in React (9-min warning, 10-min force logout)
- Replace demo user with a proper seed script using bcrypt

---

### RISK-02 — Self-Referential Property/Unit Model
**Severity: HIGH**
- MySQL handles self-joins naturally; MongoDB requires careful design
- The ordered dropdown query (`ORDER BY master first, then units`) becomes a multi-step aggregation

**Mitigation:**
- Add `type: 'master' | 'unit'` field (cleaner than `is_unit` flag)
- For dropdown: `{ $sort: { type: -1, parentPropertyName: 1, unitName: 1 } }` with `$lookup`
- Consider adding a `path` field (materialized path pattern) if unit nesting goes deeper than 1 level

---

### RISK-03 — Recurring Invoice Business Logic
**Severity: HIGH**
- Currently triggered in 3 places: tenant add, dashboard button, cron job
- Two separate functions: `generateRecurringInvoices` (backfill past months) vs `generateMonthlyInvoices` (future 12 months)
- Logic: no duplicate invoices, overdue auto-marking, current month cap

**Mitigation:**
- Single `invoiceService.generateForTenant(tenantId)` function in Express
- Mongoose pre-save hook on Tenant to call service when status changes to 'Active'
- node-cron scheduled for 1st of each month at 00:05 UTC
- Idempotency check: `findOne({ tenantId, dueDate: monthStart })` before insert

---

### RISK-04 — Dashboard Performance (N+1 Queries)
**Severity: HIGH**
- PHP dashboard runs **15+ separate SQL queries** per page load
- Notification system runs **6 more queries** in header on every page

**Mitigation:**
- Combine dashboard into ONE MongoDB aggregation pipeline returning all KPIs
- Expose as `GET /api/dashboard` — single call from React
- Notifications: dedicated endpoint + 60-second in-memory cache per user

---

### RISK-05 — Financial Calculation Accuracy
**Severity: HIGH**
- JavaScript `Number` type uses IEEE 754 floating point — can produce rounding errors for financial amounts (e.g., 0.1 + 0.2 ≠ 0.3)
- PHP uses `DECIMAL(10,2)` in MySQL which is exact

**Mitigation:**
- Use `decimal.js` or store amounts as **integers (cents/halalas)** in MongoDB: `amount_halalas: 150000` = 1,500.00 QAR
- Or use `mongoose-currency` plugin
- All display formatting still uses `formatCurrency()` utility

---

### RISK-06 — Data Isolation (Multi-User Scoping)
**Severity: HIGH**
- Every PHP query filters by `user_id` via `getQueryUserId()` / `getUserWhereClause()`
- Admins bypass this (see all data)
- Missing this in even ONE Express route = data leak

**Mitigation:**
- Create `dataScopeMiddleware` that attaches `req.scope` to every authenticated request:
  ```js
  req.scope = isAdmin(req.user) ? {} : { userId: req.user._id }
  ```
- Every Mongoose query: `Model.find({ ...req.scope, ...otherFilters })`
- Middleware unit tested with role mocking
- Security test: verify non-admin user cannot access other users' data

---

### RISK-07 — MySQL ENUM Fields → MongoDB Strings
**Severity: MEDIUM**
- MySQL ENUMs enforce values at the DB level
- MongoDB strings do not (without Mongoose validation)

**Mitigation:**
- Define all enums explicitly in Mongoose schema: `enum: ['Vacant','Occupied','Under Maintenance']`
- Add Mongoose pre-validate hooks for critical status fields
- Consider a shared `enums.js` constants file imported by both models and frontend

---

### RISK-08 — File Upload Path Migration
**Severity: MEDIUM**
- PHP stores files in `/uploads/properties/` with naming: `prop_{id}_{uniqid}.{ext}`
- Documents table stores relative paths
- During migration, existing files must be moved/re-referenced

**Mitigation:**
- Keep the same file naming convention initially to avoid re-uploading files
- Write a migration script to copy `uploads/` folder contents to new server or S3
- Update `file_path` in MongoDB documents to new paths/S3 URLs
- In production: serve old paths from PHP server temporarily during cutover

---

### RISK-09 — String-Interpolated SQL (Security Debt to Not Carry Over)
**Severity: MEDIUM**
- `notifications.php` uses string interpolation for all 6 queries: `WHERE p.user_id = $user_id`
- `config.php:92` uses `"SELECT role FROM users WHERE id = $user_id"`
- These are partially safe (integer cast from session) but bad pattern

**Mitigation:**
- In Express/Mongoose: always use parameterized queries or Mongoose model methods
- Never interpolate `req.params`, `req.query`, or `req.body` values into raw queries
- ESLint rule: `no-template-curly-in-string` in SQL context

---

### RISK-10 — No CSRF Protection in PHP
**Severity: MEDIUM**
- PHP forms have no CSRF tokens
- In MERN with JWT in httpOnly cookies: use `SameSite=Strict` cookie + CSRF token header

**Mitigation:**
- Use `csurf` npm package (Express) or implement Double Submit Cookie pattern
- If using JWT in Authorization header only (not cookies): CSRF not applicable

---

### RISK-11 — RTL Currency Display
**Severity: LOW**
- QAR, SAR, AED, BHD, KWD, OMR display symbol after the number: `1,500.00 ر.ق`
- Other currencies display symbol before: `$1,500.00`
- Must be replicated exactly in React

**Mitigation:**
- Port `formatCurrency()` exactly as a TypeScript utility function
- Alternatively use `Intl.NumberFormat` with locale detection:
  ```ts
  new Intl.NumberFormat('ar-QA', { style: 'currency', currency: 'QAR' }).format(1500)
  ```

---

### RISK-12 — Property Status Auto-Update Missing
**Severity: HIGH**
- PHP calls `updatePropertyStatusBasedOnTenants()` after every tenant operation
- If this is missed in Express, property statuses will be stale

**Mitigation:**
- Implement as Mongoose post-save + post-remove middleware on the Tenant model:
  ```js
  TenantSchema.post('save', async function() {
    await updatePropertyStatus(this.propertyId);
  });
  TenantSchema.post('remove', async function() {
    await updatePropertyStatus(this.propertyId);
  });
  ```
- The `updatePropertyStatus` function must never change `Under Maintenance` status (same rule as PHP)

---

## 5. Business Logic That Must Not Change

These are **exact behavioral requirements** — the MERN system must replicate them precisely.

### BL-01: Property Status Auto-Update Rules
```
Rule: After any tenant Create/Update/Delete:
  IF property.status == 'Under Maintenance' → DO NOTHING
  ELSE IF active tenant count > 0 → SET status = 'Occupied'
  ELSE → SET status = 'Vacant'

Implementation: Mongoose post-save/post-remove hook on Tenant model
```

### BL-02: Recurring Rent Invoice Generation Rules
```
Rule 1: Invoice generation window
  start = first day of lease_start month
  end   = MIN(lease_end month, CURRENT month)  ← never generate future months

Rule 2: No duplicate invoices
  Before INSERT: check if rent_payment exists for (tenantId, YYYY-MM)
  If exists → skip

Rule 3: Auto-status
  IF due_date < today → status = 'Overdue'
  IF due_date >= today → status = 'Pending'

Rule 4: Only for Active tenants
  IF tenant.status != 'Active' → skip entirely

Rule 5: Trigger points (must all work)
  - When tenant is added with status='Active'
  - Manual "Generate Invoices" button (dashboard or rent page)
  - Cron job: 1st of each month
```

### BL-03: Recurring Owner Payment Generation Rules
```
Rule 1: Only generate if property has owner configured
  IF owner.name is empty OR owner.monthlyRentAmount <= 0 → skip

Rule 2: Date range
  start = custom_start_date ?? owner.rentStartDate ?? current month
  end   = start + 12 months forward

Rule 3: No duplicates (same check as rent invoices)

Rule 4: Only 'Pending' status on creation (never auto-Overdue for owner payments)
```

### BL-04: Data Isolation Rules
```
Rule: Regular users (User/Viewer) only see data linked to properties they own (user_id match)
Rule: Admin/Manager/Super Admin roles bypass user_id filter (see all users' data)
Rule: The user_id anchor is always on the Properties collection
      → Tenants, Rent, Maintenance etc. are scoped THROUGH property.userId
```

### BL-05: User Role Hierarchy
```
Roles (highest to lowest): Super Admin > Admin > Manager > User > Viewer
Admin check (isAdmin): role IN ['Super Admin', 'Admin', 'Manager']
SuperAdmin check: role === 'Super Admin'

RBAC Rules:
  - Manager cannot create Admin or Super Admin users
  - Admin cannot create Super Admin users
  - User/Viewer cannot create any users
  - Under Maintenance status is never auto-changed by tenant operations
```

### BL-06: Session / Token Timeout
```
Exact timing (must match PHP behavior):
  Total inactivity allowed: 10 minutes (600 seconds)
  Warning shown at:         9 minutes (540 seconds after last activity)
  Force logout at:          10 minutes (600 seconds after last activity)

Activity tracking: mousedown, mousemove, keypress, scroll, touchstart, click

On warning:
  User clicks OK     → ping server to reset token → reset timer
  User clicks Cancel → immediate logout

On force logout → redirect to /login?timeout=1 (show timeout message)
```

### BL-07: Currency Display RTL Rules
```
RTL currencies (symbol AFTER number): QAR, SAR, AED, BHD, KWD, OMR
  Output: "1,500.00 ر.ق"

LTR currencies (symbol BEFORE number): USD, EUR, GBP, CAD, AUD, JPY, INR, PKR, EGP
  Output: "$1,500.00"

Always 2 decimal places. Use thousands separator.
```

### BL-08: Properties Dropdown Ordering
```
Order in all dropdowns (property select, tenant form, etc.):
  1. Master properties first (sorted alphabetically)
  2. Units under each master (sorted by unit_name, then property_name)

Display format:
  Master property: "Property Name"
  Unit: "Master Property Name - Unit Name"
```

### BL-09: Notification Thresholds
```
Overdue rent:     status='Pending' AND due_date < TODAY
Rent due soon:    status='Pending' AND due_date BETWEEN TODAY AND TODAY+7
Maintenance:      status IN ['Pending','In Progress']
Expiring leases:  tenant.status='Active' AND lease_end BETWEEN TODAY AND TODAY+30
Cheque deposit:   status IN ['Pending','Deposited'] AND deposit_date BETWEEN TODAY AND TODAY+7
Owner cheque due: status='Issued' AND cheque_date BETWEEN TODAY AND TODAY+7
```

### BL-10: Cheque Lifecycle States
```
Tenant cheques (money IN):  Pending → Deposited → Cleared
                            Pending → Bounced
Owner cheques (money OUT):  Issued → Cleared
                            Issued → Bounced
                            Issued → Cancelled
```

---

## 6. Suggested Improvements During Migration

### IMP-01: Combine Dashboard API Call
**Current:** 15+ separate PHP queries on every dashboard page load
**Improvement:** Single `GET /api/dashboard` MongoDB aggregation returning all KPIs at once
**Benefit:** Faster load, fewer round trips, cacheable

### IMP-02: Real-Time Notifications with WebSockets
**Current:** 6 DB queries on every page load via `header.php` include
**Improvement:** Socket.io room per `userId` — push notifications on relevant events
**Benefit:** No polling, instant alerts for overdue payments and maintenance

### IMP-03: Proper File Storage (S3/Cloudinary)
**Current:** Files stored in `/uploads/properties/` on server (no CDN, no backup)
**Improvement:** AWS S3 or Cloudinary with:
  - Auto-resizing for property images (thumbnail + full size)
  - Signed URLs for document access (time-limited, secure)
  - CDN distribution for property images
**Benefit:** Scalable, secure, faster image delivery

### IMP-04: Financial Amount Precision
**Current:** PHP + MySQL `DECIMAL(10,2)` (exact)
**Improvement:** Store amounts as integers (smallest currency unit: halalas/cents)
**Benefit:** Eliminates IEEE 754 floating point rounding errors in JavaScript

### IMP-05: Proper Pagination & Filtering
**Current:** PHP lists load all records into HTML tables (no pagination)
**Improvement:** Server-side pagination (`?page=1&limit=25`) + client-side filter state in URL params
**Benefit:** Performance with large datasets, shareable filter URLs

### IMP-06: API Response Caching
**Current:** No caching — every PHP request hits the database
**Improvement:**
  - Notifications: in-memory cache (node-cache) with 60s TTL per user
  - Dashboard KPIs: Redis cache with 5-minute TTL
  - Properties dropdown: Redis cache invalidated on property create/update
**Benefit:** Reduced DB load, faster UI response

### IMP-07: Audit Trail / Activity Log
**Current:** No audit trail — no way to know who changed what
**Improvement:** Add `auditlog` collection:
  ```js
  { userId, action, entity, entityId, changes: {before, after}, timestamp }
  ```
  Populated via Mongoose post-save middleware
**Benefit:** Compliance, debugging, multi-user accountability

### IMP-08: Remove Hardcoded Demo Bypass
**Current:** `sidhykqatar@gmail.com / tz669933` plain-text check in `login.php:35`
**Improvement:** Remove entirely; create proper seeder with bcrypt for initial admin
**Benefit:** Security — no production backdoor

### IMP-09: API Rate Limiting
**Current:** No rate limiting — brute force login is possible
**Improvement:** `express-rate-limit` on auth routes (5 attempts / 15 min per IP)
**Benefit:** Prevents brute force password attacks

### IMP-10: Input Validation with Zod/Joi
**Current:** PHP `sanitizeInput()` = trim + stripslashes + htmlspecialchars (minimal)
**Improvement:** Zod schemas for every API request body, with detailed error messages
**Benefit:** Type-safe validation, better error UX, auto-generated TypeScript types

### IMP-11: Email Notifications
**Current:** `settings.notification_email` flag exists but no email is ever sent
**Improvement:** Implement actual email sending with Nodemailer or SendGrid:
  - Overdue rent reminders
  - Lease expiry warnings (30 days before)
  - Cheque deposit reminders
**Benefit:** Activates an existing but unimplemented feature

### IMP-12: TypeScript Throughout
**Current:** PHP (typed), JS (untyped)
**Improvement:** TypeScript on both Express (backend) and React (frontend)
**Benefit:** Compile-time error catching, better IDE support, type-safe API responses

---

## 7. Estimated Complexity Per Module

| Module | Backend Complexity | Frontend Complexity | Overall | Main Reason |
|---|---|---|---|---|
| Auth & RBAC | **High** | **Medium** | **High** | JWT + refresh token + idle timer + role middleware |
| Dashboard | **High** | **Medium** | **High** | Complex aggregation replacing 15 queries |
| Properties + Units | **High** | **Medium** | **High** | Self-referential model, image upload, status auto-update |
| Tenants | **Medium** | **Medium** | **Medium** | Recurring invoice trigger on add |
| Rent Payments | **Medium** | **Low** | **Medium** | Recurring invoice service + overdue logic |
| Recurring Invoices (Cron) | **High** | N/A | **High** | Backfill logic, deduplication, auto-overdue marking |
| Notifications | **Medium** | **Low** | **Medium** | 6 aggregation queries + caching |
| Transactions | **Low** | **Low** | **Low** | Straightforward CRUD |
| Owner Payments | **Medium** | **Low** | **Medium** | Recurring generation logic |
| Cheque Register | **Low** | **Medium** | **Medium** | Dual cheque tables + status lifecycle |
| Maintenance | **Low** | **Low** | **Low** | Straightforward CRUD |
| Documents | **Medium** | **Medium** | **Medium** | Multer upload + S3 + file serving |
| Accounting | **High** | **Medium** | **High** | Complex MongoDB aggregations for financial reports |
| Reports | **Medium** | **Medium** | **Medium** | Multi-collection aggregations |
| User Management | **Low** | **Low** | **Low** | CRUD with role restriction middleware |
| Settings | **Low** | **Low** | **Low** | Simple 1:1 user settings |
| Data Migration Script | **High** | N/A | **High** | ID mapping, transform, validation |
| Contracts | **Low** | **Low** | **Low** | Straightforward |
| Landing Page | **Low** | **Medium** | **Low** | Public page, no auth |

**Total Complexity Score: ~20 weeks (2 devs, full-time)**

---

## 8. Refactoring Opportunities

### REF-01: Consolidate Owner Data Location
**PHP:** Owner info is 5 separate columns on `properties` table + separate `owners/` module
**MERN:** Embed `owner: {}` as a subdocument on Property model
**Impact:** Eliminates the conceptual confusion of the owners module

### REF-02: Unify Property Images into the Property Document
**PHP:** Images stored as files, referenced by path convention
**MERN:** Embed `images: [{ url, filename, isPrimary, uploadedAt }]` in Property document
**Impact:** Atomic property document — no separate image queries

### REF-03: Replace `is_unit + parent_property_id` with `type` Field
**PHP:** `is_unit TINYINT + parent_property_id` (two columns for one concept)
**MERN:** `type: 'master' | 'unit'` + `parentPropertyId`
**Impact:** Cleaner, more readable, easier to query

### REF-04: Unify `generateRecurringInvoices` and `generateMonthlyInvoices`
**PHP:** Two separate functions with overlapping logic
**MERN:** Single `invoiceService.generateForTenant(tenantId, options)` with mode parameter
**Impact:** Single source of truth, easier to test

### REF-05: Replace Page-Level Auth Includes with Middleware
**PHP:** Every file repeats `require_once '../config/config.php'; requireLogin();`
**MERN:** Single Express `authMiddleware` applied to all `/api` routes via `router.use()`
**Impact:** DRY, consistent enforcement, no forgotten auth checks

### REF-06: Centralize All Enums
**PHP:** ENUM values are scattered across SQL schema files
**MERN:** Single `src/constants/enums.ts` file:
  ```ts
  export const PROPERTY_STATUS = ['Vacant', 'Occupied', 'Under Maintenance'] as const;
  export const TENANT_STATUS = ['Active', 'Past', 'Pending'] as const;
  // ... etc.
  ```
  Used by both Mongoose models (validation) and React forms (dropdowns)

### REF-07: Dashboard in One API Call
**PHP:** 15+ separate database hits per page load
**MERN:** Single `/api/dashboard` MongoDB aggregation with `$facet` returning all metrics
**Impact:** 14× fewer database round trips

### REF-08: Standardize API Error Responses
**PHP:** Errors set `$error` variable, displayed in HTML — no standard format
**MERN:** All errors return consistent JSON:
  ```json
  { "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": {...} } }
  ```
  Handled by centralized Express error middleware

### REF-09: Replace `config.php` Helpers with a Service Layer
**PHP:** All helpers (formatCurrency, sanitizeInput, etc.) are global functions in config.php
**MERN:** Organized service classes:
  - `CurrencyService` (format, symbol, RTL detection)
  - `DateService` (format dates by user timezone)
  - `AuthService` (token generation, verification)
  - `InvoiceService` (recurring generation)
  - `NotificationService` (aggregation + caching)

### REF-10: Replace String-Based Dates with Proper Date Handling
**PHP:** Dates stored as `Y-m-d` strings in MySQL, formatted with `date()` function
**MERN:** Use `dayjs` or `date-fns` throughout; store as proper `Date` objects in MongoDB; format on the frontend using user's timezone from settings

---

## 9. Testing Strategy

### 9.1 Testing Pyramid

```
                     ┌───────────────┐
                     │   E2E Tests   │  (Playwright)
                     │  ~20 tests    │  Slow, few, critical paths
                     └───────┬───────┘
                   ┌─────────┴─────────┐
                   │ Integration Tests  │  (Supertest)
                   │  ~80 tests        │  API routes + DB
                   └─────────┬─────────┘
              ┌──────────────┴──────────────┐
              │       Unit Tests             │  (Vitest)
              │  ~200 tests                 │  Services, utilities, hooks
              └─────────────────────────────┘
```

### 9.2 Unit Tests (Vitest — Backend)

```
Priority targets:
  ✓ invoiceService.generateForTenant()
      - Returns 0 for non-Active tenants
      - Does not create duplicate invoices
      - Marks past due dates as 'Overdue'
      - Respects lease_end boundary
      - Respects current month cap (no future months)

  ✓ propertyService.updateStatus()
      - Sets 'Occupied' when active tenants > 0
      - Sets 'Vacant' when active tenants = 0
      - Does NOT change 'Under Maintenance' status

  ✓ ownerPaymentService.generate()
      - Skips properties without owner config
      - Generates exactly 12 months
      - Skips existing months (idempotent)

  ✓ authService
      - Token generation includes correct claims
      - Refresh token rotation works
      - Role comparison functions

  ✓ currencyUtil.format()
      - RTL currencies place symbol after number
      - LTR currencies place symbol before number
      - Always 2 decimal places

  ✓ dataScopeMiddleware
      - Admin role: scope = {}
      - Manager role: scope = {}
      - User role: scope = { userId: ... }
      - Viewer role: scope = { userId: ... }
```

### 9.3 Integration Tests (Supertest — API Routes)

```
Auth routes:
  POST /api/auth/login → 200 with tokens, 401 wrong creds, 400 missing fields
  POST /api/auth/logout → clears cookie
  POST /api/auth/refresh → new access token
  GET  /api/auth/ping → 200 if valid, 401 if expired

Properties:
  GET  /api/properties → returns only current user's properties
  GET  /api/properties → Admin returns all properties
  POST /api/properties → validates required fields
  PUT  /api/properties/:id → cannot update other user's property (403)
  DELETE /api/properties/:id → cascades to related records

Tenants:
  POST /api/tenants with status=Active → auto-generates rent invoices
  PUT  /api/tenants/:id status→Active  → auto-generates rent invoices
  PUT  /api/tenants/:id status→Past   → property status updates to Vacant

Rent:
  GET  /api/rent-payments?filter=overdue → only overdue records
  POST /api/rent-payments/generate → idempotent (safe to call twice)

Notifications:
  GET /api/notifications → correct counts for each notification type
```

### 9.4 Frontend Unit Tests (Vitest + React Testing Library)

```
Components to test:
  ✓ LoginForm — validation, submit, error display
  ✓ ProtectedRoute — redirects unauthenticated users
  ✓ AuthContext — provides correct role-based flags
  ✓ IdleTimer — shows warning at 9 min, logs out at 10 min
  ✓ CurrencyDisplay — RTL vs LTR symbol placement
  ✓ PropertyStatusBadge — correct color per status
  ✓ NotificationBell — shows count badge, clears on open
  ✓ PropertyForm — unit toggle hides owner fields
```

### 9.5 E2E Tests (Playwright)

```
Critical user flows:
  ✓ Login → Dashboard → Add Property → Add Tenant → Record Rent Payment
  ✓ Login → Session timeout warning → Stay logged in → Continue working
  ✓ Login → Session timeout → Auto logout → Redirect to login with message
  ✓ Add Active Tenant → Verify rent invoices auto-generated → Check dashboard
  ✓ Admin user → View all users' properties → Regular user → View own only
  ✓ Change currency to USD → All amounts display with $ symbol
  ✓ Change currency to QAR → All amounts display with ر.ق AFTER number
  ✓ Generate Owner Payments → Verify no duplicates created
  ✓ Add maintenance request → Notification badge increments
```

### 9.6 Parallel Verification Testing (During Migration)

While both PHP and MERN apps run simultaneously:
```
Daily automated checks:
  1. Query MySQL via PHP API → normalize → compare to MongoDB via Node API
  2. Compare total counts: properties, tenants, rent_payments, transactions
  3. Compare financial totals: total income, total expenses, net profit
  4. Compare notification counts per user
  5. Alert on any discrepancy > 0.01 (currency rounding threshold)
```

### 9.7 Security Testing

```
  ✓ Try to access other user's property via /api/properties/{other_user_property_id}
  ✓ Brute force login (should be rate-limited after 5 attempts)
  ✓ Expired JWT → 401 on all protected routes
  ✓ Tampered JWT → 401
  ✓ SQL injection equivalent (NoSQL injection via $where, $regex in query params)
  ✓ File upload: attempt to upload PHP/JS executable → rejected
  ✓ XSS: inject <script> in property name → verify it's escaped in React
  ✓ CSRF: attempt cross-origin POST without token → rejected
```

---

## 10. Deployment Strategy

### Strategy: Gradual Migration (Strangler Fig Pattern)

Never take the system down. Route traffic progressively from PHP to MERN.

```
┌──────────────────────────────────────────────────────────────┐
│                         Nginx / Load Balancer                 │
└────────────────────┬──────────────────┬───────────────────────┘
                     │                  │
             ┌───────▼──────┐   ┌───────▼──────┐
             │  PHP App     │   │  MERN App    │
             │  (existing)  │   │  (new)       │
             │  Port 8080   │   │  Port 3000   │
             └───────┬──────┘   └───────┬──────┘
                     │                  │
             ┌───────▼──────┐   ┌───────▼──────┐
             │   MySQL DB   │   │  MongoDB     │
             └──────────────┘   └──────────────┘
```

### Phase A — Infrastructure Setup (Week 1)
```
  [ ] Provision new server (or container): Node.js + MongoDB
  [ ] Set up Nginx on existing server as reverse proxy
  [ ] Configure SSL for both PHP domain and new MERN domain
  [ ] Set up staging environment (identical to production)
  [ ] Configure monitoring: UptimeRobot + Sentry (errors)
```

### Phase B — Shadow Mode (Week 3–10, during development)
```
  [ ] MERN API runs on api.yourdomain.com (separate subdomain)
  [ ] PHP app continues on www.yourdomain.com (unchanged)
  [ ] MERN app on staging.yourdomain.com (internal testing only)
  [ ] Database sync: MySQL → MongoDB one-way sync during dev (read-only mirror)
```

### Phase C — Feature Parity Verification (Week 16–18)
```
  [ ] All 15 modules implemented and tested in MERN
  [ ] Financial totals verified equal between MySQL and MongoDB
  [ ] Performance comparison: MERN API < PHP response times
  [ ] Security audit complete
  [ ] UAT with real users on staging
```

### Phase D — Data Migration (Week 19)
```
  [ ] Schedule 2-hour maintenance window (off-peak: Friday 2am)
  [ ] Freeze writes to PHP app (maintenance mode page)
  [ ] Run final MySQL → MongoDB migration script (delta sync)
  [ ] Verify data integrity (automated count + total comparison)
  [ ] Smoke test MERN app with production data
  [ ] If OK: proceed to cutover
  [ ] If NOT OK: restore PHP app (no data loss — PHP was frozen, not deleted)
```

### Phase E — Cutover (Week 20)
```
  [ ] Update Nginx to route 100% traffic to MERN app
  [ ] Update DNS TTL (reduce to 60s before cutover, restore after)
  [ ] Monitor error rate for 24 hours (Sentry alerts)
  [ ] Keep PHP server running (read-only) for 2 weeks as fallback
  [ ] After 2 weeks stable: decommission PHP server + MySQL
```

### Environment Configuration

```
# .env — Production
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/property_db
JWT_SECRET=<256-bit-random-secret>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
REFRESH_TOKEN_COOKIE_SECRET=<separate-secret>
AWS_S3_BUCKET=property-docs-prod
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
FRONTEND_URL=https://www.yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=5
CRON_INVOICE_SCHEDULE=0 5 1 * *    # 00:05 on 1st of each month
```

### Rollback Plan
```
At any point before Phase E final cutover:
  → Switch Nginx back to PHP app (< 30 seconds)
  → PHP app + MySQL unchanged throughout
  → No data loss (PHP was live until final cutover freeze)

After cutover, if critical issue found within 2 weeks:
  → Switch Nginx back to PHP app
  → Any new data entered in MERN must be manually reconciled
  → This is why the 2-week parallel period is important
```

---

## 11. Proposed MERN Project Structure

```
property-management-mern/
│
├── backend/                         # Express + Node.js API
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts          # Mongoose connection
│   │   │   ├── env.ts               # Validated env vars (zod)
│   │   │   └── constants/
│   │   │       └── enums.ts         # All ENUM values (shared with frontend)
│   │   │
│   │   ├── models/                  # Mongoose models
│   │   │   ├── User.ts
│   │   │   ├── Property.ts          # with embedded images[]
│   │   │   ├── Tenant.ts            # with post-save hooks
│   │   │   ├── RentPayment.ts
│   │   │   ├── OwnerPayment.ts
│   │   │   ├── Transaction.ts
│   │   │   ├── TenantCheque.ts
│   │   │   ├── OwnerCheque.ts
│   │   │   ├── MaintenanceRequest.ts
│   │   │   ├── Document.ts
│   │   │   └── Settings.ts
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts   # JWT verification
│   │   │   ├── role.middleware.ts   # isAdmin, isSuperAdmin
│   │   │   ├── scope.middleware.ts  # dataScopeMiddleware
│   │   │   ├── upload.middleware.ts # Multer config
│   │   │   └── error.middleware.ts  # Centralized error handler
│   │   │
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── invoice.service.ts   # generateRecurringInvoices
│   │   │   ├── ownerPayment.service.ts
│   │   │   ├── property.service.ts  # updatePropertyStatus
│   │   │   ├── notification.service.ts
│   │   │   └── currency.service.ts  # formatCurrency, RTL logic
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── property.routes.ts
│   │   │   ├── tenant.routes.ts
│   │   │   ├── rent.routes.ts
│   │   │   ├── transaction.routes.ts
│   │   │   ├── ownerPayment.routes.ts
│   │   │   ├── cheque.routes.ts
│   │   │   ├── maintenance.routes.ts
│   │   │   ├── document.routes.ts
│   │   │   ├── accounting.routes.ts
│   │   │   ├── report.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── settings.routes.ts
│   │   │   ├── notification.routes.ts
│   │   │   └── dashboard.routes.ts
│   │   │
│   │   ├── controllers/             # One per route file
│   │   ├── validators/              # Zod schemas per route
│   │   ├── cron/
│   │   │   └── invoiceCron.ts       # node-cron scheduler
│   │   ├── utils/
│   │   │   ├── ApiError.ts
│   │   │   ├── ApiResponse.ts
│   │   │   └── asyncHandler.ts
│   │   └── app.ts                   # Express app setup
│   │
│   ├── tests/
│   │   ├── unit/                    # Service unit tests
│   │   └── integration/             # Supertest API tests
│   ├── scripts/
│   │   └── migrate-mysql-to-mongo.ts # Data migration script
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                        # React + Vite + TypeScript
│   ├── src/
│   │   ├── api/
│   │   │   ├── axios.ts             # Configured Axios instance
│   │   │   ├── auth.api.ts
│   │   │   ├── property.api.ts
│   │   │   └── ...
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.tsx      # User, role, currency, login/logout
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useIdleTimer.ts      # 10-min inactivity logout
│   │   │   ├── useNotifications.ts  # Poll /api/notifications
│   │   │   └── useCurrency.ts       # formatCurrency with user's currency
│   │   │
│   │   ├── pages/
│   │   │   ├── auth/Login.tsx
│   │   │   ├── dashboard/Dashboard.tsx
│   │   │   ├── properties/
│   │   │   │   ├── PropertyList.tsx
│   │   │   │   ├── PropertyForm.tsx
│   │   │   │   └── PropertyDetail.tsx
│   │   │   ├── tenants/
│   │   │   ├── rent/
│   │   │   ├── transactions/
│   │   │   ├── owners/
│   │   │   ├── cheques/
│   │   │   ├── maintenance/
│   │   │   ├── documents/
│   │   │   ├── accounting/
│   │   │   ├── reports/
│   │   │   ├── users/
│   │   │   └── settings/
│   │   │
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── TopBar.tsx
│   │   │   │   └── AppLayout.tsx
│   │   │   ├── common/
│   │   │   │   ├── ProtectedRoute.tsx
│   │   │   │   ├── NotificationBell.tsx
│   │   │   │   ├── CurrencyDisplay.tsx
│   │   │   │   ├── StatusBadge.tsx
│   │   │   │   ├── PropertyDropdown.tsx
│   │   │   │   ├── SessionWarningModal.tsx
│   │   │   │   └── DataTable.tsx    # Reusable paginated table
│   │   │   └── charts/
│   │   │       ├── CashflowChart.tsx
│   │   │       └── ExpensePieChart.tsx
│   │   │
│   │   ├── utils/
│   │   │   ├── currency.ts          # formatCurrency (RTL-aware)
│   │   │   ├── date.ts              # formatDate with timezone
│   │   │   └── enums.ts             # Shared constants
│   │   │
│   │   ├── router.tsx               # React Router v6 routes
│   │   └── main.tsx
│   │
│   ├── tests/
│   │   ├── unit/
│   │   └── e2e/                     # Playwright tests
│   ├── package.json
│   └── vite.config.ts
│
└── shared/                          # (Optional) shared types
    └── types/
        ├── api.types.ts             # API request/response shapes
        └── models.types.ts          # Shared model interfaces
```

---

## 12. Technology Stack Decisions

| Category | Chosen Technology | Alternative | Reason |
|---|---|---|---|
| Runtime | Node.js 20 LTS | Bun | LTS stability, ecosystem maturity |
| Framework | Express.js | Fastify, NestJS | Familiarity, flexibility, ecosystem |
| Database | MongoDB + Mongoose | PostgreSQL + Prisma | Flexible schema, JSON-native, no JOIN overhead for this use case |
| Auth | JWT (accessToken 15m + refreshToken 7d) | Sessions | Stateless API, supports multiple clients |
| Validation | Zod | Joi, express-validator | TypeScript integration, type inference |
| File Upload | Multer + AWS S3 | Cloudinary | Control over storage costs |
| Cron | node-cron | Agenda, Bull | Simple, no queue overhead needed |
| Caching | node-cache | Redis | Low-scale start; upgrade to Redis when needed |
| Frontend | React 18 + Vite + TypeScript | Next.js | No SSR needed (auth-gated app), faster dev build |
| Routing | React Router v6 | TanStack Router | Industry standard |
| State | React Context + TanStack Query | Redux | Right-sized for this app |
| Charts | Recharts | Chart.js | React-native, TypeScript-friendly |
| HTTP Client | Axios | fetch | Interceptors for JWT refresh, better DX |
| Testing (BE) | Vitest + Supertest | Jest + supertest | ESM support, faster |
| Testing (FE) | Vitest + RTL + Playwright | Jest + Cypress | Unified test runner |
| Styling | Tailwind CSS | CSS Modules | Rapid UI development |
| API Doc | Swagger / OpenAPI | Postman | Auto-generated from Zod schemas |

---

*End of MERN Migration Plan. Cross-reference with `real-cpanel-prov1-analysis.md` for full PHP source details.*
