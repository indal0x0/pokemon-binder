import { GoogleGenerativeAI } from '@google/generative-ai'
import * as fs from 'fs'
import * as path from 'path'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

export interface IdentifiedCard {
  name: string
  setName: string | null
  collectorNumber: string | null
  quantity: number
  condition: 'NM' | 'LP' | 'MP' | 'HP' | 'DMG' | null
  notes: string | null
}

export async function identifyCardsOnPage(imagePath: string): Promise<IdentifiedCard[]> {
  const absolutePath = path.join(process.cwd(), 'public', imagePath)
  const imageBuffer = fs.readFileSync(absolutePath)
  const base64Image = imageBuffer.toString('base64')

  const ext = path.extname(imagePath).toLowerCase()
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg'

  const prompt = `You are an expert Pokemon card identifier. Analyze the binder page image and identify every Pokemon card visible. Return ONLY a valid JSON array with no other text, markdown, or explanation.

Each object in the array must have exactly these fields:
- name: string (exact Pokemon card name, e.g. "Charizard", "Pikachu VMAX", "Lugia V")
- setName: string | null (set name if visible, e.g. "Base Set", "Sword & Shield", "Scarlet & Violet")
- collectorNumber: string | null (number printed on card bottom, e.g. "4/102", "25", "SWSH061")
- quantity: number (how many copies are visible in this position, almost always 1)
- condition: "NM" | "LP" | "MP" | "HP" | "DMG" | null (card condition if assessable)
- notes: string | null (e.g. "holo", "reverse holo", "1st edition", "shadowless", "full art")

Skip empty slots. Skip cards that are completely unreadable. Return an empty array [] if no cards are visible.

Identify all Pokemon cards visible on this binder page.`

  const result = await model.generateContent([
    {
      inlineData: {
        data: base64Image,
        mimeType,
      },
    },
    prompt,
  ])

  const text = result.response.text()

  // Strip markdown code blocks if present
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  const parsed = JSON.parse(cleaned)

  return parsed.map((card: IdentifiedCard) => ({
    name: card.name || 'Unknown',
    setName: card.setName || null,
    collectorNumber: card.collectorNumber || null,
    quantity: typeof card.quantity === 'number' ? card.quantity : 1,
    condition: card.condition || null,
    notes: card.notes || null,
  }))
}
