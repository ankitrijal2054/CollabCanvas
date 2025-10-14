// Canvas component - Interactive collaborative canvas with Konva
import { useRef, useEffect, useState } from "react";
import { Stage, Layer, Rect } from "react-konva";
import type Konva from "konva";
import { useCanvas } from "../../hooks/useCanvas";
import { useAuth } from "../../hooks/useAuth";
import { canvasHelpers } from "../../utils/canvasHelpers";
import Header from "../layout/Header";
import CanvasToolbar from "./CanvasToolbar";
import CanvasControls from "./CanvasControls";
import CanvasObject from "./CanvasObject";
import CanvasGrid from "./CanvasGrid";
import "./Canvas.css";

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
  } = useCanvas();

  const stageRef = useRef<Konva.Stage>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

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
   * Handle background click - deselect objects when clicking on empty space
   */
  const handleBackgroundClick = (e: any) => {
    // Check if we clicked on the stage background (not an object)
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty && selectedObjectId) {
      selectObject(null);
    }
  };

  /**
   * Handle pan start (mouse down or touch start)
   */
  const handlePanStart = (e: any) => {
    const stage = stageRef.current;
    if (!stage) return;

    // Don't pan if clicking on an object
    const clickedOnEmpty = e.target === stage;
    if (!clickedOnEmpty) return;

    // Get pointer position
    const pos = stage.getPointerPosition();
    if (!pos) return;

    setIsPanning(true);
    setPanStart({ x: pos.x, y: pos.y });
  };

  /**
   * Handle pan move (mouse move or touch move)
   */
  const handlePanMove = () => {
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
    let newX = viewport.x + dx;
    let newY = viewport.y + dy;

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
  const handleWheel = (e: any) => {
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
        <CanvasToolbar />
        <CanvasControls />

        <div id="canvas-container" className="canvas-container">
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
            onMouseLeave={handlePanEnd}
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
        </div>
      </div>
    </div>
  );
}
