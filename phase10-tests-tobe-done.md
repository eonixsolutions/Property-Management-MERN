Manual testing needed
Dashboard (/dashboard):

Verify the 4 KPI rows load with real numbers (will show — placeholders if DB is empty)
Verify the 12-month cashflow bar chart renders (bars appear, labels show month names)
Verify "Recent Transactions" table shows entries if you have transactions in the DB
Accounting (/accounting):

Click each tab (Balance Sheet, P&L, Trial Balance) and verify data loads
Change the "As of Date" / date range and click Refresh — verify numbers update
Verify the "Balanced" badge turns red if assets ≠ liabilities + equity (edge case — shouldn't happen with correct data)
Reports (/reports):

Click Run Report with the default (full year) range
If you have master properties with child units, click the ▶ arrow on a row to expand and see unit-level breakdown
Change dates and re-run to verify the monthly breakdown updates