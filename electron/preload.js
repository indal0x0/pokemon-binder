const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:set', settings),
  getUserDataPath: () => ipcRenderer.invoke('app:userData'),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // Binders
  listBinders: () => ipcRenderer.invoke('binders:list'),
  getBinder: (id) => ipcRenderer.invoke('binders:get', id),
  createBinder: (data) => ipcRenderer.invoke('binders:create', data),
  updateBinder: (id, data) => ipcRenderer.invoke('binders:update', id, data),
  deleteBinder: (id) => ipcRenderer.invoke('binders:delete', id),

  // Pages
  listPages: (binderId) => ipcRenderer.invoke('pages:list', binderId),
  getPage: (pageId) => ipcRenderer.invoke('pages:get', pageId),
  createPage: (data) => ipcRenderer.invoke('pages:create', data),
  updatePage: (pageId, data) => ipcRenderer.invoke('pages:update', pageId, data),
  deletePage: (pageId) => ipcRenderer.invoke('pages:delete', pageId),
  reorderPages: (binderId, orderedIds) => ipcRenderer.invoke('pages:reorder', binderId, orderedIds),
  reorderPageCards: (pageId, positions) => ipcRenderer.invoke('pages:reorder-cards', pageId, positions),
  moveCardsToPage: (cardIds, targetPageId) => ipcRenderer.invoke('pages:move-cards', cardIds, targetPageId),

  // Cards
  listCards: (binderId, pageId) => ipcRenderer.invoke('cards:list', binderId, pageId),
  createCard: (data) => ipcRenderer.invoke('cards:create', data),
  updateCard: (id, data) => ipcRenderer.invoke('cards:update', id, data),
  deleteCard: (id) => ipcRenderer.invoke('cards:delete', id),
  refreshPrices: (binderId) => ipcRenderer.invoke('cards:refresh-prices', binderId),

  // Image upload — accepts a File object, returns the stored relative path
  uploadImage: async (binderId, file) => {
    const arrayBuffer = await file.arrayBuffer()
    return ipcRenderer.invoke('upload:image', binderId, file.name, arrayBuffer)
  },

  // Upload a custom card image — saves locally and updates the card's imageUrl in DB
  uploadCardImage: async (cardId, binderId, file) => {
    const arrayBuffer = await file.arrayBuffer()
    return ipcRenderer.invoke('cards:upload-card-image', cardId, binderId, file.name, arrayBuffer)
  },

  // Binder cover image upload
  uploadCover: async (binderId, file) => {
    const arrayBuffer = await file.arrayBuffer()
    return ipcRenderer.invoke('binders:upload-cover', binderId, file.name, arrayBuffer)
  },

  // TCG card browser search
  searchTcg: (query, page) => ipcRenderer.invoke('tcg:search', query, page ?? 1),

  // Pokemon set list for set filter dropdown
  getPokemonSets: () => ipcRenderer.invoke('tcg:sets'),

  // One Piece card search
  searchOptcg: (query, setId) => ipcRenderer.invoke('op:search', query, setId ?? ''),

  // One Piece set list
  getOptcgSets: () => ipcRenderer.invoke('op:sets'),

  // One Piece card details from cardboard2 (price, card effect, cost, power, etc.)
  getOpCardDetails: (tcgApiId) => ipcRenderer.invoke('op:card-details', tcgApiId),

  // EUR/USD live exchange rate (cached per session)
  getEurUsdRate: () => ipcRenderer.invoke('tcg:get-eur-usd-rate'),

  // Wishlist
  listWishlistCards: () => ipcRenderer.invoke('wishlist:list'),
  createWishlistCard: (data) => ipcRenderer.invoke('wishlist:create', data),
  updateWishlistCard: (id, data) => ipcRenderer.invoke('wishlist:update', id, data),
  deleteWishlistCard: (id) => ipcRenderer.invoke('wishlist:delete', id),

  // Listen for per-card price refresh progress
  onPricesProgress: (cb) => {
    const handler = (_, d) => cb(d)
    ipcRenderer.on('prices:progress', handler)
    return () => ipcRenderer.off('prices:progress', handler)
  },

  // Fetch full pricing breakdown for a card (variants + cardmarket)
  getCardPrices: (tcgApiId) => ipcRenderer.invoke('tcg:get-card-prices', tcgApiId),

  // Fetch market prices for multiple cards in parallel — returns { [tcgApiId]: FullCardPricing | null }
  getCardPricesBatch: (tcgApiIds) => ipcRenderer.invoke('tcg:get-prices-batch', tcgApiIds),

  // Get the URL to display a stored image
  // imagePath is like "uploads/binderId/filename"
  getImageUrl: (imagePath) => {
    if (!imagePath) return null
    return `app://./${imagePath}`
  },

  // Slabs
  listSlabs: () => ipcRenderer.invoke('slabs:list'),
  createSlab: (data) => ipcRenderer.invoke('slabs:create', data),
  updateSlab: (id, data) => ipcRenderer.invoke('slabs:update', id, data),
  deleteSlab: (id) => ipcRenderer.invoke('slabs:delete', id),
  uploadSlabImage: async (slabId, file) => {
    const arrayBuffer = await file.arrayBuffer()
    return ipcRenderer.invoke('slabs:upload-image', slabId, file.name, arrayBuffer)
  },
})
