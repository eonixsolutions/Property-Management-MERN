Phase 4 is complete. Here's a summary of what to test manually:

Record a payment — click "+ Record Payment", pick an active tenant (property ID auto-fills), enter amount + due date → row appears in table
Mark as Paid — Edit a Pending payment → set status to "Paid", leave Paid Date blank → backend auto-sets it to now
Filter by status — select "Overdue" → overdue rows highlighted with a red tint
Filter by month — pick a month from the month picker → only that month's invoices show
Generate Invoices (ADMIN/SUPER_ADMIN only) — purple button appears, shows confirmation dialog, displays result count after generation
STAFF isolation — STAFF users only see payments linked to their own properties; the "Generate Invoices" button is hidden
