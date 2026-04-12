export const isElectron = (): boolean =>
  typeof window !== 'undefined' && !!window.electronAPI

export const isCapacitor = (): boolean =>
  typeof window !== 'undefined' &&
  !window.electronAPI &&
  typeof (window as any).Capacitor !== 'undefined'
