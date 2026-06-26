# Changelog

## [2026-06-26] — Bug Fixes: POS print, cart image, sync error surfacing + inventory category persistence

### Fixes
- **POS — Print button printed the whole page** (`src/pages/POSBillingPage.tsx`): replaced `window.print()` with a `window.open()` new-window approach that renders only the invoice HTML (same pattern as Orders/Invoice pages) and auto-triggers print from there.
- **POS cart — Cloudinary image URL showed as raw text** (`src/pages/POSBillingPage.tsx`): the cart row image cell now renders an `<img>` tag when `item.image` is an `http…` URL, and falls back to an emoji `<span>` otherwise.
- **POS Sync Failed toast now shows backend error** (`src/api/sync.ts`, `src/App.tsx`): `syncInvoice` previously swallowed the backend error and returned `false` — the toast said "stock restored" with no detail. It now returns `{ ok, error? }` and the Sync Failed toast surfaces the actual backend error message so the team can diagnose Udhaar/credit sync failures without reading logs.
- **Inventory — category and icon edits not persisted** (`src/api/sync.ts`, `RED-PISTON-BACKEND`): three-layer fix — (1) `syncProductSave` now sends `customCategoryL1` and `customIcon` in the PUT payload; (2) the backend inventory PUT route accepts and saves those fields; (3) `mapInventoryToProduct` now reads shop overrides with fallback to masterPart. **Requires DB migration** `scripts/migrate-custom-category-icon.sql` run before deploying.

## [2026-06-26] — Bug Fixes: Orders page, Parties udhaar, BulkStockIn manual items, Purchase Bills OCR

### Fixes
- **Orders — Create order silent failure** (`src/pages/OrdersPage.tsx`): `handleSubmit` returned silently when party or product was missing. Now shows a toast warning for each missing field.
- **Orders — Print shows entire page** (`src/pages/OrdersPage.tsx`): replaced `window.print()` (prints the whole app) with `printOrder(order)` which opens a new window containing only the order's data and triggers print from there.
- **Orders — Three-dots button did nothing** (`src/pages/OrdersPage.tsx`): added `onClick` handler that toggles a dropdown menu with "View Details" and "Print" actions. Dropdown closes on outside click via a `document` event listener.
- **Parties — Outstanding / udhaar not updated on save** (`src/pages/PartiesPage.tsx`): the party edit form had no outstanding field, and `onSaveParty` never called the ledger API. Added an "Outstanding / Udhaar (₹)" input (edit mode, customers only) and wired `onSaveParty` to `POST /api/shop/parties/:id/ledger` with an ADJUSTMENT entry when the value changes.
- **BulkStockInModal — manual item cannot be edited/duplicated** (`src/components/BulkStockInModal.tsx`): two bugs fixed — (1) adding a second manual item (masterPartId=null) replaced the first one because the duplicate check matched all null-masterPartId items; fixed by skipping the check for manual items. (2) editing a manual item's part name was lost because `cartItem.part` kept the original object; fixed by merging `form.partName` into a copy of the part.
- **Purchase Bills OCR — rejects image files** (`src/components/PurchaseBills.tsx`): file input and `handleFile` now accept JPG, PNG, WEBP, HEIC in addition to PDF. The same base64 extract endpoint is called for images; if the backend doesn't support a format the existing error path handles it gracefully.
