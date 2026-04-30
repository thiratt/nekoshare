# Neko Share Web

Main browser app served at `nekoshare.app` and `share.nekoshare.app`.

## Runtime

This app uses TanStack Start in SPA mode. Start owns the client bootstrap and route shell, while production still serves static assets from nginx.

- Router factory: `src/router.tsx`
- Client entry: `src/client.tsx`
- Document shell and head tags: `src/routes/__root.tsx`
- Generated route tree: `src/routeTree.gen.ts`
- Static shell fallback: `dist/client/_shell.html`

## Commands

```bash
pnpm dev
pnpm build
pnpm test
pnpm lint
```

## Notes

- Routes remain file-based under `src/routes`.
- Use `Link`, route loaders, and route APIs from `@tanstack/react-router`.
- Use TanStack Start APIs from `@tanstack/react-start` only for Start-specific features such as server functions.
- Production Docker copies `dist/client` into nginx and rewrites unknown paths to `/_shell.html`.
