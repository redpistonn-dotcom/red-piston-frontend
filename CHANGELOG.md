# Changelog

## [2026-06-28] — Fix: chunk-load errors after deploy auto-reload instead of breaking

### Fix
- **PageErrorBoundary — auto-reload on stale chunk URLs** (`src/App.tsx`): after a new Vercel deploy, Vite renames hashed JS chunks. Users who have the app open and navigate to a new route get "Failed to fetch dynamically imported module". The boundary now detects chunk-load errors (`ChunkLoadError` / "Failed to fetch dynamically imported module") and calls `window.location.reload()` once (guarded by `sessionStorage` to prevent reload loops), fetching the new HTML with correct chunk URLs.
- **`vercel.json` — never cache `index.html`**: added `Cache-Control: no-cache, no-store` header for `/index.html` so browsers always fetch fresh HTML after a deploy. Hashed `/assets/*` files keep the 1-year immutable cache for performance.

## [2026-06-28] — Fix: Sale always generated as "Quotation" / EST- prefix

### Fix
- **POS — FINALIZE & PRINT button passed MouseEvent as `typeOverride`** (`src/pages/POSBillingPage.tsx`): `onClick={handleSubmit}` passes the click event as the first argument. Since a MouseEvent is truthy and not `"Sale"`, `effectiveBillType === "Sale"` evaluated to false, making every sale generate an `EST-` invoice number and show "Quotation Generated!" / "ESTIMATE / QUOTATION". Fixed by narrowing `typeOverride` to only accept the two valid string values at the top of `handleSubmit` — a MouseEvent or any other unexpected arg is treated as `undefined`, falling back to `billType` state. Also switched `setBillType` from the raw `typeOverride` to the guarded `safeOverride` for consistency.

## [2026-06-28] — Out-of-stock popup: full-screen overlay, auto-suspend cart, 8h expiry

### Improvements
- **Out-of-stock popup covers full screen** (`src/pages/POSBillingPage.tsx`): popup now uses `createPortal(…, document.body)` with `zIndex: 2147483647` so it renders above the sidebar and header, not trapped inside the main content stacking context.
- **Auto-suspend current cart on Reorder** (`src/pages/POSBillingPage.tsx`): if the user has items in the cart when "Reorder / Add Stock" is clicked, the bill is automatically suspended (saved to `localStorage`) before navigating to inventory. A note inside the popup explains this. On returning to POS, the resume banner appears.
- **Suspended bill expires after 8 hours** (`src/pages/POSBillingPage.tsx`): draft saves an `expiresAt = now + 8h` timestamp. On mount, expired drafts are silently discarded — prevents stale bills from yesterday surfacing at the start of a new business day.

## [2026-06-28] — Out-of-stock popup in POS with Reorder shortcut; inventory deep-link from POS

### New Features
- **POS — out-of-stock popup on cart-add** (`src/pages/POSBillingPage.tsx`): when a product with 0 stock is selected from search results, it is now blocked from entering the cart. A popup appears immediately with the product name, a "Cancel" button to stay on the POS, and a "Reorder / Add Stock" button that navigates to `/inventory?q=<sku>` so the user can add stock without manually navigating and searching.
- **Inventory — pre-filled search from URL `?q=` param** (`src/pages/InventoryPage.tsx`): the search state is now lazy-initialized from the `?q=` URL query parameter. Any `navigate('/inventory?q=TERM')` call (from the POS popup or anywhere else) automatically focuses the matching product on page load.

## [2026-06-28] — Block 0-stock items from both invoice and quotation; inventory newest-first from backend

### Fixes
- **POS — 0-stock items now block Quotation too** (`src/pages/POSBillingPage.tsx`): `validate()` had a `checkType === "Sale"` guard that let Quotations bypass the stock check entirely — so a product with 0 stock would generate a quotation (and trigger a backend error toast after). Added a separate `maxStock <= 0` check (skips custom items) that fires for ALL bill types before the sale-specific over-quantity check.
- **Backend inventory — newest items first** (`RED-PISTON-BACKEND/src/routes/inventory.js`): changed `orderBy` from `masterPart.partName asc` to `createdAt desc` so newly added inventory entries appear at the top of the list, matching the frontend's default "Newest" sort.

## [2026-06-28] — Fix cold-start skeleton hang for returning logged-in users

### Fix
- **Backend warmup ping moved to `App.tsx`** (`src/App.tsx`): the `/health` ping now fires unconditionally on every page load (fire-and-forget `useEffect`), so returning users who are already logged in trigger the Render cold-start wake-up immediately — not just when the login page is shown. Previously, logged-in users would see dashboard skeletons for 30–60s while the backend spun up from sleep. Removed the now-duplicate ping from `LoginPage.tsx`.

## [2026-06-28] — Remove phone/OTP/Google auth — email-only login and registration

### Refactor
- **LoginPage — email-only auth** (`src/pages/LoginPage.tsx`): removed all phone OTP, Firebase, and Google OAuth flows. Sign-in and account creation both use email + password only. Removed state (`authTab`, `phone`, `otp`, `confirmResult`, `linkConfirmResult`, `resendTimer`, `googleLoading`, OTP refs), removed functions (`startResendTimer`, `sendOtp`, `verifyAndAuth`, `googleAuth`, `callBackendFirebase`, `sendLinkOtp`, `linkPhoneVerify`, `handleOtpChange`, `handleOtpKey`), removed Firebase import, removed STEPS (`SIGNIN_OTP`, `REG_OTP`, `LINK_PHONE`, `LINK_OTP`), removed recaptcha container div, and removed OTP-specific CSS. SIGNIN now shows email+password directly (no tabs). REG_AUTH now shows the same email+password form for both shop owners and customers. PENDING step text updated from "Phone verified" to "Account created".

## [2026-06-28] — Favicon + email branding; inventory sort; quotation fix; PO draft done view

### New Features / Fixes
- **Favicon updated to RedPiston logo** (`index.html`): replaced the Vite placeholder with `/logo.svg` (SVG) + `/logo.png` (PNG fallback) + Apple touch icon.
- **Inventory — default sort is now Newest first** (`src/pages/InventoryPage.tsx`, `src/api/sync.ts`, `src/types/index.ts`): added `createdAt` to `BackendInventory`, mapped it in `mapInventoryToProduct`, added `newest`/`oldest` sort options to the sort cycle button (Newest → Oldest → Name → Stock → Margin → back to Newest). The sort button now shows a readable label instead of `≡`.
- **Quotation with custom/overstock items — stock gate no longer blocks quotations** (`src/pages/POSBillingPage.tsx`): `validate()` was checking `billType` state for the stock limit — meaning clicking the "Quotation" button while `billType === "Sale"` would still run the stock check and block items with qty > stock. Passing `typeOverride` into `validate()` fixes this: quotations now skip the stock check regardless of the header toggle state.
- **PO Save Draft — clearer success feedback** (`src/components/PurchaseOrderModal.tsx`): replaced the plain done view with a prominent green success banner showing PO number, supplier, item count, and total. Added a **Continue Editing** button (returns to create form with current supplier/items intact) alongside the existing **View All POs** and **+ New PO** actions. "New PO" now correctly resets the form state (lines, supplier, remarks).

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
