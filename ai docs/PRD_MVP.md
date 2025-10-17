# CollabCanvas - Product Requirements Document (MVP)

## Project Overview

A real-time collaborative design canvas enabling multiple users to design together synchronously with instant updates and multiplayer presence.

**MVP Scope:** Single shared canvas with rectangle objects, real-time collaboration, and essential editing capabilities.

---

## User Stories

### Primary User: Designer/Creator

- **As a designer**, I want to create rectangles on a canvas so that I can build simple designs
- **As a designer**, I want to select, move, resize, and delete objects so that I can arrange my design
- **As a designer**, I want to see other users' cursors and changes in real-time so that I can collaborate effectively
- **As a designer**, I want to pan and zoom the canvas so that I can navigate the workspace
- **As a designer**, I want my work to persist when I disconnect so that I don't lose progress

### Secondary User: Collaborator

- **As a collaborator**, I want to see who else is online so that I know who I'm working with
- **As a collaborator**, I want to edit simultaneously with others without conflicts so that we can work efficiently
- **As a collaborator**, I want to see changes appear instantly so that collaboration feels natural

---

## MVP Requirements

### Core Features (Must-Have)

1. **Canvas System**

   - Single global shared canvas (all users collaborate on same canvas)
   - Pan and zoom functionality
   - Bounded workspace with visual boundary (responsive to screen size)
   - Smooth 60 FPS performance
   - Future-proof data model for multiple projects post-MVP

2. **Object Creation & Manipulation**

   - **Shape:** Rectangle (MVP will support rectangles only)
   - Click-to-create interaction (toolbar button)
   - Objects created with default size and default color
   - **Selection:** Single object selection (click to select)
   - **Move:** Drag objects to reposition
   - **Resize:** Drag handles to resize objects
   - **Delete:** Remove selected objects

3. **Real-Time Collaboration**

   - Multiplayer cursors with name labels
   - Real-time sync between 2+ users (<100ms for objects)
   - Cursor position sync (<50ms)
   - **Presence awareness:** Online user list displayed in sidebar
   - **Conflict resolution:** Last-write-wins strategy

4. **Authentication & Users**

   - User accounts with names
   - Email/password authentication
   - Google sign-in authentication
   - User identification in multiplayer session

5. **Data Persistence**

   - Canvas state saves on disconnect
   - State restores when users return
   - Survives page refresh

6. **Deployment**
   - Publicly accessible URL
   - Supports 5+ concurrent users on the same canvas simultaneously
   - Stable under test conditions

---

## Key Features (Full Project - Beyond MVP)

### Canvas Features

- **Shapes:** Rectangles, circles, lines with solid colors
- **Text layers:** Basic formatting support
- **Transformations:** Move, resize, rotate
- **Selection:** Single and multiple object selection (shift-click, drag-to-select)
- **Layer management:** Delete, duplicate operations
- **Performance:** 500+ objects without FPS drops

### Real-Time Collaboration

- **Conflict resolution:** Last-write-wins documented strategy
- **Disconnect handling:** Graceful reconnection without state loss
- **Performance:** <100ms sync for objects, <50ms for cursors

---

## Technical Specifications

### Object Properties

Each rectangle object will have:

- **Position:** x, y coordinates
- **Size:** width, height
- **Color:** Default solid color (no customization in MVP)
- **ID:** Unique identifier for real-time sync
- **Metadata:** Timestamp for last-write-wins conflict resolution

### Canvas & Interaction

- **Object Creation:** Click toolbar button → rectangle appears at canvas center with default size
- **Object Selection:** Click object to select (visual indicator: selection border/handles)
- **Object Movement:** Click and drag selected object
- **Object Resizing:** Drag corner/edge handles on selected object
- **Object Deletion:** Delete key or delete button removes selected object
- **Object Ownership:** Any user can edit/move any object (no ownership restrictions)

### User Presence

- **Cursor Display:** Show all connected users' cursor positions with name labels
- **User List:** Sidebar displays all online users
- **No Visual Ownership:** No indicators showing who created which object

### Data Model (Firebase Realtime Database Structure)

```json
{
  "canvas": {
    "objects": {
      "{objectId}": {
        "id": "unique-id",
        "x": 100,
        "y": 200,
        "width": 150,
        "height": 100,
        "color": "#3B82F6",
        "timestamp": 1697123456789
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
    "{userId}": {
      "name": "User Name",
      "online": true,
      "cursor": {
        "x": 250,
        "y": 300
      },
      "lastSeen": 1697123456789
    }
  }
}
```

**Why Realtime Database over Firestore?**

- Lower latency for real-time sync (<50ms for cursors, <100ms for objects)
- Native presence detection with `.onDisconnect()`
- Cost-effective for high-frequency updates (cursor movements)
- Optimized for collaborative applications with WebSocket-based persistent connections

**Note:** Structure designed to scale to multiple canvases post-MVP (e.g., `/canvases/{canvasId}/objects/`).

---

## Tech Stack

**Backend:**

- Firebase Authentication (Email/Password + Google Sign-In)
- Firebase Realtime Database (real-time sync with low latency)
- Firebase Hosting (deployment)

**Frontend:**

- React (component-based, easy state management)
- Konva.js (canvas rendering libraries)

---

## Out of Scope for MVP

### Features NOT Required:

- ❌ Multiple shape types (rectangles only for MVP)
- ❌ Rotate transformations
- ❌ Selection of multiple objects
- ❌ Layer management (z-index, reordering)
- ❌ Duplicate operations
- ❌ Text formatting
- ❌ Color picker/customization (default color only)
- ❌ Undo/redo
- ❌ Export functionality
- ❌ AI integration (this is post-MVP)
- ❌ Multiple canvas/project support (single shared canvas for MVP)

### Strategic Deferrals:

- Advanced conflict resolution (last-write-wins is acceptable)
- Performance optimization beyond basic requirements
- Mobile responsiveness
- Keyboard shortcuts
- Canvas grid/guides
- Snap-to-grid
- Copy/paste
- AI integration (post-MVP)

---

## Risk Mitigation

### High-Risk Areas:

1. **Real-time sync complexity** - Mitigate by using Firebase Realtime Database (built for this)
2. **Performance under load** - Test early with multiple windows/users
3. **State synchronization bugs** - Implement thorough logging and timestamps
4. **Cursor update frequency** - Throttle to 60 updates/sec to avoid overwhelming database
5. **Network latency** - May not meet targets on slow connections, document requirements

### Contingency Plans:

- If multiplayer is broken, cut features and fix sync first
- If Realtime Database structure causes issues, refactor data model early
- If canvas rendering is slow, reduce object complexity or optimize Konva layers
- If latency targets not met, increase throttling or reduce update frequency
- Document any "known issues" clearly

---

## Success Metrics

### MVP Success:

- Passes all 6 MVP core features
- Deployed and accessible via public URL
- 5+ users can collaborate on same canvas without major bugs
- Rectangle objects can be created, selected, moved, resized, and deleted
- 60 FPS maintained during interactions
- Sync latency targets met (<100ms objects, <50ms cursors)
- Email/password and Google authentication working
- Canvas state persists across disconnects and page refreshes
- User presence (cursors + sidebar list) working in real-time

---

## Notes & Considerations

- **Scope discipline is critical** - MVP is intentionally minimal
- **Build vertically, not horizontally** - finish sync before adding features
- **Test continuously** - use multiple browser windows early
- **Deploy early** - verify deployment pipeline works
- **Last-write-wins is acceptable** - don't over-engineer conflict resolution
