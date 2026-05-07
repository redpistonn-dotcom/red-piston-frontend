// ═══════════════════════════════════════════════════════════════
// SIMULATED RELATIONAL DATABASE — Hyperlocal Auto Parts Marketplace
// Architected for 1M+ SKU scale with vehicle fitment, multi-seller
// aggregation, and delivery logistics
// ═══════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
// VEHICLES — Make-Model-Year-Fuel-Variant database
// ───────────────────────────────────────────────────────────────
export const VEHICLES = [
    { id: "v1", type: "Car", brand: "Maruti Suzuki", model: "Swift", year: "2022", fuel: "Petrol", variant: "ZXi" },
    { id: "v2", type: "Car", brand: "Maruti Suzuki", model: "Baleno", year: "2023", fuel: "Petrol", variant: "Alpha" },
    { id: "v3", type: "Car", brand: "Tata", model: "Nexon", year: "2023", fuel: "Diesel", variant: "XZA+" },
    { id: "v4", type: "Car", brand: "Tata", model: "Punch", year: "2022", fuel: "Petrol", variant: "Accomplished" },
    { id: "v5", type: "Car", brand: "Mahindra", model: "XUV 3XO", year: "2024", fuel: "Diesel", variant: "AX5" },
    { id: "v6", type: "Car", brand: "Kia", model: "Sonet", year: "2023", fuel: "Diesel", variant: "GTX+" },
    { id: "v7", type: "Car", brand: "Hyundai", model: "Creta", year: "2023", fuel: "Petrol", variant: "SX" },
    { id: "v8", type: "Car", brand: "Hyundai", model: "Venue", year: "2022", fuel: "Diesel", variant: "SX(O)" },
    { id: "v9", type: "Car", brand: "Renault", model: "Kwid", year: "2021", fuel: "Petrol", variant: "RXT" },
    { id: "v10", type: "Car", brand: "Hyundai", model: "Elite i20", year: "2020", fuel: "Petrol", variant: "Asta" },
    { id: "v11", type: "Bike", brand: "Honda", model: "Activa 6G", year: "2022", fuel: "Petrol", variant: "Standard" },
    { id: "v12", type: "Car", brand: "Honda", model: "City", year: "2019", fuel: "Petrol", variant: "VX" },
    { id: "v13", type: "Car", brand: "Honda", model: "City", year: "2020", fuel: "Diesel", variant: "ZX" },
    { id: "v14", type: "Car", brand: "Honda", model: "City", year: "2021", fuel: "Petrol", variant: "V" },
    { id: "v15", type: "Car", brand: "Honda", model: "Amaze", year: "2022", fuel: "Petrol", variant: "VX" },
    { id: "v16", type: "Car", brand: "Toyota", model: "Innova Crysta", year: "2023", fuel: "Diesel", variant: "VX" },
    { id: "v17", type: "Car", brand: "Toyota", model: "Fortuner", year: "2022", fuel: "Diesel", variant: "4x2 AT" },
    { id: "v18", type: "Car", brand: "Maruti Suzuki", model: "Ertiga", year: "2023", fuel: "Petrol", variant: "ZXi+" },
    { id: "v19", type: "Car", brand: "Volkswagen", model: "Virtus", year: "2023", fuel: "Petrol", variant: "GT Line" },
    { id: "v20", type: "Bike", brand: "Royal Enfield", model: "Classic 350", year: "2023", fuel: "Petrol", variant: "Chrome" },
    { id: "v21", type: "Car", brand: "Maruti Suzuki", model: "Brezza", year: "2023", fuel: "Petrol", variant: "ZXi+" },
    { id: "v22", type: "Car", brand: "Tata", model: "Harrier", year: "2023", fuel: "Diesel", variant: "XZA+" },
];

// ───────────────────────────────────────────────────────────────
// CATEGORIES
// ───────────────────────────────────────────────────────────────
export const CATEGORIES = [
    "Brakes", "Engine", "Filters", "Suspension", "Electrical", "Accessories", "Body Parts", "Fluids"
];

// ───────────────────────────────────────────────────────────────
// BRAND CATALOG — Manufacturer / Brand profiles
// Single source of truth for brand identity & verification
// ───────────────────────────────────────────────────────────────
export const BRAND_CATALOG = [
    { id: "br1", name: "Bosch", logo: "🔴", country: "Germany", founded: 1886, officialWebsite: "bosch-automotive.com", partNumberPrefix: "BSH", certifications: ["ISO 9001", "IATF 16949", "ISO 14001"], verifiedAt: "2024-01-15T00:00:00Z", isVerified: true, description: "Global leader in automotive technology, spark plugs, brakes, wipers, and electronics.", tier: "premium" },
    { id: "br2", name: "NGK", logo: "🟢", country: "Japan", founded: 1936, officialWebsite: "ngkntk.com", partNumberPrefix: "NGK", certifications: ["ISO 9001", "IATF 16949"], verifiedAt: "2024-02-10T00:00:00Z", isVerified: true, description: "World's #1 spark plug manufacturer. OEM supplier to Honda, Toyota, Maruti Suzuki.", tier: "premium" },
    { id: "br3", name: "Mahle", logo: "🔵", country: "Germany", founded: 1920, officialWebsite: "mahle.com", partNumberPrefix: "MHL", certifications: ["ISO 9001", "IATF 16949", "ISO 14001"], verifiedAt: "2024-01-20T00:00:00Z", isVerified: true, description: "Premium filtration and engine components. OEM partner for major European and Asian automakers.", tier: "premium" },
    { id: "br4", name: "Brembo", logo: "🟡", country: "Italy", founded: 1961, officialWebsite: "brembo.com", partNumberPrefix: "BRM", certifications: ["ISO 9001", "IATF 16949"], verifiedAt: "2024-03-01T00:00:00Z", isVerified: true, description: "The world's leading braking systems manufacturer. Trusted in F1, MotoGP, and premium road cars.", tier: "premium" },
    { id: "br5", name: "Denso", logo: "⚪", country: "Japan", founded: 1949, officialWebsite: "denso.com", partNumberPrefix: "DEN", certifications: ["ISO 9001", "IATF 16949", "ISO 14001"], verifiedAt: "2024-02-25T00:00:00Z", isVerified: true, description: "Toyota Group company. Global supplier of spark plugs, filters, AC systems, and sensors.", tier: "premium" },
    { id: "br6", name: "Monroe", logo: "🟠", country: "USA", founded: 1916, officialWebsite: "monroe.com", partNumberPrefix: "MNR", certifications: ["ISO 9001"], verifiedAt: "2024-04-10T00:00:00Z", isVerified: true, description: "Tenneco brand. Industry leader in shock absorbers, struts, and ride control products.", tier: "mid" },
    { id: "br7", name: "Castrol", logo: "🟢", country: "UK", founded: 1899, officialWebsite: "castrol.com", partNumberPrefix: "CST", certifications: ["ISO 9001", "API SN+", "ACEA C3"], verifiedAt: "2024-01-05T00:00:00Z", isVerified: true, description: "BP subsidiary. Iconic engine oils brand. EDGE and GTX product lines.", tier: "premium" },
    { id: "br8", name: "Exide", logo: "🔴", country: "India", founded: 1947, officialWebsite: "exideindustries.com", partNumberPrefix: "EXD", certifications: ["ISO 9001", "ISO 14001", "BIS"], verifiedAt: "2024-05-15T00:00:00Z", isVerified: true, description: "India's largest battery manufacturer. Powers 1 in every 3 cars on Indian roads.", tier: "mid" },
    { id: "br9", name: "3M", logo: "🟡", country: "USA", founded: 1902, officialWebsite: "3m.com", partNumberPrefix: "3M", certifications: ["ISO 9001", "ISO 14001"], verifiedAt: null, isVerified: false, description: "Automotive care, adhesives, and detailing products. Known for quality car care accessories.", tier: "mid" },
    { id: "br10", name: "Purolator", logo: "🔵", country: "India", founded: 1967, officialWebsite: "purolatorindia.com", partNumberPrefix: "PUR", certifications: ["ISO 9001", "IATF 16949"], verifiedAt: "2024-06-01T00:00:00Z", isVerified: true, description: "India's leading filter manufacturer. OEM supplier to Maruti Suzuki, Tata, Mahindra.", tier: "mid" },
    { id: "br11", name: "Mann", logo: "🟠", country: "Germany", founded: 1941, officialWebsite: "mann-filter.com", partNumberPrefix: "MAN", certifications: ["ISO 9001", "IATF 16949"], verifiedAt: "2024-03-20T00:00:00Z", isVerified: true, description: "MANN+HUMMEL group. OEM-grade filtration for engine, cabin, fuel, and hydraulic applications.", tier: "premium" },
    { id: "br12", name: "KYB", logo: "⚪", country: "Japan", founded: 1919, officialWebsite: "kyb.com", partNumberPrefix: "KYB", certifications: ["ISO 9001", "IATF 16949"], verifiedAt: "2024-04-05T00:00:00Z", isVerified: true, description: "World's largest shock absorber manufacturer. OEM supplier to 1 in 4 cars globally.", tier: "premium" },
    { id: "br13", name: "Wurth", logo: "🔴", country: "Germany", founded: 1945, officialWebsite: "wurth.com", partNumberPrefix: "WRT", certifications: ["ISO 9001"], verifiedAt: null, isVerified: false, description: "Assembly and fastening materials, chemical-technical products for automotive workshops.", tier: "mid" },
    { id: "br14", name: "Continental", logo: "🟡", country: "Germany", founded: 1871, officialWebsite: "continental-automotive.com", partNumberPrefix: "CON", certifications: ["ISO 9001", "IATF 16949", "ISO 14001"], verifiedAt: "2024-02-28T00:00:00Z", isVerified: true, description: "Premium automotive supplier. Belts, hoses, brakes, sensors, and ADAS systems.", tier: "premium" },
    { id: "br15", name: "Honda", logo: "🔴", country: "Japan", founded: 1948, officialWebsite: "honda.com", partNumberPrefix: "HON", certifications: ["OEM Genuine"], verifiedAt: "2024-01-10T00:00:00Z", isVerified: true, description: "Honda Genuine Parts. Factory-original replacement parts for Honda vehicles.", tier: "oem" },
    { id: "br16", name: "Lumax", logo: "🔵", country: "India", founded: 1981, officialWebsite: "lumaxworld.in", partNumberPrefix: "LMX", certifications: ["ISO 9001", "IATF 16949"], verifiedAt: null, isVerified: false, description: "India's largest automotive lighting company. OEM supplier to Honda, Suzuki, Tata.", tier: "mid" },
];

// Helper to look up a brand by name
export const getBrandByName = (brandName) => BRAND_CATALOG.find(b => b.name === brandName) || null;

// ───────────────────────────────────────────────────────────────
// MASTER PRODUCT CATALOG — Global SKU-level products
// Platform admin manages these. Single source of truth.
// ───────────────────────────────────────────────────────────────
export const MASTER_PRODUCTS = [
    {
        id: "mp1",
        name: "Bosch Front Brake Pads",
        brand: "Bosch", brandId: "br1",
        category: "Brakes",
        sku: "BSH-BRK-001",
        compatibility: ["v1", "v2", "v21"],
        description: "Premium OEM equivalent ceramic brake pads for high-volume Maruti Suzuki hatchbacks. Zero dust formula.",
        specifications: { weight: "1.1kg", material: "Ceramic", warranty: "1 Year", position: "Front" },
        oem_part_no: "09.9752.1403",
        image: "https://images.unsplash.com/photo-1600705357388-75211dcdb66f?auto=format&fit=crop&q=80&w=200&h=200",
        global_sales_velocity: 3200,
        created_at: "2023-01-10T00:00:00Z",
        // Listing System fields
        brandVerified: true, brandVerifiedAt: "2024-02-01T00:00:00Z",
        adminApproved: true, adminApprovedAt: "2023-01-08T00:00:00Z",
        status: "published", createdBy: "admin",
    },
    {
        id: "mp2",
        name: "Mahle Premium Oil Filter",
        brand: "Mahle", brandId: "br3",
        category: "Filters",
        sku: "MHL-OIL-CR",
        compatibility: ["v7", "v8", "v10"],
        description: "High-efficiency spin-on oil filter engineered for Hyundai CRDi and VTVT engines.",
        specifications: { weight: "250g", type: "Spin-on", warranty: "10,000 km" },
        oem_part_no: "OC 985",
        image: "https://images.unsplash.com/photo-1549488344-c7ef21a416a2?auto=format&fit=crop&q=80&w=200&h=200",
        global_sales_velocity: 2800,
        created_at: "2023-02-15T00:00:00Z",
        brandVerified: true, brandVerifiedAt: "2024-02-15T00:00:00Z",
        adminApproved: true, adminApprovedAt: "2023-02-12T00:00:00Z",
        status: "published", createdBy: "admin",
    },
    {
        id: "mp3",
        name: "NGK Laser Iridium Spark Plug",
        brand: "NGK", brandId: "br2",
        category: "Electrical",
        sku: "NGK-IR-UNI",
        compatibility: ["v9", "v11", "v15", "v20"],
        description: "Universal iridium technology for ubiquitous two-wheelers and high-efficiency compact engines.",
        specifications: { weight: "100g", material: "Iridium", type: "Universal 2W/Compact" },
        oem_part_no: "ILZKR7B11S",
        image: "https://images.unsplash.com/photo-1616428781489-082260f723ea?auto=format&fit=crop&q=80&w=200&h=200",
        global_sales_velocity: 4500,
        created_at: "2023-11-20T00:00:00Z",
        brandVerified: true, brandVerifiedAt: "2024-03-01T00:00:00Z",
        adminApproved: true, adminApprovedAt: "2023-11-18T00:00:00Z",
        status: "published", createdBy: "admin",
    },
    {
        id: "mp4",
        name: "Monroe OESpectrum Strut Assembly",
        brand: "Monroe", brandId: "br6",
        category: "Suspension",
        sku: "MNR-STR-NX",
        compatibility: ["v3", "v22"],
        description: "Heavy-duty MacPherson strut designed to handle diverse road conditions for compact SUVs.",
        specifications: { weight: "4.5kg", position: "Front", warranty: "2 Years" },
        oem_part_no: "72365",
        image: "https://images.unsplash.com/photo-1611082590217-06df31b997c2?auto=format&fit=crop&q=80&w=200&h=200",
        global_sales_velocity: 850,
        created_at: "2023-05-12T00:00:00Z",
        brandVerified: true, brandVerifiedAt: "2024-05-01T00:00:00Z",
        adminApproved: true, adminApprovedAt: "2023-05-10T00:00:00Z",
        status: "published", createdBy: "admin",
    },
    {
        id: "mp5",
        name: "Purolator Active Carbon Air Filter",
        brand: "Purolator", brandId: "br10",
        category: "Filters",
        sku: "PUR-CAB-UNI",
        compatibility: ["v1", "v2", "v3", "v6", "v7", "v21"],
        description: "Multi-layered activated carbon cabin filter targeting urban particulate matter.",
        specifications: { weight: "200g", type: "Activated Carbon" },
        oem_part_no: "A35407",
        image: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=200&h=200",
        global_sales_velocity: 1900,
        created_at: "2023-08-01T00:00:00Z",
        brandVerified: true, brandVerifiedAt: "2024-06-15T00:00:00Z",
        adminApproved: true, adminApprovedAt: "2023-07-28T00:00:00Z",
        status: "published", createdBy: "admin",
    },
    // ──── Honda City Compatible Products ────
    {
        id: "mp6",
        name: "Brembo Front Brake Pads — Honda City",
        brand: "Brembo", brandId: "br4",
        category: "Brakes",
        sku: "BRM-BRK-HC",
        compatibility: ["v12", "v13", "v14"],
        description: "High-performance ceramic brake pads engineered for Honda City 5th Gen. Superior stopping power, low noise, minimal dust.",
        specifications: { weight: "1.2kg", material: "Ceramic Composite", warranty: "2 Years", position: "Front" },
        oem_part_no: "P 28 077",
        image: "https://images.unsplash.com/photo-1600705357388-75211dcdb66f?auto=format&fit=crop&q=80&w=200&h=200",
        global_sales_velocity: 2400,
        created_at: "2023-03-15T00:00:00Z",
        brandVerified: true, brandVerifiedAt: "2024-04-01T00:00:00Z",
        adminApproved: true, adminApprovedAt: "2023-03-12T00:00:00Z",
        status: "published", createdBy: "admin",
    },
    {
        id: "mp7",
        name: "Mann Oil Filter — Honda Petrol",
        brand: "Mann", brandId: "br11",
        category: "Filters",
        sku: "MAN-OIL-HP",
        compatibility: ["v12", "v14", "v15"],
        description: "Premium spin-on oil filter for Honda i-VTEC and i-DTEC engines. 99.5% filtration efficiency.",
        specifications: { weight: "280g", type: "Spin-on Canister", warranty: "15,000 km" },
        oem_part_no: "W 610/9",
        image: "https://images.unsplash.com/photo-1549488344-c7ef21a416a2?auto=format&fit=crop&q=80&w=200&h=200",
        global_sales_velocity: 3100,
        created_at: "2023-04-20T00:00:00Z",
        brandVerified: true, brandVerifiedAt: "2024-04-20T00:00:00Z",
        adminApproved: true, adminApprovedAt: "2023-04-18T00:00:00Z",
        status: "published", createdBy: "admin",
    },
    {
        id: "mp8",
        name: "Denso Iridium Spark Plug — Honda",
        brand: "Denso", brandId: "br5",
        category: "Electrical",
        sku: "DEN-SPK-HC",
        compatibility: ["v12", "v14", "v15", "v11"],
        description: "OEM-grade iridium spark plug for Honda i-VTEC engines. Factory replacement for Honda City, Amaze, and Jazz.",
        specifications: { weight: "90g", material: "Iridium", gap: "0.9mm", heat_range: "20" },
        oem_part_no: "SKJ20DR-M11S",
        image: "https://images.unsplash.com/photo-1616428781489-082260f723ea?auto=format&fit=crop&q=80&w=200&h=200",
        global_sales_velocity: 2600,
        created_at: "2023-07-01T00:00:00Z",
        brandVerified: true, brandVerifiedAt: "2024-03-10T00:00:00Z",
        adminApproved: true, adminApprovedAt: "2023-06-28T00:00:00Z",
        status: "published", createdBy: "admin",
    },
    {
        id: "mp9",
        name: "KYB Excel-G Shock Absorber — Honda City",
        brand: "KYB", brandId: "br12",
        category: "Suspension",
        sku: "KYB-SHK-HC",
        compatibility: ["v12", "v13", "v14"],
        description: "Gas-charged twin-tube shock absorber for Honda City. Restores OEM ride quality and handling precision.",
        specifications: { weight: "3.8kg", position: "Front Right", type: "Twin-Tube Gas", warranty: "1 Year" },
        oem_part_no: "341488",
        image: "https://images.unsplash.com/photo-1611082590217-06df31b997c2?auto=format&fit=crop&q=80&w=200&h=200",
        global_sales_velocity: 920,
        created_at: "2023-06-18T00:00:00Z",
        brandVerified: true, brandVerifiedAt: "2024-05-10T00:00:00Z",
        adminApproved: true, adminApprovedAt: "2023-06-15T00:00:00Z",
        status: "published", createdBy: "admin",
    },
    {
        id: "mp10",
        name: "Bosch Aerotwin Wiper Blades — Honda City",
        brand: "Bosch", brandId: "br1",
        category: "Accessories",
        sku: "BSH-WPR-HC",
        compatibility: ["v12", "v13", "v14", "v15"],
        description: "Flat-blade wiper with precision-cut aerodynamic spoiler for Honda City. Streak-free, quiet operation.",
        specifications: { length: "26\"/16\" Pair", type: "Flat Blade", warranty: "1 Year" },
        oem_part_no: "A120S",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&q=80&w=200&h=200",
        global_sales_velocity: 1800,
        created_at: "2023-09-05T00:00:00Z",
        brandVerified: true, brandVerifiedAt: "2024-02-01T00:00:00Z",
        adminApproved: true, adminApprovedAt: "2023-09-02T00:00:00Z",
        status: "published", createdBy: "admin",
    },
    // ──── Toyota Compatible Products ────
    {
        id: "mp11",
        name: "Denso Cabin Air Filter — Toyota",
        brand: "Denso", brandId: "br5",
        category: "Filters",
        sku: "DEN-CAB-TY",
        compatibility: ["v16", "v17"],
        description: "High-performance activated charcoal cabin filter for Toyota Innova Crysta and Fortuner. Blocks PM2.5.",
        specifications: { weight: "320g", type: "Activated Charcoal + HEPA", warranty: "6 Months" },
        oem_part_no: "DCC-2014",
        image: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=200&h=200",
        global_sales_velocity: 1400,
        created_at: "2023-10-01T00:00:00Z",
        brandVerified: true, brandVerifiedAt: "2024-03-10T00:00:00Z",
        adminApproved: true, adminApprovedAt: "2023-09-28T00:00:00Z",
        status: "published", createdBy: "admin",
    },
    {
        id: "mp12",
        name: "Castrol EDGE 5W-30 Full Synthetic Engine Oil",
        brand: "Castrol", brandId: "br7",
        category: "Fluids",
        sku: "CST-OIL-5W30",
        compatibility: ["v1", "v2", "v7", "v12", "v14", "v18", "v19", "v21"],
        description: "Full synthetic engine oil with Fluid Titanium Technology. Reduces metal-to-metal contact, ideal for modern petrol engines.",
        specifications: { volume: "4 Litres", viscosity: "5W-30", api: "SN+/CF", warranty: "Genuine Product Guarantee" },
        oem_part_no: "15C49A",
        image: "https://images.unsplash.com/photo-1635070040884-0474d7918bc4?auto=format&fit=crop&q=80&w=200&h=200",
        global_sales_velocity: 5200,
        created_at: "2023-01-05T00:00:00Z",
        brandVerified: true, brandVerifiedAt: "2024-01-20T00:00:00Z",
        adminApproved: true, adminApprovedAt: "2023-01-03T00:00:00Z",
        status: "published", createdBy: "admin",
    },
    // ──── Universal / Multi-fit Products ────
    {
        id: "mp13",
        name: "Exide Mileage MLDIN44LH Battery",
        brand: "Exide", brandId: "br8",
        category: "Electrical",
        sku: "EXD-BAT-44",
        compatibility: ["v1", "v2", "v4", "v9", "v12", "v14", "v15", "v18", "v21"],
        description: "Maintenance-free car battery. High cranking power for petrol hatches and sedans. 44Ah capacity.",
        specifications: { capacity: "44Ah", type: "Lead Acid MF", warranty: "55 Months", dimensions: "238x129x227mm" },
        oem_part_no: "MLDIN44LH",
        image: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=200&h=200",
        global_sales_velocity: 3800,
        created_at: "2023-02-20T00:00:00Z",
        brandVerified: true, brandVerifiedAt: "2024-06-01T00:00:00Z",
        adminApproved: true, adminApprovedAt: "2023-02-18T00:00:00Z",
        status: "published", createdBy: "admin",
    },
    {
        id: "mp14",
        name: "Bosch Clear Advantage Headlight Bulb H4",
        brand: "Bosch", brandId: "br1",
        category: "Electrical",
        sku: "BSH-BLB-H4",
        compatibility: ["v1", "v4", "v9", "v12", "v15", "v20"],
        description: "60/55W halogen headlight bulb H4. +30% more light, tested for vibration resistance.",
        specifications: { wattage: "60/55W", type: "H4 Halogen", color_temp: "3700K", warranty: "6 Months" },
        oem_part_no: "1 987 301 054",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&q=80&w=200&h=200",
        global_sales_velocity: 4100,
        created_at: "2023-08-15T00:00:00Z",
        brandVerified: true, brandVerifiedAt: "2024-02-01T00:00:00Z",
        adminApproved: true, adminApprovedAt: "2023-08-12T00:00:00Z",
        status: "published", createdBy: "admin",
    },
    {
        id: "mp15",
        name: "3M Car Care Microfiber Cloth Kit",
        brand: "3M", brandId: "br9",
        category: "Accessories",
        sku: "3M-MCF-KIT",
        compatibility: [], // Universal
        description: "Premium microfiber cloth kit (3-pack). Ultra-soft, lint-free. Ideal for paint, glass, and interior surfaces.",
        specifications: { count: "3 Pack", size: "40x40cm", material: "Microfiber 300 GSM" },
        oem_part_no: "IA260166326",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&q=80&w=200&h=200",
        global_sales_velocity: 6200,
        created_at: "2023-11-01T00:00:00Z",
        brandVerified: false, brandVerifiedAt: null,
        adminApproved: true, adminApprovedAt: "2023-10-28T00:00:00Z",
        status: "published", createdBy: "admin",
    },
    {
        id: "mp16",
        name: "Rear Brake Disc Rotor — Honda City",
        brand: "Brembo", brandId: "br4",
        category: "Brakes",
        sku: "BRM-DSC-HC",
        compatibility: ["v12", "v13", "v14"],
        description: "Precision-ground vented brake disc rotor for Honda City rear axle. UV-coated to prevent corrosion.",
        specifications: { diameter: "260mm", type: "Solid", weight: "3.9kg", warranty: "2 Years" },
        oem_part_no: "08.A869.10",
        image: "https://images.unsplash.com/photo-1600705357388-75211dcdb66f?auto=format&fit=crop&q=80&w=200&h=200",
        global_sales_velocity: 700,
        created_at: "2023-12-01T00:00:00Z",
        brandVerified: true, brandVerifiedAt: "2024-04-01T00:00:00Z",
        adminApproved: true, adminApprovedAt: "2023-11-28T00:00:00Z",
        status: "published", createdBy: "admin",
    },
    {
        id: "mp17",
        name: "Wurth Brake Cleaner Spray 500ml",
        brand: "Wurth", brandId: "br13",
        category: "Fluids",
        sku: "WRT-BRK-CLN",
        compatibility: [], // Universal
        description: "Fast-evaporating solvent-based brake cleaner. Removes brake dust, oil, and grease. Safe on all brake components.",
        specifications: { volume: "500ml", type: "Aerosol Spray", flash_point: "-40°C" },
        oem_part_no: "0890 108",
        image: "https://images.unsplash.com/photo-1635070040884-0474d7918bc4?auto=format&fit=crop&q=80&w=200&h=200",
        global_sales_velocity: 3600,
        created_at: "2023-09-20T00:00:00Z",
        brandVerified: false, brandVerifiedAt: null,
        adminApproved: true, adminApprovedAt: "2023-09-18T00:00:00Z",
        status: "published", createdBy: "admin",
    },
    {
        id: "mp18",
        name: "Continental Drive Belt Kit — Maruti",
        brand: "Continental", brandId: "br14",
        category: "Engine",
        sku: "CON-BLT-MS",
        compatibility: ["v1", "v2", "v18", "v21"],
        description: "OEM-spec serpentine drive belt kit with tensioner for Maruti K-Series engines. Includes belt + idler pulley.",
        specifications: { length: "1050mm", ribs: "6PK", warranty: "2 Years" },
        oem_part_no: "6PK1050",
        image: "https://images.unsplash.com/photo-1611082590217-06df31b997c2?auto=format&fit=crop&q=80&w=200&h=200",
        global_sales_velocity: 1100,
        created_at: "2023-07-15T00:00:00Z",
        brandVerified: true, brandVerifiedAt: "2024-03-15T00:00:00Z",
        adminApproved: true, adminApprovedAt: "2023-07-12T00:00:00Z",
        status: "published", createdBy: "admin",
    },
    {
        id: "mp19",
        name: "Honda Genuine Coolant (Pre-Mixed) 3.5L",
        brand: "Honda", brandId: "br15",
        category: "Fluids",
        sku: "HON-CLT-PM",
        compatibility: ["v12", "v13", "v14", "v15"],
        description: "Factory-spec pre-mixed long-life coolant for Honda vehicles. Ready to use, no dilution required.",
        specifications: { volume: "3.5 Litres", type: "Pre-Mixed", color: "Blue/Green", warranty: "Genuine Honda" },
        oem_part_no: "OL999-9011",
        image: "https://images.unsplash.com/photo-1635070040884-0474d7918bc4?auto=format&fit=crop&q=80&w=200&h=200",
        global_sales_velocity: 1600,
        created_at: "2023-10-10T00:00:00Z",
        brandVerified: true, brandVerifiedAt: "2024-01-10T00:00:00Z",
        adminApproved: true, adminApprovedAt: "2023-10-08T00:00:00Z",
        status: "published", createdBy: "admin",
    },
    {
        id: "mp20",
        name: "Lumax Tail Light Assembly — Honda City",
        brand: "Lumax", brandId: "br16",
        category: "Body Parts",
        sku: "LMX-TLT-HC",
        compatibility: ["v12", "v14"],
        description: "OEM-equivalent LED tail-light assembly for Honda City 5th Gen. Plug-and-play, no wiring modification needed.",
        specifications: { side: "Left", type: "LED Tail Light", warranty: "6 Months" },
        oem_part_no: "33550-T9A-H11",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&q=80&w=200&h=200",
        global_sales_velocity: 420,
        created_at: "2024-01-10T00:00:00Z",
        brandVerified: false, brandVerifiedAt: null,
        adminApproved: true, adminApprovedAt: "2024-01-08T00:00:00Z",
        status: "published", createdBy: "admin",
    }
];

// ───────────────────────────────────────────────────────────────
// SHOPS — Hyperlocal Hyderabad marketplace sellers
// ───────────────────────────────────────────────────────────────
export const SHOPS = [
    { id: "s1", name: "Sri Durga Motors (Mehdipatnam)", lat: 17.3916, lng: 78.4398, rating: 4.8, reviews: 340, is_featured: true, delivery_radius: 15, address: "Plot 23, Road No 1, Mehdipatnam, Hyderabad", phone: "9876543210" },
    { id: "s2", name: "Auto Nagar Distributors", lat: 17.3753, lng: 78.5577, rating: 4.5, reviews: 120, is_featured: false, delivery_radius: 20, address: "Shop 7, Auto Nagar Main Rd, Hyderabad", phone: "9876543211" },
    { id: "s3", name: "Madhapur Spares Hub", lat: 17.4483, lng: 78.3915, rating: 4.2, reviews: 85, is_featured: false, delivery_radius: 10, address: "Hi-Tech City Rd, Madhapur, Hyderabad", phone: "9876543212" },
    { id: "s4", name: "Ravi Auto Parts (Secunderabad)", lat: 17.4399, lng: 78.4983, rating: 4.7, reviews: 210, is_featured: true, delivery_radius: 12, address: "SD Road, Secunderabad, Hyderabad", phone: "9876543213" },
    { id: "s5", name: "Kondapur Car Spares", lat: 17.4620, lng: 78.3508, rating: 4.0, reviews: 55, is_featured: false, delivery_radius: 8, address: "Near Kondapur X-Roads, Hyderabad", phone: "9876543214" },
];

// ───────────────────────────────────────────────────────────────
// SHOP INVENTORY — Links Master Products to Individual Shop stock
// ───────────────────────────────────────────────────────────────
export const SHOP_INVENTORY = [
    // ── mp1: Bosch Brake Pads (Maruti) ──
    { shop_id: "s1", product_id: "mp1", selling_price: 1850, buying_price: 1400, discount: 10, stock_quantity: 42, min_stock: 5, delivery_time: "Same Day", total_sales: 840 },
    { shop_id: "s2", product_id: "mp1", selling_price: 1950, buying_price: 1450, discount: 0, stock_quantity: 114, min_stock: 15, delivery_time: "Next Day", total_sales: 445 },
    { shop_id: "s3", product_id: "mp1", selling_price: 1900, buying_price: 1420, discount: 5, stock_quantity: 12, min_stock: 5, delivery_time: "Same Day", total_sales: 120 },

    // ── mp2: Mahle Oil Filter (Hyundai) ──
    { shop_id: "s1", product_id: "mp2", selling_price: 450, buying_price: 300, discount: 5, stock_quantity: 30, min_stock: 10, delivery_time: "Same Day", total_sales: 400 },
    { shop_id: "s3", product_id: "mp2", selling_price: 420, buying_price: 280, discount: 12, stock_quantity: 5, min_stock: 10, delivery_time: "Same Day", total_sales: 460 },

    // ── mp3: NGK Spark Plug ──
    { shop_id: "s2", product_id: "mp3", selling_price: 250, buying_price: 180, discount: 15, stock_quantity: 150, min_stock: 20, delivery_time: "Same Day", total_sales: 1800 },
    { shop_id: "s3", product_id: "mp3", selling_price: 280, buying_price: 190, discount: 0, stock_quantity: 25, min_stock: 10, delivery_time: "Next Day", total_sales: 300 },

    // ── mp4: Monroe Strut (Nexon) ──
    { shop_id: "s1", product_id: "mp4", selling_price: 3500, buying_price: 2800, discount: 5, stock_quantity: 8, min_stock: 4, delivery_time: "Same Day", total_sales: 40 },

    // ── mp5: Purolator Air Filter (Multi) ──
    { shop_id: "s1", product_id: "mp5", selling_price: 550, buying_price: 380, discount: 0, stock_quantity: 45, min_stock: 15, delivery_time: "Same Day", total_sales: 230 },
    { shop_id: "s2", product_id: "mp5", selling_price: 500, buying_price: 360, discount: 10, stock_quantity: 115, min_stock: 10, delivery_time: "Next Day", total_sales: 1110 },
    { shop_id: "s3", product_id: "mp5", selling_price: 580, buying_price: 390, discount: 0, stock_quantity: 16, min_stock: 10, delivery_time: "Same Day", total_sales: 85 },

    // ── mp6: Brembo Brake Pads (Honda City) ──
    { shop_id: "s1", product_id: "mp6", selling_price: 2400, buying_price: 1800, discount: 8, stock_quantity: 18, min_stock: 5, delivery_time: "Same Day", total_sales: 180 },
    { shop_id: "s4", product_id: "mp6", selling_price: 2350, buying_price: 1780, discount: 10, stock_quantity: 25, min_stock: 5, delivery_time: "Same Day", total_sales: 220 },
    { shop_id: "s5", product_id: "mp6", selling_price: 2500, buying_price: 1850, discount: 5, stock_quantity: 8, min_stock: 3, delivery_time: "Same Day", total_sales: 45 },

    // ── mp7: Mann Oil Filter (Honda) ──
    { shop_id: "s1", product_id: "mp7", selling_price: 520, buying_price: 350, discount: 5, stock_quantity: 35, min_stock: 10, delivery_time: "Same Day", total_sales: 310 },
    { shop_id: "s4", product_id: "mp7", selling_price: 490, buying_price: 340, discount: 8, stock_quantity: 50, min_stock: 10, delivery_time: "Same Day", total_sales: 480 },

    // ── mp8: Denso Spark Plug (Honda) ──
    { shop_id: "s2", product_id: "mp8", selling_price: 380, buying_price: 260, discount: 12, stock_quantity: 80, min_stock: 15, delivery_time: "Same Day", total_sales: 520 },
    { shop_id: "s4", product_id: "mp8", selling_price: 350, buying_price: 250, discount: 15, stock_quantity: 95, min_stock: 15, delivery_time: "Same Day", total_sales: 680 },
    { shop_id: "s5", product_id: "mp8", selling_price: 400, buying_price: 270, discount: 0, stock_quantity: 20, min_stock: 8, delivery_time: "Next Day", total_sales: 90 },

    // ── mp9: KYB Shock Absorber (Honda City) ──
    { shop_id: "s1", product_id: "mp9", selling_price: 4200, buying_price: 3200, discount: 5, stock_quantity: 6, min_stock: 3, delivery_time: "Same Day", total_sales: 35 },
    { shop_id: "s4", product_id: "mp9", selling_price: 4050, buying_price: 3100, discount: 8, stock_quantity: 10, min_stock: 4, delivery_time: "Same Day", total_sales: 55 },

    // ── mp10: Bosch Wiper Blades (Honda) ──
    { shop_id: "s1", product_id: "mp10", selling_price: 850, buying_price: 550, discount: 10, stock_quantity: 22, min_stock: 8, delivery_time: "Same Day", total_sales: 190 },
    { shop_id: "s3", product_id: "mp10", selling_price: 880, buying_price: 560, discount: 5, stock_quantity: 15, min_stock: 5, delivery_time: "Same Day", total_sales: 70 },
    { shop_id: "s4", product_id: "mp10", selling_price: 820, buying_price: 540, discount: 12, stock_quantity: 30, min_stock: 10, delivery_time: "Same Day", total_sales: 210 },

    // ── mp11: Denso Cabin Filter (Toyota) ──
    { shop_id: "s2", product_id: "mp11", selling_price: 650, buying_price: 420, discount: 8, stock_quantity: 28, min_stock: 8, delivery_time: "Next Day", total_sales: 140 },
    { shop_id: "s4", product_id: "mp11", selling_price: 620, buying_price: 400, discount: 10, stock_quantity: 35, min_stock: 10, delivery_time: "Same Day", total_sales: 190 },

    // ── mp12: Castrol Engine Oil (Universal Petrol) ──
    { shop_id: "s1", product_id: "mp12", selling_price: 2200, buying_price: 1700, discount: 5, stock_quantity: 60, min_stock: 15, delivery_time: "Same Day", total_sales: 780 },
    { shop_id: "s2", product_id: "mp12", selling_price: 2150, buying_price: 1680, discount: 8, stock_quantity: 90, min_stock: 20, delivery_time: "Same Day", total_sales: 1050 },
    { shop_id: "s4", product_id: "mp12", selling_price: 2250, buying_price: 1720, discount: 3, stock_quantity: 40, min_stock: 10, delivery_time: "Same Day", total_sales: 420 },
    { shop_id: "s5", product_id: "mp12", selling_price: 2100, buying_price: 1650, discount: 10, stock_quantity: 25, min_stock: 8, delivery_time: "Same Day", total_sales: 310 },

    // ── mp13: Exide Battery (Multi-fit) ──
    { shop_id: "s1", product_id: "mp13", selling_price: 4800, buying_price: 3800, discount: 5, stock_quantity: 12, min_stock: 4, delivery_time: "Same Day", total_sales: 95 },
    { shop_id: "s2", product_id: "mp13", selling_price: 4650, buying_price: 3700, discount: 8, stock_quantity: 20, min_stock: 6, delivery_time: "Same Day", total_sales: 145 },
    { shop_id: "s4", product_id: "mp13", selling_price: 4750, buying_price: 3780, discount: 6, stock_quantity: 15, min_stock: 5, delivery_time: "Same Day", total_sales: 110 },

    // ── mp14: Bosch Headlight Bulb H4 ──
    { shop_id: "s1", product_id: "mp14", selling_price: 320, buying_price: 200, discount: 10, stock_quantity: 80, min_stock: 20, delivery_time: "Same Day", total_sales: 650 },
    { shop_id: "s3", product_id: "mp14", selling_price: 350, buying_price: 210, discount: 5, stock_quantity: 40, min_stock: 10, delivery_time: "Same Day", total_sales: 280 },
    { shop_id: "s5", product_id: "mp14", selling_price: 300, buying_price: 190, discount: 15, stock_quantity: 55, min_stock: 12, delivery_time: "Same Day", total_sales: 420 },

    // ── mp15: 3M Microfiber Kit (Universal) ──
    { shop_id: "s1", product_id: "mp15", selling_price: 450, buying_price: 280, discount: 10, stock_quantity: 100, min_stock: 25, delivery_time: "Same Day", total_sales: 920 },
    { shop_id: "s2", product_id: "mp15", selling_price: 430, buying_price: 270, discount: 12, stock_quantity: 150, min_stock: 30, delivery_time: "Same Day", total_sales: 1500 },
    { shop_id: "s3", product_id: "mp15", selling_price: 480, buying_price: 290, discount: 5, stock_quantity: 60, min_stock: 15, delivery_time: "Same Day", total_sales: 350 },
    { shop_id: "s4", product_id: "mp15", selling_price: 420, buying_price: 260, discount: 15, stock_quantity: 120, min_stock: 25, delivery_time: "Same Day", total_sales: 1100 },

    // ── mp16: Brembo Brake Disc (Honda City) ──
    { shop_id: "s1", product_id: "mp16", selling_price: 3200, buying_price: 2400, discount: 5, stock_quantity: 5, min_stock: 2, delivery_time: "Same Day", total_sales: 22 },
    { shop_id: "s4", product_id: "mp16", selling_price: 3100, buying_price: 2350, discount: 8, stock_quantity: 8, min_stock: 3, delivery_time: "Same Day", total_sales: 38 },

    // ── mp17: Wurth Brake Cleaner (Universal) ──
    { shop_id: "s1", product_id: "mp17", selling_price: 380, buying_price: 250, discount: 5, stock_quantity: 60, min_stock: 15, delivery_time: "Same Day", total_sales: 480 },
    { shop_id: "s2", product_id: "mp17", selling_price: 350, buying_price: 240, discount: 10, stock_quantity: 90, min_stock: 20, delivery_time: "Same Day", total_sales: 720 },
    { shop_id: "s4", product_id: "mp17", selling_price: 370, buying_price: 248, discount: 8, stock_quantity: 45, min_stock: 12, delivery_time: "Same Day", total_sales: 340 },

    // ── mp18: Continental Belt Kit (Maruti) ──
    { shop_id: "s2", product_id: "mp18", selling_price: 1800, buying_price: 1300, discount: 5, stock_quantity: 12, min_stock: 4, delivery_time: "Same Day", total_sales: 65 },
    { shop_id: "s4", product_id: "mp18", selling_price: 1750, buying_price: 1280, discount: 8, stock_quantity: 18, min_stock: 5, delivery_time: "Same Day", total_sales: 90 },

    // ── mp19: Honda Genuine Coolant ──
    { shop_id: "s1", product_id: "mp19", selling_price: 780, buying_price: 550, discount: 0, stock_quantity: 20, min_stock: 8, delivery_time: "Same Day", total_sales: 110 },
    { shop_id: "s4", product_id: "mp19", selling_price: 750, buying_price: 540, discount: 5, stock_quantity: 30, min_stock: 10, delivery_time: "Same Day", total_sales: 165 },
    { shop_id: "s5", product_id: "mp19", selling_price: 800, buying_price: 560, discount: 0, stock_quantity: 10, min_stock: 5, delivery_time: "Next Day", total_sales: 40 },

    // ── mp20: Lumax Tail Light (Honda City) ──
    { shop_id: "s4", product_id: "mp20", selling_price: 2800, buying_price: 2100, discount: 5, stock_quantity: 4, min_stock: 2, delivery_time: "Same Day", total_sales: 18 },
    { shop_id: "s1", product_id: "mp20", selling_price: 2950, buying_price: 2150, discount: 3, stock_quantity: 3, min_stock: 2, delivery_time: "Same Day", total_sales: 12 },
];

// ───────────────────────────────────────────────────────────────
// DELIVERY PARTNERS — Mock logistics partners for last-mile delivery
// ───────────────────────────────────────────────────────────────
export const DELIVERY_PARTNERS = [
    { id: "dp1", name: "Dunzo Express", icon: "🏃", vehicle: "Bike", rating: 4.6, phone: "9100000001", avgTime: 45, pricePerKm: 12 },
    { id: "dp2", name: "Porter", icon: "🚛", vehicle: "Mini Truck", rating: 4.3, phone: "9100000002", avgTime: 60, pricePerKm: 18 },
    { id: "dp3", name: "Swiggy Genie", icon: "📦", vehicle: "Bike", rating: 4.5, phone: "9100000003", avgTime: 40, pricePerKm: 10 },
    { id: "dp4", name: "Shadowfax", icon: "⚡", vehicle: "Bike", rating: 4.4, phone: "9100000004", avgTime: 35, pricePerKm: 14 },
    { id: "dp5", name: "Borzo (WeFast)", icon: "🚀", vehicle: "Bike", rating: 4.2, phone: "9100000005", avgTime: 50, pricePerKm: 11 },
];

// ───────────────────────────────────────────────────────────────
// DELIVERY SLOTS — Time slot options for scheduled delivery
// ───────────────────────────────────────────────────────────────
export const DELIVERY_SLOTS = [
    { id: "express", label: "Express Delivery", desc: "Within 45 minutes", icon: "⚡", fee: 59, available: true },
    { id: "standard", label: "Standard Delivery", desc: "2–4 hours", icon: "🚚", fee: 29, available: true },
    { id: "morning", label: "Morning Slot", desc: "9:00 AM – 12:00 PM", icon: "🌅", fee: 19, available: true },
    { id: "afternoon", label: "Afternoon Slot", desc: "12:00 PM – 4:00 PM", icon: "☀️", fee: 19, available: true },
    { id: "evening", label: "Evening Slot", desc: "4:00 PM – 8:00 PM", icon: "🌆", fee: 19, available: true },
    { id: "free", label: "Economy (Free)", desc: "Next Day delivery", icon: "📬", fee: 0, available: true },
];
