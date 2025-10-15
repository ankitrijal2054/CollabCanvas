# Phase 2 Planning Changes Summary

## Date: October 15, 2025

This document summarizes all the refinements made to PRD_Phase2.md and tasklist_phase2.md based on clarification discussions.

---

## ✅ Confirmed Scope Changes

### 1. **Offline Queue - Simplified (5-10 Min Window)**

**Previous:** Multi-day persistence with complex reconciliation
**Updated:**

- Queue operations for maximum 10 minutes
- After timeout: Disable canvas + show "Reconnect Required" modal
- IndexedDB storage in plain text (no encryption)
- Simpler implementation, faster to build

### 2. **Connection Status UI - Unobtrusive**

**Previous:** Banner shows all states including "Online"
**Updated:**

- **Green dot** in header (top-right, near username) when online
- **Banner** only appears when offline/reconnecting
- Banner auto-dismisses after successful reconnection
- More polished, less intrusive UX

### 3. **Text Tool - Konva.Text + Overlay Textarea**

**Previous:** Contenteditable div approach (mentioned in risk table)
**Updated:**

- Use `Konva.Text` for rendering on canvas
- HTML textarea overlay for editing mode
- Better performance and simpler real-time sync
- Avoids contenteditable complexity

### 4. **Multi-Select - Visual Selection Sync**

**Previous:** Selection state tracked but not visually shown to other users
**Updated:**

- Other users SEE your selections with visual highlights
- Border color matches user's cursor color with 30% opacity
- Syncs in real-time (<50ms)
- Better collaboration awareness

### 5. **Properties Panel - Floating (Not Sidebar)**

**Previous:** Unclear location (mentioned "properties panel" without specifics)
**Updated:**

- **Floating panel** near selected object (not in sidebar)
- Draggable positioning
- Contextual properties based on object type
- Auto-hides when no selection
- Keeps sidebar for Layers + Presence

### 6. **Layers Panel - Right Sidebar**

**Confirmed:**

- Lives in **right sidebar** (always visible)
- Auto-naming: **Per-shape counter** (Rectangle 1, Rectangle 2, Circle 1, Circle 2)
- Manual rename **deferred to Phase 3**

### 7. **Comments - Simplified (No Threading)**

**Previous:** Threaded feedback system with replies
**Updated:**

- Just **pins + basic text**
- NO threading/replies (deferred to Phase 3)
- Simplified `Comment` interface (no `thread` array)
- Faster implementation (~1 week vs 2 weeks)

### 8. **First-Time User Onboarding - NEW**

**Added:**

- Floating shortcut guide (bottom-right corner)
- Shows on first login only (localStorage: `hasSeenShortcuts`)
- Dismissible with "Don't show again"
- "Show again" button in header Help menu

### 9. **Toolbar Tooltips - NEW**

**Added:**

- All toolbar buttons show tooltips with keyboard shortcuts
- Example: "Add Rectangle (R)", "Text Tool (T)", "Comment (C)"
- Improves discoverability

### 10. **Canvas - Still Hardcoded "default"**

**Confirmed:**

- Keep using `DEFAULT_CANVAS_ID = "default"`
- No multi-canvas UI in Phase 2
- Multi-project support deferred to Phase 3

---

## 📋 Updated PR List (12 PRs → 13 PRs)

| PR #    | Title                                      | Status     |
| ------- | ------------------------------------------ | ---------- |
| #12     | Offline Queue + Connection Status          | Updated    |
| #13     | Conflict Resolution (Transactions)         | No changes |
| #14     | Last Edit Attribution                      | No changes |
| #15     | New Shapes + Stroke                        | No changes |
| #16     | Text Tool (Konva.Text approach)            | Updated    |
| #17     | Rotation + Multi-Select (with visual sync) | Updated    |
| #18     | Keyboard Shortcuts + Clipboard             | No changes |
| #19     | Layers Panel (sidebar, per-shape naming)   | Updated    |
| #20     | Alignment Tools                            | No changes |
| #21     | Export (PNG/SVG)                           | No changes |
| #22     | Comments (simplified, no threading)        | Updated    |
| **#23** | **Properties Panel + Onboarding**          | **NEW**    |

---

## 🎯 Key Technical Decisions

### Firebase Realtime Database

- Already has proper auth rules from MVP
- No changes needed for security

### IndexedDB Storage

- Plain text storage (no encryption)
- Simple approach for offline queue

### Performance Testing

- Manual testing only (user will handle)
- No automated stress test infrastructure needed

### Timeline

- No strict deadlines
- User working solo at own pace
- Flexibility to adjust as needed

---

## 📝 Files Updated

### 1. **PRD_Phase2.md**

- Updated offline queue architecture (10-min timeout)
- Updated connection status UI design (green dot + banner)
- Updated text tool specification (Konva.Text approach)
- Updated multi-select to include visual selection sync
- Updated layers panel specification (sidebar, per-shape naming)
- Simplified comments feature (removed threading)
- Added PR #23 for properties panel + onboarding
- Updated risk management table (text tool risk lowered)
- Updated success criteria

### 2. **tasklist_phase2.md**

- Updated PR #12 tasks (offline queue simplification)
- Added connection status dot component
- Updated PR #16 tasks (Konva.Text + overlay textarea)
- Added Task 17.12 for visual selection sync component
- Updated PR #19 tasks (layers panel naming clarification)
- Simplified PR #22 tasks (removed threading components)
- Added PR #23 tasks (properties panel + onboarding)
- Updated completion criteria with new features
- Added tooltips to toolbar in PR #22

---

## ✅ Out of Scope (Confirmed Deferrals)

- ❌ Multiple projects/canvases (Phase 3)
- ❌ Layer renaming UI (Phase 3)
- ❌ Comment threading/replies (Phase 3)
- ❌ Rich text formatting (inline bold/italic)
- ❌ Automated stress tests
- ❌ IndexedDB encryption
- ❌ Multi-day offline support

---

## 🚀 Next Steps

1. ✅ Both PRD_Phase2.md and tasklist_phase2.md updated
2. ⏭️ Ready to start implementation
3. ⏭️ Begin with PR #12 (Offline Queue + Connection Status)

---

## 📊 Phase 2 Metrics (No Changes)

**Performance Targets:**

- 60 FPS with 500+ mixed objects
- <100ms object sync latency
- <50ms cursor/selection sync latency
- <2 second reconnection recovery
- Zero data loss

**Testing:**

- Manual testing by user
- Cross-browser testing (Chrome, Firefox, Safari)
- Multi-user testing (5+ concurrent users)

---

## 💡 Implementation Notes

### PR #12 (Offline Queue) - Key Simplifications

```typescript
private readonly MAX_OFFLINE_DURATION = 10 * 60 * 1000; // 10 minutes

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
```

### PR #17 (Multi-Select) - Visual Sync

```typescript
interface UserPresence {
  // ... existing fields
  selectedIds: string[]; // NEW - syncs in real-time
}

// RemoteSelectionHighlight component
// - Renders border on objects selected by other users
// - Uses user's cursor color with 30% opacity
// - Updates within 50ms
```

### PR #22 (Comments) - Simplified Interface

```typescript
interface Comment {
  id: string;
  canvasId: string;
  x: number;
  y: number;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: number;
  resolved: boolean;
  // NO thread: CommentReply[] - removed
}
```

### PR #23 (Properties Panel) - NEW

```typescript
// Floating panel positioning
interface PropertiesPanelPosition {
  x: number; // near selected object
  y: number;
  isDragging: boolean;
}

// Contextual properties based on object.type
- Rectangle/Circle/Star: Fill, Stroke, Rotation, Dimensions
- Line: Stroke, Arrows
- Text: Font, Size, Style, Color
```

---

## 🎨 UX Improvements Summary

1. **Less Intrusive Connection Status**: Green dot instead of persistent banner
2. **Better Collaboration Awareness**: Visual selection highlights
3. **Contextual Properties**: Floating panel near selected object
4. **Improved Onboarding**: First-time user gets shortcut guide
5. **Better Discoverability**: Tooltips on all toolbar buttons
6. **Simpler Comments**: Easier to implement and use (no threading complexity)

---

This summary document serves as a reference for all changes made during the planning finalization phase.
