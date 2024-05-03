export function isResource(maybeResource: any) {
  return maybeResource?.type && maybeResource?.id;
}

export function resourceToRef(resource: any) {
  return 'ref:' + resource.type + ':' + resource.id;
}

/**
 * Given an arbitrarily nested list of resources, this function flattens the list into a single list of resources complete with backreferences
 * This data can be stored in a cache and passed around to clients or whatever.
 * E.g.
 *  flattenResources([
 *    {
 *      type: 'Tab', 
 *      id: '1',
 *      items: [{type: 'Item', id: '1'}, {type: 'Item', id: '2'}]
 *    }
 *  ]);
 *  // Returns [{type: 'Tab', id: '1', items: ['ref:Item:1', 'ref:Item:2']}, {type: 'Item', id: '1'}, {type: 'Item', id: '2'}]
 */ 
export function flattenResources(resources: any[]) {
  resources = JSON.parse(JSON.stringify(resources));
  const cache = new Map<string, any>();
  const result: any[] = [];
  const stack = [...resources];
  while(stack.length) {
    const resource = stack.pop();
    if(!isResource(resource)) {
      // Skip non-resource objects (why are you passing this in forehead?)
      continue;
    }
    const ref = resource.type + ':' + resource.id;
    if(cache.has(ref)) {
      // Skip already processed resources
      continue;
    }
    cache.set(ref, resource);
    result.push(resource);
    Object.entries(resource).forEach(([key, value]) => {
      if(isResource(value)) {
        stack.push(value);
        resource[key] = resourceToRef(value);
      } else if(Array.isArray(value) && value.some(isResource)) {
        // TODO: if this is a heterogenous array we might want to throw an error or handle it differently
        stack.push(...value);
        resource[key] = value.map((v) => resourceToRef(v));
      }
    });
  }
  return result;
}