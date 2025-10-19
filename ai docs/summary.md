## CollabCanvas – High-Signal Summary

### What it is

Real-time collaborative design canvas with multiplayer presence, production-grade reliability, and an AI assistant that executes natural language commands as standard canvas operations.

### Live demo

[collabcanvas-1fd25.web.app](https://collabcanvas-1fd25.web.app/)

## Tech stack

- Frontend: React + TypeScript + Vite
- Rendering: Konva + React-Konva
- Backend: Firebase Authentication, Realtime Database, Hosting, Cloud Functions (for AI)
- AI: OpenAI GPT-4 Turbo with Function Calling (ReAct loop supported)

## Architecture (at a glance)

- UI components under `src/components` for canvas, collaboration, layout, and AI panel
- State via React Contexts:
  - `AuthContext` – auth state and actions
  - `CanvasContext` – objects, selection, transforms, sync operations, clipboard, layers, alignment
  - `AIContext` – chat state, command queue, ReAct loop integration
- Hooks: `useAuth`, `useCanvas`, `usePresence`, `useRealtimeSync`, `useKeyboardShortcuts`, `useConnectionStatus`
- Services: `authService`, `canvasService`, `presenceService`, `transactionService`, `aiService`
- Utilities: `canvasHelpers`, `syncHelpers`, `alignmentHelpers`, `multiSelectHelpers`, `exportHelpers`, `svgGenerator`, `clipboardManager`, `offlineQueue`, `indexedDBManager`, `performanceMonitor`, `aiToolExecutor`, `aiCommandQueue`
- Routing: `/` (Landing), `/login`, `/signup`, `/canvas` (protected via `AuthGuard`)

## Data model (Firebase Realtime Database)

- Canvases: `/canvases/default/objects/{objectId}`
  - Base object fields include: `id`, `type`, `x`, `y`, `width`, `height`, `color`, `stroke?`, `strokeWidth?`, `opacity?`, `blendMode?`, `rotation?`, `zIndex?`, `createdBy`, `timestamp`, `lastEditedBy?`, `lastEditedByName?`, `lastEditedAt?`, AI attribution fields `aiRequestedBy?`, `aiOperationId?`
- Users: `/users/{userId}`
- Presence: `/presence/default/{userId}` (`online`, `cursor`, `lastSeen`)
- Comments (Phase 2 scope): `/comments/default/{commentId}` (pin-based, simplified)
- Operation queue (if enabled): `/operationQueue/{userId}/{operationId}`
- Security rules require `auth != null` and basic validation

## Core capabilities

- Canvas & objects

  - Shapes: Rectangle, Circle, Star, Line, Text
  - Manipulation: Move, resize, rotate, delete; single/multi-select; group transforms
  - Styling: Fill, stroke, stroke width, opacity, blend modes
  - Text: Konva.Text render + overlay textarea editor; font family/size/weight/style/align
  - Z-order: `zIndex` with drag-to-reorder and shortcuts

- Collaboration

  - Real-time objects sync (<100ms target), cursor sync (<50ms target)
  - Presence list, live cursors, selection sync groundwork
  - Last-write-wins conflict strategy + transaction-based delete/edit safety
  - Last edit attribution (user name + timestamp) with tooltip

- Workflow tools

  - Keyboard shortcuts (copy, paste, cut, duplicate, select-all, nudge, layer ordering, alignment)
  - Clipboard manager (in-memory)
  - Alignment & distribution toolbar (8 ops)
  - Layers panel with drag-to-reorder and auto-naming
  - Export: PNG (2x) and SVG (vector) with selection-only support

- Reliability & offline
  - Offline operation queue (5–10 min window) persisted via IndexedDB
  - Connection UI: top `ConnectionBanner` (offline/reconnecting/syncing only) and header `ConnectionStatusDot` for online
  - Smart reconnection/backoff (spec), pause/resume sync pathways

## AI assistant (Phase 3)

- Flow

  1. User enters command in `AIChatPanel`
  2. Client sends to Firebase Function `/api/ai-chat` (`functions/src/index.ts`)
  3. Server loads and summarizes canvas state; builds system prompt
  4. GPT-4 Turbo returns tool calls (validated by Zod on server)
  5. Client executes tools via `CanvasContext` (no special sync path)
  6. Results sync to all users in real-time; attribution marks AI origin

- Tools (examples)

  - Creation: `createShape`, `createText`
  - Manipulation: `moveShape`, `resizeShape`, `rotateShape`, `deleteShape`
  - Styling: `updateShapeStyle`, `updateTextStyle`
  - Layout: `arrangeHorizontal`, `arrangeVertical`, `alignShapes`, `distributeShapes`, `createGrid`
  - Query: `getCanvasState`, `findShapesByColor`, `findShapesByType`

- ReAct loop
  - `AIContext` supports multi-iteration flow: query → act → feedback → continue
  - Continues when query tools are used and results succeed; capped iterations
  - Client-side queue: per-canvas FIFO to avoid multi-user conflicts

## Notable files to start from

- Entry & routing: `src/main.tsx`, `src/App.tsx`
- Contexts: `src/contexts/AuthContext.tsx`, `src/contexts/CanvasContext.tsx`, `src/contexts/AIContext.tsx`
- Canvas: `src/components/canvas/Canvas.tsx`, `CanvasObject.tsx`, shapes under `shapes/`, `SelectionBox.tsx`, `AlignmentToolbar.tsx`, `ExportModal.tsx`
- Collaboration: `src/components/collaboration/CursorLayer.tsx`, `Cursor.tsx`, `PresenceList.tsx`, `src/hooks/usePresence.ts`, `src/services/presenceService.ts`
- Offline/reliability: `src/utils/offlineQueue.ts`, `src/utils/indexedDBManager.ts`, `src/hooks/useConnectionStatus.ts`, `src/components/layout/ConnectionBanner.tsx`, `ConnectionStatusDot.tsx`
- AI: `src/components/ai/*`, `src/contexts/AIContext.tsx`, `src/services/aiService.ts`, `src/utils/aiToolExecutor.ts`, `src/utils/aiCommandQueue.ts`, Functions under `functions/src/*`

## Quick verification snapshot (code ↔ PRD mapping)

- MVP: Auth (email/password + Google), single canvas `default`, rectangles, pan/zoom, realtime sync, presence & cursors, persistence, 60 FPS target → present
- Phase 2:
  - New shapes (Circle/Star/Line/Text), stroke controls → present
  - Rotation and multi-select (`SelectionBox`, rotation props) → present
  - Keyboard shortcuts, clipboard manager, layer ordering → present
  - Layers panel with drag-to-reorder → present and integrated
  - Alignment/distribution toolbar → present and integrated
  - Export PNG/SVG → present (`ExportModal`, helpers)
  - Offline queue + connection UI → present and wired in `App.tsx`/`Header.tsx`
  - Last edit attribution → present (tooltip component used by shapes)
  - Transactions for delete/edit race → service present
- Phase 3:
  - AI chat panel, OpenAI function calling, server prompt + summarization → present
  - Client tool executor maps to `CanvasContext` → present
  - ReAct continuation loop in `AIContext` → present

## Routing & guards

- `AuthGuard` wraps `/canvas`; redirects unauthenticated users to `/login`
- Landing page at `/` with marketing/CTA

## Performance targets (from PRDs)

- 60 FPS interactions; <100ms object sync; <50ms cursor sync; <2s simple AI, <5s complex

## Known notes / deferments

- Comments feature is specified in Phase 2 docs (pin-based) and schema; ensure UI hooks/services exist if enabling it in UI.
- Undo/redo and command history enhancements are Phase 3/4 items by design.

## How to talk to the AI in future chats

- Mention canvas size bounds (0–10000), allowed shapes, and that AI actions map to `CanvasContext` tool functions.
- For multi-step tasks, expect a query-then-act flow (ReAct), with results feeding subsequent steps.
