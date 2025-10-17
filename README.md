# CollabCanvas 🎨

A real-time collaborative canvas application built with React, TypeScript, Firebase, and Konva. Multiple users can draw, create shapes, and interact on a shared canvas with live cursor tracking and presence awareness.

## Live Demo

Visit the deployed app here: [`https://collabcanvas-1fd25.web.app/`](https://collabcanvas-1fd25.web.app/)

## Features

- 🎨 **Interactive Canvas**: Pan, zoom, and manipulate objects on an infinite canvas
- 👥 **Real-Time Collaboration**: See other users' changes instantly with <100ms latency
- 🖱️ **Multiplayer Cursors**: View other users' cursors with name labels in real-time
- 📦 **Shape Creation**: Create and manipulate rectangle shapes (more shapes coming post-MVP)
- ✏️ **Object Manipulation**: Move, resize, and delete objects with drag-and-drop
- 🔐 **Authentication**: Email/Password and Google Sign-In support
- 💾 **State Persistence**: Canvas state persists across sessions and refreshes
- 👀 **Presence Awareness**: See who's online and collaborating in real-time

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Canvas Library**: Konva + React-Konva
- **Backend**: Firebase (Authentication + Realtime Database)
- **Routing**: React Router v7
- **Styling**: CSS with CSS Variables

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
```

> **Note**: The `.env.local` file is gitignored and will not be committed to version control.

### 5. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 6. Build for Production

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

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

## MVP Requirements Checklist

### Canvas System

- ✅ Pan and zoom functionality
- ✅ Bounded workspace with visual boundaries
- ✅ Smooth 60 FPS performance

### Object Manipulation

- ✅ Rectangle shapes with default size (150x100) and color (#3B82F6)
- ✅ Create objects via toolbar button (appears at canvas center)
- ✅ Move objects (drag to reposition)
- ✅ Resize objects (drag corner/edge handles)
- ✅ Delete objects (Delete key or button)
- ✅ Single object selection (click to select)

### Real-Time Collaboration

- ✅ Real-time sync between 2+ users (<100ms)
- ✅ Multiplayer cursors with name labels (<50ms)
- ✅ Presence awareness (sidebar shows online users)
- ✅ Last-write-wins conflict resolution
- ✅ Support for 5+ concurrent users

### Authentication

- ✅ Email/Password authentication
- ✅ Google Sign-In authentication

### Persistence

- ✅ Canvas state persists on disconnect/refresh
- ✅ Deployed and publicly accessible

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

This is an MVP project. Contributions for post-MVP features are welcome!

### Planned Post-MVP Features

- Multiple canvas support (currently uses single "default" canvas)
- More shape types (circles, lines, text, images)
- Color picker for shapes
- Undo/redo functionality
- Export canvas as image
- Real-time chat
- Canvas permissions and access control

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ using React, TypeScript, Firebase, and Konva
