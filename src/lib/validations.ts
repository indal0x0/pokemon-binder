import { z } from 'zod'

export const CreateBinderSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})

export const UpdateBinderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
})

export const UpdateCardSchema = z.object({
  quantity: z.number().int().min(1).max(99).optional(),
  condition: z.enum(['NM', 'LP', 'MP', 'HP', 'DMG']).nullable().optional(),
  tradeList: z.boolean().optional(),
})
