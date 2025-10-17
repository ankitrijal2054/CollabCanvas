// SVG generator for canvas export
import type {
  CanvasObject,
  RectangleObject,
  CircleObject,
  StarObject,
  LineObject,
  TextObject,
} from "../types/canvas.types";
import {
  calculateBoundingBox,
  downloadFile,
  generateFilename,
} from "./exportHelpers";

/**
 * Generate SVG string from canvas objects
 * @param objects - Array of canvas objects to convert
 * @param scope - Export entire canvas or selection only
 * @returns SVG string
 */
export function generateSVG(objects: CanvasObject[]): string {
  if (objects.length === 0) {
    console.warn("⚠️ No objects to export");
    return generateEmptySVG();
  }

  // Calculate bounding box
  const bbox = calculateBoundingBox(objects);

  // SVG header
  const svgHeader = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg
  width="${bbox.width}"
  height="${bbox.height}"
  viewBox="${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}"
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink"
>`;

  // Convert each object to SVG
  const svgElements = objects
    .map((obj) => objectToSVG(obj))
    .filter((svg) => svg !== null)
    .join("\n  ");

  // SVG footer
  const svgFooter = `</svg>`;

  return `${svgHeader}\n  ${svgElements}\n${svgFooter}`;
}

/**
 * Generate empty SVG placeholder
 */
function generateEmptySVG(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="600" fill="#f0f0f0"/>
  <text x="400" y="300" text-anchor="middle" font-size="20" fill="#999">
    No objects to export
  </text>
</svg>`;
}

/**
 * Convert a canvas object to SVG element
 * @param obj - Canvas object
 * @returns SVG element string
 */
function objectToSVG(obj: CanvasObject): string | null {
  switch (obj.type) {
    case "rectangle":
      return rectangleToSVG(obj as RectangleObject);
    case "circle":
      return circleToSVG(obj as CircleObject);
    case "star":
      return starToSVG(obj as StarObject);
    case "line":
      return lineToSVG(obj as LineObject);
    case "text":
      return textToSVG(obj as TextObject);
    default:
      console.warn(`⚠️ Unknown object type: ${(obj as any).type}`);
      return null;
  }
}

/**
 * Convert rectangle to SVG <rect>
 */
function rectangleToSVG(obj: RectangleObject): string {
  const fill = obj.color || "#3B82F6";
  const stroke = obj.stroke || "none";
  const strokeWidth = obj.strokeWidth || 0;
  // Note: Rotation not yet implemented in MVP
  const transform = "";

  return `<rect x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${transform}/>`;
}

/**
 * Convert circle to SVG <circle>
 */
function circleToSVG(obj: CircleObject): string {
  const radius = obj.radius || obj.width / 2;
  const cx = obj.x + radius;
  const cy = obj.y + radius;
  const fill = obj.color || "#10B981";
  const stroke = obj.stroke || "none";
  const strokeWidth = obj.strokeWidth || 0;
  // Note: Rotation not yet implemented in MVP
  const transform = "";

  return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${transform}/>`;
}

/**
 * Convert star to SVG <polygon>
 */
function starToSVG(obj: StarObject): string {
  const numPoints = obj.numPoints || 5;
  const innerRadius = obj.innerRadius || 0.5;
  const outerRadius = obj.width / 2;
  const centerX = obj.x + obj.width / 2;
  const centerY = obj.y + obj.height / 2;

  // Calculate star points
  const points: string[] = [];
  for (let i = 0; i < numPoints * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : outerRadius * innerRadius;
    const angle = (Math.PI / numPoints) * i - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }

  const fill = obj.color || "#F59E0B";
  const stroke = obj.stroke || "none";
  const strokeWidth = obj.strokeWidth || 0;
  // Note: Rotation not yet implemented in MVP
  const transform = "";

  return `<polygon points="${points.join(
    " "
  )}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${transform}/>`;
}

/**
 * Convert line to SVG <line> with optional arrows
 */
function lineToSVG(obj: LineObject): string {
  const points = obj.points || [obj.x, obj.y, obj.x + obj.width, obj.y];
  const x1 = points[0];
  const y1 = points[1];
  const x2 = points[2];
  const y2 = points[3];

  const stroke = obj.stroke || obj.color || "#000000";
  const strokeWidth = obj.strokeWidth || 2;

  let svgElements = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`;

  // Add arrow markers if needed
  if (obj.arrowStart || obj.arrowEnd) {
    const arrowId = `arrow-${obj.id}`;
    const markerDef = `<defs>
    <marker id="${arrowId}" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="${stroke}"/>
    </marker>
  </defs>`;

    const markerStart = obj.arrowStart
      ? ` marker-start="url(#${arrowId})"`
      : "";
    const markerEnd = obj.arrowEnd ? ` marker-end="url(#${arrowId})"` : "";

    svgElements = `${markerDef}
  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"${markerStart}${markerEnd}/>`;
  }

  return svgElements;
}

/**
 * Convert text to SVG <text>
 */
function textToSVG(obj: TextObject): string {
  const x = obj.x;
  const y = obj.y + obj.fontSize; // SVG text baseline is at the bottom
  const fill = obj.color || "#000000";
  const fontFamily = obj.fontFamily || "Arial";
  const fontSize = obj.fontSize || 16;
  const fontWeight = obj.fontWeight || "normal";
  const fontStyle = obj.fontStyle || "normal";
  const textAlign = obj.textAlign || "left";
  // Note: Rotation not yet implemented in MVP

  // Text anchor based on alignment
  let textAnchor = "start";
  if (textAlign === "center") textAnchor = "middle";
  if (textAlign === "right") textAnchor = "end";

  const transform = "";

  // Escape special XML characters
  const escapedText = escapeXML(obj.text || "");

  return `<text x="${x}" y="${y}" fill="${fill}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" font-style="${fontStyle}" text-anchor="${textAnchor}"${transform}>${escapedText}</text>`;
}

/**
 * Escape XML special characters
 */
function escapeXML(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Export canvas objects as SVG file
 * @param objects - Canvas objects to export (already filtered by caller)
 */
export async function exportToSVG(objects: CanvasObject[]): Promise<void> {
  try {
    // Generate SVG string (scope parameter removed - filtering handled by caller)
    const svgString = generateSVG(objects);

    // Create blob
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    // Trigger download
    const filename = generateFilename("svg");
    downloadFile(url, filename);

    console.log(`✅ SVG exported successfully: ${filename}`);
  } catch (error) {
    console.error("❌ Failed to export SVG:", error);
    throw error;
  }
}

/**
 * SVG generator namespace
 */
export const svgGenerator = {
  generateSVG,
  exportToSVG,
  objectToSVG,
};
