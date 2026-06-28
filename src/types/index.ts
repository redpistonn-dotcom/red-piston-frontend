/**
 * src/types/index.ts — canonical data shapes for the entire frontend.
 *
 * WHY one central file: when a backend field is renamed (e.g. `unitPrice` →
 * `unit_price` in api/sync.js), TypeScript immediately shows every callsite
 * that breaks. Without this file, the rename compiles silently and you find
 * the bug in production when a page shows "—" instead of a price.
 *
 * RULE: every shape that crosses a module boundary MUST be defined here.
 * Shapes that are entirely internal to one file can stay local.
 */

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AppUser {
  userId: number;
  phone?: string | null;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  role: UserRole;
  userType?: { id: number; name: string; slug: string } | null;
  shopId?: number | string | null;
  shop?: Shop | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  isVerified?: boolean;
  loginCount?: number;
}

export type UserRole = 'SHOP_OWNER' | 'SHOP_STAFF' | 'CUSTOMER' | 'PLATFORM_ADMIN';

// ─── Shop ────────────────────────────────────────────────────────────────────

export interface Shop {
  id?: number | string;
  shopId?: number | string;
  name: string;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  gstNo?: string | null;
  gstin?: string | null;
  pincode?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  logoUrl?: string | null;
  shopCategory?: string | null;
  whatsappNumber?: string | null;
  shopDescription?: string | null;
}

// ─── Product / Inventory ─────────────────────────────────────────────────────

export interface Product {
  /** Frontend-facing id — may be inventoryId (number) or a local "p1" seed id */
  id: number | string;
  inventoryId?: number;
  masterPartId?: number | null;
  /** Display SKU for this shop's inventory entry */
  sku?: string | null;
  globalSku?: string | null;
  name: string;
  oemNumber?: string | null;
  barcodes?: string[];
  brand?: string | null;
  category?: string | null;
  hsnCode?: string | null;
  gstRate?: number;
  unitOfSale?: string | null;
  description?: string | null;
  sellPrice: number;
  buyPrice: number;
  stock: number;
  minStock: number;
  rack?: string | null;
  location?: string | null;
  isMarketplaceListed?: boolean;
  shopId: number | string;
  image?: string | null;
  imageEmoji?: string | null;
  isUniversal?: boolean;
  compatibleVehicles?: string[];
  isActive?: boolean;
  supplier?: string | null;
  createdAt?: number;
  lastSoldAt?: number;
  lastPurchasedAt?: number;
  maxStock?: number;
  images?: string[];
}

// ─── Movements / Transactions ─────────────────────────────────────────────────

export type MovementType =
  | 'SALE'
  | 'PURCHASE'
  | 'RETURN_IN'
  | 'RETURN_OUT'
  | 'DAMAGE'
  | 'THEFT'
  | 'AUDIT'
  | 'ADJUSTMENT'
  | 'OPENING'
  | 'ESTIMATE'
  | 'RECEIPT'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'JOBCARD';

export type PaymentStatus = 'paid' | 'pending' | 'completed';

export interface Movement {
  id: string;
  shopId: number | string;
  productId: string | number | null;
  productName: string;
  type: MovementType;
  qty: number;
  unitPrice: number;
  sellingPrice?: number;
  total: number;
  totalAmount?: number;
  gstAmount?: number;
  profit?: number | null;
  discount?: number;
  customerName?: string | null;
  customerPhone?: string | null;
  vehicleReg?: string | null;
  mechanic?: string | null;
  supplier?: string | null;
  supplierName?: string | null;
  invoiceNo?: string | null;
  batchId?: string | null;
  partyId?: string | null;
  payment?: string | null;
  paymentMode?: string | null;
  creditDays?: number;
  paymentStatus?: PaymentStatus;
  note?: string;
  /** Unix timestamp in milliseconds */
  date: number;
  priceOverride?: PriceOverride;
  adjustmentMeta?: AdjustmentMeta;
  multiItemInvoice?: boolean;
}

export interface PriceOverride {
  originalPrice: number;
  overriddenPrice: number;
  reason?: string;
}

export interface AdjustmentMeta {
  type: string;
  previousStock: number;
  newStock: number;
  reason?: string;
  refundMethod?: string;
}

// ─── Parties (Customers / Suppliers) ─────────────────────────────────────────

export type PartyType = 'CUSTOMER' | 'SUPPLIER' | 'BOTH';

export interface Party {
  id: string | number;
  partyId: string | number;
  name: string;
  phone?: string | null;
  gstin?: string | null;
  address?: string | null;
  type: PartyType;
  creditLimit?: number;
  outstanding?: number;
  notes?: string | null;
  shopId: number | string;
  isActive?: boolean;
  creditDays?: number;
}

// ─── Vehicles ────────────────────────────────────────────────────────────────

export interface Vehicle {
  id: string;
  makeId?: string;
  make?: string;
  modelId?: string;
  model?: string;
  year?: string | number;
  fuelType?: string;
  registrationNumber?: string;
  ownerId?: string;
  engineType?: string;
  odometer?: string | number;
  shopId?: string | number;
}

// ─── Job Cards (Workshop) ─────────────────────────────────────────────────────

export type JobStatus =
  | 'draft'
  | 'estimated'
  | 'in_progress'
  | 'approved'
  | 'completed'
  | 'invoiced';

export interface LaborItem {
  description: string;
  hours?: number;
  rate?: number;
  total?: number;
}

export interface PartsItem {
  productId?: string | number;
  name: string;
  qty: number;
  price: number;
  total?: number;
}

export interface JobCard {
  id: string;
  jobNumber?: string;
  shopId: string | number;
  vehicleId?: string;
  vehicleReg?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  status: JobStatus;
  description?: string;
  laborItems?: LaborItem[];
  partsItems?: PartsItem[];
  estimatedCost?: number;
  finalCost?: number;
  mechanicId?: string;
  mechanicName?: string;
  startedAt?: number;
  completedAt?: number;
  createdAt?: number;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'NEW'
  | 'placed'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  shopId: string | number;
  status: OrderStatus;
  total?: number;
  items?: OrderItem[];
  createdAt?: number;
  updatedAt?: number;
}

export interface OrderItem {
  productId: string | number;
  name: string;
  qty: number;
  price: number;
}

// ─── Receipts ────────────────────────────────────────────────────────────────

export interface Receipt {
  id: string;
  partyId?: string;
  partyName?: string;
  amount: number;
  paymentMode: string;
  date: number;
  notes?: string;
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | number;
  detail?: string;
  timestamp: number;
}

// ─── Business handler data shapes ────────────────────────────────────────────

export interface SaleData {
  type?: string;
  productId: string | number;
  qty: number;
  sellPrice: number;
  total: number;
  gstAmount?: number;
  profit?: number;
  discount?: number;
  customerName?: string;
  customerPhone?: string;
  vehicleReg?: string;
  mechanic?: string;
  notes?: string;
  invoiceNo: string;
  partyId?: string;
  paymentMode?: string;
  payments?: Record<string, number>;
  payment?: string;
  date: number;
  priceOverride?: PriceOverride;
}

export interface SaleLineItem {
  productId: string | number;
  name: string;
  qty: number;
  sellPrice: number;
  total: number;
  gstAmount?: number;
  profit?: number;
  discount?: number;
  priceOverride?: PriceOverride;
}

export interface MultiSaleData {
  type?: string;
  items: SaleLineItem[];
  total: number;
  customerName?: string;
  customerPhone?: string;
  vehicleReg?: string;
  mechanic?: string;
  notes?: string;
  invoiceNo: string;
  partyId?: string;
  paymentMode?: string;
  payments?: Record<string, number>;
  date: number;
}

export interface PurchaseData {
  productId: string | number;
  qty: number;
  buyPrice: number;
  total: number;
  gstAmount?: number;
  newSellPrice?: number;
  supplier?: string;
  invoiceNo?: string;
  payment?: string;
  creditDays?: number;
  notes?: string;
  date: number;
}

export interface AdjustmentData {
  productId: string | number;
  adjustType: string;
  qty: number;
  stockDirection: number;
  previousStock: number;
  reason?: string;
  reasonDetail?: string;
  notes?: string;
  refundMethod?: string;
  refundAmount?: number;
  originalInvoice?: string;
  supplierName?: string;
  date: number;
}

export interface PaymentReceiptData {
  partyName: string;
  partyPhone?: string;
  amount: number;
  paymentMode: string;
  notes?: string;
  movementIds?: string[];
}

export interface BulkStockInData {
  products?: Partial<Product>[];
  movements?: Partial<Movement>[];
}

// ─── Toast ───────────────────────────────────────────────────────────────────

export interface ToastItem {
  id: string;
  message: string;
  variant?: 'success' | 'error' | 'info' | 'warning' | 'emerald';
  title?: string;
}

// ─── AppCtx (shared context value) ───────────────────────────────────────────

export interface AppCtxValue {
  /* Modal state */
  pModal: { open: boolean; product: Product | null };
  setPModal: (v: { open: boolean; product: Product | null }) => void;
  catalogModal: boolean;
  setCatalogModal: (v: boolean) => void;
  addProdOpen: boolean;
  setAddProdOpen: (v: boolean) => void;
  /* Toast */
  toast: (message: string, variant?: string, title?: string) => void;
  toasts: ToastItem[];
  removeToast: (id: string) => void;
  /* Auth */
  currentUser: AppUser | null;
  handleLogin: (user: AppUser) => void;
  handleLogout: () => void;
  /* Business handlers — pages consume these via useContext(AppCtx) */
  saveProduct: (p: Product) => boolean;
  handleBulkStockIn: (data: BulkStockInData) => void;
  handleSale: (data: SaleData) => void;
  handleMultiItemSale: (data: MultiSaleData) => void;
  handlePurchase: (data: PurchaseData) => void;
  handleAdjustment: (data: AdjustmentData) => void;
  handlePaymentReceipt: (data: PaymentReceiptData) => void;
}

// ─── Store state ──────────────────────────────────────────────────────────────

export interface StoreState {
  shops: Shop[] | null;
  products: Product[] | null;
  movements: Movement[] | null;
  orders: Order[] | null;
  purchases: Movement[] | null;
  parties: Party[] | null;
  vehicles: Vehicle[] | null;
  jobCards: JobCard[] | null;
  auditLog: AuditEntry[];
  receipts: Receipt[];
  cart: CartItem[];
  isCartOpen: boolean;
  selectedVehicle: Vehicle | null;
  appMode: 'marketplace' | 'erp';
  activeShopId: number | string;
  loaded: boolean;
  apiSynced: boolean;
}

export interface CartItem {
  productId: string | number;
  name: string;
  price: number;
  qty: number;
  shopId: string | number;
  image?: string;
  /** Marketplace cart entries carry the full product + shop listing context */
  product?: {
    id?: string | number;
    name?: string;
    brand?: string;
    image?: string;
    [key: string]: unknown;
  };
  listing?: {
    shop_id?: string | number;
    product_id?: string | number;
    price?: number;
    shop?: { id?: string | number; name?: string; city?: string; distance_km?: number; [key: string]: unknown };
    [key: string]: unknown;
  };
  /** Per-shop delivery choice: "standard" | "express" | "pickup" */
  deliveryOption?: string;
}

// ─── Billing utilities ────────────────────────────────────────────────────────

export interface SaleTotalResult {
  subtotal: number;
  discountAmount: number;
  afterDiscount: number;
  gstAmount: number;
  profit: number;
  total: number;
}

export interface SaleTotalInput {
  qty: number;
  sellPrice: number;
  discount?: number;
  gstRate?: number;
  buyPrice?: number;
}
