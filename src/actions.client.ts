/**
 * This is the client-side implementation of the actions.
 * This "predicts" what will happen on the server and returns the updated resources.
 */
import * as z from 'zod';
import {Tab, Item, CreateTab, AddItemToTab, RemoveItemFromTab, ListTabs, ListTabItems, BaseOperation} from './schema';
import type { Adapter } from './actions';
import EventEmitter from 'eventemitter3';
import { flattenResources } from './utils';
import { onNetworkStatusChange } from './offline';

function id() {
  return Math.random().toString(36).substring(7);
}

// This is a simple in-memory cache for storing resources
// In a real application, this would be replaced with indexxed or something similar
const cache = globalThis.cache = new Map<string, any>();
// We use an event emitter to notify when changes occur for a resource
// Mobx also works well for this
export const emitter = new EventEmitter();

const queue: [z.infer<typeof BaseOperation>, any][] = [];

let isOffline = false;
if(typeof window !== 'undefined') {
  onNetworkStatusChange(async (offline) => {
    isOffline = offline;
    // When the network comes back online we will flush the queue
    if(!offline) {
      emitter.emit('syncing', true);
      const ops = queue.map(([op]) => op);
      const results = await forwardOperation(ops, {store: false, shouldForward: true});
      const invalidations = new Set(...[queue.map(([op, opts]) => opts.invalidate).flat()]);
      console.log({results, invalidations});
      await store(results);
      // Run the invalidation logic after all operations have been performed
      for(const ref of invalidations) {
        emitter.emit('invalidate:' + ref, true);
      }
      // Clear the queue
      queue.length = 0;
      emitter.emit('syncing', false);
    }
  });
}

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
    console.log('Storing resource', ref, resource);
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

async function forwardOperation(op: z.infer<typeof BaseOperation>, opts: {invalidate?: string[], store?: boolean, shouldForward?: boolean} = {}): Promise<any[]> {
  if(opts.shouldForward === false) {
    return [];
  }
  // On the next tick we will invalidate the resources that are affected by this operation
  // Ideally these should only be client-side predictions and not forward operations.
  // This is tricky with the current architecture. Will need to think this a bit as you can currently spam a button and it will cause weird UI behavior
  setTimeout(() => {
    if(opts.invalidate) {
      for(const ref of opts.invalidate) {
        console.log('Invalidating [no-forward]', ref);
        emitter.emit('invalidate:' + ref, false);
      }
    }
  }, 0);
  // TODO: Detect when offline and queue operations for later (with restrictions. Not all operations can be forwarded when offline)
  try {
    if(isOffline) {
      throw new Error('Offline');
    }
    const response = await fetch('/api/perform', {
      method: 'POST',
      body: JSON.stringify(op),
    });
    // TODO: Error handling will be a big concern. To handle them properly you will want to ensure you can revert any changes
    if(!response.ok) {
      console.error('Failed to perform operation', response);
      return [];
    }
    console.log('Forwarded operation', op, opts);
    const result = await response.json();
    if(opts.store !== false) {
      await store(result);
      // After storing the resources, we can again run the invalidation logic, this time forward operations are available
      if(opts.invalidate) {
        for(const ref of opts.invalidate) {
          console.log('Invalidating [forward]', ref);
          emitter.emit('invalidate:' + ref, true);
        }
      }
    }
    return result;
  } catch(err) {
    // If the fetch request throws (due to network issues, etc.) we will queue the operation for later
    // NOTE: This will also throw if any of the other functions in the try does. In a real app you'd want to handle this better
    queue.push([op, opts]);
    return [];
  }
}

export const listTabs: Adapter<typeof ListTabs> = async (op) => {
  console.log('Listing tabs', op);
  forwardOperation(op);
  // Implementing searching/querying logic client-side is too complex for this demo but it could be done for sure
  const cachedTabs = Array.from(cache.values()).filter((resource) => resource.type === 'Tab');
  return cachedTabs;
};

export const createTab: Adapter<typeof CreateTab> = async (op) => {
  // listTabs will be invalidated once a new tab is created
  // TODO: support multiple resources by allowing invalidation by type
  op.id ??= id();
  forwardOperation(op, {invalidate: ['listTabs:all']});
  // Creating a tab creates a new tab
  // Note: it doesn't matter how you create these objects (e.g. use websql, firebase, generate it offline, or whatever you need)
  return [
    {
      type: 'Tab',
      id: op.id, // used for rendering/referencing in the UI
      status: 'PENDING',
      tab_name: `Tab ${op.id}`,
      balance_due: 0,
      is_paid: false,
      items: [],
      created: Date.now(),
    } satisfies z.infer<typeof Tab>,
  ];
}

export const addItemToTab: Adapter<typeof AddItemToTab> = async (op) => {
  op.id ??= id();
  forwardOperation(op, {invalidate: [`listTabItems:${op.tab}`]});
  // Depending on circumstances, we might make this return an immutable copy
  const tab = getResourceByReference<z.infer<typeof Tab>>(`Tab:${op.tab}`);
  if(!tab) {
    throw new Error('Tab not found');
  }
  tab.balance_due += op.quantity * op.product.price;
  const item = {
    type: 'Item',
    id: op.id,
    quantity: op.quantity,
    price: op.product.price,
    name: op.product.name,
    created: Date.now(),
    status: 'PENDING',
  } satisfies z.infer<typeof Item>;
  tab.items.push(item);
  // console.log(item, tab.items);
  return [
    tab,
    item, // Since tab.items contains this already, it's not necessary to return it, but it doesn't hurt
  ];
}

export const removeItemFromTab: Adapter<typeof RemoveItemFromTab> = async (op) => {
  forwardOperation(op, {invalidate: [`listTabItems:${op.tab}`]});
  const tab = getResourceByReference<z.infer<typeof Tab>>(`Tab:${op.tab}`);
  if(!tab) {
    throw new Error('Tab not found');
  }
  const item = tab.items.find((item) => item.id === op.item)!;
  item.status = 'REMOVING';
  return [item];
}

export const listTabItems: Adapter<typeof ListTabItems> = async (op) => {
  forwardOperation(op);
  const tab = getResourceByReference<z.infer<typeof Tab>>(`Tab:${op.tab}`);
  if(!tab) {
    throw new Error('Tab not found');
  }
  return tab.items;
}