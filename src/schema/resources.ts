import * as z from 'zod';

// Note: for this implementation only forward relationships should be defined in the schema
// Otherwise you end up with recursive types that are difficult to work with
export const Item = z.object({
  type: z.literal('Item'),
  id: z.string(),
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
  created: z.number(),
  status: z.string(),
});

export const Tab = z.object({
  type: z.literal('Tab'),
  id: z.string(),
  tab_uuid: z.string().optional(),
  tab_name: z.string(),
  balance_due: z.number(),
  status: z.enum(['OPEN', 'CLOSED', 'PENDING']),
  is_paid: z.boolean().default(false),
  items: z.array(Item),
  created: z.number(),
});
