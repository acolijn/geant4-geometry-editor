import { useAppState } from '../hooks/useAppState';
import { AppStateContext } from './useAppContext';

/**
 * Provider that makes all app state available via context.
 * Wraps `useAppState` so any descendant can consume state
 * without prop drilling.
 */
export function AppStateProvider({ children }) {
  const state = useAppState();
  return (
    <AppStateContext.Provider value={state}>
      {children}
    </AppStateContext.Provider>
  );
}
