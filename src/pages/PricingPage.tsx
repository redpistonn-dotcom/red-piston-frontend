import { T, FONT } from "../theme";

const TIERS = [
    {
        name: "Starter",
        price: "Free",
        period: "forever",
        icon: "🌱",
        color: T.t2,
        desc: "Perfect for new shops getting started with digital inventory.",
        features: [
            "Up to 50 products",
            "POS billing (Cash/UPI)",
            "Basic inventory tracking",
            "Stock alerts",
            "1 user login",
        ],
        notIncluded: [
            "Online marketplace listing",
            "GST reports",
            "Party ledgers (Udhaar)",
            "Multi-location support",
        ],
        cta: "Get Started Free",
        popular: false,
    },
    {
        name: "Professional",
        price: "₹1,499",
        period: "/month",
        icon: "🚀",
        color: T.amber,
        desc: "For growing shops that want online sales + full accounting.",
        features: [
            "Unlimited products",
            "Full POS + inventory",
            "Online marketplace listing",
            "GST reports & filing",
            "Party ledgers (Udhaar tracking)",
            "WhatsApp payment reminders",
            "5 user logins",
            "Priority support",
        ],
        notIncluded: [
            "Multi-location/godown",
            "Batch & expiry tracking",
            "Smart procurement (auto-POs)",
        ],
        cta: "Start 14-Day Free Trial",
        popular: true,
        commission: "2% per online sale",
    },
    {
        name: "Enterprise",
        price: "₹3,999",
        period: "/month",
        icon: "🏭",
        color: T.sky,
        desc: "For established businesses with multiple locations & high volume.",
        features: [
            "Everything in Professional",
            "Multi-location/godown support",
            "Batch & expiry tracking",
            "Smart procurement (auto-POs)",
            "Dead stock analytics",
            "Dedicated account manager",
            "API access",
            "Unlimited user logins",
            "Custom reports",
        ],
        notIncluded: [],
        cta: "Contact Sales",
        popular: false,
        commission: "1.5% per online sale (reduced)",
    },
];

const VALUE_PROPS = [
    { icon: "⏱️", title: "Save 2+ Hours/Day", desc: "Automated billing, stock tracking, and GST calculation replaces manual register work." },
    { icon: "💰", title: "Recover ₹2-5 Lakhs in Udhaar", desc: "Automated WhatsApp reminders recover 30% of stuck receivables on average." },
    { icon: "🌐", title: "New Online Revenue Channel", desc: "Reach customers beyond walk-in traffic. Get orders from vehicle owners searching for parts online." },
    { icon: "📊", title: "1-Click GST Filing", desc: "Auto-generated GST reports replace ₹5,000/month CA data entry fees." },
];

export function PricingPage({ onBack }) {
    return (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 20px" }}>
            {onBack && (
                <button onClick={onBack} style={{ background: "transparent", border: "none", color: T.t3, fontSize: 13, cursor: "pointer", marginBottom: 30 }}>← Back</button>
            )}

            {/* Hero */}
            <div style={{ textAlign: "center", marginBottom: 60 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: T.amber, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Pricing Plans</div>
                <h1 style={{ fontSize: 40, fontWeight: 900, color: T.t1, margin: "0 0 16px", lineHeight: 1.2 }}>
                    The Only Software Your<br />Auto Parts Shop Needs
                </h1>
                <p style={{ fontSize: 16, color: T.t2, maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>
                    Replace Tally, Vyapar, and your red diary with one platform. Manage inventory, billing, credit, and online sales — all in one place.
                </p>
            </div>

            {/* Pricing Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 80 }}>
                {TIERS.map(tier => (
                    <div
                        key={tier.name}
                        style={{
                            background: T.card,
                            border: `2px solid ${tier.popular ? tier.color : T.border}`,
                            borderRadius: 24,
                            padding: "36px 28px",
                            display: "flex",
                            flexDirection: "column",
                            position: "relative",
                            transition: "all 0.2s",
                            boxShadow: tier.popular ? `0 8px 40px ${tier.color}22` : "0 2px 8px rgba(0,0,0,0.15)",
                        }}
                        className="card-hover"
                    >
                        {tier.popular && (
                            <div style={{
                                position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                                background: tier.color, color: "#000", padding: "6px 20px", borderRadius: 99,
                                fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em",
                                boxShadow: `0 4px 16px ${tier.color}44`
                            }}>
                                Most Popular
                            </div>
                        )}

                        <div style={{ fontSize: 32, marginBottom: 12 }}>{tier.icon}</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: tier.color }}>{tier.name}</div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 4, margin: "12px 0" }}>
                            <span style={{ fontSize: 36, fontWeight: 900, color: T.t1, fontFamily: FONT.mono }}>{tier.price}</span>
                            <span style={{ fontSize: 14, color: T.t3 }}>{tier.period}</span>
                        </div>
                        <p style={{ fontSize: 13, color: T.t2, lineHeight: 1.5, marginBottom: 24 }}>{tier.desc}</p>

                        {tier.commission && (
                            <div style={{ background: `${tier.color}11`, border: `1px solid ${tier.color}33`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: tier.color, fontWeight: 700, marginBottom: 16 }}>
                                + {tier.commission}
                            </div>
                        )}

                        {/* Features */}
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                            {tier.features.map(f => (
                                <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: T.t1 }}>
                                    <span style={{ color: T.emerald, fontSize: 14, fontWeight: 900 }}>✓</span>
                                    <span>{f}</span>
                                </div>
                            ))}
                            {tier.notIncluded.map(f => (
                                <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: T.t4 }}>
                                    <span style={{ fontSize: 14 }}>✕</span>
                                    <span style={{ textDecoration: "line-through" }}>{f}</span>
                                </div>
                            ))}
                        </div>

                        {/* CTA */}
                        <button style={{
                            width: "100%",
                            background: tier.popular ? tier.color : "transparent",
                            color: tier.popular ? "#000" : tier.color,
                            border: tier.popular ? "none" : `2px solid ${tier.color}`,
                            borderRadius: 12,
                            padding: "14px",
                            fontSize: 14,
                            fontWeight: 900,
                            cursor: "pointer",
                            boxShadow: tier.popular ? `0 6px 24px ${tier.color}44` : "none",
                            transition: "all 0.15s"
                        }}>
                            {tier.cta}
                        </button>
                    </div>
                ))}
            </div>

            {/* Value Propositions */}
            <div style={{ marginBottom: 60 }}>
                <div style={{ textAlign: "center", marginBottom: 40 }}>
                    <h2 style={{ fontSize: 28, fontWeight: 900, color: T.t1, margin: "0 0 8px" }}>Why Shop Owners Pay For This</h2>
                    <p style={{ fontSize: 14, color: T.t3 }}>Real money saved, real revenue gained.</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
                    {VALUE_PROPS.map(vp => (
                        <div key={vp.title} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, textAlign: "center" }} className="card-hover">
                            <div style={{ fontSize: 36, marginBottom: 12 }}>{vp.icon}</div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: T.t1, marginBottom: 8 }}>{vp.title}</div>
                            <div style={{ fontSize: 13, color: T.t3, lineHeight: 1.5 }}>{vp.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* FAQ / Reassurance */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, padding: 40, textAlign: "center" }}>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: T.t1, margin: "0 0 8px" }}>🔒 Risk-Free Guarantee</h2>
                <p style={{ fontSize: 14, color: T.t2, lineHeight: 1.6, maxWidth: 600, margin: "0 auto" }}>
                    Start with a <strong>14-day free trial</strong> on any plan. No credit card required. Cancel anytime.
                    Your data is always yours — export everything with one click.
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: 40, marginTop: 28 }}>
                    {[
                        { icon: "🛡️", text: "No Lock-in" },
                        { icon: "💳", text: "No Card Needed" },
                        { icon: "📤", text: "Export Anytime" },
                        { icon: "📞", text: "WhatsApp Support" },
                    ].map(r => (
                        <div key={r.text} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.t2, fontWeight: 600 }}>
                            <span>{r.icon}</span> {r.text}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
