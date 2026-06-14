import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type {
  Shop, Product, Movement, Order, Party, Vehicle, JobCard,
  AuditEntry, Receipt, CartItem, Vehicle as VehicleType,
} from '../types';
import { SEED_PRODUCTS, SEED_SHOPS, genSeededMovements, SEED_ORDERS, SEED_PURCHASES, SEED_PARTIES, SEED_VEHICLES, SEED_JOB_CARDS, uid } from '../utils/utils';
import { fetchInventory, fetchParties, fetchMovements, syncProductSave } from '../api/sync.js';
import { fetchShopVehicles } from '../api/shopVehicles';
import { getAccessToken } from '../api/client.js';

// ─── Typed store value shape ──────────────────────────────────────────────────

export interface StoreContextValue {
  /* Collections */
  shops:     Shop[]     | null;
  products:  Product[]  | null;
  movements: Movement[] | null;
  orders:    Order[]    | null;
  purchases: Movement[] | null;
  parties:   Party[]    | null;
  vehicles:  Vehicle[]  | null;
  jobCards:  JobCard[]  | null;
  auditLog:  AuditEntry[];
  receipts:  Receipt[];
  /* Cart */
  cart:         CartItem[];
  saveCart:     (d: CartItem[]) => void;
  isCartOpen:   boolean;
  setIsCartOpen:(v: boolean) => void;
  toggleCart:   () => void;
  /* Vehicle selector (marketplace) */
  selectedVehicle: VehicleType | null;
  saveVehicle:     (v: VehicleType | null) => void;
  /* App mode */
  appMode:     'marketplace' | 'erp';
  saveAppMode: (m: 'marketplace' | 'erp') => void;
  /* Shop scope */
  activeShopId:   number | string;
  setActiveShopId:(id: number | string) => void;
  persistShopId:  (id: number | string) => void;
  /* Marketplace page */
  marketplacePage:    string;
  setMarketplacePage: (p: string) => void;
  /* Persistence helpers */
  saveShops:     (d: Shop[]) => void;
  saveProducts:  (d: Product[], skipApiSync?: boolean) => void;
  saveMovements: (d: Movement[]) => void;
  saveOrders:    (d: Order[]) => void;
  savePurchases: (d: Movement[]) => void;
  saveAuditLog:  (d: AuditEntry[]) => void;
  saveReceipts:  (d: Receipt[]) => void;
  saveParties:   (d: Party[]) => void;
  saveVehicles:  (d: Vehicle[]) => void;
  saveJobCards:  (d: JobCard[]) => void;
  /* Actions */
  logAudit:    (action: string, entityType: string, entityId?: string | number, details?: string) => void;
  resetAll:    () => Promise<void>;
  clearStore:  () => void;
  syncFromAPI: () => Promise<void>;
  /* Status */
  loaded:    boolean;
  apiSynced: boolean;
}

export const StoreContext = createContext<StoreContextValue | null>(null);

// ─── Provider hook ────────────────────────────────────────────────────────────

export function useStoreProvider(): StoreContextValue {
  const [shops,     setShops]    = useState<Shop[]     | null>(null);
  const [products,  setP]        = useState<Product[]  | null>(null);
  const [movements, setM]        = useState<Movement[] | null>(null);
  const [orders,    setOrders]   = useState<Order[]    | null>(null);
  const [purchases, setPurchases]= useState<Movement[] | null>(null);
  const [auditLog,  setAuditLog] = useState<AuditEntry[]>([]);
  const [receipts,  setReceipts] = useState<Receipt[]>([]);
  const [parties,   setParties]  = useState<Party[]    | null>(null);
  const [vehicles,  setVehicles] = useState<Vehicle[]  | null>(null);
  const [jobCards,  setJobCards] = useState<JobCard[]  | null>(null);

  const [cart,            setCart]           = useState<CartItem[]>([]);
  const [isCartOpen,      setIsCartOpen]     = useState(false);
  const [selectedVehicle, setSelectedVehicle]= useState<VehicleType | null>(null);
  const [appMode,         setAppMode]        = useState<'marketplace' | 'erp'>('marketplace');

  const [activeShopId, setActiveShopId] = useState<number | string>(() => {
    try {
      const val = localStorage.getItem('vl_shopId') || 's1';
      const num = parseInt(val, 10);
      return !isNaN(num) ? num : val;
    } catch { return 's1'; }
  });

  const [marketplacePage, setMarketplacePage] = useState('home');
  const [loaded,    setL]          = useState(false);
  const [apiSynced, setApiSynced]  = useState(false);

  const persistShopId = useCallback((shopId: number | string) => {
    if (!shopId || shopId === activeShopId) return;
    setActiveShopId(shopId);
    try { localStorage.setItem('vl_shopId', String(shopId)); } catch {}
  }, [activeShopId]);

  const syncFromAPI = useCallback(async (): Promise<void> => {
    if (!getAccessToken()) {
      console.log('[Store] syncFromAPI skipped — no access token yet');
      return;
    }
    try {
      const [apiProducts, apiParties, apiMovements, apiVehicles] = await Promise.all([fetchInventory(), fetchParties(), fetchMovements(), fetchShopVehicles()]);

      if (Array.isArray(apiProducts)) {
        const realShopId = apiProducts[0]?.shopId;
        if (realShopId && realShopId !== 's1') {
          setActiveShopId(realShopId);
          try { localStorage.setItem('vl_shopId', String(realShopId)); } catch {}
        }
        setP(apiProducts);
        try { localStorage.setItem('vl_products', JSON.stringify(apiProducts)); } catch {}
        console.log(`[Store] Synced ${apiProducts.length} products from API`);
      }

      if (Array.isArray(apiParties)) {
        setParties(apiParties);
        try { localStorage.setItem('vl_parties', JSON.stringify(apiParties)); } catch {}
        console.log(`[Store] Synced ${apiParties.length} parties from API`);
      }

      if (Array.isArray(apiMovements)) {
        setM(apiMovements);
        try { localStorage.setItem('vl_movements', JSON.stringify(apiMovements)); } catch {}
        console.log(`[Store] Synced ${apiMovements.length} movements from API`);
      }

      if (Array.isArray(apiVehicles)) {
        setVehicles(apiVehicles);
        try { localStorage.setItem('vl_vehicles', JSON.stringify(apiVehicles)); } catch {}
        console.log(`[Store] Synced ${apiVehicles.length} vehicles from API`);
      }

      setApiSynced(true);
    } catch (err: unknown) {
      console.warn('[Store] API sync error:', (err as Error).message);
    }
  }, []);

  // ── Two-phase localStorage load ───────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        // Phase 1: critical data (needed for first render)
        const storedShops     = localStorage.getItem('vl_shops');
        const storedProducts  = localStorage.getItem('vl_products');
        const storedMovements = localStorage.getItem('vl_movements');
        const storedOrders    = localStorage.getItem('vl_orders');
        const storedParties   = localStorage.getItem('vl_parties');
        const storedCart      = localStorage.getItem('vl_cart');
        const storedAppMode   = localStorage.getItem('vl_appMode');
        const storedVehicle   = localStorage.getItem('vl_vehicle');

        setShops(storedShops     ? JSON.parse(storedShops)     : []);
        setP(storedProducts      ? JSON.parse(storedProducts)  : []);
        setM(storedMovements     ? JSON.parse(storedMovements) : []);
        setOrders(storedOrders   ? JSON.parse(storedOrders)    : []);
        setParties(storedParties ? JSON.parse(storedParties)   : []);
        if (storedCart)    setCart(JSON.parse(storedCart));
        if (storedAppMode) setAppMode(storedAppMode as 'marketplace' | 'erp');
        if (storedVehicle) setSelectedVehicle(JSON.parse(storedVehicle));
      } catch {
        setShops([]); setP([]); setM([]); setOrders([]); setParties([]);
      }

      setL(true);

      // Phase 2: deferred non-critical data
      setTimeout(() => {
        try {
          const storedPurchases = localStorage.getItem('vl_purchases');
          const storedAuditLog  = localStorage.getItem('vl_auditLog');
          const storedReceipts  = localStorage.getItem('vl_receipts');
          const storedVehicles  = localStorage.getItem('vl_vehicles');
          const storedJobCards  = localStorage.getItem('vl_jobCards');

          setPurchases(storedPurchases ? JSON.parse(storedPurchases) : []);
          setAuditLog(storedAuditLog   ? JSON.parse(storedAuditLog)  : []);
          setReceipts(storedReceipts   ? JSON.parse(storedReceipts)  : []);
          setVehicles(storedVehicles   ? JSON.parse(storedVehicles)  : []);
          setJobCards(storedJobCards   ? JSON.parse(storedJobCards)  : []);
        } catch {
          setPurchases([]); setAuditLog([]); setReceipts([]);
          setVehicles([]); setJobCards([]);
        }
      }, 0);
    })();
  }, []);

  // ── Persistence helpers ───────────────────────────────────────────────────
  const saveShops     = useCallback((d: Shop[])     => { setShops(d);    try { localStorage.setItem('vl_shops',     JSON.stringify(d)); } catch {} }, []);
  const saveProducts  = useCallback((d: Product[], skipApiSync = false)  => {
    setP(prev => {
      if (!skipApiSync && d.length === prev?.length) {
        const changed = d.find((p, i) => p !== prev?.[i]);
        if (changed) syncProductSave(changed).catch(() => {});
      }
      return d;
    });
    try { localStorage.setItem('vl_products', JSON.stringify(d)); } catch {};
  }, []);
  const saveMovements = useCallback((d: Movement[]) => { setM(d);         try { localStorage.setItem('vl_movements',  JSON.stringify(d)); } catch {} }, []);
  const saveOrders    = useCallback((d: Order[])    => { setOrders(d);    try { localStorage.setItem('vl_orders',     JSON.stringify(d)); } catch {} }, []);
  const savePurchases = useCallback((d: Movement[]) => { setPurchases(d); try { localStorage.setItem('vl_purchases',  JSON.stringify(d)); } catch {} }, []);
  const saveAuditLog  = useCallback((d: AuditEntry[])=>{ setAuditLog(d);  try { localStorage.setItem('vl_auditLog',   JSON.stringify(d)); } catch {} }, []);
  const saveReceipts  = useCallback((d: Receipt[])  => { setReceipts(d);  try { localStorage.setItem('vl_receipts',   JSON.stringify(d)); } catch {} }, []);
  const saveParties   = useCallback((d: Party[])    => { setParties(d);   try { localStorage.setItem('vl_parties',    JSON.stringify(d)); } catch {} }, []);
  const saveVehicles  = useCallback((d: Vehicle[])  => { setVehicles(d);  try { localStorage.setItem('vl_vehicles',   JSON.stringify(d)); } catch {} }, []);
  const saveJobCards  = useCallback((d: JobCard[])  => { setJobCards(d);  try { localStorage.setItem('vl_jobCards',   JSON.stringify(d)); } catch {} }, []);
  const saveCart      = useCallback((d: CartItem[]) => { setCart(d);      try { localStorage.setItem('vl_cart',       JSON.stringify(d)); } catch {} }, []);
  const saveVehicle   = useCallback((d: VehicleType | null) => { setSelectedVehicle(d); try { localStorage.setItem('vl_vehicle', JSON.stringify(d)); } catch {} }, []);
  const saveAppMode   = useCallback((d: 'marketplace' | 'erp') => { setAppMode(d); try { localStorage.setItem('vl_appMode', d); } catch {} }, []);
  const toggleCart    = useCallback(() => { setIsCartOpen(prev => !prev); }, []);

  const logAudit = useCallback((
    action: string, entityType: string,
    entityId?: string | number, details?: string,
  ) => {
    const entry: AuditEntry = {
      id: 'aud_' + uid(),
      timestamp: Date.now(),
      action,
      entityType,
      entityId,
      detail: typeof details === 'string' ? details : JSON.stringify(details),
    };
    setAuditLog(prev => {
      const next = [entry, ...prev].slice(0, 500);
      try { localStorage.setItem('vl_auditLog', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const resetAll = useCallback(async (): Promise<void> => {
    setShops(SEED_SHOPS); setP(SEED_PRODUCTS); setM(genSeededMovements());
    setOrders(SEED_ORDERS); setPurchases(SEED_PURCHASES);
    setCart([]); setSelectedVehicle(null); setAuditLog([]); setReceipts([]);
    setParties(SEED_PARTIES); setVehicles(SEED_VEHICLES); setJobCards(SEED_JOB_CARDS);
    setActiveShopId('s1');
    try {
      localStorage.setItem('vl_shops',     JSON.stringify(SEED_SHOPS));
      localStorage.setItem('vl_products',  JSON.stringify(SEED_PRODUCTS));
      localStorage.setItem('vl_movements', JSON.stringify(genSeededMovements()));
      localStorage.setItem('vl_orders',    JSON.stringify(SEED_ORDERS));
      localStorage.setItem('vl_purchases', JSON.stringify(SEED_PURCHASES));
      localStorage.setItem('vl_parties',   JSON.stringify(SEED_PARTIES));
      localStorage.setItem('vl_vehicles',  JSON.stringify(SEED_VEHICLES));
      localStorage.setItem('vl_jobCards',  JSON.stringify(SEED_JOB_CARDS));
      localStorage.removeItem('vl_shopId');
    } catch {}
  }, []);

  const clearStore = useCallback(() => {
    setShops([]); setP([]); setM([]); setOrders([]); setPurchases([]);
    setCart([]); setSelectedVehicle(null); setAuditLog([]); setReceipts([]);
    setParties([]); setVehicles([]); setJobCards([]);
    setActiveShopId('s1');
    try {
      ['vl_shops','vl_products','vl_movements','vl_orders','vl_purchases',
       'vl_cart','vl_vehicle','vl_auditLog','vl_receipts','vl_shopId',
       'vl_parties','vl_vehicles','vl_jobCards'].forEach(k => localStorage.removeItem(k));
    } catch {}
  }, []);

  return {
    shops, products, movements, orders, purchases, auditLog, receipts, parties, vehicles, jobCards,
    saveShops, saveProducts, saveMovements, saveOrders, savePurchases,
    saveAuditLog, saveReceipts, saveParties, saveVehicles, saveJobCards,
    cart, saveCart, isCartOpen, setIsCartOpen, toggleCart,
    selectedVehicle, saveVehicle,
    appMode, saveAppMode,
    activeShopId, setActiveShopId, persistShopId,
    marketplacePage, setMarketplacePage,
    logAudit, resetAll, clearStore, syncFromAPI,
    loaded, apiSynced,
  };
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
}
