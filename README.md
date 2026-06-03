```txt
npm install
npm run dev
```

```txt
npm run deploy
```

For personal LINE notifications from Grab and Mangmoom syncs, set `PERSONAL_LINE_ID` to the LINE user ID that should receive push messages.

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```
