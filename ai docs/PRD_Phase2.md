# CollabCanvas - Product Requirements Document (Phase 2)

## Executive Summary

**Mission:** Transform CollabCanvas from a functional MVP into a production-ready collaborative design platform that teams trust for real-time design work.

**Phase 2 Vision:** Deliver infrastructure reliability, expanded creative tools, and workflow enhancements that make CollabCanvas competitive with established tools while maintaining our real-time collaboration edge.

---

## Current State Assessment

### MVP Achievements (Completed)

- ✅ Single shared canvas (`/canvases/default/`)
- ✅ Rectangle creation, selection, movement, resize, deletion
- ✅ Real-time sync: <100ms objects, <50ms cursors
- ✅ Multiplayer cursors with name labels
- ✅ Presence awareness sidebar
- ✅ Email/Password + Google authentication
- ✅ State persistence across disconnects
- ✅ Last-write-wins conflict resolution
- ✅ Successfully deployed, tested with 5+ concurrent users
- ✅ 60 FPS performance target

### Known Limitations to Address

1. **Reliability Gaps:** Race conditions (delete vs. edit), no offline support, connection issues lose work
2. **Creative Constraints:** Only rectangles, no text, no rotation, single colors
3. **Workflow Friction:** No keyboard shortcuts, no copy/paste, tedious multi-object manipulation
4. **Collaboration Blind Spots:** Can't tell who edited what, no way to leave feedback/comments

---

## Phase 2 Strategic Pillars

### Pillar 1: Infrastructure Hardening (Weeks 1-3)

**Goal:** Achieve zero data loss and production-grade reliability

**Key Metrics:**

- Zero sync failures in 1-hour stress test (5 users, 500+ objects, 100+ edits/min)
- 100% operation success rate with network instability
- <2 second recovery time on reconnection

### Pillar 2: Creative Tool Expansion (Weeks 4-6)

**Goal:** Evolve from prototype to versatile design toolkit

**Key Metrics:**

- Support 5 shape types (Rectangle, Circle, Star, Line, Text)
- Maintain 60 FPS with 500+ mixed objects
- <100ms sync for all shape types

### Pillar 3: Workflow Enhancement (Weeks 7-10)

**Goal:** Match Figma's core productivity features

**Key Metrics:**

- 10+ keyboard shortcuts implemented
- Multi-select supports 50+ objects without lag
- Export produces production-ready files (2x PNG, clean SVG)

---

## User Stories

### Primary Persona: Product Designer (Sarah)

**Context:** Sarah designs landing pages with her remote team. She needs reliable tools that don't slow her down.

**Critical Needs:**

- "I need to trust my work won't disappear if my internet hiccups" → **Offline queue**
- "I need to create complete designs, not just rectangles" → **Shapes + text**
- "I need to work fast without clicking through menus" → **Keyboard shortcuts**
- "I need to align and organize multiple elements" → **Multi-select + alignment**
- "I need to know who changed what and when" → **Edit attribution**

### Secondary Persona: UX Researcher (Marcus)

**Context:** Marcus reviews designs and leaves feedback for the team.

**Critical Needs:**

- "I need to comment directly on designs without Slack" → **Collaborative comments**
- "I need to see who's online before I start editing" → **Enhanced presence**
- "I need to export designs to share with stakeholders" → **PNG/SVG export**

---

## Phase 2 Requirements

## Section 1: Infrastructure Hardening

### 1.1 Conflict-Free Sync Engine

#### Problem: Delete vs. Edit Race Condition

**Current Bug:** User A deletes object while User B edits it → object reappears as "ghost"

**Solution:**

```typescript
// Use Firebase Transactions for atomic operations
async function updateObject(objectId: string, updates: Partial<CanvasObject>) {
  const objectRef = ref(db, `/canvases/${canvasId}/objects/${objectId}`);

  return runTransaction(objectRef, (current) => {
    if (current === null) {
      // Object was deleted - abort update
      console.warn(`Object ${objectId} was deleted, aborting update`);
      return undefined;
    }
    return { ...current, ...updates, timestamp: Date.now() };
  });
}
```

**Acceptance Criteria:**

- ✅ Automated test: 100 delete-edit race conditions → 0 ghost objects
- ✅ User sees toast: "This object was just deleted by [User Name]"
- ✅ Edit operation fails gracefully without error
- ✅ No performance degradation (<5ms overhead per operation)

---

#### Enhancement: Last Edit Attribution

**Requirement:** Show who last edited each object

**Implementation:**

```typescript
interface CanvasObject {
  // ... existing fields
  lastEditedBy: string; // userId
  lastEditedByName: string; // display name
  lastEditedAt: number; // timestamp
}
```

**UI Design:**

- Small avatar badge (16x16px) appears on selected object
- Tooltip shows: "Last edited by Sarah Chen, 2m ago"
- Badge fades in/out smoothly (200ms transition)
- Non-intrusive, doesn't block interaction

**Acceptance Criteria:**

- ✅ Attribution updates within 50ms of edit
- ✅ Works for all object types and all edit operations
- ✅ Gracefully handles deleted users (shows "Unknown User")
- ✅ Badge is keyboard-accessible (tab navigation)

---

### 1.2 Robust Offline Support

#### Feature: Operation Queue with IndexedDB Persistence

**Problem:** Users lose work during temporary network drops

**Solution Architecture (Simplified - 5-10 Minute Window):**

```typescript
interface QueuedOperation {
  id: string;
  type: "create" | "update" | "delete";
  objectId: string;
  payload: any;
  timestamp: number;
  retryCount: number;
}

class OfflineQueue {
  private db: IDBDatabase;
  private queue: QueuedOperation[] = [];
  private readonly MAX_OFFLINE_DURATION = 10 * 60 * 1000; // 10 minutes

  async enqueue(op: QueuedOperation): Promise<void> {
    this.queue.push(op);
    await this.persistToIndexedDB(op);

    // Check if oldest operation exceeds timeout
    if (this.isTimeoutExceeded()) {
      this.disableCanvas();
      return;
    }

    await this.processQueue();
  }

  private isTimeoutExceeded(): boolean {
    if (this.queue.length === 0) return false;
    const oldestOp = this.queue[0];
    return Date.now() - oldestOp.timestamp > this.MAX_OFFLINE_DURATION;
  }

  private disableCanvas(): void {
    // Show modal: "You're offline. Reconnect to continue"
    // Disable all canvas interactions
    // Show "Retry Connection" button
  }

  async processQueue(): Promise<void> {
    if (!navigator.onLine) return;

    while (this.queue.length > 0) {
      const op = this.queue[0];
      try {
        await this.executeOperation(op);
        this.queue.shift();
        await this.removeFromIndexedDB(op.id);
      } catch (error) {
        if (this.isNetworkError(error)) {
          break; // Wait for reconnection
        }
        if (op.retryCount >= 3) {
          this.handleFailedOperation(op);
          this.queue.shift();
        } else {
          op.retryCount++;
        }
      }
    }
  }
}
```

**Acceptance Criteria:**

- ✅ Queue persists for 5-10 minutes during offline period
- ✅ After 10 minutes offline: Disable canvas + show "Reconnect Required" modal
- ✅ Operations execute in order on reconnection (if within timeout)
- ✅ IndexedDB stores in plain text (no encryption needed)
- ✅ User sees progress: "Syncing 8 changes..."

---

#### Feature: Connection Status UI

**Requirement:** Unobtrusive connection indicator

**UI States:**

1. **Online** (Green dot in header): Normal operation - subtle indicator only
2. **Offline** (Orange banner): "You're offline – changes will sync when reconnected"
3. **Reconnecting** (Blue banner): "Reconnecting..." with manual retry button
4. **Syncing** (Blue banner): "Syncing 5 changes..." with count

**Green Dot Design (Online State):**

```tsx
// Small dot in header (top-right, near username) - only visible when online
<div className="connection-status">
  <div className="w-2 h-2 rounded-full bg-green-500" />
  <span className="sr-only">Connected</span>
</div>
```

**Banner Design (Offline/Reconnecting Only):**

```tsx
// Fixed top banner, non-modal - only appears when offline/reconnecting
<div className="bg-orange-100 border-b border-orange-300 px-4 py-2">
  <div className="flex items-center gap-2">
    <WifiOff className="w-4 h-4 text-orange-600" />
    <span className="text-sm text-orange-800">
      You're offline – {queuedOpsCount} changes will sync when reconnected
    </span>
    {isReconnecting && (
      <Button size="sm" onClick={manualReconnect}>
        Retry Now
      </Button>
    )}
  </div>
</div>
```

**Acceptance Criteria:**

- ✅ Green dot always visible in header when online (unobtrusive)
- ✅ Banner only appears when offline/reconnecting (not when online)
- ✅ Banner appears within 2 seconds of disconnect
- ✅ Shows queued operation count in real-time
- ✅ Manual retry button works immediately
- ✅ Success toast on reconnect: "You're back online – 5 changes synced"
- ✅ Banner auto-dismisses after successful reconnection
- ✅ Accessible (ARIA labels, keyboard navigation)

---

#### Enhancement: Smart Reconnection Logic

**Requirement:** Automatic reconnection with exponential backoff

**Implementation:**

```typescript
class ReconnectionManager {
  private retryDelays = [1000, 2000, 4000, 8000, 16000]; // max 16 seconds
  private currentRetry = 0;

  async attemptReconnect(): Promise<boolean> {
    if (this.currentRetry >= this.retryDelays.length) {
      this.currentRetry = this.retryDelays.length - 1; // cap at max delay
    }

    await delay(this.retryDelays[this.currentRetry]);

    try {
      const connected = await this.testConnection();
      if (connected) {
        this.currentRetry = 0;
        await this.resyncCanvasState();
        return true;
      }
      this.currentRetry++;
      return this.attemptReconnect();
    } catch (error) {
      this.currentRetry++;
      return this.attemptReconnect();
    }
  }
}
```

**Acceptance Criteria:**

- ✅ Automatic reconnection attempts start immediately
- ✅ Full canvas state re-syncs on successful reconnect
- ✅ Queued operations reconcile with server state (last-write-wins)
- ✅ No duplicate operations after reconnect
- ✅ Works after 30+ minute disconnect

---

## Section 2: Creative Tool Expansion

### 2.1 Multi-Shape Support

#### Feature: Circle Shape

**Specification:**

- Perfect circles (width === height, enforced)
- Resize maintains aspect ratio (proportional handles)
- All properties: fill, stroke, strokeWidth, rotation
- Same interactions as rectangles: select, move, resize, delete

**Data Model:**

```typescript
interface CircleObject extends BaseObject {
  type: "circle";
  radius: number; // derived from width/2
}
```

**Acceptance Criteria:**

- ✅ Toolbar button creates 100px diameter circle at canvas center
- ✅ Resize handles lock aspect ratio (no oval stretching)
- ✅ Rotates visually (rotation applies to stroke if present)
- ✅ Syncs in <100ms between users

---

#### Feature: Star Shape

**Specification:**

- Configurable point count (default: 5, range: 3-12)
- Adjustable inner/outer radius ratio (default: 0.5)
- Properties panel slider: "Star Points" and "Inner Radius %"

**Data Model:**

```typescript
interface StarObject extends BaseObject {
  type: "star";
  points: number; // default: 5
  innerRadius: number; // 0.0-1.0 (percentage of outer radius)
  outerRadius: number; // derived from width/2
}
```

**Acceptance Criteria:**

- ✅ Default 5-point star created at canvas center
- ✅ Properties panel adjusts points/radius with live preview
- ✅ Resize scales proportionally
- ✅ Rotation works correctly around center point

---

#### Feature: Line Shape

**Specification:**

- Straight line with start/end points
- Optional arrow heads (none, start, end, both)
- Stroke width adjustable (1-20px)
- No fill property (lines can't be filled)

**Data Model:**

```typescript
interface LineObject extends BaseObject {
  type: "line";
  points: [number, number, number, number]; // [x1, y1, x2, y2]
  arrowStart: boolean;
  arrowEnd: boolean;
  // width/height calculated from points bounding box
}
```

**Interaction Design:**

- Click toolbar → cursor becomes crosshair
- Click canvas → sets start point
- Drag → previews line
- Release → creates line
- Resize handles move endpoints

**Acceptance Criteria:**

- ✅ Click-drag creation feels natural
- ✅ Arrow heads render correctly at any angle
- ✅ Endpoint handles are draggable
- ✅ Rotation rotates around midpoint

---

#### Feature: Stroke Customization

**Requirement:** All shapes support border customization

**Properties Panel:**

```tsx
<div className="properties-panel">
  <label>Stroke Width</label>
  <input type="range" min="0" max="20" value={strokeWidth} />

  <label>Stroke Color</label>
  <input type="color" value={strokeColor} />

  <label>Fill Color</label>
  <input type="color" value={fillColor} />
</div>
```

**Defaults:**

- Stroke width: 2px
- Stroke color: #000000 (black)
- Fill color: #3B82F6 (blue, existing default)

**Acceptance Criteria:**

- ✅ Changes apply instantly (debounced sync after 300ms)
- ✅ Stroke width 0 = no stroke (invisible border)
- ✅ Color picker supports hex input and eyedropper
- ✅ Works for all shape types

---

### 2.2 Text Tool

#### Feature: Rich Text Objects

**Specification:**

- Click toolbar → click canvas → enter text mode
- Konva.Text rendering with overlay textarea for editing
- Auto-resizing container (width grows with text)
- Max width: 800px, then wraps

**Implementation Approach:**

- Use `Konva.Text` for rendering text on canvas
- On edit mode: Show HTML textarea overlay at exact text position
- Sync text changes with debouncing (500ms)
- This approach provides better performance and simpler real-time sync than contenteditable

**Data Model:**

```typescript
interface TextObject extends BaseObject {
  type: "text";
  text: string;
  fontFamily: string; // default: 'Arial'
  fontSize: number; // default: 16
  fontWeight: string; // 'normal' | 'bold'
  fontStyle: string; // 'normal' | 'italic'
  textAlign: string; // 'left' | 'center' | 'right'
  color: string; // text color
  // width/height auto-calculated from rendered text
}
```

**Supported Fonts (Web-Safe):**

- Arial
- Helvetica
- Times New Roman
- Georgia
- Courier New
- Verdana

**Interaction Flow:**

1. Click "Text" button → cursor becomes I-beam
2. Click canvas → text editor appears
3. Type → container auto-resizes
4. Click outside or press Escape → finishes editing
5. Double-click existing text → re-enters edit mode

**Acceptance Criteria:**

- ✅ Text renders with correct font/size/color
- ✅ Editing is smooth (no lag on keystroke)
- ✅ Text syncs character-by-character (debounced 500ms)
- ✅ Supports copy/paste from external sources
- ✅ Handles line breaks correctly
- ✅ Font dropdown is keyboard-navigable

---

### 2.3 Advanced Transformations

#### Feature: Rotation

**Requirement:** Rotate any object to any angle

**UI Design:**

- Rotation handle appears above bounding box (small circle, 20px offset)
- Drag handle → object rotates around center point
- Hold Shift → snap to 15° increments
- Properties panel shows numeric input: "Rotation: 45°"

**Data Model:**

```typescript
interface BaseObject {
  // ... existing fields
  rotation: number; // degrees, 0-360
}
```

**Implementation Notes:**

- Konva.js native rotation support: `<Rect rotation={degrees} />`
- Apply rotation transform to Konva group containing object
- Rotation syncs immediately (no debouncing)

**Acceptance Criteria:**

- ✅ Smooth rotation (60 FPS)
- ✅ Snap-to-angle works correctly with Shift
- ✅ Rotation persists after deselect
- ✅ Rotated objects still resize/move correctly
- ✅ Rotation handle is visually distinct (different color)

---

#### Feature: Multi-Select

**Requirement:** Select and manipulate multiple objects simultaneously

**Interaction Methods:**

1. **Shift+Click:** Add/remove objects from selection
2. **Drag-Box:** Click empty canvas → drag → selects intersecting objects
3. **Cmd/Ctrl+A:** Select all objects on canvas

**Visual Design:**

- Selected objects show unified bounding box
- Bounding box has standard transform handles
- Objects maintain relative positions during group transforms

**Data Model:**

```typescript
interface CanvasState {
  // ... existing fields
  selectedIds: string[]; // array of selected object IDs
}
```

**Group Operations:**

- **Move:** Drag any selected object → all move together
- **Resize:** Drag corner handle → all scale proportionally
- **Rotate:** Drag rotation handle → all rotate around group center
- **Delete:** Press Delete → all removed

**Visual Selection Sync:**

- Other users can see your selection with visual highlights
- Each user's selections shown with their cursor color + 30% opacity border
- Non-intrusive indicator (doesn't interfere with own editing)
- Updates in real-time (<50ms) via presence system

**Acceptance Criteria:**

- ✅ Shift+Click adds/removes objects predictably
- ✅ Drag-box selection feels natural (rubber-band visual)
- ✅ Group transforms maintain relative positions
- ✅ Supports up to 50 objects without performance drop
- ✅ Deselect by clicking empty canvas or pressing Escape
- ✅ Selection state syncs between users with visual highlights
- ✅ Other users' selections shown with colored border (user's cursor color)
- ✅ Visual sync happens within 50ms of selection change

---

## Section 3: Workflow Enhancement

### 3.1 Keyboard Shortcuts

#### Priority 1: Clipboard Operations

| Shortcut       | Action    | Behavior                                                                         |
| -------------- | --------- | -------------------------------------------------------------------------------- |
| **Cmd/Ctrl+C** | Copy      | Copies selected object(s) to clipboard                                           |
| **Cmd/Ctrl+V** | Paste     | Pastes at cursor position (or center if no cursor), offset by 10px from original |
| **Cmd/Ctrl+X** | Cut       | Copies to clipboard and deletes original                                         |
| **Cmd/Ctrl+D** | Duplicate | Creates copy offset by 10px x/y from selected object(s)                          |

**Clipboard Data Model:**

```typescript
interface ClipboardData {
  objects: CanvasObject[];
  copiedAt: number;
}

// Store in React state (not browser clipboard for security)
const [clipboard, setClipboard] = useState<ClipboardData | null>(null);
```

**Acceptance Criteria:**

- ✅ Copy/paste works with single and multi-select
- ✅ Paste maintains relative positions in multi-select
- ✅ Duplicate generates new unique IDs
- ✅ Paste position is predictable (cursor or center)
- ✅ Works across multiple canvas sessions (same user)

---

#### Priority 2: Object Manipulation

| Shortcut               | Action      | Behavior                             |
| ---------------------- | ----------- | ------------------------------------ |
| **Delete / Backspace** | Delete      | Removes selected object(s)           |
| **Arrow Keys**         | Nudge       | Moves object 1px in arrow direction  |
| **Shift+Arrow**        | Large Nudge | Moves object 10px in arrow direction |
| **Cmd/Ctrl+A**         | Select All  | Selects all objects on canvas        |
| **Escape**             | Deselect    | Clears selection                     |

**Acceptance Criteria:**

- ✅ Nudge moves sync immediately (no batching)
- ✅ Rapid keypresses don't cause jank (<60 FPS)
- ✅ Delete confirms before removing 10+ objects
- ✅ Keyboard focus management works correctly

---

#### Priority 3: Layer Ordering

| Shortcut             | Action         | Behavior              |
| -------------------- | -------------- | --------------------- |
| **Cmd/Ctrl+]**       | Bring Forward  | Increases zIndex by 1 |
| **Cmd/Ctrl+[**       | Send Backward  | Decreases zIndex by 1 |
| **Cmd/Ctrl+Shift+]** | Bring to Front | Sets zIndex to max+1  |
| **Cmd/Ctrl+Shift+[** | Send to Back   | Sets zIndex to 0      |

**Data Model Enhancement:**

```typescript
interface BaseObject {
  // ... existing fields
  zIndex: number; // default: auto-increment from timestamp
}
```

**Acceptance Criteria:**

- ✅ Layer order changes sync immediately
- ✅ Works with multi-select (applies to all)
- ✅ Visual feedback (object moves in layer stack)
- ✅ No zIndex collisions (handled server-side)

---

### 3.2 Layers Panel

#### Feature: Visual Object Hierarchy

**UI Location:** Right sidebar (always visible)

**UI Design:**

```tsx
<div className="layers-panel sidebar-right">
  <h3>Layers</h3>
  <div className="layers-list">
    {objects.map((obj) => (
      <div
        key={obj.id}
        className={`layer-item ${selected ? "active" : ""}`}
        onClick={() => selectObject(obj.id)}
        draggable
        onDragStart={handleDragStart}
        onDrop={handleReorder}
      >
        <Icon type={obj.type} />
        <span>{obj.name || getAutoName(obj)}</span>
        <span className="layer-zindex">{obj.zIndex}</span>
      </div>
    ))}
  </div>
</div>
```

**Features:**

- **List View:** Shows all objects with icon + name
- **Selection Sync:** Click layer → selects object on canvas (bidirectional)
- **Drag-to-Reorder:** Drag layer → updates zIndex
- **Visual Hierarchy:** Indentation shows stacking order (higher zIndex = higher in list)
- **Auto-naming:** Per-shape counter (Rectangle 1, Rectangle 2, Circle 1, Circle 2, etc.)
- **Rename:** Not available in Phase 2 (deferred to Phase 3)

**Acceptance Criteria:**

- ✅ Panel displays all objects in real-time
- ✅ Selection highlights in both panel and canvas
- ✅ Drag-to-reorder feels smooth (no jank)
- ✅ Panel scrolls when >20 objects
- ✅ Updates within 100ms when objects created/deleted

---

### 3.3 Alignment Tools

#### Feature: Multi-Object Alignment

**Toolbar Buttons (appear when 2+ objects selected):**

| Button                    | Action                   | Behavior                                             |
| ------------------------- | ------------------------ | ---------------------------------------------------- |
| **Align Left**            | Align left edges         | Moves objects to leftmost edge of selection bounds   |
| **Align Center**          | Align horizontal centers | Centers objects horizontally within selection bounds |
| **Align Right**           | Align right edges        | Moves objects to rightmost edge                      |
| **Align Top**             | Align top edges          | Moves objects to topmost edge                        |
| **Align Middle**          | Align vertical centers   | Centers objects vertically                           |
| **Align Bottom**          | Align bottom edges       | Moves objects to bottommost edge                     |
| **Distribute Horizontal** | Space evenly             | Equal spacing between objects horizontally           |
| **Distribute Vertical**   | Space evenly             | Equal spacing between objects vertically             |

**Keyboard Shortcuts:**

- **Cmd/Ctrl+Shift+L** – Align Left
- **Cmd/Ctrl+Shift+H** – Align Horizontal Center
- **Cmd/Ctrl+Shift+T** – Align Top
- **Cmd/Ctrl+Shift+V** – Align Vertical Middle

**Algorithm (Align Left Example):**

```typescript
function alignLeft(objects: CanvasObject[]): void {
  const minX = Math.min(...objects.map((o) => o.x));
  objects.forEach((obj) => {
    updateObject(obj.id, { x: minX });
  });
}
```

**Acceptance Criteria:**

- ✅ Alignment applies instantly (no animation)
- ✅ Changes sync immediately (<100ms)
- ✅ Works with rotated objects (aligns bounding box)
- ✅ Undo-able (if undo implemented later)
- ✅ Distribute handles edge cases (2 objects = no-op)

---

### 3.4 Export Functionality

#### Feature: Canvas Export

**UI Design:**

```tsx
<button onClick={openExportModal}>
  <Download className="w-4 h-4" />
  Export
</button>

<Modal>
  <h3>Export Canvas</h3>
  <RadioGroup>
    <Radio value="png">PNG (2x resolution)</Radio>
    <Radio value="svg">SVG (vector)</Radio>
  </RadioGroup>
  <RadioGroup>
    <Radio value="all">Entire Canvas</Radio>
    <Radio value="selection">Selected Objects Only</Radio>
  </RadioGroup>
  <Button onClick={handleExport}>Download</Button>
</Modal>
```

**Implementation (Konva.js):**

```typescript
function exportToPNG(): void {
  const stage = stageRef.current;
  const dataURL = stage.toDataURL({
    pixelRatio: 2, // 2x for high DPI
    mimeType: "image/png",
  });

  const link = document.createElement("a");
  link.download = `collabcanvas-${Date.now()}.png`;
  link.href = dataURL;
  link.click();
}

function exportToSVG(): void {
  // Convert Konva objects to SVG elements
  const svgString = generateSVGFromCanvas(objects);
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.download = `collabcanvas-${Date.now()}.svg`;
  link.href = url;
  link.click();
}
```

**Acceptance Criteria:**

- ✅ PNG exports at 2x resolution (high DPI)
- ✅ SVG preserves all shapes as vectors (no rasterization)
- ✅ Text exports correctly in SVG (font, size, color)
- ✅ Selection-only export crops to bounding box
- ✅ Large exports (500+ objects) don't freeze UI (use Web Worker)
- ✅ Filename includes timestamp for versioning

---

## Section 4: Advanced Collaboration

### 4.1 Collaborative Comments

#### Feature: Simple Pin-Based Comments (Minimal - No Threading)

**Scope:** Simplified for Phase 2 - just pins with basic text, no replies/threading

**UI Design:**

- **Comment Mode Toggle:** Button in toolbar (or press `C` key)
- **In Comment Mode:** Cursor becomes pin icon
- **Click Canvas:** Drops comment pin at exact location
- **Pin Visual:** Numbered circle with user's color (e.g., "1", "2")

**Comment Panel:**

```tsx
<div className="comment-panel sidebar-right">
  <h3>Comments ({unresolved.length})</h3>
  {comments.map((comment) => (
    <div key={comment.id} className="comment-item">
      <div className="comment-header">
        <Avatar user={comment.author} />
        <span>{comment.author.name}</span>
        <time>{formatTime(comment.createdAt)}</time>
      </div>
      <p>{comment.text}</p>
      <Button onClick={resolveComment}>Resolve</Button>
    </div>
  ))}
</div>
```

**Data Model (Simplified - No Threading):**

```typescript
interface Comment {
  id: string;
  canvasId: string;
  x: number; // canvas coordinates
  y: number;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: number;
  resolved: boolean;
  // NO thread array - threading deferred to Phase 3
}
```

**Firebase Structure:**

```json
{
  "comments": {
    "default": {
      "{commentId}": {
        "id": "comment-123",
        "x": 300,
        "y": 400,
        "authorId": "user-abc",
        "authorName": "Sarah Chen",
        "text": "Should this button be bigger?",
        "createdAt": 1697123456789,
        "resolved": false
      }
    }
  }
}
```

**Interaction Flow (Simplified):**

1. Click "Comment" button or press `C` → enters comment mode
2. Click canvas → pin drops, comment input appears
3. Type comment → saves to Firebase
4. Other users see pin immediately (syncs within 200ms)
5. Click pin or panel entry → scrolls canvas to comment location
6. Mark resolved → pin turns gray, moves to "Resolved" section
7. Delete comment → requires confirmation

**Acceptance Criteria:**

- ✅ Pins render at exact canvas coordinates (zoom/pan transform)
- ✅ Comments sync within 200ms
- ✅ Clicking pin centers it in viewport
- ✅ Resolved comments hidden by default (toggle to show)
- ✅ Comment panel supports 100+ comments without lag
- ✅ Pins are not selectable in design mode (only in comment mode)
- ✅ Delete comment requires confirmation
- ✅ Keyboard shortcut: `C` toggles comment mode

**Phase 2 Scope:** Basic pins + text only. Threading/replies deferred to Phase 3.

---

## Database Schema Changes

### Updated CanvasObject Schema

```typescript
// Discriminated union for type safety
type CanvasObject =
  | RectangleObject
  | CircleObject
  | StarObject
  | LineObject
  | TextObject;

interface BaseObject {
  id: string;
  type: "rectangle" | "circle" | "star" | "line" | "text";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // NEW: degrees (0-360)
  zIndex: number; // NEW: layer order
  fill: string;
  stroke: string; // NEW: border color
  strokeWidth: number; // NEW: border width (0-20px)
  lastEditedBy: string; // NEW: userId
  lastEditedByName: string; // NEW: display name
  lastEditedAt: number; // NEW: timestamp
  createdBy: string;
  timestamp: number;
}

interface RectangleObject extends BaseObject {
  type: "rectangle";
}

interface CircleObject extends BaseObject {
  type: "circle";
  radius: number; // calculated from width/2
}

interface StarObject extends BaseObject {
  type: "star";
  points: number; // 3-12, default: 5
  innerRadius: number; // 0.0-1.0 ratio
  outerRadius: number; // calculated from width/2
}

interface LineObject extends BaseObject {
  type: "line";
  points: [number, number, number, number]; // [x1, y1, x2, y2]
  arrowStart: boolean;
  arrowEnd: boolean;
  fill: never; // lines can't be filled
}

interface TextObject extends BaseObject {
  type: "text";
  text: string;
  fontFamily: string; // default: 'Arial'
  fontSize: number; // default: 16
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  textAlign: "left" | "center" | "right";
  color: string; // text color (same as fill)
  // width/height auto-calculated from text content
}
```

### Firebase Realtime Database Structure (Phase 2)

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
          "type": "circle",
          "x": 100,
          "y": 200,
          "width": 150,
          "height": 150,
          "rotation": 45,
          "zIndex": 5,
          "fill": "#3B82F6",
          "stroke": "#000000",
          "strokeWidth": 2,
          "radius": 75,
          "lastEditedBy": "user-abc",
          "lastEditedByName": "Sarah Chen",
          "lastEditedAt": 1697123456789,
          "createdBy": "user-abc",
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
        "selectedIds": ["obj-123", "obj-456"],
        "lastSeen": 1697123456789
      }
    }
  },
  "comments": {
    "default": {
      "{commentId}": {
        "id": "comment-123",
        "x": 300,
        "y": 400,
        "authorId": "user-abc",
        "authorName": "Sarah Chen",
        "text": "Should this button be bigger?",
        "createdAt": 1697123456789,
        "resolved": false
      }
    }
  },
  "operationQueue": {
    "{userId}": {
      "{operationId}": {
        "id": "op-123",
        "type": "update",
        "objectId": "obj-456",
        "payload": { "x": 150, "y": 250 },
        "timestamp": 1697123456789,
        "retryCount": 0
      }
    }
  }
}
```

**Migration Strategy:**

- Existing rectangles automatically get default values for new fields
- `rotation: 0`, `zIndex: timestamp`, `stroke: "#000000"`, `strokeWidth: 2`
- No data loss, backward compatible

---

## Technical Implementation Strategy

### Phase 2A: Infrastructure (Weeks 1-3, PRs #12-14)

#### PR #12: Offline Queue + Connection Status

**Files to Create:**

- `src/utils/offlineQueue.ts` – simplified 5-10 min queue
- `src/utils/indexedDBManager.ts` – plain text storage
- `src/components/layout/ConnectionBanner.tsx` – offline/reconnecting only
- `src/components/layout/ConnectionStatusDot.tsx` – green dot for online
- `src/hooks/useConnectionStatus.ts`

**Files to Update:**

- `src/contexts/CanvasContext.tsx` – integrate queue
- `src/services/canvasService.ts` – queue operations
- `src/App.tsx` – add ConnectionBanner + StatusDot
- `src/components/layout/Header.tsx` – add green dot in header

**Testing:**

- Disconnect WiFi mid-edit → make 20 changes → reconnect → all sync
- Disconnect for 11 minutes → verify canvas disables + "Reconnect Required" modal
- Banner only shows when offline/reconnecting (not when online)
- Green dot visible in header when online

---

#### PR #13: Conflict Resolution (Delete vs. Edit)

**Files to Create:**

- `src/services/transactionService.ts`

**Files to Update:**

- `src/services/canvasService.ts` – use transactions
- `src/contexts/CanvasContext.tsx` – handle transaction failures
- `src/components/canvas/CanvasObject.tsx` – show delete toast

**Testing:**

- Automated test: 100 delete-edit races → 0 ghosts
- Manual test: 2 browsers, simultaneous delete+edit

---

#### PR #14: Last Edit Attribution + Stress Testing

**Files to Create:**

- `src/components/canvas/EditAttributionBadge.tsx`
- `tests/stress/multi-user-stress.test.ts`

**Files to Update:**

- `src/types/canvas.types.ts` – add attribution fields
- `src/services/canvasService.ts` – save attribution
- `src/components/canvas/CanvasObject.tsx` – show badge

**Testing:**

- 1-hour stress test: 5 users, 500+ objects, 100+ edits/min
- Verify: 60 FPS, <100ms sync, 0 failures

---

### Phase 2B: Core Tools (Weeks 4-6, PRs #15-17)

#### PR #15: New Shapes (Circle, Star, Line) + Stroke

**Files to Create:**

- `src/components/canvas/shapes/CircleShape.tsx`
- `src/components/canvas/shapes/StarShape.tsx`
- `src/components/canvas/shapes/LineShape.tsx`
- `src/components/canvas/StrokeProperties.tsx`

**Files to Update:**

- `src/types/canvas.types.ts` – add shape types
- `src/components/canvas/CanvasObject.tsx` – dispatch to shape components
- `src/contexts/CanvasContext.tsx` – creation functions
- `src/components/canvas/CanvasControls.tsx` – toolbar buttons

**Testing:**

- Create 100 of each shape → 60 FPS maintained
- Stroke changes sync <100ms
- All shapes resize/move/delete correctly

---

#### PR #16: Text Tool + Font Formatting

**Files to Create:**

- `src/components/canvas/shapes/TextShape.tsx`
- `src/components/canvas/TextEditor.tsx`
- `src/components/canvas/FontProperties.tsx`

**Files to Update:**

- `src/types/canvas.types.ts` – TextObject type
- `src/contexts/CanvasContext.tsx` – text creation
- `src/components/canvas/CanvasControls.tsx` – text button

**Testing:**

- Type 1000 characters → no lag
- Text syncs character-by-character (debounced)
- Font changes apply instantly
- Copy/paste from Word works

---

#### PR #17: Rotation + Multi-Select

**Files to Create:**

- `src/components/canvas/RotationHandle.tsx`
- `src/components/canvas/SelectionBox.tsx`
- `src/utils/multiSelectHelpers.ts`

**Files to Update:**

- `src/types/canvas.types.ts` – add rotation field
- `src/contexts/CanvasContext.tsx` – selectedIds array
- `src/components/canvas/Canvas.tsx` – drag-box selection
- `src/components/canvas/CanvasObject.tsx` – rotation handle

**Testing:**

- Rotate 50 objects simultaneously → 60 FPS
- Multi-select 100 objects → move smoothly
- Shift+click selection works predictably

---

### Phase 2C: Workflow Features (Weeks 7-8, PRs #18-20)

#### PR #18: Keyboard Shortcuts + Copy/Paste

**Files to Create:**

- `src/hooks/useKeyboardShortcuts.ts`
- `src/utils/clipboardManager.ts`
- `src/components/layout/ShortcutHelp.tsx`

**Files to Update:**

- `src/contexts/CanvasContext.tsx` – clipboard state
- `src/components/canvas/Canvas.tsx` – keyboard listeners
- `src/App.tsx` – help modal

**Testing:**

- All shortcuts work as documented
- Copy/paste maintains relative positions
- Nudge doesn't cause sync storms
- Works with multi-select

---

#### PR #19: Layers Panel + Z-Index Management

**Files to Create:**

- `src/components/layout/LayersPanel.tsx`
- `src/components/layout/LayerItem.tsx`
- `src/hooks/useLayerReordering.ts`

**Files to Update:**

- `src/types/canvas.types.ts` – add zIndex
- `src/contexts/CanvasContext.tsx` – layer operations
- `src/components/canvas/Canvas.tsx` – render by zIndex
- `src/App.tsx` – add layers panel

**Testing:**

- Drag-to-reorder 50 layers → smooth
- Panel syncs with canvas selection
- Layers update within 100ms

---

#### PR #20: Export (PNG/SVG)

**Files to Create:**

- `src/components/canvas/ExportModal.tsx`
- `src/utils/exportHelpers.ts`
- `src/utils/svgGenerator.ts`

**Files to Update:**

- `src/components/canvas/CanvasControls.tsx` – export button

**Testing:**

- Export 500 objects → completes in <5 seconds
- PNG is high quality (2x resolution)
- SVG opens correctly in Illustrator/Figma
- Selection-only export crops correctly

---

### Phase 2D: Advanced Features (Weeks 9-10, PRs #21-22)

#### PR #21: Alignment/Distribution Tools

**Files to Create:**

- `src/components/canvas/AlignmentToolbar.tsx`
- `src/utils/alignmentHelpers.ts`

**Files to Update:**

- `src/contexts/CanvasContext.tsx` – alignment functions
- `src/components/canvas/CanvasControls.tsx` – align buttons
- `src/hooks/useKeyboardShortcuts.ts` – align shortcuts

**Testing:**

- Align 50 objects → instant
- Distribute works with 2-100 objects
- Works with rotated objects

---

#### PR #22: Collaborative Comments (Simplified - No Threading)

**Files to Create:**

- `src/components/collaboration/CommentPin.tsx`
- `src/components/collaboration/CommentPanel.tsx`
- `src/hooks/useComments.ts`
- `src/services/commentService.ts`

**Files to Update:**

- `src/types/collaboration.types.ts` – Comment types (no thread array)
- `src/components/canvas/Canvas.tsx` – comment mode
- `src/App.tsx` – comment panel

**Testing:**

- 100 comments on canvas → no performance drop
- Comments sync within 200ms
- Resolve/delete functionality works

**Note:** Simplified for Phase 2 - just pins + basic text. Threading deferred to Phase 3.

---

#### PR #23: Properties Panel + First-Time Onboarding

**Files to Create:**

- `src/components/canvas/PropertiesPanel.tsx` – floating panel
- `src/components/canvas/ObjectProperties.tsx` – property inputs
- `src/components/layout/ShortcutGuide.tsx` – first-time user guide
- `src/hooks/usePropertiesPanel.ts` – positioning logic

**Files to Update:**

- `src/components/canvas/Canvas.tsx` – show properties panel
- `src/components/canvas/CanvasControls.tsx` – add tooltips with shortcuts
- `src/App.tsx` – add ShortcutGuide

**Properties Panel Features:**

- **Floating panel** near selected object (not sidebar)
- Contextual properties based on object type:
  - Rectangle/Circle/Star: Fill, Stroke, Stroke Width, Rotation, Width, Height
  - Line: Stroke, Stroke Width, Arrow options
  - Text: Font, Size, Bold/Italic, Align, Color
- Draggable positioning
- Auto-hides when no selection

**Onboarding Features:**

- Small floating container (bottom-right corner)
- Shows on first login only (localStorage: `hasSeenShortcuts`)
- Lists all keyboard shortcuts
- Dismissible with "Don't show again"
- "Show again" button in header Help menu

**Testing:**

- Properties panel updates in real-time
- Panel positioned correctly with canvas zoom/pan
- Tooltips show on all toolbar buttons
- Onboarding appears on first login only
- All shortcuts listed accurately

---

## Performance Targets

### Must Meet (P0):

- ✅ **60 FPS** maintained with 500+ mixed objects
- ✅ **<100ms sync** for all object operations (5+ users)
- ✅ **<50ms sync** for cursor positions (5+ users)
- ✅ **Zero data loss** in 1-hour stress test
- ✅ **<2 second** reconnection recovery time

### Should Meet (P1):

- ✅ Multi-select 50+ objects without lag
- ✅ Export 500+ objects in <5 seconds
- ✅ Layers panel handles 100+ objects smoothly
- ✅ Text editing feels instant (<16ms keystroke latency)

### Nice to Have (P2):

- Comments panel handles 100+ threads
- Offline queue supports 100+ operations
- All animations are smooth (60 FPS)

---

## Out of Scope (Explicitly Deferred)

### Not in Phase 2:

❌ **Advanced vector editing** (pen tool, bezier curves)
❌ **Component systems** (reusable symbols/instances)
❌ **Prototyping** (interaction modes, animations)
❌ **Version history** (time travel, branching)
❌ **Plugin system** (extensions, marketplace)
❌ **Multiple projects** (still single shared canvas)
❌ **Rich text formatting** (inline bold/italic within single text object - entire text can be bold/italic)
❌ **Layer renaming** (auto-naming only, manual rename in Phase 3)
❌ **Persistent groups** (temporary multi-select only)
❌ **Image uploads** (raster images, photos)
❌ **Gradients** (solid colors only)
❌ **Shadows/effects** (drop shadows, blur)
❌ **Grids/guides** (snap-to-grid, smart guides)
❌ **Object locking** (prevent accidental edits)
❌ **Permissions/roles** (all users have full edit access)
❌ **Mobile apps** (web-only for Phase 2)
❌ **Dark mode** (single theme)
❌ **Undo/redo** (saved for Phase 3)

**Rationale:** These features are valuable but not critical for production readiness. Phase 2 focuses on reliability + core design tools.

---

## Success Criteria

Phase 2 will be considered **complete and production-ready** when:

### ✅ Functional Completeness (100% of P0, 80% of P1)

- [x] All infrastructure hardening features shipped
- [x] All 5 shape types working (Rectangle, Circle, Star, Line, Text)
- [x] Stroke customization for all shapes
- [x] Rotation and multi-select
- [x] All Priority 1 keyboard shortcuts
- [x] Layers panel with drag-to-reorder
- [x] Export (PNG/SVG)
- [x] Alignment tools
- [x] Comments (simplified - pins + basic text, no threading)
- [x] Properties panel (floating, contextual)
- [x] First-time user onboarding (shortcut guide)

### ✅ Quality Benchmarks (Zero Critical Bugs)

- [x] **Zero data loss** in stress test (5 users, 1 hour, 100+ edits/min)
- [x] **Zero ghost objects** in delete-edit race condition test (100 iterations)
- [x] **Zero sync failures** in network instability test (disconnect/reconnect 20 times)
- [x] All P0 performance targets met (60 FPS, <100ms sync, <50ms cursors)

### ✅ Testing Coverage

- [x] Automated tests for conflict resolution
- [x] Automated tests for offline queue
- [x] Integration tests for all new shape types
- [x] Cross-browser testing (Chrome, Firefox, Safari latest)
- [x] Manual QA checklist completed (100+ test cases)

### ✅ Documentation

- [x] README updated with Phase 2 features
- [x] Architecture diagram updated with new components
- [x] Database schema documented
- [x] Keyboard shortcuts documented in-app help
- [x] API documentation for all new services/hooks

### ✅ User Experience

- [x] All features have intuitive UI (no training required)
- [x] Connection status always visible and accurate
- [x] No confusing error messages (user-friendly language)
- [x] Loading states for all async operations
- [x] Smooth animations throughout (no jank)

### ✅ Deployment

- [x] Successfully deployed to production
- [x] Tested with 10+ real users (dogfooding)
- [x] No rollback required within 72 hours of launch

---

## Risk Management

### High-Risk Areas & Mitigation

| Risk                                   | Probability | Impact   | Mitigation                                                | Contingency                                           |
| -------------------------------------- | ----------- | -------- | --------------------------------------------------------- | ----------------------------------------------------- |
| **Delete-edit race condition complex** | Medium      | Critical | Use Firebase Transactions (built-in atomic ops)           | Fall back to optimistic UI with manual reconciliation |
| **Offline queue causes conflicts**     | Medium      | High     | Timestamp-based resolution + transaction validation       | Show conflict modal, let user choose version          |
| **Multi-select performance degrades**  | Low         | Medium   | Throttle updates, batch Firebase writes                   | Limit multi-select to 50 objects                      |
| **Export breaks with large canvases**  | Low         | Medium   | Use Konva's built-in export, test early with 500+ objects | Offer "export visible area only" fallback             |
| **Text tool overlay positioning**      | Low         | Low      | Use Konva.Text + HTML textarea overlay (simplified)       | Fall back to modal-based text input                   |
| **Scope creep delays timeline**        | High        | High     | Strict prioritization, defer P2 features if needed        | Ship Phase 2 in 2 parts (2A+2B first, 2C+2D later)    |
| **Firebase costs spike**               | Low         | Low      | Monitor usage, optimize cursor throttling                 | Increase throttle intervals if needed                 |

---

## Timeline & Milestones

### Phase 2A: Infrastructure

**Goal:** Production-grade reliability

- **Week 1:** PR #12 (Offline queue + connection status)
- **Week 2:** PR #13 (Conflict resolution)
- **Week 3:** PR #14 (Attribution + stress testing)
- **Deliverable:** Zero data loss system

### Phase 2B: Core Tools

**Goal:** Versatile design toolkit

- **Week 4:** PR #15 (New shapes + stroke)
- **Week 5:** PR #16 (Text tool)
- **Week 6:** PR #17 (Rotation + multi-select)
- **Deliverable:** 5 shape types with full editing

### Phase 2C: Workflow Features

**Goal:** Productivity features

- **Week 7:** PR #18 (Keyboard shortcuts), PR #19 (Layers panel)
- **Week 8:** PR #20 (Export)
- **Deliverable:** Fast, keyboard-driven workflow

### Phase 2D: Advanced Features

**Goal:** Collaboration polish

- **Week 9:** PR #21 (Alignment tools)
- **Week 10:** PR #22 (Comments - if time permits)
- **Deliverable:** Team collaboration features

### Phase 2 Launch

- Final QA & bug fixes
- Documentation & help content
- Production deployment
- User testing & feedback collection

---

## Appendix: User Flow Examples

### Example 1: Designer Creates Logo

1. Sarah opens CollabCanvas
2. Clicks "Circle" → creates perfect circle at center
3. Adjusts stroke width to 4px, color to black
4. Clicks "Star" → creates 5-point star
5. Moves star to center of circle (drag)
6. Shift+clicks both → multi-selects
7. Right-click → "Align Center" → perfectly centered
8. Clicks "Text" → types "ACME Co."
9. Changes font to Georgia, size to 24pt
10. Shift+clicks all 3 objects
11. Cmd+G to group (future feature) or keeps selected
12. Exports as SVG (vector for print)

**Result:** Logo created in 2 minutes, exported as scalable vector

---

### Example 2: Team Handles Network Issues

1. Marcus is editing rectangles when WiFi drops
2. Connection banner appears: "You're offline – 0 changes queued"
3. Marcus moves 5 rectangles and creates 2 circles
4. Banner updates: "You're offline – 7 changes queued"
5. WiFi reconnects automatically after 30 seconds
6. Banner: "Reconnecting..." → spinner shows progress
7. Queue processes: "Syncing 7 changes..."
8. Banner: "You're back online – 7 changes synced" → fades out
9. Sarah (on stable connection) sees all 7 changes appear smoothly

**Result:** Zero work lost despite 30-second disconnect

---

### Example 3: Race Condition Handled Gracefully

1. Sarah selects red rectangle, starts changing color to blue
2. Marcus simultaneously deletes that rectangle
3. Firebase Transaction detects deletion before Sarah's update
4. Sarah's color change aborts
5. Toast appears: "This object was deleted by Marcus Lee"
6. Rectangle disappears from Sarah's canvas (no ghost)
7. Sarah's undo stack (future feature) shows no failed operation

**Result:** Consistent state across all users, no confusion

---

### Example 4: Multi-Object Alignment

1. Designer has 6 buttons scattered on canvas
2. Shift+clicks all 6 → multi-select (unified bounding box appears)
3. Clicks "Align Left" button in toolbar
4. All buttons snap to leftmost edge instantly
5. Clicks "Distribute Vertical" button
6. Buttons space evenly (equal gaps)
7. Changes sync to collaborators in <100ms

**Result:** Professional layout in 10 seconds vs. manual positioning

---

## Conclusion

Phase 2 transforms CollabCanvas from a promising MVP into a reliable, feature-rich collaborative design tool. By focusing on infrastructure reliability first, then expanding creative tools, and finally adding workflow enhancements, we ensure a solid foundation for future growth.

**Key Success Factors:**

1. **Discipline:** Strict adherence to scope (no feature creep)
2. **Testing:** Continuous validation of performance targets
3. **Prioritization:** P0 features ship first, P2 can slip if needed
4. **User Focus:** Every feature solves a real designer pain point

**Post-Phase 2 Roadmap Preview:**

- **Phase 3:** Multiple projects, undo/redo, advanced text formatting
- **Phase 4:** Components/symbols, prototyping, plugins
- **Phase 5:** Mobile apps, real-time video/audio, AI features
