const isDebugEnabled = import.meta.env.DEV;

export const debugLog = (...args) => {
  if (isDebugEnabled) {
    console.log(...args);
  }
};
