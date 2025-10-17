// Canvas constants - Task 1.7
// DEFAULT_CANVAS_ID is hardcoded for MVP
// This can easily be made dynamic post-MVP for multiple canvases
export const DEFAULT_CANVAS_ID = "default";

// Canvas configuration
export const CANVAS_CONFIG = {
  DEFAULT_WIDTH: 8000,
  DEFAULT_HEIGHT: 6000,
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 5,
  DEFAULT_ZOOM: 1,
};

// Object defaults
export const OBJECT_DEFAULTS = {
  RECTANGLE_WIDTH: 150,
  RECTANGLE_HEIGHT: 100,
  RECTANGLE_COLOR: "#3B82F6",
};

// Opacity and blend mode defaults (Phase 2 - PR #22)
export const DEFAULT_OPACITY = 1.0; // 100% opaque
export const DEFAULT_BLEND_MODE = "source-over"; // Normal blend mode

/**
 * Available blend modes with user-friendly labels and descriptions
 * Maps to Canvas 2D Context globalCompositeOperation values
 */
export const BLEND_MODES = [
  {
    value: "source-over",
    label: "Normal",
    description: "Default - top layer covers bottom",
  },
  {
    value: "multiply",
    label: "Multiply",
    description: "Darken by multiplying colors (shadows)",
  },
  {
    value: "screen",
    label: "Screen",
    description: "Lighten colors (glows, highlights)",
  },
  {
    value: "overlay",
    label: "Overlay",
    description: "Increases contrast (textures)",
  },
  {
    value: "darken",
    label: "Darken",
    description: "Pick darker color per channel",
  },
  {
    value: "lighten",
    label: "Lighten",
    description: "Pick lighter color per channel",
  },
  {
    value: "color-dodge",
    label: "Color Dodge",
    description: "Extreme lighten effect",
  },
  {
    value: "color-burn",
    label: "Color Burn",
    description: "Extreme darken effect",
  },
  {
    value: "hard-light",
    label: "Hard Light",
    description: "Strong contrast effect",
  },
  {
    value: "soft-light",
    label: "Soft Light",
    description: "Subtle contrast effect",
  },
  {
    value: "difference",
    label: "Difference",
    description: "Invert-like color subtraction",
  },
  {
    value: "exclusion",
    label: "Exclusion",
    description: "Lower contrast difference",
  },
  {
    value: "hue",
    label: "Hue",
    description: "Use source hue only",
  },
  {
    value: "saturation",
    label: "Saturation",
    description: "Use source saturation only",
  },
  {
    value: "color",
    label: "Color",
    description: "Use source hue and saturation",
  },
  {
    value: "luminosity",
    label: "Luminosity",
    description: "Use source brightness only",
  },
] as const;
