# CollabCanvas - MVP Task List & PR Breakdown

## Project File Structure

```
collabcanvas/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── Login.tsx
│   │   │   ├── Signup.tsx
│   │   │   └── AuthGuard.tsx
│   │   ├── canvas/
│   │   │   ├── Canvas.tsx
│   │   │   ├── CanvasObject.tsx
│   │   │   └── CanvasControls.tsx
│   │   ├── collaboration/
│   │   │   ├── Cursor.tsx
│   │   │   ├── CursorLayer.tsx
│   │   │   └── PresenceList.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── Sidebar.tsx
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── CanvasContext.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useCanvas.ts
│   │   ├── usePresence.ts
│   │   └── useRealtimeSync.ts
│   ├── services/
│   │   ├── firebase.ts
│   │   ├── authService.ts
│   │   ├── canvasService.ts
│   │   └── presenceService.ts
│   ├── types/
│   │   ├── canvas.types.ts
│   │   ├── user.types.ts
│   │   └── collaboration.types.ts
│   ├── utils/
│   │   ├── canvasHelpers.ts
│   │   └── syncHelpers.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── tests/
│   ├── unit/
│   │   ├── utils/
│   │   │   ├── canvasHelpers.test.ts
│   │   │   └── syncHelpers.test.ts
│   │   ├── services/
│   │   │   ├── authService.test.ts
│   │   │   └── canvasService.test.ts
│   │   └── components/
│   │       ├── Cursor.test.tsx
│   │       └── CanvasObject.test.tsx
│   └── integration/
│       ├── auth-flow.test.tsx
│       ├── canvas-creation.test.tsx
│       └── realtime-sync.test.tsx
├── .env.local
├── .gitignore
├── firebase.json
├── .firebaserc
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## PR Breakdown & Task Checklist

### PR #1: Project Setup & Firebase Configuration

**Goal:** Initialize React + Vite + TypeScript project with Firebase integration

- [x] **Task 1.1: Initialize Vite + React + TypeScript project**

  - Files to create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`
  - Run: `npm create vite@latest collabcanvas -- --template react-ts`

- [x] **Task 1.2: Install core dependencies**

  - Files to update: `package.json`
  - Install: `firebase`, `react-konva`, `konva`, `react-router-dom`
  - Install dev dependencies: `@types/node`

- [x] **Task 1.3: Set up Firebase project & configuration**

  - Files to create: `src/services/firebase.ts`, `.env.local`, `firebase.json`, `.firebaserc`
  - Create Firebase project in console
  - Enable Authentication (Email/Password + Google Sign-In)
  - Enable Realtime Database
  - Add Firebase config to `.env.local`
  - Initialize Firebase in `firebase.ts`

- [x] **Task 1.4: Configure project structure**

  - Files to create: All folder structure from above
  - Files to update: `.gitignore` (add `.env.local`, `node_modules`, `dist`)
  - Create empty placeholder files for future components

- [x] **Task 1.5: Set up basic routing**

  - Files to create: `src/App.tsx`, `src/main.tsx`
  - Files to update: `src/index.css`
  - Create basic routing structure (login, canvas routes)

- [x] **Task 1.6: Create README with setup instructions**

  - Files to create: `README.md`
  - Include: Setup steps, Firebase configuration, running locally

- [x] **Task 1.7: Create constants file**
  - Files to create: `src/constants/canvas.ts`
  - Define: `DEFAULT_CANVAS_ID = "default"` (hardcoded for MVP, dynamic post-MVP)
  - Note: Used throughout app for single canvas, easily made dynamic later

**PR Title:** `feat: initial project setup with Firebase configuration`

---

### PR #2: Authentication System

**Goal:** Implement user authentication with Firebase Auth

- [x] **Task 2.1: Create TypeScript types for auth**

  - Files to create: `src/types/user.types.ts`
  - Define: `User`, `AuthState` interfaces

- [x] **Task 2.2: Build authentication service**

  - Files to create: `src/services/authService.ts`
  - Implement: `signUp()`, `signIn()`, `signInWithGoogle()`, `signOut()`, `getCurrentUser()`

- [x] **Task 2.3: Create Auth Context & Provider**

  - Files to create: `src/contexts/AuthContext.tsx`
  - Files to create: `src/hooks/useAuth.ts`
  - Implement: Auth state management, loading states, error handling

- [x] **Task 2.4: Build Login component**

  - Files to create: `src/components/auth/Login.tsx`
  - Implement: Login form with email/password inputs AND Google Sign-In button, error display

- [x] **Task 2.5: Build Signup component**

  - Files to create: `src/components/auth/Signup.tsx`
  - Implement: Signup form with name + email/password inputs AND Google Sign-In option, validation

- [x] **Task 2.6: Create AuthGuard component**

  - Files to create: `src/components/auth/AuthGuard.tsx`
  - Implement: Protected route wrapper, redirect logic

- [x] **Task 2.7: Update App routing with auth protection**

  - Files to update: `src/App.tsx`
  - Add: Protected routes, auth redirects

- [x] **Task 2.8: Test authentication flow**

  - Manual testing: Sign up, log in, log out, protected routes

- [x] **Task 2.9: Test Google authentication**
  - Manual testing: Sign in with Google, verify profile data, test logout

**PR Title:** `feat: implement Firebase authentication system`

---

### PR #3: Basic Canvas with Pan/Zoom

**Goal:** Create canvas workspace with pan and zoom functionality

- [x] **Task 3.1: Create canvas TypeScript types**

  - Files to create: `src/types/canvas.types.ts`
  - Define: `CanvasObject`, `Position`, `Size`, `Transform` interfaces

- [x] **Task 3.2: Set up Canvas Context**

  - Files to create: `src/contexts/CanvasContext.tsx`
  - Files to create: `src/hooks/useCanvas.ts`
  - Implement: Canvas state management (objects, zoom, pan)

- [x] **Task 3.3: Create main Canvas component with Konva**

  - Files to create: `src/components/canvas/Canvas.tsx`
  - Implement: Konva Stage and Layer setup
  - Add: Canvas container with bounded workspace (e.g., 10000x10000px)
  - Add: Visual boundary indicators (border or background grid)

- [x] **Task 3.4: Implement pan functionality**

  - Files to update: `src/components/canvas/Canvas.tsx`
  - Add: Mouse drag to pan, touch support for mobile
  - Implement: Stage position state management

- [x] **Task 3.5: Implement zoom functionality**

  - Files to update: `src/components/canvas/Canvas.tsx`
  - Add: Mouse wheel zoom, pinch zoom for mobile
  - Implement: Zoom limits (min/max), zoom to cursor position

- [x] **Task 3.6: Create canvas controls UI**

  - Files to create: `src/components/canvas/CanvasControls.tsx`
  - Add: Zoom in/out buttons, reset view button, zoom percentage display

- [x] **Task 3.7: Create canvas helpers**

  - Files to create: `src/utils/canvasHelpers.ts`
  - Implement: Coordinate transformations, zoom calculations

- [x] **Task 3.8: Add canvas to main app layout**

  - Files to update: `src/App.tsx`
  - Create: Canvas route/page component
  - Add: Header with user info and logout

- [ ] **Task 3.9: Test pan/zoom performance**

  - Manual testing: Smooth 60 FPS, responsive controls

- [x] **Task 3.10: Implement canvas boundaries**
  - Files to update: `src/components/canvas/Canvas.tsx`
  - Add: Bounded workspace dimensions (responsive to screen size)
  - Add: Visual boundary rendering (border/background)
  - Implement: Prevent panning beyond boundaries
  - Test: Boundaries work at different zoom levels

**PR Title:** `feat: implement canvas with pan and zoom functionality`

---

### PR #4: Shape Creation & Movement

**Goal:** Add ability to create and move rectangles on canvas

- [ ] **Task 4.1: Update canvas types for shapes**

  - Files to update: `src/types/canvas.types.ts`
  - Add: `Rectangle` interface, shape properties

- [ ] **Task 4.2: Create CanvasObject component**

  - Files to create: `src/components/canvas/CanvasObject.tsx`
  - Implement: Render rectangle using Konva.Rect
  - Add: Basic styling (fill color, stroke)

- [ ] **Task 4.3: Add shape creation logic**

  - Files to update: `src/contexts/CanvasContext.tsx`
  - Implement: `createRectangle()` function
  - Add: Shape ID generation, default size (150x100), default color (#3B82F6)

- [ ] **Task 4.4: Implement toolbar button rectangle creation**

  - Files to update: `src/components/canvas/CanvasControls.tsx`
  - Add: "Add Rectangle" button in toolbar
  - Create: Rectangle at canvas center with default size on button click

- [ ] **Task 4.5: Add drag functionality to shapes**

  - Files to update: `src/components/canvas/CanvasObject.tsx`
  - Implement: Konva drag events (`onDragStart`, `onDragMove`, `onDragEnd`)
  - Update: Shape position in state on drag

- [ ] **Task 4.6: Add shape selection**

  - Files to update: `src/components/canvas/CanvasObject.tsx`
  - Implement: Click to select shape, visual indicator (highlight/border)
  - Update: Selected shape state in context

- [ ] **Task 4.7: Add resize functionality**

  - Files to update: `src/components/canvas/CanvasObject.tsx`
  - Add: Resize handles on selected rectangles (corner and edge handles)
  - Implement: Konva Transformer for resize
  - Update: Object width/height in state on resize
  - Add: Visual feedback during resize

- [ ] **Task 4.8: Add delete functionality**

  - Files to update: `src/contexts/CanvasContext.tsx`, `src/components/canvas/Canvas.tsx`
  - Implement: `deleteObject()` function in context
  - Add: Delete key handler (keyboard event)
  - Add: Delete button in UI (optional)
  - Update: Remove from local state
  - Test: Delete selected object

- [ ] **Task 4.9: Test shape creation, movement, resize, and delete**
  - Manual testing: Create multiple shapes, drag them, resize them, delete them
  - Test: Smooth performance with all interactions

**PR Title:** `feat: add rectangle creation, movement, resize, and delete`

---

### PR #5: Firebase Realtime Database Structure

**Goal:** Set up database schema and basic sync infrastructure

- [ ] **Task 5.1: Design database structure**

  - Files to create: `DATABASE_SCHEMA.md` (documentation)
  - Document structure:
    ```json
    {
      "canvases": {
        "default": {
          "metadata": {
            "name": "Main Canvas",
            "createdAt": 1697123456789,
            "createdBy": "system"
          },
          "objects": {
            "{objectId}": {
              "id": "obj-123",
              "x": 100,
              "y": 200,
              "width": 150,
              "height": 100,
              "color": "#3B82F6",
              "createdBy": "userId",
              "timestamp": 1697123456789
            }
          }
        }
      },
      "users": {
        "{userId}": {
          "name": "User Name",
          "email": "user@example.com"
        }
      },
      "presence": {
        "default": {
          "{userId}": {
            "name": "User Name",
            "online": true,
            "cursor": { "x": 250, "y": 300 },
            "lastSeen": 1697123456789
          }
        }
      }
    }
    ```
  - Note: Use `DEFAULT_CANVAS_ID = "default"` from `src/constants/canvas.ts`
  - Note: Structure supports multiple canvases post-MVP without migration

- [ ] **Task 5.2: Set up Firebase Realtime Database rules**

  - Files to update: `firebase.json`
  - Add: Database rules for read/write permissions
  - Deploy rules to Firebase

- [ ] **Task 5.3: Create canvas service**

  - Files to create: `src/services/canvasService.ts`
  - Implement: `saveObject()`, `updateObject()`, `deleteObject()`, `getCanvasState()`
  - Use: `DEFAULT_CANVAS_ID` for all database paths (e.g., `/canvases/default/objects/`)

- [ ] **Task 5.4: Create sync helpers**

  - Files to create: `src/utils/syncHelpers.ts`
  - Implement: Debouncing, throttling for sync operations

- [ ] **Task 5.5: Test database connection**
  - Manual testing: Write to database, read from console

**PR Title:** `feat: set up Firebase Realtime Database structure`

---

### PR #6: Real-Time Object Synchronization

**Goal:** Sync canvas objects across all users in real-time

- [ ] **Task 6.1: Create realtime sync hook**

  - Files to create: `src/hooks/useRealtimeSync.ts`
  - Implement: Firebase listeners for object changes
  - Add: Subscribe/unsubscribe logic

- [ ] **Task 6.2: Integrate sync with Canvas Context**

  - Files to update: `src/contexts/CanvasContext.tsx`
  - Add: Real-time listeners for object updates
  - Implement: Merge remote changes with local state

- [ ] **Task 6.3: Sync object creation**

  - Files to update: `src/contexts/CanvasContext.tsx`
  - Update: `createRectangle()` to save to Firebase at `/canvases/default/objects/`
  - Listen: New objects from other users

- [ ] **Task 6.4: Sync object movement**

  - Files to update: `src/components/canvas/CanvasObject.tsx`
  - Update: `onDragEnd` to save position to Firebase at `/canvases/default/objects/{objectId}`
  - Throttle: Updates during drag for performance

- [ ] **Task 6.5: Handle concurrent edits**

  - Files to update: `src/contexts/CanvasContext.tsx`
  - Implement: Last-write-wins strategy
  - Add: Timestamp tracking

- [ ] **Task 6.6: Add loading states**

  - Files to update: `src/components/canvas/Canvas.tsx`
  - Add: Loading indicator while syncing initial state

- [ ] **Task 6.7: Test multi-user object sync**

  - Manual testing: Open 2+ browser windows
  - Test: Create shapes in one, see in others
  - Test: Move shapes, verify sync speed (<100ms)

- [ ] **Task 6.8: Sync object resize**

  - Files to update: `src/components/canvas/CanvasObject.tsx`
  - Update: Save width/height to Firebase on resize end
  - Listen: Resize updates from other users
  - Test: Resize sync across multiple windows

- [ ] **Task 6.9: Sync object deletion**
  - Files to update: `src/contexts/CanvasContext.tsx`
  - Update: `deleteObject()` to remove from Firebase
  - Listen: Deletion events from other users
  - Remove: Deleted objects from local state
  - Test: Delete in one window, disappears in others

**PR Title:** `feat: implement real-time object synchronization`

---

### PR #7: Multiplayer Cursors

**Goal:** Display real-time cursor positions with user names

- [ ] **Task 7.1: Create collaboration types**

  - Files to create: `src/types/collaboration.types.ts`
  - Define: `CursorPosition`, `UserPresence` interfaces

- [ ] **Task 7.2: Create presence service**

  - Files to create: `src/services/presenceService.ts`
  - Implement: `updateCursorPosition()`, `subscribeToCursors()`, `setUserOnline()`
  - Use: `/presence/default/{userId}` path (DEFAULT_CANVAS_ID)

- [ ] **Task 7.3: Create presence hook**

  - Files to create: `src/hooks/usePresence.ts`
  - Implement: Cursor position tracking, online users management

- [ ] **Task 7.4: Create Cursor component**

  - Files to create: `src/components/collaboration/Cursor.tsx`
  - Implement: SVG cursor with user name label
  - Add: User-specific color generation

- [ ] **Task 7.5: Create CursorLayer component**

  - Files to create: `src/components/collaboration/CursorLayer.tsx`
  - Implement: Render all active user cursors
  - Add: Filter out current user's cursor

- [ ] **Task 7.6: Track local cursor movement**

  - Files to update: `src/components/canvas/Canvas.tsx`
  - Add: Mouse move listener
  - Throttle: Cursor updates (16ms for 60 FPS)
  - Send: Position to Firebase at `/presence/default/{userId}/cursor`

- [ ] **Task 7.7: Integrate cursor layer into canvas**

  - Files to update: `src/components/canvas/Canvas.tsx`
  - Add: CursorLayer as overlay on canvas
  - Transform: Cursor positions based on zoom/pan

- [ ] **Task 7.8: Test cursor synchronization**
  - Manual testing: Open 2+ windows, verify cursor updates
  - Test: Sync speed (<50ms), smooth movement

**PR Title:** `feat: add multiplayer cursors with real-time sync`

---

### PR #8: Presence Awareness System

**Goal:** Show who's online and handle disconnections

- [ ] **Task 8.1: Create PresenceList component**

  - Files to create: `src/components/collaboration/PresenceList.tsx`
  - Implement: Display list of online users with colored indicators

- [ ] **Task 8.2: Implement online/offline detection**

  - Files to update: `src/services/presenceService.ts`
  - Add: Firebase presence using `.onDisconnect()` at `/presence/default/{userId}`
  - Implement: User goes offline when browser closes

- [ ] **Task 8.3: Track user session state**

  - Files to update: `src/hooks/usePresence.ts`
  - Add: User joins/leaves events
  - Implement: Cleanup on disconnect

- [ ] **Task 8.4: Add presence to app layout**

  - Files to create: `src/components/layout/Sidebar.tsx`
  - Add: PresenceList component in sidebar showing online users
  - Display: User count and colored user indicators

- [ ] **Task 8.5: Handle reconnection**

  - Files to update: `src/contexts/CanvasContext.tsx`, `src/hooks/usePresence.ts`
  - Implement: Reconnect logic when network restored
  - Re-sync: Canvas state on reconnection

- [ ] **Task 8.6: Test presence system**
  - Manual testing: Join with multiple users
  - Test: Close browser, verify user goes offline
  - Test: Reconnect, verify state restoration

**PR Title:** `feat: implement presence awareness and disconnect handling`

---

### PR #9: State Persistence & Recovery

**Goal:** Ensure canvas state persists and recovers correctly

- [ ] **Task 9.1: Implement initial state loading**

  - Files to update: `src/contexts/CanvasContext.tsx`
  - Add: Load all canvas objects on mount
  - Implement: Loading state while fetching

- [ ] **Task 9.2: Add state persistence on changes**

  - Files to update: `src/services/canvasService.ts`
  - Ensure: All object changes save to Firebase
  - Add: Error handling for failed writes

- [ ] **Task 9.3: Handle page refresh**

  - Files to update: `src/contexts/CanvasContext.tsx`
  - Test: Refresh page mid-edit
  - Verify: Canvas state fully restored

- [ ] **Task 9.4: Implement cleanup on logout**

  - Files to update: `src/contexts/AuthContext.tsx`
  - Add: Remove presence on logout
  - Clear: Local canvas state

- [ ] **Task 9.5: Test persistence scenarios**
  - Manual testing: Create objects, refresh page
  - Test: All users leave, new user joins, sees previous state
  - Test: Network disconnect/reconnect

**PR Title:** `feat: add state persistence and recovery`

---

### PR #10: Performance Optimization & Polish

**Goal:** Ensure 60 FPS and optimize sync performance

- [ ] **Task 10.1: Optimize canvas rendering**

  - Files to update: `src/components/canvas/Canvas.tsx`, `src/components/canvas/CanvasObject.tsx`
  - Add: Memoization for components (`React.memo`)
  - Optimize: Konva layer updates (avoid full redraws)

- [ ] **Task 10.2: Optimize sync operations**

  - Files to update: `src/hooks/useRealtimeSync.ts`, `src/hooks/usePresence.ts`
  - Add: Throttling/debouncing for frequent updates
  - Optimize: Batch updates where possible

- [ ] **Task 10.3: Add performance monitoring**

  - Files to create: `src/utils/performanceMonitor.ts`
  - Add: FPS counter (development only)
  - Monitor: Sync latency

- [ ] **Task 10.4: Test with 500+ objects**

  - Manual testing: Create many objects
  - Verify: 60 FPS maintained
  - Profile: Identify bottlenecks

- [ ] **Task 10.5: Test with 5+ concurrent users**

  - Manual testing: Open 5+ browser windows/devices
  - Test: Sync performance, no degradation
  - Test: Cursor smoothness

- [ ] **Task 10.6: Add error boundaries**

  - Files to create: `src/components/ErrorBoundary.tsx`
  - Files to update: `src/App.tsx`
  - Implement: Graceful error handling

- [ ] **Task 10.7: Improve UI/UX polish**

  - Files to update: `src/index.css`, various component files
  - Add: Better styling, hover states
  - Improve: Visual feedback for actions

- [ ] **Task 10.8: Add loading states and transitions**
  - Files to update: Multiple components
  - Add: Skeleton loaders, smooth transitions
  - Improve: User feedback during operations

**PR Title:** `perf: optimize rendering and sync performance`

---

### PR #11: Deployment & Final Testing

**Goal:** Deploy to production and verify all requirements

- [ ] **Task 11.1: Configure Firebase Hosting**

  - Files to update: `firebase.json`, `.firebaserc`
  - Configure: Build output directory, redirects

- [ ] **Task 11.2: Set up production environment variables**

  - Files to update: `.env.production`
  - Add: Production Firebase config

- [ ] **Task 11.3: Build production bundle**

  - Run: `npm run build`
  - Test: Production build locally

- [ ] **Task 11.4: Deploy to Firebase Hosting**

  - Run: `firebase deploy`
  - Verify: Deployed URL is accessible

- [ ] **Task 11.5: Test all MVP requirements on deployed app**

  - [ ] Pan and zoom functionality works
  - [ ] Canvas has visual boundaries
  - [ ] Rectangle shape with default size and color
  - [ ] Create objects (toolbar button → center)
  - [ ] Move objects (drag)
  - [ ] Resize objects (drag handles)
  - [ ] Delete objects (Delete key or button)
  - [ ] Select objects (click to select)
  - [ ] Real-time sync between 2+ users (<100ms)
  - [ ] Multiplayer cursors with name labels (<50ms)
  - [ ] Presence awareness (sidebar shows who's online)
  - [ ] Email/Password authentication working
  - [ ] Google Sign-In authentication working
  - [ ] 60 FPS during all interactions
  - [ ] State persists on refresh
  - [ ] 5+ concurrent users on same canvas simultaneously

- [ ] **Task 11.6: Update README with deployment info**

  - Files to update: `README.md`
  - Add: Deployed URL, demo account (if needed)
  - Update: Architecture overview

- [ ] **Task 11.7: Create demo video**

  - Record: 3-5 minute demo showing all features
  - Show: Real-time collaboration with 2+ users

- [ ] **Task 11.8: Final bug fixes**
  - Fix: Any critical bugs found during testing
  - Polish: Any remaining UX issues

**PR Title:** `deploy: production deployment and final testing`

---

## Testing Checklist (Verify Before Each PR Merge)

### Functionality Tests

- [ ] Feature works as expected in isolation
- [ ] No console errors or warnings
- [ ] TypeScript compiles without errors
- [ ] Component renders correctly

### Integration Tests

- [ ] Feature integrates with existing code
- [ ] No regressions in other features
- [ ] State management works correctly
- [ ] Firebase operations succeed

### Performance Tests

- [ ] No FPS drops (check with multiple objects)
- [ ] Sync latency meets targets
- [ ] No memory leaks (check DevTools)

### Multi-User Tests (for collaboration features)

- [ ] Works with 2+ concurrent users
- [ ] Changes sync correctly
- [ ] No race conditions or conflicts

---

## MVP Completion Criteria

All 11 PRs must be completed and merged. Final deployed app must pass:

### ✅ Canvas System:

- Pan and zoom functionality
- Bounded workspace with visual boundary
- Smooth 60 FPS performance

### ✅ Object Manipulation:

- Rectangle shape with default size (150x100) and color (#3B82F6)
- Create objects via toolbar button (appears at canvas center)
- Move objects (drag to reposition)
- Resize objects (drag corner/edge handles)
- Delete objects (Delete key or button)
- Single object selection (click to select)

### ✅ Real-Time Collaboration:

- Real-time sync between 2+ users (<100ms for objects)
- Multiplayer cursors with name labels (<50ms)
- Presence awareness (sidebar displays online users)
- Last-write-wins conflict resolution
- 5+ concurrent users on same canvas simultaneously

### ✅ Authentication:

- Email/Password authentication
- Google Sign-In authentication
- User identification in multiplayer session

### ✅ Persistence & Deployment:

- Canvas state persists on disconnect/refresh
- Deployed and publicly accessible via Firebase Hosting
- Stable under test conditions

### ✅ Data Model:

- Firebase Realtime Database with `/canvases/default/` structure
- Future-proof for multiple canvases post-MVP
