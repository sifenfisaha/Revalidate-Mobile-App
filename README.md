# Revalidation Tracker

Professional compliance tracking application for UK healthcare practitioners.

## Monorepo Structure

This is a monorepo managed with [pnpm](https://pnpm.io/) workspaces and [Turbo](https://turbo.build/repo) for build orchestration.

```
revalidation-tracker/
├── apps/
│   ├── mobile/          # React Native mobile app (Expo)
│   ├── api/             # Node.js/Express backend API
│   ├── web/             # Next.js web application
│   └── admin/           # Next.js admin dashboard
├── packages/
│   ├── config/          # Shared ESLint, Prettier, TypeScript configs
│   ├── shared-types/    # Shared TypeScript types
│   ├── utils/           # Shared utility functions
│   ├── constants/       # Shared constants
│   ├── validators/      # Shared validation schemas (Zod)
│   └── ui/              # Shared UI components
└── infra/               # Infrastructure and deployment configs
```

## Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 8.0.0

## Getting Started

### Installation

Install all dependencies:

```bash
pnpm install
```

### Development

Run all apps in development mode:

```bash
pnpm dev
```

Run specific apps:

```bash
# Mobile app (Expo)
pnpm mobile:dev
# Then scan QR code with Expo Go or press 'i' for iOS / 'a' for Android

# API server (runs on http://localhost:3000)
pnpm api:dev
# Visit http://localhost:3000 to see "Hello API"

# Web app (runs on http://localhost:3000)
pnpm web:dev
# Visit http://localhost:3000 to see "Hello Web"

# Admin dashboard (runs on http://localhost:3001)
pnpm admin:dev
# Visit http://localhost:3001 to see "Hello Admin"
```

### Building

Build all apps and packages:

```bash
pnpm build
```

### Linting and Formatting

Lint all code:

```bash
pnpm lint
```

Format all code:

```bash
pnpm format
```

Type check all code:

```bash
pnpm type-check
```

## Tech Stack

### Mobile App
- **React Native** with **Expo** SDK 54
- **Expo Router** for navigation
- **Zustand** for state management
- **TanStack Query** for server state
- **Expo SQLite** for offline data persistence
- **TypeScript** with strict mode

### Backend API
- **Node.js** with **Express**
- **TypeScript** with strict mode
- **CORS** enabled for cross-origin requests
- **Prisma** ORM with **PostgreSQL** (ready for setup)
- **Firebase Admin** for authentication (ready for setup)
- **Redis** for caching and sessions (ready for setup)
- **Stripe** for payment processing (ready for setup)

### Web Apps
- **Next.js** 14 with App Router
- **React** 18
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **TanStack Query** for data fetching
- **Zustand** for client state
- **TypeScript** with strict mode

### Shared Packages
- **TypeScript** for type safety across the stack
- **Zod** for runtime validation
- **ESLint** + **Prettier** for code quality

## Workspace Scripts

All apps and packages can be run with Turbo filters:

```bash
# Run dev for a specific package
turbo run dev --filter=mobile
turbo run dev --filter=api

# Run build for all packages
turbo run build

# Run tests
turbo run test
```

## Environment Variables

Each app requires its own environment variables. Create `.env.local` files in each app directory:

- `apps/mobile/.env.local`
- `apps/api/.env.local`
- `apps/web/.env.local`
- `apps/admin/.env.local`

See each app's README or documentation for required variables.

## Code Quality

- **TypeScript strict mode** is enabled across all packages
- **ESLint** enforces code style and catches errors
- **Prettier** formats code consistently
- All code must pass linting and type checking before merging

## Contributing

1. Create a feature branch: `git checkout -b feature/description`
2. Make your changes
3. Run linting and type checking: `pnpm lint && pnpm type-check`
4. Commit with conventional commits: `feat: add new feature`
5. Push and create a pull request

## License

Private - All rights reserved
