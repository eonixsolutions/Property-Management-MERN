Manual testing required
Yes — a few things can only be verified at runtime:

Upload a document — go to /documents, click "+ Upload Document", pick a file (PDF recommended), fill title + type + optionally link to a property/tenant → verify it appears in the list
Download a document — click "↓ Download" on any listed document → verify the file downloads with the original filename
Delete a document — click "Delete" and confirm → verify the record disappears AND the physical file is removed from uploads/documents/ on the server
Filter by type/property/tenant — verify each filter narrows results correctly
PropertyDetailPage documents section — open any property detail page → verify the Documents card shows up-to-date docs (or "No documents" if none)
TenantDetailPage documents section — open any tenant detail page → same check
STAFF access control — log in as a STAFF user and try to access another user's document directly via GET /api/documents/:id → should return 403
Invalid file type — try uploading an .exe or .zip → should get "Invalid file type" error
