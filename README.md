# AR Simulator

A monorepo for AR Simulator with Studio, Trainer, and Server.

## Tech Stack
- React + Vite + TypeScript (apps)
- Node.js + Express + TypeScript (server)
- Firebase: Auth + Firestore + Storage
- Three.js for 3D in Studio
- <model-viewer> for Trainer AR

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build shared package:
   ```bash
   npm run build --workspace=ar-simulator-shared
   ```

3. Set up Firebase project with Firestore and Storage enabled.

4. Set up environment variables.

   For apps/studio/.env:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

   For apps/trainer/.env: same as studio.

   For server/.env:
   ```
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_PRIVATE_KEY=your_private_key
   FIREBASE_CLIENT_EMAIL=your_client_email
   FIREBASE_STORAGE_BUCKET=your_bucket
   PORT=3001
   ```

5. Run the apps:
   ```bash
   npm run dev:studio  # http://localhost:5175
   npm run dev:trainer # http://localhost:5176
   npm run dev:server  # http://localhost:3001
   ```

## Milestones Implemented
- Milestone 1: Repo + Firebase plumbing ✅
- Milestone 2: Firestore data model + project CRUD ✅
- Milestone 3: Upload GLB + index nodes/parts (client-side) ✅
- Milestone 4: Displacement authoring + step builder ✅
- Milestone 5: Baking service (server) ✅
- Milestone 6: Trainer app step player + AR ✅