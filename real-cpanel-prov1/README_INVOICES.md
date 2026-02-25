# Recurring Invoices System

## Features

✅ **Default Rent per Property** - Set a default monthly rent for each property  
✅ **Automatic Invoice Generation** - Invoices are automatically created when a tenant is added  
✅ **Recurring Invoices** - Invoices are generated for the entire lease period  
✅ **Monthly Generation** - Cron job generates invoices for upcoming months  

## How It Works

### 1. Setting Default Rent
- When adding or editing a property, you can set a "Default Monthly Rent"
- This rent amount will be automatically suggested when adding tenants to that property

### 2. Automatic Invoice Generation
When you add a new tenant with:
- Status: Active
- Lease Start Date: Set
- Lease End Date: Set

The system automatically generates rent invoices for each month from lease start to lease end.

### 3. Monthly Invoice Generation (Cron Job)

The system includes a cron job script that generates invoices for upcoming months.

**Setup Cron Job:**
```bash
# Add to crontab (runs on 1st of each month)
0 0 1 * * /usr/bin/php /path/to/realestate/cron/generate_invoices.php
```

**Or run manually via browser:**
```
http://localhost/realestate/cron/generate_invoices.php?key=generate_invoices_2024
```

**Or run via command line:**
```bash
php cron/generate_invoices.php
```

### 4. Database Migration

If you have an existing database, run the migration to add the `default_rent` column:

```sql
ALTER TABLE properties 
ADD COLUMN default_rent DECIMAL(10,2) DEFAULT 0.00;
```

Or use the provided migration file:
```bash
mysql -u root -p property_db < database/migration_add_default_rent.sql
```

## Invoice Management

- Invoices are created with status "Pending" by default
- When tenant moves out (status changed to "Past"), future invoices are not generated
- You can manually mark invoices as "Paid" from the Rent Collection page
- Invoices are automatically marked as "Overdue" when past due date

## Features

- ✅ Default rent per property
- ✅ Auto-fill rent when selecting property (in Add Tenant form)
- ✅ Automatic invoice generation on tenant creation
- ✅ Monthly cron job for future invoices
- ✅ Invoice regeneration when lease dates change
- ✅ Automatic stop when tenant moves out

## Notes

- Invoices are generated for the full lease period when tenant is added
- The cron job ensures invoices are created 12 months ahead
- If a tenant's lease is extended, edit the tenant and update lease_end date - invoices will regenerate
- If a tenant moves out early, change status to "Past" to stop future invoice generation
