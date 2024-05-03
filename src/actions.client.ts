/**
 * This is the client-side implementation of the actions.
 * This "predicts" what will happen on the server and returns the updated resources.
 */
import * as z from 'zod';
import {Tab, Spot, Item, CreateTab, AddItemToTab, RemoveItemFromTab, ListTabs, ListTabItems} from './schema';
import type { Adapter } from './actions';
import EventEmitter from 'eventemitter3';
import { flattenResources } from './utils';

function id() {
  return Math.random().toString(36).substring(7);
}

// This is a simple in-memory cache for storing resources
// In a real application, this would be replaced with indexxed or something similar
const cache = globalThis.cache = new Map<string, any>();
// We use an event emitter to notify when changes occur for a resource
// Mobx also works well for this
export const emitter = new EventEmitter();

// Used to store the resources returned from the performed function, if any
export function store(resources: any) {
  if(!Array.isArray(resources)) {
    resources = [resources];
  }
  // Clone the resource to prevent directly mutating the passed-in object (this only matters because we're using an in-memory cache)
  resources = JSON.parse(JSON.stringify(resources));
  resources = flattenResources(resources);
  const updatedRefs: string[] = [];
  for(const resource of resources) {
    const ref = resource.type + ':' + resource.id;
    cache.set(ref, resource);
    updatedRefs.push(ref);
  }
  // Notify any listeners that the resources have been updated _after_ all resources have been stored
  updatedRefs.forEach((ref) => emitter.emit(ref));
  return true;
}

export function getResourceByReference<T = any>(ref: string) {
  console.log('Retrieving resource', ref);
  let resource = cache.get(ref);
  if(!resource) {
    return null;
  }
  // Clone the resource to prevent accidental mutation (this only matters because we're using an in-memory cache)
  resource = JSON.parse(JSON.stringify(resource));
  // Hydrate the resource by resolving sub-references. This is a basic JOIN operation
  // In the real application this would make sure referenced resources exist and/or are reloaded when necessary
  // Additionally, resources can be marked with other metadata such as a staleness date, version number, etc.
  Object.entries(resource).forEach(([key, value]) => {
    if(typeof value === 'string' && value.startsWith('ref:')) {
      resource[key] = getResourceByReference(value.slice(4));
    }
    if(Array.isArray(value)) {
      resource[key] = value.map((v) => {
        if(typeof v === 'string' && v.startsWith('ref:')) {
          return getResourceByReference(v.slice(4));
        }
        return v;
      });
    }
  });
  return resource as T;
}

async function forwardOperation(op: any) {
  // TODO: Detect when offline and queue operations for later (with restrictions. Not all operations can be forwarded when offline)
  const response = await fetch('/api/perform', {
    method: 'POST',
    body: JSON.stringify(op),
  });
  // TODO: Error handling will be a big concern. To handle them properly you will want to ensure you can revert any changes
  if(!response.ok) {
    console.error('Failed to perform operation', response);
    return;
  }
  const result = await response.json();
  store({
    type: op.type,
    id: op.oid,
    data: result,
  });
}

export const listTabs: Adapter<typeof ListTabs> = async (op) => {
  forwardOperation(op);
  // Implementing searching/querying logic client-side is too complex for this demo but it could be done for sure
  const cachedTabs = Array.from(cache.values()).filter((resource) => resource.type === 'Tab');
  return cachedTabs;
};

export const createTab: Adapter<typeof CreateTab> = async (op) => {
  forwardOperation(op);
  // Creating a tab creates a new tab and a new order.
  // Note: it doesn't matter how you create these objects (e.g. use websql, firebase, generate it offline, or whatever you need)
  return [
    {
      type: 'Tab',
      id: id(), // used for rendering/referencing in the UI
      status: 'PENDING',
      tab_name: 'New Tab',
      balance_due: 0,
      is_paid: false,
      items: [],
      created: Date.now(),
    } satisfies z.infer<typeof Tab>,
  ];
}

export const addItemToTab: Adapter<typeof AddItemToTab> = async (op) => {
  forwardOperation(op);
  // Depending on circumstances, we might make this return an immutable copy
  const tab = getResourceByReference<z.infer<typeof Tab>>(`Tab:${op.tab}`);
  if(!tab) {
    throw new Error('Tab not found');
  }
  tab.balance_due += op.quantity * op.product.price;
  const item = {
    type: 'Item',
    id: id(),
    quantity: op.quantity,
    price: op.product.price,
    name: op.product.name,
    created: Date.now(),
  } satisfies z.infer<typeof Item>;
  tab.items = [...tab.items ?? [], item];

  return [
    tab,
    item, // Since tab.items contains this already, it's not necessary to return it, but it doesn't hurt
  ];
}

export const removeItemFromTab: Adapter<typeof RemoveItemFromTab> = async (op) => {
  forwardOperation(op);
  const tab = getResourceByReference<z.infer<typeof Tab>>(`Tab:${op.tab}`);
  if(!tab) {
    throw new Error('Tab not found');
  }
  tab.items = tab.items.filter((item) => item.id !== op.item);
  return [
    tab,
  ];
}

export const listTabItems = async (op: z.input<typeof ListTabItems>) => {
  forwardOperation(op);
  const tab = getResourceByReference<z.infer<typeof Tab>>(`Tab:${op.tab}`);
  console.log(tab);
  if(!tab) {
    throw new Error('Tab not found');
  }
  return tab.items;
}