/**
 * Data bridging layer: maps backend API shapes → typed frontend store shapes.
 *
 * WHY this file matters most for TypeScript: every field name here is a contract
 * between the backend API and the frontend store. Before TS, renaming
 * `sellingPrice` to `sellPrice` in the backend silently broke every price display.
 * Now it's a compile error you see before committing.
 */
import type { Product, Movement, Party } from '../types';
import { api } from './client.js';

// ─── Backend API shapes (what the server returns) ─────────────────────────────
// These mirror the Prisma select fields in inventory.js / parties.js.

interface BackendInventory {
  inventoryId: number;
  masterPartId?: number | null;
  shopId: number;
  sellingPrice: number | string;
  buyingPrice: number | string;
  mrp?: number | string | null;
  nickname?: string | null;
  customPartName?: string | null;
  stockQty?: number;
  computedStock?: number;
  minStockAlert?: number;
  rackLocation?: string | null;
  isMarketplaceListed?: boolean;
  imageUrl?: string | null;
  customCategoryL1?: string | null;
  customIcon?: string | null;
  masterPart?: BackendMasterPart | null;
  partName?: string;
  movements?: BackendMovement[];
  createdAt?: string | null;
  lastSoldAt?: string | null;
  lastPurchasedAt?: string | null;
  maxStockLevel?: number | null;
  images?: string | string[] | null;
}

interface BackendMasterPart {
  partName?: string;
  brand?: string;
  categoryL1?: string;
  categoryL2?: string;
  hsnCode?: string;
  gstRate?: number | string;
  unitOfSale?: string;
  description?: string;
  imageUrl?: string | null;
  oemNumbers?: string | null;
  oemNumber?: string | null;
  primaryOemNumber?: string | null;
  barcodes?: string | string[] | null;
  specifications?: Record<string, unknown>;
}

interface BackendMovement {
  movementId?: string | number;
  id?: string | number;
  shopId?: number;
  inventoryId?: number;
  productId?: string | number;
  partyId?: string | number | null;
  type: string;
  qty: number;
  unitPrice?: number | string;
  totalAmount?: number | string;
  total?: number | string;
  gstAmount?: number | string;
  profit?: number | string;
  paymentMode?: string;
  notes?: string;
  createdAt?: string;
  invoiceId?: string;
  inventory?: { customPartName?: string | null; masterPart?: { partName?: string } };
  party?: { name?: string; type?: string } | null;
  productName?: string;
}

interface BackendParty {
  partyId: string | number;
  name: string;
  phone?: string | null;
  gstin?: string | null;
  address?: string | null;
  type?: string;
  creditLimit?: number | string;
  outstanding?: number | string;
  notes?: string | null;
  shopId: number;
}

interface InventoryApiResponse {
  inventory?: BackendInventory[];
}

interface PartiesApiResponse {
  parties?: BackendParty[];
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

export function mapInventoryToProduct(inv: BackendInventory): Product {
  const mp = inv.masterPart;
  // Priority: shop's Cloudinary photo → shop's emoji override → master part image → category emoji
  const imageVal = inv.imageUrl || inv.customIcon || mp?.imageUrl || getCategoryEmoji(inv.customCategoryL1 || mp?.categoryL1);
  // primaryOemNumber is the actual singular field on MasterPart — there is no
  // plain "oemNumber"; oemNumbers[0] is only a fallback for parts that only
  // ever got the array populated (e.g. some catalog imports).
  const oemStr = mp?.primaryOemNumber || (Array.isArray(mp?.oemNumbers) ? mp?.oemNumbers[0] : mp?.oemNumbers) || '';
  const barcodesArr = mp?.barcodes
    ? (Array.isArray(mp.barcodes) ? mp.barcodes : [mp.barcodes])
    : [];

  return {
    id: inv.inventoryId,
    inventoryId: inv.inventoryId,
    masterPartId: inv.masterPartId ?? undefined,
    globalSku: String(inv.masterPartId ?? ''),
    name: inv.nickname || inv.customPartName || mp?.partName || inv.partName || 'Unknown Part',
    nickname: inv.nickname || null,
    oemNumber: oemStr || null,
    barcodes: barcodesArr as string[],
    brand: mp?.brand || null,
    category: normalizeCategory(inv.customCategoryL1 || mp?.categoryL1),
    hsnCode: mp?.hsnCode || null,
    gstRate: parseFloat(String(mp?.gstRate ?? 18)),
    unitOfSale: mp?.unitOfSale || null,
    description: mp?.description || null,
    sellPrice: parseFloat(String(inv.sellingPrice ?? 0)),
    buyPrice: parseFloat(String(inv.buyingPrice ?? 0)),
    mrp: inv.mrp != null ? parseFloat(String(inv.mrp)) : null,
    stock: inv.computedStock ?? inv.stockQty ?? 0,
    minStock: inv.minStockAlert ?? 5,
    rack: inv.rackLocation || null,
    location: inv.rackLocation || null,
    isMarketplaceListed: inv.isMarketplaceListed ?? false,
    shopId: inv.shopId,
    image: imageVal,
    imageEmoji: getCategoryEmoji(inv.customCategoryL1 || mp?.categoryL1),
    sku: oemStr || String(inv.inventoryId).slice(0, 8),
    createdAt: inv.createdAt ? new Date(inv.createdAt).getTime() : undefined,
    lastSoldAt: inv.lastSoldAt ? new Date(inv.lastSoldAt).getTime() : undefined,
    lastPurchasedAt: inv.lastPurchasedAt ? new Date(inv.lastPurchasedAt).getTime() : undefined,
    maxStock: inv.maxStockLevel ?? undefined,
    images: inv.images
      ? (Array.isArray(inv.images) ? inv.images : JSON.parse(String(inv.images))) as string[]
      : undefined,
  };
}

// Maps DB categoryL1 values → CATEGORIES constant (used by the inventory filter pills).
// When the DB adds new category names, add them here so the filter pills work correctly.
const DB_TO_CATEGORY: Record<string, string> = {
  'Engine Oils':          'Engine',
  'Fuel System':          'Engine',
  'Exhaust':              'Engine',
  'Body & Exterior':      'Body',
  'Clutch & Transmission':'Clutch',
  'Ignition':             'Electrical',
  'AC & Heating':         'Cooling',
  'Fluids':               'Cooling',
  'Radiator':             'Cooling',
  'Wheel & Tyre':         'Tyres',
  'Tyres & Wheels':       'Tyres',
  'Steering & Suspension':'Suspension',
};

function normalizeCategory(raw?: string | null): string {
  if (!raw) return 'General';
  return DB_TO_CATEGORY[raw] ?? raw;
}

function getCategoryEmoji(category?: string | null): string {
  const map: Record<string, string> = {
    'Brakes': '🛑', 'Filters': '🔘', 'Ignition': '⚡', 'Electrical': '🔋',
    'Engine': '⚙️', 'Suspension': '🔩', 'Body & Exterior': '🚗',
    'Engine Oils': '🛢️', 'Fluids': '💧', 'Clutch & Transmission': '⚙️',
  };
  return (category && map[category]) || '🔧';
}

export function mapMovement(m: BackendMovement): Movement {
  const isSupply = ['PURCHASE', 'OPENING', 'RETURN_IN'].includes(m.type);
  const partyName = m.party?.name || m.partyName || null;
  const productName = m.inventory?.customPartName || m.inventory?.masterPart?.partName || m.productName || '';
  return {
    id: String(m.movementId || m.id),
    shopId: m.shopId ?? 0,
    productId: m.inventoryId || m.productId || null,
    productName,
    type: m.type as Movement['type'],
    qty: m.qty,
    unitPrice: parseFloat(String(m.unitPrice ?? 0)),
    sellingPrice: parseFloat(String(m.unitPrice ?? 0)),
    total: parseFloat(String(m.totalAmount ?? m.total ?? 0)),
    gstAmount: parseFloat(String(m.gstAmount ?? 0)),
    profit: parseFloat(String(m.profit ?? 0)),
    payment: m.paymentMode || null,
    paymentMode: m.paymentMode || null,
    paymentStatus: 'paid',
    note: m.notes || '',
    date: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
    invoiceNo: m.referenceNumber || (m.invoiceId ? String(m.invoiceId) : null),
    invoiceId: m.invoiceId ?? null,
    partyId: m.partyId ? String(m.partyId) : null,
    supplierName: isSupply ? partyName : null,
    customerName: isSupply ? null : partyName,
  };
}

export function mapParty(p: BackendParty): Party {
  // Normalize to lowercase so PartiesPage comparisons ("customer","supplier") work
  // whether the party came from the API (uppercase "CUSTOMER") or local store (lowercase).
  const rawType = (p.type || 'customer').toLowerCase();
  const type = (['customer', 'supplier', 'both'].includes(rawType) ? rawType : 'customer') as Party['type'];
  return {
    id: p.partyId,
    partyId: p.partyId,
    name: p.name,
    phone: p.phone || null,
    gstin: p.gstin || null,
    address: p.address || null,
    type,
    creditLimit: parseFloat(String(p.creditLimit ?? 0)),
    outstanding: parseFloat(String(p.outstanding ?? 0)),
    notes: p.notes || null,
    shopId: p.shopId,
  };
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

export async function fetchInventory(): Promise<Product[] | null> {
  try {
    const data = await api.get<InventoryApiResponse>('/api/shop/inventory');
    return (data.inventory || []).map(mapInventoryToProduct);
  } catch (err: unknown) {
    // A 403 means this account's granted sections don't include inventory (a
    // shop-staff member invited with limited access) — that's a permanent,
    // correct state, not a transient failure. Returning null here made
    // ERPShell's loader treat it as "server error, retry" forever, which
    // could never succeed and left restricted staff stuck on an endless
    // "could not load shop data" banner. Resolve to an empty list instead.
    if ((err as { status?: number })?.status === 403) return [];
    console.warn('[Sync] Could not fetch inventory:', (err as Error).message);
    return null;
  }
}

interface CatalogSearchResponse {
  inventory?: BackendInventory[];
  total?: number;
}

// Search across ALL shop inventory (including zero-priced seeded catalog items).
// Used by the "Parts Catalog" tab to let the shop owner find and configure parts.
export async function searchCatalog(query: string, limit = 50): Promise<Product[]> {
  try {
    const qp = new URLSearchParams({ all: 'true', search: query, limit: String(limit) });
    const data = await api.get<CatalogSearchResponse>(`/api/shop/inventory?${qp}`);
    return (data.inventory || []).map(mapInventoryToProduct);
  } catch (err: unknown) {
    console.warn('[Sync] Catalog search failed:', (err as Error).message);
    return [];
  }
}

export async function fetchParties(): Promise<Party[] | null> {
  try {
    const data = await api.get<PartiesApiResponse>('/api/shop/parties');
    return (data.parties || []).map(mapParty);
  } catch (err: unknown) {
    // See fetchInventory's comment — a 403 (staff account without the
    // "parties" section) is a permanent, expected state, not a failure.
    if ((err as { status?: number })?.status === 403) return [];
    console.warn('[Sync] Could not fetch parties:', (err as Error).message);
    return null;
  }
}

interface MovementsApiResponse {
  movements?: BackendMovement[];
  total?: number;
}

export interface MovementsParams {
  limit?: number;
  offset?: number;
  type?: string;
  from?: string;
  to?: string;
  search?: string;
  partyId?: string;
}

export async function fetchMovements(params?: MovementsParams): Promise<Movement[] | null> {
  try {
    const qp = new URLSearchParams();
    if (params?.limit   != null) qp.set('limit',   String(params.limit));
    if (params?.offset  != null) qp.set('offset',  String(params.offset));
    if (params?.type)            qp.set('type',    params.type);
    if (params?.from)            qp.set('from',    params.from);
    if (params?.to)              qp.set('to',      params.to);
    if (params?.search)          qp.set('search',  params.search);
    if (params?.partyId)         qp.set('partyId', params.partyId);
    const qs = qp.toString();
    // Movements live under the inventory router (mounted at /api/shop/inventory),
    // so the real path is /api/shop/inventory/movements (NOT /api/shop/movements,
    // which 404s and silently left History/Reports empty).
    const data = await api.get<MovementsApiResponse>(`/api/shop/inventory/movements${qs ? `?${qs}` : ''}`);
    return (data.movements || []).map(mapMovement);
  } catch (err: unknown) {
    // See fetchInventory's comment — a 403 (staff account without the
    // "inventory" section, which movements are mounted under) is a
    // permanent, expected state, not a failure.
    if ((err as { status?: number })?.status === 403) return [];
    console.warn('[Sync] Could not fetch movements:', (err as Error).message);
    return null;
  }
}

// ─── Party ledger ─────────────────────────────────────────────────────────────

export interface LedgerEntry {
  ledgerId: string;
  entryType: string;
  debitAmount: number;
  creditAmount: number;
  balanceAfter: number;
  createdAt: string;
  referenceNo?: string | null;
  notes?: string | null;
  invoice?: { invoiceNumber: string; totalAmount: number; invoiceType: string } | null;
}

export interface PartyLedgerResult {
  party: { partyId: string; name: string; outstanding: number; creditLimit: number; creditDays: number };
  entries: LedgerEntry[];
  total: number;
}

export async function fetchPartyLedger(partyId: string | number, params?: { limit?: number; offset?: number }): Promise<PartyLedgerResult | null> {
  try {
    const qp = new URLSearchParams();
    if (params?.limit  != null) qp.set('limit',  String(params.limit));
    if (params?.offset != null) qp.set('offset', String(params.offset));
    const qs = qp.toString();
    const data = await api.get<PartyLedgerResult & { success: boolean }>(
      `/api/shop/parties/${partyId}/ledger${qs ? `?${qs}` : ''}`
    );
    return data;
  } catch (err: unknown) {
    console.warn('[Sync] Could not fetch party ledger:', (err as Error).message);
    return null;
  }
}

export async function syncProductSave(product: Partial<Product>): Promise<void> {
  try {
    if (product.inventoryId) {
      await api.put(`/api/shop/inventory/${product.inventoryId}`, {
        sellingPrice: product.sellPrice,
        buyingPrice: product.buyPrice,
        mrp: product.mrp ?? undefined,
        rackLocation: product.rack ?? product.location,
        minStockAlert: product.minStock,
        maxStockLevel: product.maxStock ?? undefined,
        // customPartName lets a shop override the catalog part name locally
        customPartName: product.name ?? undefined,
        shopSpecificNotes: product.notes ?? undefined,
        isMarketplaceListed: product.isMarketplaceListed,
        // Cloudinary photo — save as imageUrl; emoji icons save separately as customIcon
        ...(typeof product.image === 'string' && product.image.startsWith('http') && { imageUrl: product.image }),
        ...(typeof product.image === 'string' && !product.image.startsWith('http') && product.image && { customIcon: product.image }),
        // Category override — lets the shop assign a different category than the master catalog
        ...(product.category !== undefined && { customCategoryL1: product.category }),
        // stock qty — included so the backend can create an AUDIT movement when it changes
        ...(product.stock !== undefined && { stockQty: product.stock }),
      });
    }
  } catch (err: unknown) {
    console.warn('[Sync] Product save to API failed:', (err as Error).message);
  }
}

// ─── Fire-and-forget sync helpers ─────────────────────────────────────────────

interface SyncInvoiceCustomItem {
  name: string;
  qty: number;
  unitPrice: number;
  discount?: number;
  gstRate?: number;
  buyingPrice?: number;
}

interface SyncInvoiceParams {
  items: { inventoryId: string | number; qty: number; unitPrice: number; discount?: number }[];
  customItems?: SyncInvoiceCustomItem[];
  partyId?: string;
  partyName?: string;
  partyPhone?: string;
  paymentMode?: string;
  cashAmount?: number;
  upiAmount?: number;
  creditAmount?: number;
  notes?: string;
  /** Redeem an existing store-credit note against this sale — requires cashAmount
   *  or upiAmount to also be forwarded for the remainder (see syncInvoice). */
  appliedCreditNoteId?: number;
  appliedCreditAmount?: number;
}

// Returns { ok, error? } — never throws.
export async function syncInvoice(params: SyncInvoiceParams): Promise<{ ok: boolean; error?: string }> {
  // Filter to real DB items only — custom items ("custom_${Date.now()}") fail isDbId.
  const realItems = params.items?.filter(item => isDbId(item.inventoryId));
  const hasCustom = (params.customItems?.length ?? 0) > 0;
  // Bail only when there is truly nothing to sync (no real inventory items AND no custom items).
  if (!realItems?.length && !hasCustom) return { ok: false, error: 'No valid items to sync' };
  try {
    const res = await api.post<{ success: boolean; invoice?: { invoiceId: number; invoiceNumber: string } }>('/api/billing/invoice', {
      items: (realItems ?? []).map(item => ({
        inventoryId: item.inventoryId,
        qty: item.qty,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
      })),
      customItems: hasCustom ? params.customItems : undefined,
      partyId: params.partyId || undefined,
      partyName: params.partyName || undefined,
      partyPhone: params.partyPhone || undefined,
      paymentMode: params.paymentMode || 'CASH',
      // Do not forward cashAmount/upiAmount in the default case — the frontend uses
      // GST-inclusive totals while the backend recomputes GST-exclusive, so the
      // amounts never match exactly and the backend's payment-breakdown check
      // returns 400. paymentMode is sufficient for the backend to record how the
      // customer paid. creditAmount IS needed so the backend can write the
      // party-ledger debit on credit (Udhaar) sales.
      //
      // EXCEPTION: once a store-credit note is applied, the backend's breakdown
      // check activates unconditionally (appliedAmt > 0 triggers it) and needs
      // cash/upi to reconcile the remainder — so forward it only in that case,
      // relying on the backend's ±₹1 rounding tolerance.
      creditAmount: params.creditAmount || undefined,
      appliedCreditNoteId: params.appliedCreditNoteId || undefined,
      appliedCreditAmount: params.appliedCreditAmount || undefined,
      cashAmount: params.appliedCreditAmount ? (params.cashAmount || undefined) : undefined,
      upiAmount: params.appliedCreditAmount ? (params.upiAmount || undefined) : undefined,
      notes: params.notes || undefined,
    });
    // Tell the POS page which backend invoice this sale became so it can offer
    // "Download PDF" / "Share on WhatsApp" on the invoice preview.
    if (res?.invoice?.invoiceId) {
      window.dispatchEvent(new CustomEvent('invoice:synced', {
        detail: { invoiceId: res.invoice.invoiceId, invoiceNumber: res.invoice.invoiceNumber },
      }));
    }
    return { ok: true };
  } catch (err: unknown) {
    const msg = (err as Error).message;
    console.error('[Sync] Invoice sync failed:', msg);
    return { ok: false, error: msg };
  }
}

interface SyncPurchaseParams {
  inventoryId: string | number;
  qty: number;
  buyingPrice: number;
  newSellingPrice?: number;
  supplier?: string;
  invoiceNo?: string;
  payment?: string;
  creditDays?: number;
  notes?: string;
}

export async function syncPurchase(params: SyncPurchaseParams): Promise<void> {
  if (!isDbId(params.inventoryId)) return;
  try {
    await api.post('/api/shop/inventory/purchase', params);
  } catch (err: unknown) {
    console.error('[Sync] Purchase sync failed — saved locally, backend out of sync:', (err as Error).message);
  }
}

interface SyncAdjustmentParams {
  inventoryId: string | number;
  type: string;
  qty: number;
  reason?: string;
  refundMethod?: string;
  refundAmount?: number;
  supplierName?: string;
  originalInvoice?: string;
  notes?: string;
}

export async function syncAdjustment(params: SyncAdjustmentParams): Promise<void> {
  if (!isDbId(params.inventoryId)) return;
  try {
    await api.post('/api/shop/inventory/adjust', params);
  } catch (err: unknown) {
    console.error('[Sync] Adjustment sync failed — saved locally, backend out of sync:', (err as Error).message);
  }
}

function isDbId(id: string | number | undefined | null): boolean {
  if (typeof id === 'number') return Number.isInteger(id) && id > 0;
  if (typeof id === 'string') {
    // Positive integer string
    if (/^\d+$/.test(id)) return parseInt(id, 10) > 0;
    // Legacy UUID
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  }
  return false;
}
