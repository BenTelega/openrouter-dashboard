# Workspace

pnpm workspace monorepo using TypeScript.

## Overview

This is a monorepo project managed with pnpm workspaces. Each package manages its own dependencies and can be built independently.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Project Structure

```
workspace/
├── lib/                      # Shared libraries
│   ├── api-client-react/     # React API client hooks
│   ├── api-spec/             # OpenAPI specification
│   ├── api-zod/              # Zod schemas for API validation
│   └── db/                   # Database schema and Drizzle ORM config
├── artifacts/                # Applications and services
│   ├── api-server/           # Express API server
│   ├── mockup-sandbox/       # Mockup preview sandbox
│   └── openrouter-dashboard/ # OpenRouter dashboard application
├── scripts/                  # Utility scripts
└── package.json              # Root package.json with workspace config
```

## Prerequisites

- Node.js 24+
- pnpm (installed globally or via corepack)

## Installation

```bash
pnpm install
```

## Key Commands

### Global Commands

- `pnpm run typecheck` — Full typecheck across all packages
- `pnpm run build` — Typecheck + build all packages

### Package-Specific Commands

```bash
# Regenerate API hooks and Zod schemas from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes (development only)
pnpm --filter @workspace/db run push

# Run API server in development mode
pnpm --filter @workspace/api-server run dev

# Build a specific package
pnpm --filter <package-name> run build
```

## Workspace Packages

### Libraries (`lib/`)

| Package | Description |
|---------|-------------|
| `@workspace/api-client-react` | React hooks for API consumption |
| `@workspace/api-spec` | OpenAPI specification and code generation |
| `@workspace/api-zod` | Zod schemas for API request/response validation |
| `@workspace/db` | Database schema, migrations, and Drizzle ORM configuration |

### Artifacts (`artifacts/`)

| Package | Description |
|---------|-------------|
| `@workspace/api-server` | Express 5 API server |
| `@workspace/mockup-sandbox` | Sandbox environment for mockup previews |
| `@workspace/openrouter-dashboard` | Dashboard application for OpenRouter |

## Development Workflow

1. **Install dependencies**: `pnpm install`
2. **Generate API types**: `pnpm --filter @workspace/api-spec run codegen`
3. **Run typecheck**: `pnpm run typecheck`
4. **Build all packages**: `pnpm run build`
5. **Start development server**: `pnpm --filter @workspace/api-server run dev`

## Adding New Packages

To add a new package to the workspace:

1. Create a new directory under `lib/` or `artifacts/`
2. Add a `package.json` with the appropriate name (`@workspace/<name>`)
3. The package will be automatically included in the workspace

## License

MIT
