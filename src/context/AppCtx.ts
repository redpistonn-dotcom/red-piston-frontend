import { createContext, useContext } from 'react';
import type { AppCtxValue } from '../types';

/**
 * Stable module-level reference — shells and pages consume this via useContext.
 * Typed with AppCtxValue so every consumer knows exactly what's available.
 */
export const AppCtx = createContext<AppCtxValue | null>(null);

/**
 * Typed hook — throws a clear error if used outside the provider,
 * instead of "Cannot destructure property X of null".
 */
export function useAppCtx(): AppCtxValue {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useAppCtx must be called inside <AppCtx.Provider>');
  return ctx;
}
