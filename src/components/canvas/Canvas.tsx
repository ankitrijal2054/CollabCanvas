// Canvas component - Interactive collaborative canvas with Konva
import { useRef, useEffect, useState } from "react";
import { Stage, Layer, Rect } from "react-konva";
import type Konva from "konva";
import type {
  CanvasObject as CanvasObjectType,
  TextObject,
} from "../../types/canvas.types";
import { useCanvas } from "../../hooks/useCanvas";
import { useAuth } from "../../hooks/useAuth";
import { usePresence } from "../../hooks/usePresence";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { canvasHelpers } from "../../utils/canvasHelpers";
import Header from "../layout/Header";
import Sidebar from "../layout/Sidebar";
import CanvasToolbar from "./CanvasToolbar";
import CanvasControls from "./CanvasControls";
import CanvasObject from "./CanvasObject";
import CanvasGrid from "./CanvasGrid";
import CursorLayer from "../collaboration/CursorLayer";
import { EditAttributionTooltip } from "./EditAttributionTooltip";
import { SelectionBox } from "./SelectionBox";
import TextEditor from "./TextEditor";
import ShortcutHelp from "../layout/ShortcutHelp";
import { ContextMenu } from "./ContextMenu";
import { LayersPanel } from "../layout/LayersPanel";
import { BottomBar } from "../layout/BottomBar";
import "./Canvas.css";
import {
  startPerfMonitor,
  subscribePerf,
} from "../../utils/performanceMonitor";

export default function Canvas() {
  const { user } = useAuth();
  const {
    viewport,
    canvasSize,
    setViewport,
    setPosition,
    objects,
    selectedIds,
    selectObject,
    toggleSelection,
    clearSelection,
    selectAll,
    deleteObject,
    loading,
    editingTextId,
    setEditingTextId,
    // Clipboard operations
    copySelectedObjects,
    pasteObjects,
    cutSelectedObjects,
    duplicateSelectedObjects,
    deleteSelectedObjects,
    // Nudge operations
    nudgeSelectedObjects,
    // Layer ordering
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
  } = useCanvas();

  // Initialize presence tracking for multiplayer cursors
  const { cursors, updateCursor, removeCursor } = usePresence(
    user?.id ?? null,
    user?.name ?? user?.email ?? null,
    {
      throttleMs: 16, // 60 FPS
    }
  );

  // Integrate keyboard shortcuts
  useKeyboardShortcuts({
    enabled: !editingTextId, // Disable shortcuts when editing text
    handlers: {
      // Clipboard operations
      onCopy: copySelectedObjects,
      onPaste: pasteObjects,
      onCut: cutSelectedObjects,
      onDuplicate: duplicateSelectedObjects,

      // Object manipulation
      onDelete: deleteSelectedObjects,
      onSelectAll: selectAll,
      onDeselect: clearSelection,

      // Nudge operations (1px)
      onNudgeUp: () => nudgeSelectedObjects(0, -1),
      onNudgeDown: () => nudgeSelectedObjects(0, 1),
      onNudgeLeft: () => nudgeSelectedObjects(-1, 0),
      onNudgeRight: () => nudgeSelectedObjects(1, 0),

      // Nudge operations (10px with Shift)
      onNudgeUpLarge: () => nudgeSelectedObjects(0, -10),
      onNudgeDownLarge: () => nudgeSelectedObjects(0, 10),
      onNudgeLeftLarge: () => nudgeSelectedObjects(-10, 0),
      onNudgeRightLarge: () => nudgeSelectedObjects(10, 0),

      // Layer ordering
      onBringForward: bringForward,
      onSendBackward: sendBackward,
      onBringToFront: bringToFront,
      onSendToBack: sendToBack,

      // Help
      onHelp: () => setIsHelpOpen(true),
    },
  });

  const stageRef = useRef<Konva.Stage>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Tooltip state for edit attribution
  const [hoveredObject, setHoveredObject] = useState<CanvasObjectType | null>(
    null
  );
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const [devPerf, setDevPerf] = useState<{
    fps: number;
    latencyMs: number;
  } | null>(null);

  // Help modal state
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    visible: boolean;
  } | null>(null);

  // Detect platform for keyboard shortcut display
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modKey = isMac ? "⌘" : "Ctrl";

  /**
   * Build context menu options based on current selection state
   */
  const getContextMenuOptions = () => {
    const hasSelection = selectedIds.length > 0;

    return [
      {
        label: "Copy",
        shortcut: `${modKey}+C`,
        action: copySelectedObjects,
        disabled: !hasSelection,
      },
      {
        label: "Cut",
        shortcut: `${modKey}+X`,
        action: cutSelectedObjects,
        disabled: !hasSelection,
      },
      {
        label: "Paste",
        shortcut: `${modKey}+V`,
        action: pasteObjects,
        disabled: false,
      },
      {
        label: "Duplicate",
        shortcut: `${modKey}+D`,
        action: duplicateSelectedObjects,
        disabled: !hasSelection,
      },
      {
        separator: true,
        label: "",
        action: () => {},
      },
      {
        label: "Delete",
        shortcut: "Del",
        action: deleteSelectedObjects,
        disabled: !hasSelection,
      },
      {
        separator: true,
        label: "",
        action: () => {},
      },
      {
        label: "Bring to Front",
        shortcut: `${modKey}+${isMac ? "⌥" : "Alt"}+]`,
        action: bringToFront,
        disabled: !hasSelection,
      },
      {
        label: "Bring Forward",
        shortcut: `${modKey}+]`,
        action: bringForward,
        disabled: !hasSelection,
      },
      {
        label: "Send Backward",
        shortcut: `${modKey}+[`,
        action: sendBackward,
        disabled: !hasSelection,
      },
      {
        label: "Send to Back",
        shortcut: `${modKey}+${isMac ? "⌥" : "Alt"}+[`,
        action: sendToBack,
        disabled: !hasSelection,
      },
      {
        separator: true,
        label: "",
        action: () => {},
      },
      {
        label: "Select All",
        shortcut: `${modKey}+A`,
        action: selectAll,
        disabled: false,
      },
    ];
  };

  /**
   * Handle right-click context menu
   */
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      visible: true,
    });
  };

  /**
   * Handle object hover change for tooltip
   */
  const handleObjectHoverChange = (
    hovering: boolean,
    object: CanvasObjectType | null
  ) => {
    if (hovering && object && stageRef.current) {
      const stage = stageRef.current;

      // Convert from canvas to absolute screen coordinates
      const containerRect = stage.container().getBoundingClientRect();
      const pointer = stage.getPointerPosition();

      if (pointer) {
        const screenX = containerRect.left + pointer.x;
        const screenY = containerRect.top + pointer.y;

        setHoveredObject(object);
        setTooltipPosition({ x: screenX, y: screenY });
      }
    } else {
      setHoveredObject(null);
    }
  };

  /**
   * Handle window resize and container size changes - update stage size
   */
  useEffect(() => {
    const updateSize = () => {
      const container = document.getElementById("canvas-container");
      if (container) {
        setStageSize({
          width: container.offsetWidth,
          height: container.offsetHeight,
        });
      }
    };

    // Initial size calculation (with small delay to ensure layout is ready)
    const initialTimeout = setTimeout(updateSize, 100);

    // Window resize listener
    window.addEventListener("resize", updateSize);

    // ResizeObserver to detect container size changes
    const container = document.getElementById("canvas-container");
    let resizeObserver: ResizeObserver | null = null;

    if (container) {
      resizeObserver = new ResizeObserver(() => {
        updateSize();
      });
      resizeObserver.observe(container);
    }

    return () => {
      clearTimeout(initialTimeout);
      window.removeEventListener("resize", updateSize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  // Dev-only performance monitor
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const stop = startPerfMonitor();
    const unsub = subscribePerf((m) => setDevPerf(m));
    return () => {
      unsub();
      stop();
    };
  }, []);

  /**
   * Center the canvas on initial load
   */
  useEffect(() => {
    if (stageSize.width > 0 && stageSize.height > 0) {
      // Only center if viewport is at default position
      if (viewport.x === 0 && viewport.y === 0 && viewport.scale === 1) {
        const centeredViewport = canvasHelpers.getDefaultViewport(
          canvasSize.width,
          canvasSize.height,
          stageSize.width,
          stageSize.height
        );
        setViewport(centeredViewport);
      }
    }
  }, [stageSize, canvasSize, viewport, setViewport]);

  /**
   * Handle keyboard shortcuts (Delete key)
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete or Backspace key - delete selected object(s)
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedIds.length > 0 &&
        // Don't delete if user is typing in an input
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        // Delete all selected objects
        selectedIds.forEach((id) => deleteObject(id));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds, deleteObject]);

  // Calculate canvas bounds for boundary checking
  const canvasBounds = canvasHelpers.getCanvasBounds(
    canvasSize.width,
    canvasSize.height
  );

  /**
   * Handle cursor movement tracking for multiplayer presence
   * Converts screen coordinates to canvas coordinates and updates Firebase
   */
  const handleCursorMove = () => {
    const stage = stageRef.current;
    if (!stage) return;

    // Get pointer position relative to stage
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    // Convert screen coordinates to canvas coordinates
    const canvasPos = canvasHelpers.screenToCanvas(
      pointerPos.x,
      pointerPos.y,
      viewport.scale,
      { x: viewport.x, y: viewport.y }
    );

    // Check if cursor is within canvas bounds
    const isInBounds = canvasHelpers.isWithinBounds(canvasPos, canvasBounds);

    if (isInBounds) {
      // Update cursor position (throttled by usePresence hook)
      updateCursor(canvasPos);
    } else {
      // Remove cursor if outside canvas
      removeCursor();
    }
  };

  /**
   * Handle cursor leaving the canvas area
   */
  const handleCursorLeave = () => {
    removeCursor();
  };

  /**
   * Handle background click - deselect objects when clicking on empty space
   */
  const handleBackgroundClick = (e: {
    target: { getStage: () => unknown };
  }) => {
    // Check if we clicked on the stage background (not an object)
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty && selectedIds.length > 0) {
      selectObject(null);
    }
  };

  /**
   * Handle pan start (mouse down or touch start)
   */
  const handlePanStart = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>
  ) => {
    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Check if clicking on empty canvas (not an object)
    const clickedOnEmpty = e.target === stage;

    // If in selection mode and clicking on empty canvas, start selection rectangle
    if (isSelectionMode && clickedOnEmpty) {
      // Convert screen coordinates to canvas coordinates (accounting for viewport)
      const canvasX = (pos.x - viewport.x) / viewport.scale;
      const canvasY = (pos.y - viewport.y) / viewport.scale;

      setSelectionRect({
        x: canvasX,
        y: canvasY,
        width: 0,
        height: 0,
      });
      setIsPanning(false); // Don't pan when in selection mode
    } else if (!clickedOnEmpty) {
      // Don't pan if clicking on an object
      setIsPanning(false);
    } else {
      // Regular panning when not in selection mode
      setIsPanning(true);
      setPanStart({ x: pos.x, y: pos.y });
    }
  };

  /**
   * Handle pan move (mouse move or touch move)
   */
  const handlePanMove = () => {
    // Always track cursor movement for multiplayer presence
    handleCursorMove();

    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // If drawing selection rectangle, update its dimensions
    if (selectionRect) {
      // Convert screen coordinates to canvas coordinates
      const canvasX = (pos.x - viewport.x) / viewport.scale;
      const canvasY = (pos.y - viewport.y) / viewport.scale;

      // Update rectangle dimensions (can be negative for dragging in any direction)
      setSelectionRect({
        ...selectionRect,
        width: canvasX - selectionRect.x,
        height: canvasY - selectionRect.y,
      });
      return; // Don't pan when drawing selection rectangle
    }

    if (!isPanning) return;

    // Calculate movement delta
    const dx = pos.x - panStart.x;
    const dy = pos.y - panStart.y;

    // Calculate new position
    const newX = viewport.x + dx;
    const newY = viewport.y + dy;

    // Constrain to bounds
    const constrainedPos = canvasHelpers.constrainToBounds(
      { x: -newX / viewport.scale, y: -newY / viewport.scale },
      canvasBounds,
      viewport.scale,
      stageSize
    );

    setPosition(
      -constrainedPos.x * viewport.scale,
      -constrainedPos.y * viewport.scale
    );

    // Update pan start for next move
    setPanStart({ x: pos.x, y: pos.y });
  };

  /**
   * Handle pan end (mouse up or touch end)
   */
  const handlePanEnd = () => {
    setIsPanning(false);

    // If selection rectangle exists, select all objects within it
    if (selectionRect) {
      // Normalize rectangle (handle negative widths/heights from dragging in any direction)
      const x =
        selectionRect.width >= 0
          ? selectionRect.x
          : selectionRect.x + selectionRect.width;
      const y =
        selectionRect.height >= 0
          ? selectionRect.y
          : selectionRect.y + selectionRect.height;
      const width = Math.abs(selectionRect.width);
      const height = Math.abs(selectionRect.height);

      // Find all objects that intersect with the selection rectangle
      const selectedObjects = objects.filter((obj) => {
        // Check if object's bounding box intersects with selection rectangle
        const objRight = obj.x + (obj.width || 0);
        const objBottom = obj.y + (obj.height || 0);
        const rectRight = x + width;
        const rectBottom = y + height;

        return (
          obj.x < rectRight &&
          objRight > x &&
          obj.y < rectBottom &&
          objBottom > y
        );
      });

      // Select all intersecting objects
      if (selectedObjects.length > 0) {
        // If holding shift, add to existing selection
        // Otherwise, replace selection
        const newSelectedIds = selectedObjects.map((obj) => obj.id);
        selectObject(null); // Clear first
        newSelectedIds.forEach((id) => toggleSelection(id)); // Then add all
      } else {
        // If no objects selected, clear selection
        selectObject(null);
      }

      // Clear selection rectangle and exit selection mode (reduces clutter)
      setSelectionRect(null);
      setIsSelectionMode(false);
    }
  };

  /**
   * Handle wheel zoom (mouse wheel)
   */
  const handleWheel = (e: { evt: WheelEvent }) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    // Get pointer position
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Determine zoom direction and amount
    const direction = e.evt.deltaY > 0 ? -1 : 1;

    // Calculate new scale
    const oldScale = viewport.scale;
    const newScale = canvasHelpers.calculateZoom(oldScale, direction * 0.05);

    // Don't update if scale didn't change (at min/max)
    if (newScale === oldScale) return;

    // Calculate new position to zoom to cursor
    const newPos = canvasHelpers.getZoomPointPosition(
      pointer,
      oldScale,
      newScale,
      { x: viewport.x, y: viewport.y }
    );

    // Constrain to bounds after zoom
    const constrainedPos = canvasHelpers.constrainToBounds(
      { x: -newPos.x / newScale, y: -newPos.y / newScale },
      canvasBounds,
      newScale,
      stageSize
    );

    // Update viewport
    setViewport({
      x: -constrainedPos.x * newScale,
      y: -constrainedPos.y * newScale,
      scale: newScale,
    });
  };

  // Get selected object type for properties panel
  const selectedObjectType =
    selectedIds.length === 1
      ? objects.find((obj) => obj.id === selectedIds[0])?.type
      : undefined;

  return (
    <div className="canvas-page">
      {/* Top Header */}
      <Header user={user} />

      {/* Main Content Area */}
      <div className="canvas-main-content">
        {/* Left Sidebar: Online Users + Properties */}
        <Sidebar
          hasSelection={selectedIds.length === 1}
          selectedObjectType={selectedObjectType}
        />

        {/* Center: Canvas Area */}
        <div className="canvas-center">
          <CanvasToolbar
            isSelectionMode={isSelectionMode}
            onToggleSelectionMode={() => setIsSelectionMode(!isSelectionMode)}
          />
          <CanvasControls />

          <div
            id="canvas-container"
            className={`canvas-container ${!loading ? "loaded" : ""}`}
            onContextMenu={handleContextMenu}
          >
            {import.meta.env.DEV && devPerf && (
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  zIndex: 1003,
                  background: "rgba(17,24,39,0)",
                  color: "#000",
                  padding: "4px 8px",
                  borderRadius: 6,
                  fontSize: 12,
                  pointerEvents: "none",
                }}
              >
                <div>FPS: {devPerf.fps}</div>
                <div>Latency: {devPerf.latencyMs} ms</div>
              </div>
            )}
            {loading && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255,255,255,0.6)",
                  zIndex: 1002,
                  backdropFilter: "blur(4px)",
                }}
              >
                <div
                  style={{
                    padding: "8px 12px",
                    background: "#111827",
                    color: "white",
                    borderRadius: 8,
                    fontSize: 12,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                  }}
                >
                  Loading canvas…
                </div>
              </div>
            )}
            <Stage
              ref={stageRef}
              width={stageSize.width}
              height={stageSize.height}
              scaleX={viewport.scale}
              scaleY={viewport.scale}
              x={viewport.x}
              y={viewport.y}
              draggable={false}
              onClick={handleBackgroundClick}
              onTap={handleBackgroundClick}
              onMouseDown={handlePanStart}
              onMouseMove={handlePanMove}
              onMouseUp={handlePanEnd}
              onMouseLeave={() => {
                handlePanEnd();
                handleCursorLeave();
              }}
              onTouchStart={handlePanStart}
              onTouchMove={handlePanMove}
              onTouchEnd={handlePanEnd}
              onWheel={handleWheel}
            >
              {/* Background Layer */}
              <Layer>
                {/* Canvas background */}
                <Rect
                  x={0}
                  y={0}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  fill="#ffffff"
                  shadowColor="rgba(0, 0, 0, 0.1)"
                  shadowBlur={10}
                  shadowOffset={{ x: 0, y: 2 }}
                  listening={false}
                />

                {/* Grid pattern */}
                <CanvasGrid
                  width={canvasSize.width}
                  height={canvasSize.height}
                  scale={viewport.scale}
                />

                {/* Canvas border */}
                <Rect
                  x={0}
                  y={0}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  stroke="#e5e7eb"
                  strokeWidth={2 / viewport.scale} // Scale-independent border
                  fill="transparent"
                  listening={false}
                />
              </Layer>

              {/* Objects Layer - Canvas objects */}
              <Layer>
                {/* Sort objects by zIndex (lower values render first/behind) */}
                {[...objects]
                  .sort((a, b) => {
                    const aZ = a.zIndex !== undefined ? a.zIndex : a.timestamp;
                    const bZ = b.zIndex !== undefined ? b.zIndex : b.timestamp;
                    return aZ - bZ;
                  })
                  .map((obj) => (
                    <CanvasObject
                      key={obj.id}
                      object={obj}
                      isSelected={selectedIds.includes(obj.id)}
                      selectedIds={selectedIds}
                      allObjects={objects}
                      onSelect={(e) => {
                        // Shift+Click: Toggle selection (add/remove from multi-select)
                        // Regular Click: Single select (clear others)
                        const isShiftPressed =
                          (e?.evt as MouseEvent)?.shiftKey ?? false;
                        if (isShiftPressed) {
                          toggleSelection(obj.id);
                        } else {
                          selectObject(obj.id);
                        }
                      }}
                      onHoverChange={handleObjectHoverChange}
                    />
                  ))}

                {/* Selection Box - Unified bounding box for multi-select */}
                <SelectionBox
                  selectedObjects={objects.filter((obj) =>
                    selectedIds.includes(obj.id)
                  )}
                />

                {/* Drag Selection Rectangle - Rubber-band visual feedback */}
                {selectionRect && (
                  <Rect
                    x={
                      selectionRect.width >= 0
                        ? selectionRect.x
                        : selectionRect.x + selectionRect.width
                    }
                    y={
                      selectionRect.height >= 0
                        ? selectionRect.y
                        : selectionRect.y + selectionRect.height
                    }
                    width={Math.abs(selectionRect.width)}
                    height={Math.abs(selectionRect.height)}
                    fill="rgba(0, 102, 255, 0.1)"
                    stroke="#0066FF"
                    strokeWidth={1}
                    dash={[4, 4]}
                    listening={false}
                  />
                )}
              </Layer>
            </Stage>

            {/* Edit Attribution Tooltip */}
            <EditAttributionTooltip
              userName={hoveredObject?.lastEditedByName}
              editedAt={hoveredObject?.lastEditedAt}
              position={tooltipPosition}
              visible={hoveredObject !== null}
            />

            {/* Multiplayer Cursors Overlay */}
            <CursorLayer
              cursors={cursors}
              scale={viewport.scale}
              offsetX={viewport.x}
              offsetY={viewport.y}
            />

            {/* Text Editor Overlay - shows when editing text */}
            {editingTextId && (
              <TextEditor
                object={
                  objects.find((obj) => obj.id === editingTextId) as TextObject
                }
                viewport={viewport}
                onFinishEditing={() => setEditingTextId(null)}
              />
            )}
          </div>

          {/* Keyboard Shortcuts Help Modal */}
          <ShortcutHelp
            isOpen={isHelpOpen}
            onClose={() => setIsHelpOpen(false)}
          />

          {/* Context Menu */}
          {contextMenu?.visible && (
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              options={getContextMenuOptions()}
              onClose={() => setContextMenu(null)}
            />
          )}
        </div>

        {/* Right Sidebar: Layers Panel */}
        <LayersPanel />
      </div>

      {/* Bottom Bar */}
      <BottomBar onHelpClick={() => setIsHelpOpen(true)} />
    </div>
  );
}
