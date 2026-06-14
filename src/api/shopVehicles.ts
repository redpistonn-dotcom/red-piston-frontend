/**
 * Shop-vehicle persistence API. Shop-registered vehicles (customers' cars the
 * shop services) are scoped to the shop and link to a Party via ownerId.
 */
import { api } from "./client.js";

function mapVehicle(v: any) {
  return {
    id: v.vehicleId,
    vehicleId: v.vehicleId,
    shopId: v.shopId,
    make: v.make || "",
    model: v.model || "",
    variant: v.variant || "",
    year: v.year || "",
    fuelType: v.fuelType || "Petrol",
    registrationNumber: v.registrationNumber || "",
    engineType: v.engineType || "",
    odometer: v.odometer || 0,
    vin: v.vin || "",
    ownerId: v.ownerId != null ? v.ownerId : "",
    notes: v.notes || "",
    createdAt: v.createdAt ? new Date(v.createdAt).getTime() : Date.now(),
  };
}

export async function fetchShopVehicles(): Promise<any[] | null> {
  try {
    const res: any = await api.get("/api/shop/vehicles");
    const list = res?.vehicles || res?.data?.vehicles || [];
    return Array.isArray(list) ? list.map(mapVehicle) : [];
  } catch (err: any) {
    console.warn("[Sync] Could not fetch vehicles:", err?.message);
    return null;
  }
}

export async function createShopVehicle(body: Record<string, any>): Promise<any> {
  const res: any = await api.post("/api/shop/vehicles", body);
  return res?.vehicle || res;
}

export async function updateShopVehicle(id: number | string, body: Record<string, any>): Promise<any> {
  const res: any = await api.put(`/api/shop/vehicles/${id}`, body);
  return res?.vehicle || res;
}
