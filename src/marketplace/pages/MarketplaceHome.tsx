import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useStore } from "../../store";
import { getHomeData } from "../api/engine";
import { buildHomeDataFromApi, lookupPlate, fetchShops } from "../../api/marketplace.js";
import { useMarketplaceBrowse } from "../../hooks/queries";
import { PartImage } from "../components/PartImage";
import { ProfileDropdown } from "../../components/ProfileDropdown";
import { clearTokens } from "../../api/client.js";
import { CATEGORIES } from "../../utils";
import { CartDrawer } from "../components/CartDrawer";
import { LoginModal } from "../components/LoginModal";

// Components
import { VehicleSelectorModal } from "../components/VehicleSelectorModal";
import { ProductComparisonModal } from "../components/ProductComparisonModal";
import { ProductCard } from "../components/ProductCard";
import { ShopCard, SectionCarousel, SkeletonLoader, EmptyState } from "../components/SharedUI";
import { CustomerProfile } from "./CustomerProfile";
import { ProductDetailsPage } from "./ProductDetailsPage";
import { SavedItemsPage } from "./SavedItemsPage";
import { getSavedItems } from "../savedItems";
import { fmt } from "../../utils";

const MAKES = ["Maruti Suzuki", "Hyundai", "Tata Motors", "Mahindra", "Honda", "Toyota", "Kia", "Renault", "Skoda", "Volkswagen", "MG", "Ford"];
const YEARS = Array.from({ length: 20 }, (_, i) => String(2024 - i));

function SideBySideModal({ open, items, onClose }) {
  if (!open || !items?.length) return null;
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(26,18,5,0.5)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "relative", background: "#fff", borderRadius: 16, border: "1px solid #E0D5C8", boxShadow: "0 24px 80px rgba(0,0,0,0.2)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh", width: Math.min(340 * items.length + 48, 1100) }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #E0D5C8", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FAF6F0" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#1A1205", textTransform: "uppercase", letterSpacing: "1.5px" }}>Compare Products ({items.length})</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#9C8C7C", fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: 24, overflowY: "auto", display: "flex", gap: 16, background: "#F5EFE6" }}>
          {items.map(item => {
            const { product, bestPrice, listings } = item;
            const buyBox = listings?.[0];
            return (
              <div key={product.id} style={{ flex: 1, minWidth: 0, background: "#fff", border: "1px solid #E0D5C8", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ height: 180, background: "#FAF6F0", position: "relative" }}>
                  <PartImage src={product.image} alt={product.name} size="lg" />
                </div>
                <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  <div style={{ fontSize: 10, color: "#BE2B1A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{product.brand}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1205", lineHeight: 1.35 }}>{product.name}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#BE2B1A" }}>{fmt(bestPrice)}</div>
                  {product.specifications && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, borderTop: "1px solid #E0D5C8", paddingTop: 8, marginTop: 4 }}>
                      {Object.entries(product.specifications).slice(0, 5).map(([k, v]) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                          <span style={{ color: "#9C8C7C", textTransform: "capitalize" }}>{k}</span>
                          <span style={{ color: "#1A1205", fontWeight: 600 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "#9C8C7C", marginTop: "auto", paddingTop: 6 }}>
                    <span>📍 {buyBox?.shop?.name || "Local Shop"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function MarketplaceHome() {
  const navigate = useNavigate();
  const { products, shops, selectedVehicle, saveVehicle, toggleCart, cart } = useStore();

  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("as_user")); } catch { return null; }
  });

  // Build browse opts based on selected vehicle + geolocation
  const browseOpts = useMemo(() => {
    const opts: Record<string, unknown> = { limit: 60 };
    if (selectedVehicle) {
      opts.make     = selectedVehicle.brand || selectedVehicle.make;
      opts.model    = selectedVehicle.model;
      opts.year     = selectedVehicle.year;
      opts.fuelType = selectedVehicle.fuel || selectedVehicle.fuelType;
    }
    if (userGeoRef.current) {
      opts.lat = userGeoRef.current.lat;
      opts.lng = userGeoRef.current.lng;
    }
    return opts;
  }, [selectedVehicle]); // geo is added via ref, won't re-trigger — acceptable

  // TanStack Query — cached per vehicle context, no manual loading state needed
  const { data: browsed, isLoading: loading } = useMarketplaceBrowse(browseOpts);

  // Build home page data from API result, fall back to mock data when API is empty/unavailable
  const data = useMemo(() => {
    if (browsed && browsed.parts && browsed.parts.length > 0) {
      return buildHomeDataFromApi(browsed, selectedVehicle, CATEGORIES);
    }
    return getHomeData(products, shops, selectedVehicle);
  }, [browsed, selectedVehicle, products, shops]);

  const [page, setPage] = useState("home");
  const [pdpProductId, setPdpProductId] = useState(null);

  const [vehModalOpen, setVehModalOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);

  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const [sortBy, setSortBy] = useState("relevance");

  const [compareList, setCompareList] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const [heroTab, setHeroTab] = useState("vehicle");
  const [heroMake, setHeroMake] = useState("");
  const [heroYear, setHeroYear] = useState("");
  const [plateSearch, setPlateSearch] = useState("");
  const [navSearch, setNavSearch] = useState("");
  const [plateLookupLoading, setPlateLookupLoading] = useState(false);
  const [plateLookupError, setPlateLookupError] = useState("");
  const [plateVehicleResult, setPlateVehicleResult] = useState(null);
  const [suppliersData, setSuppliersData] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [suppliersSearch, setSuppliersSearch] = useState("");
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(() => getSavedItems().length);

  useEffect(() => {
    const sync = () => setSavedCount(getSavedItems().length);
    window.addEventListener("mp-saved-changed", sync);
    return () => window.removeEventListener("mp-saved-changed", sync);
  }, []);

  const handleCompareToggle = (item) => {
    setCompareList(prev => {
      const exists = prev.some(p => p.product?.id === item.product?.id);
      if (exists) return prev.filter(p => p.product?.id !== item.product?.id);
      if (prev.length >= 3) return prev;
      return [...prev, item];
    });
  };

  const handlePlateLookup = async () => {
    if (!plateSearch || plateSearch.length < 6) return;
    setPlateLookupLoading(true);
    setPlateLookupError("");
    setPlateVehicleResult(null);
    try {
      const vehicle = await lookupPlate(plateSearch);
      setPlateVehicleResult(vehicle);
    } catch (err) {
      setPlateLookupError(err.message || "Could not find vehicle for this plate. Try the Vehicle Selector instead.");
    } finally {
      setPlateLookupLoading(false);
    }
  };

  const userGeoRef = useRef(null);
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { userGeoRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
        () => {}
      );
    }
  }, []);


  const MP_CSS = `
    /* Fonts loaded via <link> in index.html — no @import needed */
    *, *::before, *::after { box-sizing: border-box; }

    html, body, #root {
      background-color: #F5EFE6 !important;
      color: #1A1205 !important;
    }

    /* Scrollbar — light cream theme */
    ::-webkit-scrollbar { width: 7px; height: 7px; }
    ::-webkit-scrollbar-track { background: #EDE5DA; }
    ::-webkit-scrollbar-thumb { background: #C8B8A8; border-radius: 8px; }
    ::-webkit-scrollbar-thumb:hover { background: #BE2B1A; }
    * { scrollbar-width: thin; scrollbar-color: #C8B8A8 #EDE5DA; }

    .mp-root {
      background: #F5EFE6;
      color: #1A1205;
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
    }

    /* ── NAV ── */
    .mp-nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 300;
      background: #FFFFFF;
      border-bottom: 1px solid #E0D5C8;
      box-shadow: 0 2px 12px rgba(190,43,26,0.06);
      height: 64px;
    }
    .mp-page-body { padding-top: 64px; }
    .mp-nav-inner {
      max-width: 100%; margin: 0; height: 100%;
      padding: 0 28px 0 0;
      display: flex; align-items: center; gap: 16px;
    }
    .mp-logo-wrap {
      display: flex; align-items: center; gap: 10px;
      cursor: pointer; flex-shrink: 0; text-decoration: none;
      height: 64px; padding: 0 14px 0 0;
      border-right: 1px solid #E0D5C8;
    }
    .mp-logo-img { height: 64px; width: auto; display: block; border: none; outline: none; object-fit: cover; mix-blend-mode: multiply; }
    .mp-logo-text {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 17px; font-weight: 900;
      color: #1A1205; letter-spacing: 0.04em;
      white-space: nowrap;
    }
    .mp-nav-divider {
      width: 1px; height: 28px;
      background: #E0D5C8; flex-shrink: 0; margin: 0 4px;
    }
    .mp-nav-links {
      display: flex; align-items: center; height: 64px; gap: 0;
    }
    .mp-nav-link {
      height: 100%; display: flex; align-items: center;
      padding: 0 14px; font-size: 14px; font-weight: 500;
      color: #5C4F40; background: none; border: none;
      border-bottom: 2.5px solid transparent;
      cursor: pointer; white-space: nowrap;
      transition: color 0.15s, border-color 0.15s;
      margin-bottom: -1px;
    }
    .mp-nav-link:hover { color: #1A1205; }
    .mp-nav-link.active { color: #BE2B1A; border-bottom-color: #BE2B1A; font-weight: 600; }

    .mp-nav-search {
      flex: 1; max-width: 380px; position: relative;
    }
    .mp-nav-search-input {
      width: 100%;
      padding: 8px 12px 8px 34px;
      border: 1px solid #E0D5C8; border-radius: 6px;
      background: #FAF6F0;
      font-size: 13px; color: #1A1205; outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .mp-nav-search-input:focus {
      border-color: #BE2B1A;
      box-shadow: 0 0 0 3px rgba(190,43,26,0.08);
    }
    .mp-nav-search-input::placeholder { color: #B8A898; }
    .mp-nav-search-icon {
      position: absolute; left: 10px; top: 50%;
      transform: translateY(-50%); font-size: 13px;
      color: #B8A898; pointer-events: none;
    }

    .mp-nav-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }

    .mp-icon-btn {
      width: 36px; height: 36px; border-radius: 7px;
      background: transparent; border: 1px solid #E0D5C8;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; cursor: pointer; transition: all 0.15s;
      color: #5C4F40; position: relative; flex-shrink: 0;
    }
    .mp-icon-btn:hover { border-color: #BE2B1A; color: #BE2B1A; }
    .mp-cart-badge {
      position: absolute; top: -5px; right: -5px;
      background: #BE2B1A; color: #fff;
      width: 16px; height: 16px; border-radius: 50%;
      font-size: 9px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .mp-btn-outline {
      padding: 7px 16px;
      border: 1.5px solid #1A1205; border-radius: 6px;
      background: transparent; font-size: 13px; font-weight: 600;
      color: #1A1205; cursor: pointer; white-space: nowrap;
      transition: all 0.15s;
    }
    .mp-btn-outline:hover { background: #1A1205; color: #fff; }
    .mp-btn-solid {
      padding: 7px 16px;
      background: #BE2B1A; border: none; border-radius: 6px;
      font-size: 13px; font-weight: 600;
      color: #fff; cursor: pointer; white-space: nowrap;
      transition: all 0.15s;
    }
    .mp-btn-solid:hover { background: #9B1F12; }

    /* ── HERO ── */
    .mp-hero {
      background: #F5EFE6;
      display: flex; align-items: stretch;
      min-height: calc(100vh - 64px);
      overflow: hidden;
    }
    .mp-hero-split {
      flex: 1; display: grid;
      grid-template-columns: 56fr 44fr;
      max-width: 1440px; margin: 0 auto; width: 100%;
    }
    .mp-hero-left {
      padding: 64px 56px 64px 28px;
      display: flex; flex-direction: column; justify-content: center;
    }
    .mp-hero-eyebrow {
      font-size: 11px; font-weight: 700; letter-spacing: 0.18em;
      text-transform: uppercase; color: #BE2B1A;
      margin-bottom: 18px;
    }
    .mp-hero-h1 {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 54px; font-weight: 800;
      line-height: 1.08; color: #1A1205;
      margin: 0 0 18px;
    }
    .mp-hero-h1-accent { color: #BE2B1A; display: block; }
    .mp-hero-sub {
      font-size: 16px; color: #5C4F40; line-height: 1.65;
      max-width: 500px; margin-bottom: 36px;
    }
    .mp-tabs-row {
      display: flex; gap: 0;
      border-bottom: 1.5px solid #E0D5C8;
      margin-bottom: 24px;
    }
    .mp-tab-btn {
      padding: 9px 22px; font-size: 14px; font-weight: 600;
      color: #9C8C7C; background: none; border: none;
      border-bottom: 2.5px solid transparent;
      cursor: pointer; margin-bottom: -1.5px;
      transition: color 0.15s, border-color 0.15s;
    }
    .mp-tab-btn.active { color: #BE2B1A; border-bottom-color: #BE2B1A; }
    .mp-tab-btn:hover:not(.active) { color: #1A1205; }

    .mp-vsel-form { display: flex; flex-direction: column; gap: 12px; max-width: 460px; }
    .mp-vsel-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .mp-vsel-select, .mp-plate-input {
      padding: 11px 14px;
      border: 1.5px solid #E0D5C8; border-radius: 7px;
      background: #FFFFFF; font-size: 13px; color: #1A1205;
      appearance: none; cursor: pointer; outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      font-family: 'Inter', sans-serif;
    }
    .mp-vsel-select:focus, .mp-plate-input:focus {
      border-color: #BE2B1A;
      box-shadow: 0 0 0 3px rgba(190,43,26,0.08);
    }
    .mp-plate-input { width: 100%; font-weight: 600; letter-spacing: 0.06em; }
    .mp-plate-input::placeholder { font-weight: 400; letter-spacing: 0; color: #B8A898; }
    .mp-search-parts-btn {
      width: 100%; padding: 13px;
      background: #BE2B1A; color: #fff; border: none; border-radius: 7px;
      font-size: 14px; font-weight: 700;
      letter-spacing: 0.06em; text-transform: uppercase;
      cursor: pointer; transition: background 0.15s, box-shadow 0.15s;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .mp-search-parts-btn:hover {
      background: #9B1F12;
      box-shadow: 0 6px 20px rgba(190,43,26,0.3);
    }
    .mp-or-divider {
      display: flex; align-items: center; gap: 10px;
      color: #9C8C7C; font-size: 12px;
    }
    .mp-or-divider::before, .mp-or-divider::after {
      content: ''; flex: 1; height: 1px; background: #E0D5C8;
    }
    .mp-open-selector {
      width: 100%; padding: 11px;
      border: 1.5px dashed #BE2B1A; border-radius: 7px;
      background: rgba(190,43,26,0.04); color: #BE2B1A;
      font-size: 13px; font-weight: 600; cursor: pointer;
      transition: all 0.15s;
    }
    .mp-open-selector:hover { background: rgba(190,43,26,0.08); }

    /* ── HERO RIGHT ── */
    .mp-hero-right {
      position: relative; overflow: hidden; background: #5C1A0F;
    }
    .mp-hero-right-img {
      width: 100%; height: 100%; object-fit: cover;
      opacity: 0.55; display: block;
    }
    .mp-hero-right-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(160deg, rgba(92,26,15,0.45) 0%, rgba(20,6,2,0.85) 100%);
    }
    .mp-hero-right-badge {
      position: absolute; top: 32px; left: 32px;
      background: rgba(255,255,255,0.1); backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.2); border-radius: 8px;
      padding: 12px 18px; color: #fff;
    }
    .mp-hero-right-badge-label {
      font-size: 10px; font-weight: 700; letter-spacing: 0.15em;
      text-transform: uppercase; color: rgba(255,220,210,0.8);
      margin-bottom: 4px;
    }
    .mp-hero-right-badge-val {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 28px; font-weight: 800; color: #fff; line-height: 1;
    }
    .mp-hero-right-badge-sub { font-size: 11px; color: rgba(255,220,210,0.7); margin-top: 2px; }
    .mp-hero-stats {
      position: absolute; bottom: 32px; left: 0; right: 0;
      display: flex; justify-content: center; gap: 0;
      padding: 0 24px;
    }
    .mp-hero-stat {
      flex: 1; text-align: center; padding: 14px 8px;
      border-right: 1px solid rgba(255,255,255,0.1);
    }
    .mp-hero-stat:last-child { border-right: none; }
    .mp-hero-stat-num {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 20px; font-weight: 800; color: #fff;
    }
    .mp-hero-stat-lbl { font-size: 10px; color: rgba(255,220,210,0.7); margin-top: 2px; }

    /* ── SECTIONS ── */
    .mp-sections { max-width: 1440px; margin: 0 auto; padding: 56px 28px 80px; }
    .mp-section-block { margin-bottom: 52px; }
    .mp-section-hdr {
      display: flex; justify-content: space-between; align-items: baseline;
      margin-bottom: 20px;
    }
    .mp-section-title {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 22px; font-weight: 700; color: #1A1205;
    }
    .mp-view-all {
      font-size: 13px; color: #BE2B1A; font-weight: 600;
      background: none; border: none; cursor: pointer;
      text-decoration: underline; text-underline-offset: 2px;
    }
    .mp-view-all:hover { color: #9B1F12; }

    /* ── CATEGORY CARDS ── */
    .mp-cat-card {
      background: #FFFFFF; border: 1.5px solid #E0D5C8;
      border-radius: 12px; padding: 22px 30px;
      min-width: 130px; display: flex; flex-direction: column;
      align-items: center; gap: 10px; cursor: pointer;
      transition: all 0.18s;
    }
    .mp-cat-card:hover {
      border-color: #BE2B1A;
      box-shadow: 0 6px 20px rgba(190,43,26,0.1);
      transform: translateY(-2px);
    }
    .mp-cat-icon { font-size: 30px; }
    .mp-cat-label { font-size: 13px; font-weight: 600; color: #1A1205; }

    /* ── VEHICLE SELECTED results ── */
    .mp-results-wrap {
      max-width: 1440px; margin: 0 auto;
      padding: 80px 28px 48px;
    }
    .mp-results-header {
      margin-bottom: 28px;
      display: flex; justify-content: space-between; align-items: flex-end;
    }
    .mp-results-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 26px; font-weight: 800; color: #1A1205; margin: 0 0 6px; }
    .mp-results-sub { font-size: 14px; color: #9C8C7C; }

    /* ── COMPARE BAR ── */
    .mp-compare-bar {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 900;
      background: #1A1205; border-top: 1px solid #E0D5C8;
      padding: 12px 28px; display: flex; align-items: center; gap: 14px;
      box-shadow: 0 -8px 32px rgba(26,18,5,0.15);
      animation: slideUp 0.2s ease;
    }

    /* ── FILTER DRAWER ── */
    .mp-filter-panel {
      position: fixed; top: 0; left: 0; bottom: 0; z-index: 501;
      width: 300px; background: #fff; border-right: 1px solid #E0D5C8;
      box-shadow: 8px 0 32px rgba(26,18,5,0.12); display: flex; flex-direction: column;
      animation: slideInLeft 0.25s cubic-bezier(0.16,1,0.3,1);
    }

    /* ── LOADING SKELETON ── */
    .mp-loading-wrap { max-width: 1440px; margin: 0 auto; padding: 120px 28px 48px; }

    /* ── MOBILE-ONLY ELEMENTS (hidden on desktop) ── */
    .mp-hamburger, .mp-nav-search-m, .mp-mobile-only, .mp-m-drawer, .mp-m-overlay, .mp-login-icon { display: none; }

    /* ── MOBILE DRAWER (shared styles, shown via media query) ── */
    .mp-m-drawer {
      position: fixed; top: 0; left: 0; bottom: 0; z-index: 9000;
      width: 290px; background: #FFFFFF; border-right: 1px solid #E0D5C8;
      box-shadow: 8px 0 32px rgba(26,18,5,0.18);
      flex-direction: column;
      animation: slideInLeft 0.25s cubic-bezier(0.16,1,0.3,1);
    }
    .mp-m-drawer-link {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 20px; font-size: 15px; font-weight: 600;
      color: #5C4F40; background: none; border: none; width: 100%;
      text-align: left; cursor: pointer;
    }
    .mp-m-drawer-link.active { color: #BE2B1A; background: rgba(190,43,26,0.07); font-weight: 800; }
    .mp-m-overlay {
      position: fixed; inset: 0; z-index: 8999;
      background: rgba(26,18,5,0.4); backdrop-filter: blur(2px);
    }

    /* ── FOOTER ── */
    .mp-footer {
      background: #1A1205; color: #F5EFE6;
      padding: 36px 24px 28px; margin-top: 24px;
    }
    .mp-footer-brand {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 16px; font-weight: 900; letter-spacing: 0.04em; margin-bottom: 10px;
    }
    .mp-footer-brand span { color: #FF6B5A; }
    .mp-footer-blurb { font-size: 12px; color: rgba(245,239,230,0.55); line-height: 1.7; max-width: 420px; margin-bottom: 24px; }
    .mp-footer-cols { display: flex; gap: 48px; flex-wrap: wrap; margin-bottom: 24px; }
    .mp-footer-col-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: rgba(245,239,230,0.45); margin-bottom: 12px; }
    .mp-footer-link { display: block; font-size: 13px; color: rgba(245,239,230,0.75); margin-bottom: 9px; cursor: pointer; background: none; border: none; padding: 0; text-align: left; }
    .mp-footer-link:hover { color: #FF6B5A; }
    .mp-footer-copy { font-size: 11px; color: rgba(245,239,230,0.35); border-top: 1px solid rgba(245,239,230,0.1); padding-top: 16px; }

    /* ── RESPONSIVE ── */
    @media (max-width: 1024px) {
      .mp-hero-h1 { font-size: 40px !important; }
      .mp-hero-left { padding: 48px 32px 48px 24px !important; }
    }
    @media (max-width: 768px) {
      /* Header: row 1 = hamburger + logo + icons, row 2 = full-width search */
      .mp-nav { height: auto; }
      .mp-nav-inner { flex-wrap: wrap; padding: 0 12px; gap: 8px; min-height: 56px; }
      .mp-page-body { padding-top: 112px; }
      .mp-hamburger {
        display: flex; align-items: center; justify-content: center;
        width: 38px; height: 38px; background: none; border: none;
        font-size: 22px; color: #BE2B1A; cursor: pointer; padding: 0; flex-shrink: 0;
      }
      .mp-logo-wrap { border-right: none; height: 56px; padding: 0; gap: 7px; }
      .mp-logo-img { height: 40px; }
      .mp-logo-text { font-size: 15px; }
      .mp-nav-divider, .mp-nav-links, .mp-nav-search, .mp-btn-outline, .mp-btn-solid { display: none !important; }
      .mp-nav-actions { gap: 4px; }
      .mp-icon-btn { border: none; width: 38px; height: 38px; font-size: 18px; color: #BE2B1A; }
      .mp-nav-search-m { display: block; width: 100%; position: relative; padding-bottom: 10px; }
      .mp-login-icon { display: flex; }
      .mp-m-drawer { display: flex; }
      .mp-m-overlay { display: block; }
      .mp-mobile-only { display: block; }

      /* Hero: stacked, image strip below the selector card */
      .mp-hero { min-height: 0; }
      .mp-hero-split { grid-template-columns: 1fr !important; }
      .mp-hero-left { padding: 28px 16px 24px !important; }
      .mp-hero-h1 { font-size: 30px !important; }
      .mp-hero-sub { font-size: 14px; margin-bottom: 24px; }
      .mp-vsel-row { grid-template-columns: 1fr; }
      .mp-vsel-form { max-width: none; }
      .mp-tabs-row { gap: 8px; border-bottom: none; }
      .mp-tab-btn {
        flex: 1; padding: 9px 6px; font-size: 13px;
        border: 1.5px solid #E0D5C8; border-radius: 8px; margin-bottom: 0;
      }
      .mp-tab-btn.active { background: #BE2B1A; color: #fff; border-color: #BE2B1A; }
      .mp-hero-right {
        display: block; height: 200px; margin: 0 16px 24px;
        border-radius: 14px;
      }
      .mp-hero-right-badge { top: 14px; left: 14px; padding: 8px 12px; }
      .mp-hero-right-badge-val { font-size: 20px; }
      .mp-hero-stats { bottom: 10px; padding: 0 10px; }
      .mp-hero-stat { padding: 8px 4px; }
      .mp-hero-stat-num { font-size: 15px; }

      /* Sections: tighter padding, grids instead of carousels */
      .mp-sections { padding: 28px 16px 40px; }
      .mp-section-block { margin-bottom: 36px; }
      .mp-section-title { font-size: 18px; }
      .mp-carousel-arrows { display: none !important; }
      .mp-m-grid {
        display: grid !important; grid-template-columns: 1fr 1fr;
        gap: 12px; overflow-x: visible !important;
      }
      .mp-m-grid .mp-prod-card { width: 100% !important; }
      .mp-m-grid .mp-cat-card { min-width: 0 !important; padding: 18px 8px; }

      /* Results view (design 6): 2-col grid, stacked header */
      .mp-results-wrap { padding: 24px 16px 40px; }
      .mp-results-header { flex-direction: column; align-items: stretch; gap: 12px; }
      .mp-results-title { font-size: 20px; }
      .mp-results-grid { grid-template-columns: 1fr 1fr !important; gap: 12px !important; }
      .mp-results-grid .mp-prod-card { width: 100% !important; }

      /* Filter panel becomes a bottom sheet */
      .mp-filter-panel {
        top: auto; bottom: 0; left: 0; right: 0; width: 100%;
        max-height: 78vh; border-right: none; border-top: 1px solid #E0D5C8;
        border-radius: 16px 16px 0 0;
        animation: slideUp 0.25s cubic-bezier(0.16,1,0.3,1);
      }

      /* Compare bar: scrollable chips */
      .mp-compare-bar { padding: 10px 14px; overflow-x: auto; }

      .mp-footer-cols { gap: 32px; }
    }

    @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  `;

  const catIcons = { Brakes: "🛑", Engine: "⚙️", Filters: "💨", Electrical: "⚡", Suspension: "🛞", default: "🔧" };

  return (
    <div className="mp-root">
      <style>{MP_CSS}</style>

      {/* ── Navigation ── */}
      <nav className="mp-nav">
        <div className="mp-nav-inner">
          {/* Hamburger (mobile only) */}
          <button className="mp-hamburger" onClick={() => setMobileMenuOpen(true)} aria-label="Menu">☰</button>

          {/* Logo */}
          <div className="mp-logo-wrap" onClick={() => setPage("home")}>
            <img src="/logo.png" alt="Red Piston" className="mp-logo-img" />
            <span className="mp-logo-text">RED PISTON</span>
          </div>

          <div className="mp-nav-divider" />

          {/* Nav links */}
          <div className="mp-nav-links">
            {["Marketplace", "Suppliers"].map((lbl, i) => (
              <button
                key={lbl}
                className={`mp-nav-link${page === lbl.toLowerCase() || (lbl === "Marketplace" && page === "home") ? " active" : ""}`}
                onClick={() => {
                  if (lbl === "Suppliers") {
                    setPage("suppliers");
                    if (suppliersData.length === 0) {
                      setSuppliersLoading(true);
                      fetchShops({ lat: userGeoRef.current?.lat, lng: userGeoRef.current?.lng })
                        .then(shops => { setSuppliersData(shops); setSuppliersLoading(false); })
                        .catch(() => setSuppliersLoading(false));
                    }
                  } else {
                    setPage("home");
                  }
                }}
              >{lbl}</button>
            ))}
          </div>

          {/* Search */}
          <div className="mp-nav-search">
            <span className="mp-nav-search-icon">🔍</span>
            <input
              className="mp-nav-search-input"
              placeholder="Search by Part Number, VIN, or Category..."
              value={navSearch}
              onChange={e => setNavSearch(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="mp-nav-actions">
            <button className="mp-icon-btn" title="Saved Items" onClick={() => setPage("saved")} style={{ position: "relative" }}>
              {savedCount > 0 ? "❤️" : "🤍"}
              {savedCount > 0 && <span className="mp-cart-badge">{savedCount}</span>}
            </button>
            <button className="mp-icon-btn" title="Cart" onClick={toggleCart} style={{ position: "relative" }}>
              🛒
              {cart.length > 0 && <span className="mp-cart-badge">{cart.length}</span>}
            </button>
            {currentUser ? (
              <ProfileDropdown
                user={currentUser}
                onLogout={() => { clearTokens(); localStorage.removeItem("as_user"); setCurrentUser(null); window.location.href = "/login"; }}
              />
            ) : (
              <>
                <button className="mp-icon-btn mp-login-icon" title="Sign In" onClick={() => setLoginModalOpen(true)}>👤</button>
                <button className="mp-btn-outline" onClick={() => setLoginModalOpen(true)}>Sign In</button>
                <button className="mp-btn-solid" onClick={() => setLoginModalOpen(true)}>Get Started</button>
              </>
            )}
          </div>

          {/* Mobile full-width search (row 2) */}
          <div className="mp-nav-search-m">
            <span className="mp-nav-search-icon">🔍</span>
            <input
              className="mp-nav-search-input"
              placeholder="Search by Part Number, VIN, or Category..."
              value={navSearch}
              onChange={e => setNavSearch(e.target.value)}
            />
          </div>
        </div>
      </nav>

      {/* ── Mobile nav drawer ── */}
      {mobileMenuOpen && (
        <>
          <div className="mp-m-overlay" onClick={() => setMobileMenuOpen(false)} />
          <div className="mp-m-drawer">
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E0D5C8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 900, color: "#1A1205" }}>
                <span style={{ color: "#BE2B1A" }}>RED</span> PISTON
              </span>
              <button onClick={() => setMobileMenuOpen(false)} style={{ background: "none", border: "none", fontSize: 20, color: "#9C8C7C", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ flex: 1, paddingTop: 8 }}>
              {[
                ["🏪", "Marketplace", "home"],
                ["🤝", "Suppliers", "suppliers"],
                ["🤍", "Saved Items", "saved"],
              ].map(([icon, lbl, target]) => (
                <button
                  key={target}
                  className={`mp-m-drawer-link${page === target ? " active" : ""}`}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (target === "suppliers" && suppliersData.length === 0) {
                      setSuppliersLoading(true);
                      fetchShops({ lat: userGeoRef.current?.lat, lng: userGeoRef.current?.lng })
                        .then(shops => { setSuppliersData(shops); setSuppliersLoading(false); })
                        .catch(() => setSuppliersLoading(false));
                    }
                    setPage(target);
                  }}
                >
                  <span>{icon}</span> {lbl}
                </button>
              ))}
            </div>
            {!currentUser && (
              <div style={{ padding: "16px 20px", borderTop: "1px solid #E0D5C8", display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  onClick={() => { setMobileMenuOpen(false); setLoginModalOpen(true); }}
                  style={{ width: "100%", padding: "12px", background: "transparent", border: "1.5px solid #1A1205", borderRadius: 8, fontSize: 14, fontWeight: 700, color: "#1A1205", cursor: "pointer" }}
                >Sign In</button>
                <button
                  onClick={() => { setMobileMenuOpen(false); setLoginModalOpen(true); }}
                  style={{ width: "100%", padding: "12px", background: "#BE2B1A", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 800, color: "#fff", cursor: "pointer" }}
                >Get Started</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Page body (offset for fixed nav) ── */}
      <div className="mp-page-body">

      {/* ── Sub-pages ── */}
      {page === "profile" && <CustomerProfile />}
      {page === "saved" && <SavedItemsPage onBack={() => setPage("home")} />}
      {page === "pdp" && <ProductDetailsPage productId={pdpProductId} onBack={() => setPage("home")} onRequireLogin={() => setLoginModalOpen(true)} />}

      {/* ── Suppliers page ── */}
      {page === "suppliers" && (
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "40px 28px 80px", animation: "fadeUp 0.3s ease-out" }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 28, fontWeight: 800, color: "#1A1205", margin: "0 0 6px" }}>Suppliers & Shops</h1>
            <p style={{ fontSize: 14, color: "#9C8C7C", margin: 0 }}>Browse all verified auto parts suppliers on Red Piston</p>
          </div>

          {/* Search */}
          <div style={{ position: "relative", maxWidth: 420, marginBottom: 28 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#B8A898" }}>🔍</span>
            <input
              value={suppliersSearch}
              onChange={e => setSuppliersSearch(e.target.value)}
              placeholder="Search by shop name or city..."
              style={{ width: "100%", padding: "10px 12px 10px 34px", border: "1.5px solid #E0D5C8", borderRadius: 8, background: "#fff", fontSize: 13, color: "#1A1205", outline: "none" }}
              onFocus={e => e.target.style.borderColor = "#BE2B1A"}
              onBlur={e => e.target.style.borderColor = "#E0D5C8"}
            />
          </div>

          {suppliersLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 16 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="pulse" style={{ height: 130, background: "#F0E8DF", borderRadius: 12, border: "1px solid #E0D5C8" }} />
              ))}
            </div>
          ) : suppliersData.length === 0 ? (
            <EmptyState title="No suppliers found" desc="No verified shops in the database yet." variant="light" />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 16 }}>
              {suppliersData
                .filter(s => !suppliersSearch || s.name?.toLowerCase().includes(suppliersSearch.toLowerCase()) || s.city?.toLowerCase().includes(suppliersSearch.toLowerCase()))
                .map(shop => (
                  <div key={shop.id} style={{ background: "#fff", border: "1.5px solid #E0D5C8", borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 10, cursor: "pointer", transition: "all 0.18s", boxShadow: "0 2px 8px rgba(26,18,5,0.05)" }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "#BE2B1A"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(190,43,26,0.12)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.borderColor = "#E0D5C8"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(26,18,5,0.05)"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(190,43,26,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#BE2B1A", fontSize: 18, border: "1.5px solid rgba(190,43,26,0.2)" }}>
                        {shop.name?.charAt(0)?.toUpperCase()}
                      </div>
                      {shop.is_verified && (
                        <div style={{ background: "rgba(22,163,74,0.1)", color: "#16A34A", fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 5, textTransform: "uppercase" }}>✓ Verified</div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#1A1205", marginBottom: 3 }}>{shop.name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#9C8C7C" }}>
                        <span style={{ color: "#FBBF24" }}>⭐</span>
                        <span style={{ fontWeight: 700, color: "#1A1205" }}>{(shop.rating || 4.2).toFixed(1)}</span>
                        <span>· {shop.parts_count || 0} parts listed</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "#BE2B1A", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                      📍 {shop.city || shop.address || "Local Shop"}
                      {shop.distance != null && <span style={{ color: "#9C8C7C", fontWeight: 500 }}> · {shop.distance} km away</span>}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ── Home ── */}
      {page === "home" && (
        <>
          {loading ? (
            <div className="mp-loading-wrap">
              <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
                <div>
                  <div style={{ width: 240, height: 24, background: "#E0D5C8", borderRadius: 6, marginBottom: 16 }} className="pulse" />
                  <SkeletonLoader type="product" count={5} variant="light" />
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* VIEW A: VEHICLE SELECTED */}
              {selectedVehicle && data?.compatibleParts ? (
                <div className="mp-results-wrap" style={{ animation: "fadeUp 0.35s ease-out" }}>
                  {/* Vehicle KPI card — always shown when a vehicle is active */}
                  <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
                    {[
                      ["🚗 Vehicle", `${selectedVehicle.brand || selectedVehicle.make || ""} ${selectedVehicle.model || ""}`.trim()],
                      ["📅 Year", selectedVehicle.year || "—"],
                      ["⛽ Fuel", (selectedVehicle.fuel || selectedVehicle.fuelType || "—").toUpperCase()],
                      ...(selectedVehicle.plate ? [["🔖 Plate", selectedVehicle.plate]] : []),
                    ].map(([label, val]) => (
                      <div key={label} style={{ background: "#fff", border: "1px solid #E0D5C8", borderRadius: 10, padding: "10px 18px", display: "flex", flexDirection: "column", gap: 2, boxShadow: "0 1px 4px rgba(26,18,5,0.05)" }}>
                        <div style={{ fontSize: 10, color: "#9C8C7C", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#1A1205" }}>{val}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mp-results-header">
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <h1 className="mp-results-title">
                          Parts for {selectedVehicle.brand} {selectedVehicle.model}
                          {selectedVehicle.variant ? ` ${selectedVehicle.variant}` : ""}
                        </h1>
                        <button
                          onClick={() => { saveVehicle(null); setPlateVehicleResult(null); }}
                          style={{
                            display: "flex", alignItems: "center", gap: 5,
                            background: "#FEF2F2", border: "1.5px solid #FECACA",
                            color: "#BE2B1A", borderRadius: 20, padding: "4px 12px",
                            fontSize: 12, fontWeight: 700, cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#BE2B1A"; e.currentTarget.style.color = "#fff"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.color = "#BE2B1A"; }}
                        >
                          × Clear Vehicle
                        </button>
                      </div>
                      <div className="mp-results-sub">
                        {data.compatibleParts.length} verified compatible parts — sorted by price & proximity
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        style={{ padding: "8px 12px", border: "1.5px solid #E0D5C8", borderRadius: 7, background: "#fff", fontSize: 13, color: "#1A1205", cursor: "pointer", outline: "none" }}
                      >
                        <option value="relevance">Sort: Relevance</option>
                        <option value="price_asc">Price: Low → High</option>
                        <option value="price_desc">Price: High → Low</option>
                        <option value="newest">Newest First</option>
                      </select>
                      <button
                        onClick={() => setFilterDrawerOpen(!filterDrawerOpen)}
                        style={{ padding: "8px 16px", border: `1.5px solid ${filterDrawerOpen ? "#BE2B1A" : "#E0D5C8"}`, borderRadius: 7, background: filterDrawerOpen ? "#BE2B1A" : "#fff", color: filterDrawerOpen ? "#fff" : "#1A1205", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                      >
                        Filter ⚙
                      </button>
                    </div>
                  </div>

                  {filterDrawerOpen && createPortal(
                    <>
                      <div onClick={() => setFilterDrawerOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(26,18,5,0.3)", backdropFilter: "blur(2px)" }} />
                      <div className="mp-filter-panel">
                        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #E0D5C8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1205" }}>Filters</div>
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            {activeFilters.length > 0 && <button onClick={() => setActiveFilters([])} style={{ background: "none", border: "none", color: "#BE2B1A", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Clear All</button>}
                            <button onClick={() => setFilterDrawerOpen(false)} style={{ background: "none", border: "none", color: "#9C8C7C", fontSize: 20, cursor: "pointer" }}>✕</button>
                          </div>
                        </div>
                        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 24 }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#9C8C7C", textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 10 }}>Brand</div>
                            {["Bosch", "NGK", "Purolator", "Mahle", "Monroe", "Denso"].map(b => (
                              <label key={b} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#1A1205", cursor: "pointer", marginBottom: 8 }}>
                                <input type="checkbox" checked={activeFilters.some(f => f.value === b)} onChange={e => { if (e.target.checked) setActiveFilters(p => [...p, { label: "Brand", value: b }]); else setActiveFilters(p => p.filter(f => f.value !== b)); }} style={{ accentColor: "#BE2B1A", width: 15, height: 15 }} />
                                {b}
                              </label>
                            ))}
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#9C8C7C", textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 10 }}>Category</div>
                            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                              {["Filters", "Brakes", "Electrical", "Engine", "Suspension", "Tyres"].map(c => (
                                <button key={c} onClick={() => { if (activeFilters.some(f => f.value === c)) setActiveFilters(p => p.filter(f => f.value !== c)); else setActiveFilters(p => [...p, { label: "Category", value: c }]); }} style={{ background: activeFilters.some(f => f.value === c) ? "#BE2B1A" : "#F5EFE6", border: `1.5px solid ${activeFilters.some(f => f.value === c) ? "#BE2B1A" : "#E0D5C8"}`, color: activeFilters.some(f => f.value === c) ? "#fff" : "#1A1205", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{c}</button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#9C8C7C", textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 10 }}>Availability</div>
                            {[["In Stock Only", "instock"], ["Same Day Delivery", "sameday"]].map(([label, val]) => (
                              <label key={val} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#1A1205", cursor: "pointer", marginBottom: 8 }}>
                                <input type="checkbox" checked={activeFilters.some(f => f.value === val)} onChange={e => { if (e.target.checked) setActiveFilters(p => [...p, { label: "Avail", value: val }]); else setActiveFilters(p => p.filter(f => f.value !== val)); }} style={{ accentColor: "#BE2B1A", width: 15, height: 15 }} />
                                {label}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div style={{ padding: "14px 20px", borderTop: "1px solid #E0D5C8" }}>
                          <button onClick={() => setFilterDrawerOpen(false)} style={{ width: "100%", background: "#BE2B1A", color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                            Apply Filters {activeFilters.length > 0 ? `(${activeFilters.length})` : ""}
                          </button>
                        </div>
                      </div>
                    </>,
                    document.body
                  )}

                  {data.compatibleParts.length === 0 ? (
                    <EmptyState title="No parts found" desc="No parts listed for this vehicle in your area yet." variant="light" />
                  ) : (
                    <div className="mp-results-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
                      {data.compatibleParts.filter(p => {
                        if (activeFilters.length === 0) return true;
                        const bf = activeFilters.filter(f => f.label === "Brand").map(f => f.value);
                        const cf = activeFilters.filter(f => f.label === "Category").map(f => f.value);
                        return (bf.length === 0 || bf.includes(p.product.brand)) && (cf.length === 0 || cf.includes(p.product.category));
                      }).sort((a, b) => {
                        if (sortBy === "price_asc") return a.bestPrice - b.bestPrice;
                        if (sortBy === "price_desc") return b.bestPrice - a.bestPrice;
                        if (sortBy === "newest") return (b.product.createdAt || 0) - (a.product.createdAt || 0);
                        return (b.rankScore || 0) - (a.rankScore || 0);
                      }).map(p => (
                        <div key={p.product.id} style={{ position: "relative" }}>
                          <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", zIndex: 10, background: "#16A34A", color: "#fff", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", boxShadow: "0 3px 10px rgba(22,163,74,0.35)" }}>
                            ✓ Exact Fit — {selectedVehicle.brand} {selectedVehicle.model}
                          </div>
                          <ProductCard item={p} onClick={() => { setPdpProductId(p.product.id); setPage("pdp"); }} inCompare={compareList.some(c => c.product?.id === p.product?.id)} onCompareToggle={handleCompareToggle} variant="light" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {/* VIEW B: NO VEHICLE → HERO + MARKETPLACE */}
              {!selectedVehicle && data ? (
                <div style={{ animation: "fadeUp 0.35s ease-out" }}>

                  {/* ── Hero ── */}
                  <section className="mp-hero">
                    <div className="mp-hero-split">
                      {/* LEFT */}
                      <div className="mp-hero-left">
                        <div className="mp-hero-eyebrow">INDIA'S PREMIER AUTO PARTS PLATFORM</div>
                        <h1 className="mp-hero-h1">
                          Precision Parts for
                          <span className="mp-hero-h1-accent">Industrial Reliability.</span>
                        </h1>
                        <p className="mp-hero-sub">
                          Direct access to authentic OEM and OES components. Engineered for performance, delivered for speed.
                        </p>

                        {/* Tabs */}
                        <div className="mp-tabs-row">
                          <button className={`mp-tab-btn${heroTab === "vehicle" ? " active" : ""}`} onClick={() => setHeroTab("vehicle")}>Vehicle Selector</button>
                          <button className={`mp-tab-btn${heroTab === "plate" ? " active" : ""}`} onClick={() => setHeroTab("plate")}>Number Plate Search</button>
                        </div>

                        {/* Vehicle Selector Tab */}
                        {heroTab === "vehicle" && (
                          <div className="mp-vsel-form">
                            <div className="mp-vsel-row">
                              <select className="mp-vsel-select" value={heroMake} onChange={e => setHeroMake(e.target.value)}>
                                <option value="">Select Make</option>
                                {MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                              <select className="mp-vsel-select" value={heroYear} onChange={e => setHeroYear(e.target.value)}>
                                <option value="">Select Year</option>
                                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                              </select>
                            </div>
                            <button className="mp-search-parts-btn" onClick={() => setVehModalOpen(true)}>
                              Find Compatible Parts →
                            </button>
                            <div className="mp-or-divider">or</div>
                            <button className="mp-open-selector" onClick={() => setVehModalOpen(true)}>
                              📋 Browse Full Vehicle Selector
                            </button>
                          </div>
                        )}

                        {/* Number Plate Search Tab */}
                        {heroTab === "plate" && (
                          <div className="mp-vsel-form">
                            {!plateVehicleResult ? (
                              <>
                                <input
                                  className="mp-plate-input"
                                  placeholder="Enter number plate (e.g. MH01AB1234)"
                                  value={plateSearch}
                                  onChange={e => { setPlateSearch(e.target.value.toUpperCase()); setPlateLookupError(""); }}
                                  maxLength={12}
                                  onKeyDown={e => e.key === "Enter" && plateSearch.length >= 6 && handlePlateLookup()}
                                />
                                {plateLookupError && (
                                  <div style={{ fontSize: 12, color: "#BE2B1A", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "8px 12px" }}>
                                    {plateLookupError}
                                  </div>
                                )}
                                <button
                                  className="mp-search-parts-btn"
                                  onClick={handlePlateLookup}
                                  disabled={plateLookupLoading || plateSearch.length < 6}
                                  style={{ opacity: plateSearch.length < 6 ? 0.6 : 1 }}
                                >
                                  {plateLookupLoading ? "Looking up plate..." : "Find Parts by Plate →"}
                                </button>
                              </>
                            ) : (
                              /* ── Vehicle found — detail card ── */
                              <div style={{ background: "#fff", border: "1.5px solid #E0D5C8", borderRadius: 12, overflow: "hidden", maxWidth: 460 }}>
                                {/* Header strip */}
                                <div style={{ background: "#BE2B1A", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "0.12em" }}>
                                    🚗 {plateVehicleResult.plate}
                                  </div>
                                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", fontWeight: 600, background: "rgba(255,255,255,0.15)", borderRadius: 4, padding: "2px 8px" }}>
                                    VEHICLE FOUND
                                  </div>
                                </div>
                                {/* KPI grid */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                                  {[
                                    ["Make", plateVehicleResult.make || "—"],
                                    ["Model", plateVehicleResult.model || "—"],
                                    ["Year", plateVehicleResult.year || "—"],
                                    ["Fuel Type", (plateVehicleResult.fuelType || "—").toUpperCase()],
                                  ].map(([label, val], i) => (
                                    <div key={label} style={{
                                      padding: "12px 16px",
                                      borderBottom: i < 2 ? "1px solid #F0E8DF" : "none",
                                      borderRight: i % 2 === 0 ? "1px solid #F0E8DF" : "none",
                                    }}>
                                      <div style={{ fontSize: 10, color: "#9C8C7C", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{label}</div>
                                      <div style={{ fontSize: 14, fontWeight: 800, color: "#1A1205" }}>{val}</div>
                                    </div>
                                  ))}
                                </div>
                                {/* Actions */}
                                <div style={{ padding: "12px 16px", display: "flex", gap: 8, borderTop: "1px solid #F0E8DF" }}>
                                  <button
                                    onClick={() => {
                                      saveVehicle({ brand: plateVehicleResult.make, make: plateVehicleResult.make, model: plateVehicleResult.model, year: plateVehicleResult.year, fuel: plateVehicleResult.fuelType, plate: plateVehicleResult.plate });
                                    }}
                                    style={{ flex: 1, background: "#BE2B1A", color: "#fff", border: "none", borderRadius: 7, padding: "11px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                                  >
                                    Find Parts for this Vehicle →
                                  </button>
                                  <button
                                    onClick={() => { setPlateVehicleResult(null); setPlateSearch(""); }}
                                    style={{ padding: "11px 14px", background: "#F5EFE6", border: "1.5px solid #E0D5C8", borderRadius: 7, fontSize: 13, color: "#5C4F40", cursor: "pointer", fontWeight: 600 }}
                                  >
                                    Clear
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* RIGHT — product image panel */}
                      <div className="mp-hero-right">
                        <img
                          src="https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=900"
                          alt="Auto parts"
                          className="mp-hero-right-img"
                        />
                        <div className="mp-hero-right-overlay" />
                        <div className="mp-hero-right-badge">
                          <div className="mp-hero-right-badge-label">Parts in Catalogue</div>
                          <div className="mp-hero-right-badge-val">1.2L+</div>
                          <div className="mp-hero-right-badge-sub">Verified OEM & OES parts</div>
                        </div>
                        <div className="mp-hero-stats">
                          {[["500+", "Shops"], ["₹2Cr+", "GMV/mo"], ["99.9%", "Uptime"]].map(([n, l]) => (
                            <div key={l} className="mp-hero-stat">
                              <div className="mp-hero-stat-num">{n}</div>
                              <div className="mp-hero-stat-lbl">{l}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* ── Sections ── */}
                  <div className="mp-sections">

                    {/* Popular Categories */}
                    <div className="mp-section-block">
                      <div className="mp-section-hdr">
                        <div className="mp-section-title">Popular Categories</div>
                        <button className="mp-view-all">View all →</button>
                      </div>
                      <SectionCarousel title="" variant="light" mobileGrid>
                        {data.popularCategories.map(c => (
                          <div key={c} className="mp-cat-card">
                            <span className="mp-cat-icon">{catIcons[c] || catIcons.default}</span>
                            <span className="mp-cat-label">{c}</span>
                          </div>
                        ))}
                      </SectionCarousel>
                    </div>

                    {/* ── Live from Your Workshop ── */}
                    {(() => {
                      const liveItems = (products || []).filter((p: any) => p.marketplaceLive && (p.marketplaceQty ?? p.stock) > 0);
                      if (!liveItems.length) return null;
                      return (
                        <div className="mp-section-block">
                          <div className="mp-section-hdr">
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div className="mp-section-title">🏪 Live from Your Workshop</div>
                              <span style={{ background: "#16A34A18", color: "#16A34A", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 20, letterSpacing: "0.06em" }}>● {liveItems.length} LIVE</span>
                            </div>
                          </div>
                          <SectionCarousel title="" variant="light">
                            {liveItems.map((p: any) => {
                              const price = p.marketplacePrice || p.sellPrice || 0;
                              const shopName = (shops || []).find((s: any) => s.id === p.shopId)?.name || "Your Workshop";
                              const item = {
                                product: { id: p.id, name: p.name, sku: p.sku || "", brand: p.brand || "OEM", category: p.category || "Parts", image: p.image || null, isUniversal: true, fitmentType: "universal" },
                                bestPrice: price,
                                listings: [{ price, shop: { name: shopName, city: "" }, shop_id: p.shopId, stock: p.marketplaceQty ?? p.stock }],
                              };
                              return (
                                <div key={p.id} style={{ width: 220, flexShrink: 0, background: "#fff", border: "1.5px solid #E0D5C8", borderRadius: 12, overflow: "hidden", cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(190,43,26,0.12)"; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}>
                                  <div style={{ height: 130, background: "#FAF6F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, position: "relative" }}>
                                    {p.image?.startsWith?.("http") ? (
                                      <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                      <span style={{ opacity: 0.4 }}>📦</span>
                                    )}
                                    <div style={{ position: "absolute", top: 8, right: 8, background: "#16A34A", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 20 }}>● LIVE</div>
                                  </div>
                                  <div style={{ padding: "12px 14px" }}>
                                    <div style={{ fontSize: 10, color: "#BE2B1A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{p.brand || "OEM"}</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1205", lineHeight: 1.35, marginBottom: 6 }}>{p.name}</div>
                                    <div style={{ fontSize: 18, fontWeight: 900, color: "#BE2B1A", marginBottom: 6 }}>₹{price.toLocaleString("en-IN")}</div>
                                    <div style={{ fontSize: 11, color: "#9C8C7C", display: "flex", justifyContent: "space-between" }}>
                                      <span>📍 {shopName}</span>
                                      <span>{p.marketplaceQty ?? p.stock} in stock</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </SectionCarousel>
                        </div>
                      );
                    })()}

                    {/* Top Selling */}
                    <div className="mp-section-block">
                      <div className="mp-section-hdr">
                        <div className="mp-section-title">Top Selling Parts</div>
                        <button className="mp-view-all">View all →</button>
                      </div>
                      <SectionCarousel title="" variant="light" mobileGrid>
                        {data.topSelling.map(p => (
                          <ProductCard key={p.product.id} item={p} onClick={() => { setPdpProductId(p.product.id); setPage("pdp"); }} variant="light" />
                        ))}
                      </SectionCarousel>
                    </div>

                    {/* Best Deals */}
                    {data.bestDeals.length > 0 && (
                      <div className="mp-section-block">
                        <div className="mp-section-hdr">
                          <div className="mp-section-title">Best Deals Today</div>
                          <button className="mp-view-all">View all →</button>
                        </div>
                        <SectionCarousel title="" variant="light" mobileGrid>
                          {data.bestDeals.map(p => (
                            <ProductCard key={p.product.id} item={p} onClick={() => { setPdpProductId(p.product.id); setPage("pdp"); }} variant="light" />
                          ))}
                        </SectionCarousel>
                      </div>
                    )}

                    {/* Trending Near You */}
                    <div className="mp-section-block">
                      <div className="mp-section-hdr">
                        <div className="mp-section-title">Trending Near You</div>
                        <button className="mp-view-all">View all →</button>
                      </div>
                      <SectionCarousel title="" variant="light">
                        {data.trendingNearYou.map(p => (
                          <ProductCard key={p.product.id} item={p} onClick={() => { setPdpProductId(p.product.id); setPage("pdp"); }} variant="light" />
                        ))}
                      </SectionCarousel>
                    </div>

                    {/* ── Coming Soon Services (mobile, design 5) ── */}
                    <div className="mp-mobile-only mp-section-block">
                      <div style={{ background: "#1A1205", borderRadius: 16, padding: "28px 18px", textAlign: "center" }}>
                        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 800, color: "#F5EFE6", marginBottom: 6 }}>
                          Coming Soon <span style={{ color: "#FF6B5A" }}>Services</span>
                        </div>
                        <div style={{ fontSize: 12, color: "rgba(245,239,230,0.6)", lineHeight: 1.6, marginBottom: 20, maxWidth: 300, margin: "0 auto 20px" }}>
                          Expert automotive services and maintenance hubs located in your immediate vicinity.
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          {[
                            ["🚿", "Car Washing", "Premium & interior steam cleaning"],
                            ["✨", "Detailing Studios", "Ceramic & paint protection"],
                            ["🪛", "Accessories", "Premium styling & modifications"],
                            ["🏍️", "Bike Spare Parts", "OEM performance components"],
                            ["⚡", "Upgrade Parts", "Bespoke performance tuning"],
                            ["🔜", "More Services", "New hubs launching soon"],
                          ].map(([icon, lbl, sub]) => (
                            <div key={lbl} style={{ background: "rgba(245,239,230,0.06)", border: "1px solid rgba(245,239,230,0.12)", borderRadius: 12, padding: "16px 10px" }}>
                              <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
                              <div style={{ fontSize: 12, fontWeight: 800, color: "#F5EFE6", marginBottom: 3 }}>{lbl}</div>
                              <div style={{ fontSize: 10, color: "rgba(245,239,230,0.5)", lineHeight: 1.5 }}>{sub}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Trusted Shops */}
                    <div className="mp-section-block">
                      <div className="mp-section-hdr">
                        <div className="mp-section-title">Trusted Shops Near You</div>
                        <button className="mp-view-all">View all →</button>
                      </div>
                      <SectionCarousel title="" variant="light">
                        {data.trendingNearYou
                          .filter((v, i, a) => a.findIndex(t => t.listings[0].shop_id === v.listings[0].shop_id) === i)
                          .map(p => <ShopCard key={p.listings[0].shop_id} shop={p.listings[0].shop} variant="light" />)}
                      </SectionCarousel>
                    </div>

                    {/* ── Why Choose Us (mobile, design 5) ── */}
                    <div className="mp-mobile-only mp-section-block">
                      <div style={{ textAlign: "center", fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 20, fontWeight: 800, color: "#1A1205", marginBottom: 22 }}>
                        Why Choose Us
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                        {[
                          ["✓", "Verified Quality", "Vetted for authenticity and structural integrity. No compromises."],
                          ["⚡", "Industrial Speed", "Advanced logistics ensures your vehicle never stays idle."],
                          ["🛡️", "Deep Trust", "Used by thousands of mechanics worldwide for supply chains."],
                        ].map(([icon, lbl, sub]) => (
                          <div key={lbl} style={{ textAlign: "center" }}>
                            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(190,43,26,0.08)", border: "1.5px solid rgba(190,43,26,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#BE2B1A", margin: "0 auto 10px" }}>{icon}</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: "#1A1205", marginBottom: 4 }}>{lbl}</div>
                            <div style={{ fontSize: 12, color: "#9C8C7C", lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>{sub}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* ── Footer (mobile, design 5) ── */}
                  <footer className="mp-mobile-only mp-footer">
                    <div className="mp-footer-brand"><span>RED</span> PISTON</div>
                    <div className="mp-footer-blurb">
                      The world's leading industrial commerce platform for automotive components, providing enterprise-grade reliability to the aftermarket.
                    </div>
                    <div className="mp-footer-cols">
                      <div>
                        <div className="mp-footer-col-title">Solutions</div>
                        <button className="mp-footer-link" onClick={() => setPage("home")}>Marketplace</button>
                        <button className="mp-footer-link" onClick={() => setVehModalOpen(true)}>OEM Parts</button>
                        <button className="mp-footer-link" onClick={() => setPage("suppliers")}>Suppliers</button>
                        <button className="mp-footer-link" onClick={() => setPage("suppliers")}>Logistics</button>
                      </div>
                      <div>
                        <div className="mp-footer-col-title">Company</div>
                        <button className="mp-footer-link">About Us</button>
                        <button className="mp-footer-link">Contact Us</button>
                        <button className="mp-footer-link">Careers</button>
                        <button className="mp-footer-link">Privacy Policy</button>
                      </div>
                    </div>
                    <div className="mp-footer-copy">© {new Date().getFullYear()} Red Piston Industrial. All rights reserved.</div>
                  </footer>
                </div>
              ) : null}
            </>
          )}
        </>
      )}

      </div>{/* end mp-page-body */}

      {/* ── Compare Bar ── */}
      {compareList.length > 0 && (
        <div className="mp-compare-bar">
          <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(245,239,230,0.7)", textTransform: "uppercase", letterSpacing: "1px", flexShrink: 0 }}>
            Comparing {compareList.length}/3
          </div>
          {compareList.map(item => (
            <div key={item.product?.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(245,239,230,0.08)", border: "1px solid rgba(245,239,230,0.2)", borderRadius: 7, padding: "6px 12px", flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#F5EFE6" }}>{item.product?.name?.slice(0, 20)}</span>
              <button onClick={() => handleCompareToggle(item)} style={{ background: "none", border: "none", color: "rgba(245,239,230,0.5)", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
            </div>
          ))}
          <div style={{ flex: 1 }} />
          {compareList.length > 1 && (
            <button onClick={() => setCompareOpen(true)} style={{ background: "#BE2B1A", color: "#fff", border: "none", borderRadius: 7, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Compare Now →
            </button>
          )}
          <button onClick={() => setCompareList([])} style={{ background: "transparent", border: "1px solid rgba(245,239,230,0.25)", borderRadius: 7, padding: "8px 14px", fontSize: 12, color: "rgba(245,239,230,0.6)", cursor: "pointer" }}>
            Clear
          </button>
        </div>
      )}

      {/* ── Modals ── */}
      <VehicleSelectorModal open={vehModalOpen} onClose={() => setVehModalOpen(false)} />
      <ProductComparisonModal open={!!activeProduct} productData={activeProduct} onClose={() => setActiveProduct(null)} />
      <SideBySideModal open={compareOpen} items={compareList} onClose={() => setCompareOpen(false)} />
      <CartDrawer onCheckout={() => navigate("/marketplace/checkout")} />

      {loginModalOpen && (
        <LoginModal
          onClose={() => setLoginModalOpen(false)}
          onLogin={(user) => { setCurrentUser(user); setLoginModalOpen(false); }}
        />
      )}
    </div>
  );
}
