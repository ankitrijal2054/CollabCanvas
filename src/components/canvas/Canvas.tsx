// Canvas component - Interactive collaborative canvas with Konva
import { useRef, useEffect, useState } from "react";
import { Stage, Layer, Rect } from "react-konva";
import type Konva from "konva";
import { useCanvas } from "../../hooks/useCanvas";
import { useAuth } from "../../hooks/useAuth";
import { usePresence } from "../../hooks/usePresence";
import { canvasHelpers } from "../../utils/canvasHelpers";
import Header from "../layout/Header";
import Sidebar from "../layout/Sidebar";
import CanvasToolbar from "./CanvasToolbar";
import CanvasControls from "./CanvasControls";
import CanvasObject from "./CanvasObject";
import CanvasGrid from "./CanvasGrid";
import CursorLayer from "../collaboration/CursorLayer";
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
    selectedObjectId,
    selectObject,
    deleteObject,
    loading,
  } = useCanvas();

  // Initialize presence tracking for multiplayer cursors
  const { cursors, updateCursor, removeCursor } = usePresence(
    user?.id ?? null,
    user?.name ?? user?.email ?? null,
    {
      throttleMs: 16, // 60 FPS
    }
  );

  // Debug: Log cursors array changes
  useEffect(() => {
    console.log("👥 Cursors updated:", cursors.length, cursors);
  }, [cursors]);

  const stageRef = useRef<Konva.Stage>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [devPerf, setDevPerf] = useState<{
    fps: number;
    latencyMs: number;
  } | null>(null);

  /**
   * Handle window resize - update stage size
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

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
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
      // Delete or Backspace key - delete selected object
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedObjectId &&
        // Don't delete if user is typing in an input
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        deleteObject(selectedObjectId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedObjectId, deleteObject]);

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
      // Debug: Log occasionally (every 60 frames = ~1 second)
      if (Math.random() < 0.016) {
        console.log("🖱️ Cursor update sent:", canvasPos);
      }
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
    if (clickedOnEmpty && selectedObjectId) {
      selectObject(null);
    }
  };

  /**
   * Handle pan start (mouse down or touch start)
   */
  const handlePanStart = (e: { target: unknown }) => {
    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    setIsPanning(true);
    setPanStart({ x: pos.x, y: pos.y });
  };

  /**
   * Handle pan move (mouse move or touch move)
   */
  const handlePanMove = () => {
    // Always track cursor movement for multiplayer presence
    handleCursorMove();

    if (!isPanning) return;

    const stage = stageRef.current;
    if (!stage) return;

    // Get current pointer position
    const pos = stage.getPointerPosition();
    if (!pos) return;

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

  return (
    <div className="canvas-page">
      <Header user={user} />

      <div
        className="canvas-workspace"
        onClick={(e) => {
          // Deselect when clicking outside canvas container
          if (e.target === e.currentTarget && selectedObjectId) {
            selectObject(null);
          }
        }}
      >
        <Sidebar />
        <CanvasToolbar />
        <CanvasControls />

        <div
          id="canvas-container"
          className={`canvas-container ${!loading ? "loaded" : ""}`}
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
              {objects.map((obj) => (
                <CanvasObject
                  key={obj.id}
                  object={obj}
                  isSelected={obj.id === selectedObjectId}
                  onSelect={() => selectObject(obj.id)}
                />
              ))}
            </Layer>
          </Stage>

          {/* Multiplayer Cursors Overlay */}
          <CursorLayer
            cursors={cursors}
            scale={viewport.scale}
            offsetX={viewport.x}
            offsetY={viewport.y}
          />
        </div>
      </div>
    </div>
  );
}
