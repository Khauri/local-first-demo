# Local First Demo

This is a demo of a local-first web application written in Marko using Marko/Run for simplicity

## Generalizable ideas

- All resources (documents) need to be clearly marked with a `type` and `id` which will create a unique reference for caching. e.g. `Tab:1`
- Operations are also resources and can also be cached
- Resources are flattened by replacing nested resources with refs. ie `ref:<type>:<id>`
- The server and the browser are both clients to an imaginary higher power of data construction