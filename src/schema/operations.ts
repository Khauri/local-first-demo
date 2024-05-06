import * as z from 'zod';

// It's not strictly necessary that these be defined as zod schemas, but it may help with validation in the early stages of development
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
