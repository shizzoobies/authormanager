# Author Platform

Shared infrastructure for the Alexi Hart and Alexandra Knight author brands.

## Structure

```
platform/
  apps/
    api/        Express + Prisma + Postgres backend (Railway)
    desktop/    Electron + React + Vite control center
  packages/
    shared-ui/        Theme-able component library
    shared-prompts/   Pen-name voice prompts for AI drafts
    api-client/       Typed fetch client used by desktop and sites
    content-schema/   MDX frontmatter types
  infra/
    listmonk/   Listmonk Railway deployment notes
```

The two Astro sites live in separate repos:

- `../alexi-hart/` from https://github.com/shizzoobies/Alexi-Hart.git
- `../alexandra-knight/` from https://github.com/shizzoobies/Alexandra-Knight.git

## Prerequisites

- Node 20+
- pnpm 10+ (via Corepack)
- Postgres for local API dev (or Railway-managed for shared dev)

## Setup

```
pnpm install
```

## House rules

No em dashes anywhere in code, comments, or copy. Locked.
