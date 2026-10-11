/**
 * Module-level import progress store.
 * Lives outside React — survives component unmounts, tab switches, and navigation.
 * CatalogTab writes to it; any component can subscribe.
 */
export interface ImportProgress {
  active?: boolean;
  clearUI?: boolean;
  done?: number;
  total?: number;
  created?: number;
  updated?: number;
  unchanged?: number;
  invalid?: number;
  popup?: boolean;
  filename?: string;
  fitments?: number;
  duplicates?: Array<{ oemNumber: string; partName: string; count: number }>;
}

type ImportListener = (state: ImportProgress | null) => void;

let _state: ImportProgress | null = null;
const _listeners = new Set<ImportListener>();

export const importStore = {
  /** Current state (or null if idle) */
  get: () => _state,

  /** Update state and notify all subscribers */
  set(state: ImportProgress | null) {
    _state = state;
    _listeners.forEach(fn => fn(state));
  },

  /** Subscribe to changes. Returns unsubscribe fn. */
  subscribe(fn: ImportListener) {
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  },
};
