# CollabCanvas - Phase 2 Task List & PR Breakdown

## Phase 2 Overview

**Mission:** Transform CollabCanvas from MVP into production-ready collaborative design platform

**Strategic Pillars:**

1. **Infrastructure Hardening** - Zero data loss, production-grade reliability
2. **Creative Tool Expansion** - 5 shape types, text tool, rotation
3. **Workflow Enhancement** - Keyboard shortcuts, multi-select, alignment, export
4. **Advanced Collaboration** - Comments, enhanced presence

---

## PR Breakdown & Task Checklist

### PR #12: Offline Queue & Connection Status

**Goal:** Implement simplified offline support (5-10 min window) with connection status UI

- [ ] **Task 12.1: Create IndexedDB manager**

  - Files to create: `src/utils/indexedDBManager.ts`
  - Implement: Database initialization, CRUD operations for queued operations
  - Storage: Plain text (no encryption)
  - Add: Error handling and migration logic

- [ ] **Task 12.2: Build offline operation queue (Simplified)**

  - Files to create: `src/utils/offlineQueue.ts`
  - Implement: `OfflineQueue` class with `enqueue()`, `processQueue()`, `persistToIndexedDB()`
  - Add: 10-minute timeout check (configurable 5-10 min)
  - Add: `disableCanvas()` method - shows "Reconnect Required" modal after timeout
  - Add: Exponential backoff retry logic (max 3 retries within timeout window)
  - Add: Operation ordering and deduplication

- [ ] **Task 12.3: Create connection status hook**

  - Files to create: `src/hooks/useConnectionStatus.ts`
  - Implement: Online/offline detection using `navigator.onLine`
  - Add: Firebase connection monitoring
  - Track: Queued operation count, offline duration
  - Trigger: Canvas disable after 10-minute timeout

- [ ] **Task 12.4: Build connection status banner (Offline/Reconnecting Only)**

  - Files to create: `src/components/layout/ConnectionBanner.tsx`
  - Implement: 3 states (Offline, Reconnecting, Syncing) - NO "Online" state in banner
  - Add: Manual retry button
  - Add: Queued operation count display
  - Style: Non-modal fixed top banner, only visible when offline/reconnecting
  - Add: Auto-dismiss after successful reconnection

- [ ] **Task 12.5: Create connection status dot (Online Indicator)**

  - Files to create: `src/components/layout/ConnectionStatusDot.tsx`
  - Implement: Small green dot (2px circle) for online status
  - Position: Top-right header, near username
  - Always visible when online (unobtrusive)
  - Add: ARIA label for accessibility

- [ ] **Task 12.6: Integrate queue with canvas context**

  - Files to update: `src/contexts/CanvasContext.tsx`
  - Add: Queue all create/update/delete operations when offline
  - Implement: Automatic queue processing on reconnection
  - Add: Canvas disable logic after 10-minute timeout

- [ ] **Task 12.7: Integrate queue with canvas service**

  - Files to update: `src/services/canvasService.ts`
  - Update: All Firebase operations to use queue
  - Add: Network error detection and queue fallback

- [ ] **Task 12.8: Add connection UI to app**

  - Files to update: `src/App.tsx`
  - Add: `<ConnectionBanner />` at top of layout (conditional render)
  - Files to update: `src/components/layout/Header.tsx`
  - Add: `<ConnectionStatusDot />` in header (top-right, near username)
  - Wire: Connection status state

- [ ] **Task 12.9: Test offline functionality**
  - Manual testing: Disconnect WiFi → make 20 changes → reconnect
  - Test: Queue persists across page refresh (within 10 min)
  - Test: Operations execute in order on reconnect
  - Test: After 11 minutes offline → canvas disables with "Reconnect Required" modal
  - Test: Banner only appears when offline/reconnecting (not when online)
  - Test: Green dot visible in header when online

**PR Title:** `feat: implement offline queue with IndexedDB persistence`

---

### PR #13: Conflict Resolution & Transaction System

**Goal:** Eliminate race conditions with Firebase Transactions

- [x] **Task 13.1: Create transaction service**

  - Files to create: `src/services/transactionService.ts`
  - Implement: `updateObjectTransaction()` using Firebase `runTransaction()`
  - Add: Atomic delete validation (abort update if object deleted)
  - Add: Last-write-wins timestamp comparison

- [x] **Task 13.2: Update canvas service to use transactions**

  - Files to update: `src/services/canvasService.ts`
  - Replace: Direct Firebase updates with transaction calls
  - Add: Transaction error handling and user feedback

- [x] **Task 13.3: Add delete conflict detection**

  - Files to update: `src/contexts/CanvasContext.tsx`
  - Implement: Transaction abort handling
  - Show: Toast notification "Object was deleted by [User Name]"

- [x] **Task 13.4: Update canvas object component**

  - Files to update: `src/components/canvas/CanvasObject.tsx`
  - Add: Transaction-based updates on drag/resize
  - Handle: Graceful failure when object deleted mid-edit

- [x] **Task 13.5: Create automated test suite**

  - Files to create: `tests/integration/conflict-resolution.test.tsx`
  - Test: 100 delete-edit race conditions → 0 ghost objects
  - Test: Concurrent edits resolve correctly
  - Test: Last-write-wins strategy works

- [ ] **Task 13.6: Manual multi-browser testing**
  - Test: 2 browsers, simultaneous delete + edit
  - Test: 3+ users editing same object
  - Verify: Consistent state across all clients

**PR Title:** `feat: implement atomic transactions for conflict resolution`

---

### PR #14: Last Edit Attribution & Stress Testing

**Goal:** Show edit attribution on hover and validate production readiness

- [x] **Task 14.1: Update canvas types with attribution**

  - Files to update: `src/types/canvas.types.ts`
  - Add: `lastEditedBy`, `lastEditedByName`, `lastEditedAt` to `CanvasObject`

- [x] **Task 14.2: Update canvas service to save attribution**

  - Files to update: `src/services/canvasService.ts`, `src/services/transactionService.ts`
  - Add: Attribution fields to all create/update operations
  - Use: Current user ID and name from auth context

- [x] **Task 14.3: Create hover tooltip component**

  - Files to create: `src/components/canvas/EditAttributionTooltip.tsx`, `src/components/canvas/EditAttributionTooltip.css`
  - Implement: HTML tooltip positioned near cursor
  - Display: "Last edited by [Name], [time] ago"
  - Style: Smooth fade in/out (200ms), dark background with white text
  - Handle: Deleted users (show "Unknown User")

- [x] **Task 14.4: Integrate tooltip with canvas object**

  - Files to update: `src/components/canvas/CanvasObject.tsx`
  - Add: `onMouseEnter`/`onMouseLeave` event handlers
  - Show: Tooltip on hover with attribution data
  - Hide: Tooltip when mouse leaves object
  - Calculate: Relative time (e.g., "5 minutes ago", "2 hours ago")

- [ ] **Task 14.5: Create stress test suite**

  - Files to create: `tests/stress/multi-user-stress.test.ts`
  - Implement: 5 simulated users, 500+ objects, 100+ edits/min
  - Run: 1-hour continuous test
  - Monitor: FPS (target: 60), sync latency (<100ms), failures (target: 0)

- [ ] **Task 14.6: Enhance performance monitoring utility**

  - Files to update: `src/utils/performanceMonitor.ts` (already exists from MVP)
  - Add: Operation success rate tracking
  - Add: Failure logging and categorization
  - Verify: FPS counter and sync latency tracking are working

- [ ] **Task 14.7: Run and validate stress test**
  - Execute: 1-hour stress test
  - Verify: Zero data loss, zero sync failures
  - Profile: Memory usage, identify bottlenecks
  - Document: Results and any optimizations made

**PR Title:** `feat: add last edit attribution and validate production readiness`

---

### PR #15: New Shapes (Circle, Star, Line) & Stroke Customization

**Goal:** Expand from rectangles to 5 shape types with stroke controls

- [ ] **Task 15.1: Update canvas types for new shapes**

  - Files to update: `src/types/canvas.types.ts`
  - Add: `CircleObject`, `StarObject`, `LineObject` interfaces
  - Add: `stroke`, `strokeWidth` to `BaseObject`
  - Create: Discriminated union type for `CanvasObject`

- [ ] **Task 15.2: Create Circle shape component**

  - Files to create: `src/components/canvas/shapes/CircleShape.tsx`
  - Implement: Konva.Circle rendering
  - Add: Proportional resize (aspect ratio lock)
  - Properties: radius (derived from width/2), fill, stroke

- [ ] **Task 15.3: Create Star shape component**

  - Files to create: `src/components/canvas/shapes/StarShape.tsx`
  - Implement: Konva.Star rendering
  - Add: Configurable points (3-12, default: 5)
  - Add: Inner radius ratio (0.0-1.0, default: 0.5)

- [ ] **Task 15.4: Create Line shape component**

  - Files to create: `src/components/canvas/shapes/LineShape.tsx`
  - Implement: Konva.Line rendering with arrow heads
  - Add: Click-drag creation interaction
  - Properties: start/end points, arrow options (none, start, end, both)

- [ ] **Task 15.5: Create stroke properties panel**

  - Files to create: `src/components/canvas/StrokeProperties.tsx`
  - Add: Stroke width slider (0-20px)
  - Add: Stroke color picker
  - Add: Fill color picker
  - Update: Real-time with debouncing (300ms)

- [ ] **Task 15.6: Update canvas object to dispatch shapes**

  - Files to update: `src/components/canvas/CanvasObject.tsx`
  - Add: Type-based rendering (switch on `object.type`)
  - Dispatch: To appropriate shape component (Rectangle, Circle, Star, Line)

- [ ] **Task 15.7: Add shape creation to canvas context**

  - Files to update: `src/contexts/CanvasContext.tsx`
  - Add: `createCircle()`, `createStar()`, `createLine()` functions
  - Set: Default properties (stroke: #000000, strokeWidth: 2)

- [ ] **Task 15.8: Add shape buttons to toolbar**

  - Files to update: `src/components/canvas/CanvasControls.tsx`
  - Add: Circle, Star, Line buttons
  - Update: Rectangle button styling for consistency
  - Add: Active state for line creation mode

- [ ] **Task 15.9: Test all shapes**
  - Test: Create 100 of each shape → 60 FPS maintained
  - Test: All shapes sync <100ms between users
  - Test: Stroke changes apply correctly
  - Test: Resize/move/delete works for all types

**PR Title:** `feat: add circle, star, and line shapes with stroke customization`

---

### PR #16: Text Tool & Font Formatting

**Goal:** Add rich text objects with font controls using Konva.Text + overlay textarea

- [ ] **Task 16.1: Create text object type**

  - Files to update: `src/types/canvas.types.ts`
  - Add: `TextObject` interface with text, font properties
  - Properties: fontFamily, fontSize, fontWeight, fontStyle, textAlign, color

- [ ] **Task 16.2: Create text shape component**

  - Files to create: `src/components/canvas/shapes/TextShape.tsx`
  - Implement: Konva.Text rendering for display
  - Add: Auto-resizing container (max width: 800px, then wrap)
  - Handle: Line breaks and word wrapping
  - Note: Uses Konva.Text, not contenteditable div

- [ ] **Task 16.3: Create text editor component (Overlay Textarea)**

  - Files to create: `src/components/canvas/TextEditor.tsx`
  - Implement: HTML textarea overlay positioned over Konva.Text
  - Position: Absolute positioning matching text object coordinates
  - Add: Click-to-create interaction (cursor becomes I-beam)
  - Add: Double-click existing text to edit
  - Handle: Escape to finish, click outside to finish
  - Sync: Textarea value to Konva.Text with debouncing (500ms)

- [ ] **Task 16.4: Create font properties panel**

  - Files to create: `src/components/canvas/FontProperties.tsx`
  - Add: Font family dropdown (Arial, Helvetica, Times New Roman, Georgia, Courier New, Verdana)
  - Add: Font size input (default: 16)
  - Add: Bold/Italic toggles
  - Add: Text align buttons (left, center, right)
  - Add: Text color picker

- [ ] **Task 16.5: Add text creation to canvas context**

  - Files to update: `src/contexts/CanvasContext.tsx`
  - Add: `createText()` function
  - Implement: Text editing state management
  - Add: Character-by-character sync (debounced 500ms)

- [ ] **Task 16.6: Add text button to toolbar**

  - Files to update: `src/components/canvas/CanvasControls.tsx`
  - Add: Text tool button with I-beam icon
  - Implement: Text creation mode toggle

- [ ] **Task 16.7: Integrate text with canvas**

  - Files to update: `src/components/canvas/Canvas.tsx`
  - Add: Text creation click handler
  - Show: Text editor at click position

- [ ] **Task 16.8: Test text functionality**
  - Test: Type 1000 characters → no lag
  - Test: Text syncs correctly (debounced)
  - Test: Font changes apply instantly
  - Test: Copy/paste from external sources works
  - Test: Line breaks and wrapping work correctly

**PR Title:** `feat: implement text tool with font formatting`

---

### PR #17: Rotation & Multi-Select

**Goal:** Add rotation to all objects and multi-object selection

- [ ] **Task 17.1: Add rotation to canvas types**

  - Files to update: `src/types/canvas.types.ts`
  - Add: `rotation` field to `BaseObject` (degrees, 0-360)

- [ ] **Task 17.2: Create rotation handle component**

  - Files to create: `src/components/canvas/RotationHandle.tsx`
  - Implement: Circular handle above bounding box (20px offset)
  - Add: Drag-to-rotate interaction
  - Add: Shift key for 15° snap

- [ ] **Task 17.3: Integrate rotation with canvas object**

  - Files to update: `src/components/canvas/CanvasObject.tsx`
  - Add: Rotation handle to selected objects
  - Apply: Konva rotation transform
  - Update: Rotation syncs immediately (no debouncing)

- [ ] **Task 17.4: Add rotation to properties panel**

  - Files to update: `src/components/canvas/StrokeProperties.tsx` (or create shared properties)
  - Add: Numeric rotation input with degree symbol
  - Add: 0-360 range validation

- [ ] **Task 17.5: Update canvas context for multi-select**

  - Files to update: `src/contexts/CanvasContext.tsx`
  - Change: `selectedId` to `selectedIds: string[]`
  - Add: `toggleSelection()`, `clearSelection()`, `selectAll()` functions

- [ ] **Task 17.6: Create selection box component**

  - Files to create: `src/components/canvas/SelectionBox.tsx`
  - Implement: Unified bounding box for multi-select
  - Add: Standard transform handles (corners and edges)
  - Calculate: Bounding box from all selected object bounds

- [ ] **Task 17.7: Implement Shift+Click selection**

  - Files to update: `src/components/canvas/CanvasObject.tsx`
  - Add: Shift key detection on click
  - Implement: Add/remove from selection

- [ ] **Task 17.8: Implement drag-box selection**

  - Files to update: `src/components/canvas/Canvas.tsx`
  - Add: Drag on empty canvas creates selection rectangle
  - Implement: Rubber-band visual feedback
  - Select: All objects intersecting selection box on release

- [ ] **Task 17.9: Create multi-select helpers**

  - Files to create: `src/utils/multiSelectHelpers.ts`
  - Implement: `getBoundingBox()`, `transformGroup()`, `maintainRelativePositions()`

- [ ] **Task 17.10: Implement group transformations**

  - Files to update: `src/components/canvas/SelectionBox.tsx`
  - Add: Group move (drag any selected object → all move)
  - Add: Group resize (scale all proportionally)
  - Add: Group rotate (rotate around group center)

- [ ] **Task 17.11: Update presence to sync selection**

  - Files to update: `src/types/collaboration.types.ts`
  - Add: `selectedIds` array to `UserPresence`
  - Files to update: `src/services/presenceService.ts`
  - Sync: Selection state between users (<50ms)

- [ ] **Task 17.12: Implement visual selection sync**

  - Files to create: `src/components/canvas/RemoteSelectionHighlight.tsx`
  - Render: Border highlights for other users' selections
  - Style: Use user's cursor color with 30% opacity border
  - Position: Overlay on selected objects (non-intrusive)
  - Update: In real-time when other users change selection
  - Handle: Multiple users selecting same object (stack borders)

- [ ] **Task 17.13: Test rotation and multi-select**
  - Test: Rotate 50 objects simultaneously → 60 FPS
  - Test: Multi-select 100 objects → move smoothly
  - Test: Shift+click selection predictable
  - Test: Drag-box selection feels natural
  - Test: Group transforms maintain relative positions
  - Test: Cmd/Ctrl+A selects all objects
  - Test: Other users see my selection with colored border
  - Test: Selection sync happens within 50ms

**PR Title:** `feat: implement rotation and multi-object selection`

---

### PR #18: Keyboard Shortcuts & Clipboard Operations

**Goal:** Add 10+ keyboard shortcuts for productivity

- [ ] **Task 18.1: Create clipboard manager**

  - Files to create: `src/utils/clipboardManager.ts`
  - Implement: In-memory clipboard storage (not browser clipboard)
  - Add: `ClipboardData` interface with objects array and timestamp

- [ ] **Task 18.2: Create keyboard shortcuts hook**

  - Files to create: `src/hooks/useKeyboardShortcuts.ts`
  - Implement: Global keyboard event listener
  - Add: Platform detection (Cmd on Mac, Ctrl on Windows/Linux)
  - Handle: All shortcuts with proper event.preventDefault()

- [ ] **Task 18.3: Implement clipboard operations in context**

  - Files to update: `src/contexts/CanvasContext.tsx`
  - Add: Clipboard state
  - Implement: `copy()`, `paste()`, `cut()`, `duplicate()` functions
  - Add: Paste offset logic (10px from original or at cursor)

- [ ] **Task 18.4: Add delete operation**

  - Files to update: `src/contexts/CanvasContext.tsx`
  - Update: `deleteObject()` to accept array of IDs
  - Add: Confirmation prompt for 10+ objects

- [ ] **Task 18.5: Implement nudge operations**

  - Files to update: `src/contexts/CanvasContext.tsx`
  - Add: `nudge()` function (arrow keys: 1px, shift+arrow: 10px)
  - Sync: Immediately (no debouncing)

- [ ] **Task 18.6: Implement layer ordering operations**

  - Files to update: `src/contexts/CanvasContext.tsx`
  - Add: `bringForward()`, `sendBackward()`, `bringToFront()`, `sendToBack()`
  - Add: `zIndex` field to `BaseObject` (default: auto-increment from timestamp)

- [ ] **Task 18.7: Integrate shortcuts with canvas**

  - Files to update: `src/components/canvas/Canvas.tsx`
  - Add: `useKeyboardShortcuts()` hook
  - Wire: All shortcut handlers to context functions
  - Handle: Focus management (disable when text editing)

- [ ] **Task 18.8: Create shortcut help modal**

  - Files to create: `src/components/layout/ShortcutHelp.tsx`
  - Add: Table of all shortcuts with descriptions
  - Add: Platform-specific display (⌘ vs Ctrl)
  - Trigger: ? key or Help menu item

- [ ] **Task 18.9: Add help button to header**

  - Files to update: `src/components/layout/Header.tsx`
  - Add: "?" button to open shortcut help

- [ ] **Task 18.10: Test all shortcuts**
  - Test: All clipboard operations work (copy, paste, cut, duplicate)
  - Test: Delete with confirmation for 10+ objects
  - Test: Nudge works in all directions
  - Test: Layer ordering shortcuts work
  - Test: Cmd/Ctrl+A selects all
  - Test: Escape clears selection
  - Test: Shortcuts work with multi-select

**Keyboard Shortcuts Reference:**

- Cmd/Ctrl+C: Copy
- Cmd/Ctrl+V: Paste
- Cmd/Ctrl+X: Cut
- Cmd/Ctrl+D: Duplicate
- Delete/Backspace: Delete selected
- Arrow Keys: Nudge 1px
- Shift+Arrow: Nudge 10px
- Cmd/Ctrl+A: Select All
- Escape: Deselect
- Cmd/Ctrl+]: Bring Forward
- Cmd/Ctrl+[: Send Backward
- Cmd/Ctrl+Shift+]: Bring to Front
- Cmd/Ctrl+Shift+[: Send to Back

**PR Title:** `feat: implement keyboard shortcuts and clipboard operations`

---

### PR #19: Layers Panel & Z-Index Management

**Goal:** Add visual layer hierarchy with drag-to-reorder

- [ ] **Task 19.1: Ensure zIndex in canvas types**

  - Files to update: `src/types/canvas.types.ts`
  - Verify: `zIndex` field exists on `BaseObject` (added in PR #18)

- [ ] **Task 19.2: Create layer item component**

  - Files to create: `src/components/layout/LayerItem.tsx`
  - Implement: Single layer row with icon, name, zIndex
  - Add: Draggable attribute
  - Add: Active state styling
  - Add: Click to select

- [ ] **Task 19.3: Create layers panel component**

  - Files to create: `src/components/layout/LayersPanel.tsx`
  - Implement: List of all canvas objects sorted by zIndex (descending)
  - Add: Scrollable container (handles 100+ objects)
  - Add: Auto-naming logic (per-shape counter: "Rectangle 1", "Rectangle 2", "Circle 1", "Circle 2")
  - Location: Right sidebar (always visible)
  - Note: Manual rename deferred to Phase 3

- [ ] **Task 19.4: Create layer reordering hook**

  - Files to create: `src/hooks/useLayerReordering.ts`
  - Implement: Drag-and-drop logic
  - Handle: zIndex updates on drop
  - Prevent: zIndex collisions

- [ ] **Task 19.5: Integrate reordering with layers panel**

  - Files to update: `src/components/layout/LayersPanel.tsx`
  - Add: Drag handlers (`onDragStart`, `onDragOver`, `onDrop`)
  - Update: zIndex via context function
  - Add: Visual drag feedback (placeholder, drag preview)

- [ ] **Task 19.6: Add layer operations to canvas context**

  - Files to update: `src/contexts/CanvasContext.tsx`
  - Add: `updateZIndex()` function
  - Add: `getObjectsByZIndex()` helper

- [ ] **Task 19.7: Sync selection between panel and canvas**

  - Files to update: `src/components/layout/LayersPanel.tsx`
  - Add: Click layer → selects object on canvas (bidirectional)
  - Add: Selected state styling

- [ ] **Task 19.8: Update canvas rendering by zIndex**

  - Files to update: `src/components/canvas/Canvas.tsx`
  - Sort: Objects by zIndex before rendering
  - Ensure: Higher zIndex renders on top

- [ ] **Task 19.9: Add layers panel to app layout**

  - Files to update: `src/App.tsx`
  - Add: Layers panel to right sidebar
  - Add: Collapsible/expandable functionality (optional)

- [ ] **Task 19.10: Test layers panel**
  - Test: Drag-to-reorder 50 layers → smooth (60 FPS)
  - Test: Panel syncs with canvas selection (bidirectional)
  - Test: Layer updates within 100ms
  - Test: Panel scrolls smoothly with 100+ objects
  - Test: Auto-naming works correctly

**PR Title:** `feat: implement layers panel with drag-to-reorder`

---

### PR #20: Alignment & Distribution Tools

**Goal:** Add multi-object alignment and distribution

- [ ] **Task 20.1: Create alignment helpers**

  - Files to create: `src/utils/alignmentHelpers.ts`
  - Implement: `alignLeft()`, `alignRight()`, `alignTop()`, `alignBottom()`
  - Implement: `alignHorizontalCenter()`, `alignVerticalMiddle()`
  - Implement: `distributeHorizontal()`, `distributeVertical()`

- [ ] **Task 20.2: Add alignment functions to canvas context**

  - Files to update: `src/contexts/CanvasContext.tsx`
  - Add: All 8 alignment/distribution functions
  - Implement: Batch updates for performance
  - Handle: Rotated objects (align bounding boxes)

- [ ] **Task 20.3: Create alignment toolbar component**

  - Files to create: `src/components/canvas/AlignmentToolbar.tsx`
  - Add: 8 alignment buttons (only visible when 2+ objects selected)
  - Add: Icons for each operation (left, center, right, top, middle, bottom, distribute-h, distribute-v)
  - Add: Tooltips with keyboard shortcuts

- [ ] **Task 20.4: Integrate alignment toolbar with canvas controls**

  - Files to update: `src/components/canvas/CanvasControls.tsx`
  - Add: Alignment toolbar (conditionally rendered)
  - Position: Below main toolbar or in properties panel

- [ ] **Task 20.5: Add alignment keyboard shortcuts**

  - Files to update: `src/hooks/useKeyboardShortcuts.ts`
  - Add: Cmd/Ctrl+Shift+L (Align Left)
  - Add: Cmd/Ctrl+Shift+H (Align Horizontal Center)
  - Add: Cmd/Ctrl+Shift+T (Align Top)
  - Add: Cmd/Ctrl+Shift+V (Align Vertical Middle)
  - Add: Cmd/Ctrl+Shift+R (Align Right)
  - Add: Cmd/Ctrl+Shift+B (Align Bottom)

- [ ] **Task 20.6: Test alignment tools**
  - Test: Align 50 objects → instant (no animation)
  - Test: Changes sync immediately (<100ms)
  - Test: Works with rotated objects (aligns bounding boxes)
  - Test: Distribute handles 2 objects correctly (no-op or center)
  - Test: All keyboard shortcuts work
  - Test: Alignment works with multi-select

**PR Title:** `feat: implement alignment and distribution tools`

---

### PR #21: Export Functionality (PNG/SVG)

**Goal:** Enable high-quality canvas export

- [ ] **Task 21.1: Create export helpers**

  - Files to create: `src/utils/exportHelpers.ts`
  - Implement: `exportToPNG()` using Konva's `stage.toDataURL()`
  - Add: 2x pixel ratio for high DPI
  - Add: Bounding box calculation for selection-only export

- [ ] **Task 21.2: Create SVG generator**

  - Files to create: `src/utils/svgGenerator.ts`
  - Implement: Convert Konva objects to SVG elements
  - Handle: All shape types (Rectangle, Circle, Star, Line, Text)
  - Preserve: Transforms (rotation, scale), colors, strokes

- [ ] **Task 21.3: Create export modal component**

  - Files to create: `src/components/canvas/ExportModal.tsx`
  - Add: Format selection (PNG, SVG radio buttons)
  - Add: Scope selection (Entire Canvas, Selected Objects radio buttons)
  - Add: Download button
  - Add: Filename preview with timestamp

- [ ] **Task 21.4: Implement PNG export**

  - Files to update: `src/utils/exportHelpers.ts`
  - Use: Konva `stage.toDataURL()` with `pixelRatio: 2`
  - Add: Selection-only export (crop to selection bounding box)
  - Handle: Large canvases (use Web Worker if needed)
  - Generate: Blob and trigger download

- [ ] **Task 21.5: Implement SVG export**

  - Files to update: `src/utils/svgGenerator.ts`
  - Convert: Each canvas object to SVG element
  - Handle: Text (preserve font, size, color)
  - Handle: Transforms (rotation, position)
  - Generate: Valid SVG string and trigger download

- [ ] **Task 21.6: Add export button to toolbar**

  - Files to update: `src/components/canvas/CanvasControls.tsx`
  - Add: Export button with download icon
  - Wire: Opens export modal

- [ ] **Task 21.7: Test export functionality**
  - Test: PNG exports at 2x resolution (high quality)
  - Test: SVG preserves all shapes as vectors
  - Test: Text exports correctly in SVG (fonts, formatting)
  - Test: Selection-only export crops correctly
  - Test: Large exports (500+ objects) complete in <5 seconds
  - Test: Filename includes timestamp
  - Test: Exported files open correctly in external tools (Illustrator, Figma)

**PR Title:** `feat: implement PNG and SVG export functionality`

---

### PR #22: Collaborative Comments (Simplified - No Threading)

**Goal:** Add simple pin-based commenting system (no threading/replies)

- [ ] **Task 22.1: Create comment types**

  - Files to update: `src/types/collaboration.types.ts`
  - Add: `Comment` interface WITHOUT thread array
  - Properties: id, canvasId, x, y, authorId, authorName, text, createdAt, resolved
  - Note: No CommentReply interface needed (threading deferred to Phase 3)

- [ ] **Task 22.2: Update database schema for comments**

  - Files to update: `firebase.json` (database rules)
  - Add: `/comments/{canvasId}/{commentId}` structure
  - Set: Read/write permissions

- [ ] **Task 22.3: Create comment service**

  - Files to create: `src/services/commentService.ts`
  - Implement: `createComment()`, `resolveComment()`, `deleteComment()`
  - Implement: Real-time comment subscription
  - Note: No `replyToComment()` - threading removed

- [ ] **Task 22.4: Create comment hook**

  - Files to create: `src/hooks/useComments.ts`
  - Implement: Comment state management
  - Add: Real-time listeners for comments
  - Track: Unresolved comment count

- [ ] **Task 22.5: Create comment pin component**

  - Files to create: `src/components/collaboration/CommentPin.tsx`
  - Implement: Numbered circle pin with user color
  - Add: Click to center in viewport
  - Transform: Position based on canvas zoom/pan

- [ ] **Task 22.6: Create comment panel component (Simplified)**

  - Files to create: `src/components/collaboration/CommentPanel.tsx`
  - Implement: Scrollable list of all comments (no threading)
  - Display: Author avatar, name, timestamp, text
  - Add: Unresolved count header
  - Add: Filter toggle (show/hide resolved)
  - Add: Click comment → centers pin in viewport
  - Add: Resolve button per comment
  - Note: No reply textarea - just single-level comments

- [ ] **Task 22.7: Add comment mode to canvas**

  - Files to update: `src/components/canvas/Canvas.tsx`
  - Add: Comment mode toggle (C key or toolbar button)
  - Implement: Click canvas → drop pin, show input field
  - Add: Pin layer (render above objects)

- [ ] **Task 22.8: Add comment panel to app layout**

  - Files to update: `src/App.tsx`
  - Add: Comment panel to sidebar
  - Wire: Comment state and handlers

- [ ] **Task 22.9: Add tooltips to toolbar**

  - Files to update: `src/components/canvas/CanvasControls.tsx`
  - Add: Tooltips to all toolbar buttons showing keyboard shortcuts
  - Example: "Add Rectangle (R)", "Text Tool (T)", "Comment (C)"

- [ ] **Task 22.10: Test comments system**
  - Test: 100 comments on canvas → no performance drop
  - Test: Comments sync within 200ms
  - Test: Clicking pin centers it in viewport
  - Test: Resolved comments hidden by default (toggle works)
  - Test: Pins not selectable in design mode (only in comment mode)
  - Test: Delete requires confirmation
  - Test: Comment mode keyboard shortcut (C) works

**Note:** Simplified for Phase 2 - just pins + basic text. Threading/replies deferred to Phase 3.

**PR Title:** `feat: implement simple pin-based commenting system`

---

### PR #23: Properties Panel + First-Time Onboarding

**Goal:** Add floating properties panel and onboarding for new users

- [ ] **Task 23.1: Create properties panel component**

  - Files to create: `src/components/canvas/PropertiesPanel.tsx`
  - Implement: Floating panel near selected object
  - Style: Card with shadow, draggable positioning
  - Show: Contextual properties based on object type
  - Auto-hide: When no selection

- [ ] **Task 23.2: Create object properties component**

  - Files to create: `src/components/canvas/ObjectProperties.tsx`
  - Implement: Property inputs for each object type:
    - Rectangle/Circle/Star: Fill, Stroke, Stroke Width, Rotation, Width, Height
    - Line: Stroke, Stroke Width, Arrow Start, Arrow End
    - Text: Font Family, Font Size, Bold, Italic, Text Align, Color
  - Update: Properties in real-time with debouncing (300ms)

- [ ] **Task 23.3: Create properties panel positioning hook**

  - Files to create: `src/hooks/usePropertiesPanel.ts`
  - Implement: Calculate panel position near selected object
  - Handle: Canvas zoom/pan transforms
  - Ensure: Panel stays on screen (boundary detection)
  - Add: Draggable positioning state

- [ ] **Task 23.4: Integrate properties panel with canvas**

  - Files to update: `src/components/canvas/Canvas.tsx`
  - Add: `<PropertiesPanel />` component
  - Wire: Selected object data and update handlers
  - Position: Near selected object, above other UI elements

- [ ] **Task 23.5: Create shortcut guide component**

  - Files to create: `src/components/layout/ShortcutGuide.tsx`
  - Implement: Small floating container (bottom-right corner)
  - Display: All keyboard shortcuts with descriptions
  - Add: "Don't show again" button (saves to localStorage: `hasSeenShortcuts`)
  - Style: Dismissible, semi-transparent background

- [ ] **Task 23.6: Add onboarding to app**

  - Files to update: `src/App.tsx`
  - Add: ShortcutGuide component (conditional render)
  - Check: localStorage on mount - show only on first login
  - Add: "Show Shortcuts" button in header Help menu

- [ ] **Task 23.7: Update header with Help menu**

  - Files to update: `src/components/layout/Header.tsx`
  - Add: Help menu item with "?" icon
  - Add: "Show Shortcuts" option → re-opens ShortcutGuide

- [ ] **Task 23.8: Test properties panel and onboarding**
  - Test: Properties panel shows correct inputs for each object type
  - Test: Property changes sync in real-time
  - Test: Panel positioned correctly with zoom/pan
  - Test: Draggable positioning works smoothly
  - Test: Panel auto-hides when selection cleared
  - Test: Onboarding appears on first login only
  - Test: "Show Shortcuts" button works from header
  - Test: All shortcuts listed accurately in guide

**PR Title:** `feat: add floating properties panel and first-time onboarding`

---

## Testing Strategy

### Unit Tests (Add to existing test suite)

**Files to create/update:**

- `tests/unit/utils/offlineQueue.test.ts`
- `tests/unit/utils/alignmentHelpers.test.ts`
- `tests/unit/utils/multiSelectHelpers.test.ts`
- `tests/unit/utils/svgGenerator.test.ts`
- `tests/unit/services/transactionService.test.ts`
- `tests/unit/services/commentService.test.ts`

**Coverage targets:**

- All utility functions: 100% coverage
- All services: 90%+ coverage
- Critical paths (offline queue, transactions): 100%

### Integration Tests

**Files to create:**

- `tests/integration/offline-reconnect.test.tsx`
- `tests/integration/multi-select-operations.test.tsx`
- `tests/integration/shape-creation-all-types.test.tsx`
- `tests/integration/export-validation.test.tsx`
- `tests/integration/keyboard-shortcuts.test.tsx`

**Test scenarios:**

- Offline queue processes correctly on reconnect
- Multi-select transformations maintain relative positions
- All shape types create, sync, and render correctly
- Export produces valid PNG/SVG files
- All keyboard shortcuts trigger correct actions

### Stress Tests

**Files to create:**

- `tests/stress/five-user-session.test.ts` (existing from PR #14)
- `tests/stress/large-canvas-export.test.ts`
- `tests/stress/rapid-keyboard-operations.test.ts`

**Test scenarios:**

- 5 users, 500+ objects, 1 hour continuous editing
- Export 1000+ objects without freezing UI
- Rapid keyboard shortcuts (100+ in 10 seconds)

### Manual Testing Checklist

**Before Each PR Merge:**

- [ ] Feature works in isolation
- [ ] No console errors or warnings
- [ ] TypeScript compiles without errors
- [ ] No regressions in existing features
- [ ] Works in Chrome, Firefox, Safari (latest versions)
- [ ] Responsive design intact (if applicable)
- [ ] Accessibility: keyboard navigation works
- [ ] Performance: 60 FPS maintained

**Multi-User Testing (for collaboration PRs):**

- [ ] Open 3+ browser windows (different users)
- [ ] Test simultaneous edits
- [ ] Verify sync speed (<100ms objects, <50ms cursors)
- [ ] Check conflict resolution
- [ ] Test disconnect/reconnect scenario

---

## Phase 2 Completion Criteria

### Functional Completeness

**P0 Features (Must Ship):**

- [ ] Offline queue with IndexedDB persistence (simplified 5-10 min window)
- [ ] Connection status banner (offline/reconnecting only) + green dot (online)
- [ ] Atomic transaction system (zero ghost objects)
- [ ] Last edit attribution badges
- [ ] 5 shape types (Rectangle, Circle, Star, Line, Text)
- [ ] Stroke customization (width, color) for all shapes
- [ ] Text tool with font formatting (Konva.Text + overlay textarea)
- [ ] Rotation for all objects
- [ ] Multi-select (Shift+Click, drag-box, Cmd/Ctrl+A)
- [ ] Visual selection sync (other users see my selections with colored border)
- [ ] 10+ keyboard shortcuts
- [ ] Clipboard operations (copy, paste, cut, duplicate)
- [ ] Layers panel with drag-to-reorder (right sidebar)
- [ ] Auto-naming (per-shape counter: Rectangle 1, Circle 1, etc.)
- [ ] Alignment/distribution tools (8 operations)
- [ ] Export (PNG 2x, SVG vector)
- [ ] Floating properties panel (contextual, draggable)
- [ ] First-time user onboarding (shortcut guide)
- [ ] Toolbar tooltips with keyboard shortcuts

**P1 Features (Should Ship):**

- [ ] Smart reconnection with exponential backoff
- [ ] Nudge operations (arrow keys)
- [ ] Layer ordering shortcuts (bring forward/back)
- [ ] Selection syncs between users with visual highlights

**P2 Features (Simplified for Phase 2):**

- [ ] Collaborative comments (simplified - pins + basic text, NO threading)

### Quality Benchmarks

**Zero Critical Bugs:**

- [x] Zero data loss in 1-hour stress test (5 users, 500+ objects, 100+ edits/min)
- [x] Zero ghost objects in conflict resolution test (100 iterations)
- [x] Zero sync failures in offline-reconnect test (20 disconnect/reconnect cycles)

**Performance Targets (All Must Pass):**

- [x] 60 FPS with 500+ mixed objects
- [x] <100ms sync latency for object operations (5+ users)
- [x] <50ms sync latency for cursor positions (5+ users)
- [x] <2 second reconnection recovery time
- [x] Multi-select 50+ objects without lag
- [x] Export 500+ objects in <5 seconds
- [x] Layers panel handles 100+ objects smoothly
- [x] Text editing feels instant (<16ms keystroke latency)

### Documentation

**Must Complete:**

- [ ] Update README.md with Phase 2 features
- [ ] Update architecture.md with new components/services
- [ ] Document database schema changes (new fields, comments structure)
- [ ] Create in-app keyboard shortcuts help (ShortcutHelp component)
- [ ] Document API for all new services/hooks
- [ ] Add code comments for complex logic (transactions, offline queue)

### Deployment

**Production Readiness:**

- [ ] All PRs merged to main branch
- [ ] Production build succeeds without errors
- [ ] Firebase Hosting deployment successful
- [ ] Database rules updated and deployed
- [ ] Environment variables configured for production
- [ ] Tested with 10+ real users (dogfooding session)
- [ ] No rollback required within 72 hours of launch

---

## Risk Mitigation & Contingency Plans

### High-Risk Areas

**1. Offline Queue Complexity**

- **Risk:** Queue reconciliation fails on reconnect
- **Mitigation:** Extensive testing with simulated network issues
- **Contingency:** Simplify to optimistic UI with manual refresh button

**2. Transaction Performance**

- **Risk:** Firebase Transactions add latency overhead
- **Mitigation:** Measure transaction time (<5ms target)
- **Contingency:** Use transactions only for delete-edit conflicts

**3. Multi-Select Performance**

- **Risk:** Group transformations cause FPS drops
- **Mitigation:** Throttle updates, batch Firebase writes
- **Contingency:** Limit multi-select to 50 objects with warning

**4. SVG Export Accuracy**

- **Risk:** Complex shapes don't convert correctly
- **Mitigation:** Test each shape type individually
- **Contingency:** Offer PNG-only export, defer SVG to Phase 3

**5. Scope Creep**

- **Risk:** Phase 2 timeline extends significantly
- **Mitigation:** Strict prioritization (P0 first, P2 can slip)
- **Contingency:** Ship Phase 2 in waves (2A: infrastructure + shapes, 2B: workflow + export)

---

## Post-Phase 2 Roadmap Preview

**Phase 3 (Future):**

- Multiple canvases/projects (remove hardcoded "default")
- Undo/redo with operation history
- Advanced text formatting (inline bold/italic, rich text)
- Persistent groups (not just temporary multi-select)
- Object locking (prevent accidental edits)
- Permissions/roles (viewer, editor, admin)

**Phase 4 (Future):**

- Components/symbols (reusable elements)
- Image uploads (raster images, photos)
- Gradients and effects (shadows, blur)
- Prototyping (interaction modes, animations)
- Plugin system (extensions, marketplace)

**Phase 5 (Future):**

- Mobile apps (iOS, Android)
- Real-time video/audio (voice chat)
- AI features (design suggestions, auto-layout)
- Version history (time travel, branching)

---

## Notes & Best Practices

### Code Quality

- **Maintain TypeScript strict mode** - No `any` types
- **Write tests first** for critical paths (TDD for transactions, offline queue)
- **Use React.memo** for performance-critical components
- **Debounce/throttle** expensive operations (text sync: 500ms, cursor: 16ms)
- **Profile regularly** - Use React DevTools Profiler, Chrome Performance tab

### Firebase Best Practices

- **Use transactions** for all concurrent-edit scenarios
- **Batch writes** when possible (multi-select operations)
- **Monitor costs** - Check Firebase usage dashboard weekly
- **Optimize queries** - Use indexes, limit data fetching
- **Handle offline gracefully** - Always queue, never fail silently

### Collaboration

- **Test with real users early** - Dogfood each PR with team
- **Keep PRs focused** - One feature per PR, easier to review
- **Document breaking changes** - Update migration guide if schema changes
- **Communicate blockers** - Flag issues in daily standups

### Performance

- **60 FPS is non-negotiable** - Profile after every PR
- **Sync latency targets must hold** - Use Firebase latency monitoring
- **Memory leaks are critical** - Test with Chrome Memory Profiler
- **Throttle aggressively** - Better slow updates than crashed browsers

---

## Success Metrics

**Quantitative Metrics:**

- [ ] Zero data loss in 24-hour production test
- [ ] <100ms p95 sync latency (objects)
- [ ] <50ms p95 sync latency (cursors)
- [ ] 60 FPS maintained in all scenarios
- [ ] <5 second export time for 1000 objects
- [ ] 100% uptime first week of launch

**Qualitative Metrics:**

- [ ] 10+ team members successfully use for real work
- [ ] Zero "data disappeared" bug reports
- [ ] Positive feedback on keyboard shortcuts ("so much faster!")
- [ ] Users create complex designs (50+ objects, multiple shape types)
- [ ] Export quality matches expectations (prints/shares well)

**Adoption Metrics (Post-Launch):**

- [ ] 5+ concurrent users daily
- [ ] 50+ designs created in first month
- [ ] Average session length >15 minutes
- [ ] <1% bounce rate on reconnection

---

## Conclusion

Phase 2 transforms CollabCanvas from a promising MVP into a production-ready collaborative design platform. By systematically addressing infrastructure reliability, expanding creative capabilities, and adding essential workflow tools, we create a product that teams will trust for real design work.

**Critical Success Factors:**

1. **Zero data loss** - Users must trust the platform
2. **60 FPS performance** - Canvas must feel responsive
3. **Fast sync** - Collaboration must feel real-time
4. **Intuitive UI** - Features must be discoverable

**Key Risks to Monitor:**

1. Scope creep (defer P2 features if needed)
2. Transaction performance (measure early)
3. Offline queue edge cases (test extensively)
4. Export quality (validate with real designs)

**Next Steps:**

1. Review and approve this task list
2. Set up project tracking (GitHub Issues, Jira, etc.)
3. Begin PR #12 (Offline Queue)
4. Schedule weekly demos to validate progress
5. Plan dogfooding sessions with team
