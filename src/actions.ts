import * as z from 'zod';
import { Operation } from './schema';
import { flattenResources } from './utils';

export type Adapter<T extends z.ZodTypeAny = any> = (operation: z.output<T>, opts: any) => Promise<any[]> | any[];

type AdapterRecord = {
  [key: string]: Adapter;
} & {
  store?: (resources: any[]) => Promise<boolean>;
};

const defaultAdapter: AdapterRecord = typeof window !== 'undefined' 
  ? await import('./actions.client') 
  : await import('./actions.server');

export async function perform(operations: z.input<typeof Operation> | z.input<typeof Operation>[], opts: any, adapter = defaultAdapter) {
  if(!adapter) {
    throw new Error('An adapter must be provided to perform actions');
  }
  if(typeof window === 'undefined') {
    // Add an artificial delay on the server to simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500));
  }
  if(!Array.isArray(operations)) {
    operations = [operations];
  }
  const results: any[] = [];
  for(const operation of operations) {
    // You can very easily imagine that an operation consists of a type and a payload. An operation_id could also be included
    const op = Operation.parse(operation);
    const result = await adapter[op.type](op, opts);
    results.push({
      type: op.type,
      id: op.oid,
      data: result
    });
  }
  await adapter.store?.(results);
  return results;
}
