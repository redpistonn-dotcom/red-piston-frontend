/**
 * PublicHeader — unified sticky header for all public pages
 * (Home / Marketplace / Suppliers).
 *
 * Desktop: logo + nav + search bar + rightSlot (72px)
 * Mobile:  logo + hamburger → slide-down drawer with nav + search + rightSlot
 */
import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CatalogSearchBar } from './CatalogSearchBar';

const LOGO =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAHoRqueT7rYQ9UU0uaqdoukDlx38GMecl-iaxA_YPsKta4MkYIh1zNn8Cq0sPsr7M4RgQ_U9qftq7c7PW05n3PYedVKG1_Cpvw5_kyltJtcea9-H5bNgTqs1NRGHFnhX112m_HSJaZ_F722rFQmkTxVmCCp4R5IZWlInV5SCBfQPTQHPO3YJFw6En0MQgRNEFl44PmMZH8bZyTjh0btvYW3gM2r1JgFZvpQS67UpJr1SYz_N81ByrPkXv3k89WFF_7n0z5A0S4BE4';

const NAV_LINKS = [
  { label: 'Home',        href: '/'            },
  { label: 'Marketplace', href: '/marketplace' },
  { label: 'Suppliers',   href: '/suppliers'   },
];

interface PublicHeaderProps {
  /** Page-specific buttons rendered to the right of the search bar */
  rightSlot?: ReactNode;
  /** Override the search placeholder text */
  searchPlaceholder?: string;
}

export function PublicHeader({
  rightSlot,
  searchPlaceholder = 'Search parts by name, OEM number, or brand…',
}: PublicHeaderProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const linkStyle = (active: boolean): React.CSSProperties => ({
    color: active ? '#8b1e1e' : '#58413f',
    fontWeight: active ? 700 : 500,
    fontSize: 14,
    textDecoration: 'none',
    borderBottom: active ? '2px solid #8b1e1e' : '2px solid transparent',
    paddingBottom: 4,
    transition: 'color 0.15s, border-color 0.15s',
    whiteSpace: 'nowrap',
  });

  return (
    <header
      style={{
        backgroundColor: '#fff',
        borderBottom: '1px solid #dfbfbc',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        width: '100%',
      }}
    >
      {/* ── Main header bar ─────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          minHeight: 64,
          gap: 16,
        }}
      >
        {/* Logo */}
        <img
          src={LOGO}
          alt="RedPiston"
          onClick={() => { navigate('/'); setMobileOpen(false); }}
          style={{ height: 36, width: 'auto', objectFit: 'contain', cursor: 'pointer', flexShrink: 0 }}
        />

        {/* Desktop Nav — hidden on mobile via .ph-nav class */}
        <nav className="ph-nav" style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
          {NAV_LINKS.map(({ label, href }) => {
            const active = pathname === href;
            return (
              <a
                key={label}
                href={href}
                onClick={e => { e.preventDefault(); navigate(href); }}
                style={linkStyle(active)}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.color = '#8b1e1e';
                    e.currentTarget.style.borderBottomColor = 'rgba(139,30,30,0.3)';
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.color = '#58413f';
                    e.currentTarget.style.borderBottomColor = 'transparent';
                  }
                }}
              >
                {label}
              </a>
            );
          })}
        </nav>

        {/* Search bar — hidden on mobile via .ph-search class */}
        <div className="ph-search" style={{ flex: 1, maxWidth: 600, minWidth: 0 }}>
          <CatalogSearchBar placeholder={searchPlaceholder} />
        </div>

        {/* Right slot — hidden on mobile via .ph-right class */}
        {rightSlot && (
          <div className="ph-right" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {rightSlot}
          </div>
        )}

        {/* Hamburger — shown only on mobile via .ph-hamburger class */}
        <button
          className="ph-hamburger"
          onClick={() => setMobileOpen(o => !o)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          style={{
            display: 'none', // overridden by CSS on mobile
            marginLeft: 'auto',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            flexShrink: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderRadius: 8,
            color: '#58413f',
          }}
        >
          {/* 3-line / X icon */}
          {mobileOpen ? (
            <span className="material-symbols-outlined" style={{ fontSize: 26 }}>close</span>
          ) : (
            <span className="material-symbols-outlined" style={{ fontSize: 26 }}>menu</span>
          )}
        </button>
      </div>

      {/* ── Mobile Drawer ───────────────────────────────────────────── */}
      <div className={`ph-mobile-drawer${mobileOpen ? ' ph-open' : ''}`}>
        {/* Nav links stacked */}
        <div style={{ borderBottom: '1px solid #f0eded', padding: '8px 0' }}>
          {NAV_LINKS.map(({ label, href }) => {
            const active = pathname === href;
            return (
              <a
                key={label}
                href={href}
                onClick={e => { e.preventDefault(); navigate(href); setMobileOpen(false); }}
                style={{
                  display: 'block',
                  padding: '13px 20px',
                  color: active ? '#8b1e1e' : '#1c1b1b',
                  fontWeight: active ? 700 : 500,
                  fontSize: 15,
                  textDecoration: 'none',
                  backgroundColor: active ? 'rgba(139,30,30,0.05)' : 'transparent',
                  borderLeft: active ? '3px solid #8b1e1e' : '3px solid transparent',
                  transition: 'background 0.1s',
                }}
              >
                {label}
              </a>
            );
          })}
        </div>

        {/* Search bar in drawer */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0eded' }}>
          <CatalogSearchBar
            placeholder={searchPlaceholder}
            onNavigate={q => { navigate(`/marketplace?q=${encodeURIComponent(q)}`); setMobileOpen(false); }}
          />
        </div>

        {/* Right slot in drawer */}
        {rightSlot && (
          <div style={{ padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {rightSlot}
          </div>
        )}
      </div>
    </header>
  );
}
