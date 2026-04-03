export interface ElectronSettings {
  geminiApiKey?: string
  pokemonTcgApiKey?: string
}

export interface BinderRow {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  totalValue?: number
  cardCount?: number
  pageCount?: number
}

export interface PageRow {
  id: string
  binderId: string
  pageNumber: number
  position: number
  name: string
  imagePath: string
  rawAiOutput: string | null
  processedAt: string | null
  status: string
  createdAt: string
  cardCount?: number
  cards?: CardRow[]
}

export interface CardRow {
  id: string
  binderId: string
  pageId: string | null
  tcgApiId: string
  name: string
  setId: string
  setName: string
  collectorNumber: string
  rarity: string | null
  imageUrl: string | null
  priceLow: number | null
  priceMid: number | null
  priceMarket: number | null
  priceHigh: number | null
  priceUpdatedAt: string | null
  quantity: number
  condition: string | null
  tradeList: number
  createdAt: string
  updatedAt: string
}

export interface TcgCardResult {
  tcgApiId: string
  name: string
  setId: string
  setName: string
  collectorNumber: string
  rarity: string | null
  imageUrl: string | null
  priceLow: number | null
  priceMid: number | null
  priceMarket: number | null
  priceHigh: number | null
  priceUpdatedAt: string | null
}

interface ElectronAPI {
  isElectron: true

  getSettings(): Promise<ElectronSettings>
  saveSettings(settings: ElectronSettings): Promise<boolean>
  getUserDataPath(): Promise<string>

  listBinders(): Promise<BinderRow[]>
  getBinder(id: string): Promise<(BinderRow & { pages: PageRow[]; cards: CardRow[] }) | null>
  createBinder(data: { name: string; description?: string }): Promise<BinderRow>
  updateBinder(id: string, data: { name?: string; description?: string }): Promise<BinderRow>
  deleteBinder(id: string): Promise<boolean>

  listPages(binderId: string): Promise<PageRow[]>
  getPage(pageId: string): Promise<(PageRow & { cards: CardRow[] }) | null>
  createPage(data: { binderId: string; name?: string; imagePath?: string; status?: string }): Promise<PageRow>
  updatePage(pageId: string, data: { name?: string; position?: number; status?: string; rawAiOutput?: string; processedAt?: string }): Promise<PageRow>
  deletePage(pageId: string): Promise<boolean>
  reorderPages(binderId: string, orderedIds: string[]): Promise<boolean>

  listCards(binderId: string, pageId?: string): Promise<CardRow[]>
  createCard(data: Partial<CardRow>): Promise<CardRow>
  updateCard(id: string, data: { quantity?: number; condition?: string | null; tradeList?: boolean }): Promise<CardRow>
  deleteCard(id: string): Promise<boolean>
  refreshPrices(binderId: string): Promise<{ updated: number }>

  uploadImage(binderId: string, file: File): Promise<string>
  scanPage(binderId: string, pageId: string, imagePath: string): Promise<{ cards: CardRow[]; count: number }>
  searchTcg(query: string): Promise<TcgCardResult[]>
  getImageUrl(imagePath: string | null): string | null
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
