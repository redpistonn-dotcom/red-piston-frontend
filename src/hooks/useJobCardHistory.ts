/**
 * useJobCardHistory — fetches the shop's job cards and exposes them as
 * Movement-shaped "JOBCARD" entries so the History page (and any movement-based
 * view) can show workshop job cards alongside POS/marketplace movements.
 *
 * Each job card becomes one history entry:
 *   - amount  = parts + labour (the job's grand total)
 *   - invoice = INV-<jobNumber> once the job is "invoiced", else the job number
 *   - note    = "Job Card · <status>"
 *   - date    = completedAt ?? createdAt
 *
 * Read-only: it never mutates job cards or inventory.
 */
import { useState, useEffect, useCallback } from "react";
import { fetchJobCards } from "../api/jobcards";
import { invoiceNoForJob } from "../utils/invoice";
import type { Movement } from "../types";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  estimated: "Estimated",
  approved: "Approved",
  in_progress: "In Progress",
  completed: "Completed",
  invoiced: "Invoiced",
  cancelled: "Cancelled",
};

const sameShop = (a: any, b: any) => String(a ?? "") === String(b ?? "");

function toMovement(j: any): Movement {
  const partsTotal = (j.parts || []).reduce((s: number, p: any) => s + (Number(p.qty) || 0) * (Number(p.price) || 0), 0);
  const labourTotal = (j.labour || []).reduce((s: number, l: any) => s + (Number(l.amount) || 0), 0);
  const total = partsTotal + labourTotal;
  const invoiced = j.status === "invoiced";
  const veh = [j.vehicleMake, j.vehicleModel].filter(Boolean).join(" ").trim();
  return {
    id: `job-${j.jobId ?? j.id}`,
    shopId: j.shopId,
    productId: `job-${j.jobId ?? j.id}`,
    productName: `Job ${j.jobNumber || ""}${veh ? " · " + veh : ""}`.trim(),
    type: "JOBCARD",
    qty: (j.parts || []).length,
    unitPrice: 0,
    total,
    profit: 0,
    customerName: j.customerName || "Walk-in",
    // Show the generated invoice number once invoiced; otherwise the job number.
    invoiceNo: invoiced ? invoiceNoForJob(j.jobNumber, j.jobId ?? j.id) : (j.jobNumber || ""),
    paymentMode: "—",
    paymentStatus: "paid",
    note: `Job Card · ${STATUS_LABEL[j.status] || j.status || ""}`.trim(),
    date: j.completedAt || j.createdAt || Date.now(),
  } as Movement;
}

export function useJobCardHistory(activeShopId: number | string) {
  const [jobMovements, setJobMovements] = useState<Movement[]>([]);

  const reload = useCallback(async () => {
    try {
      const jobs = await fetchJobCards();
      if (!Array.isArray(jobs)) return;
      setJobMovements(jobs.filter((j: any) => sameShop(j.shopId, activeShopId)).map(toMovement));
    } catch { /* leave previous entries on failure */ }
  }, [activeShopId]);

  useEffect(() => { reload(); }, [reload]);

  return { jobMovements, reload };
}
