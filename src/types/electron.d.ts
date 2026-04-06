export interface ElectronSettings {
  // reserved for future settings
}

export interface BinderRow {
  id: string
  name: string
  description: string | null
  coverColor: string | null
  coverImagePath: string | null
  coverPattern: string | null
  coverPreset: string | null
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
  cols: number
  rows: number
  createdAt: string
  cardCount?: number
  firstCardImageUrl?: string | null
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
  year: number | null
  imageUrl: string | null
  priceLow: number | null
  priceMid: number | null
  priceMarket: number | null
  priceHigh: number | null
  priceBase: number | null
  priceUpdatedAt: string | null
  quantity: number
  condition: string | null
  tradeList: number
  position: number | null
  purchasedPrice: number | null
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
  year: number | null
  priceLow: number | null
  priceMid: number | null
  priceMarket: number | null
  priceHigh: number | null
  priceUpdatedAt: string | null
}

export interface TcgSearchResult {
  cards: TcgCardResult[]
  hasMore: boolean
}

export interface CardPricingVariant {
  label: string
  low: number | null
  mid: number | null
  market: number | null
  high: number | null
}

export interface FullCardPricing {
  variants: CardPricingVariant[]
  bestMarket: number | null
  cardmarket: {
    avg: number | null
    low: number | null
    trend: number | null
    avg7: number | null
    avg30: number | null
  } | null
}

interface ElectronAPI {
  isElectron: true

  getSettings(): Promise<ElectronSettings>
  saveSettings(settings: ElectronSettings): Promise<boolean>
  getUserDataPath(): Promise<string>

  listBinders(): Promise<BinderRow[]>
  getBinder(id: string): Promise<(BinderRow & { pages: PageRow[]; cards: CardRow[] }) | null>
  createBinder(data: { name: string; description?: string; coverColor?: string | null; coverImagePath?: string | null; coverPattern?: string | null; coverPreset?: string | null }): Promise<BinderRow>
  updateBinder(id: string, data: { name?: string; description?: string | null; coverColor?: string | null; coverImagePath?: string | null; coverPattern?: string | null; coverPreset?: string | null }): Promise<BinderRow>
  uploadCover(binderId: string, file: File): Promise<string>
  deleteBinder(id: string): Promise<boolean>

  listPages(binderId: string): Promise<PageRow[]>
  getPage(pageId: string): Promise<(PageRow & { cards: CardRow[] }) | null>
  createPage(data: { binderId: string; name?: string; imagePath?: string; status?: string; cols?: number; rows?: number }): Promise<PageRow>
  updatePage(pageId: string, data: { name?: string; position?: number; status?: string; rawAiOutput?: string; processedAt?: string; cols?: number; rows?: number; imagePath?: string }): Promise<PageRow>
  deletePage(pageId: string): Promise<boolean>
  reorderPages(binderId: string, orderedIds: string[]): Promise<boolean>
  reorderPageCards(pageId: string, positions: Array<{ id: string; position: number }>): Promise<boolean>
  moveCardsToPage(cardIds: string[], targetPageId: string): Promise<boolean>

  listCards(binderId: string, pageId?: string): Promise<CardRow[]>
  createCard(data: Partial<CardRow>): Promise<CardRow>
  updateCard(id: string, data: { quantity?: number; condition?: string | null; tradeList?: boolean; imageUrl?: string | null; purchasedPrice?: number | null }): Promise<CardRow>
  uploadCardImage(cardId: string, binderId: string, file: File): Promise<CardRow>
  getCardPrices(tcgApiId: string): Promise<FullCardPricing | null>
  getCardPricesBatch(tcgApiIds: string[]): Promise<Record<string, FullCardPricing | null>>
  deleteCard(id: string): Promise<boolean>
  refreshPrices(binderId: string): Promise<{ updated: number }>

  uploadImage(binderId: string, file: File): Promise<string>
  searchTcg(query: string, page?: number): Promise<TcgSearchResult>
  getImageUrl(imagePath: string | null): string | null

  getEurUsdRate(): Promise<number>
  onPricesProgress(cb: (data: { current: number; total: number; name: string }) => void): () => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
