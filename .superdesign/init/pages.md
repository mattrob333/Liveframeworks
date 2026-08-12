# Page dependency trees

## `/` — Pipeline

Entry: `app/page.jsx`

- `app/page.jsx`
  - `lib/frameworks.js`
  - `lib/store.js`
- `app/layout.jsx`
  - `app/globals.css`
  - `components/Nav.jsx`
    - `lib/store.js`

## `/framework/[id]` — Framework workspace

Entry: `app/framework/[id]/page.jsx`

- `app/framework/[id]/page.jsx`
  - `lib/frameworks.js`
  - `lib/store.js`
  - `components/Chat.jsx`
    - `lib/frameworks.js`
    - `lib/store.js`
    - `lib/agentContext.js`
      - `lib/frameworks.js`
- `app/layout.jsx`
  - `app/globals.css`
  - `components/Nav.jsx`
    - `lib/store.js`

## `/settings` — API key

Entry: `app/settings/page.jsx`

- `app/settings/page.jsx`
  - `lib/store.js`
- `app/layout.jsx`
  - `app/globals.css`
  - `components/Nav.jsx`
    - `lib/store.js`

## `/export` — Engagement snapshot

Entry: `app/export/page.jsx`

- `app/export/page.jsx`
  - `lib/frameworks.js`
  - `lib/store.js`
- `app/layout.jsx`
  - `app/globals.css`
  - `components/Nav.jsx`
    - `lib/store.js`

## `/api/chat` — Anthropic edge proxy

Entry: `app/api/chat/route.js`

- `app/api/chat/route.js` (no local imports)
