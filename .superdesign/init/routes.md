# Route map

Framework: Next.js 14 App Router with React 18 client pages. Shared layout: `app/layout.jsx` and `components/Nav.jsx`.

| URL | Entry | Layout | Purpose |
| --- | --- | --- | --- |
| `/` | `app/page.jsx` | `app/layout.jsx` | Pipeline roster, evidence intake buckets, activation status, and the sticky intake editor. |
| `/framework/[id]` | `app/framework/[id]/page.jsx` | `app/layout.jsx` | Dedicated framework workspace with template, provenance, locked output, and agent chat. |
| `/settings` | `app/settings/page.jsx` | `app/layout.jsx` | Browser-local Anthropic API key and engagement reset. |
| `/export` | `app/export/page.jsx` | `app/layout.jsx` | Markdown snapshot preview, download, and print. |
| `/api/chat` | `app/api/chat/route.js` | none | Edge proxy to Anthropic Messages API using browser-supplied key. |

## Actual desktop render branches

- `/`: after the hydration guard, a header and two-column `.grid2` render. Left is the full pipeline; right is a sticky intake `.panel` that switches between empty guidance and the selected bucket editor.
- `/framework/[id]`: after unknown-route and hydration guards, a header and two-column `.grid2` render. Left is framework/template/provenance/output; right is the chat.
- `/settings` and `/export`: single-column main content beneath the shared top navigation.
