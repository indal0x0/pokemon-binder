import { GoogleGenerativeAI } from '@google/generative-ai'
import * as fs from 'fs'
import * as path from 'path'
import { resolveImagePath } from './storage'

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' })
}

export interface IdentifiedCard {
  name: string
  setName: string | null
  collectorNumber: string | null
  quantity: number
  condition: 'NM' | 'LP' | 'MP' | 'HP' | 'DMG' | null
  notes: string | null
}

export async function identifyCardsOnPage(imagePath: string): Promise<{ cards: IdentifiedCard[]; rawText: string }> {
  const absolutePath = resolveImagePath(imagePath)

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Image file not found: ${absolutePath}`)
  }

  const imageBuffer = fs.readFileSync(absolutePath)
  const base64Image = imageBuffer.toString('base64')

  const ext = path.extname(imagePath).toLowerCase()
  let mimeType: string
  if (ext === '.png') mimeType = 'image/png'
  else if (ext === '.webp') mimeType = 'image/webp'
  else mimeType = 'image/jpeg'

  const prompt = `You are an expert Pokemon card identifier. Analyze this binder page image and identify every Pokemon card visible.

IMPORTANT: Return ONLY a raw JSON array — no markdown, no code blocks, no explanation text before or after the JSON. Start your response with [ and end with ].

Each object must have exactly these fields:
- "name": string — the Pokemon card name (e.g. "Charizard", "Pikachu VMAX", "Lugia V"). Use your best guess even if partially obscured.
- "setName": string or null — set name if readable (e.g. "Base Set", "Sword & Shield")
- "collectorNumber": string or null — the number at the bottom of the card (e.g. "4/102", "025/202")
- "quantity": number — almost always 1
- "condition": "NM" | "LP" | "MP" | "HP" | "DMG" | null — card condition
- "notes": string or null — e.g. "holo", "reverse holo", "1st edition", "shadowless", "full art"

Rules:
- Include EVERY card you can see, even partially visible ones
- If you are unsure of the exact name, give your best guess
- Only skip a slot if it is completely empty (no card at all)
- If no cards are visible at all, return []

Identify all Pokemon cards on this binder page now.`

  const model = getModel()
  const result = await model.generateContent([
    {
      inlineData: {
        data: base64Image,
        mimeType,
      },
    },
    prompt,
  ])

  const rawText = result.response.text()

  // Extract JSON array from response — handle cases where model wraps in markdown
  let jsonStr = rawText.trim()

  // Strip markdown code fences if present
  jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

  // Find the first [ and last ] to extract just the array
  const start = jsonStr.indexOf('[')
  const end = jsonStr.lastIndexOf(']')
  if (start === -1 || end === -1) {
    // Model returned prose with no JSON array — treat as empty
    return { cards: [], rawText }
  }

  jsonStr = jsonStr.slice(start, end + 1)

  const parsed = JSON.parse(jsonStr)

  const cards = parsed.map((card: IdentifiedCard) => ({
    name: card.name || 'Unknown',
    setName: card.setName || null,
    collectorNumber: card.collectorNumber || null,
    quantity: typeof card.quantity === 'number' ? card.quantity : 1,
    condition: card.condition || null,
    notes: card.notes || null,
  }))

  return { cards, rawText }
}
