# AR Simulator - Monorepo

A monorepo project for AR Simulator with studio, trainer, and server applications.

## Project Structure

```
ar-simulator/
├── apps/
│   ├── studio/          # Vite + React + TypeScript app for AR content creation
│   └── trainer/         # Vite + React + TypeScript app for AR training
├── server/              # Node.js + Express + TypeScript backend
├── packages/
│   └── shared/          # Shared TypeScript types and utilities
└── package.json         # Root workspace configuration
```

## Prerequisites

- Node.js 18+ and npm 9+
- Firebase project with credentials

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will install dependencies for all workspaces (studio, trainer, server, and shared).

### 2. Configure Environment Variables

#### For Studio App (`apps/studio/.env`)

Copy from `.env.example`:

```bash
cp apps/studio/.env.example apps/studio/.env
```

Then fill in your Firebase credentials:

```
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
```

#### For Trainer App (`apps/trainer/.env`)

Copy from `.env.example`:

```bash
cp apps/trainer/.env.example apps/trainer/.env
```

Fill in the same Firebase credentials as the studio app.

#### For Server (`server/.env`)

Copy from `.env.example`:

```bash
cp server/.env.example server/.env
```

Then configure:

```
PORT=3000
FIREBASE_PROJECT_ID=your_project_id_here
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
```

Place your Firebase service account JSON file at `server/serviceAccountKey.json`.

## Running the Applications

### Development Mode

Run all applications in development mode:

```bash
# Terminal 1: Studio app (runs on http://localhost:5173)
npm run dev:studio

# Terminal 2: Trainer app (runs on http://localhost:5174)
npm run dev:trainer

# Terminal 3: Server (runs on http://localhost:3000)
npm run dev:server
```

### Building

Build all applications:

```bash
npm run build
```

Build specific applications:

```bash
npm run build:studio
npm run build:trainer
npm run build:server
```

## API Endpoints

### Server Health Check

```bash
GET http://localhost:3000/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2026-02-03T08:22:20.468Z"
}
```

## Shared Types

The `packages/shared` package contains shared TypeScript types used across the monorepo:

- `Project` - AR project metadata
- `Step` - Training step within a project
- `User` - User account information
- `TrainingSession` - User training session tracking
- `ARMarker` - AR marker configuration

## Environment Variables Reference

### Studio & Trainer Apps

| Variable                            | Description                  |
| ----------------------------------- | ---------------------------- |
| `VITE_FIREBASE_API_KEY`             | Firebase API key             |
| `VITE_FIREBASE_AUTH_DOMAIN`         | Firebase auth domain         |
| `VITE_FIREBASE_PROJECT_ID`          | Firebase project ID          |
| `VITE_FIREBASE_STORAGE_BUCKET`      | Firebase storage bucket      |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID`              | Firebase app ID              |

### Server

| Variable                        | Description                                |
| ------------------------------- | ------------------------------------------ |
| `PORT`                          | Server port (default: 3000)                |
| `FIREBASE_PROJECT_ID`           | Firebase project ID                        |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to Firebase service account JSON file |

## Development Notes

- All apps use TypeScript for type safety
- Studio and Trainer use Vite for fast development and building
- Server uses Express for REST API
- Firebase is used for authentication and data storage
- Shared types ensure consistency across the monorepo

## Troubleshooting

### Firebase initialization errors

Ensure your `.env` files have the correct Firebase credentials. Check the Firebase console for your project settings.

### Port conflicts

If ports 5173, 5174, or 3000 are already in use, you can modify the port configuration in:

- `apps/studio/vite.config.ts` (port 5173)
- `apps/trainer/vite.config.ts` (port 5174)
- `server/.env` (PORT variable)

### Module not found errors

Run `npm install` again to ensure all dependencies are installed across all workspaces.
