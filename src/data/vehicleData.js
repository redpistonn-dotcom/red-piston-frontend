// ===== STRUCTURED VEHICLE DATABASE =====
// Tables: MANUFACTURERS → MODELS → Years (derived from model year ranges)
// NOT hardcoded in frontend components — imported as structured data.

// ─── MANUFACTURERS TABLE ───
export const MANUFACTURERS = [
    { id: "maruti", name: "Maruti Suzuki", country: "India/Japan", logo: "🔵" },
    { id: "hyundai", name: "Hyundai", country: "South Korea", logo: "🔷" },
    { id: "tata", name: "Tata", country: "India", logo: "🟦" },
    { id: "mahindra", name: "Mahindra", country: "India", logo: "🔴" },
    { id: "toyota", name: "Toyota", country: "Japan", logo: "🔶" },
    { id: "honda", name: "Honda", country: "Japan", logo: "⬜" },
    { id: "kia", name: "Kia", country: "South Korea", logo: "🟥" },
    { id: "mg", name: "MG", country: "UK/China", logo: "🟢" },
    { id: "skoda", name: "Skoda", country: "Czech", logo: "🟩" },
    { id: "vw", name: "Volkswagen", country: "Germany", logo: "🔵" },
    { id: "renault", name: "Renault", country: "France", logo: "🟡" },
    { id: "nissan", name: "Nissan", country: "Japan", logo: "⚪" },
    { id: "ford", name: "Ford", country: "USA", logo: "🔵" },
    { id: "chevrolet", name: "Chevrolet", country: "USA", logo: "🟡" },
    { id: "bmw", name: "BMW", country: "Germany", logo: "⬛" },
    { id: "mercedes", name: "Mercedes-Benz", country: "Germany", logo: "⬛" },
    { id: "audi", name: "Audi", country: "Germany", logo: "⬛" },
    { id: "jeep", name: "Jeep", country: "USA", logo: "🟤" },
    { id: "volvo", name: "Volvo", country: "Sweden", logo: "🔷" },
    { id: "isuzu", name: "Isuzu", country: "Japan", logo: "🔴" },
];

// ─── MODELS TABLE ───
// Each model has: id, manufacturerId, name, yearFrom, yearTo
export const MODELS = [
    // ── Maruti Suzuki ──
    { id: "swift", mfgId: "maruti", name: "Swift", yearFrom: 2005, yearTo: 2025 },
    { id: "dzire", mfgId: "maruti", name: "Dzire", yearFrom: 2008, yearTo: 2025 },
    { id: "baleno", mfgId: "maruti", name: "Baleno", yearFrom: 2015, yearTo: 2025 },
    { id: "wagonr", mfgId: "maruti", name: "Wagon R", yearFrom: 2010, yearTo: 2025 },
    { id: "alto", mfgId: "maruti", name: "Alto", yearFrom: 2000, yearTo: 2025 },
    { id: "altok10", mfgId: "maruti", name: "Alto K10", yearFrom: 2010, yearTo: 2025 },
    { id: "brezza", mfgId: "maruti", name: "Brezza", yearFrom: 2016, yearTo: 2025 },
    { id: "ertiga", mfgId: "maruti", name: "Ertiga", yearFrom: 2012, yearTo: 2025 },
    { id: "xl6", mfgId: "maruti", name: "XL6", yearFrom: 2019, yearTo: 2025 },
    { id: "ciaz", mfgId: "maruti", name: "Ciaz", yearFrom: 2014, yearTo: 2023 },
    { id: "ignis", mfgId: "maruti", name: "Ignis", yearFrom: 2017, yearTo: 2025 },
    { id: "celerio", mfgId: "maruti", name: "Celerio", yearFrom: 2014, yearTo: 2025 },
    { id: "scross", mfgId: "maruti", name: "S-Cross", yearFrom: 2015, yearTo: 2022 },
    { id: "eeco", mfgId: "maruti", name: "Eeco", yearFrom: 2010, yearTo: 2025 },
    { id: "grandvitara", mfgId: "maruti", name: "Grand Vitara", yearFrom: 2022, yearTo: 2025 },
    { id: "fronx", mfgId: "maruti", name: "Fronx", yearFrom: 2023, yearTo: 2025 },
    { id: "jimny", mfgId: "maruti", name: "Jimny", yearFrom: 2023, yearTo: 2025 },
    { id: "invicto", mfgId: "maruti", name: "Invicto", yearFrom: 2023, yearTo: 2025 },

    // ── Hyundai ──
    { id: "i20", mfgId: "hyundai", name: "i20", yearFrom: 2008, yearTo: 2025 },
    { id: "creta", mfgId: "hyundai", name: "Creta", yearFrom: 2015, yearTo: 2025 },
    { id: "venue", mfgId: "hyundai", name: "Venue", yearFrom: 2019, yearTo: 2025 },
    { id: "verna", mfgId: "hyundai", name: "Verna", yearFrom: 2006, yearTo: 2025 },
    { id: "i10", mfgId: "hyundai", name: "Grand i10 Nios", yearFrom: 2013, yearTo: 2025 },
    { id: "aura", mfgId: "hyundai", name: "Aura", yearFrom: 2020, yearTo: 2025 },
    { id: "tucson", mfgId: "hyundai", name: "Tucson", yearFrom: 2016, yearTo: 2025 },
    { id: "alcazar", mfgId: "hyundai", name: "Alcazar", yearFrom: 2021, yearTo: 2025 },
    { id: "exter", mfgId: "hyundai", name: "Exter", yearFrom: 2023, yearTo: 2025 },
    { id: "santro", mfgId: "hyundai", name: "Santro", yearFrom: 2003, yearTo: 2022 },
    { id: "xcent", mfgId: "hyundai", name: "Xcent", yearFrom: 2014, yearTo: 2020 },
    { id: "kona_ev", mfgId: "hyundai", name: "Kona EV", yearFrom: 2019, yearTo: 2024 },
    { id: "ioniq5", mfgId: "hyundai", name: "Ioniq 5", yearFrom: 2022, yearTo: 2025 },

    // ── Tata ──
    { id: "nexon", mfgId: "tata", name: "Nexon", yearFrom: 2017, yearTo: 2025 },
    { id: "punch", mfgId: "tata", name: "Punch", yearFrom: 2021, yearTo: 2025 },
    { id: "harrier", mfgId: "tata", name: "Harrier", yearFrom: 2019, yearTo: 2025 },
    { id: "safari", mfgId: "tata", name: "Safari", yearFrom: 2021, yearTo: 2025 },
    { id: "altroz", mfgId: "tata", name: "Altroz", yearFrom: 2020, yearTo: 2025 },
    { id: "tiago", mfgId: "tata", name: "Tiago", yearFrom: 2016, yearTo: 2025 },
    { id: "tigor", mfgId: "tata", name: "Tigor", yearFrom: 2017, yearTo: 2025 },
    { id: "nexon_ev", mfgId: "tata", name: "Nexon EV", yearFrom: 2020, yearTo: 2025 },
    { id: "tiago_ev", mfgId: "tata", name: "Tiago EV", yearFrom: 2022, yearTo: 2025 },
    { id: "curvv", mfgId: "tata", name: "Curvv", yearFrom: 2024, yearTo: 2025 },
    { id: "indica", mfgId: "tata", name: "Indica", yearFrom: 2008, yearTo: 2018 },

    // ── Mahindra ──
    { id: "thar", mfgId: "mahindra", name: "Thar", yearFrom: 2010, yearTo: 2025 },
    { id: "xuv700", mfgId: "mahindra", name: "XUV700", yearFrom: 2021, yearTo: 2025 },
    { id: "xuv300", mfgId: "mahindra", name: "XUV 3XO", yearFrom: 2019, yearTo: 2025 },
    { id: "scorpio", mfgId: "mahindra", name: "Scorpio N", yearFrom: 2022, yearTo: 2025 },
    { id: "scorpio_cl", mfgId: "mahindra", name: "Scorpio Classic", yearFrom: 2002, yearTo: 2025 },
    { id: "bolero", mfgId: "mahindra", name: "Bolero", yearFrom: 2001, yearTo: 2025 },
    { id: "xuv400", mfgId: "mahindra", name: "XUV400 EV", yearFrom: 2023, yearTo: 2025 },
    { id: "marazzo", mfgId: "mahindra", name: "Marazzo", yearFrom: 2018, yearTo: 2023 },
    { id: "xylo", mfgId: "mahindra", name: "Xylo", yearFrom: 2009, yearTo: 2019 },
    { id: "kuv100", mfgId: "mahindra", name: "KUV100", yearFrom: 2016, yearTo: 2021 },

    // ── Toyota ──
    { id: "innova", mfgId: "toyota", name: "Innova Crysta", yearFrom: 2005, yearTo: 2025 },
    { id: "innova_hycross", mfgId: "toyota", name: "Innova Hycross", yearFrom: 2023, yearTo: 2025 },
    { id: "fortuner", mfgId: "toyota", name: "Fortuner", yearFrom: 2009, yearTo: 2025 },
    { id: "glanza", mfgId: "toyota", name: "Glanza", yearFrom: 2019, yearTo: 2025 },
    { id: "urban_cruiser", mfgId: "toyota", name: "Urban Cruiser Hyryder", yearFrom: 2022, yearTo: 2025 },
    { id: "hilux", mfgId: "toyota", name: "Hilux", yearFrom: 2022, yearTo: 2025 },
    { id: "etios", mfgId: "toyota", name: "Etios", yearFrom: 2010, yearTo: 2022 },
    { id: "camry", mfgId: "toyota", name: "Camry", yearFrom: 2007, yearTo: 2025 },
    { id: "vellfire", mfgId: "toyota", name: "Vellfire", yearFrom: 2020, yearTo: 2025 },
    { id: "land_cruiser", mfgId: "toyota", name: "Land Cruiser", yearFrom: 2010, yearTo: 2025 },

    // ── Honda ──
    { id: "city", mfgId: "honda", name: "City", yearFrom: 2003, yearTo: 2025 },
    { id: "amaze", mfgId: "honda", name: "Amaze", yearFrom: 2013, yearTo: 2025 },
    { id: "elevate", mfgId: "honda", name: "Elevate", yearFrom: 2023, yearTo: 2025 },
    { id: "wrv", mfgId: "honda", name: "WR-V", yearFrom: 2017, yearTo: 2023 },
    { id: "jazz", mfgId: "honda", name: "Jazz", yearFrom: 2009, yearTo: 2023 },
    { id: "civic", mfgId: "honda", name: "Civic", yearFrom: 2006, yearTo: 2020 },
    { id: "crv", mfgId: "honda", name: "CR-V", yearFrom: 2004, yearTo: 2023 },
    { id: "brv", mfgId: "honda", name: "BR-V", yearFrom: 2016, yearTo: 2022 },

    // ── Kia ──
    { id: "seltos", mfgId: "kia", name: "Seltos", yearFrom: 2019, yearTo: 2025 },
    { id: "sonet", mfgId: "kia", name: "Sonet", yearFrom: 2020, yearTo: 2025 },
    { id: "carens", mfgId: "kia", name: "Carens", yearFrom: 2022, yearTo: 2025 },
    { id: "ev6", mfgId: "kia", name: "EV6", yearFrom: 2022, yearTo: 2025 },
    { id: "carnival", mfgId: "kia", name: "Carnival", yearFrom: 2020, yearTo: 2025 },
    { id: "ev9", mfgId: "kia", name: "EV9", yearFrom: 2024, yearTo: 2025 },

    // ── MG ──
    { id: "hector", mfgId: "mg", name: "Hector", yearFrom: 2019, yearTo: 2025 },
    { id: "astor", mfgId: "mg", name: "Astor", yearFrom: 2021, yearTo: 2025 },
    { id: "zsev", mfgId: "mg", name: "ZS EV", yearFrom: 2020, yearTo: 2025 },
    { id: "gloster", mfgId: "mg", name: "Gloster", yearFrom: 2020, yearTo: 2025 },
    { id: "comet", mfgId: "mg", name: "Comet EV", yearFrom: 2023, yearTo: 2025 },
    { id: "hector_plus", mfgId: "mg", name: "Hector Plus", yearFrom: 2020, yearTo: 2025 },

    // ── Skoda ──
    { id: "kushaq", mfgId: "skoda", name: "Kushaq", yearFrom: 2021, yearTo: 2025 },
    { id: "slavia", mfgId: "skoda", name: "Slavia", yearFrom: 2022, yearTo: 2025 },
    { id: "superb", mfgId: "skoda", name: "Superb", yearFrom: 2009, yearTo: 2023 },
    { id: "rapid", mfgId: "skoda", name: "Rapid", yearFrom: 2011, yearTo: 2022 },
    { id: "octavia", mfgId: "skoda", name: "Octavia", yearFrom: 2005, yearTo: 2025 },
    { id: "kodiaq", mfgId: "skoda", name: "Kodiaq", yearFrom: 2017, yearTo: 2025 },

    // ── Volkswagen ──
    { id: "taigun", mfgId: "vw", name: "Taigun", yearFrom: 2021, yearTo: 2025 },
    { id: "virtus", mfgId: "vw", name: "Virtus", yearFrom: 2022, yearTo: 2025 },
    { id: "polo", mfgId: "vw", name: "Polo", yearFrom: 2010, yearTo: 2022 },
    { id: "vento", mfgId: "vw", name: "Vento", yearFrom: 2010, yearTo: 2022 },
    { id: "tiguan", mfgId: "vw", name: "Tiguan", yearFrom: 2017, yearTo: 2025 },

    // ── Renault ──
    { id: "kwid", mfgId: "renault", name: "Kwid", yearFrom: 2015, yearTo: 2025 },
    { id: "triber", mfgId: "renault", name: "Triber", yearFrom: 2019, yearTo: 2025 },
    { id: "kiger", mfgId: "renault", name: "Kiger", yearFrom: 2021, yearTo: 2025 },
    { id: "duster", mfgId: "renault", name: "Duster", yearFrom: 2012, yearTo: 2022 },

    // ── Nissan ──
    { id: "magnite", mfgId: "nissan", name: "Magnite", yearFrom: 2020, yearTo: 2025 },
    { id: "kicks", mfgId: "nissan", name: "Kicks", yearFrom: 2019, yearTo: 2022 },
    { id: "xtrail", mfgId: "nissan", name: "X-Trail", yearFrom: 2024, yearTo: 2025 },

    // ── Ford (discontinued in India but parts still sold) ──
    { id: "ecosport", mfgId: "ford", name: "EcoSport", yearFrom: 2013, yearTo: 2022 },
    { id: "endeavour", mfgId: "ford", name: "Endeavour", yearFrom: 2008, yearTo: 2022 },
    { id: "figo", mfgId: "ford", name: "Figo", yearFrom: 2010, yearTo: 2021 },
    { id: "aspire", mfgId: "ford", name: "Aspire", yearFrom: 2015, yearTo: 2021 },

    // ── Chevrolet (discontinued in India but parts still sold) ──
    { id: "beat", mfgId: "chevrolet", name: "Beat", yearFrom: 2010, yearTo: 2019 },
    { id: "cruze", mfgId: "chevrolet", name: "Cruze", yearFrom: 2009, yearTo: 2017 },
    { id: "enjoy", mfgId: "chevrolet", name: "Enjoy", yearFrom: 2013, yearTo: 2017 },
    { id: "tavera", mfgId: "chevrolet", name: "Tavera", yearFrom: 2004, yearTo: 2017 },

    // ── BMW ──
    { id: "3series", mfgId: "bmw", name: "3 Series", yearFrom: 2010, yearTo: 2025 },
    { id: "5series", mfgId: "bmw", name: "5 Series", yearFrom: 2010, yearTo: 2025 },
    { id: "x1", mfgId: "bmw", name: "X1", yearFrom: 2013, yearTo: 2025 },
    { id: "x3", mfgId: "bmw", name: "X3", yearFrom: 2011, yearTo: 2025 },
    { id: "x5", mfgId: "bmw", name: "X5", yearFrom: 2010, yearTo: 2025 },
    { id: "2series", mfgId: "bmw", name: "2 Series GC", yearFrom: 2020, yearTo: 2025 },

    // ── Mercedes-Benz ──
    { id: "aclass", mfgId: "mercedes", name: "A-Class", yearFrom: 2015, yearTo: 2025 },
    { id: "cclass", mfgId: "mercedes", name: "C-Class", yearFrom: 2010, yearTo: 2025 },
    { id: "eclass", mfgId: "mercedes", name: "E-Class", yearFrom: 2010, yearTo: 2025 },
    { id: "gle", mfgId: "mercedes", name: "GLE", yearFrom: 2015, yearTo: 2025 },
    { id: "glc", mfgId: "mercedes", name: "GLC", yearFrom: 2016, yearTo: 2025 },
    { id: "gla", mfgId: "mercedes", name: "GLA", yearFrom: 2014, yearTo: 2025 },
    { id: "glb", mfgId: "mercedes", name: "GLB", yearFrom: 2022, yearTo: 2025 },

    // ── Audi ──
    { id: "a4", mfgId: "audi", name: "A4", yearFrom: 2008, yearTo: 2025 },
    { id: "a6", mfgId: "audi", name: "A6", yearFrom: 2008, yearTo: 2025 },
    { id: "q3", mfgId: "audi", name: "Q3", yearFrom: 2012, yearTo: 2025 },
    { id: "q5", mfgId: "audi", name: "Q5", yearFrom: 2013, yearTo: 2025 },
    { id: "q7", mfgId: "audi", name: "Q7", yearFrom: 2007, yearTo: 2025 },
    { id: "a3", mfgId: "audi", name: "A3", yearFrom: 2014, yearTo: 2025 },

    // ── Jeep ──
    { id: "compass", mfgId: "jeep", name: "Compass", yearFrom: 2017, yearTo: 2025 },
    { id: "meridian", mfgId: "jeep", name: "Meridian", yearFrom: 2022, yearTo: 2025 },
    { id: "wrangler", mfgId: "jeep", name: "Wrangler", yearFrom: 2016, yearTo: 2025 },
    { id: "grand_cherokee", mfgId: "jeep", name: "Grand Cherokee", yearFrom: 2022, yearTo: 2025 },

    // ── Volvo ──
    { id: "xc40", mfgId: "volvo", name: "XC40", yearFrom: 2018, yearTo: 2025 },
    { id: "xc60", mfgId: "volvo", name: "XC60", yearFrom: 2013, yearTo: 2025 },
    { id: "xc90", mfgId: "volvo", name: "XC90", yearFrom: 2007, yearTo: 2025 },
    { id: "s60", mfgId: "volvo", name: "S60", yearFrom: 2015, yearTo: 2025 },
    { id: "s90", mfgId: "volvo", name: "S90", yearFrom: 2016, yearTo: 2025 },

    // ── Isuzu ──
    { id: "dmax", mfgId: "isuzu", name: "D-Max V-Cross", yearFrom: 2016, yearTo: 2025 },
    { id: "mu_x", mfgId: "isuzu", name: "mu-X", yearFrom: 2017, yearTo: 2025 },
    { id: "dmax_rt", mfgId: "isuzu", name: "D-Max Regular", yearFrom: 2014, yearTo: 2025 },
];

// ─── VARIANTS TABLE ───
// Maps modelId → array of variant/trim names (Indian market)
export const VARIANTS = {
    // ── Maruti Suzuki ──
    swift: ["LXI", "VXI", "VXI (O)", "ZXI", "ZXI (O)", "ZXI+", "ZXI+ Dual Tone"],
    dzire: ["LXI", "VXI", "VXI (O)", "ZXI", "ZXI (O)", "ZXI+", "ZXI+ Dual Tone"],
    baleno: ["Sigma", "Delta", "Zeta", "Alpha", "Alpha Dual Tone"],
    wagonr: ["LXI", "VXI", "VXI (O)", "ZXI", "ZXI (O)", "ZXI+ AGS"],
    alto: ["STD", "LXI", "VXI", "VXI+", "VXI+ AGS"],
    altok10: ["STD", "LXI", "VXI", "VXI (O)", "VXI+ AGS"],
    brezza: ["LXI", "VXI", "VXI (O)", "ZXI", "ZXI (O)", "ZXI+", "ZXI+ AT", "ZXI+ Dual Tone"],
    ertiga: ["LXI", "VXI", "VXI (O)", "ZXI", "ZXI (O)", "ZXI+", "ZXI+ AT"],
    xl6: ["Zeta", "Zeta AT", "Alpha", "Alpha AT", "Alpha+ AT"],
    ciaz: ["Sigma", "Delta", "Zeta", "Alpha", "Alpha AT"],
    ignis: ["Sigma", "Delta", "Zeta", "Alpha", "Alpha Dual Tone"],
    celerio: ["LXI", "VXI", "VXI (O)", "ZXI", "ZXI (O)", "ZXI+ AGS"],
    scross: ["Sigma", "Delta", "Zeta", "Alpha"],
    eeco: ["STD 5-Seater", "STD 7-Seater", "AC 5-Seater", "AC 7-Seater", "Cargo"],
    grandvitara: ["Sigma", "Delta", "Zeta", "Zeta+", "Alpha", "Alpha+", "Alpha+ Dual Tone"],
    fronx: ["Sigma", "Delta", "Delta+", "Zeta", "Zeta+", "Alpha", "Alpha Dual Tone"],
    jimny: ["Zeta", "Zeta AT", "Alpha", "Alpha AT", "Alpha Dual Tone"],
    invicto: ["Zeta", "Zeta+", "Alpha", "Alpha+"],

    // ── Hyundai ──
    i20: ["Magna", "Sportz", "Sportz (O)", "Asta", "Asta (O)", "Asta Dual Tone", "N Line N6", "N Line N8", "N Line N8 DCT"],
    creta: ["E", "EX", "S", "S+", "SX", "SX (O)", "SX Tech", "Knight Edition"],
    venue: ["E", "S", "S+", "S (O)", "SX", "SX (O)", "SX+ DCT", "N Line N6", "N Line N8"],
    verna: ["EX", "S", "S+", "SX", "SX (O)", "SX Tech", "SX (O) Turbo DCT"],
    i10: ["Era", "Magna", "Sportz", "Sportz Dual Tone", "Asta", "Asta AMT"],
    aura: ["E", "S", "S CNG", "SX", "SX+ AMT"],
    tucson: ["Platinum", "Platinum AT", "Signature", "Signature AT", "Signature Dual Tone"],
    alcazar: ["Prestige", "Prestige (O)", "Platinum", "Platinum (O)", "Signature", "Signature (O)"],
    exter: ["EX", "S", "S+", "SX", "SX (O)", "SX Connect", "SX+ AMT", "Knight Edition"],
    santro: ["Era", "Magna", "Sportz", "Sportz AMT", "Asta"],
    xcent: ["E", "S", "SX", "SX (O)", "SX AT"],
    kona_ev: ["Premium", "Premium Dual Tone"],
    ioniq5: ["Standard", "Long Range", "Long Range AWD"],

    // ── Tata ──
    nexon: ["Smart", "Smart+", "Smart+ S", "Pure", "Pure S", "Creative", "Creative+", "Creative+ S", "Fearless", "Fearless+", "Fearless+ S"],
    punch: ["Pure", "Adventure", "Adventure Rhythm", "Accomplished", "Accomplished Dazzle", "Creative", "Creative i-RA"],
    harrier: ["Smart", "Pure", "Pure+", "Adventure", "Adventure+", "Fearless", "Fearless+"],
    safari: ["Smart", "Pure", "Pure+", "Adventure", "Adventure+", "Accomplished", "Accomplished+"],
    altroz: ["XE", "XE+", "XM", "XM+", "XZ", "XZ+", "XZ+ Luxe", "XZ (O)", "i-Turbo XZ+"],
    tiago: ["XE", "XM", "XM+", "XT", "XZ", "XZ+", "XZ+ Dual Tone", "NRG"],
    tigor: ["XE", "XM", "XM+", "XZ", "XZ+", "XZ+ Dual Tone"],
    nexon_ev: ["Creative", "Creative+", "Fearless", "Fearless+", "Fearless+ LR", "Empowered", "Empowered+", "Empowered+ LR"],
    tiago_ev: ["XE", "XT", "XZ+", "XZ+ LR", "XZ+ Tech Lux"],
    curvv: ["Smart", "Pure", "Pure+", "Creative", "Creative+", "Accomplished", "Accomplished+", "Accomplished+ A"],
    indica: ["LE", "LS", "LX", "DLS", "DLX", "GLS", "GLX"],

    // ── Mahindra ──
    thar: ["AX (O) STD", "AX (O)", "LX", "LX Hard Top", "LX AT", "LX Diesel AT"],
    xuv700: ["MX", "AX3", "AX3 (O)", "AX5", "AX5 (O)", "AX5 L", "AX7", "AX7 L", "AX7 L AWD"],
    xuv300: ["MX1", "MX2", "MX2 (O)", "MX3", "MX3 (O)", "MX3 L"],
    scorpio: ["Z4", "Z6", "Z8", "Z8 L", "Z8 L Diesel AT", "Z8 L 4x4"],
    scorpio_cl: ["S3", "S5", "S7", "S9", "S11"],
    bolero: ["B2", "B4", "B6", "B6 (O)", "B6 Opt", "Neo"],
    xuv400: ["EC Pro", "EL Pro", "EL Pro L"],
    marazzo: ["M2", "M4", "M6", "M6+", "M8"],
    xylo: ["D2", "D2 BS-IV", "D4", "E4", "E6", "E8", "E9"],
    kuv100: ["K2", "K2+", "K4+", "K6+", "K8"],

    // ── Toyota ──
    innova: ["G", "GX", "VX", "ZX", "ZX AT", "Touring Sport"],
    innova_hycross: ["G", "GX", "VX", "ZX", "ZX (O)"],
    fortuner: ["4x2 MT", "4x2 AT", "4x4 MT", "4x4 AT", "Legender 4x2 AT", "Legender 4x4 AT"],
    glanza: ["E", "S", "S AMT", "G", "G AMT"],
    urban_cruiser: ["E", "S", "S+", "G", "V"],
    hilux: ["STD MT", "High MT", "High AT", "4x4 MT", "4x4 AT"],
    etios: ["J", "G", "G SP", "V", "VX", "VXD", "GD", "GD SP"],
    camry: ["Hybrid"],
    vellfire: ["Executive Lounge", "HV Executive Lounge"],
    land_cruiser: ["LC300 GX-R", "LC300 VX-R", "LC300 ZX"],

    // ── Honda ──
    city: ["V", "V MT", "VX", "VX MT", "ZX", "ZX MT", "e:HEV V", "e:HEV VX", "e:HEV ZX"],
    amaze: ["E", "E MT", "S", "S MT", "VX", "VX CVT"],
    elevate: ["SV", "V", "VX", "ZX"],
    wrv: ["S", "V", "VX", "Edge Edition"],
    jazz: ["S", "SV", "V", "VX"],
    civic: ["V", "V CVT", "VX", "VX CVT", "ZX CVT"],
    crv: ["2WD", "2WD AT", "AWD", "AWD AT"],
    brv: ["S MT", "S CVT", "V MT", "V CVT", "VX CVT"],

    // ── Kia ──
    seltos: ["HTE", "HTK", "HTK+", "HTX", "HTX+", "GTX", "GTX+", "GTX+ AT", "X-Line"],
    sonet: ["HTE", "HTK", "HTK+", "HTX", "HTX+", "GTX", "GTX+", "GTX+ AT"],
    carens: ["Premium", "Prestige", "Prestige+", "Luxury", "Luxury+"],
    ev6: ["GT Line RWD", "GT Line AWD", "GT AWD"],
    carnival: ["Premium 7-Seater", "Premium 8-Seater", "Prestige", "Limousine", "Limousine+"],
    ev9: ["GT Line", "GT Line AWD"],

    // ── MG ──
    hector: ["Style", "Super", "Smart", "Sharp", "Sharp Pro", "Savvy", "Savvy Pro"],
    astor: ["Style", "Super", "Smart", "Sharp", "Sharp Pro", "Savvy"],
    zsev: ["Excite", "Excite Pro", "Exclusive", "Exclusive Pro"],
    gloster: ["Super", "Smart", "Sharp", "Savvy"],
    comet: ["Pace", "Play"],
    hector_plus: ["Style", "Super", "Smart", "Sharp", "Sharp Pro", "Savvy"],

    // ── Skoda ──
    kushaq: ["Active", "Ambition", "Style", "Style AT", "Monte Carlo", "Monte Carlo AT"],
    slavia: ["Active", "Ambition", "Style", "Style AT", "Monte Carlo", "Monte Carlo AT"],
    superb: ["Ambition", "Style", "Sportline", "L&K"],
    rapid: ["Rider", "Rider+", "Ambition", "Style", "Monte Carlo"],
    octavia: ["Style", "Style AT", "L&K", "L&K AT", "RS"],
    kodiaq: ["Style", "Style AT", "Sportline", "L&K"],

    // ── Volkswagen ──
    taigun: ["Comfortline", "Highline", "Highline AT", "Topline", "Topline AT", "GT", "GT AT"],
    virtus: ["Comfortline", "Highline", "Highline AT", "Topline", "Topline AT", "GT", "GT+ DSG"],
    polo: ["Trendline", "Comfortline", "Highline", "Highline+", "GT TSI"],
    vento: ["Trendline", "Comfortline", "Highline", "Highline+"],
    tiguan: ["Elegance", "Elegance AT", "Exclusive Edition"],

    // ── Renault ──
    kwid: ["RXE", "RXL", "RXT", "RXT (O)", "Climber", "Climber AMT"],
    triber: ["RXE", "RXL", "RXT", "RXZ", "RXZ AMT", "RXZ Dual Tone"],
    kiger: ["RXE", "RXL", "RXT", "RXT (O)", "RXZ", "RXZ AMT", "RXZ Turbo"],
    duster: ["RXE", "RXS", "RXS (O)", "RXZ", "RXZ AWD"],

    // ── Nissan ──
    magnite: ["XE", "XL", "XV", "XV Premium", "XV Premium (O)", "XV Premium AMT"],
    kicks: ["XE", "XL", "XV", "XV Pre", "XV Pre (O)"],
    xtrail: ["X-Tremer", "X-Tremer e-POWER"],

    // ── Ford ──
    ecosport: ["Ambiente", "Trend", "Trend+", "Titanium", "Titanium+", "S", "Thunder"],
    endeavour: ["Trend", "Titanium", "Titanium+", "Sport"],
    figo: ["Ambiente", "Trend", "Titanium", "Titanium Blu", "Titanium+"],
    aspire: ["Ambiente", "Trend", "Trend+", "Titanium", "Titanium+"],

    // ── Chevrolet ──
    beat: ["PS", "LS", "LT", "LTZ"],
    cruze: ["LS", "LT", "LTZ", "LTZ AT"],
    enjoy: ["LS 7-Seater", "LS 8-Seater", "LT 7-Seater", "LTZ 7-Seater"],
    tavera: ["LS 7-Seater", "LS 9-Seater", "LT L 7-Seater", "LT L 9-Seater"],

    // ── BMW ──
    "3series": ["320i Sport", "320d Sport", "320d Luxury", "320Ld Luxury", "330i Sport", "330i M Sport", "M340i"],
    "5series": ["520d Luxury", "520d M Sport", "530d M Sport", "530i Sport", "530i M Sport"],
    x1: ["sDrive18i", "sDrive18d", "sDrive20d", "sDrive20d M Sport", "xDrive20d"],
    x3: ["xDrive20d Luxury", "xDrive20d M Sport", "xDrive30d M Sport", "M40i"],
    x5: ["xDrive30d", "xDrive30d M Sport", "xDrive40i M Sport", "M50i"],
    "2series": ["220i Sport", "220i M Sport", "220d Sport", "220d M Sport"],

    // ── Mercedes-Benz ──
    aclass: ["A 200", "A 200d", "A 35 AMG", "A 45 S AMG"],
    cclass: ["C 200", "C 200d", "C 220d", "C 300d", "C 300d AMG Line", "C 43 AMG"],
    eclass: ["E 200", "E 200d", "E 220d", "E 350d", "E 350d AMG Line", "E 53 AMG"],
    gle: ["GLE 300d", "GLE 300d 4MATIC", "GLE 450 4MATIC", "AMG GLE 53 4MATIC+"],
    glc: ["GLC 200", "GLC 220d", "GLC 220d 4MATIC", "GLC 300 4MATIC", "AMG GLC 43 4MATIC"],
    gla: ["GLA 200", "GLA 200d", "GLA 220d 4MATIC", "AMG GLA 35 4MATIC"],
    glb: ["GLB 200", "GLB 220d", "GLB 220d 4MATIC"],

    // ── Audi ──
    a4: ["Premium", "Premium Plus", "Technology", "S Line"],
    a6: ["Premium Plus", "Technology", "Technology (O)"],
    q3: ["Premium Plus", "Technology", "Sportback"],
    q5: ["Premium Plus", "Technology"],
    q7: ["Premium Plus", "Technology", "Bold Edition"],
    a3: ["Premium Plus", "Technology", "35 TFSI"],

    // ── Jeep ──
    compass: ["Sport", "Longitude", "Longitude+", "Limited", "Limited (O)", "Model S", "Trailhawk"],
    meridian: ["Limited", "Limited (O)", "Overland"],
    wrangler: ["Sport", "Sahara", "Rubicon"],
    grand_cherokee: ["Limited", "Overland", "Summit Reserve", "Trailhawk"],

    // ── Volvo ──
    xc40: ["B4 Momentum", "B4 Inscription", "B4 R-Design", "B4 Ultimate", "Recharge Pure Electric"],
    xc60: ["B5 Momentum", "B5 Inscription", "B5 R-Design", "B6 Inscription", "B6 R-Design"],
    xc90: ["B5 Momentum", "B5 Inscription", "B6 Inscription", "B6 R-Design"],
    s60: ["B3 Momentum", "B4 Inscription", "B4 R-Design", "T8 Inscription"],
    s90: ["B5 Momentum", "B5 Inscription", "B6 Inscription", "T8 Inscription"],

    // ── Isuzu ──
    dmax: ["Hi-Lander MT", "Hi-Lander AT", "Z Prestige MT", "Z Prestige AT"],
    mu_x: ["4x2 MT", "4x2 AT", "4x4 AT"],
    dmax_rt: ["Cab Chassis", "Standard", "High Ride"],
};

// ─── UTILITY: Get variants for a model ───
export function getVariantsForModel(modelId) {
    return VARIANTS[modelId] || [];
}

// ─── UTILITY: Get years for a model ───
export function getYearsForModel(modelId) {
    const model = MODELS.find(m => m.id === modelId);
    if (!model) return [];
    const years = [];
    for (let y = model.yearTo; y >= model.yearFrom; y--) {
        years.push(y);
    }
    return years;
}

// ─── UTILITY: Get models for a manufacturer ───
export function getModelsForMfg(mfgId) {
    return MODELS.filter(m => m.mfgId === mfgId).sort((a, b) => a.name.localeCompare(b.name));
}

// ─── UTILITY: Build a match string from selection ───
export function buildVehicleMatchStr(mfgId, modelId) {
    const mfg = MANUFACTURERS.find(m => m.id === mfgId);
    const model = MODELS.find(m => m.id === modelId);
    if (!mfg || !model) return null;
    return `${mfg.name} ${model.name}`;
}

// ─── UTILITY: Check if product is compatible with vehicle ───
export function isProductCompatible(product, matchStr) {
    if (!product.compatibleVehicles || product.compatibleVehicles.length === 0) return false;
    // Universal products are always compatible
    if (product.compatibleVehicles.some(v => v.toLowerCase() === "universal")) return "universal";
    // Check for exact or partial match
    if (product.compatibleVehicles.some(v => v.toLowerCase().includes(matchStr.toLowerCase()))) return "compatible";
    return false;
}
