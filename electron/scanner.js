/**
 * Gemini card scanning for the Electron main process.
 * Reads image files and calls gemini-1.5-flash-latest to identify cards.
 */

const fs = require('fs')
const path = require('path')

async function identifyCardsOnPage(imagePath, apiKey) {
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`)
  }

  const imageBuffer = fs.readFileSync(imagePath)
  const base64Image = imageBuffer.toString('base64')

  const ext = path.extname(imagePath).toLowerCase()
  let mimeType
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`

  const body = {
    contents: [
      {
        parts: [
          { inline_data: { mime_type: mimeType, data: base64Image } },
          { text: prompt },
        ],
      },
    ],
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${errText}`)
  }

  const data = await response.json()
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // Extract JSON array — strip markdown fences if present
  let jsonStr = rawText.trim()
  jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

  const start = jsonStr.indexOf('[')
  const end = jsonStr.lastIndexOf(']')
  if (start === -1 || end === -1) {
    return { cards: [], rawText }
  }

  jsonStr = jsonStr.slice(start, end + 1)
  const parsed = JSON.parse(jsonStr)

  const cards = parsed.map((card) => ({
    name: card.name || 'Unknown',
    setName: card.setName || null,
    collectorNumber: card.collectorNumber || null,
    quantity: typeof card.quantity === 'number' ? card.quantity : 1,
    condition: card.condition || null,
    notes: card.notes || null,
  }))

  return { cards, rawText }
}

module.exports = { identifyCardsOnPage }
