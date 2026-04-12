/**
 * Unified API layer — routes calls to either Electron (desktop) or Capacitor (Android).
 * All pages and components import from here instead of calling window.electronAPI directly.
 */

import { isElectron } from './platform'
import type {
  BinderRow, PageRow, CardRow, SlabRow, WishlistCard,
  TcgSearchResult, FullCardPricing, OnePieceCardResult, ElectronSettings,
} from '@/types/electron'

function e() { return window.electronAPI! }

// Lazy imports — only loaded when running on Android/Capacitor
async function db() { return import('./db-android') }
async function files() { return import('./files-android') }
async function tcg() { return import('./tcg-android') }
async function optcg() { return import('./optcg-android') }
async function cb2() { return import('./cardboard2-android') }

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<ElectronSettings> {
  if (isElectron()) return e().getSettings()
  const { Preferences } = await import('@capacitor/preferences')
  const { value } = await Preferences.get({ key: 'settings' })
  return value ? JSON.parse(value) : {}
}

export async function saveSettings(settings: ElectronSettings): Promise<boolean> {
  if (isElectron()) return e().saveSettings(settings)
  const { Preferences } = await import('@capacitor/preferences')
  await Preferences.set({ key: 'settings', value: JSON.stringify(settings) })
  return true
}

export async function getUserDataPath(): Promise<string> {
  if (isElectron()) return e().getUserDataPath()
  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  const result = await Filesystem.getUri({ path: '', directory: Directory.Data })
  return result.uri
}

export async function openExternal(url: string): Promise<void> {
  if (isElectron()) return e().openExternal(url)
  window.open(url, '_blank', 'noopener,noreferrer')
}

// ─── Binders ──────────────────────────────────────────────────────────────────

export async function listBinders(): Promise<BinderRow[]> {
  if (isElectron()) return e().listBinders()
  return (await db()).getBinders()
}

export async function getBinder(id: string): Promise<(BinderRow & { pages: PageRow[]; cards: CardRow[] }) | null> {
  if (isElectron()) return e().getBinder(id)
  return (await db()).getBinderById(id)
}

export async function createBinder(data: { name: string; description?: string; coverColor?: string | null; coverImagePath?: string | null; coverPattern?: string | null; coverPreset?: string | null }): Promise<BinderRow> {
  if (isElectron()) return e().createBinder(data)
  return (await db()).createBinder(data)
}

export async function updateBinder(id: string, data: { name?: string; description?: string | null; coverColor?: string | null; coverImagePath?: string | null; coverPattern?: string | null; coverPreset?: string | null }): Promise<BinderRow> {
  if (isElectron()) return e().updateBinder(id, data)
  return (await db()).updateBinder(id, data)
}

export async function uploadCover(binderId: string, file: File): Promise<string> {
  if (isElectron()) return e().uploadCover(binderId, file)
  return (await files()).uploadCover(binderId, file)
}

export async function deleteBinder(id: string): Promise<boolean> {
  if (isElectron()) return e().deleteBinder(id)
  return (await db()).deleteBinder(id)
}

// ─── Pages ────────────────────────────────────────────────────────────────────

export async function listPages(binderId: string): Promise<PageRow[]> {
  if (isElectron()) return e().listPages(binderId)
  return (await db()).getPages(binderId)
}

export async function getPage(pageId: string): Promise<(PageRow & { cards: CardRow[] }) | null> {
  if (isElectron()) return e().getPage(pageId)
  return (await db()).getPageById(pageId)
}

export async function createPage(data: Parameters<ElectronAPI['createPage']>[0]): Promise<PageRow> {
  if (isElectron()) return e().createPage(data)
  return (await db()).createPage(data)
}

export async function updatePage(pageId: string, data: Parameters<ElectronAPI['updatePage']>[1]): Promise<PageRow> {
  if (isElectron()) return e().updatePage(pageId, data)
  return (await db()).updatePage(pageId, data)
}

export async function deletePage(pageId: string): Promise<boolean> {
  if (isElectron()) return e().deletePage(pageId)
  return (await db()).deletePage(pageId)
}

export async function reorderPages(binderId: string, orderedIds: string[]): Promise<boolean> {
  if (isElectron()) return e().reorderPages(binderId, orderedIds)
  return (await db()).reorderPages(binderId, orderedIds)
}

export async function reorderPageCards(pageId: string, positions: Array<{ id: string; position: number }>): Promise<boolean> {
  if (isElectron()) return e().reorderPageCards(pageId, positions)
  return (await db()).reorderPageCards(pageId, positions)
}

export async function moveCardsToPage(cardIds: string[], targetPageId: string): Promise<boolean> {
  if (isElectron()) return e().moveCardsToPage(cardIds, targetPageId)
  return (await db()).moveCardsToPage(cardIds, targetPageId)
}

// ─── Cards ────────────────────────────────────────────────────────────────────

export async function listCards(binderId: string, pageId?: string): Promise<CardRow[]> {
  if (isElectron()) return e().listCards(binderId, pageId)
  return (await db()).getCards(binderId, pageId)
}

export async function createCard(data: Partial<CardRow>): Promise<CardRow> {
  if (isElectron()) return e().createCard(data)
  return (await db()).createCard(data)
}

export async function updateCard(id: string, data: Parameters<ElectronAPI['updateCard']>[1]): Promise<CardRow> {
  if (isElectron()) return e().updateCard(id, data)
  return (await db()).updateCard(id, data as any)
}

export async function uploadCardImage(cardId: string, binderId: string, file: File): Promise<CardRow> {
  if (isElectron()) return e().uploadCardImage(cardId, binderId, file)
  return (await files()).uploadCardImage(cardId, binderId, file)
}

export async function getCardPrices(tcgApiId: string): Promise<FullCardPricing | null> {
  if (isElectron()) return e().getCardPrices(tcgApiId)
  return (await tcg()).getFullCardPricing(tcgApiId)
}

export async function getCardPricesBatch(tcgApiIds: string[]): Promise<Record<string, FullCardPricing | null>> {
  if (isElectron()) return e().getCardPricesBatch(tcgApiIds)
  return (await tcg()).getCardPricesBatch(tcgApiIds)
}

export async function deleteCard(id: string): Promise<boolean> {
  if (isElectron()) return e().deleteCard(id)
  return (await db()).deleteCard(id)
}

export async function refreshPrices(binderId: string, onProgress?: (data: { current: number; total: number; name: string }) => void): Promise<{ updated: number }> {
  if (isElectron()) return e().refreshPrices(binderId)

  const dbMod = await db()
  const tcgMod = await tcg()
  const cb2Mod = await cb2()

  const pokemonCards = await dbMod.getCardsForRefresh(binderId)
  const opCards = await dbMod.getOpCardsForRefresh(binderId)
  const allCards = [...pokemonCards, ...opCards]
  let updated = 0

  const eurUsdRate = await tcgMod.fetchEurUsdRate()

  for (let i = 0; i < pokemonCards.length; i++) {
    const card = pokemonCards[i]
    onProgress?.({ current: i, total: allCards.length, name: card.name })
    try {
      const pricing = await tcgMod.getFullCardPricing(card.tcgApiId)
      const hasEur = pricing?.cardmarket?.trend != null || pricing?.cardmarket?.avg != null || pricing?.cardmarket?.avg7 != null
      if (pricing && hasEur) {
        await dbMod.updateCardPricesFull(card.id, pricing, card.condition, eurUsdRate)
        updated++
      }
    } catch { /* skip failed cards */ }
  }

  if (opCards.length > 0) {
    onProgress?.({ current: pokemonCards.length, total: allCards.length, name: 'One Piece cards...' })
    try {
      const opUpdates = await cb2Mod.refreshOpPrices(opCards)
      for (const { id, priceMarket, priceLow } of opUpdates) {
        await dbMod.updateOpCardPrice(id, priceMarket, priceLow)
        updated++
      }
    } catch { /* skip if cardboard2 unreachable */ }
  }

  onProgress?.({ current: allCards.length, total: allCards.length, name: '' })
  return { updated }
}

// ─── Images ───────────────────────────────────────────────────────────────────

export async function uploadImage(binderId: string, file: File): Promise<string> {
  if (isElectron()) return e().uploadImage(binderId, file)
  return (await files()).uploadImage(binderId, file)
}

export function getImageUrl(imagePath: string | null): string | null {
  if (isElectron()) return e().getImageUrl(imagePath)
  // Synchronous on Android — resolved immediately from path
  if (!imagePath) return null
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath
  // For Capacitor, we need the convertFileSrc call — import Capacitor dynamically would be async.
  // Instead, check if Capacitor is available synchronously via global
  const Cap = (window as any).Capacitor
  if (Cap?.convertFileSrc) {
    return Cap.convertFileSrc(`/data/user/0/com.offdex.app/files/${imagePath}`)
  }
  return imagePath
}

// ─── TCG Search ───────────────────────────────────────────────────────────────

export async function searchTcg(query: string, page?: number): Promise<TcgSearchResult> {
  if (isElectron()) return e().searchTcg(query, page)
  return (await tcg()).searchCards(query, page)
}

export async function getPokemonSets(): Promise<{ id: string; name: string }[]> {
  if (isElectron()) return e().getPokemonSets()
  return (await tcg()).getPokemonSets()
}

export async function searchOptcg(query: string, setId?: string): Promise<{ cards: OnePieceCardResult[]; hasMore: false }> {
  if (isElectron()) return e().searchOptcg(query, setId)
  return (await optcg()).searchOnePieceCards(query, setId)
}

export async function getOptcgSets(): Promise<{ id: string; name: string }[]> {
  if (isElectron()) return e().getOptcgSets()
  return (await optcg()).getOnePieceSets()
}

export async function getOpCardDetails(tcgApiId: string, name?: string, imageUrl?: string): Promise<Parameters<ElectronAPI['getOpCardDetails']> extends [any, any?, any?] ? Awaited<ReturnType<ElectronAPI['getOpCardDetails']>> : never> {
  if (isElectron()) return e().getOpCardDetails(tcgApiId, name, imageUrl)
  return (await cb2()).lookupOpCard(tcgApiId, name, imageUrl) as any
}

export async function getEurUsdRate(): Promise<number> {
  if (isElectron()) return e().getEurUsdRate()
  return (await tcg()).fetchEurUsdRate()
}

export function onPricesProgress(cb: (data: { current: number; total: number; name: string }) => void): () => void {
  if (isElectron()) return e().onPricesProgress(cb)
  // On Android, refreshPrices accepts onProgress callback directly — this registration is a no-op
  return () => {}
}

// ─── Slabs ────────────────────────────────────────────────────────────────────

export async function listSlabs(): Promise<SlabRow[]> {
  if (isElectron()) return e().listSlabs()
  return (await db()).getSlabs()
}

export async function createSlab(data: Parameters<ElectronAPI['createSlab']>[0]): Promise<SlabRow> {
  if (isElectron()) return e().createSlab(data)
  return (await db()).createSlab(data)
}

export async function updateSlab(id: string, data: Parameters<ElectronAPI['updateSlab']>[1]): Promise<SlabRow> {
  if (isElectron()) return e().updateSlab(id, data)
  return (await db()).updateSlab(id, data as any)
}

export async function deleteSlab(id: string): Promise<boolean> {
  if (isElectron()) return e().deleteSlab(id)
  return (await db()).deleteSlab(id)
}

export async function uploadSlabImage(slabId: string, file: File): Promise<SlabRow> {
  if (isElectron()) return e().uploadSlabImage(slabId, file)
  return (await files()).uploadSlabImage(slabId, file)
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export async function listWishlistCards(): Promise<WishlistCard[]> {
  if (isElectron()) return e().listWishlistCards()
  return (await db()).getWishlistCards()
}

export async function createWishlistCard(data: Parameters<ElectronAPI['createWishlistCard']>[0]): Promise<WishlistCard> {
  if (isElectron()) return e().createWishlistCard(data)
  return (await db()).createWishlistCard(data)
}

export async function updateWishlistCard(id: string, data: Parameters<ElectronAPI['updateWishlistCard']>[1]): Promise<WishlistCard> {
  if (isElectron()) return e().updateWishlistCard(id, data)
  return (await db()).updateWishlistCard(id, data)
}

export async function deleteWishlistCard(id: string): Promise<boolean> {
  if (isElectron()) return e().deleteWishlistCard(id)
  return (await db()).deleteWishlistCard(id)
}

// Re-export type for convenience
type ElectronAPI = NonNullable<Window['electronAPI']>
