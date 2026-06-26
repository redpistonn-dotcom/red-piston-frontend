# Changelog

## [2026-06-26] — Bug Fixes: Orders page, Parties udhaar, BulkStockIn manual items, Purchase Bills OCR

### Fixes
- **Orders — Create order silent failure** (`src/pages/OrdersPage.tsx`): `handleSubmit` returned silently when party or product was missing. Now shows a toast warning for each missing field.
- **Orders — Print shows entire page** (`src/pages/OrdersPage.tsx`): replaced `window.print()` (prints the whole app) with `printOrder(order)` which opens a new window containing only the order's data and triggers print from there.
- **Orders — Three-dots button did nothing** (`src/pages/OrdersPage.tsx`): added `onClick` handler that toggles a dropdown menu with "View Details" and "Print" actions. Dropdown closes on outside click via a `document` event listener.
- **Parties — Outstanding / udhaar not updated on save** (`src/pages/PartiesPage.tsx`): the party edit form had no outstanding field, and `onSaveParty` never called the ledger API. Added an "Outstanding / Udhaar (₹)" input (edit mode, customers only) and wired `onSaveParty` to `POST /api/shop/parties/:id/ledger` with an ADJUSTMENT entry when the value changes.
- **BulkStockInModal — manual item cannot be edited/duplicated** (`src/components/BulkStockInModal.tsx`): two bugs fixed — (1) adding a second manual item (masterPartId=null) replaced the first one because the duplicate check matched all null-masterPartId items; fixed by skipping the check for manual items. (2) editing a manual item's part name was lost because `cartItem.part` kept the original object; fixed by merging `form.partName` into a copy of the part.
- **Purchase Bills OCR — rejects image files** (`src/components/PurchaseBills.tsx`): file input and `handleFile` now accept JPG, PNG, WEBP, HEIC in addition to PDF. The same base64 extract endpoint is called for images; if the backend doesn't support a format the existing error path handles it gracefully.
