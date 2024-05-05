/*
 * This is the server-side implementation of the actions.
 * Normally this will update the database and then return the updated resources,
 * but for this example the database is just an array in memory.
 */
import * as z from 'zod';

import { Adapter } from "./actions";
import { Tab, Item, AddItemToTab, CreateTab, ListTabItems, ListTabs } from "./schema";

type Resource = z.infer<typeof Tab> | z.infer<typeof Item>;

const db: Resource[] = [
  {
    type: 'Tab',
    id: '1',
    tab_name: 'Tab 1',
    balance_due: 0,
    status: 'OPEN',
    items: [],
    is_paid: false,
    created: Date.now(),
  },
  {
    type: 'Tab',
    id: '2',
    tab_name: 'Tab 2',
    balance_due: 0,
    status: 'OPEN',
    items: [],
    is_paid: false,
    created: Date.now() + 1000,
  },
  {
    type: 'Tab',
    id: '3',
    tab_name: 'Tab 3',
    balance_due: 0,
    status: 'OPEN',
    items: [],
    is_paid: false,
    created: Date.now() + 2000,
  },
];

export const listTabs: Adapter<typeof ListTabs> = async (op) => {
  // In a real implementation, this would be a database query
  return db.filter((resource) => resource.type === 'Tab');
};

export const createTab: Adapter<typeof CreateTab> = async (op) => {
  const id = op.id ?? Math.random().toString(36).substring(7);
  const tab = {
    id,
    type: 'Tab',
    tab_name: op.tab_name ?? `Tab ${id}`,
    balance_due: 0,
    status: 'OPEN',
    items: [],
    is_paid: false,
    created: Date.now(),
  } satisfies z.infer<typeof Tab>;
  db.push(tab);
  return [tab];
};

export const addItemToTab: Adapter<typeof AddItemToTab> = async (op) => {
  const tab = db.find((resource) => resource.type === 'Tab' && resource.id === op.tab) as z.infer<typeof Tab> | undefined;
  if(!tab) {
    throw new Error('Tab not found');
  }
  tab.balance_due += op.quantity * op.product.price;
  const item = {
    type: 'Item',
    id: op.id ?? Math.random().toString(36).substring(7),
    quantity: op.quantity,
    price: op.product.price,
    name: op.product.name,
    created: Date.now(),
    status: 'ACTIVE',
  } satisfies z.infer<typeof Item>;
  tab.items.push(item);
  console.log(item);
  return [tab];
};

export const listTabItems: Adapter<typeof ListTabItems> = async (op) => {
  const tab = db.find((resource) => resource.type === 'Tab' && resource.id === op.tab) as z.infer<typeof Tab> | undefined;
  return tab?.items ?? [];
};