# Collab Editor

Real-time collaborative document editor built with Next.js 15 and NestJS 11.

## Tech Stack

### Frontend
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Tiptap Editor
- Yjs for real-time collaboration
- Zustand for state management

### Backend
- NestJS 11
- Prisma ORM
- PostgreSQL
- Redis
- WebSocket (Socket.io)
- JWT Authentication

## Prerequisites

- Node.js 22 LTS
- pnpm 10+
- Docker & Docker Compose

## Getting Started

### 1. Install Dependencies

```bash
# Switch to Node 22
nvm use 22

# Install dependencies
pnpm install
```

### 2. Start Database Services

```bash
# Start PostgreSQL and Redis
pnpm db:up

# Wait for services to be ready
docker ps
```

### 3. Setup Database

```bash
# Generate Prisma client and run migrations
cd backend
pnpm db:migrate

# (Optional) Seed database
pnpm db:seed
```

### 4. Start Development Servers

```bash
# From root directory - starts both frontend and backend
pnpm dev

# Or start individually
pnpm dev:backend  # Backend on http://localhost:3001
pnpm dev:frontend # Frontend on http://localhost:3000
```

## Project Structure

```
collab-editor/
├── frontend/          # Next.js 15 frontend
│   ├── app/           # App router pages
│   ├── components/    # React components
│   ├── hooks/         # Custom hooks
│   ├── lib/           # Utilities
│   ├── providers/     # React context providers
│   ├── stores/        # Zustand stores
│   └── types/         # TypeScript types
│
├── backend/           # NestJS 11 backend
│   ├── src/
│   │   ├── modules/   # Feature modules
│   │   ├── prisma/    # Prisma service
│   │   ├── config/    # Configuration
│   │   └── common/    # Shared utilities
│   └── prisma/        # Database schema
│
└── docs/              # Technical documentation
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all services |
| `pnpm dev:backend` | Start backend only |
| `pnpm dev:frontend` | Start frontend only |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |
| `pnpm db:up` | Start Docker services |
| `pnpm db:down` | Stop Docker services |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:seed` | Seed database |

## Environment Variables

See `.env.example` for required environment variables.

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Documents
- `GET /api/documents` - List documents
- `POST /api/documents` - Create document
- `GET /api/documents/:id` - Get document
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document

### Versions
- `GET /api/documents/:id/versions` - List versions
- `POST /api/documents/:id/versions` - Create version

## Development Guide

For AI-assisted development guidelines, see [AGENTS.md](./AGENTS.md).

## Monorepo Architecture

This project uses **pnpm workspace** for monorepo management:

- **frontend/** - Next.js 15 application
- **backend/** - NestJS 11 application
- **packages/** - Shared configurations (ESLint, Prettier, TypeScript)

Build system powered by **Turborepo** for efficient task orchestration.

## Documentation

Technical documentation is available in `../docs/`:

- [Architecture](../docs/01-architecture/) - System design
- [Security](../docs/02-security/) - Security specifications
- [Frontend](../docs/03-frontend/) - Frontend development
- [Backend](../docs/04-backend/) - Backend development
- [Collaboration](../docs/05-collaboration/) - Real-time features
- [Deployment](../docs/06-deployment/) - Deployment guides

## License

MIT
