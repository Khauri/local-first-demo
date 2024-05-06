# Local First Demo

This is a demo of a local-first web application written in Marko using Marko/Run for simplicity.

The goal is to create an application where changes can occur with no internet connection.

Requires Node 20+ (Or else you'll see an error about missing ReadbableStream)

```sh
npm install
npm run dev
```

Then navigate to http://localhost:3000

## How does it work?

In general this is based on ideas from [GraphQL caching](https://graphql.org/learn/caching/) and my earlier [unfinished project](https://github.com/Khauri/Docucache) on the topic which was made to be a generalization of GraphQL-style caching and optimistic rendering. 

First you must conceptualize all of your resources as types (this is a builtin feature of GraphQL). In this example we have Tabs and Items that can be placed on the Tab. Every instance of one of the types is called a Resource (or Document). Your Resources must all be uniquely identifiable. In this case I've chosen to generate a unique id by combining the `type` name with an `id` field. Zod validation and TS is used to here to ensure the Resources are constructed correctly.

Next you must define actions. An action, which is similar to a GraphQL mutation, on a base level will take in some input and then return one or more resources that were modified. An action will take in an "Operation" type, which will also have a unique identifier so that the result of the action can be cached.

In order to support a local-first application, your actions will typically have both a server-side implementation and a client side implementation. 

The client-side implementation's job is to predict what resources will be changed by the server after the operation takes place. This is also usually accompanied with pending states or other metadata.

The server-side implementation does what you'd expect and actually applies the changes to a database. The server-side implementation should resolve with the actual changed documents.

Zod and TS is again used here to ensure operations are properly defined and passed around.

The UI is reactive based on the state of your cache (or store). When Resources are updated, the UI elements that use them are also automatically updated to reflect these new changes. 

### The document store

The document store is where all your resources go on the client. The store can be indexeddb backed or a simple in-memory cache.

Before a Resource can be stored here it must be normalized. This means all nested documents are converted to a simple ref, usually a string formatted like `ref:<uid>`. Each nested document is then stored in the store as a separate entity. Normalizing each nested resource recursively and pulling out each resource individually is a process called flattening.

When a resource is pulled from the document store it is un-flattened. The entire flattening and unflatting process is opaque to the business layer, but provides a very caching important feature.

Flattening allows documents to be returned from actions that are arbitrarily nested. The most common use case is having two actions that return data about the same Resource. For example, adding an Item to a Tab increases the balance due on the tab.

#### Invalidation

There are times when an action needs to invalidate other actions. For example, say you have a list of items you would like to be re-fetched whenever a new item is added from somewhere. 
One possible way would be to update the list in your action, but this can be cumbersome. Another way is to invalidate the list and have the operation re-fetch upon invalidation.

## FAQ

> If I create a resource on the client and sync it to the server, how will I know which resource is being edited when it comes back from the server?

In most cases you should generate a UUID on the client and this UUID will be used for the resource. More specifically you could generate a [ULID](https://github.com/oklog/ulid). ULID's/UUID's have strong guarantees that when created in a decentralized environment you are unlikely to experience collisions. However, for very large tables, indexing a uuid might have massive performance costs. (This might be where you consider database sharding).

In other cases it might be better to deterministically create an id based on properties of the resource. For example, a new item on a tab might have an id consisting of the tab id + product id + hash of the modifiers selected. This can be especially good for a table that might have so many rows that it's not feasible to index a uuid or check for collisions, therefor a deterministically generated id that's guaranteed to be unique for each row not only solves some performance issues, but is also reconstructable in various environments without specifically passing around a generated id.

> What happens when you're offline? 

Your operations are placed in a queue and then played back when you're online. Ideally this queue should be stored in an external location such as indexeddb or localStorage. (It may be worth noting that any action you take offline can be lost if you clear your cache or your device gets lost or something.)

When forwarding actions to a server, the server may need to properly detect when a conflict occurs. This conflict should trigger an appropriate warning or error message on the device and offer some conflict resolution steps if necessary.

It's _very_ important that the UI reflect that some particular actions are still pending, and when necessary, prevent the user from performing other actions when updates are pending.

> What happens when you come back online and multiple updates cause the UI to freak out due to things like statuses in the cache being overwritten.

To avoid UI jank we might want the ability to "freeze" the UI while the sync is in progress.
Or optionally, we may intelligently dedupe certain updates. For example, a call to list the tabs or tab items doesn't necessarily need to be run multiple times. Only the last instance needs to be run.

> What if multiple users are on the same device but have different permissions? How will the offline cache work?

There are two main options:

1. Structure the ids for your actions such that they include the user's id or other identifiable information
2. Clear the cache (or clear specific values) when the user is switched

The former is good if it's okay to re-use _some_ information from a previous session on the same device. The latter is better if you want more hardened security. Both can be used together