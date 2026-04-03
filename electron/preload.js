const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:set', settings),
  getUserDataPath: () => ipcRenderer.invoke('app:userData'),

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

  // Binder cover image upload
  uploadCover: async (binderId, file) => {
    const arrayBuffer = await file.arrayBuffer()
    return ipcRenderer.invoke('binders:upload-cover', binderId, file.name, arrayBuffer)
  },

  // Card scanning (Gemini + TCG match)
  scanPage: (binderId, pageId, imagePath) =>
    ipcRenderer.invoke('scan:page', binderId, pageId, imagePath),

  // TCG card browser search
  searchTcg: (query) => ipcRenderer.invoke('tcg:search', query),

  // Get the URL to display a stored image
  // imagePath is like "uploads/binderId/filename"
  getImageUrl: (imagePath) => {
    if (!imagePath) return null
    return `app://./${imagePath}`
  },
})
