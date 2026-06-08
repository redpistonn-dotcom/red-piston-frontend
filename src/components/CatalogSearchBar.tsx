/**
 * CatalogSearchBar — real-time autocomplete connected to /api/catalog/lookup
 *
 * No auth required. Min 2 chars to trigger. Debounced 300ms via useDebounce.
 * On select/Enter → navigates to /marketplace?q=
 */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useDebounce } from '../utils/utils';

interface CatalogPart {
  masterPartId: number;
  partName: string;
  brand?: string;
  primaryOemNumber?: string;
  categoryL1?: string;
  imageUrl?: string;
}

interface Props {
  placeholder?: string;
  inputStyle?: React.CSSProperties;
  iconColor?: string;
  autoFocus?: boolean;
  onNavigate?: (query: string) => void;
}

export function CatalogSearchBar({
  placeholder = 'Search by Part Name, OEM Number, or Brand…',
  inputStyle,
  iconColor = '#8b716e',
  autoFocus,
  onNavigate,
}: Props) {
  const navigate    = useNavigate();
  const [query,     setQuery]   = useState('');
  const [open,      setOpen]    = useState(false);
  const [focused,   setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Debounce the query so we don't fire on every keystroke
  const debouncedQuery = useDebounce(query, 300);

  // TanStack Query — fires only when 2+ chars, result is cached per query string
  const { data, isFetching } = useQuery({
    queryKey: ['catalog-lookup', debouncedQuery],
    queryFn: () =>
      api.get<{ parts: CatalogPart[] }>(
        `/api/catalog/lookup?q=${encodeURIComponent(debouncedQuery.trim())}&limit=8`
      ),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 2 * 60 * 1000, // catalog data doesn't change every second
    select: (res) => res.parts || [],
  });

  const results: CatalogPart[] = data || [];

  // Show spinner as soon as the user types 2+ chars — don't wait for the debounce.
  // query !== debouncedQuery  → user typed, debounce pending (300ms gap)
  // isFetching                → debounce fired, fetch in flight
  const showSpinner =
    query.trim().length >= 2 && (query !== debouncedQuery || isFetching);

  // Show dropdown when we have results and the input is focused
  const showDropdown = open && focused && debouncedQuery.trim().length >= 2;

  const goTo = (q: string) => {
    setOpen(false);
    if (onNavigate) onNavigate(q);
    else navigate(`/marketplace?q=${encodeURIComponent(q)}`);
  };

  const handleChange = (v: string) => {
    setQuery(v);
    setOpen(true);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) goTo(query.trim());
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', flex: 1 }}
      onBlur={(e) => {
        // Close only if focus leaves the whole component
        if (!wrapRef.current?.contains(e.relatedTarget as Node)) {
          setFocused(false);
          setOpen(false);
        }
      }}
    >
      <div style={{ position: 'relative', width: '100%', height: 48, lineHeight: 0 }}>
        {/* Search icon — absolute so it floats inside without breaking layout */}
        <span className="material-symbols-outlined"
          style={{ position: 'absolute', left: 14, top: 14, fontSize: 20, color: iconColor, pointerEvents: 'none', zIndex: 1 }}>
          search
        </span>

        <input
          type="text"
          value={query}
          autoFocus={autoFocus}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => { setFocused(true); if (results.length > 0) setOpen(true); }}
          onKeyDown={handleKey}
          placeholder={placeholder}
          style={{
            width: '100%', height: 48,
            paddingLeft: 44, paddingRight: showSpinner ? 44 : 16,
            backgroundColor: '#f6f3f2',
            border: `1.5px solid ${focused ? '#8b1e1e' : '#dfbfbc'}`,
            borderRadius: 12, fontSize: 14, color: '#1c1b1b', outline: 'none',
            fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' as const,
            transition: 'border-color 0.15s',
            ...inputStyle,
          }}
        />

        {/* Loading spinner — shown instantly on keypress, not after debounce */}
        {showSpinner && (
          <span className="rp-spinner rp-spinner-md"
            style={{ position: 'absolute', right: 14, top: 15 }} />
        )}
      </div>

      {/* Dropdown — results */}
      {showDropdown && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9000,
          backgroundColor: '#fff', border: '1px solid #dfbfbc', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)', marginTop: 4, overflow: 'hidden',
        }}>
          {results.map((part, i) => (
            <div key={part.masterPartId}
              onMouseDown={() => goTo(part.partName)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', cursor: 'pointer',
                borderBottom: i < results.length - 1 ? '1px solid #f0eded' : 'none',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f6f3f2')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}
            >
              <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#f0eded', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {part.imageUrl
                  ? <img src={part.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 6 }} />
                  : <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#8b1e1e' }}>build</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1c1b1b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {part.partName}
                </div>
                <div style={{ fontSize: 12, color: '#8b716e', marginTop: 2 }}>
                  {[part.brand, part.primaryOemNumber, part.categoryL1].filter(Boolean).join(' · ')}
                </div>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#dfbfbc' }}>arrow_forward</span>
            </div>
          ))}

          {/* See all results */}
          <div
            onMouseDown={() => goTo(query)}
            style={{ padding: '10px 16px', backgroundColor: '#fcf9f8', borderTop: '1px solid #dfbfbc', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f0eded')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fcf9f8')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#8b1e1e' }}>manage_search</span>
            <span style={{ fontSize: 13, color: '#8b1e1e', fontWeight: 600 }}>See all results for "{query}"</span>
          </div>
        </div>
      )}

      {/* No results */}
      {showDropdown && !isFetching && results.length === 0 && debouncedQuery.trim().length >= 2 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9000,
          backgroundColor: '#fff', border: '1px solid #dfbfbc', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)', marginTop: 4, padding: '20px 16px',
          textAlign: 'center',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#dfbfbc', display: 'block', marginBottom: 8 }}>search_off</span>
          <p style={{ fontSize: 14, color: '#58413f', margin: 0 }}>No parts found for "<strong>{debouncedQuery}</strong>"</p>
          <p style={{ fontSize: 12, color: '#8b716e', marginTop: 4 }}>Try OEM number, brand name or part description</p>
        </div>
      )}

    </div>
  );
}
