import * as z from 'zod';
import { Operation } from './schema';
import { flattenResources } from './utils';

export type Adapter<T extends z.ZodTypeAny = any> = (operation: z.input<T>) => Promise<any[]> | any[];

type AdapterRecord = {
  [key: string]: Adapter;
} & {
  store?: (resources: any[]) => Promise<boolean>;
};

const defaultAdapter: AdapterRecord = typeof window !== 'undefined' ? await import('./actions.client') : await import('./actions.server');

export async function perform(operation: z.input<typeof Operation>, adapter = defaultAdapter) {
  if(!adapter) {
    throw new Error('An adapter must be provided to perform actions');
  }
  if(typeof window === 'undefined') {
    // Add an artificial delay to simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500));
  }
  
  // You can very easily imagine that an operation consists of a type and a payload. An operation_id could also be included
  const op = Operation.parse(operation);
  const result = await adapter[op.type](op);
  await adapter.store?.(
    [
      {
        type: operation.type,
        id: operation.oid,
        data: result
      },
    ]
  );
  return result;
}