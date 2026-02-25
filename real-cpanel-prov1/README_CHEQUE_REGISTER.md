# Cheque Register System

## Features

✅ **Tenant Cheques** - Track cheques received from tenants  
✅ **Owner Cheques** - Track cheques issued to owners  
✅ **Notifications** - Alerts for upcoming deposit dates and cheque dates  
✅ **Multiple Cheques** - Manage 12 post-dated cheques or any number  
✅ **Batch Add** - Add multiple cheques at once with auto-increment  
✅ **Copy Cheques** - Copy settings from existing cheques  
✅ **Auto-Numbering** - Auto-generate sequential cheque numbers  
✅ **Status Tracking** - Pending → Deposited → Cleared/Bounced workflow  
✅ **Linking** - Link cheques to rent payments and owner payments  

## How It Works

### Tenant Cheques

**Use Case:** Tenant gives you 12 post-dated cheques for the year

#### Option 1: Add Multiple at Once (Recommended)
1. Go to **Cheque Register** → **Add Multiple Cheques**
2. Select tenant and property
3. Choose cheque numbering mode:
   - **Auto-generate** - Automatically continues from last cheque number
   - **Series** - Enter starting number (e.g., 123456) and it increments
   - **Copy from** - Copy settings from existing cheque
4. Enter:
   - Amount (same for all cheques)
   - Bank Name (same for all cheques)
   - Start Date (first cheque date)
   - Number of cheques (e.g., 12)
   - Frequency (monthly for yearly cheques)
5. Click "Create Cheques" - all 12 cheques created instantly!
6. System sends notifications 7 days before deposit dates

**Example - Creating 12 cheques:**
- Start Date: 2024-01-01
- Number: 12
- Frequency: Monthly
- Result: 12 cheques from Jan 2024 to Dec 2024

#### Option 2: Add Single Cheque
1. Go to **Cheque Register** → **Add Cheque**
2. Select tenant and property
3. Enter cheque details for one cheque
4. Repeat for each cheque

### Owner Cheques

**Use Case:** You issue cheques to property owners

#### Option 1: Issue Multiple at Once
1. Go to **Cheque Register** → **Issue Multiple Owner Cheques**
2. Select property (amount auto-fills from owner rent)
3. Choose cheque numbering:
   - **Auto-generate** - Continues from last cheque number
   - **Copy from** - Copy settings from previous cheque
4. Enter:
   - Amount (auto-filled from owner rent)
   - Bank Name
   - Start Date
   - Number of cheques (e.g., 12)
   - Frequency (monthly)
5. All cheques created instantly!

#### Option 2: Issue Single Cheque
1. Go to **Cheque Register** → **Issue Owner Cheque**
2. Select property
3. Enter cheque details
4. System sends notifications 7 days before cheque dates

## Notifications

**Tenant Cheques:**
- ⏰ **Upcoming Deposits** - Cheques that need to be deposited in next 7 days
- 📝 **Pending Cheques** - Cheques not yet deposited

**Owner Cheques:**
- ⏰ **Upcoming Cheques** - Cheques due in next 7 days (to be cleared by bank)

## Database Migration

Run the migration to enable cheque tracking:

```
http://localhost/realestate/database/migrate_cheque_register.php
```

Or manually run the SQL:
```sql
-- See database/migration_add_cheque_register.sql
```

## Cheque Status Workflow

**Tenant Cheques:**
1. **Pending** - Cheque received but not deposited
2. **Deposited** - Cheque deposited at bank
3. **Cleared** - Cheque cleared by bank
4. **Bounced** - Cheque bounced/returned

**Owner Cheques:**
1. **Issued** - Cheque issued to owner
2. **Cleared** - Cheque cleared by bank
3. **Bounced** - Cheque bounced
4. **Cancelled** - Cheque cancelled before clearing

## Access

**Menu:** Cheque Register (💳 icon in sidebar)

**Pages:**
- Dashboard: Overview with statistics
- Tenant Cheques: View all tenant cheques
- Add Tenant Cheque: Record new cheque
- Owner Cheques: View all owner cheques
- Issue Owner Cheque: Record new owner cheque

## Features Summary

✅ Track multiple cheques per tenant (e.g., 12 for a year)  
✅ Notifications for deposit dates  
✅ Notifications for owner cheque dates  
✅ Link cheques to rent/owner payments  
✅ Filter by status (Pending, Upcoming, Deposited, Cleared)  
✅ View statistics and totals  
✅ Quick status updates  
✅ Automatic notifications in header  

## Example Scenario

### Tenant Cheques - Creating 12 Monthly Cheques
**Scenario:** Tenant provides 12 post-dated cheques for annual rental

1. **Add Multiple Cheques:**
   - Select tenant
   - Choose "Auto-generate" for cheque numbers
   - Enter amount: 5,000 QAR
   - Enter bank: Qatar National Bank
   - Start date: 2024-01-01
   - Number: 12 cheques
   - Frequency: Monthly

2. **Result:** All 12 cheques created instantly:
   - Cheque 000001 - 2024-01-01
   - Cheque 000002 - 2024-02-01
   - Cheque 000003 - 2024-03-01
   - ... and 9 more!

3. **Manage:** 
   - Get notification 7 days before each deposit date
   - Mark as "Deposited" after depositing
   - Mark as "Cleared" after bank processes
   - System tracks total collected and pending amounts

### Owner Cheques - Creating 12 Monthly Cheques
**Scenario:** You issue monthly cheques to property owner

1. **Issue Multiple Cheques:**
   - Select property (amount auto-fills from owner rent)
   - Choose "Copy from" last cheque
   - Bank name auto-fills
   - Start date: 2024-01-01
   - Number: 12 cheques
   - Frequency: Monthly

2. **Result:** All 12 cheques created with sequential numbers

3. **Manage:**
   - Get notifications before cheque dates
   - Track all issued cheques
   - Mark as "Cleared" when processed

### Pro Tips
- Use **"Copy from"** to quickly duplicate settings from previous cheques
- Use **"Auto-generate"** for sequential numbering without manual entry
- Use **"Series"** if you have a specific starting cheque number
- All cheques auto-increment dates based on frequency selected
- Preview shows date range before creating cheques

This system ensures you never miss a cheque deposit or payment!

