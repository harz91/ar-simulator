AR Simulator MVP

Overview
- Monorepo with Studio authoring app, Trainer playback app, and Node.js API for baking GLB animations.

Repository Structure
- apps/studio: React + Three.js authoring tool.
- apps/trainer: React + <model-viewer> playback tool.
- server: Express + glTF baking.
- packages/shared: shared TypeScript types.

Firebase Setup
1) Create a Firebase project and enable Authentication (Anonymous), Firestore, and Storage.
2) Create a Web App in Firebase and copy config values.
3) Create a service account JSON and store it locally for the server.
4) Configure Storage CORS for local dev if needed.

Environment Variables
Studio (apps/studio/.env)
- VITE_FIREBASE_API_KEY=...
- VITE_FIREBASE_AUTH_DOMAIN=...
- VITE_FIREBASE_PROJECT_ID=...
- VITE_FIREBASE_STORAGE_BUCKET=...
- VITE_FIREBASE_MESSAGING_SENDER_ID=...
- VITE_FIREBASE_APP_ID=...
- VITE_SERVER_URL=http://localhost:8787

Trainer (apps/trainer/.env)
- VITE_SERVER_URL=http://localhost:8787

Server (server/.env)
- FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
- FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
- PORT=8787

Firestore Rules
- See firestore.rules for owner-only access. Adjust as needed for trainer read access.

Local Development
1) Install dependencies
- npm install

2) Build shared package
- npm run build -w packages/shared

3) Start services
- npm run dev:server
- npm run dev
- npm run dev:trainer

End-to-End Flow
1) In Studio, create a project.
2) Upload a GLB (no animations). The client indexes mesh nodes and stores metadata.
3) In the inspector, select a part, capture from/to, and save to a step.
4) Create steps, preview, and bake via the server.
5) Trainer loads /train/:projectId and plays baked step animations with AR support.

Deployment (optional)
- Deploy the server to any Node.js host.
- Deploy Studio/Trainer to Firebase Hosting or static host.

Notes
- Displacements are node translations, stored with node path and index fallback.
- Baking uses @gltf-transform to create one animation per step.
