# CollabCanvas - Firebase Realtime Database Schema

## Overview

This document describes the database structure for CollabCanvas MVP. The schema is designed to support real-time collaboration on a single shared canvas, with the flexibility to scale to multiple canvases post-MVP.

**Database Type:** Firebase Realtime Database  
**Current Scope:** Single shared canvas (MVP)  
**Future-Proof:** Structure supports multiple canvases without migration

---

## Database Structure

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
          "id": "rect-1234567890-abc123",
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
      "email": "user@example.com",
      "createdAt": 1697123456789
    }
  },
  "presence": {
    "default": {
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
}
```

---

## Schema Details

### 1. Canvases Node (`/canvases`)

Container for all canvas data. Currently uses a single `default` canvas for MVP.

#### Canvas Structure (`/canvases/{canvasId}`)

**Path:** `/canvases/default` (MVP - hardcoded)  
**Future:** `/canvases/{dynamic-canvas-id}` (post-MVP)

##### Metadata (`/canvases/{canvasId}/metadata`)

Basic canvas information.

| Field       | Type   | Description         | Example               |
| ----------- | ------ | ------------------- | --------------------- |
| `name`      | string | Canvas display name | "Main Canvas"         |
| `createdAt` | number | Unix timestamp (ms) | 1697123456789         |
| `createdBy` | string | User ID of creator  | "user123" or "system" |

##### Objects (`/canvases/{canvasId}/objects`)

All drawable objects on the canvas.

**Path:** `/canvases/default/objects/{objectId}`

| Field       | Type   | Required | Description                  | Example                  |
| ----------- | ------ | -------- | ---------------------------- | ------------------------ |
| `id`        | string | ✅       | Unique object identifier     | "rect-1234567890-abc123" |
| `x`         | number | ✅       | X coordinate (pixels)        | 100                      |
| `y`         | number | ✅       | Y coordinate (pixels)        | 200                      |
| `width`     | number | ✅       | Width (pixels)               | 150                      |
| `height`    | number | ✅       | Height (pixels)              | 100                      |
| `color`     | string | ✅       | Hex color code               | "#3B82F6"                |
| `createdBy` | string | ✅       | User ID of creator           | "user123"                |
| `timestamp` | number | ✅       | Last modified timestamp (ms) | 1697123456789            |

**Object ID Format:** `rect-{timestamp}-{random}`

- Example: `rect-1697123456789-abc123`
- Ensures uniqueness across all users
- Timestamp for ordering/debugging
- Random suffix for collision prevention

---

### 2. Users Node (`/users`)

User profile information.

**Path:** `/users/{userId}`

| Field       | Type   | Required | Description                | Example            |
| ----------- | ------ | -------- | -------------------------- | ------------------ |
| `name`      | string | ✅       | Display name               | "John Doe"         |
| `email`     | string | ✅       | Email address              | "john@example.com" |
| `createdAt` | number | ❌       | Account creation timestamp | 1697123456789      |

**User ID:** Provided by Firebase Authentication (`user.uid`)

---

### 3. Presence Node (`/presence`)

Real-time user presence and cursor positions.

**Path:** `/presence/default/{userId}` (MVP - scoped to default canvas)  
**Future:** `/presence/{canvasId}/{userId}` (post-MVP - per-canvas presence)

| Field      | Type    | Required | Description             | Example              |
| ---------- | ------- | -------- | ----------------------- | -------------------- |
| `name`     | string  | ✅       | User display name       | "John Doe"           |
| `online`   | boolean | ✅       | Online status           | true                 |
| `cursor`   | object  | ❌       | Cursor position         | `{ x: 250, y: 300 }` |
| `cursor.x` | number  | ❌       | Cursor X coordinate     | 250                  |
| `cursor.y` | number  | ❌       | Cursor Y coordinate     | 300                  |
| `lastSeen` | number  | ✅       | Last activity timestamp | 1697123456789        |

**Special Behavior:**

- Uses Firebase `.onDisconnect()` to automatically set `online: false` when user disconnects
- `lastSeen` updates on every cursor movement (throttled to ~50ms)
- Cursor position optional (not tracked when outside canvas)

---

## Database Constants

Defined in `src/constants/canvas.ts`:

```typescript
export const DEFAULT_CANVAS_ID = "default";
```

**Usage:** All database operations use this constant for the canvas ID.  
**Migration Path:** Replace with dynamic canvas ID post-MVP.

---

## Security Rules

Defined in `database.rules.json`:

### Key Rules:

1. **Authentication Required:** All reads/writes require `auth != null`
2. **Data Validation:** Enforces required fields on write
3. **No Ownership Restrictions:** Any authenticated user can edit any object (MVP design)

### Validation Rules:

**Canvas Objects:**

```json
".validate": "newData.hasChildren(['id', 'x', 'y', 'width', 'height', 'color', 'createdBy', 'timestamp'])"
```

**Presence:**

```json
".validate": "newData.hasChildren(['name', 'online', 'lastSeen'])"
```

**Users:**

```json
".validate": "newData.hasChildren(['name', 'email'])"
```

---

## Conflict Resolution Strategy

**Approach:** Last-Write-Wins (LWW)

### How It Works:

1. Every object update includes a `timestamp` field
2. Client updates always succeed (no locking)
3. Newer timestamps override older ones
4. All clients receive updates via real-time listeners
5. Local state reconciles with remote state automatically

### Trade-offs:

- ✅ Simple implementation
- ✅ No blocking/locks needed
- ✅ Good enough for MVP
- ⚠️ Concurrent edits: last write wins (acceptable for design tool)

---

## Sync Performance Targets

| Operation       | Target Latency | Implementation        |
| --------------- | -------------- | --------------------- |
| Object Updates  | <100ms         | Direct Firebase write |
| Cursor Updates  | <50ms          | Throttled to 60fps    |
| Object Creation | <100ms         | Direct Firebase write |
| Object Deletion | <100ms         | Direct Firebase write |
| Initial Load    | <500ms         | Single Firebase read  |

### Optimization Strategies:

- Throttle cursor updates (16ms = 60fps)
- Debounce rapid object edits (e.g., during drag)
- Batch reads on initial load
- Use Firebase local persistence

---

## Data Flow Diagrams

### Object Creation Flow

```
User clicks "Add Rectangle"
    ↓
Local state updated (immediate UI feedback)
    ↓
Firebase write: /canvases/default/objects/{objectId}
    ↓
Firebase broadcasts to all connected clients
    ↓
Other clients receive update and render object
```

### Object Update Flow (Drag/Resize)

```
User drags object
    ↓
Local state updates (smooth 60fps)
    ↓
On drag end: Firebase write with new position
    ↓
Firebase broadcasts to all connected clients
    ↓
Other clients update object position
```

### Presence Flow

```
User moves cursor
    ↓
Throttled update (60fps max)
    ↓
Firebase write: /presence/default/{userId}/cursor
    ↓
Firebase broadcasts to other users
    ↓
Other clients render cursor position
```

---

## Database Paths Reference

### MVP Paths (All use "default" canvas):

```
/canvases/default/metadata
/canvases/default/objects/{objectId}
/users/{userId}
/presence/default/{userId}
```

### Post-MVP Paths (Dynamic canvas IDs):

```
/canvases/{canvasId}/metadata
/canvases/{canvasId}/objects/{objectId}
/users/{userId}
/presence/{canvasId}/{userId}
```

**Migration:** Simply replace `"default"` with dynamic `canvasId` - no schema changes needed.

---

## Example Operations

### Create Object

```typescript
const objectId = "rect-1697123456789-abc123";
const objectData = {
  id: objectId,
  x: 100,
  y: 200,
  width: 150,
  height: 100,
  color: "#3B82F6",
  createdBy: currentUser.id,
  timestamp: Date.now(),
};

await set(ref(database, `/canvases/default/objects/${objectId}`), objectData);
```

### Update Object Position

```typescript
const updates = {
  x: 250,
  y: 350,
  timestamp: Date.now(),
};

await update(ref(database, `/canvases/default/objects/${objectId}`), updates);
```

### Delete Object

```typescript
await remove(ref(database, `/canvases/default/objects/${objectId}`));
```

### Update Presence

```typescript
const presenceData = {
  name: currentUser.name,
  online: true,
  cursor: { x: 250, y: 300 },
  lastSeen: Date.now(),
};

await set(ref(database, `/presence/default/${currentUser.id}`), presenceData);
```

### Listen to Objects

```typescript
const objectsRef = ref(database, `/canvases/default/objects`);

onValue(objectsRef, (snapshot) => {
  const objects = snapshot.val() || {};
  // Update local state with all objects
});
```

---

## Notes & Considerations

### Why Realtime Database over Firestore?

1. **Lower Latency:** WebSocket-based, optimized for real-time (<50ms typical)
2. **Native Presence:** Built-in `.onDisconnect()` for automatic cleanup
3. **Cost-Effective:** Better pricing for high-frequency updates (cursors)
4. **Simpler Model:** JSON tree structure matches our needs

### Future Enhancements (Post-MVP)

- Multiple canvas support (replace "default" with dynamic IDs)
- Object layers/z-index
- Undo/redo history
- Collaborative text editing
- Canvas permissions/sharing
- Version history/snapshots

### Limitations (Acceptable for MVP)

- No operational transforms (OT) - using simple LWW
- No offline editing queue - requires internet connection
- No granular permissions - all users can edit everything
- Single canvas only - no project management

---

## Testing Database Locally

### 1. View in Firebase Console

Navigate to: `https://console.firebase.google.com/project/{your-project}/database`

### 2. Manual Test Write

```typescript
import { ref, set } from "firebase/database";
import { database } from "./firebase";

// Test write
const testRef = ref(database, "/test");
await set(testRef, {
  message: "Hello from CollabCanvas!",
  timestamp: Date.now(),
});
```

### 3. Manual Test Read

```typescript
import { ref, onValue } from "firebase/database";
import { database } from "./firebase";

const testRef = ref(database, "/test");
onValue(testRef, (snapshot) => {
  console.log("Database data:", snapshot.val());
});
```

---

**Document Version:** 1.0  
**Last Updated:** PR #5 Implementation  
**Maintained By:** CollabCanvas Development Team
