/**
 * useShopMarketplaceSales — fetches the logged-in shop's incoming marketplace
 * orders and exposes them as Movement-shaped SALE entries so the ERP pages
 * (History, Reports, Dashboard) can fold marketplace sales into their existing
 * movement-based calculations.
 *
 * - Non-cancelled orders (PENDING → DELIVERED) become SALE movements and are
 *   counted as revenue from the moment they are ORDERED.
 * - Cancelled / returned orders are excluded from the sale movements (so they
 *   drop out of History / Dashboard / revenue) and surfaced separately via
 *   `cancelled` for the Reports cancellation analysis.
 *
 * Stock is already incremented/decremented server-side at order placement /
 * cancellation, so this hook is read-only and never mutates inventory.
 */
import { useState, useEffect, useCallback } from "react";
import { api, getAccessToken } from "../api/client";
import type { Movement } from "../types";

const STATUS_LABEL: Record<string, string> = {
  PENDING:   "Ordered",
  CONFIRMED: "Confirmed",
  PACKED:    "Packed",
  SHIPPED:   "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED:  "Returned",
};

const isCancelled = (status: string) => status === "CANCELLED" || status === "RETURNED";

export interface CancelledOrderRow {
  orderId: number;
  orderNumber: string;
  total: number;
  date: number;
  customerName: string;
  status: string;
}
export interface CancelledSummary {
  count: number;
  total: number;
  orders: CancelledOrderRow[];
}

function toMovements(order: any, ts: number, customerName: string, shopId: number | string): Movement[] {
  // Marketplace orders are prepaid/online — mark as paid so they don't pollute
  // the POS "Udhaar" (credit receivable) figures.
  const paymentStatus = "paid" as Movement["paymentStatus"];
  const statusNote = `Marketplace · ${STATUS_LABEL[order.status] || order.status}`;
  const items: any[] = order.items || [];

  if (items.length === 0) {
    return [{
      id: `mp-${order.orderId}-0`,
      shopId,
      productId: `mp-${order.orderId}`,
      productName: order.orderNumber || "Marketplace order",
      type: "SALE",
      qty: 0,
      unitPrice: 0,
      total: Number(order.total) || 0,
      profit: 0,
      customerName,
      invoiceNo: order.orderNumber || `MO-${order.orderId}`,
      paymentMode: order.paymentMode || "Online",
      paymentStatus,
      note: statusNote,
      date: ts,
    }];
  }

  return items.map((it, i) => {
    const qty = Number(it.qty) || 0;
    const unitPrice = Number(it.unitPrice) || 0;
    const total = Number(it.total) || unitPrice * qty;
    return {
      id: `mp-${order.orderId}-${i}`,
      shopId,
      productId: it.inventoryId ?? `mp-${order.orderId}`,
      productName: it.partName || it.inventory?.masterPart?.partName || "Part",
      type: "SALE",
      qty,
      unitPrice,
      total,
      profit: 0,
      customerName,
      invoiceNo: order.orderNumber || `MO-${order.orderId}`,
      paymentMode: order.paymentMode || "Online",
      paymentStatus,
      note: statusNote,
      date: ts,
    };
  });
}

export function useShopMarketplaceSales(activeShopId: number | string) {
  const [saleMovements, setSaleMovements] = useState<Movement[]>([]);
  const [cancelled, setCancelled] = useState<CancelledSummary>({ count: 0, total: 0, orders: [] });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!getAccessToken()) return;
    setLoading(true);
    try {
      const res = await api.get<{ data?: { orders?: any[] }; orders?: any[] }>(
        "/api/marketplace/orders/shop",
        { limit: "200" },
      );
      const orders: any[] = res?.data?.orders || res?.orders || [];

      const sales: Movement[] = [];
      const cancelledRows: CancelledOrderRow[] = [];
      let cancelTotal = 0;

      for (const o of orders) {
        const ts = o.createdAt ? new Date(o.createdAt).getTime() : Date.now();
        const customerName = o.customerName || o.customer?.name || "Online Customer";
        if (isCancelled(o.status)) {
          cancelledRows.push({
            orderId: o.orderId,
            orderNumber: o.orderNumber || `MO-${o.orderId}`,
            total: Number(o.total) || 0,
            date: ts,
            customerName,
            status: o.status,
          });
          cancelTotal += Number(o.total) || 0;
          continue;
        }
        sales.push(...toMovements(o, ts, customerName, activeShopId));
      }

      setSaleMovements(sales);
      setCancelled({ count: cancelledRows.length, total: cancelTotal, orders: cancelledRows });
    } catch (err) {
      console.error("[useShopMarketplaceSales]", err);
    } finally {
      setLoading(false);
    }
  }, [activeShopId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { saleMovements, cancelled, loading, refresh };
}
