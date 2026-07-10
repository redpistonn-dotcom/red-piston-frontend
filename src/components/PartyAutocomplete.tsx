import { useState, useEffect, useRef } from 'react';
import { getParties, createParty } from '../api/parties';
import { T, FONT } from '../theme';

interface Party {
  id?: number;
  partyId?: number;
  name: string;
  phone?: string;
  gstin?: string;
  address?: string;
  shopVehicles?: { registrationNumber?: string | null }[];
}

export interface PartySelection {
  partyId: number | null;
  name: string;
  phone: string;
  gstin: string;
  address: string;
  vehicleReg: string;
}

interface Props {
  value: string;
  onChange: (name: string) => void;
  onSelect: (p: PartySelection) => void;
  /** Party type to search/create against. Defaults to CUSTOMER. */
  type?: 'CUSTOMER' | 'SUPPLIER' | 'BOTH';
  placeholder?: string;
  error?: boolean;
  inputStyle?: React.CSSProperties;
  toast?: (msg: string, type?: string) => void;
}

/**
 * Party (customer/supplier) name field with autocomplete — select an existing
 * party or create one inline. Unlike SupplierAutocomplete, this always resolves
 * a real partyId via onSelect, since callers need it to link a sale/return/
 * credit note to a traceable customer rather than a free-text name.
 *
 * - Lazy-loads parties of `type` on first focus, opens the dropdown even with
 *   zero results or an empty query (an empty dropdown reads as "broken"
 *   otherwise).
 * - Selecting a row calls onSelect({ partyId, name, phone, gstin }).
 * - No exact match + non-empty query shows "＋ Add as new customer/supplier",
 *   which creates the Party via POST /api/shop/parties then selects it.
 */
export function PartyAutocomplete({
  value,
  onChange,
  onSelect,
  type = 'CUSTOMER',
  placeholder,
  error,
  inputStyle,
  toast,
}: Props) {
  const [parties,  setParties]  = useState<Party[]>([]);
  const [loaded,   setLoaded]   = useState(false);
  const [open,     setOpen]     = useState(false);
  const [creating, setCreating] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const noun = type === 'SUPPLIER' ? 'supplier' : 'customer';

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const load = async () => {
    if (loaded) return;
    try {
      const res: any = await getParties(type);
      const list = Array.isArray(res) ? res : (res?.parties || []);
      setParties(Array.isArray(list) ? list : []);
    } catch { /* stay empty — field still works as free text */ }
    setLoaded(true);
  };

  const q = value.trim().toLowerCase();
  const filtered = q.length === 0
    ? parties
    : parties.filter(p => (p.name || '').toLowerCase().includes(q));
  const exactMatch = parties.some(p => (p.name || '').toLowerCase() === q);
  const showAddNew = q.length > 0 && !exactMatch;
  const showDropdown = open && loaded;

  const pick = (p: Party) => {
    onSelect({
      partyId: p.partyId ?? p.id ?? null,
      name: p.name,
      phone: p.phone || '',
      gstin: p.gstin || '',
      address: p.address || '',
      vehicleReg: p.shopVehicles?.[0]?.registrationNumber || '',
    });
    setOpen(false);
  };

  const addNew = async () => {
    if (!value.trim() || creating) return;
    setCreating(true);
    try {
      const res: any = await createParty({ name: value.trim(), type });
      const party: Party = res?.party || res || { name: value.trim() };
      setParties(prev => [...prev, party]);
      onSelect({ partyId: party.partyId ?? party.id ?? null, name: value.trim(), phone: party.phone || '', gstin: party.gstin || '', address: party.address || '', vehicleReg: '' });
      toast?.(`"${value.trim()}" added as a new ${noun}`, 'success');
    } catch {
      toast?.(`Could not save ${noun} — try again`, 'error');
    } finally {
      setCreating(false);
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <input
        value={value}
        autoComplete="off"
        placeholder={placeholder ?? (type === 'SUPPLIER' ? 'Supplier Name *' : 'Name or garage')}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { load(); setOpen(true); }}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          border: `1px solid ${error ? T.crimson : T.border}`,
          borderRadius: 7,
          padding: '7px 24px 7px 9px',
          fontSize: 11,
          fontFamily: FONT.ui,
          color: T.t1,
          background: T.card,
          outline: 'none',
          ...inputStyle,
        }}
      />
      <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: T.t4, pointerEvents: 'none' }}>▾</span>
      {showDropdown && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 3px)',
          left: 0,
          right: 0,
          zIndex: 300,
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 8,
          boxShadow: '0 6px 24px rgba(0,0,0,0.14)',
          maxHeight: 220,
          overflowY: 'auto',
        }}>
          {filtered.length === 0 && !showAddNew && (
            <div style={{ padding: '10px', fontSize: 11, color: T.t4, fontFamily: FONT.ui }}>
              {q.length === 0 ? `No ${noun}s yet — type a name to add one.` : `No match — keep typing to add this as a new ${noun}.`}
            </div>
          )}
          {filtered.map(p => (
            <div
              key={p.partyId ?? p.id ?? p.name}
              onMouseDown={e => { e.preventDefault(); pick(p); }}
              onMouseEnter={e => { e.currentTarget.style.background = T.surface; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: `1px solid ${T.border}` }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: T.t1, fontFamily: FONT.ui }}>
                {p.name}
              </div>
              {(p.phone || p.gstin) && (
                <div style={{ fontSize: 10, color: T.t4, marginTop: 1 }}>
                  {[p.phone, p.gstin].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          ))}
          {showAddNew && (
            <div
              onMouseDown={e => { e.preventDefault(); addNew(); }}
              onMouseEnter={e => { if (!creating) e.currentTarget.style.background = (T as any).amberGlow || '#FFF8EC'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              style={{
                padding: '8px 10px',
                cursor: creating ? 'default' : 'pointer',
                color: T.amber,
                fontSize: 11,
                fontWeight: 700,
                fontFamily: FONT.ui,
              }}
            >
              {creating ? `⏳ Adding ${noun}…` : `＋ Add "${value.trim()}" as new ${noun}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
