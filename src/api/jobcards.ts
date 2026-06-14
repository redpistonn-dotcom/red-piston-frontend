/**
 * Job-card persistence API. The backend JobCard model is leaner than the local
 * job card (no checklist / labour line-items), so this maps the core fields and
 * translates between the two status vocabularies.
 *
 * Frontend status: draft | estimated | approved | in_progress | completed | invoiced | cancelled
 * Backend status:  RECEIVED | IN_PROGRESS | WAITING_PARTS | READY | DELIVERED | CANCELLED
 */
import { api } from "./client.js";

const BE_TO_FE: Record<string, string> = {
  RECEIVED: "estimated",
  IN_PROGRESS: "in_progress",
  WAITING_PARTS: "approved",
  READY: "completed",
  DELIVERED: "invoiced",
  CANCELLED: "cancelled",
};
export const FE_TO_BE: Record<string, string> = {
  draft: "RECEIVED",
  estimated: "RECEIVED",
  approved: "WAITING_PARTS",
  in_progress: "IN_PROGRESS",
  completed: "READY",
  invoiced: "DELIVERED",
  cancelled: "CANCELLED",
};

function mapJob(j: any) {
  return {
    id: String(j.jobId),
    jobId: j.jobId,
    jobNumber: j.jobNumber,
    shopId: j.shopId,
    status: BE_TO_FE[j.status] || "estimated",
    customerName: j.customerName || "",
    customerId: "",
    vehicleId: "",
    // Denormalized vehicle (the local vehicle row doesn't exist for DB jobs).
    vehicleMake: j.vehicleMake || "",
    vehicleModel: j.vehicleModel || "",
    vehicleYear: j.vehicleYear || "",
    vehicleReg: j.vehicleReg || "",
    vehicleFuel: j.vehicleFuel || "",
    complaints: j.complaint || "",
    assignedTo: j.assignedTo || null,
    labour: j.labourCharge ? [{ description: "Labour", amount: Number(j.labourCharge) }] : [],
    parts: (j.items || []).map((it: any) => ({
      name: it.partName || it.inventory?.masterPart?.partName || "Part",
      qty: it.qty,
      price: Number(it.unitPrice || 0),
    })),
    checklist: [],
    estimatedAmount: Number(j.labourCharge || 0),
    createdAt: j.createdAt ? new Date(j.createdAt).getTime() : Date.now(),
    startedAt: j.startedAt ? new Date(j.startedAt).getTime() : null,
    completedAt: j.completedAt ? new Date(j.completedAt).getTime() : null,
  };
}

export async function fetchJobCards(): Promise<any[] | null> {
  try {
    const res: any = await api.get("/api/shop/workshop/jobs");
    const jobs = res?.data || res?.jobs || [];
    return Array.isArray(jobs) ? jobs.map(mapJob) : [];
  } catch (err: any) {
    console.warn("[Sync] Could not fetch job cards:", err?.message);
    return null;
  }
}

export async function createJobCard(body: Record<string, any>): Promise<any> {
  const res: any = await api.post("/api/shop/workshop/jobs", body);
  return res?.data || res;
}

export async function updateJobCardStatus(jobId: number, feStatus: string): Promise<any> {
  return api.patch(`/api/shop/workshop/jobs/${jobId}/status`, { status: FE_TO_BE[feStatus] || "RECEIVED" });
}
