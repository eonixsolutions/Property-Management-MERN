# real-cpanel-prov1 — Complete PHP Project Analysis
> Generated: 2026-02-22 | For MERN migration reference

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Directory Structure](#2-directory-structure)
3. [Core Modules](#3-core-modules)
4. [Authentication Flow](#4-authentication-flow)
5. [Database Schema & Relationships](#5-database-schema--relationships)
6. [Business-Critical Logic](#6-business-critical-logic)
7. [Reusable Utilities](#7-reusable-utilities)
8. [Migration Issues & Recommendations](#8-migration-issues--recommendations)

---

## 1. Project Overview

| Property | Value |
|---|---|
| **Type** | Real Estate / Property Management System |
| **Language** | PHP 7.4+ |
| **Database** | MySQL 5.7+ (`property_db`) |
| **Architecture** | Traditional MVC-style, server-side rendered HTML |
| **Auth** | PHP session-based (10-minute timeout) |
| **Target Market** | Qatar-based property managers (default currency: QAR) |
| **Multi-user** | Yes — 5 RBAC roles |
| **Multi-currency** | Yes — 15 currencies |

---

## 2. Directory Structure

```
real-cpanel-prov1/
├── .htaccess                        # Apache security rules
├── index.php                        # Dashboard (main entry point)
├── landing.php                      # Public landing/search page
├── setup.php                        # One-time setup script
├── unit.php                         # Unit utility
├── auto_contract.php                # Auto contract generator
│
├── auth/
│   ├── login.php                    # Login form + handler
│   ├── register.php                 # Registration form + handler
│   ├── logout.php                   # Session destroy + redirect
│   └── ping.php                     # AJAX session keepalive endpoint
│
├── config/
│   ├── config.php                   # Core config, session, RBAC, helpers (344 lines)
│   └── database.php                 # DB connection with reuse/retry logic (110 lines)
│
├── database/
│   ├── schema.sql                   # Canonical schema (drop+create all tables)
│   ├── complete_schema_xampp.sql    # Full schema with seeded admin user
│   ├── real.sql                     # Full DB dump
│   └── migrate_*.php / *.sql       # Incremental migration scripts
│
├── includes/
│   ├── header.php                   # Sidebar nav, top bar, layout wrapper open
│   ├── footer.php                   # Layout wrapper close + session-timeout JS
│   ├── notifications.php            # getNotifications(), getNotificationCount()
│   ├── recurring_invoices.php       # generateRecurringInvoices(), generateMonthlyInvoices()
│   └── recurring_owner_payments.php # generateRecurringOwnerPayments(), generateMonthlyOwnerPayments()
│
├── properties/                      # Property CRUD + image management
├── tenants/                         # Tenant CRUD + view
├── rent/                            # Rent payment recording + listing
├── transactions/                    # Income/Expense CRUD
├── maintenance/                     # Maintenance request CRUD + view
├── documents/                       # Document upload + listing
├── owners/                          # Owner profile + payment generation
├── cheques/                         # Tenant & owner cheque register
├── contracts/                       # Lease contract management
├── accounting/                      # Balance sheet, P&L, trial balance
├── reports/                         # Financial reports
├── agents/                          # Agent profile
├── users/                           # Admin user management
├── settings/                        # User preferences (currency, timezone)
├── notifications/                   # Notifications center page
│
├── assets/
│   ├── css/style.css                # Main stylesheet (29 KB)
│   └── js/script.js                 # Minimal JS helpers (1.7 KB)
│
├── uploads/
│   ├── .htaccess                    # Blocks direct PHP execution in uploads
│   └── properties/                  # Property images storage
│
├── cron/
│   └── generate_invoices.php        # Cron job: generate rent + owner payment invoices
│
└── [deployment scripts]             # *.sh / *.ps1 VPS deployment & fix scripts
```

---

## 3. Core Modules

### 3.1 Authentication & Session (`auth/`, `config/config.php`)
Manages login, logout, registration, role-based access, and session timeout.
- Session timeout: **10 minutes** (server + client)
- Client-side session keepalive via `auth/ping.php` (AJAX `fetch`)
- RBAC: Super Admin > Admin > Manager > User > Viewer

### 3.2 Properties (`properties/`)
Core entity. Supports two levels:
- **Master Properties** — standalone buildings / villas
- **Units** — sub-units of a master (linked via `parent_property_id`)

CRUD: `index.php`, `add.php`, `edit.php`, `view.php`
Image management: `upload_image.php`, `delete_image.php`, `set_primary_image.php`

### 3.3 Tenants (`tenants/`)
Tracks the full tenant lifecycle: application → active lease → past.
- Linked to a property (or unit)
- Qatar ID field for local compliance
- Emergency contacts
- Auto-triggers rent invoice generation on add

### 3.4 Rent Collection (`rent/`)
Records and tracks monthly rent payments.
- `rent/index.php` — filterable list (all / overdue / pending / paid)
- `rent/add.php` — record a payment; JS auto-fills amount from tenant's `monthly_rent`
- Statuses: `Pending`, `Paid`, `Overdue`, `Partial`

### 3.5 Transactions (`transactions/`)
General income/expense ledger (not just rent).
- Types: `Income`, `Expense`
- Free-text `category` with `<datalist>` suggestions
- Optional link to property and tenant
- Supports `is_recurring` flag + `recurring_frequency`

### 3.6 Owner Payments (`owners/`)
Tracks what the management company owes property owners monthly.
- Owner details embedded in `properties` table (`owner_name`, `monthly_rent_to_owner`)
- `owners/index.php` — list all owner payment records
- `owners/generate.php` — manually trigger payment generation
- `includes/recurring_owner_payments.php` — bulk generation logic

### 3.7 Cheque Register (`cheques/`)
Dual cheque tracking: tenant-paid cheques IN and owner-paid cheques OUT.

**Tenant Cheques** (`cheques/tenants.php`, `add_tenant_cheque.php`, `edit_tenant_cheque.php`)
- Statuses: `Pending`, `Deposited`, `Bounced`, `Cleared`
- Linked optionally to a `rent_payment_id`
- Bulk add: `add_multiple_tenant_cheques.php`

**Owner Cheques** (`cheques/owners.php`, `add_owner_cheque.php`, `edit_owner_cheque.php`)
- Statuses: `Issued`, `Cleared`, `Bounced`, `Cancelled`
- Linked optionally to `owner_payment_id`
- Bulk add: `add_multiple_owner_cheques.php`

### 3.8 Maintenance Requests (`maintenance/`)
- Priority: `Low`, `Medium`, `High`, `Emergency`
- Status: `Pending`, `In Progress`, `Completed`, `Cancelled`
- Linked to property and optionally tenant
- Cost tracking + completion date

### 3.9 Documents (`documents/`)
File uploads stored under `uploads/` directory.
- Types: `Lease Agreement`, `Invoice`, `Receipt`, `Contract`, `Other`
- Linked to user, property, and/or tenant

### 3.10 Accounting (`accounting/`)
- `balance_sheet.php` — Assets vs Liabilities vs Equity
- `profit_loss.php` — Income vs Expenses by period
- `trial_balance.php` — Account balances
All derived from `transactions` + `rent_payments` + `owner_payments` tables.

### 3.11 Reports (`reports/index.php`)
Aggregated financial reporting across all modules.

### 3.12 User Management (`users/`)
Admin-only. CRUD for system users.
- Role-restricted: only Admin+ can add/edit users
- Role hierarchy enforced: Manager cannot create Admin
- Status: `Active`, `Inactive`, `Suspended`

### 3.13 Notifications (`includes/notifications.php`, `notifications/index.php`)
In-app alert system, computed on every page load via header include.
6 notification types (see Section 6.5).

### 3.14 Settings (`settings/index.php`)
Per-user preferences stored in `settings` table.
- Currency selection (15 options, default QAR)
- Date format, timezone, email notifications toggle

### 3.15 Dashboard (`index.php`)
Aggregates data from all modules into a single view:
- KPI cards: total properties, occupancy rate, monthly income/expenses, net profit
- 12-month cashflow chart (Chart.js)
- Upcoming rent due list
- Recent transactions table
- Expenses by category breakdown
- Pending maintenance count

---

## 4. Authentication Flow

### 4.1 Login Sequence

```
User submits login form (POST /auth/login.php)
  │
  ├─ sanitizeInput($email)
  ├─ Prepared statement: SELECT id, email, password, first_name, last_name
  │    FROM users WHERE email = ?
  │
  ├─ if result == 0 rows → "Invalid email or password"
  │
  ├─ SPECIAL CASE: if email === 'sidhykqatar@gmail.com' && password === 'tz669933'
  │    → plain-text check passes (demo/seed user bypass)
  │
  ├─ else → password_verify($password, $user['password'])
  │
  ├─ On failure → "Invalid email or password"
  │
  └─ On success:
       $_SESSION['user_id']       = $user['id']
       $_SESSION['user_email']    = $user['email']
       $_SESSION['user_name']     = first_name . ' ' . last_name
       $_SESSION['last_activity'] = time()
       │
       ├─ Query: SELECT role FROM users WHERE id = ? → $_SESSION['user_role']
       ├─ Query: SELECT currency FROM settings WHERE user_id = ? → $_SESSION['user_currency']
       │
       └─ redirect → /index.php (dashboard)
```

### 4.2 Session Enforcement (every page request)

```
config/config.php included via require_once
  │
  ├─ session_start() (httponly cookie, strict mode)
  │
  ├─ if $_SESSION['user_id'] && $_SESSION['last_activity']:
  │     timeSinceLastActivity = time() - last_activity
  │     if > 600 seconds:
  │       session_unset() + session_destroy()
  │       if AJAX → JSON {timeout: true, redirect: login?timeout=1}
  │       else    → redirect /auth/login.php?timeout=1
  │
  └─ Update $_SESSION['last_activity'] = time()
```

### 4.3 Session Keepalive (client-side)

Implemented in `includes/footer.php` JavaScript (IIFE):

```
Page load → updateActivity()
  │
  ├─ Track: mousedown, mousemove, keypress, scroll, touchstart, click
  │
  ├─ 9 min (540s) → showWarning()
  │    confirm("...stay logged in?")
  │    OK  → fetch /auth/ping.php  → server resets $_SESSION['last_activity']
  │    Cancel → redirect /auth/logout.php
  │
  ├─ 10 min (600s) → logoutUser()
  │    redirect /auth/login.php?timeout=1
  │
  └─ setInterval(30s) → check timeSinceActivity for tab-switch handling
```

### 4.4 Authorization Functions

| Function | Logic |
|---|---|
| `isLoggedIn()` | `isset($_SESSION['user_id'])` |
| `requireLogin()` | If not logged in → redirect `/auth/login.php` |
| `getCurrentUserId()` | Returns `$_SESSION['user_id']` |
| `getCurrentUserRole()` | Returns cached `$_SESSION['user_role']` or DB lookup |
| `isAdmin()` | role in `['Super Admin', 'Admin', 'Manager']` |
| `isSuperAdmin()` | role === `'Super Admin'` |
| `requireAdmin()` | `requireLogin()` + `isAdmin()` check |
| `getQueryUserId()` | Returns `null` for admins (see all), user_id for regular users |
| `getUserWhereClause($alias)` | Admins: `''`, others: `WHERE {alias}.user_id = {id}` |

### 4.5 RBAC Matrix

| Action | Super Admin | Admin | Manager | User | Viewer |
|---|---|---|---|---|---|
| View all users' data | Yes | Yes | Yes | Own only | Own only |
| Add/Edit/Delete Users | Yes | Yes | Yes | No | No |
| Full property CRUD | Yes | Yes | Yes | Yes | View |
| Financial reports | Yes | Yes | Yes | Yes | View |

---

## 5. Database Schema & Relationships

### 5.1 Entity Relationship Overview

```
users (1) ─────────────────────────────── (many) properties
                                                  │
                    ┌─────────────────────────────┤ parent_property_id (self-ref for units)
                    │                             │
               properties                         │
                    │                             │
          ┌─────────┴──────────┐                  │
          │                    │                  │
       tenants            owner_payments          │
          │              (user_id, property_id)   │
          │                                       │
    ┌─────┴─────┐                                 │
    │           │                                 │
rent_payments  tenant_cheques ──────── rent_payments (rent_payment_id FK)
                                                  │
                                     owner_cheques ── owner_payments (owner_payment_id FK)
                                                  │
                              maintenance_requests ── properties, tenants
                                                  │
                                         documents ── users, properties, tenants
                                                  │
                                      transactions ── users, properties, tenants
                                                  │
                                          settings ── users (1:1)
```

### 5.2 Table Definitions

#### `users`
```sql
id INT PK AUTO_INCREMENT
email VARCHAR(255) UNIQUE NOT NULL
password VARCHAR(255) NOT NULL          -- bcrypt hash
first_name, last_name VARCHAR(100) NOT NULL
role ENUM('Super Admin','Admin','Manager','User','Viewer') DEFAULT 'User'
status ENUM('Active','Inactive','Suspended') DEFAULT 'Active'
last_login TIMESTAMP NULL
email_verified BOOLEAN DEFAULT FALSE
phone VARCHAR(20)
created_at, updated_at TIMESTAMP
```

#### `properties`
```sql
id INT PK AUTO_INCREMENT
user_id INT FK → users(id) ON DELETE CASCADE
parent_property_id INT FK → properties(id) ON DELETE CASCADE  -- NULL = master property
unit_name VARCHAR(100)                  -- display name for units
is_unit TINYINT(1) DEFAULT 0
owner_name VARCHAR(255)                 -- property owner (landlord)
owner_contact, owner_email, owner_phone
monthly_rent_to_owner DECIMAL(10,2)    -- what management pays the owner
owner_rent_start_date DATE             -- when owner payments begin
property_name VARCHAR(255) NOT NULL
address VARCHAR(500), city, state, zip_code, country DEFAULT 'Qatar'
property_type ENUM(12 types + 'Other') NOT NULL
bedrooms INT, bathrooms DECIMAL(3,1), square_feet INT
purchase_price, current_value DECIMAL(12,2)
purchase_date DATE
default_rent DECIMAL(10,2)             -- default rent for new tenants
contact_number VARCHAR(20)
status ENUM('Vacant','Occupied','Under Maintenance') DEFAULT 'Vacant'
notes TEXT
created_at, updated_at TIMESTAMP
```

#### `tenants`
```sql
id INT PK AUTO_INCREMENT
property_id INT FK → properties(id) ON DELETE SET NULL
first_name, last_name VARCHAR(100) NOT NULL
email VARCHAR(255), phone, alternate_phone VARCHAR(20)
qatar_id VARCHAR(20)                    -- local ID document
move_in_date, move_out_date DATE
lease_start, lease_end DATE
monthly_rent DECIMAL(10,2) NOT NULL
security_deposit DECIMAL(10,2)
status ENUM('Active','Past','Pending') DEFAULT 'Active'
emergency_contact_name VARCHAR(100), emergency_contact_phone VARCHAR(20)
notes TEXT
created_at, updated_at TIMESTAMP
```

#### `transactions`
```sql
id INT PK AUTO_INCREMENT
user_id INT FK → users(id) ON DELETE CASCADE
property_id INT FK → properties(id) ON DELETE SET NULL (nullable)
tenant_id INT FK → tenants(id) ON DELETE SET NULL (nullable)
type ENUM('Income','Expense') NOT NULL
category VARCHAR(100) NOT NULL          -- free text with datalist suggestions
amount DECIMAL(10,2) NOT NULL
description TEXT
transaction_date DATE NOT NULL
payment_method ENUM(7 methods) DEFAULT 'Bank Transfer'
reference_number VARCHAR(100)
is_recurring BOOLEAN DEFAULT FALSE
recurring_frequency ENUM('Monthly','Weekly','Yearly') NULL
created_at, updated_at TIMESTAMP
```

#### `rent_payments`
```sql
id INT PK AUTO_INCREMENT
tenant_id INT FK → tenants(id) ON DELETE CASCADE
property_id INT FK → properties(id) ON DELETE CASCADE
amount DECIMAL(10,2) NOT NULL
due_date DATE NOT NULL
paid_date DATE NULL
cheque_number VARCHAR(50)
payment_method ENUM(7 methods) DEFAULT 'Cash'
status ENUM('Pending','Paid','Overdue','Partial') DEFAULT 'Pending'
reference_number VARCHAR(100)
notes TEXT
created_at, updated_at TIMESTAMP
```

#### `owner_payments`
```sql
id INT PK AUTO_INCREMENT
property_id INT FK → properties(id) ON DELETE CASCADE
user_id INT FK → users(id) ON DELETE CASCADE
amount DECIMAL(10,2) NOT NULL
payment_month DATE NOT NULL             -- stored as YYYY-MM-01
paid_date DATE NULL
cheque_number VARCHAR(50)
payment_method ENUM(7 methods) DEFAULT 'Bank Transfer'
reference_number VARCHAR(100), notes TEXT
status ENUM('Pending','Paid','Overdue') DEFAULT 'Pending'
created_at, updated_at TIMESTAMP
```

#### `tenant_cheques`
```sql
id INT PK AUTO_INCREMENT
user_id INT FK → users(id) ON DELETE CASCADE
tenant_id INT FK → tenants(id) ON DELETE CASCADE
property_id INT FK → properties(id) ON DELETE CASCADE
rent_payment_id INT FK → rent_payments(id) ON DELETE SET NULL (optional link)
cheque_number VARCHAR(50) NOT NULL
bank_name VARCHAR(255)
cheque_amount DECIMAL(10,2) NOT NULL
cheque_date DATE NOT NULL
deposit_date DATE NULL
status ENUM('Pending','Deposited','Bounced','Cleared') DEFAULT 'Pending'
notes TEXT
created_at, updated_at TIMESTAMP
```

#### `owner_cheques`
```sql
id INT PK AUTO_INCREMENT
user_id INT FK → users(id) ON DELETE CASCADE
property_id INT FK → properties(id) ON DELETE CASCADE
owner_payment_id INT FK → owner_payments(id) ON DELETE SET NULL (optional link)
cheque_number VARCHAR(50) NOT NULL
bank_name VARCHAR(255)
cheque_amount DECIMAL(10,2) NOT NULL
cheque_date DATE NOT NULL
issue_date DATE NULL
status ENUM('Issued','Cleared','Bounced','Cancelled') DEFAULT 'Issued'
notes TEXT
created_at, updated_at TIMESTAMP
```

#### `maintenance_requests`
```sql
id INT PK AUTO_INCREMENT
property_id INT FK → properties(id) ON DELETE CASCADE
tenant_id INT FK → tenants(id) ON DELETE SET NULL (nullable)
title VARCHAR(255) NOT NULL
description TEXT NOT NULL
priority ENUM('Low','Medium','High','Emergency') DEFAULT 'Medium'
status ENUM('Pending','In Progress','Completed','Cancelled') DEFAULT 'Pending'
cost DECIMAL(10,2) NULL
completed_date DATE NULL
created_at, updated_at TIMESTAMP
```

#### `documents`
```sql
id INT PK AUTO_INCREMENT
user_id INT FK → users(id) ON DELETE CASCADE
property_id INT FK → properties(id) ON DELETE SET NULL (nullable)
tenant_id INT FK → tenants(id) ON DELETE SET NULL (nullable)
document_type ENUM('Lease Agreement','Invoice','Receipt','Contract','Other') NOT NULL
title VARCHAR(255) NOT NULL
file_path VARCHAR(500) NOT NULL         -- relative path under uploads/
file_name VARCHAR(255) NOT NULL
file_size INT NULL
upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### `settings`
```sql
id INT PK AUTO_INCREMENT
user_id INT UNIQUE FK → users(id) ON DELETE CASCADE  -- 1:1 with users
currency VARCHAR(10) DEFAULT 'QAR'
date_format VARCHAR(20) DEFAULT 'Y-m-d'
timezone VARCHAR(50) DEFAULT 'UTC'
notification_email BOOLEAN DEFAULT TRUE
created_at, updated_at TIMESTAMP
```

### 5.3 Key Foreign Key Cascade Behaviors

| Relationship | On Parent Delete |
|---|---|
| `users` → `properties` | CASCADE (deletes all user's properties) |
| `properties` → `properties` (unit) | CASCADE (deletes child units) |
| `properties` → `tenants` | SET NULL (tenant record kept, property_id nulled) |
| `tenants` → `rent_payments` | CASCADE |
| `properties` → `rent_payments` | CASCADE |
| `rent_payments` → `tenant_cheques` | SET NULL |
| `owner_payments` → `owner_cheques` | SET NULL |
| `users` → `settings` | CASCADE |

---

## 6. Business-Critical Logic

### 6.1 Property Status Auto-Update
**File:** [config/config.php:301](real-cpanel-prov1/config/config.php#L301) — `updatePropertyStatusBasedOnTenants()`

Called after every tenant add/edit/delete. Logic:
```
if property.status == 'Under Maintenance' → skip (never auto-change)
count Active tenants for property
  > 0 → SET status = 'Occupied'
  = 0 → SET status = 'Vacant'
```

### 6.2 Recurring Rent Invoice Generation
**File:** [includes/recurring_invoices.php](real-cpanel-prov1/includes/recurring_invoices.php) — `generateRecurringInvoices($tenant_id)`

Triggered when:
- A tenant is added with `status = 'Active'`
- Dashboard "Generate Invoices" button is clicked
- Cron job: `cron/generate_invoices.php`

Logic:
```
start_date = first day of lease_start month
end_date   = MIN(lease_end, current month)  -- never generate future months

For each month in [start_date .. end_date]:
  Check if rent_payment already exists for (tenant_id, YYYY-MM)
  If NOT exists:
    due_date = YYYY-MM-01
    status   = 'Overdue' if due_date < today, else 'Pending'
    INSERT INTO rent_payments (tenant_id, property_id, amount, due_date, status)
```

### 6.3 Recurring Owner Payment Generation
**File:** [includes/recurring_owner_payments.php](real-cpanel-prov1/includes/recurring_owner_payments.php) — `generateRecurringOwnerPayments($property_id)`

Only runs if `properties.owner_name` is set AND `monthly_rent_to_owner > 0`.

```
start_date priority: custom_start_date > owner_rent_start_date > current month
end_date   = start_date + 12 months

For each month in [start_date .. end_date]:
  Check if owner_payment exists for (property_id, YYYY-MM)
  If NOT exists:
    INSERT INTO owner_payments (property_id, user_id, amount, payment_month, 'Pending')
```

### 6.4 Property Units Architecture
Units are stored in the same `properties` table as masters.
- `is_unit = 1` and `parent_property_id = master.id` identify a unit
- Units inherit address/location from parent on creation
- Owner fields are cleared for units (owner lives at master level)
- Dropdown display: `"Master Property - Unit Name"`

`getPropertiesForDropdown()` in [config/config.php:235](real-cpanel-prov1/config/config.php#L235):
```sql
SELECT p.*, parent.property_name as parent_property_name
FROM properties p
LEFT JOIN properties parent ON p.parent_property_id = parent.id
WHERE p.user_id = ?
ORDER BY
  CASE WHEN is_unit = 0 THEN 0 ELSE 1 END,
  COALESCE(parent.property_name, p.property_name),
  p.unit_name,
  p.property_name
```

### 6.5 Notification System
**File:** [includes/notifications.php](real-cpanel-prov1/includes/notifications.php) — `getNotifications($user_id)`

Computed on **every page load** (included in `header.php`). 6 notification types:

| Type | Condition | Severity |
|---|---|---|
| Overdue Rent | `rent_payments.status = 'Pending' AND due_date < today` | danger |
| Rent Due Soon | Pending rent due in next 7 days | warning |
| Pending Maintenance | `maintenance_requests.status IN ('Pending','In Progress')` | info |
| Expiring Leases | Active tenant `lease_end` within 30 days | warning |
| Tenant Cheques to Deposit | Deposit date within 7 days | info |
| Owner Cheques Due | Owner cheque date within 7 days | info |

Each notification has: `type`, `icon`, `title`, `message`, `link`, `count`.

### 6.6 Multi-User Data Isolation
Each user only sees their own data (enforced via `user_id` column on `properties`).
- All entities are accessed through properties, which are user-scoped
- `getQueryUserId()` returns `null` for admins (see all data) or current user ID
- `getUserWhereClause()` builds appropriate WHERE condition

### 6.7 Cheque Lifecycle

**Tenant Cheques** (money coming IN):
```
Received → Pending → Deposited → Cleared
                   └→ Bounced
```

**Owner Cheques** (money going OUT):
```
Created → Issued → Cleared
               └→ Bounced
               └→ Cancelled
```

`cheques/update_status.php` handles status transitions via AJAX/form POST.

### 6.8 Dashboard Financial Calculations
All figures are computed for the **current month** unless otherwise noted.

```
monthly_income      = SUM(transactions WHERE type='Income' AND month=current)
monthly_rent_income = SUM(rent_payments WHERE status='Paid' AND paid_date month=current)
monthly_expenses    = SUM(transactions WHERE type='Expense' AND month=current)
owner_payments_out  = SUM(owner_payments WHERE month=current)
net_profit          = monthly_income + monthly_rent_income - monthly_expenses - owner_payments_out
occupancy_rate      = (occupied_properties / total_properties) * 100
cash_on_cash_return = (net_profit / total_purchase_price) * 100 * 12  (annualized)
```

12-month cashflow chart: queries run for each of last 12 months separately.

---

## 7. Reusable Utilities

### 7.1 `config/config.php` — Helper Functions

| Function | Signature | Purpose |
|---|---|---|
| `isLoggedIn()` | `() → bool` | Check session auth |
| `requireLogin()` | `() → void` | Redirect if not logged in |
| `requireAdmin()` | `() → void` | Redirect if not admin |
| `getCurrentUserId()` | `() → int\|null` | Session user ID |
| `getCurrentUserRole()` | `() → string` | Cached role lookup |
| `isAdmin()` | `() → bool` | True if Super Admin/Admin/Manager |
| `isSuperAdmin()` | `() → bool` | True if Super Admin only |
| `getQueryUserId()` | `() → int\|null` | null for admins (see all data) |
| `getUserWhereClause($alias)` | `(string) → string` | Build scoped WHERE clause |
| `sanitizeInput($data)` | `(string) → string` | trim + stripslashes + htmlspecialchars |
| `formatCurrency($amount, $code)` | `(float, string?) → string` | Formatted with RTL awareness |
| `getCurrencySymbol($code)` | `(string) → string` | Returns symbol for 15 currencies |
| `getUserCurrency()` | `() → string` | Cached user currency code |
| `formatDate($date)` | `(string) → string` | Returns "Jan 01, 2025" or "-" |
| `getPropertiesForDropdown($conn, $uid, $fields)` | `(...) → array` | Master+unit property list |
| `updatePropertyStatusBasedOnTenants($conn, $pid)` | `(...) → bool` | Auto-update vacancy |

### 7.2 `config/database.php` — DB Connection

| Function | Purpose |
|---|---|
| `getDBConnection()` | Get (or create) persistent singleton MySQLi connection |
| `closeDBConnection($conn)` | No-op for cached connection (safe to call anywhere) |
| `closeAllDBConnections()` | Force-close on script end |

Connection features: connection reuse, UTF8mb4 charset, `Too many connections` retry (sleep 1s), `register_shutdown_function` auto-close.

### 7.3 `includes/notifications.php`

| Function | Purpose |
|---|---|
| `getNotifications($user_id, $conn?)` | Returns array of notification objects |
| `getNotificationCount($user_id, $conn?)` | Returns total count integer |

### 7.4 `includes/recurring_invoices.php`

| Function | Purpose |
|---|---|
| `generateRecurringInvoices($tenant_id, $conn?)` | Generate all past+current months for one tenant |
| `generateAllRecurringInvoices()` | Run for all active tenants (cron) |
| `generateMonthlyInvoices($tenant_id, $conn?)` | Generate next 12 months (cron variant) |

### 7.5 `includes/recurring_owner_payments.php`

| Function | Purpose |
|---|---|
| `generateRecurringOwnerPayments($property_id, $conn, $start_date?)` | Generate 12 months for one property |
| `generateMonthlyOwnerPayments($user_id, $conn)` | Run for all properties of a user |

### 7.6 Currency Configuration
15 currencies supported. RTL currencies (QAR, SAR, AED, BHD, KWD, OMR) display symbol after the number:
```
1,500.00 ر.ق   (RTL)
$1,500.00       (LTR)
```

---

## 8. Migration Issues & Recommendations

### 8.1 Architecture Paradigm Shift

| PHP (current) | MERN (target) |
|---|---|
| Server-side rendering (PHP echoes HTML) | Client-side rendering (React) |
| PHP session auth | JWT or session tokens (Express) |
| `include 'header.php'` layout system | React component tree with layouts |
| Direct DB calls per page | REST API endpoints (Express) or GraphQL |
| `$_POST` form handling | Axios/fetch to REST API, JSON body |
| File path routing (`/rent/add.php`) | React Router + Express routes |

### 8.2 Authentication

**Issues:**
- PHP sessions cannot be carried to a Node/Express backend directly
- The hardcoded plain-text password bypass for `sidhykqatar@gmail.com` must be removed
- No CSRF protection exists (PHP sessions don't enforce CSRF by default here)
- Session timeout is implemented in two places (PHP + JS); in MERN this must be unified in JWT expiry + frontend refresh logic

**Recommendations:**
- Implement JWT-based auth (access token + refresh token)
- Replace the demo user bypass with proper bcrypt and a seed script
- Implement CSRF protection for any cookie-based auth
- Replicate the 10-minute inactivity timeout via refresh token TTL + React idle timer

### 8.3 Database Migration (MySQL → MongoDB or keep MySQL)

**If keeping MySQL (with Mongoose or Sequelize):**
- Schema maps cleanly; foreign key cascades become model middleware
- Self-referential `properties.parent_property_id` → Mongoose `ref: 'Property'`
- ENUM fields → use Mongoose `enum` validators

**If migrating to MongoDB:**

| SQL Pattern | MongoDB Challenge |
|---|---|
| Multi-table JOINs (dashboard, notifications) | Denormalize or use `$lookup` (aggregation) |
| Self-referential properties/units | Can embed units as subdocuments or use `parent_id` ref |
| ENUM status fields | Enforce via Mongoose validation |
| `ON DELETE CASCADE` | Must implement in Mongoose pre-remove hooks or application code |
| `COALESCE`, `DATE_FORMAT` SQL functions | Aggregate pipeline equivalents |
| Financial SUMs with JOINs | Complex aggregation pipelines |
| `is_unit` + `parent_property_id` dual fields | Redesign as `type: 'master' | 'unit'` with embedded or referenced approach |

### 8.4 Business Logic to Re-implement in Backend

The following PHP logic has **no frontend equivalent** and must become Express middleware or service functions:

1. **`updatePropertyStatusBasedOnTenants()`** — Must fire after every tenant create/update/delete. Implement as Mongoose post-save/post-remove hook or Express middleware.

2. **`generateRecurringInvoices()`** — Currently triggered ad-hoc (on tenant add, button click, cron). In MERN: Express service + node-cron or a dedicated cron job.

3. **`generateRecurringOwnerPayments()`** — Same pattern. Must run via cron and on property update.

4. **`getNotifications()`** — 6 separate DB queries on every page load. In MERN: Express GET `/api/notifications`, or aggregate into one query. Consider caching.

5. **`getPropertiesForDropdown()`** — Complex ordering (masters first, then units). Must replicate in Mongoose query with sort logic.

6. **`getQueryUserId()` / `getUserWhereClause()`** — Admin sees all data; users see own. Must become Express middleware that injects a `dataScope` object into every controller.

### 8.5 File Upload Migration

- Currently stored in `uploads/properties/` with filename: `prop_{id}_{uniqid}.{ext}`
- In MERN: use **Multer** (Express) + store locally, or migrate to **AWS S3 / Cloudinary**
- `uploads/.htaccess` blocks PHP execution in the folder (security); in MERN/Node this is not a concern but the MIME-type validation must move to Multer config

### 8.6 RTL / Multi-Currency Display

- `formatCurrency()` has RTL-aware symbol placement for Arabic currencies
- In React: create a `formatCurrency(amount, code)` utility matching this exact logic
- Consider `Intl.NumberFormat` with locale for a more robust implementation

### 8.7 Direct SQL String Interpolation (Security Debt)

Several places use string interpolation instead of prepared statements:
```php
// config/config.php line 92
$result = $conn->query("SELECT role FROM users WHERE id = $user_id LIMIT 1");

// notifications.php — all 6 queries use string interpolation
WHERE p.user_id = $user_id AND rp.due_date < '$today'
```
These are partially safe because `$user_id` is always cast from session (integer), but:
- In Express/Mongoose, **always** use parameterized queries or Mongoose methods
- Never interpolate user-controlled values into queries

### 8.8 No CSRF Protection

- PHP forms have no CSRF tokens
- In MERN: implement CSRF via `csurf` (Express) or use SameSite cookies + JWT to mitigate

### 8.9 Notification Performance

- All 6 notification queries run synchronously on **every page load** via `header.php`
- In MERN, move to a dedicated API endpoint with response caching (Redis or simple TTL)

### 8.10 Hardcoded Configuration

Hardcoded values that must become environment variables in MERN:

| PHP Constant | Value | MERN: `process.env.*` |
|---|---|---|
| `BASE_URL` | `http://localhost/real-cpanel-prov1` | `FRONTEND_URL` |
| `DB_HOST` | `localhost` | `DB_HOST` |
| `DB_USER` | `root` | `DB_USER` |
| `DB_PASS` | `` (empty) | `DB_PASS` |
| `DB_NAME` | `property_db` | `DB_NAME` |
| `SESSION_TIMEOUT` | `600` | `JWT_EXPIRY` |
| Demo user credentials | hardcoded in login.php | Remove entirely |

### 8.11 Cron Jobs

| PHP cron | Description | MERN equivalent |
|---|---|---|
| `cron/generate_invoices.php` | Generates rent + owner payment records monthly | `node-cron` task in Express, schedule for 1st of month |

### 8.12 Recommended MERN API Route Map

```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/register
GET    /api/auth/ping                    (session keepalive)

GET    /api/dashboard                    (all KPIs in one call)

GET    /api/properties
POST   /api/properties
GET    /api/properties/:id
PUT    /api/properties/:id
DELETE /api/properties/:id
POST   /api/properties/:id/images
DELETE /api/properties/:id/images/:imageId

GET    /api/tenants
POST   /api/tenants
GET    /api/tenants/:id
PUT    /api/tenants/:id
DELETE /api/tenants/:id

GET    /api/rent-payments
POST   /api/rent-payments
PUT    /api/rent-payments/:id
POST   /api/rent-payments/generate      (trigger recurring invoice generation)

GET    /api/transactions
POST   /api/transactions
PUT    /api/transactions/:id
DELETE /api/transactions/:id

GET    /api/owner-payments
POST   /api/owner-payments
PUT    /api/owner-payments/:id
POST   /api/owner-payments/generate

GET    /api/cheques/tenant
POST   /api/cheques/tenant
PUT    /api/cheques/tenant/:id
GET    /api/cheques/owner
POST   /api/cheques/owner
PUT    /api/cheques/owner/:id
PATCH  /api/cheques/:type/:id/status

GET    /api/maintenance
POST   /api/maintenance
PUT    /api/maintenance/:id
DELETE /api/maintenance/:id

GET    /api/documents
POST   /api/documents            (multipart/form-data)
DELETE /api/documents/:id

GET    /api/accounting/balance-sheet
GET    /api/accounting/profit-loss
GET    /api/accounting/trial-balance

GET    /api/reports

GET    /api/users                        (admin only)
POST   /api/users                        (admin only)
PUT    /api/users/:id                    (admin only)
DELETE /api/users/:id                    (admin only)

GET    /api/settings
PUT    /api/settings

GET    /api/notifications
```

---

*End of analysis. Document covers all 15 modules, full auth flow, complete DB schema with FK relationships, all business-critical logic, every utility function, and 12 migration risk areas.*
