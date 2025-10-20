# CollabCanvas 🎨

A real-time collaborative canvas application built with React, TypeScript, Firebase, and Konva. Multiple users can draw, create shapes, and interact on a shared canvas with live cursor tracking and presence awareness.

## Live Demo

Visit the deployed app here: [`https://collabcanvas-1fd25.web.app/`](https://collabcanvas-1fd25.web.app/)

## Features

### Core Canvas

- 🎨 **Interactive Canvas**: Pan, zoom, and manipulate objects on an infinite canvas
- 👥 **Real-Time Collaboration**: See other users' changes instantly with <100ms latency
- 🖱️ **Multiplayer Cursors**: View other users' cursors with name labels in real-time
- 📦 **Multiple Shapes**: Rectangles, circles, stars, lines, and text objects
- ✏️ **Object Manipulation**: Move, resize, rotate, and delete objects with drag-and-drop
- 🎨 **Styling**: Colors, strokes, opacity, and blend modes
- 🔐 **Authentication**: Email/Password and Google Sign-In support
- 💾 **State Persistence**: Canvas state persists across sessions and refreshes
- 👀 **Presence Awareness**: See who's online and collaborating in real-time

### Workflow Features

- ⌨️ **Keyboard Shortcuts**: 10+ shortcuts for efficient design work
- 📋 **Clipboard Operations**: Copy, paste, cut, and duplicate objects
- 📚 **Layers Panel**: Manage z-order with drag-to-reorder
- 📐 **Alignment Tools**: Align and distribute objects precisely
- 📤 **Export**: Export as PNG (2x) or SVG vector format

### AI-Powered Design 🤖

- 💬 **Natural Language Commands**: Create and manipulate objects using conversational AI
- 🧠 **Multi-Step Reasoning (ReAct)**: AI automatically handles complex query-dependent operations
- 🔍 **Smart Queries**: "Delete all green shapes", "Move all circles to the right"
- 🎯 **Context Awareness**: AI understands canvas state and can filter by color, type, or size
- ⚡ **Real-Time Sync**: AI operations appear instantly to all collaborators
- 📊 **Attribution**: AI edits are labeled "AI Agent (requested by User)"

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Canvas Library**: Konva + React-Konva
- **Backend**: Firebase (Authentication + Realtime Database + Cloud Functions)
- **AI**: OpenAI GPT-4 Turbo with Function Calling
- **Routing**: React Router v7
- **Styling**: CSS with CSS Variables

## Architecture

The app is a client-first realtime canvas with Firebase-backed collaboration and an optional AI assistant powered by Cloud Functions.

- UI components live under `src/components` (canvas, collaboration, layout, AI panel)
- State and actions via React Contexts:
  - `AuthContext` (auth state + actions)
  - `CanvasContext` (objects, selection, transforms, sync, clipboard, layers, alignment)
  - `AIContext` (chat state, tool execution queue, multi-iteration ReAct loop)
- Hooks: `useAuth`, `useCanvas`, `usePresence`, `useRealtimeSync`, `useKeyboardShortcuts`, `useConnectionStatus`
- Services: `authService`, `canvasService`, `presenceService`, `transactionService`, `aiService`
- Utilities: `canvasHelpers`, `syncHelpers`, `alignmentHelpers`, `multiSelectHelpers`, `exportHelpers`, `svgGenerator`, `clipboardManager`, `offlineQueue`, `indexedDBManager`, `performanceMonitor`, `aiToolExecutor`, `aiCommandQueue`
- Routing: `/` (Landing), `/login`, `/signup`, `/canvas` (protected by `AuthGuard`)

Data model (Firebase Realtime Database):

- Canvases: `/canvases/default/objects/{objectId}` with base fields like `id`, `type`, `x`, `y`, `width`, `height`, `color`, optional stroke/opacity/blend/rotation/zIndex, attribution fields, timestamps
- Users: `/users/{userId}`
- Presence: `/presence/default/{userId}` (online, cursor, lastSeen)
- Optional: `/operationQueue/{userId}/{operationId}` for offline queueing

AI flow (optional):

1. User submits a command in `AIChatPanel`
2. Client calls Cloud Function `{VITE_FIREBASE_FUNCTIONS_URL}/aichat`
3. Function summarizes canvas state and builds a system prompt
4. OpenAI returns tool calls, validated on the server via Zod
5. Client executes tools via `CanvasContext`, syncing results to all users

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v20.19+ or v22.12+ (recommended)
- **npm**: v10+ (comes with Node.js)
- **Firebase Account**: [Create one here](https://console.firebase.google.com/)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/ankitrijal2054/CollabCanvas
cd collabcanvas
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Setup

#### Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter project name (e.g., "CollabCanvas")
4. Follow the setup wizard

#### Enable Firebase Services

**Authentication:**

1. In Firebase Console, go to **Build → Authentication**
2. Click "Get started"
3. Enable **Email/Password** sign-in method
4. Enable **Google** sign-in method

**Realtime Database:**

1. In Firebase Console, go to **Build → Realtime Database**
2. Click "Create Database"
3. Choose a database location
4. Start in **test mode** (we'll add security rules later)

#### Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll to "Your apps" section
3. Click the web icon (`</>`) to add a web app
4. Register your app with a nickname
5. Copy the Firebase configuration object

### 4. Environment Configuration

Create a `.env.local` file in the project root:

```bash
cp .env.local.example .env.local
```

Fill in your Firebase configuration values:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com

# Firebase Functions URL (for AI features)

# For local development with emulator:
VITE_FIREBASE_FUNCTIONS_URL=http://127.0.0.1:5001/your-project-id/us-central1

# For production:
# VITE_FIREBASE_FUNCTIONS_URL=https://us-central1-your-project-id.cloudfunctions.net

# AI Configuration
# Enable/disable ReAct loop for multi-step reasoning (default: true)
VITE_AI_REACT_ENABLED=true

# Maximum iterations per AI command (default: 5)
VITE_AI_REACT_MAX_ITERATIONS=5
```

### 5. AI Features Setup

To enable AI-powered design features:

1. **Set up Firebase Cloud Functions:**

   ```bash
   cd functions
   npm install
   ```

2. **Configure OpenAI API Key:**

   - Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Set it as a Firebase secret:
     ```bash
     firebase functions:secrets:set OPENAI_API_KEY
     ```

3. **Deploy Cloud Functions:**
   ```bash
   firebase deploy --only functions
   ```

For detailed AI configuration options, see [`REACT_CONFIG.md`](REACT_CONFIG.md).

> **Note**: AI features require an OpenAI API key and will incur usage costs (~$0.01-0.02 per command).

### 6. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 7. Build for Production

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Run the full stack locally (with Firebase Emulators)

If you want to test the full experience locally (Auth, Realtime DB, Functions):

1. Install dependencies at the project root and in `functions/`:

   ```bash
   npm install
   cd functions && npm install && cd ..
   ```

2. Start the Firebase emulators from the project root:

   ```bash
   firebase emulators:start
   ```

   Emulator UI: `http://localhost:4000`

3. In another terminal, start the frontend dev server:

   ```bash
   npm run dev
   ```

4. Ensure your `.env.local` points `VITE_FIREBASE_FUNCTIONS_URL` to the emulator base URL, e.g.:

   ```env
   VITE_FIREBASE_FUNCTIONS_URL=http://127.0.0.1:5001/your-project-id/us-central1
   ```

   The frontend will call `{VITE_FIREBASE_FUNCTIONS_URL}/aichat` for AI.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Dependencies

Key runtime dependencies used in the frontend:

- React, React DOM, React Router
- Vite (dev/build tool)
- Konva and React-Konva (canvas rendering)
- Firebase (Auth, Realtime Database, Hosting)
- Zod (runtime validation)
- TypeScript (types)

## AI Command Examples

CollabCanvas supports natural language commands powered by GPT-4. Here are some examples:

### Single-Step Commands

- "Create a red rectangle at 200, 200"
- "Add text 'Hello World' at 100, 100"
- "Make the selected shape blue"
- "Move the selected object 50 pixels to the right"

### Multi-Step Commands (ReAct)

These commands automatically query the canvas first, then perform actions:

- "Delete all green shapes"
- "Move all circles 100 pixels down"
- "Make all rectangles red"
- "Arrange all blue shapes in a horizontal row"

### Query Commands

- "What objects are on the canvas?"
- "Find all red shapes"
- "How many circles are there?"

### Complex Commands

- "Create a login form with title, email field, password field, and login button"
- "Create a 3x3 grid of blue squares"
- "Align all selected objects to the left"

For more information, see:

- [`REACT_CONFIG.md`](REACT_CONFIG.md) - AI configuration guide
- [`PR27_TEST_PLAN.md`](PR27_TEST_PLAN.md) - Comprehensive test scenarios
- [`PR27_IMPLEMENTATION_SUMMARY.md`](PR27_IMPLEMENTATION_SUMMARY.md) - Technical details

## Deployment

### Deploy to Firebase Hosting

1. Install Firebase CLI:

```bash
npm install -g firebase-tools
```

2. Login to Firebase:

```bash
firebase login
```

3. Initialize Firebase Hosting (if not already done):

```bash
firebase init hosting
```

4. Build and deploy:

```bash
npm run build
firebase deploy
```

Your app will be live at: `https://your-project-id.web.app`

This project is currently live at: [`https://collabcanvas-1fd25.web.app/`](https://collabcanvas-1fd25.web.app/)

## Troubleshooting

### Firebase Connection Issues

**Problem**: "Firebase not connecting" or "Failed to initialize"

- ✅ Check `.env.local` has all Firebase config values
- ✅ Verify Firebase project is active in Firebase Console
- ✅ Ensure Authentication and Realtime Database are enabled

### Build Errors

**Problem**: TypeScript errors during build

- ✅ Run `npm install` to ensure all dependencies are installed
- ✅ Check TypeScript version compatibility
- ✅ Clear `node_modules` and reinstall: `rm -rf node_modules package-lock.json && npm install`

### Development Server Issues

**Problem**: "Port already in use"

- ✅ Kill the process using the port: `lsof -ti:5173 | xargs kill -9`
- ✅ Or use a different port: `npm run dev -- --port 3000`

## Contributing

Contributions are welcome! This project has evolved through multiple phases.

### Completed Features

**Phase 1 (MVP):**

- ✅ Basic canvas with pan/zoom
- ✅ Rectangle shapes
- ✅ Real-time collaboration
- ✅ Authentication (Email + Google)
- ✅ State persistence

**Phase 2 (Infrastructure & Creative Tools):**

- ✅ Multiple shape types (circles, lines, stars, text)
- ✅ Stroke customization and opacity
- ✅ Rotation and multi-select
- ✅ Keyboard shortcuts
- ✅ Alignment and distribution tools
- ✅ Export (PNG 2x, SVG)
- ✅ Layers panel
- ✅ Offline support with conflict resolution

**Phase 3 (AI Integration):**

- ✅ Natural language commands (16 AI tools)
- ✅ Multi-step reasoning (ReAct pattern)
- ✅ Context-aware AI operations
- ✅ Real-time collaboration with AI attribution

### Planned Future Features

- Multiple canvas support (currently uses single "default" canvas)
- AI undo/redo functionality
- More AI query tools (by size, position, etc.)
- Canvas permissions and access control
- Import from Figma/Sketch
- Component library support

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ using React, TypeScript, Firebase, and Konva
