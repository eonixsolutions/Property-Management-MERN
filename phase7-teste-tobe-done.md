Manual testing you should do for Phase 7:

Owner Payments (/owners)

Add a payment — verify it appears with correct month display and status badge
Edit a payment — change status to Paid, set a paid date
Delete a payment — confirm removal
Filter by property, status, and month — verify list filters correctly
(SUPER_ADMIN only) Click "Generate Payments" — check the confirmation dialog and that payments are created for properties with owner.monthlyRentAmount > 0
Tenant Cheques tab (/cheques)

Add a tenant cheque — select tenant (property should auto-fill), enter cheque details
Update status: Pending → Deposited → Cleared
Delete a cheque
Owner Cheques tab

Issue a single cheque for a property
Use "Issue Multiple" — try manual mode with a starting number (e.g. CHQ001) and verify that CHQ002, CHQ003... are auto-generated
Use copy_from mode — select an existing cheque as source
Toggle "Upcoming" filter — verify only cheques due within 7 days appear
Update status: Issued → Cleared
Verify "Due in Nd" badge appears on cheques due soon
Notifications

Confirm the notification bell now shows real upcoming cheque counts (previously hardcoded 0)