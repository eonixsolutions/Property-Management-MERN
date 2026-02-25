Manual testing for Phase 8:

Create a request — go to /maintenance, click "+ New Request", fill in title, select a property, set priority to Emergency → row should be highlighted red in the list
Filter by priority and status — verify Emergency/High/Medium/Low and Pending/In Progress filters work independently and combined
Edit a request — change status from Pending → In Progress → Completed; verify cost and completed date fields save correctly
Detail page — click "View" on a row; verify all fields show, Edit/Delete buttons work, back navigation works
Delete — confirm the dialog redirects back to the list
Property detail page — open any property that has maintenance requests; verify the maintenance section shows up to 5 records with correct priority/status badges and clickable titles
Notification bell — after creating a Pending or In Progress request, the bell badge count should increment (within 60s cache expiry)
STAFF scoping — STAFF user should only see requests for their own properties (userId denormalized from property.userId)
