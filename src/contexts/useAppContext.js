import { createContext, useContext } from 'react';

export const AppStateContext = createContext(null);

/**
 * Hook to access app state from any component inside `AppStateProvider`.
 * @returns {ReturnType<import('../hooks/useAppState').useAppState>}
 */
export function useAppContext() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppStateProvider');
  }
  return context;
}
