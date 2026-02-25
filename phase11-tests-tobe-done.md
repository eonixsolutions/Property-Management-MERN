Manual testing to do
Start MongoDB (run net start MongoDB as Administrator or via Services.msc)
Start backend: cd backend && npm run dev
Start frontend: cd frontend && npm run dev
Contracts (requires login):

Navigate to /contracts — "Contracts" now in sidebar
Click "+ New Contract" → form opens pre-filled with your user email/phone as landlord
Select a tenant from the dropdown → property + tenant fields auto-fill
Click "Fill Default Terms" → all 15 terms sections populated
Save, then click "Print" → browser opens a formatted lease agreement
Edit and Delete buttons work as expected
Public Listings (no login needed):

Navigate to http://localhost:5173/listings directly (no login required)
Properties with Vacant status appear as cards
Search, filter by type/city/rent range all work
WhatsApp and Call buttons only appear when a contact number is set on the property
Share button uses native share API or copies URL to clipboard
