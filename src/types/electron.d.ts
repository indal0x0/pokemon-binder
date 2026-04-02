interface ElectronSettings {
  geminiApiKey?: string
  pokemonTcgApiKey?: string
}

interface ElectronAPI {
  getSettings: () => Promise<ElectronSettings>
  saveSettings: (settings: ElectronSettings) => Promise<boolean>
  getUserDataPath: () => Promise<string>
  isElectron: boolean
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
