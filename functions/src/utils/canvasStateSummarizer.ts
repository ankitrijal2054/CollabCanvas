/**
 * Canvas State Summarizer
 *
 * Reduces token usage by summarizing large canvases.
 * - Full state if <100 objects
 * - Summarized state if 100+ objects (70-90% token reduction)
 */

import * as logger from "firebase-functions/logger";
import type {
  CanvasObjectSummary,
  CanvasStateSummary,
} from "../types/ai.types";

/**
 * Threshold for switching to summarized mode
 */
const SUMMARIZATION_THRESHOLD = 100;

/**
 * Number of recent objects to include in summary
 */
const RECENT_OBJECTS_COUNT = 5;

/**
 * Canvas object from Firebase (raw data)
 */
interface RawCanvasObject {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  text?: string;
  rotation?: number;
  createdBy?: string;
  timestamp?: number;
  lastEditedAt?: number;
  [key: string]: unknown; // Allow other properties
}

/**
 * Raw canvas state from Firebase
 */
export interface RawCanvasState {
  objects?: Record<string, RawCanvasObject>;
  selectedIds?: string[];
  viewport?: {
    x: number;
    y: number;
    scale: number;
  };
  canvasSize?: {
    width: number;
    height: number;
  };
}

/**
 * Summarize canvas state for AI context
 *
 * @param rawState - Raw canvas state from Firebase
 * @returns Summarized canvas state
 */
export function summarizeCanvasState(
  rawState: RawCanvasState
): CanvasStateSummary {
  // Handle empty or missing objects
  if (!rawState.objects || Object.keys(rawState.objects).length === 0) {
    return {
      objectCount: 0,
      objects: [],
      selectedIds: rawState.selectedIds || [],
      canvasSize: rawState.canvasSize || { width: 10000, height: 10000 },
    };
  }

  // Convert objects map to array
  const objectsArray = Object.values(rawState.objects);
  const objectCount = objectsArray.length;

  logger.info("Summarizing canvas state", {
    objectCount,
    threshold: SUMMARIZATION_THRESHOLD,
    willSummarize: objectCount >= SUMMARIZATION_THRESHOLD,
  });

  // Full state for small canvases
  if (objectCount < SUMMARIZATION_THRESHOLD) {
    const objects = objectsArray.map(toCanvasObjectSummary);
    return {
      objectCount,
      objects,
      selectedIds: rawState.selectedIds || [],
      canvasSize: rawState.canvasSize || { width: 10000, height: 10000 },
    };
  }

  // Summarized state for large canvases
  const canvasSize = rawState.canvasSize || { width: 10000, height: 10000 };
  const summary = createSummary(
    objectsArray,
    rawState.selectedIds || [],
    canvasSize
  );

  logger.info("Canvas state summarized", {
    originalObjectCount: objectCount,
    summaryObjectCount: summary.objects.length,
    reductionPercent: Math.round(
      (1 - summary.objects.length / objectCount) * 100
    ),
  });

  return summary;
}

/**
 * Create summarized canvas state
 * Includes: type counts, selected objects, recent objects
 */
function createSummary(
  objects: RawCanvasObject[],
  selectedIds: string[],
  canvasSize: { width: number; height: number }
): CanvasStateSummary {
  // Count objects by type
  const typeCounts: Record<string, number> = {};
  for (const obj of objects) {
    typeCounts[obj.type] = (typeCounts[obj.type] || 0) + 1;
  }

  // Get selected objects (always include these)
  const selectedObjects = objects
    .filter((obj) => selectedIds.includes(obj.id))
    .map(toCanvasObjectSummary);

  // Get recent objects (sorted by timestamp, most recent first)
  const sortedByTime = [...objects].sort((a, b) => {
    const timeA = a.lastEditedAt || a.timestamp || 0;
    const timeB = b.lastEditedAt || b.timestamp || 0;
    return timeB - timeA;
  });

  // Take most recent objects (excluding already selected ones)
  const selectedIdSet = new Set(selectedIds);
  const recentObjects = sortedByTime
    .filter((obj) => !selectedIdSet.has(obj.id))
    .slice(0, RECENT_OBJECTS_COUNT)
    .map(toCanvasObjectSummary);

  // Combine selected + recent (avoid duplicates)
  const includedObjects = [...selectedObjects, ...recentObjects];

  return {
    objectCount: objects.length,
    objects: includedObjects,
    selectedIds,
    canvasSize,
    typeCounts,
    recentObjects,
  };
}

/**
 * Convert raw canvas object to summary format
 * Strips unnecessary properties to reduce tokens
 */
function toCanvasObjectSummary(obj: RawCanvasObject): CanvasObjectSummary {
  return {
    id: obj.id,
    type: obj.type,
    x: obj.x,
    y: obj.y,
    width: obj.width,
    height: obj.height,
    color: obj.color,
    text: obj.text,
    rotation: obj.rotation,
    createdBy: obj.createdBy,
    timestamp: obj.timestamp,
  };
}

/**
 * Format canvas state summary as a human-readable string for AI
 *
 * @param summary - Canvas state summary
 * @returns Formatted string for AI context
 */
export function formatCanvasStateForAI(summary: CanvasStateSummary): string {
  const { objectCount, objects, selectedIds, typeCounts, canvasSize } = summary;

  let result = `Canvas State:\n`;
  result += `- Canvas size: ${canvasSize.width}x${canvasSize.height}px\n`;
  result += `- Total objects: ${objectCount}\n`;

  // Type breakdown
  if (typeCounts) {
    result += `- Object types: `;
    const typeList = Object.entries(typeCounts)
      .map(([type, count]) => `${count} ${type}${count > 1 ? "s" : ""}`)
      .join(", ");
    result += typeList + "\n";
  }

  // Selected objects
  if (selectedIds.length > 0) {
    result += `- Selected objects (${selectedIds.length}):\n`;
    const selectedObjects = objects.filter((obj) =>
      selectedIds.includes(obj.id)
    );
    for (const obj of selectedObjects) {
      result += `  - ${obj.type} (${obj.id}): position (${obj.x}, ${obj.y}), `;
      result += `size ${obj.width}x${obj.height}, color ${obj.color}`;
      if (obj.text) {
        result += `, text: "${obj.text}"`;
      }
      result += "\n";
    }
  } else {
    result += `- No objects selected\n`;
  }

  // Recent/visible objects (if summarized)
  if (objectCount >= SUMMARIZATION_THRESHOLD && objects.length > 0) {
    const recentObjects = objects.filter(
      (obj) => !selectedIds.includes(obj.id)
    );
    if (recentObjects.length > 0) {
      result += `- Recently created/edited objects:\n`;
      for (const obj of recentObjects) {
        result += `  - ${obj.type} (${obj.id}): position (${obj.x}, ${obj.y}), `;
        result += `size ${obj.width}x${obj.height}, color ${obj.color}`;
        if (obj.text) {
          result += `, text: "${obj.text}"`;
        }
        result += "\n";
      }
    }
  } else if (objectCount < SUMMARIZATION_THRESHOLD) {
    // Full list for small canvases
    result += `- All objects:\n`;
    for (const obj of objects) {
      result += `  - ${obj.type} (${obj.id}): position (${obj.x}, ${obj.y}), `;
      result += `size ${obj.width}x${obj.height}, color ${obj.color}`;
      if (obj.text) {
        result += `, text: "${obj.text}"`;
      }
      result += "\n";
    }
  }

  return result;
}

/**
 * Estimate token count for canvas state
 * Rough approximation: 1 token ≈ 4 characters
 *
 * @param summary - Canvas state summary
 * @returns Estimated token count
 */
export function estimateCanvasStateTokens(summary: CanvasStateSummary): number {
  const formatted = formatCanvasStateForAI(summary);
  return Math.ceil(formatted.length / 4);
}
