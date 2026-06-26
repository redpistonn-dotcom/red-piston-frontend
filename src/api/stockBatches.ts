import { api } from './client.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StockBatch {
  id: number;
  inventoryId: number;
  batchNumber?: string | null;
  serialNumber?: string | null;
  qtyReceived: number;
  qtyRemaining: number;
  costPrice: number;
  supplierName?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
  receivedAt: string;
  createdAt: string;
}

export interface CreateBatchInput {
  batchNumber?: string;
  serialNumber?: string;
  qtyReceived: number;
  costPrice: number;
  supplierName?: string;
  expiryDate?: string;
  notes?: string;
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

/** List all batches for a specific inventory item. */
export const getBatchesForProduct = (inventoryId: number): Promise<StockBatch[]> =>
  api.get<StockBatch[]>(`/api/shop/inventory/${inventoryId}/batches`);

/** Add a new batch/lot entry to an inventory item. */
export const addBatch = (inventoryId: number, data: CreateBatchInput): Promise<StockBatch> =>
  api.post<StockBatch>(`/api/shop/inventory/${inventoryId}/batches`, data);

/** Search across all batches by batch number or serial number. */
export const searchBatches = (search: string): Promise<(StockBatch & { productName?: string; sku?: string })[]> =>
  api.get(`/api/shop/inventory/batches`, { search });
