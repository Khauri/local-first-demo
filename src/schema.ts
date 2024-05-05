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

export const Spot = z.object({
  type: z.literal('Spot'),
  id: z.string(),
  spot_name: z.string(),
});

// It's not strictly necessary that these be defined as zod schemas, but it may help with validation in the early stages
export const BaseOperation = z.object({
  type: z.string(),
  oid: z.string(),
  shouldForward: z.boolean().optional().default(true),
});

export const ListTabs = BaseOperation.extend({
  type: z.literal('listTabs'),
});

export const CreateTab = BaseOperation.extend({
  type: z.literal('createTab'),
  id: z.string().optional(),
  tab_name: z.string().optional(),
});

export const AddItemToTab = BaseOperation.extend({
  type: z.literal('addItemToTab'),
  tab: z.string(),
  id: z.string().optional(),
  quantity: z.number(),
  product: z.object({
    name: z.string(),
    price: z.number(),
  }),
});

export const RemoveItemFromTab = BaseOperation.extend({
  type: z.literal('removeItemFromTab'),
  tab: z.string(),
  item: z.string(),
  quantity: z.number(),
});

export const ListTabItems = BaseOperation.extend({
  type: z.literal('listTabItems'),
  tab: z.string(),
});

export const Operation = z.discriminatedUnion('type', [ListTabs, ListTabItems, CreateTab, AddItemToTab, RemoveItemFromTab]);
