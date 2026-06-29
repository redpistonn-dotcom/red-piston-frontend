# Changelog

## [2026-06-29] — Fix Google sign-in: remove Firebase signInWithPopup dependency

### Fixes
- **LoginPage**: replaced Firebase `signInWithGoogle` (which calls `signInWithPopup` and requires the domain in Firebase's Authorized Domains list) with `@react-oauth/google`'s `useGoogleLogin`. This eliminates the `auth/unauthorized-domain` error that blocked customer sign-in on `redpiston.in`.
- **main.tsx**: added `GoogleOAuthProvider` wrapper (required by `useGoogleLogin`).
- **New env var**: `VITE_GOOGLE_CLIENT_ID` — Google OAuth 2.0 client ID from Google Cloud Console. Must be set in Vercel environment variables.

## [2026-06-28] — Loading skeletons on initial page fetch

### UI/UX
- **Dashboard**: replaced spinner with 4 KPI + 2 chart skeleton shimmer cards while data loads
- **Inventory**: replaced spinner with shimmer table skeleton (toolbar + 6 row placeholders)
- **Parties**: replaced spinner with shimmer list skeleton (5 avatar + text row placeholders)

## [2026-06-28] — Tier 2 + Tier 3 UI/UX improvements

### New Features
- **T2-1 Dashboard freshness chip**: each KPI card now shows a "• Updated just now" chip beneath the value so users know the data is live.
- **T2-2 Persistent tab memory** (`PartiesPage`, `WorkshopPage`): active tab / status filter restored from `localStorage` on revisit so navigating away and back doesn't reset the view.
- **T2-3 Sortable Date & Amount columns** (`HistoryPage`): clicking the "Date & Time" or "Amount" column header sorts ascending/descending; active column highlighted in amber with a ↑/↓ indicator.
- **T2-4 Amber OVERDUE badge** (`PartiesPage`): customer rows with `daysOverdue > 0` show a small amber "OVERDUE" pill next to the name in the desktop table.
- **T2-5 Workshop Kanban view toggle** (`WorkshopPage`): ⊞/☰ button added next to Export CSV; kanban renders job cards in 4 columns (Draft / In Progress / Completed / Invoiced) with coloured headers; selection persisted to `localStorage`.
- **T2-7 Mini SVG sparkline** (`DashboardPage`): each KPI card renders an inline 80×28 SVG sparkline derived pseudo-randomly from the metric value; color matches the card accent.
- **T3-1 Collapsible settings sections** (`ShopSettingsPage`): "Shop Profile" and "Bank Details" cards each have a ▸/▾ chevron button that collapses/expands the content via `maxHeight` toggle.
- **T3-2 Print-optimised CSS** (`App.css`): expanded `@media print` block — hides nav/topbar/buttons, removes backgrounds from badges, enforces A4 margins, makes tables border-collapsed and full-width, no horizontal scrolling.
- **T3-3 Comfortable/Compact density toggle** (`InventoryPage`): two-segment toggle persisted to `localStorage`; compact mode halves row padding from `10px` to `5px` so more rows fit on screen.
- **T3-4 Contextual empty state copy** (`InventoryPage`, `PartiesPage`, `WorkshopPage`): empty states now distinguish between "no results for your filters" vs "nothing added yet", with actionable guidance in each case.
- **T3-5 Recent items quick-add strip** (`POSBillingPage`): a pill strip above the invoice items table shows the last 8 unique in-stock products sold from this shop (derived from `movements`); clicking a pill calls `addProduct` directly, skipping the search step.
- **T3-6 Color-coded left border on History rows** (`HistoryPage`): `borderLeft: 3px solid` — emerald for SALE, sky for PURCHASE, amber for returns, crimson for DAMAGE/THEFT, transparent for others.
- **T3-7 Global Cmd+K search overlay** (`ERPShell`): pressing ⌘K / Ctrl+K opens a portal-mounted modal with an autofocused input that filters NAV_ITEMS by name; clicking a result navigates to that page and closes the overlay; Escape dismisses.

## [2026-06-28] — Brand fix: replace all "AutoSpace" references with "RedPiston"

### Fixes
- **ResetPasswordPage**: logo text "AutoSpace" → "RedPiston" (both the invalid-link screen and the main reset form)
- **ProfilePage**: staff invite callout "AutoSpace account" → "RedPiston account"
- **PartiesPage**: footer watermark "AUTOSPACE ENTERPRISE V2.4" → "REDPISTON" (both vehicle and customer/supplier panels)
- **LoginPage**: account-rejection support email `support@autospaceerp.com` → `support@redpiston.in`; admin login placeholder `admin@autospaceerp.com` → `admin@redpiston.in`
- **Backend whatsapp.js**: WhatsApp broadcast name `'AutoSpace'` → `'RedPiston'`
- **Backend index.js**: server startup log "AutoSpace backend running…" → "RedPiston backend running…"

## [2026-06-28] — UI/UX polish pass: design tokens, animations, responsive tables, empty states

### Refactors
- **Design tokens applied consistently across all pages and UI components**: button sizes (`"10px 22px"` padding, `borderRadius: 10`, `minHeight: 38`), input/select focus highlight changed from amber to `T.sky` with `borderRadius: 10`, field label size standardised to `fontSize: 12`, skeleton card grid updated to `repeat(auto-fill, minmax(160px, 1fr))`.
- **CSS utility classes defined** (`src/styles/App.css`): added ~140 lines covering `skeleton-shimmer`, `fadeIn`/`scaleIn`/`slideUpSheet` keyframes, `page-in`, `rp-gap`, `kpi-grid-3/4/6`, `table-scroll`, `th-cell`, `trow`/`row-hover`, `card-hover`, responsive media queries — these were referenced across JSX but had no definitions, so shimmer animations, hover transitions and responsive table scrolling were silently no-ops.
- **Badge pills standardised** (`InventoryPage`, `PartiesPage`): `borderRadius: 99`, `padding: "3px 10px"`, `fontSize: 11`, `fontWeight: 700` applied to category/tag/batch-number chips.
- **Expanded row entrance animation** (`PartiesPage`): added `animation: "fadeIn 0.15s ease"` on the ledger detail `<td>` so expand/collapse feels responsive.
- **Table scroll wrapper added** (`StaffPage`): table wrapped in `overflowX: "auto"` so narrow viewports can scroll horizontally instead of clipping content.
- **Empty state improved** (`StaffPage`): replaced plain text fallback with centred 40px emoji + 16px title + 13px subtitle layout matching design standard.
- **KPI grid inline `gridTemplateColumns` added** (`HistoryPage`, `DashboardPage`): belt-and-suspenders inline style `repeat(auto-fill, minmax(160px, 1fr))` so grids reflow even if the CSS class is not yet applied.
- **Search input focus colour fixed** (`HistoryPage`, `InventoryPage`, `WorkshopPage`): `onFocus` border was hardcoded to `T.amber`; updated to `T.sky` per design standards.

## [2026-06-28] — Implement all audit gaps: API coverage, new pages, sort fixes

### New Features
- **API coverage — 8 new/extended files** (`src/api/`): `parties.ts` gets `updateParty`, `deleteParty`, `addLedgerEntry`; `billing.ts` gets `getInvoice`, `recordInvoicePayment`; `jobcards.ts` gets `updateJobCard`, `getJobCard` + `mapJob` now maps `priority/diagnosis/odometerIn/Out/paymentMode/paymentStatus`; `shopVehicles.ts` gets `deleteShopVehicle`; new files: `staff.ts` (invite/role/deactivate/remove), `shop.ts` (profile + bank), `audit.ts` (paginated log + stats), `purchaseBills.ts` (AI bill extract + import).
- **Staff Management page** (`src/pages/StaffPage.tsx`): table of team members with invite modal, activate/deactivate toggle, and remove button. Route: `/staff`.
- **Shop Settings page** (`src/pages/ShopSettingsPage.tsx`): shop profile form (name, GSTIN, PAN, address, WhatsApp, description) + bank details section (account number, IFSC, holder name). Saves via `PUT /api/shop/profile` and `PUT /api/shop/profile/bank`. Route: `/shop-settings`.
- **GSTR — B2CS preview tab** (`src/pages/GstrPage.tsx`): new "Preview B2CS" button (amber) fetches `res.b2cs` from the JSON endpoint and renders unregistered-buyer supply rows (supply type, GST rate, taxable, CGST/SGST/IGST). `previewMode` type extended to include `"b2cs"`.
- **Inventory — Marketplace & Catalog actions** (`src/pages/InventoryPage.tsx`): expanded product row now shows a "List / Unlist on Marketplace" toggle calling `toggleMarketplace(id, listed)` and, for locally-created parts without a `masterPartId`, a "Contribute to Catalog" button calling `contributePart()`.
- **Parties — delete button** (`src/pages/PartiesPage.tsx`): each party row in both desktop table and mobile card view has a 🗑 delete button. Calls `DELETE /api/shop/parties/:id` then removes the party from local store.
- **Job cards — priority + Mark Paid** (`src/pages/WorkshopPage.tsx`): create form has a Priority dropdown (LOW / NORMAL / HIGH / URGENT); "Mark Paid" button appears on completed/invoiced cards and calls `PATCH /api/shop/workshop/jobs/:id` with `{ paymentStatus: 'PAID' }`.
- **Sort: newest first** (`WorkshopPage.tsx`): job card list is sorted by `createdAt` descending so the most recently created card appears first.

### Type Updates
- `JobCard` interface (`src/types/index.ts`) extended with `priority`, `diagnosis`, `odometerIn`, `odometerOut`, `paymentMode`, `paymentStatus`, `notes`.

## [2026-06-28] — Implement audit gaps: inventory stats, overdue parties, GSTR preview, image gallery

### New Features
- **Inventory — Last Sold / Last Purchased / Overstock badge** (`src/pages/InventoryPage.tsx`, `src/api/sync.ts`, `src/types/index.ts`): the expanded detail strip now shows "Last Sold: Xd ago" and "Last Purchased: Xd ago" derived from the backend's `lastSoldAt`/`lastPurchasedAt` DB columns (already maintained by every sale/purchase movement). When `maxStockLevel` is set and `stock > maxStockLevel`, a blue **OVERSTOCK** badge appears next to the stock count. Fields are now mapped from `BackendInventory` → `Product` in `mapInventoryToProduct`; `Product` type extended with `lastSoldAt`, `lastPurchasedAt`, `maxStock`, `images`.
- **Inventory — multi-photo gallery** (`src/pages/InventoryPage.tsx`): the expanded detail panel shows all photos from the `images[]` array (up to 3, per the Prisma schema). Each thumbnail is a link that opens the full image in a new tab. Previously only the primary `imageUrl`/`image` was displayed in the row icon; the extra gallery photos were silently ignored.
- **Parties — overdue accounts banner** (`src/pages/PartiesPage.tsx`, `src/api/parties.ts`): the Customers tab now shows a red banner listing accounts whose oldest credit invoice has passed their `creditDays` limit. Data comes from the backend's `GET /api/shop/parties/summary/overdue` endpoint (a 2-query non-N+1 implementation that was already built but never called). Added `getOverdueParties()` to `api/parties.ts`.
- **GSTR — preview now returns real data** (`src/pages/GstrPage.tsx`): the `fetchPreview` call was sending `format: "preview"` which the backend doesn't recognise (it only supports `excel`/`json`). The backend fell through to JSON but returned `{ b2b, hsn, … }` — the frontend then tried to read `res.data` as an array and got `[]` every time. Fixed: changed to `format: "json"` and explicitly extracts `res.b2b` / `res.hsn`, mapping backend field names (`invoiceNumber → invoiceNo`, `date → invoiceDate`, `taxableValue → taxableAmount`, `invoiceValue → totalAmount`, `uqc → uom`) to the interface the render functions expect.

## [2026-06-28] — Fix: thermal preview now looks like a receipt, not a wide A4 invoice

### Fix
- **In-app invoice preview now switches layout when Thermal is selected** (`src/pages/POSBillingPage.tsx`): previously both A4 and Thermal showed the same wide card — the user couldn't tell them apart. Now selecting Thermal renders a narrow 320px receipt-style preview (monospace font, dashes as separators, centered shop header, compact item rows) so the user can clearly see what the thermal print will look like before hitting Print. Selecting A4 shows the wide professional invoice card as before.

## [2026-06-28] — Fix: invoice/print always showed "RED PISTON — Shop" instead of real shop name

### Fix
- **Shop name resolved from `currentUser.shop` when store `shops` array is empty** (`src/pages/POSBillingPage.tsx`): the POS shop lookup only searched the `shops` store array, which is frequently empty at page load. This caused the in-app invoice preview and both A4/Thermal print templates to show the "RED PISTON — Shop" fallback. Fixed by mirroring the ERPShell pattern: if `shops.find(…)` returns nothing, fall back to `currentUser.shop` from AppCtx. Removed "RED PISTON — Shop" as the hardcoded fallback string (now "My Shop") and cleared the "GSTIN —" / "India" placeholder fallbacks so they show blank rather than mock data.

## [2026-06-28] — Dual-printer support: Thermal (80mm) + A4; shop branding on all bills

### New Features
- **Two print formats** (`src/lib/printInvoice.ts`): `printInvoice()` utility replaces the inline `window.open` template in POSBillingPage. Supports `"a4"` (standard wide invoice) and `"thermal"` (80mm receipt, monospace layout matching thermal receipt printers like Dmart/Walmart billing machines). Format is saved per-device in localStorage via `src/lib/printSettings.ts`.
- **Format toggle in POS** (`src/pages/POSBillingPage.tsx`): "📄 A4 / 🧾 Thermal" toggle appears above the Print button on the invoice preview. Selection is remembered for next time.
- **Printer Settings in Settings page** (`src/pages/SettingsPage.tsx`): new "🖨 Printer & Print Format" section with visual card selector for A4 vs Thermal. Includes a help note explaining how to select the physical printer via the browser's print dialog (Ctrl+P), and how to set it as the default Windows printer to skip the dialog.
- **Shop branding on all bills** (`src/pages/POSBillingPage.tsx`, `src/lib/printInvoice.ts`): "RED PISTON" branding removed from the invoice preview panel and both print templates. Bills now show the shop's own name, address, GSTIN, phone, and logo (if `shop.logoUrl` is set). The in-app preview uses the shop's first initial as a monogram when no logo is present.

## [2026-06-28] — Custom items: full backend sync (revenue + profit tracking)

### New Features
- **Backend sync for custom items** (`billing.js`, `sync.ts`, `App.tsx`): custom line items (services, labour, ad-hoc parts not in inventory) are now synced to the backend and tracked in revenue/profit reports.
  - **DB**: `customItemsMeta JSONB` column added to the `invoices` table (migration: `prisma/migrations/add_invoice_custom_items.sql`). Stores a JSON snapshot of every custom line item (name, qty, price, GST, cost) per invoice.
  - **Backend** (`billing.js`): accepts a new `customItems` array in the POST body alongside `items`. Custom items are validated and their totals (subtotal, CGST, SGST) are added to the invoice grand total — they appear in the invoice total correctly. A `Movement` record (type `SALE`, `inventoryId = null`) is created for each custom item so revenue and profit land in the movements table and show up in Reports / History.
  - **Frontend sync** (`sync.ts`): `SyncInvoiceParams` now has a `customItems` field. The "no valid items" guard was updated — an invoice with only custom items (no inventory parts) is now synced successfully instead of being silently dropped. `syncInvoice` passes `customItems` to the API.
  - **POS handler** (`App.tsx`): `handleMultiItemSale` now extracts custom items from `data.items` (by `productId.startsWith("custom_")`) and passes them as `customItems` to `syncInvoice`, carrying name, qty, unit price, discount, GST rate, and cost price.
  - **Stock**: inventory items still get stock decremented atomically; custom items never touch stock (no `inventoryId`, no `shopInventory.updateMany`).
  - The yellow warning banner ("custom items not tracked") is now removed by this fix — custom items ARE tracked from this point forward.

## [2026-06-28] — Custom items: cost price field + sync warning

### Improvements
- **Custom item cost price** (`src/pages/POSBillingPage.tsx`): each custom item row now shows a small "Cost ₹ ___ (for profit)" input below the name. Entering a cost price makes the line-level profit calculation accurate (previously `buyPrice = 0` so custom items always showed 100% margin). Optional — leave blank for pure services where cost is zero.
- **Custom item sync warning** (`src/pages/POSBillingPage.tsx`): a yellow info banner appears below the cart whenever at least one custom item is present, explaining that custom items are not tracked in backend revenue/profit reports. This is transparent about the current sync limitation (custom items are filtered out of `syncInvoice` by `isDbId`).
- **Custom item row label**: subtitle now shows "Custom · GST X%" instead of "Stock: 999 · GST X%" to make the row type obvious.

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
