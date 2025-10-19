import { Line } from "react-konva";

interface CanvasGridProps {
  width: number;
  height: number;
  gridSize?: number;
  scale: number;
}

/**
 * CanvasGrid Component
 * Renders a grid pattern on the canvas background
 */
export default function CanvasGrid({
  width,
  height,
  gridSize = 50,
  scale,
}: CanvasGridProps) {
  const strokeWidth = 1 / scale; // Scale-independent line width
  const root = document.documentElement;
  const styles = getComputedStyle(root);
  const strokeColor =
    styles.getPropertyValue("--canvas-grid-muted").trim() || "#f3f4f6";
  const lines = [] as JSX.Element[];

  // Vertical lines
  for (let x = gridSize; x < width; x += gridSize) {
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x, 0, x, height]}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        listening={false}
      />
    );
  }

  // Horizontal lines
  for (let y = gridSize; y < height; y += gridSize) {
    lines.push(
      <Line
        key={`h-${y}`}
        points={[0, y, width, y]}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        listening={false}
      />
    );
  }

  return <>{lines}</>;
}
