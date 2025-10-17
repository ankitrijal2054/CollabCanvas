/**
 * Object Reference Resolver
 *
 * Resolves natural language references to canvas objects
 * Examples: "the red circle", "the top rectangle", "all blue shapes"
 */

import type { CanvasObject } from "../types/canvas.types";

/**
 * Object reference match result
 */
export interface ObjectMatch {
  id: string;
  object: CanvasObject;
  confidence: number; // 0-1, how confident we are in the match
  reason: string; // Why this object matched
}

/**
 * Parse color from natural language
 * Supports hex codes and common color names
 */
function parseColor(colorStr: string): string | null {
  const lowerColor = colorStr.toLowerCase().trim();

  // Hex code
  if (lowerColor.startsWith("#")) {
    return lowerColor;
  }

  // Common color name mappings
  const colorMap: Record<string, string> = {
    red: "#FF0000",
    blue: "#0000FF",
    green: "#00FF00",
    yellow: "#FFFF00",
    purple: "#800080",
    orange: "#FFA500",
    pink: "#FFC0CB",
    black: "#000000",
    white: "#FFFFFF",
    gray: "#808080",
    grey: "#808080",
    brown: "#A52A2A",
    cyan: "#00FFFF",
    magenta: "#FF00FF",
  };

  return colorMap[lowerColor] || null;
}

/**
 * Parse shape type from natural language
 */
function parseShapeType(typeStr: string): string | null {
  const lowerType = typeStr.toLowerCase().trim();

  const typeMap: Record<string, string> = {
    rectangle: "rectangle",
    rect: "rectangle",
    square: "rectangle",
    box: "rectangle",
    circle: "circle",
    oval: "circle",
    ellipse: "circle",
    star: "star",
    line: "line",
    arrow: "line",
    text: "text",
    label: "text",
  };

  return typeMap[lowerType] || null;
}

/**
 * Extract reference components from natural language
 * Examples: "the red circle" → { color: "red", type: "circle" }
 */
function parseReference(reference: string): {
  color?: string;
  type?: string;
  quantifier?: "the" | "all" | "a" | "any";
} {
  const lowerRef = reference.toLowerCase().trim();
  const words = lowerRef.split(/\s+/);

  const result: ReturnType<typeof parseReference> = {};

  // Detect quantifier
  if (words[0] === "the") {
    result.quantifier = "the";
  } else if (words[0] === "all") {
    result.quantifier = "all";
  } else if (words[0] === "a" || words[0] === "an") {
    result.quantifier = "a";
  } else if (words[0] === "any") {
    result.quantifier = "any";
  }

  // Try to find color and type
  for (const word of words) {
    const color = parseColor(word);
    if (color) {
      result.color = color;
    }

    const type = parseShapeType(word);
    if (type) {
      result.type = type;
    }
  }

  return result;
}

/**
 * Check if a color matches (handles hex vs name variations)
 */
function colorsMatch(color1: string, color2: string): boolean {
  const c1 = color1.toLowerCase().trim();
  const c2 = color2.toLowerCase().trim();

  // Direct match
  if (c1 === c2) return true;

  // Try parsing and comparing
  const parsed1 = parseColor(c1);
  const parsed2 = parseColor(c2);

  if (parsed1 && parsed2) {
    return parsed1 === parsed2;
  }

  return false;
}

/**
 * Resolve object reference to matching objects
 *
 * @param reference - Natural language reference (e.g., "the red circle", "all blue rectangles")
 * @param objects - Array of canvas objects to search
 * @returns Array of matching objects with confidence scores
 */
export function resolveObjectReference(
  reference: string,
  objects: CanvasObject[]
): ObjectMatch[] {
  const parsed = parseReference(reference);
  const matches: ObjectMatch[] = [];

  for (const obj of objects) {
    let confidence = 0;
    const reasons: string[] = [];

    // Match by type
    if (parsed.type) {
      if (obj.type === parsed.type) {
        confidence += 0.5;
        reasons.push(`type matches (${obj.type})`);
      } else {
        // No match, skip this object
        continue;
      }
    }

    // Match by color
    if (parsed.color) {
      if (colorsMatch(obj.color || "", parsed.color)) {
        confidence += 0.5;
        reasons.push(`color matches (${obj.color})`);
      } else {
        // No match, skip this object
        continue;
      }
    }

    // If we have any match, add to results
    if (confidence > 0) {
      matches.push({
        id: obj.id,
        object: obj,
        confidence,
        reason: reasons.join(", "),
      });
    }
  }

  // Sort by confidence (highest first)
  matches.sort((a, b) => b.confidence - a.confidence);

  // Handle quantifiers
  if (parsed.quantifier === "the") {
    // Return only the best match (or empty if ambiguous)
    if (matches.length === 1) {
      return [matches[0]];
    } else if (
      matches.length > 1 &&
      matches[0].confidence > matches[1].confidence
    ) {
      return [matches[0]];
    }
    // Ambiguous - return all equally confident matches
    const topConfidence = matches[0]?.confidence || 0;
    return matches.filter((m) => m.confidence === topConfidence);
  } else if (parsed.quantifier === "all") {
    // Return all matches
    return matches;
  } else if (parsed.quantifier === "a" || parsed.quantifier === "any") {
    // Return the best match
    return matches.slice(0, 1);
  }

  // Default: return all matches
  return matches;
}

/**
 * Resolve multiple object references
 * Useful for commands that reference multiple objects
 */
export function resolveMultipleReferences(
  references: string[],
  objects: CanvasObject[]
): ObjectMatch[] {
  const allMatches: ObjectMatch[] = [];
  const seenIds = new Set<string>();

  for (const reference of references) {
    const matches = resolveObjectReference(reference, objects);

    for (const match of matches) {
      if (!seenIds.has(match.id)) {
        allMatches.push(match);
        seenIds.add(match.id);
      }
    }
  }

  return allMatches;
}

/**
 * Get the single best match from a reference
 * Returns null if no match or ambiguous
 */
export function resolveSingleObject(
  reference: string,
  objects: CanvasObject[]
): CanvasObject | null {
  const matches = resolveObjectReference(reference, objects);

  if (matches.length === 0) {
    return null;
  }

  if (matches.length === 1) {
    return matches[0].object;
  }

  // If multiple matches with same high confidence, it's ambiguous
  if (matches[0].confidence === matches[1].confidence) {
    return null;
  }

  return matches[0].object;
}

/**
 * Check if a reference is ambiguous (multiple equally good matches)
 */
export function isAmbiguousReference(
  reference: string,
  objects: CanvasObject[]
): boolean {
  const matches = resolveObjectReference(reference, objects);

  if (matches.length <= 1) {
    return false;
  }

  // Check if top matches have equal confidence
  return matches[0].confidence === matches[1].confidence;
}
