/**
 * Module-level import progress store.
 * Lives outside React — survives component unmounts, tab switches, and navigation.
 * CatalogTab writes to it; any component can subscribe.
 */
let _state = null;
const _listeners = new Set();

export const importStore = {
  /** Current state (or null if idle) */
  get: () => _state,

  /** Update state and notify all subscribers */
  set(state) {
    _state = state;
    _listeners.forEach(fn => fn(state));
  },

  /** Subscribe to changes. Returns unsubscribe fn. */
  subscribe(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },
};
